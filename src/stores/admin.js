import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, setDoc, updateDoc,
  doc, onSnapshot, query, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'

// Sorts newest-first without requiring a composite (workspaceId + createdAt) index.
function byCreatedAtDesc(a, b) {
  return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
}

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const useAdminStore = defineStore('admin', () => {
  const inviteCodes = ref([])
  const users = ref([])
  const loading = ref(false)
  let unsubCodes = null
  let unsubUsers = null

  function subscribeInviteCodes() {
    const authStore = useAuthStore()
    if (!authStore.workspaceId) return
    loading.value = true
    const q = query(collection(db, 'inviteCodes'), where('workspaceId', '==', authStore.workspaceId))
    unsubCodes = onSnapshot(q, snap => {
      inviteCodes.value = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreatedAtDesc)
      loading.value = false
    })
  }

  function subscribeUsers() {
    const authStore = useAuthStore()
    if (!authStore.workspaceId) return
    const q = query(collection(db, 'users'), where('workspaceId', '==', authStore.workspaceId))
    unsubUsers = onSnapshot(q, snap => {
      users.value = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreatedAtDesc)
    })
  }

  function unsubscribeAll() {
    if (unsubCodes) { unsubCodes(); unsubCodes = null }
    if (unsubUsers) { unsubUsers(); unsubUsers = null }
    inviteCodes.value = []
    users.value = []
  }

  async function createInviteCode(label = '', role = 'user') {
    const authStore = useAuthStore()
    const code = generateCode()
    await setDoc(doc(db, 'inviteCodes', code), {
      code,
      label,
      role: role === 'admin' ? 'admin' : 'user',
      workspaceId: authStore.workspaceId,
      active: true,
      usedBy: null,
      usedByUsername: null,
      usedAt: null,
      createdAt: serverTimestamp()
    })
    return code
  }

  async function toggleCodeActive(id, current) {
    await updateDoc(doc(db, 'inviteCodes', id), { active: !current })
  }

  async function setUserRole(userId, role) {
    await updateDoc(doc(db, 'users', userId), { role: role === 'admin' ? 'admin' : 'user' })
  }

  return {
    inviteCodes, users, loading,
    subscribeInviteCodes, subscribeUsers, unsubscribeAll,
    createInviteCode, toggleCodeActive, setUserRole
  }
})
