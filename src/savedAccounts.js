// src/savedAccounts.js
// Instagram-style account switcher storage. Keeps the list of accounts that were
// signed in ON THIS DEVICE/BROWSER, so switching is one click (no retyping).
//
// Isolation is inherent: the list lives in localStorage, which is per-browser —
// each person only ever sees the accounts they personally signed into. Nothing
// is shared between users or synced to the server.
//
// Security note: to switch without retyping we must keep the password locally.
// It is lightly obfuscated (not real encryption) and never leaves the device.
// A stale entry (e.g. after a password change) is dropped automatically the next
// time switching to it fails.

import { reactive } from 'vue'

const KEY = 'rms_accounts'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

/** Reactive so the switcher UI updates as accounts are added/removed. */
export const accountsState = reactive({ list: read() })

function obfuscate(pw) {
  try { return btoa(encodeURIComponent(pw)) } catch { return '' }
}

export function revealSecret(secret) {
  try { return decodeURIComponent(atob(secret)) } catch { return '' }
}

/**
 * Remember (or refresh) an account after a successful sign-in. Keyed by uid,
 * with email as a fallback so the same person isn't stored twice.
 */
export function rememberAccount({ uid, email, username, role, password }) {
  if (!uid || !email) return
  const entry = {
    uid,
    email,
    username: username || email,
    role: role || 'user',
    secret: obfuscate(password),
    savedAt: Date.now()
  }
  const list = accountsState.list.slice()
  const i = list.findIndex(
    a => a.uid === uid || (a.email || '').toLowerCase() === email.toLowerCase()
  )
  if (i >= 0) list[i] = entry
  else list.push(entry)
  accountsState.list = list
  write(list)
}

/** Drop an account from this device (manual remove, or after a failed switch). */
export function forgetAccount(uid) {
  accountsState.list = accountsState.list.filter(a => a.uid !== uid)
  write(accountsState.list)
}

export function getAccount(uid) {
  return accountsState.list.find(a => a.uid === uid) || null
}
