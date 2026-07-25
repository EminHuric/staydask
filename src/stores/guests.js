import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'

export const useGuestsStore = defineStore('guests', () => {
  const guests = ref([])
  const loading = ref(false)
  let unsubscribe = null
  let lastCount = null

  // Keeps the denormalized guestCount on the user doc in sync with reality
  // (self-healing — fixes any counter drift when the owner loads their data).
  function syncCount(workspaceId, n) {
    if (n === lastCount) return
    lastCount = n
    updateDoc(doc(db, 'users', workspaceId), { guestCount: n }).catch(() => {})
  }

  function subscribe() {
    const authStore = useAuthStore()
    if (!authStore.workspaceId) return
    const workspaceId = authStore.workspaceId
    loading.value = true
    const q = query(
      collection(db, 'guests'),
      where('workspaceId', '==', workspaceId)
    )
    unsubscribe = onSnapshot(q, snap => {
      guests.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      loading.value = false
      syncCount(workspaceId, guests.value.length)
    })
  }

  function unsubscribeAll() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
    guests.value = []
    lastCount = null
  }

  async function addGuest(data) {
    const authStore = useAuthStore()
    const created = await addDoc(collection(db, 'guests'), {
      ...data,
      workspaceId: authStore.workspaceId,
      createdAt: serverTimestamp()
    })
    // guestCount is reconciled by the snapshot listener (syncCount).
    return created.id
  }

  async function updateGuest(id, data) {
    await updateDoc(doc(db, 'guests', id), { ...data, updatedAt: serverTimestamp() })
  }

  async function deleteGuest(id) {
    await deleteDoc(doc(db, 'guests', id))
    // guestCount is reconciled by the snapshot listener (syncCount).
  }

  // Find existing guest by phone or name, or create new one
  async function findOrCreateGuest({ fullName, phone, origin }) {
    const byPhone = phone && guests.value.find(g => g.phone === phone)
    if (byPhone) return byPhone.id
    const byName = guests.value.find(
      g => g.fullName?.toLowerCase() === fullName?.toLowerCase()
    )
    if (byName) return byName.id
    return await addGuest({ fullName, phone: phone || '', origin: origin || '', email: '', country: '', notes: '' })
  }

  return {
    guests, loading,
    subscribe, unsubscribeAll,
    addGuest, updateGuest, deleteGuest, findOrCreateGuest
  }
})
