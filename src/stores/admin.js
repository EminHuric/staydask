import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, setDoc, updateDoc, deleteDoc, addDoc,
  doc, getDoc, getDocs, query, where, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'

// Sorts newest-first client-side (avoids needing a composite index).
function byCreatedAtDesc(a, b) {
  return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
}

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Platform-wide account management. Admins can see every account (for invite
// codes, roles, enabling/disabling and deleting users) but never anyone's
// actual apartments/bookings/guests — those stay isolated to each account.
export const useAdminStore = defineStore('admin', () => {
  const inviteCodes = ref([])
  const users = ref([])
  const loading = ref(false)

  // uid of the platform's root admin (from /setup) — protected from other admins.
  const superAdminId = ref(null)

  // Read-only snapshot of one account's data, for the admin support view.
  const inspect = ref({ user: null, apartments: [], bookings: [], guests: [], loading: false })

  // Notes of ONE selected user, loaded on demand from the admin panel.
  const selectedUserNotes = ref([])
  const selectedUserId = ref(null)

  let unsubCodes = null
  let unsubUsers = null
  let unsubUserNotes = null

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
    unsubscribeUserNotes()
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

  async function deleteInviteCode(id) {
    await deleteDoc(doc(db, 'inviteCodes', id))
  }

  async function setUserRole(userId, role) {
    await updateDoc(doc(db, 'users', userId), { role: role === 'admin' ? 'admin' : 'user' })
  }

  // Reversible block: disabled users keep all their data but are refused entry
  // (enforced in the auth store on login and by the Firestore security rules).
  async function setUserDisabled(userId, disabled) {
    await updateDoc(doc(db, 'users', userId), { disabled: !!disabled })
  }

  // Removes the account: deletes the user's profile so they can no longer sign
  // in. Their private business documents become permanently orphaned (no one
  // can read data whose workspaceId belongs to a profile that no longer exists).
  async function deleteUser(userId) {
    await deleteDoc(doc(db, 'users', userId))
  }

  // ── Notes for a single user (admin ↔ that user channel) ──
  function subscribeUserNotes(userId) {
    unsubscribeUserNotes()
    selectedUserId.value = userId
    const q = query(collection(db, 'notes'), where('workspaceId', '==', userId))
    unsubUserNotes = onSnapshot(q, snap => {
      selectedUserNotes.value = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreatedAtDesc)
    })
  }

  function unsubscribeUserNotes() {
    if (unsubUserNotes) { unsubUserNotes(); unsubUserNotes = null }
    selectedUserNotes.value = []
    selectedUserId.value = null
  }

  async function addUserNote(userId, text) {
    const authStore = useAuthStore()
    await addDoc(collection(db, 'notes'), {
      workspaceId: userId,
      text: text.trim(),
      authorId: authStore.user?.uid || null,
      authorName: authStore.userProfile?.username || 'Admin',
      authorRole: 'admin',
      createdAt: serverTimestamp()
    })
  }

  async function deleteUserNote(id) {
    await deleteDoc(doc(db, 'notes', id))
  }

  // ── super admin + read-only account inspection ──
  async function loadSuperAdmin() {
    try {
      const snap = await getDoc(doc(db, 'meta', 'setup'))
      superAdminId.value = snap.exists() ? (snap.data().completedBy || null) : null
    } catch {
      superAdminId.value = null
    }
  }

  async function loadUserData(u) {
    inspect.value = { user: u, apartments: [], bookings: [], guests: [], loading: true }
    const forWs = (col) => query(collection(db, col), where('workspaceId', '==', u.id))
    try {
      const [aps, bks, gsts] = await Promise.all([
        getDocs(forWs('apartments')),
        getDocs(forWs('bookings')),
        getDocs(forWs('guests'))
      ])
      inspect.value = {
        user: u,
        apartments: aps.docs.map(d => ({ id: d.id, ...d.data() })),
        bookings: bks.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreatedAtDesc),
        guests: gsts.docs.map(d => ({ id: d.id, ...d.data() })),
        loading: false
      }
    } catch (e) {
      inspect.value = { user: u, apartments: [], bookings: [], guests: [], loading: false, error: e.message }
    }
  }

  function clearInspect() {
    inspect.value = { user: null, apartments: [], bookings: [], guests: [], loading: false }
  }

  return {
    inviteCodes, users, loading, superAdminId, inspect,
    selectedUserNotes, selectedUserId,
    subscribeInviteCodes, subscribeUsers, unsubscribeAll,
    createInviteCode, toggleCodeActive, deleteInviteCode, setUserRole,
    setUserDisabled, deleteUser,
    subscribeUserNotes, unsubscribeUserNotes, addUserNote, deleteUserNote,
    loadSuperAdmin, loadUserData, clearInspect
  }
})
