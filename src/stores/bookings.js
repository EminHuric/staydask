import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, serverTimestamp
} from 'firebase/firestore'
import {
  differenceInDays, parseISO, isWithinInterval,
  startOfDay, isBefore, isAfter, format
} from 'date-fns'
import { db } from '../firebase'
import { useAuthStore } from './auth'

function generateReservationId() {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 900000 + 100000)
  return `RSV-${year}-${rand}`
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function calcPaymentStatus(totalPaid, totalPrice, depositAmount) {
  if (totalPaid >= totalPrice && totalPrice > 0) return 'paid'
  if (depositAmount > 0 && totalPaid > 0 && totalPaid <= depositAmount) return 'deposit_paid'
  if (totalPaid > 0) return 'partial'
  return 'unpaid'
}

export const useBookingsStore = defineStore('bookings', () => {
  const bookings = ref([])
  const loading = ref(false)
  let unsubscribe = null

  function subscribe() {
    const authStore = useAuthStore()
    if (!authStore.workspaceId) return
    loading.value = true
    const q = query(
      collection(db, 'bookings'),
      where('workspaceId', '==', authStore.workspaceId)
    )
    unsubscribe = onSnapshot(q, snap => {
      bookings.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      loading.value = false
    })
  }

  function unsubscribeAll() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
    bookings.value = []
  }

  function calculateBooking(checkIn, checkOut, pricePerNight) {
    const days = differenceInDays(parseISO(checkOut), parseISO(checkIn))
    return { days, totalPrice: Math.max(0, days) * (pricePerNight || 0) }
  }

  // Returns conflicting booking or null. Same-day checkout/checkin is allowed.
  function checkConflict(apartmentId, checkIn, checkOut, excludeId = null) {
    const ci = parseISO(checkIn)
    const co = parseISO(checkOut)
    return bookings.value.find(b => {
      if (b.id === excludeId) return false
      if (b.apartmentId !== apartmentId) return false
      if (b.status === 'cancelled') return false
      const bci = parseISO(b.checkIn)
      const bco = parseISO(b.checkOut)
      return isBefore(ci, bco) && isAfter(co, bci)
    }) || null
  }

  async function addBooking(data) {
    const conflict = checkConflict(data.apartmentId, data.checkIn, data.checkOut)
    if (conflict) {
      const e = new Error(
        `Already booked: "${conflict.guestName}" is in this apartment ` +
        `from ${format(parseISO(conflict.checkIn), 'dd MMM')} to ${format(parseISO(conflict.checkOut), 'dd MMM yyyy')}.`
      )
      e.isConflict = true
      throw e
    }

    const authStore = useAuthStore()
    const { days, totalPrice } = calculateBooking(data.checkIn, data.checkOut, data.pricePerNight)
    const depositAmount = Number(data.depositAmount) || 0

    const payments = []
    if (data.depositPaid && depositAmount > 0) {
      payments.push({
        id: uid(),
        amount: depositAmount,
        date: new Date().toISOString().slice(0, 10),
        type: 'deposit',
        note: 'Initial deposit'
      })
    }
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

    await addDoc(collection(db, 'bookings'), {
      reservationId: generateReservationId(),
      guestName: data.guestName || '',
      phone: data.phone || '',
      origin: data.origin || '',
      notes: data.notes || '',
      tags: data.tags || [],
      apartmentId: data.apartmentId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      pricePerNight: Number(data.pricePerNight) || 0,
      days,
      totalPrice,
      depositAmount,
      depositPaid: data.depositPaid || false,
      totalPaid,
      paymentStatus: calcPaymentStatus(totalPaid, totalPrice, depositAmount),
      payments,
      status: 'confirmed',
      workspaceId: authStore.workspaceId,
      createdAt: serverTimestamp()
    })
  }

  async function updateBooking(id, data) {
    if (data.apartmentId && data.checkIn && data.checkOut) {
      const conflict = checkConflict(data.apartmentId, data.checkIn, data.checkOut, id)
      if (conflict) {
        const e = new Error(
          `Already booked: "${conflict.guestName}" is in this apartment ` +
          `from ${format(parseISO(conflict.checkIn), 'dd MMM')} to ${format(parseISO(conflict.checkOut), 'dd MMM yyyy')}.`
        )
        e.isConflict = true
        throw e
      }
    }

    const existing = bookings.value.find(b => b.id === id)
    const updates = { ...data, updatedAt: serverTimestamp() }

    if (data.checkIn && data.checkOut && data.pricePerNight != null) {
      const { days, totalPrice } = calculateBooking(data.checkIn, data.checkOut, data.pricePerNight)
      updates.days = days
      updates.totalPrice = totalPrice
      const totalPaid = existing?.totalPaid || 0
      const depositAmount = Number(data.depositAmount ?? existing?.depositAmount ?? 0)
      updates.paymentStatus = calcPaymentStatus(totalPaid, totalPrice, depositAmount)
    }

    await updateDoc(doc(db, 'bookings', id), updates)
  }

  async function cancelBooking(id) {
    await updateDoc(doc(db, 'bookings', id), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

  async function deleteBooking(id) {
    await deleteDoc(doc(db, 'bookings', id))
  }

  async function addPayment(bookingId, { amount, date, type = 'payment', note = '' }) {
    const booking = bookings.value.find(b => b.id === bookingId)
    if (!booking) throw new Error('Booking not found')
    const payment = { id: uid(), amount: Number(amount), date, type, note }
    const updatedPayments = [...(booking.payments || []), payment]
    const totalPaid = updatedPayments.reduce((s, p) => s + (p.amount || 0), 0)
    await updateDoc(doc(db, 'bookings', bookingId), {
      payments: updatedPayments,
      totalPaid,
      paymentStatus: calcPaymentStatus(totalPaid, booking.totalPrice, booking.depositAmount || 0),
      updatedAt: serverTimestamp()
    })
  }

  async function removePayment(bookingId, paymentId) {
    const booking = bookings.value.find(b => b.id === bookingId)
    if (!booking) return
    const updatedPayments = (booking.payments || []).filter(p => p.id !== paymentId)
    const totalPaid = updatedPayments.reduce((s, p) => s + (p.amount || 0), 0)
    await updateDoc(doc(db, 'bookings', bookingId), {
      payments: updatedPayments,
      totalPaid,
      paymentStatus: calcPaymentStatus(totalPaid, booking.totalPrice, booking.depositAmount || 0),
      updatedAt: serverTimestamp()
    })
  }

  function isDateBooked(apartmentId, date) {
    const d = startOfDay(date)
    return bookings.value.some(b => {
      if (b.apartmentId !== apartmentId || b.status === 'cancelled') return false
      return isWithinInterval(d, {
        start: startOfDay(parseISO(b.checkIn)),
        end: startOfDay(parseISO(b.checkOut))
      })
    })
  }

  function bookingsForApartment(apartmentId) {
    return bookings.value.filter(b => b.apartmentId === apartmentId && b.status !== 'cancelled')
  }

  const activeBookings = computed(() => {
    const today = startOfDay(new Date())
    return bookings.value.filter(b => {
      if (b.status === 'cancelled') return false
      return isWithinInterval(today, {
        start: startOfDay(parseISO(b.checkIn)),
        end: startOfDay(parseISO(b.checkOut))
      })
    })
  })

  const totalRevenue = computed(() =>
    bookings.value.filter(b => b.status !== 'cancelled')
      .reduce((s, b) => s + (b.totalPrice || 0), 0)
  )
  const totalCollected = computed(() =>
    bookings.value.filter(b => b.status !== 'cancelled')
      .reduce((s, b) => s + (b.totalPaid || 0), 0)
  )
  const totalOutstanding = computed(() => totalRevenue.value - totalCollected.value)

  function revenueByApartment(apartmentId) {
    return bookings.value
      .filter(b => b.apartmentId === apartmentId && b.status !== 'cancelled')
      .reduce((s, b) => s + (b.totalPrice || 0), 0)
  }

  const todayNotifications = computed(() => {
    const today = startOfDay(new Date())
    const todayStr = format(today, 'yyyy-MM-dd')
    const tomorrowStr = format(new Date(today.getTime() + 86400000), 'yyyy-MM-dd')
    const in7 = new Date(today.getTime() + 7 * 86400000)
    const notes = []
    bookings.value.forEach(b => {
      if (b.status === 'cancelled') return
      if (b.checkIn === todayStr) notes.push({ type: 'arrival', booking: b })
      if (b.checkOut === todayStr) notes.push({ type: 'departure', booking: b })
      if (b.checkIn === tomorrowStr) notes.push({ type: 'arriving_tomorrow', booking: b })
      if (['unpaid', 'deposit_paid'].includes(b.paymentStatus) && !isBefore(parseISO(b.checkIn), today)) {
        notes.push({ type: 'payment_due', booking: b })
      }
      if (
        b.checkIn !== todayStr && b.checkIn !== tomorrowStr &&
        isAfter(parseISO(b.checkIn), today) && isBefore(parseISO(b.checkIn), in7)
      ) {
        notes.push({ type: 'upcoming', booking: b })
      }
    })
    return notes
  })

  return {
    bookings, loading,
    subscribe, unsubscribeAll,
    calculateBooking, checkConflict, calcPaymentStatus,
    addBooking, updateBooking, cancelBooking, deleteBooking,
    addPayment, removePayment,
    isDateBooked, bookingsForApartment,
    activeBookings, totalRevenue, totalCollected, totalOutstanding,
    revenueByApartment, todayNotifications
  }
})
