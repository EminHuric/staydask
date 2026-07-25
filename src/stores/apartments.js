// src/stores/apartments.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'

export const useApartmentsStore = defineStore('apartments', () => {
  const apartments = ref([])
  const loading = ref(false)
  let unsubscribe = null
  let lastCount = null

  // Keeps the denormalized apartmentCount on the user doc in sync with the real
  // number of documents. Self-healing: fixes any drift (e.g. a counter that went
  // negative) the moment the owner loads their data. Admins read this counter.
  function syncCount(workspaceId, n) {
    if (n === lastCount) return
    lastCount = n
    updateDoc(doc(db, 'users', workspaceId), { apartmentCount: n }).catch(() => {})
  }

  function subscribe() {
    const authStore = useAuthStore()
    if (!authStore.workspaceId) return
    const workspaceId = authStore.workspaceId

    loading.value = true
    const q = query(
      collection(db, 'apartments'),
      where('workspaceId', '==', workspaceId)
    )

    unsubscribe = onSnapshot(q, (snap) => {
      apartments.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      loading.value = false
      syncCount(workspaceId, apartments.value.length)
    })
  }

  function unsubscribeAll() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
    apartments.value = []
    lastCount = null
  }

  async function addApartment(data) {
    const authStore = useAuthStore()
    await addDoc(collection(db, 'apartments'), {
      ...data,
      workspaceId: authStore.workspaceId,
      createdAt: serverTimestamp()
    })
    // apartmentCount is reconciled by the snapshot listener (syncCount).
  }

  async function updateApartment(id, data) {
    await updateDoc(doc(db, 'apartments', id), { ...data, updatedAt: serverTimestamp() })
  }

  async function deleteApartment(id) {
    await deleteDoc(doc(db, 'apartments', id))
    // apartmentCount is reconciled by the snapshot listener (syncCount).
  }

  return { apartments, loading, subscribe, unsubscribeAll, addApartment, updateApartment, deleteApartment }
})
