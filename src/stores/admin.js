import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, setDoc, updateDoc,
  doc, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

// Sorts newest-first client-side (avoids needing a composite index).
function byCreatedAtDesc(a, b) {
  return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
}

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Platform-wide account management. Admins can see every account (for invite
// codes, roles, and per-account apartment limits) but never anyone's actual
// apartments/bookings/guests — those stay isolated to each account.
export const useAdminStore = defineStore('admin', () => {
  const inviteCodes = ref([])
  const users = ref([])
  const loading = ref(false)
  let unsubCodes = null
  let unsubUsers = null

  function subscribeInviteCodes() {
    loading.value = true
    unsubCodes = onSnapshot(collection(db, 'inviteCodes'), snap => {
      inviteCodes.value = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreatedAtDesc)
      loading.value = false
    })
  }

  function subscribeUsers() {
    unsubUsers = onSnapshot(collection(db, 'users'), snap => {
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
    const code = generateCode()
    await setDoc(doc(db, 'inviteCodes', code), {
      code,
      label,
      role: role === 'admin' ? 'admin' : 'user',
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

  async function setUserLimit(userId, value) {
    await updateDoc(doc(db, 'users', userId), {
      apartmentLimit: value == null || value === '' ? null : Number(value)
    })
  }

  return {
    inviteCodes, users, loading,
    subscribeInviteCodes, subscribeUsers, unsubscribeAll,
    createInviteCode, toggleCodeActive, setUserRole, setUserLimit
  }
})
