<!-- src/views/DashboardView.vue -->
<template>
  <div class="page">

    <!-- Welcome bar -->
    <div class="welcome-bar">
      <div>
        <h1 class="welcome-title">Good {{ timeOfDay }}, {{ authStore.userProfile?.username || 'there' }}</h1>
        <p class="text-muted text-sm mt-2">{{ today }}</p>
      </div>
      <router-link to="/calendar" class="btn btn-primary hide-mobile">Open Calendar</router-link>
    </div>

    <!-- KPI cards -->
    <div class="kpi-grid mb-6">
      <div class="kpi-card">
        <div class="kpi-icon">🏠</div>
        <div class="kpi-body">
          <div class="kpi-value">{{ apartments.length }}</div>
          <div class="kpi-label">Apartments</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📋</div>
        <div class="kpi-body">
          <div class="kpi-value">{{ activeBookings.length }}</div>
          <div class="kpi-label">Active Now</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">💰</div>
        <div class="kpi-body">
          <div class="kpi-value">€{{ bookingsStore.totalRevenue.toLocaleString() }}</div>
          <div class="kpi-label">Expected Revenue</div>
        </div>
      </div>
      <div class="kpi-card accent">
        <div class="kpi-icon">✅</div>
        <div class="kpi-body">
          <div class="kpi-value">€{{ bookingsStore.totalCollected.toLocaleString() }}</div>
          <div class="kpi-label">Collected</div>
        </div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-icon">⏳</div>
        <div class="kpi-body">
          <div class="kpi-value">€{{ bookingsStore.totalOutstanding.toLocaleString() }}</div>
          <div class="kpi-label">Outstanding</div>
        </div>
      </div>
    </div>

    <!-- Main grid: notifications + active bookings -->
    <div class="dash-grid mb-6">

      <!-- Smart notifications -->
      <div class="card notifications-card">
        <div class="card-header">
          <h2>Notifications</h2>
          <span v-if="notifications.length" class="notif-count">{{ notifications.length }}</span>
        </div>
        <div v-if="notifications.length === 0" class="empty-notif">
          <span style="font-size:1.5rem">✓</span>
          <p class="text-muted text-sm">All clear for today!</p>
        </div>
        <div v-else class="notif-list">
          <div v-for="(n, i) in notifications" :key="i"
            :class="['notif-item', n.type]"
            @click="openBooking(n.booking)">
            <span class="notif-icon">{{ notifIcon(n.type) }}</span>
            <div class="notif-body">
              <div class="notif-text">{{ notifText(n) }}</div>
              <div class="notif-meta">{{ aptName(n.booking.apartmentId) }}</div>
            </div>
            <span :class="['badge', notifBadge(n.type)]" style="font-size:.65rem;flex-shrink:0">
              {{ notifBadgeText(n.type) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Active bookings today -->
      <div class="card">
        <div class="card-header">
          <h2>Active Guests</h2>
          <router-link to="/bookings?status=active" class="text-sm text-accent">All →</router-link>
        </div>
        <div v-if="activeBookings.length === 0" class="empty-state">No guests checked in right now.</div>
        <div v-else class="active-list">
          <div v-for="b in activeBookings.slice(0, 6)" :key="b.id"
            class="active-row" @click="openBooking(b)">
            <div class="active-avatar">{{ initials(b.guestName) }}</div>
            <div class="active-info">
              <div class="font-medium text-sm" style="color:var(--text)">{{ b.guestName }}</div>
              <div class="text-xs text-muted">{{ aptName(b.apartmentId) }} · leaves {{ formatDate(b.checkOut) }}</div>
            </div>
            <span :class="['badge', payBadge(b.paymentStatus)]" style="font-size:.65rem">{{ payLabel(b.paymentStatus) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Today's arrivals and departures -->
    <div class="two-col mb-6">
      <div class="card">
        <div class="card-header">
          <h2>Arriving Today</h2>
          <span class="badge badge-green">{{ arrivalsToday.length }}</span>
        </div>
        <div v-if="arrivalsToday.length === 0" class="empty-state">No arrivals today.</div>
        <div v-else class="mini-list">
          <div v-for="b in arrivalsToday" :key="b.id" class="mini-row" @click="openBooking(b)">
            <span class="mini-dot" style="background:var(--green)"></span>
            <div class="flex-1">
              <div class="text-sm font-medium" style="color:var(--text)">{{ b.guestName }}</div>
              <div class="text-xs text-muted">{{ aptName(b.apartmentId) }} · {{ b.days }}n</div>
            </div>
            <span class="text-sm text-accent">€{{ (b.totalPrice||0).toLocaleString() }}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h2>Departing Today</h2>
          <span class="badge badge-amber">{{ departuresToday.length }}</span>
        </div>
        <div v-if="departuresToday.length === 0" class="empty-state">No departures today.</div>
        <div v-else class="mini-list">
          <div v-for="b in departuresToday" :key="b.id" class="mini-row" @click="openBooking(b)">
            <span class="mini-dot" style="background:var(--accent)"></span>
            <div class="flex-1">
              <div class="text-sm font-medium" style="color:var(--text)">{{ b.guestName }}</div>
              <div class="text-xs text-muted">{{ aptName(b.apartmentId) }}</div>
            </div>
            <span :class="['badge', payBadge(b.paymentStatus)]" style="font-size:.65rem">{{ payLabel(b.paymentStatus) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent reservations -->
    <div class="card">
      <div class="card-header">
        <h2>Recent Reservations</h2>
        <router-link to="/bookings" class="text-sm text-accent">View all →</router-link>
      </div>
      <div v-if="recentBookings.length === 0" class="empty-state">No reservations yet.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Guest</th>
              <th>Apartment</th>
              <th>Check-in</th>
              <th>Nights</th>
              <th>Payment</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in recentBookings" :key="b.id" @click="openBooking(b)" style="cursor:pointer">
              <td>
                <div class="font-medium" style="color:var(--text)">{{ b.guestName }}</div>
                <div class="text-xs text-muted">{{ b.origin || '' }}</div>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <span class="apt-dot" :style="{ background: aptColor(b.apartmentId) }"></span>
                  {{ aptName(b.apartmentId) }}
                </div>
              </td>
              <td>{{ formatDate(b.checkIn) }}</td>
              <td>{{ b.days }}</td>
              <td><span :class="['badge', payBadge(b.paymentStatus)]">{{ payLabel(b.paymentStatus) }}</span></td>
              <td class="text-right text-accent font-medium">€{{ (b.totalPrice||0).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Booking modal (opened from notifications/rows) -->
    <BookingModal v-if="showModal && selectedBooking"
      :booking="selectedBooking"
      @close="showModal = false" @saved="showModal = false" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format } from 'date-fns'
import { useAuthStore } from '../stores/auth'
import { useApartmentsStore } from '../stores/apartments'
import { useBookingsStore } from '../stores/bookings'
import BookingModal from '@/components/BookingModal.vue'

const authStore = useAuthStore()
const apartmentsStore = useApartmentsStore()
const bookingsStore = useBookingsStore()

const apartments = computed(() => apartmentsStore.apartments)
const bookings = computed(() => bookingsStore.bookings)
const activeBookings = computed(() => bookingsStore.activeBookings)
const notifications = computed(() => bookingsStore.todayNotifications)

const today = computed(() => format(new Date(), 'EEEE, d MMMM yyyy'))
const timeOfDay = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
})

const todayStr = format(new Date(), 'yyyy-MM-dd')
const arrivalsToday = computed(() => bookings.value.filter(b => b.checkIn === todayStr && b.status !== 'cancelled'))
const departuresToday = computed(() => bookings.value.filter(b => b.checkOut === todayStr && b.status !== 'cancelled'))

const recentBookings = computed(() =>
  [...bookings.value]
    .filter(b => b.status !== 'cancelled')
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 8)
)

function aptName(id) { return apartments.value.find(a => a.id === id)?.name || '—' }
function aptColor(id) { return apartments.value.find(a => a.id === id)?.color || '#3b82f6' }
function formatDate(d) { if (!d) return '—'; return format(new Date(d), 'dd MMM') }
function initials(n) {
  if (!n) return '?'
  const p = n.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : n.slice(0,2).toUpperCase()
}

const PAY_LABELS = { unpaid: 'Unpaid', deposit_paid: 'Deposit', partial: 'Partial', paid: 'Paid', cancelled: 'Cancelled' }
const PAY_BADGES = { unpaid: 'badge-red', deposit_paid: 'badge-amber', partial: 'badge-blue', paid: 'badge-green', cancelled: 'badge-red' }
function payLabel(s) { return PAY_LABELS[s] || s }
function payBadge(s) { return PAY_BADGES[s] || 'badge-amber' }

const NOTIF_ICONS = { arrival: '🛬', departure: '🛫', arriving_tomorrow: '🔔', payment_due: '💳', upcoming: '📅' }
const NOTIF_BADGE_TEXT = { arrival: 'Today', departure: 'Today', arriving_tomorrow: 'Tomorrow', payment_due: 'Unpaid', upcoming: 'This week' }
const NOTIF_BADGE = { arrival: 'badge-green', departure: 'badge-amber', arriving_tomorrow: 'badge-blue', payment_due: 'badge-red', upcoming: 'badge-blue' }

function notifIcon(t) { return NOTIF_ICONS[t] || '📌' }
function notifBadgeText(t) { return NOTIF_BADGE_TEXT[t] || '' }
function notifBadge(t) { return NOTIF_BADGE[t] || 'badge-amber' }
function notifText(n) {
  const b = n.booking
  const g = b.guestName
  if (n.type === 'arrival') return `${g} is checking in today`
  if (n.type === 'departure') return `${g} is checking out today`
  if (n.type === 'arriving_tomorrow') return `${g} arrives tomorrow`
  if (n.type === 'payment_due') return `${g} — payment pending (€${((b.totalPrice||0)-(b.totalPaid||0)).toLocaleString()} owed)`
  if (n.type === 'upcoming') return `${g} arrives on ${formatDate(b.checkIn)}`
  return g
}

const showModal = ref(false)
const selectedBooking = ref(null)
function openBooking(b) { selectedBooking.value = b; showModal.value = true }
</script>

<style scoped>
.page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }

.welcome-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}
.welcome-title { font-size: 1.5rem; font-weight: 700; }

/* KPI grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: .75rem;
}
.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.1rem;
  display: flex;
  align-items: center;
  gap: .875rem;
}
.kpi-card.accent { border-color: var(--accent); background: var(--accent-dim); }
.kpi-card.warning { border-color: var(--red); background: var(--red-dim); }
.kpi-icon { font-size: 1.5rem; flex-shrink: 0; }
.kpi-value { font-size: 1.2rem; font-weight: 700; color: var(--text); line-height: 1; }
.kpi-label { font-size: .68rem; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; margin-top: .25rem; }

/* Dashboard grid */
.dash-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

/* Card header */
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.notif-count {
  background: var(--red);
  color: white;
  font-size: .7rem;
  font-weight: 700;
  width: 20px; height: 20px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}

/* Notifications */
.notifications-card { overflow: hidden; }
.empty-notif {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: .5rem;
  color: var(--green);
}
.notif-list { display: flex; flex-direction: column; gap: 0; margin: -1rem -1.5rem -1.5rem; }
.notif-item {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .75rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background .1s;
}
.notif-item:hover { background: var(--bg-3); }
.notif-item:last-child { border-bottom: none; }
.notif-icon { font-size: 1.1rem; flex-shrink: 0; }
.notif-body { flex: 1; min-width: 0; }
.notif-text { font-size: .82rem; color: var(--text); }
.notif-meta { font-size: .72rem; color: var(--text-3); margin-top: .1rem; }

/* Active guests */
.active-list { display: flex; flex-direction: column; gap: .5rem; }
.active-row {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .6rem .75rem;
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background .1s;
}
.active-row:hover { background: var(--bg-2); }
.active-avatar {
  width: 32px; height: 32px;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .75rem; font-weight: 700; flex-shrink: 0;
}
.active-info { flex: 1; min-width: 0; }

/* Mini list (arrivals / departures) */
.mini-list { display: flex; flex-direction: column; gap: .5rem; }
.mini-row {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .5rem .75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background .1s;
}
.mini-row:hover { background: var(--bg-3); }
.mini-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.empty-state { padding: 1.5rem; text-align: center; color: var(--text-3); font-size: .85rem; }
.apt-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

.mb-6 { margin-bottom: 1.5rem; }
.mt-2 { margin-top: .5rem; }

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .dash-grid { grid-template-columns: 1fr; }
  .two-col { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .page { padding: 1rem 1rem 6rem; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .hide-mobile { display: none; }
}
</style>
