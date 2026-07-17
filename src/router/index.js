import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/views/SetupView.vue'),
    meta: { public: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/views/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/calendar' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'calendar', name: 'Calendar', component: () => import('@/views/CalendarView.vue') },
      { path: 'bookings', name: 'Bookings', component: () => import('@/views/BookingsView.vue') },
      { path: 'apartments', name: 'Apartments', component: () => import('@/views/ApartmentsView.vue') },
      { path: 'guests', name: 'Guests', component: () => import('@/views/GuestsView.vue') },
      { path: 'analytics', name: 'Analytics', component: () => import('@/views/AnalyticsView.vue') },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('@/views/AdminView.vue'),
        meta: { requiresAdmin: true }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/calendar' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (authStore.loading) await authStore.init()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) return '/login'
  if (to.meta.requiresAdmin && !authStore.isAdmin) return '/calendar'
  if (to.meta.public && authStore.isAuthenticated) return '/calendar'
  return true
})

export default router
