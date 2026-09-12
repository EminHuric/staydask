import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, serverTimestamp, runTransaction
} from 'firebase/firestore'
import {
  differenceInDays, parseISO, isWithinInterval,
  startOfDay, isBefore, isAfter, format, addDays
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

// ── the night index ──────────────────────────────────────────────────────
// Every night a stay occupies, as 'YYYY-MM-DD'. Check-in is included and
// check-out is not: a guest leaving on the 4th frees the 4th, which is exactly
// why a same-day checkout/checkin pair has never been a clash here.
export function nightsOf(checkIn, checkOut) {
  const nights = []
  const end = parseISO(checkOut)
  let day = parseISO(checkIn)
  // A guard, not a feature: a year of nights is already absurd for one stay,
  // and an inverted date range must not spin.
  for (let i = 0; isBefore(day, end) && i < 370; i += 1) {
    nights.push(format(day, 'yyyy-MM-dd'))
    day = addDays(day, 1)
  }
  return nights
}

// Which nights an apartment is occupied, from the bookings themselves.
function nightsTakenBy(bookingList, apartmentId, excludeId = null) {
  const taken = new Set()
  bookingList.forEach(b => {
    if (b.apartmentId !== apartmentId || b.status === 'cancelled' || b.id === excludeId) return
    nightsOf(b.checkIn, b.checkOut).forEach(n => taken.add(n))
  })
  return taken
}

function conflictError(nights, taken) {
  const clash = nights.find(n => taken.includes(n))
  if (!clash) return null
  const e = new Error(`Already booked: this apartment is taken on ${clash}.`)
  e.isConflict = true
  return e
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
  let lastCount = null

  // Keeps the denormalized bookingCount on the user doc in sync with reality
  // (self-healing — fixes any counter drift when the owner loads their data).
  function syncCount(workspaceId, n) {
    if (n === lastCount) return
    lastCount = n
    updateDoc(doc(db, 'users', workspaceId), { bookingCount: n }).catch(() => {})
  }

  function subscribe() {
    const authStore = useAuthStore()
    if (!authStore.workspaceId) return
    const workspaceId = authStore.workspaceId
    loading.value = true
    const q = query(
      collection(db, 'bookings'),
      where('workspaceId', '==', workspaceId)
    )
    unsubscribe = onSnapshot(q, snap => {
      bookings.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      loading.value = false
      syncCount(workspaceId, bookings.value.length)
      // Index drift is repaired here, where the real bookings have just arrived.
      reconcileNights().catch(() => {})
    })
  }

  function unsubscribeAll() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
    bookings.value = []
    lastCount = null
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

/*
 * The stamp that says MsEe brought a booking.
 *
 * WHY IT LIVES ON THE BOOKING. MsEe Central counts the bookings it brought and
 * works out its own commission from them. That question has exactly one honest
 * answer and it is known at the moment the booking is taken — so it is recorded
 * then, on the booking, rather than reconstructed later from somebody's memory
 * of which guests came from where.
 *
 * `createdVia` separates the two ways a booking can carry this: marked here by
 * the person taking it, or created by MsEe Central itself through the agency
 * account. Both count the same; knowing which is which is worth a field.
 *
 * Writing `null` rather than dropping the keys when the box is unticked matters
 * for edits: a booking wrongly marked must be able to become unmarked, and a
 * missing key in a merge leaves the old value in place.
 */
function mseeStamp(viaMsee, existing = null, cut = {}) {
  /*
   * A booking MsEe Central created keeps its provenance, ticked or not.
   *
   * Checked first, and deliberately: that claim was not made here and must not
   * be unmade here. Unticking it would leave MsEe Central holding a reservation
   * it knows it made against a booking that denies it, and the two would
   * disagree for ever with no way to tell which was right.
   */
  if (existing?.createdVia === 'MSEE_CENTRAL') return {}

  if (!viaMsee) {
    return {
      source: null,
      createdVia: null,
      mseeMarkedAt: null,
      mseeCommissionPercent: null,
      mseeCommissionAmount: null
    }
  }

  return {
    source: 'MSEE',
    createdVia: 'MSEE_RMS',
    mseeMarkedAt: new Date().toISOString(),
    /*
     * The commission, as entered on this booking.
     *
     * Both the percentage and the money: the percentage is what was agreed and
     * the amount is what it came to at this booking's price. Keeping the
     * percentage means a corrected price can be re-applied knowingly; keeping
     * the amount means MsEe Central reads what was decided rather than
     * recomputing it from terms that may since have changed.
     */
    mseeCommissionPercent: Number(cut.percent) || 0,
    mseeCommissionAmount: Number(cut.amount) || 0
  }
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

    /*
     * The booking and the nights it takes, written together or not at all.
     *
     * checkConflict above reads the list this browser happens to hold, which is
     * the right first answer — it names the guest who is already there — but it
     * is not a guarantee: two people booking the same apartment in the same
     * second both read a list without the other's booking in it, and both
     * succeed. Nothing on the server was stopping that.
     *
     * So the nights live on the apartment document, and the booking is created
     * inside a transaction that reads them first. Firestore retries a
     * transaction whose document changed underneath it, so the second writer
     * re-reads, sees the first writer's nights, and fails. That is a real
     * guarantee rather than a narrow window.
     */
    const nights = nightsOf(data.checkIn, data.checkOut)

    await runTransaction(db, async (tx) => {
      const aptRef = doc(db, 'apartments', data.apartmentId)
      const aptSnap = await tx.get(aptRef)
      if (!aptSnap.exists()) throw new Error('Apartment not found.')

      const taken = aptSnap.data().bookedNights || []
      const clash = conflictError(nights, taken)
      if (clash) throw clash

      tx.set(doc(collection(db, 'bookings')), {
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
        createdAt: serverTimestamp(),
        ...mseeStamp(data.viaMsee, null, {
          percent: data.mseeCommissionPercent,
          amount: data.mseeCommissionAmount
        })
      })

      tx.update(aptRef, { bookedNights: [...taken, ...nights].sort() })
    })
    // bookingCount is reconciled by the snapshot listener (syncCount).
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

    /* `viaMsee` is the form's word for it; the stored shape is the stamp. */
    if ('viaMsee' in data) {
      delete updates.viaMsee
      delete updates.mseeCommissionPercent
      delete updates.mseeCommissionAmount
      Object.assign(
        updates,
        mseeStamp(data.viaMsee, existing, {
          percent: data.mseeCommissionPercent,
          amount: data.mseeCommissionAmount
        })
      )
    }

    if (data.checkIn && data.checkOut && data.pricePerNight != null) {
      const { days, totalPrice } = calculateBooking(data.checkIn, data.checkOut, data.pricePerNight)
      updates.days = days
      updates.totalPrice = totalPrice
      const totalPaid = existing?.totalPaid || 0
      const depositAmount = Number(data.depositAmount ?? existing?.depositAmount ?? 0)
      updates.paymentStatus = calcPaymentStatus(totalPaid, totalPrice, depositAmount)
    }

    await updateDoc(doc(db, 'bookings', id), updates)

    // A moved stay frees the nights it used to hold and takes new ones. Done
    // after the write rather than inside it, because the authority for the index
    // is the bookings themselves — reindex recomputes from them, so it cannot
    // drift even if this call is interrupted halfway.
    if (existing) {
      const moved = data.apartmentId && data.apartmentId !== existing.apartmentId
      await reindex(existing.apartmentId)
      if (moved) await reindex(data.apartmentId)
    }
  }

  async function cancelBooking(id) {
    const existing = bookings.value.find(b => b.id === id)
    await updateDoc(doc(db, 'bookings', id), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    // A cancelled stay must free its nights, or the apartment stays unsellable.
    if (existing) await reindex(existing.apartmentId, id)
  }

  async function deleteBooking(id) {
    const existing = bookings.value.find(b => b.id === id)
    await deleteDoc(doc(db, 'bookings', id))
    if (existing) await reindex(existing.apartmentId, id)
    // bookingCount is reconciled by the snapshot listener (syncCount).
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

  /*
   * Rewrite one apartment's night index from the bookings themselves.
   *
   * The bookings are the truth; the index is a copy kept so that a create can be
   * atomic. A copy that can drift needs a way back, and this is it: recomputed
   * rather than adjusted, so one interrupted call cannot leave a night locked
   * for ever.
   *
   * `excludeId` is for the booking being cancelled or deleted, whose removal has
   * not reached the local snapshot yet.
   */
  async function reindex(apartmentId, excludeId = null) {
    if (!apartmentId) return
    const nights = [...nightsTakenBy(bookings.value, apartmentId, excludeId)].sort()
    await updateDoc(doc(db, 'apartments', apartmentId), { bookedNights: nights }).catch(() => {})
  }

  /*
   * Bring every apartment's index in step with reality.
   *
   * The same self-healing idea the counters already use: the owner opening their
   * own data is the moment drift gets fixed, and it is also how apartments that
   * existed before there was an index get one. Only differences are written, so
   * the usual case costs nothing.
   */
  async function reconcileNights(apartmentIds) {
    const { useApartmentsStore } = await import('./apartments')
    const apartmentsStore = useApartmentsStore()
    const list = apartmentIds || apartmentsStore.apartments.map(a => a.id)

    for (const apt of apartmentsStore.apartments) {
      if (!list.includes(apt.id)) continue
      const want = [...nightsTakenBy(bookings.value, apt.id)].sort()
      const have = [...(apt.bookedNights || [])].sort()
      if (want.length === have.length && want.every((n, i) => n === have[i])) continue
      await updateDoc(doc(db, 'apartments', apt.id), { bookedNights: want }).catch(() => {})
    }
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
    const newCutoff = Date.now() - 2 * 86400000 // reservations added in the last 48h
    const notes = []
    bookings.value.forEach(b => {
      if (b.status === 'cancelled') return
      const createdMs = b.createdAt?.toMillis?.() || 0
      if (createdMs && createdMs >= newCutoff) notes.push({ type: 'new', booking: b })
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
    // Most actionable first: fresh bookings, then today's movements, then upcoming.
    const order = { new: 0, arrival: 1, arriving_tomorrow: 2, payment_due: 3, departure: 4, upcoming: 5 }
    return notes.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9))
  })

  return {
    bookings, loading,
    subscribe, unsubscribeAll,
    calculateBooking, checkConflict, calcPaymentStatus,
    nightsOf, reindex, reconcileNights,
    addBooking, updateBooking, cancelBooking, deleteBooking,
    addPayment, removePayment,
    isDateBooked, bookingsForApartment,
    activeBookings, totalRevenue, totalCollected, totalOutstanding,
    revenueByApartment, todayNotifications
  }
})
