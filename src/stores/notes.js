import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, addDoc, deleteDoc,
  doc, query, where, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'

// Notes are a private channel per workspace: the account owner and any platform
// admin can read/write them, no one else. Admin-authored notes appear to the
// owner as messages from the administrator.
function byCreatedAtDesc(a, b) {
  return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref([])
  const loading = ref(false)
  let unsubscribe = null

  function subscribe() {
    const authStore = useAuthStore()
    if (!authStore.workspaceId) return
    loading.value = true
    const q = query(
      collection(db, 'notes'),
      where('workspaceId', '==', authStore.workspaceId)
    )
    unsubscribe = onSnapshot(q, snap => {
      notes.value = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreatedAtDesc)
      loading.value = false
    })
  }

  function unsubscribeAll() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
    notes.value = []
  }

  async function addNote(text) {
    const authStore = useAuthStore()
    const body = (text || '').trim()
    if (!body) return
    await addDoc(collection(db, 'notes'), {
      workspaceId: authStore.workspaceId,
      text: body,
      authorId: authStore.user?.uid || null,
      authorName: authStore.userProfile?.username || authStore.userProfile?.email || 'You',
      authorRole: authStore.isAdmin ? 'admin' : 'user',
      createdAt: serverTimestamp()
    })
  }

  async function deleteNote(id) {
    await deleteDoc(doc(db, 'notes', id))
  }

  return { notes, loading, subscribe, unsubscribeAll, addNote, deleteNote }
})
