<!-- src/views/AdminView.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Admin Panel</h1>
        <p class="text-muted text-sm mt-2">Manage user access and invite codes</p>
      </div>
      <div class="header-actions">
        <label class="role-toggle">
          <input type="checkbox" v-model="newCodeIsAdmin" />
          Invite as admin
        </label>
        <button class="btn btn-primary" @click="createCode">+ Generate Invite Code</button>
      </div>
    </div>

    <!-- Two-column layout -->
    <div class="admin-grid">
      <!-- Invite codes -->
      <div class="card">
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
            </div>
          </div>
        </div>
      </div>

      <!-- Users -->
      <div class="card">
        <h2 class="mb-4">Registered Users</h2>
        <div v-if="adminStore.users.length === 0 && !adminStore.loading" class="text-muted text-sm">
          No users registered yet.
        </div>
        <div class="users-list">
          <div v-for="u in adminStore.users" :key="u.id" class="user-row">
            <div class="user-avatar">{{ (u.username || u.email || '?')[0].toUpperCase() }}</div>
            <div class="user-info">
              <div class="user-name">{{ u.username || u.email }}</div>
              <div class="user-meta">
                <span class="text-xs text-muted">{{ u.email }}</span>
                <span class="text-xs text-muted">Joined {{ formatDate(u.createdAt) }}</span>
              </div>
            </div>
            <div class="user-right">
              <span :class="['badge', u.role === 'admin' ? 'badge-amber' : 'badge-blue']">
                {{ u.role || 'user' }}
              </span>
              <button
                v-if="u.id !== authStore.user?.uid"
                class="btn btn-ghost btn-sm"
                @click="toggleRole(u)"
              >{{ u.role === 'admin' ? 'Demote' : 'Make admin' }}</button>
            </div>
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
        <div class="stat-icon">👤</div>
        <div class="stat-value">{{ adminStore.users.length }}</div>
        <div class="stat-label">Registered Users</div>
      </div>
    </div>

    <!-- Firebase rules reminder -->
    <div class="info-banner mt-4">
      <strong>Firebase Setup Note:</strong> Security rules live in <code>firestore.rules</code> at the
      project root — deploy them with <code>firebase deploy --only firestore:rules</code> so users and
      invite codes stay scoped to your workspace.
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

onMounted(() => {
  adminStore.subscribeInviteCodes()
  adminStore.subscribeUsers()
})

onUnmounted(() => {
  adminStore.unsubscribeAll()
})

const usedCodes = computed(() => adminStore.inviteCodes.filter(c => c.usedBy).length)

async function createCode() {
  const code = await adminStore.createInviteCode('', newCodeIsAdmin.value ? 'admin' : 'user')
  newCode.value = code
  copied.value = false
  newCodeIsAdmin.value = false
}

async function toggleRole(u) {
  const nextRole = u.role === 'admin' ? 'user' : 'admin'
  if (u.role === 'admin' && !confirm(`Remove admin access from ${u.username || u.email}?`)) return
  await adminStore.setUserRole(u.id, nextRole)
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

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return format(d, 'dd MMM yyyy')
}
</script>

<style scoped>
.page { padding: 1.5rem; max-width: 1000px; margin: 0 auto; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.admin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
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

/* Users list */
.users-list { display: flex; flex-direction: column; gap: 0.5rem; }

.user-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: var(--bg-3);
  border-radius: var(--radius-sm);
}

.user-avatar {
  width: 36px; height: 36px;
  background: var(--blue-dim);
  color: var(--blue);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.875rem; font-weight: 700;
  flex-shrink: 0;
}

.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 0.875rem; font-weight: 600; color: var(--text); }
.user-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.user-right { flex-shrink: 0; display: flex; align-items: center; gap: 0.5rem; }

.header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.role-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-2);
  cursor: pointer;
  white-space: nowrap;
}

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

@media (max-width: 768px) {
  .page { padding: 1rem; }
  .page-header { flex-direction: column; align-items: stretch; }
  .header-actions { justify-content: space-between; }
  .admin-grid { grid-template-columns: 1fr; }
  .grid-3 { grid-template-columns: 1fr; }
  .user-row { flex-wrap: wrap; }
  .user-right { width: 100%; justify-content: space-between; }
}
</style>
