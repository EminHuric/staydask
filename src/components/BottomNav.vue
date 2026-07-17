<!-- src/components/BottomNav.vue -->
<!-- Mobile-only fixed bottom navigation bar -->
<template>
  <nav class="bottom-nav" :class="{ 'profile-open': profileOpen }">
    <router-link
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="nav-tab"
      :class="{ active: isActive(item) }"
      @click.native="profileOpen = false"
    >
      <span class="tab-icon" :class="{ pulse: item.to === '/dashboard' && hasNotifications }">
        {{ item.icon }}
      </span>
      <span class="tab-label">{{ item.label }}</span>
      <span v-if="isActive(item)" class="tab-indicator"></span>
    </router-link>

    <!-- Profile tab (not a router-link — opens sheet) -->
    <button class="nav-tab" :class="{ active: profileOpen }" @click="profileOpen = !profileOpen">
      <span class="tab-icon">
        <span class="avatar-mini">{{ userInitial }}</span>
      </span>
      <span class="tab-label">Profile</span>
      <span v-if="profileOpen" class="tab-indicator"></span>
    </button>

    <!-- Profile action sheet -->
    <Transition name="sheet">
      <div v-if="profileOpen" class="profile-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-user">
          <div class="sheet-avatar">{{ userInitial }}</div>
          <div>
            <div class="sheet-name">{{ authStore.userProfile?.username || authStore.userProfile?.email || 'User' }}</div>
            <div class="sheet-role">{{ authStore.isAdmin ? 'Administrator' : 'Workspace Owner' }}</div>
          </div>
        </div>
        <div class="sheet-actions">
          <router-link v-if="authStore.isAdmin" to="/admin" class="sheet-btn" @click="profileOpen = false">
            <span>⚙️</span> Admin Panel
          </router-link>
          <button class="sheet-btn danger" @click="handleLogout">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>
    </Transition>

    <!-- Sheet backdrop -->
    <div v-if="profileOpen" class="sheet-backdrop" @click="profileOpen = false"></div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBookingsStore } from '@/stores/bookings'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const bookingsStore = useBookingsStore()

const profileOpen = ref(false)

const userInitial = computed(() => {
  const name = authStore.userProfile?.username || authStore.userProfile?.email || 'U'
  return name[0].toUpperCase()
})

const hasNotifications = computed(() => bookingsStore.todayNotifications?.length > 0)

const navItems = [
  { to: '/dashboard',  icon: '🏠', label: 'Home' },
  { to: '/calendar',   icon: '📅', label: 'Calendar' },
  { to: '/bookings',   icon: '📋', label: 'Bookings' },
  { to: '/guests',     icon: '👥', label: 'Guests' },
  { to: '/analytics',  icon: '💰', label: 'Finance' },
]

function isActive(item) {
  return route.path === item.to || route.path.startsWith(item.to + '/')
}

async function handleLogout() {
  profileOpen.value = false
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 150;
  /* Frosted glass */
  background: rgba(20, 23, 34, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255,255,255,0.06);
  /* iOS safe area */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  /* Rounded top corners */
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 32px rgba(0,0,0,0.45), 0 -1px 0 rgba(255,255,255,0.04);
}

/* Show only on mobile */
@media (max-width: 768px) {
  .bottom-nav { display: flex; }
}

/* Nav items row */
.nav-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 10px 4px 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-3);
  text-decoration: none;
  position: relative;
  transition: color 0.18s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.nav-tab:active { transform: scale(0.92); }
.nav-tab.active { color: var(--accent); }

.tab-icon {
  font-size: 1.3rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  transition: background 0.18s ease, transform 0.18s var(--transition-spring, ease);
}
.nav-tab.active .tab-icon {
  background: var(--accent-dim);
  transform: translateY(-2px);
}

.tab-label {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color 0.18s;
}

/* Active indicator dot */
.tab-indicator {
  position: absolute;
  bottom: 6px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  animation: dot-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes dot-in {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

/* Pulse for notifications */
.pulse::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: var(--red);
  border-radius: 50%;
  border: 1.5px solid var(--bg);
  animation: pulse-ring 1.5s ease-out infinite;
}
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  70%  { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

/* Mini avatar */
.avatar-mini {
  width: 28px;
  height: 28px;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}
.nav-tab.active .avatar-mini {
  background: var(--accent);
  color: #08090e;
}

/* Profile action sheet */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: rgba(0,0,0,0.5);
}

.profile-sheet {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  padding: 0 1rem 1rem;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
  margin-bottom: -1px;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border-strong);
  border-radius: 99px;
  margin: 12px auto 16px;
}

.sheet-user {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.75rem;
}

.sheet-avatar {
  width: 44px;
  height: 44px;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
  border: 2px solid var(--accent);
}

.sheet-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text);
  letter-spacing: -0.02em;
}
.sheet-role {
  font-size: 0.72rem;
  color: var(--text-3);
  margin-top: 2px;
}

.sheet-actions { display: flex; flex-direction: column; gap: 0.4rem; }

.sheet-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
  text-align: left;
}
.sheet-btn:hover { background: var(--bg-elevated, var(--bg-3)); border-color: var(--border-strong); }
.sheet-btn.danger { color: var(--red); border-color: var(--red-dim); }
.sheet-btn.danger:hover { background: var(--red-dim); }

/* Sheet animation */
.sheet-enter-active, .sheet-leave-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease;
}
.sheet-enter-from, .sheet-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
