// src/stores/apartments.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'

export const useApartmentsStore = defineStore('apartments', () => {
  const apartments = ref([])
  const loading = ref(false)
  const limit = ref(null) // null = unlimited; set by the workspace owner via Admin panel
  let unsubscribe = null
  let unsubLimit = null

  function subscribe() {
    const authStore = useAuthStore()
    if (!authStore.workspaceId) return

    loading.value = true
    const q = query(
      collection(db, 'apartments'),
      where('workspaceId', '==', authStore.workspaceId)
    )

    unsubscribe = onSnapshot(q, (snap) => {
      apartments.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      loading.value = false
    })

    // The workspace's own record is the owner's user doc (workspaceId === owner's uid)
    unsubLimit = onSnapshot(doc(db, 'users', authStore.workspaceId), (snap) => {
      limit.value = snap.exists() ? (snap.data().apartmentLimit ?? null) : null
    })
  }

  function unsubscribeAll() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
    if (unsubLimit) { unsubLimit(); unsubLimit = null }
    apartments.value = []
    limit.value = null
  }

  async function addApartment(data) {
    const authStore = useAuthStore()
    if (limit.value != null && apartments.value.length >= limit.value) {
      throw new Error(`Apartment limit reached (${limit.value}). Ask your admin to raise it.`)
    }
    await addDoc(collection(db, 'apartments'), {
      ...data,
      workspaceId: authStore.workspaceId,
      createdAt: serverTimestamp()
    })
  }

  async function updateApartment(id, data) {
    await updateDoc(doc(db, 'apartments', id), { ...data, updatedAt: serverTimestamp() })
  }

  async function deleteApartment(id) {
    await deleteDoc(doc(db, 'apartments', id))
  }

  async function setLimit(value) {
    const authStore = useAuthStore()
    await updateDoc(doc(db, 'users', authStore.workspaceId), {
      apartmentLimit: value == null || value === '' ? null : Number(value)
    })
  }

  return { apartments, loading, limit, subscribe, unsubscribeAll, addApartment, updateApartment, deleteApartment, setLimit }
})