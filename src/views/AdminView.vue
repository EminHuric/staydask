<!-- src/views/AdminView.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Admin Panel</h1>
        <p class="text-muted text-sm mt-2">Manage accounts, access and invite codes</p>
      </div>
      <div class="header-actions">
        <label class="role-toggle">
          <input type="checkbox" v-model="newCodeIsAdmin" />
          Invite as admin
        </label>
        <button class="btn btn-primary" @click="createCode">+ Generate Invite Code</button>
      </div>
    </div>

    <div v-if="actionMsg" class="action-msg">{{ actionMsg }}</div>

    <!-- Platform overview -->
    <div class="card mb-4">
      <h2 class="mb-4">Platform Overview</h2>
      <div class="grid-4">
        <div class="stat-card">
          <div class="stat-icon">👤</div>
          <div class="stat-value">{{ adminStore.users.length }}</div>
          <div class="stat-label">Accounts</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏠</div>
          <div class="stat-value">{{ platformTotals.apartments }}</div>
          <div class="stat-label">Apartments</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-value">{{ platformTotals.bookings }}</div>
          <div class="stat-label">Bookings</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-value">{{ platformTotals.guests }}</div>
          <div class="stat-label">Guests</div>
        </div>
      </div>
      <p class="text-xs text-muted mt-2">
        Each account's apartments, bookings and guests stay private — admins only see these totals and counts, never the actual data.
      </p>
    </div>

    <!-- Users management (detailed) -->
    <div class="card mb-4">
      <div class="card-header-row">
        <h2>User Accounts</h2>
        <input v-model="search" class="form-input search-input" placeholder="Search name or email…" />
      </div>

      <div v-if="filteredUsers.length === 0" class="text-muted text-sm empty-pad">
        {{ adminStore.users.length === 0 ? 'No users registered yet.' : 'No users match your search.' }}
      </div>

      <div class="users-grid">
        <div v-for="u in filteredUsers" :key="u.id" class="user-card" :class="{ 'is-disabled': u.disabled }">
          <div class="user-card-top">
            <div class="user-avatar" :class="{ disabled: u.disabled }">{{ initial(u) }}</div>
            <div class="user-identity">
              <div class="user-name">
                {{ u.username || u.email }}
                <span v-if="u.id === authStore.user?.uid" class="you-tag">you</span>
              </div>
              <div class="user-email">{{ u.email }}</div>
            </div>
            <div class="user-badges">
              <span :class="['badge', u.role === 'admin' ? 'badge-amber' : 'badge-blue']">{{ u.role || 'user' }}</span>
              <span :class="['badge', u.disabled ? 'badge-red' : 'badge-green']">{{ u.disabled ? 'Disabled' : 'Active' }}</span>
            </div>
          </div>

          <div class="user-stats">
            <div class="us"><span class="us-val">{{ count(u.apartmentCount) }}</span><span class="us-lbl">Apartments</span></div>
            <div class="us"><span class="us-val">{{ count(u.bookingCount) }}</span><span class="us-lbl">Bookings</span></div>
            <div class="us"><span class="us-val">{{ count(u.guestCount) }}</span><span class="us-lbl">Guests</span></div>
            <div class="us"><span class="us-val small">{{ formatDate(u.createdAt) }}</span><span class="us-lbl">Joined</span></div>
          </div>

          <div class="user-actions">
            <button class="btn btn-ghost btn-sm" @click="openNotes(u)">📝 Notes</button>
            <template v-if="u.id !== authStore.user?.uid">
              <button class="btn btn-ghost btn-sm" @click="toggleRole(u)">
                {{ u.role === 'admin' ? 'Demote' : 'Make admin' }}
              </button>
              <button class="btn btn-ghost btn-sm" @click="resetUserPassword(u)">Reset password</button>
              <button
                class="btn btn-sm"
                :class="u.disabled ? 'btn-primary' : 'btn-ghost'"
                @click="toggleDisabled(u)"
              >{{ u.disabled ? 'Enable' : 'Disable' }}</button>
              <button class="btn btn-danger btn-sm" @click="removeUser(u)">Delete</button>
            </template>
            <span v-else class="text-xs text-muted self-note">You can't disable or delete your own account.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite codes -->
    <div class="card mb-4">
      <h2 class="mb-4">Invite Codes</h2>

      <div v-if="newCode" class="new-code-banner">
        <div>
          <div class="text-xs text-muted mb-1">New code generated — share this with your user:</div>
          <div class="code-display">{{ newCode }}</div>
        </div>
        <button class="btn btn-ghost btn-sm" @click="copyCode(newCode)">
          {{ copied ? '✓ Copied' : 'Copy' }}
        </button>
      </div>

      <div class="label-group" v-if="adminStore.inviteCodes.length === 0 && !adminStore.loading">
        <p class="text-muted text-sm">No invite codes yet. Generate one to add users.</p>
      </div>

      <div class="codes-list">
        <div v-for="code in adminStore.inviteCodes" :key="code.id" class="code-row">
          <div class="code-main">
            <span class="code-value" :class="{ 'code-used': code.usedBy, 'code-inactive': !code.active }">
              {{ code.code }}
            </span>
            <span v-if="code.label" class="code-label-text">{{ code.label }}</span>
          </div>
          <div class="code-meta">
            <span v-if="code.role === 'admin'" class="badge badge-amber">Admin invite</span>
            <span v-if="code.usedBy" class="badge badge-green">
              Used by {{ code.usedByUsername }}
            </span>
            <span v-else-if="code.active" class="badge badge-amber">Available</span>
            <span v-else class="badge badge-red">Inactive</span>
          </div>
          <div class="code-actions">
            <button
              v-if="!code.usedBy"
              class="btn btn-ghost btn-sm"
              @click="copyCode(code.code)"
            >Copy</button>
            <button
              v-if="!code.usedBy"
              class="btn btn-ghost btn-sm"
              @click="adminStore.toggleCodeActive(code.id, code.active)"
            >{{ code.active ? 'Disable' : 'Enable' }}</button>
            <button class="btn btn-danger btn-sm" @click="removeCode(code)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid-3 mt-4">
      <div class="stat-card">
        <div class="stat-icon">🎟️</div>
        <div class="stat-value">{{ adminStore.inviteCodes.length }}</div>
        <div class="stat-label">Total Codes</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">{{ usedCodes }}</div>
        <div class="stat-label">Codes Used</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🚫</div>
        <div class="stat-value">{{ disabledCount }}</div>
        <div class="stat-label">Disabled Accounts</div>
      </div>
    </div>

    <!-- Firebase rules reminder -->
    <div class="info-banner mt-4">
      <strong>Firebase Setup Note:</strong> Security rules live in <code>firestore.rules</code> at the
      project root — deploy them with <code>firebase deploy --only firestore:rules</code> so users and
      invite codes stay scoped to your workspace.
    </div>

    <!-- Notes modal -->
    <div v-if="notesUser" class="modal-overlay" @click.self="closeNotes">
      <div class="notes-modal">
        <div class="notes-modal-header">
          <div>
            <h3>Notes — {{ notesUser.username || notesUser.email }}</h3>
            <p class="text-xs text-muted">Visible only to this user and admins.</p>
          </div>
          <button class="icon-close" @click="closeNotes">✕</button>
        </div>

        <div class="notes-add">
          <textarea
            v-model="noteText"
            class="form-input"
            rows="2"
            placeholder="Leave a note or message for this user…"
            @keydown.ctrl.enter="submitNote"
          ></textarea>
          <button class="btn btn-primary btn-sm" :disabled="!noteText.trim()" @click="submitNote">Send note</button>
        </div>

        <div class="notes-list">
          <div v-if="adminStore.selectedUserNotes.length === 0" class="text-muted text-sm empty-pad">
            No notes yet for this account.
          </div>
          <div
            v-for="n in adminStore.selectedUserNotes"
            :key="n.id"
            class="note-item"
            :class="{ 'from-admin': n.authorRole === 'admin' }"
          >
            <div class="note-head">
              <span class="note-author">
                {{ n.authorName }}
                <span class="badge" :class="n.authorRole === 'admin' ? 'badge-amber' : 'badge-blue'">
                  {{ n.authorRole === 'admin' ? 'Admin' : 'User' }}
                </span>
              </span>
              <span class="note-date">{{ formatDateTime(n.createdAt) }}</span>
            </div>
            <div class="note-text">{{ n.text }}</div>
            <button class="note-del" @click="removeNote(n.id)" title="Delete note">🗑</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { format } from 'date-fns'
import { useAdminStore } from '@/stores/admin'
import { useAuthStore } from '@/stores/auth'

const adminStore = useAdminStore()
const authStore = useAuthStore()

const newCode = ref('')
const copied = ref(false)
const newCodeIsAdmin = ref(false)
const search = ref('')
const actionMsg = ref('')

const notesUser = ref(null)
const noteText = ref('')

onMounted(() => {
  adminStore.subscribeInviteCodes()
  adminStore.subscribeUsers()
})

onUnmounted(() => {
  adminStore.unsubscribeAll()
})

// Platform-wide totals are summed from each account's stored counts — admins see
// aggregate numbers without ever reading anyone's actual apartments/bookings/guests.
const platformTotals = computed(() =>
  adminStore.users.reduce((acc, u) => {
    acc.apartments += count(u.apartmentCount)
    acc.bookings += count(u.bookingCount)
    acc.guests += count(u.guestCount)
    return acc
  }, { apartments: 0, bookings: 0, guests: 0 })
)

// Counters are denormalized and could momentarily drift negative; never show < 0.
function count(n) { return Math.max(0, n || 0) }

const usedCodes = computed(() => adminStore.inviteCodes.filter(c => c.usedBy).length)
const disabledCount = computed(() => adminStore.users.filter(u => u.disabled).length)

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return adminStore.users
  return adminStore.users.filter(u =>
    (u.username || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  )
})

function flash(msg) {
  actionMsg.value = msg
  setTimeout(() => { if (actionMsg.value === msg) actionMsg.value = '' }, 4000)
}

async function createCode() {
  const code = await adminStore.createInviteCode('', newCodeIsAdmin.value ? 'admin' : 'user')
  newCode.value = code
  copied.value = false
  newCodeIsAdmin.value = false
}

async function removeCode(code) {
  if (!confirm(`Delete invite code ${code.code}? This can't be undone.`)) return
  if (newCode.value === code.code) newCode.value = ''
  await adminStore.deleteInviteCode(code.id)
  flash(`Invite code ${code.code} deleted.`)
}

async function toggleRole(u) {
  const nextRole = u.role === 'admin' ? 'user' : 'admin'
  if (u.role === 'admin' && !confirm(`Remove admin access from ${u.username || u.email}?`)) return
  await adminStore.setUserRole(u.id, nextRole)
  flash(`${u.username || u.email} is now ${nextRole === 'admin' ? 'an admin' : 'a regular user'}.`)
}

async function toggleDisabled(u) {
  const next = !u.disabled
  if (next && !confirm(`Disable ${u.username || u.email}? They won't be able to sign in until you enable them again. Their data is kept.`)) return
  await adminStore.setUserDisabled(u.id, next)
  flash(next ? `${u.username || u.email} has been disabled.` : `${u.username || u.email} has been enabled.`)
}

async function removeUser(u) {
  const name = u.username || u.email
  if (!confirm(`Delete ${name}?\n\nThis removes their account — they can no longer sign in. This cannot be undone.`)) return
  await adminStore.deleteUser(u.id)
  flash(`${name} has been deleted.`)
}

async function resetUserPassword(u) {
  const res = await authStore.resetPassword(u.email)
  flash(res.success
    ? `Reset link sent to ${u.email} — tell them to check the spam folder too.`
    : (res.error || 'Could not send reset email.'))
}

function openNotes(u) {
  notesUser.value = u
  noteText.value = ''
  adminStore.subscribeUserNotes(u.id)
}

function closeNotes() {
  adminStore.unsubscribeUserNotes()
  notesUser.value = null
}

async function submitNote() {
  const body = noteText.value.trim()
  if (!body || !notesUser.value) return
  await adminStore.addUserNote(notesUser.value.id, body)
  noteText.value = ''
}

async function removeNote(id) {
  await adminStore.deleteUserNote(id)
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    /* fallback: select text */
  }
}

function initial(u) {
  return (u.username || u.email || '?')[0].toUpperCase()
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return format(d, 'dd MMM yyyy')
}

function formatDateTime(ts) {
  if (!ts) return 'just now'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return format(d, 'dd MMM yyyy, HH:mm')
}
</script>

<style scoped>
.page { padding: 1.5rem; max-width: 1100px; margin: 0 auto; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.action-msg {
  background: var(--green-dim);
  border: 1px solid rgba(34,197,94,0.3);
  color: var(--green);
  border-radius: var(--radius-sm);
  padding: 0.7rem 1rem;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.search-input { width: 240px; max-width: 100%; }
.empty-pad { padding: 0.75rem 0; }

/* Users grid */
.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 0.85rem;
}

.user-card {
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.user-card.is-disabled { opacity: 0.72; border-color: var(--red-dim); }

.user-card-top { display: flex; align-items: center; gap: 0.65rem; }
.user-avatar {
  width: 38px; height: 38px;
  background: var(--blue-dim);
  color: var(--blue);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem; font-weight: 700;
  flex-shrink: 0;
}
.user-avatar.disabled { background: var(--red-dim); color: var(--red); }
.user-identity { flex: 1; min-width: 0; }
.user-name {
  font-size: 0.9rem; font-weight: 600; color: var(--text);
  display: flex; align-items: center; gap: 0.4rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.you-tag {
  font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em;
  background: var(--accent-dim); color: var(--accent);
  padding: 0.05rem 0.35rem; border-radius: 4px; font-weight: 700;
}
.user-email { font-size: 0.72rem; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-badges { display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-end; flex-shrink: 0; }

.user-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  padding: 0.6rem 0;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}
.us { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; text-align: center; }
.us-val { font-size: 1rem; font-weight: 700; color: var(--text); }
.us-val.small { font-size: 0.72rem; font-weight: 600; }
.us-lbl { font-size: 0.6rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.03em; }

.user-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
.self-note { padding: 0.2rem 0; }

.header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.role-toggle {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.8rem; color: var(--text-2); cursor: pointer; white-space: nowrap;
}

/* New code banner */
.new-code-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--green-dim);
  border: 1px solid rgba(34,197,94,0.3);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 1.25rem;
  gap: 1rem;
}
.code-display {
  font-family: monospace;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--green);
}

/* Codes list */
.codes-list { display: flex; flex-direction: column; gap: 0.5rem; }
.code-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
}
.code-main { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 120px; }
.code-value {
  font-family: monospace;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text);
}
.code-value.code-used { color: var(--text-3); text-decoration: line-through; }
.code-value.code-inactive { color: var(--red); }
.code-label-text { font-size: 0.75rem; color: var(--text-3); }
.code-meta { flex-shrink: 0; }
.code-actions { display: flex; gap: 0.3rem; }

/* Stat cards */
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.stat-icon { font-size: 1.4rem; }
.stat-value { font-size: 1.6rem; font-weight: 700; color: var(--text); line-height: 1; }
.stat-label { font-size: 0.75rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }

/* Info banner */
.info-banner {
  background: var(--blue-dim);
  border: 1px solid rgba(59,130,246,0.3);
  border-radius: var(--radius-sm);
  padding: 1rem 1.25rem;
  font-size: 0.8rem;
  color: var(--text-2);
  line-height: 1.6;
}
.info-banner code {
  background: var(--bg-3);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--blue);
}

.label-group { padding: 0.5rem 0; }
.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }

/* Notes modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  z-index: 300;
  padding: 1rem;
}
.notes-modal {
  width: 100%;
  max-width: 540px;
  max-height: 85vh;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.notes-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.notes-modal-header h3 { font-size: 1rem; color: var(--text); }
.icon-close { background: none; border: none; color: var(--text-2); cursor: pointer; font-size: 1.1rem; padding: 0.25rem; }
.icon-close:hover { color: var(--text); }

.notes-add {
  display: flex; gap: 0.5rem; align-items: flex-end;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.notes-add textarea { flex: 1; resize: vertical; min-height: 42px; }

.notes-list {
  padding: 0.75rem 1.25rem 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.note-item {
  position: relative;
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.7rem 2rem 0.7rem 0.85rem;
}
.note-item.from-admin { border-left: 3px solid var(--accent); }
.note-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.35rem; }
.note-author { font-size: 0.75rem; font-weight: 600; color: var(--text-2); display: flex; align-items: center; gap: 0.35rem; }
.note-date { font-size: 0.68rem; color: var(--text-3); white-space: nowrap; }
.note-text { font-size: 0.85rem; color: var(--text); line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.note-del {
  position: absolute; top: 0.5rem; right: 0.5rem;
  background: none; border: none; cursor: pointer;
  font-size: 0.8rem; opacity: 0.5; padding: 0.15rem;
}
.note-del:hover { opacity: 1; }

@media (max-width: 768px) {
  .page { padding: 1rem 1rem 6rem; }
  .page-header { flex-direction: column; align-items: stretch; }
  .header-actions { justify-content: space-between; }
  .grid-3 { grid-template-columns: 1fr; }
  .users-grid { grid-template-columns: 1fr; }
  .search-input { width: 100%; }
}
</style>
