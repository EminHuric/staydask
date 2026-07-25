// src/stores/apartments.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, serverTimestamp, increment
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'

export const useApartmentsStore = defineStore('apartments', () => {
  const apartments = ref([])
  const loading = ref(false)
  let unsubscribe = null

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
  }

  function unsubscribeAll() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
    apartments.value = []
  }

  async function addApartment(data) {
    const authStore = useAuthStore()
    await addDoc(collection(db, 'apartments'), {
      ...data,
      workspaceId: authStore.workspaceId,
      createdAt: serverTimestamp()
    })
    await updateDoc(doc(db, 'users', authStore.workspaceId), { apartmentCount: increment(1) })
  }

  async function updateApartment(id, data) {
    await updateDoc(doc(db, 'apartments', id), { ...data, updatedAt: serverTimestamp() })
  }

  async function deleteApartment(id) {
    const authStore = useAuthStore()
    await deleteDoc(doc(db, 'apartments', id))
    await updateDoc(doc(db, 'users', authStore.workspaceId), { apartmentCount: increment(-1) })
  }

  return { apartments, loading, subscribe, unsubscribeAll, addApartment, updateApartment, deleteApartment }
})
