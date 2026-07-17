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
  }

  async function updateApartment(id, data) {
    await updateDoc(doc(db, 'apartments', id), { ...data, updatedAt: serverTimestamp() })
  }

  async function deleteApartment(id) {
    await deleteDoc(doc(db, 'apartments', id))
  }

  return { apartments, loading, subscribe, unsubscribeAll, addApartment, updateApartment, deleteApartment }
})