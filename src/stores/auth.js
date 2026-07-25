// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../firebase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userProfile = ref(null)
  const loading = ref(true)
  const error = ref(null)

  // True only during account creation. While a signup is in flight the profile
  // doc doesn't exist yet, so the auth listener must NOT treat that as a removed
  // account (which would sign the new user out mid-registration).
  let signingUp = false

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')
  const workspaceId = computed(() => userProfile.value?.workspaceId || user.value?.uid)

  // Why an account may be denied access: its profile was deleted by an admin
  // ('removed'), or an admin flipped the disabled flag ('disabled'). Returns
  // null when the account is allowed in.
  function accountBlockReason() {
    if (!userProfile.value) return 'removed'
    if (userProfile.value.disabled === true) return 'disabled'
    return null
  }

  function blockMessage(reason) {
    return reason === 'disabled'
      ? 'Your account has been disabled. Please contact your administrator.'
      : 'This account no longer exists. Please contact your administrator.'
  }

  // Listen to auth state
  function init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          if (signingUp) {
            // Registration in progress — let the signup flow create the profile
            // and set userProfile itself; don't block on the not-yet-written doc.
            user.value = firebaseUser
          } else {
            await loadUserProfile(firebaseUser.uid)
            const reason = accountBlockReason()
            if (reason) {
              // Disabled or removed accounts are signed straight back out.
              await signOut(auth)
              user.value = null
              userProfile.value = null
              error.value = blockMessage(reason)
            } else {
              user.value = firebaseUser
            }
          }
        } else {
          user.value = null
          userProfile.value = null
        }
        loading.value = false
        resolve()
      })
    })
  }

  async function loadUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid))
    userProfile.value = snap.exists() ? { id: snap.id, ...snap.data() } : null
  }

  // Login with email + password
  async function loginWithCredentials(email, password) {
    error.value = null
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await loadUserProfile(cred.user.uid)
      const reason = accountBlockReason()
      if (reason) {
        await signOut(auth)
        user.value = null
        userProfile.value = null
        error.value = blockMessage(reason)
        return { success: false, error: error.value }
      }
      user.value = cred.user
      return { success: true }
    } catch (e) {
      error.value = 'Invalid email or password.'
      return { success: false, error: error.value }
    }
  }

  // First-run setup: create the very first admin account. Guarded by signingUp
  // so the auth listener doesn't sign the new admin out before their profile exists.
  async function createFirstAdmin({ name, email, password }) {
    error.value = null
    signingUp = true
    try {
      // Only works once — after the first admin exists this path locks itself.
      const setupSnap = await getDoc(doc(db, 'meta', 'setup'))
      if (setupSnap.exists()) {
        return { success: false, error: 'Setup has already been completed. Go to Sign in, or ask your admin for an invite code.' }
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })

      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        username: name,
        email,
        role: 'admin',
        workspaceId: cred.user.uid,
        disabled: false,
        apartmentCount: 0,
        bookingCount: 0,
        guestCount: 0,
        createdAt: serverTimestamp()
      })

      await setDoc(doc(db, 'meta', 'setup'), {
        completedBy: cred.user.uid,
        completedAt: serverTimestamp()
      })

      user.value = cred.user
      await loadUserProfile(cred.user.uid)
      return { success: true }
    } catch (e) {
      error.value = e.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists. Go to Sign in.'
        : e.message
      return { success: false, error: error.value }
    } finally {
      signingUp = false
    }
  }

  // Login / Register with invite code
  async function loginWithInviteCode(code, username, email, password) {
    error.value = null
    signingUp = true
    try {
      // Look up the invite code (its Firestore doc ID is the code itself)
      const normalizedCode = code.trim().toUpperCase()
      const codeRef = doc(db, 'inviteCodes', normalizedCode)
      const codeSnap = await getDoc(codeRef)

      if (!codeSnap.exists() || !codeSnap.data().active) {
        error.value = 'Invalid or inactive invite code.'
        return { success: false, error: error.value }
      }

      const codeData = codeSnap.data()

      if (codeData.usedBy) {
        error.value = 'This invite code has already been used.'
        return { success: false, error: error.value }
      }

      // Create Firebase Auth user — a real email so "forgot password" works later
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: username })

      // Create user profile in Firestore — every account is its own isolated workspace
      const userDocRef = doc(db, 'users', cred.user.uid)
      await setDoc(userDocRef, {
        uid: cred.user.uid,
        username,
        email,
        role: codeData.role === 'admin' ? 'admin' : 'user',
        workspaceId: cred.user.uid,
        disabled: false,
        apartmentCount: 0,
        bookingCount: 0,
        guestCount: 0,
        inviteCode: normalizedCode,
        createdAt: serverTimestamp()
      })

      // Mark invite code as used
      await updateDoc(codeRef, {
        usedBy: cred.user.uid,
        usedByUsername: username,
        usedAt: serverTimestamp()
      })

      user.value = cred.user
      await loadUserProfile(cred.user.uid)
      return { success: true }
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        error.value = 'An account with this email already exists. Go to Sign in.'
      } else {
        error.value = e.message
      }
      return { success: false, error: error.value }
    } finally {
      signingUp = false
    }
  }

  async function resetPassword(email) {
    error.value = null
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (e) {
      error.value = e.code === 'auth/user-not-found'
        ? 'No account found with that email.'
        : e.message
      return { success: false, error: error.value }
    }
  }

  async function logout() {
    await signOut(auth)
    user.value = null
    userProfile.value = null
  }

  return {
    user, userProfile, loading, error,
    isAuthenticated, isAdmin, workspaceId,
    init, loginWithCredentials, loginWithInviteCode, createFirstAdmin,
    resetPassword, logout, loadUserProfile
  }
})
