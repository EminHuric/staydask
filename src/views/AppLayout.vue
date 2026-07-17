<!-- src/views/AppLayout.vue -->
<template>
  <div class="app-layout">
    <!-- ─── Sidebar (desktop only) ─── -->
    <aside :class="['sidebar', { open: sidebarOpen }]">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-mark">S</div>
          <span class="logo-name serif">StayDesk</span>
        </div>
        <button class="icon-close hide-desktop" @click="sidebarOpen = false">✕</button>
      </div>

      <nav class="sidebar-nav">
        <router-link v-for="item in navItems" :key="item.to"
          :to="item.to" class="nav-item" @click="sidebarOpen = false">
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
        <router-link v-if="authStore.isAdmin" to="/admin" class="nav-item" @click="sidebarOpen = false">
          <span class="nav-icon">⚙️</span> Admin
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-pill">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-info">
            <div class="user-name">{{ authStore.userProfile?.username || authStore.userProfile?.email || 'User' }}</div>
            <div class="user-role">{{ authStore.isAdmin ? 'Admin' : 'Owner' }}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm logout-btn" @click="handleLogout">Sign out</button>
      </div>
    </aside>

    <!-- Sidebar overlay (mobile) -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <!-- ─── Main content ─── -->
    <main class="main-content">
      <header class="top-bar">
        <!-- Hamburger: shown on mobile BUT only if needed for sidebar access -->
        <button class="menu-btn hide-desktop" @click="sidebarOpen = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div class="top-bar-brand hide-desktop">
          <span class="logo-mark-sm">S</span>
          <span class="serif" style="font-size:.95rem;font-weight:600">StayDesk</span>
        </div>
        <div class="page-title show-desktop">{{ currentPageTitle }}</div>
        <div class="top-bar-right">
          <GlobalSearch />
          <span class="live-badge">● Live</span>
        </div>
      </header>

      <div class="content-area">
        <router-view />
      </div>
    </main>

    <!-- ─── Bottom Nav (mobile only) ─── -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import GlobalSearch from '@/components/GlobalSearch.vue'
import BottomNav from '@/components/BottomNav.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)

const userInitial = computed(() => {
  const name = authStore.userProfile?.username || authStore.userProfile?.email || 'U'
  return name[0].toUpperCase()
})

const navItems = [
  { to: '/dashboard',  icon: '📊', label: 'Dashboard' },
  { to: '/calendar',   icon: '📅', label: 'Calendar' },
  { to: '/bookings',   icon: '📋', label: 'Bookings' },
  { to: '/apartments', icon: '🏠', label: 'Apartments' },
  { to: '/guests',     icon: '👥', label: 'Guests' },
  { to: '/analytics',  icon: '💰', label: 'Analytics' },
]

const titles = {
  Dashboard: 'Dashboard', Calendar: 'Booking Calendar',
  Apartments: 'Apartments', Bookings: 'Reservations',
  Guests: 'Guest CRM', Analytics: 'Analytics & Finance', Admin: 'Admin Panel'
}
const currentPageTitle = computed(() => titles[route.name] || 'StayDesk')

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

/* ─────────────────────── Sidebar ─────────────────────────── */
.sidebar {
  width: 230px;
  flex-shrink: 0;
  background: var(--bg-2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.sidebar-header {
  padding: 1.25rem 1rem 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.logo-mark {
  width: 30px; height: 30px;
  background: var(--accent);
  color: #08090e;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800;
  font-size: 0.95rem;
  flex-shrink: 0;
  box-shadow: var(--shadow-accent);
}
.logo-name { font-size: 1rem; color: var(--text); letter-spacing: -0.03em; }
.icon-close { background: none; border: none; color: var(--text-2); cursor: pointer; font-size: 1rem; padding: .25rem; }

.sidebar-nav {
  flex: 1;
  padding: 0.75rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition);
  letter-spacing: -0.01em;
}
.nav-item:hover { background: var(--bg-3); color: var(--text); }
.nav-item.router-link-active {
  background: var(--accent-dim);
  color: var(--accent);
  font-weight: 600;
}
.nav-icon { font-size: 1rem; width: 22px; text-align: center; flex-shrink: 0; }

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--bg-3);
}
.user-avatar {
  width: 32px; height: 32px;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700;
  flex-shrink: 0;
  border: 1.5px solid var(--accent-glow, rgba(245,166,35,0.3));
}
.user-info { min-width: 0; }
.user-name { font-size: 0.8rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 0.65rem; color: var(--text-3); margin-top: 1px; }
.logout-btn { width: 100%; justify-content: center; }

/* ─────────────────────── Main content ────────────────────── */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.top-bar {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-2);
  display: flex;
  align-items: center;
  gap: 0.875rem;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 0 var(--border-subtle);
}

.menu-btn {
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  color: var(--text-2);
  cursor: pointer;
  padding: .4rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: all var(--transition);
}
.menu-btn:hover { background: var(--bg-card); color: var(--text); }

.top-bar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}
.logo-mark-sm {
  width: 24px; height: 24px;
  background: var(--accent);
  color: #08090e;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 0.75rem;
}

.page-title {
  font-size: 0.9rem;
  font-weight: 700;
  flex: 1;
  letter-spacing: -0.02em;
  color: var(--text);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.live-badge {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--green);
  background: var(--green-dim);
  padding: 0.2rem 0.55rem;
  border-radius: 99px;
  white-space: nowrap;
  display: none;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  /* Bottom padding on mobile so content clears the bottom nav */
  padding-bottom: 0;
}

/* ─────────────────────── Responsive ──────────────────────── */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -240px;
    top: 0;
    bottom: 0;
    z-index: 200;
    transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    width: 240px;
  }
  .sidebar.open { left: 0; }

  .sidebar-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(2px);
    z-index: 199;
  }

  /* Give content area space for bottom nav (≈72px + safe area) */
  .content-area { padding-bottom: 80px; }

  .hide-desktop { display: flex !important; }
  .show-desktop { display: none !important; }
  .live-badge { display: none; }
}

@media (min-width: 769px) {
  .hide-desktop { display: none !important; }
  .show-desktop { display: block !important; }
  .live-badge { display: inline-flex; }
}
</style>
