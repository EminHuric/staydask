<!-- src/views/AdminView.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>{{ t('Admin Panel') }}</h1>
        <p class="text-muted text-sm mt-2">{{ t('Manage accounts, access and invite codes') }}</p>
      </div>
      <div class="header-actions">
        <label class="role-toggle">
          <input type="checkbox" v-model="newCodeIsAdmin" />
          {{ t('Invite as admin') }}
        </label>
        <button class="btn btn-primary" @click="createCode">{{ t('+ Generate Invite Code') }}</button>
      </div>
    </div>

    <div v-if="actionMsg" class="action-msg" :class="{ 'is-error': actionIsError }">{{ actionMsg }}</div>

    <!-- Platform overview -->
    <div class="card mb-4">
      <h2 class="mb-4">{{ t('Platform Overview') }}</h2>
      <div class="grid-4">
        <div class="stat-card">
          <div class="stat-icon">👤</div>
          <div class="stat-value">{{ adminStore.users.length }}</div>
          <div class="stat-label">{{ t('Accounts') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏠</div>
          <div class="stat-value">{{ platformTotals.apartments }}</div>
          <div class="stat-label">{{ t('Apartments') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-value">{{ platformTotals.bookings }}</div>
          <div class="stat-label">{{ t('Bookings') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-value">{{ platformTotals.guests }}</div>
          <div class="stat-label">{{ t('Guests') }}</div>
        </div>
      </div>
      <p class="text-xs text-muted mt-2">
        {{ t("Each account's apartments, bookings and guests stay private — admins only see these totals and counts, never the actual data.") }}
      </p>
    </div>

    <!-- Users management (detailed) -->
    <div class="card mb-4">
      <div class="card-header-row">
        <h2>{{ t('User Accounts') }}</h2>
        <input v-model="search" class="form-input search-input" :placeholder="t('Search name or email…')" />
      </div>

      <div v-if="filteredUsers.length === 0" class="text-muted text-sm empty-pad">
        {{ adminStore.users.length === 0 ? t('No users registered yet.') : t('No users match your search.') }}
      </div>

      <div class="users-grid">
        <div v-for="u in filteredUsers" :key="u.id" class="user-card" :class="{ 'is-disabled': u.disabled }">
          <div class="user-card-top">
            <div class="user-avatar" :class="{ disabled: u.disabled }">{{ initial(u) }}</div>
            <div class="user-identity">
              <div class="user-name">
                {{ u.username || u.email }}
                <span v-if="u.id === authStore.user?.uid" class="you-tag">{{ t('you') }}</span>
              </div>
              <div class="user-email">{{ u.email }}</div>
            </div>
            <div class="user-badges">
              <span v-if="isMain(u)" class="badge badge-amber">★ {{ isOwner(u) ? t('Owner') : t('Main admin') }}</span>
              <span :class="['badge', u.role === 'admin' ? 'badge-amber' : 'badge-blue']">{{ t(u.role || 'user') }}</span>
              <span :class="['badge', u.disabled ? 'badge-red' : 'badge-green']">{{ u.disabled ? t('Disabled (status)') : t('Active (account)') }}</span>
            </div>
          </div>

          <div class="user-stats">
            <div class="us"><span class="us-val">{{ count(u.apartmentCount) }}</span><span class="us-lbl">{{ t('Apartments') }}</span></div>
            <div class="us"><span class="us-val">{{ count(u.bookingCount) }}</span><span class="us-lbl">{{ t('Bookings') }}</span></div>
            <div class="us"><span class="us-val">{{ count(u.guestCount) }}</span><span class="us-lbl">{{ t('Guests') }}</span></div>
            <div class="us"><span class="us-val small">{{ formatDate(u.createdAt) }}</span><span class="us-lbl">{{ t('Joined') }}</span></div>
          </div>

          <div class="user-actions">
            <button class="btn btn-ghost btn-sm" @click="openInspect(u)">{{ t('👁 View data') }}</button>
            <button class="btn btn-ghost btn-sm" @click="openNotes(u)">{{ t('📝 Notes') }}</button>

            <!-- Your own account -->
            <template v-if="u.id === authStore.user?.uid">
              <span v-if="isOwner(u)" class="text-xs text-muted self-note">{{ t('Your account — owner (protected).') }}</span>
              <template v-else>
                <span class="text-xs text-muted self-note">{{ t('This is you.') }}</span>
                <button class="btn btn-ghost btn-sm" @click="stepDown(u)">{{ t('Step down to user') }}</button>
              </template>
            </template>

            <!-- A protected account you can't manage -->
            <template v-else-if="isMain(u) && !iAmMain">
              <span class="text-xs text-muted self-note">{{ isOwner(u) ? t('Owner') : t('Main admin') }} — {{ t('protected account.') }}</span>
            </template>
            <template v-else-if="isOwner(u)">
              <span class="text-xs text-muted self-note">{{ t('Owner') }} — {{ t('protected account.') }}</span>
            </template>

            <!-- Manageable account -->
            <template v-else>
              <button class="btn btn-ghost btn-sm" @click="toggleRole(u)">
                {{ u.role === 'admin' ? t('Demote') : t('Make admin') }}
              </button>
              <button
                v-if="iAmMain && u.role === 'admin'"
                class="btn btn-ghost btn-sm"
                @click="toggleMain(u)"
              >{{ u.mainAdmin ? t('Remove main') : t('Make main') }}</button>
              <button class="btn btn-ghost btn-sm" @click="resetUserPassword(u)">{{ t('Reset password') }}</button>
              <button
                class="btn btn-sm"
                :class="u.disabled ? 'btn-primary' : 'btn-ghost'"
                @click="toggleDisabled(u)"
              >{{ u.disabled ? t('Enable') : t('Disable') }}</button>
              <button class="btn btn-danger btn-sm" @click="removeUser(u)">{{ t('Delete') }}</button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite codes -->
    <div class="card mb-4">
      <h2 class="mb-4">{{ t('Invite Codes') }}</h2>

      <div v-if="newCode" class="new-code-banner">
        <div>
          <div class="text-xs text-muted mb-1">{{ t('New code generated — share this with your user:') }}</div>
          <div class="code-display">{{ newCode }}</div>
        </div>
        <button class="btn btn-ghost btn-sm" @click="copyCode(newCode)">
          {{ copied ? t('✓ Copied') : t('Copy') }}
        </button>
      </div>

      <div class="label-group" v-if="adminStore.inviteCodes.length === 0 && !adminStore.loading">
        <p class="text-muted text-sm">{{ t('No invite codes yet. Generate one to add users.') }}</p>
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
            <span v-if="code.role === 'admin'" class="badge badge-amber">{{ t('Admin invite') }}</span>
            <span v-if="code.usedBy" class="badge badge-green">
              {{ t('Used by {name}', { name: code.usedByUsername }) }}
            </span>
            <span v-else-if="code.active" class="badge badge-amber">{{ t('Available (code)') }}</span>
            <span v-else class="badge badge-red">{{ t('Inactive') }}</span>
          </div>
          <div class="code-actions">
            <button
              v-if="!code.usedBy"
              class="btn btn-ghost btn-sm"
              @click="copyCode(code.code)"
            >{{ t('Copy') }}</button>
            <button
              v-if="!code.usedBy"
              class="btn btn-ghost btn-sm"
              @click="adminStore.toggleCodeActive(code.id, code.active)"
            >{{ code.active ? t('Disable') : t('Enable') }}</button>
            <button class="btn btn-danger btn-sm" @click="removeCode(code)">{{ t('Delete') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid-3 mt-4">
      <div class="stat-card">
        <div class="stat-icon">🎟️</div>
        <div class="stat-value">{{ adminStore.inviteCodes.length }}</div>
        <div class="stat-label">{{ t('Total Codes') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">{{ usedCodes }}</div>
        <div class="stat-label">{{ t('Codes Used') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🚫</div>
        <div class="stat-value">{{ disabledCount }}</div>
        <div class="stat-label">{{ t('Disabled Accounts') }}</div>
      </div>
    </div>

    <!-- Firebase rules reminder -->
    <div class="info-banner mt-4">
      <strong>{{ t('Firebase Setup Note:') }}</strong> {{ t('Security rules live in') }} <code>firestore.rules</code>
      {{ t('at the project root — deploy them with') }} <code>firebase deploy --only firestore:rules</code>
      {{ t('so users and invite codes stay scoped to your workspace.') }}
    </div>

    <!-- Notes modal -->
    <div v-if="notesUser" class="modal-overlay" @click.self="closeNotes">
      <div class="notes-modal">
        <div class="notes-modal-header">
          <div>
            <h3>{{ t('Notes — {name}', { name: notesUser.username || notesUser.email }) }}</h3>
            <p class="text-xs text-muted">{{ t('Visible only to this user and admins.') }}</p>
          </div>
          <button class="icon-close" @click="closeNotes">✕</button>
        </div>

        <div class="notes-add">
          <textarea
            v-model="noteText"
            class="form-input"
            rows="2"
            :placeholder="t('Leave a note or message for this user…')"
            @keydown.ctrl.enter="submitNote"
          ></textarea>
          <button class="btn btn-primary btn-sm" :disabled="!noteText.trim()" @click="submitNote">{{ t('Send note') }}</button>
        </div>

        <div class="notes-list">
          <div v-if="adminStore.selectedUserNotes.length === 0" class="text-muted text-sm empty-pad">
            {{ t('No notes yet for this account.') }}
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
                  {{ n.authorRole === 'admin' ? t('Admin') : t('User') }}
                </span>
              </span>
              <span class="note-date">{{ formatDateTime(n.createdAt) }}</span>
            </div>
            <div class="note-text">{{ n.text }}</div>
            <button class="note-del" @click="removeNote(n.id)" :title="t('Delete note')">🗑</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Read-only account inspection -->
    <div v-if="adminStore.inspect.user" class="modal-overlay" @click.self="closeInspect">
      <div class="inspect-modal">
        <div class="notes-modal-header">
          <div>
            <h3>👁 {{ adminStore.inspect.user.username || adminStore.inspect.user.email }}</h3>
            <p class="text-xs text-muted">{{ t("Read-only — you can view this account's data but not change it.") }}</p>
          </div>
          <button class="icon-close" @click="closeInspect">✕</button>
        </div>

        <div v-if="adminStore.inspect.loading" class="inspect-state">{{ t('Loading…') }}</div>

        <template v-else>
          <div class="inspect-tabs">
            <button :class="['itab', { active: inspectTab === 'bookings' }]" @click="inspectTab = 'bookings'">
              {{ t('Bookings') }} <span class="itab-n">{{ adminStore.inspect.bookings.length }}</span>
            </button>
            <button :class="['itab', { active: inspectTab === 'apartments' }]" @click="inspectTab = 'apartments'">
              {{ t('Apartments') }} <span class="itab-n">{{ adminStore.inspect.apartments.length }}</span>
            </button>
            <button :class="['itab', { active: inspectTab === 'guests' }]" @click="inspectTab = 'guests'">
              {{ t('Guests') }} <span class="itab-n">{{ adminStore.inspect.guests.length }}</span>
            </button>
          </div>

          <div class="inspect-list">
            <!-- Bookings -->
            <template v-if="inspectTab === 'bookings'">
              <div v-if="!adminStore.inspect.bookings.length" class="text-muted text-sm empty-pad">{{ t('No bookings.') }}</div>
              <div v-for="b in adminStore.inspect.bookings" :key="b.id" class="inspect-row">
                <div class="ir-main">
                  <div class="ir-title">{{ b.guestName || '—' }}</div>
                  <div class="ir-sub">{{ aptNameFor(b.apartmentId) }} · {{ b.checkIn }} → {{ b.checkOut }}</div>
                </div>
                <div class="ir-right">
                  <span v-if="b.status === 'cancelled'" class="badge badge-red">{{ t('cancelled') }}</span>
                  <span v-else :class="['badge', payBadge(b.paymentStatus)]">{{ t(payStatusLabel(b.paymentStatus)) }}</span>
                  <span class="ir-amount">€{{ (b.totalPrice || 0).toLocaleString() }}</span>
                </div>
              </div>
            </template>

            <!-- Apartments -->
            <template v-else-if="inspectTab === 'apartments'">
              <div v-if="!adminStore.inspect.apartments.length" class="text-muted text-sm empty-pad">{{ t('No apartments.') }}</div>
              <div v-for="a in adminStore.inspect.apartments" :key="a.id" class="inspect-row">
                <div class="ir-main">
                  <div class="ir-title">{{ a.name || '—' }}</div>
                  <div class="ir-sub">{{ t('{n} guests · {price}/night', { n: (a.maxGuests || a.capacity || 1), price: '€' + (a.pricePerNight || 0) }) }}</div>
                </div>
              </div>
            </template>

            <!-- Guests -->
            <template v-else>
              <div v-if="!adminStore.inspect.guests.length" class="text-muted text-sm empty-pad">{{ t('No guests.') }}</div>
              <div v-for="g in adminStore.inspect.guests" :key="g.id" class="inspect-row">
                <div class="ir-main">
                  <div class="ir-title">{{ g.fullName || '—' }}</div>
                  <div class="ir-sub">{{ g.phone || t('no phone') }}{{ g.country ? ' · ' + g.country : '' }}</div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useAdminStore } from '@/stores/admin'
import { useAuthStore } from '@/stores/auth'
import { t } from '@/i18n'

const adminStore = useAdminStore()
const authStore = useAuthStore()
const router = useRouter()

const newCode = ref('')
const copied = ref(false)
const newCodeIsAdmin = ref(false)
const search = ref('')
const actionMsg = ref('')
const actionIsError = ref(false)

const notesUser = ref(null)
const noteText = ref('')
const inspectTab = ref('bookings')

onMounted(() => {
  adminStore.subscribeInviteCodes()
  adminStore.subscribeUsers()
})

// The protected owner account — must match isOwnerEmail() in firestore.rules.
const OWNER_EMAIL = 'emynbusiness@gmail.com'
function isOwner(u) { return (u.email || '').toLowerCase() === OWNER_EMAIL }
function isMain(u) { return isOwner(u) || u.mainAdmin === true }
const iAmMain = computed(() =>
  (authStore.userProfile?.email || '').toLowerCase() === OWNER_EMAIL ||
  authStore.userProfile?.mainAdmin === true
)

async function toggleMain(u) {
  const next = !u.mainAdmin
  const name = u.username || u.email
  if (next && !confirm(t('Make {name} a MAIN admin? Main admins are protected and can manage other admins.', { name }))) return
  if (!next && !confirm(t('Remove main-admin status from {name}?', { name }))) return
  try {
    await adminStore.setUserMainAdmin(u.id, next)
    flash(next ? t('{name} is now a main admin.', { name }) : t('{name} is no longer a main admin.', { name }))
  } catch (e) {
    flash(t('Could not change main-admin status: {err}', { err: errText(e) }), true)
  }
}

async function stepDown(u) {
  if (!confirm(t('Step down from admin? You become a regular user and lose the Admin panel. Your data stays.'))) return
  try {
    await adminStore.setUserRole(u.id, 'user')
    await authStore.loadUserProfile(authStore.user.uid)
    router.push('/calendar')
  } catch (e) {
    flash(t('Could not step down: {err}', { err: errText(e) }), true)
  }
}

function openInspect(u) {
  inspectTab.value = 'bookings'
  adminStore.loadUserData(u)
}
function closeInspect() {
  adminStore.clearInspect()
}
function aptNameFor(id) {
  return adminStore.inspect.apartments.find(a => a.id === id)?.name || '—'
}

const PAY_BADGES = { unpaid: 'badge-red', deposit_paid: 'badge-amber', partial: 'badge-blue', paid: 'badge-green', cancelled: 'badge-red' }
const PAY_LABELS = { unpaid: 'Unpaid', deposit_paid: 'Deposit Paid', partial: 'Partially Paid', paid: 'Fully Paid', cancelled: 'Cancelled' }
function payBadge(s) { return PAY_BADGES[s] || 'badge-amber' }
function payStatusLabel(s) { return PAY_LABELS[s] || s }

onUnmounted(() => {
  adminStore.unsubscribeAll()
  adminStore.clearInspect()
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

function flash(msg, isError = false) {
  actionMsg.value = msg
  actionIsError.value = isError
  setTimeout(() => {
    if (actionMsg.value === msg) { actionMsg.value = ''; actionIsError.value = false }
  }, 5000)
}

function errText(e) {
  const m = e?.code || e?.message || String(e || 'unknown error')
  return /permission|insufficient/i.test(m)
    ? t('permission denied — re-deploy the Firestore rules (firebase deploy --only firestore:rules)')
    : m
}

async function createCode() {
  try {
    const code = await adminStore.createInviteCode('', newCodeIsAdmin.value ? 'admin' : 'user')
    newCode.value = code
    copied.value = false
    newCodeIsAdmin.value = false
  } catch (e) {
    flash(t('Could not generate code: {err}', { err: errText(e) }), true)
  }
}

async function removeCode(code) {
  if (!confirm(t("Delete invite code {code}? This can't be undone.", { code: code.code }))) return
  try {
    if (newCode.value === code.code) newCode.value = ''
    await adminStore.deleteInviteCode(code.id)
    flash(t('Invite code {code} deleted.', { code: code.code }))
  } catch (e) {
    flash(t('Could not delete code: {err}', { err: errText(e) }), true)
  }
}

async function toggleRole(u) {
  const nextRole = u.role === 'admin' ? 'user' : 'admin'
  const name = u.username || u.email
  if (u.role === 'admin' && !confirm(t('Remove admin access from {name}?', { name }))) return
  try {
    await adminStore.setUserRole(u.id, nextRole)
    flash(nextRole === 'admin' ? t('{name} is now an admin.', { name }) : t('{name} is now a regular user.', { name }))
  } catch (e) {
    flash(t('Could not change role: {err}', { err: errText(e) }), true)
  }
}

async function toggleDisabled(u) {
  const next = !u.disabled
  const name = u.username || u.email
  if (next && !confirm(t("Disable {name}? They won't be able to sign in until you enable them again. Their data is kept.", { name }))) return
  try {
    await adminStore.setUserDisabled(u.id, next)
    flash(next ? t('{name} has been disabled.', { name }) : t('{name} has been enabled.', { name }))
  } catch (e) {
    flash(t('Could not update {name}: {err}', { name, err: errText(e) }), true)
  }
}

async function removeUser(u) {
  const name = u.username || u.email
  if (!confirm(t('Delete {name}? This removes their account — they can no longer sign in. This cannot be undone.', { name }))) return
  try {
    await adminStore.deleteUser(u.id)
    flash(t('{name} has been deleted.', { name }))
  } catch (e) {
    flash(t('Could not delete {name}: {err}', { name, err: errText(e) }), true)
  }
}

async function resetUserPassword(u) {
  const res = await authStore.resetPassword(u.email)
  flash(res.success
    ? t('Reset link sent to {email} — tell them to check the spam folder too.', { email: u.email })
    : (res.error || t('Could not send reset email.')))
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
  if (!ts) return t('just now')
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
.action-msg.is-error {
  background: var(--red-dim);
  border-color: rgba(239,68,68,0.3);
  color: var(--red);
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

/* Inspect (read-only data) modal */
.inspect-modal {
  width: 100%;
  max-width: 620px;
  max-height: 85vh;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.inspect-state { padding: 2rem; text-align: center; color: var(--text-3); }
.inspect-tabs { display: flex; gap: 0.4rem; padding: 0.85rem 1.25rem 0; flex-wrap: wrap; }
.itab {
  background: var(--bg-3);
  border: 1px solid var(--border);
  color: var(--text-2);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 0.4rem;
  transition: all var(--transition);
}
.itab:hover { color: var(--text); border-color: var(--border-strong); }
.itab.active { background: var(--accent-dim); color: var(--accent); border-color: rgba(245,166,35,0.3); }
.itab-n {
  background: rgba(255,255,255,0.06);
  border-radius: 99px;
  padding: 0 0.4rem;
  font-size: 0.68rem;
  min-width: 18px; text-align: center;
}
.inspect-list {
  padding: 0.85rem 1.25rem 1.25rem;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.inspect-row {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.85rem;
}
.ir-main { min-width: 0; }
.ir-title { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.ir-sub { font-size: 0.72rem; color: var(--text-3); margin-top: 0.15rem; }
.ir-right { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
.ir-amount { font-size: 0.82rem; font-weight: 700; color: var(--accent); white-space: nowrap; }

@media (max-width: 768px) {
  .page { padding: 1rem 1rem 6rem; }
  .page-header { flex-direction: column; align-items: stretch; }
  .header-actions { justify-content: space-between; }
  .grid-3 { grid-template-columns: 1fr; }
  .users-grid { grid-template-columns: 1fr; }
  .search-input { width: 100%; }
}
</style>
