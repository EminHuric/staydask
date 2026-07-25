<!-- src/components/NotificationsBell.vue -->
<!-- Top-bar notification bell: new bookings, upcoming arrivals (7 days), today's
     check-ins/outs and pending payments. Visible on every page. -->
<template>
  <div class="bell-wrap">
    <button class="bell-btn" :class="{ active: open }" @click="open = !open" aria-label="Notifications">
      <span class="bell-icon">🔔</span>
      <span v-if="items.length" class="bell-badge">{{ items.length > 9 ? '9+' : items.length }}</span>
    </button>

    <Transition name="drop">
      <div v-if="open" class="bell-panel">
        <div class="bell-header">
          <span>{{ t('Notifications') }}</span>
          <span v-if="items.length" class="count-pill">{{ items.length }}</span>
        </div>

        <div v-if="items.length === 0" class="bell-empty">
          <span style="font-size:1.4rem">✓</span>
          <p class="text-muted text-sm">{{ t("You're all caught up.") }}</p>
        </div>

        <div v-else class="bell-list">
          <button
            v-for="(n, i) in items"
            :key="i"
            class="bell-item"
            :class="n.type"
            @click="go"
          >
            <span class="bi-icon">{{ icon(n.type) }}</span>
            <div class="bi-body">
              <div class="bi-text">{{ text(n) }}</div>
              <div class="bi-meta">{{ aptName(n.booking.apartmentId) }}</div>
            </div>
            <span :class="['badge', badgeClass(n.type)]">{{ badgeText(n.type) }}</span>
          </button>
        </div>

        <router-link to="/dashboard" class="bell-footer" @click="open = false">
          {{ t('Open dashboard →') }}
        </router-link>
      </div>
    </Transition>

    <div v-if="open" class="bell-backdrop" @click="open = false"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useBookingsStore } from '@/stores/bookings'
import { useApartmentsStore } from '@/stores/apartments'
import { t } from '@/i18n'

const router = useRouter()
const bookingsStore = useBookingsStore()
const apartmentsStore = useApartmentsStore()

const open = ref(false)
const items = computed(() => bookingsStore.todayNotifications)

function aptName(id) {
  return apartmentsStore.apartments.find(a => a.id === id)?.name || '—'
}
function fmt(d) { return d ? format(new Date(d), 'dd MMM') : '' }

const ICONS = { new: '🆕', arrival: '🛬', departure: '🛫', arriving_tomorrow: '🔔', payment_due: '💳', upcoming: '📅' }
const BADGE_TEXT = { new: 'New', arrival: 'Today', departure: 'Today', arriving_tomorrow: 'Tomorrow', payment_due: 'Unpaid', upcoming: 'This week' }
const BADGE_CLASS = { new: 'badge-green', arrival: 'badge-green', departure: 'badge-amber', arriving_tomorrow: 'badge-blue', payment_due: 'badge-red', upcoming: 'badge-blue' }

function icon(type) { return ICONS[type] || '📌' }
function badgeText(type) { return t(BADGE_TEXT[type] || '') }
function badgeClass(type) { return BADGE_CLASS[type] || 'badge-amber' }
function text(n) {
  const b = n.booking
  const g = b.guestName || t('Guest')
  if (n.type === 'new') return t('New reservation from {g}', { g })
  if (n.type === 'arrival') return t('{g} is checking in today', { g })
  if (n.type === 'departure') return t('{g} is checking out today', { g })
  if (n.type === 'arriving_tomorrow') return t('{g} arrives tomorrow', { g })
  if (n.type === 'payment_due') return t('{g} — payment pending', { g })
  if (n.type === 'upcoming') return t('{g} arrives on {date}', { g, date: fmt(b.checkIn) })
  return g
}

function go() {
  open.value = false
  router.push('/dashboard')
}
</script>

<style scoped>
.bell-wrap { position: relative; }

.bell-btn {
  position: relative;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  color: var(--text-2);
  cursor: pointer;
  padding: 0.4rem 0.5rem;
  display: flex;
  align-items: center;
  transition: all var(--transition);
}
.bell-btn:hover, .bell-btn.active { background: var(--bg-card); color: var(--text); }
.bell-icon { font-size: 1rem; line-height: 1; }

.bell-badge {
  position: absolute;
  top: -5px; right: -5px;
  min-width: 16px; height: 16px;
  padding: 0 4px;
  background: var(--red);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  border-radius: 99px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid var(--bg-2);
}

.bell-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 340px;
  max-width: calc(100vw - 2rem);
  max-height: 70vh;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  z-index: 120;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bell-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem; font-weight: 700; color: var(--text);
}
.count-pill {
  background: var(--red); color: #fff;
  font-size: 0.68rem; font-weight: 700;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 99px;
  display: flex; align-items: center; justify-content: center;
}

.bell-empty {
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
  padding: 1.75rem 1rem; color: var(--green);
}

.bell-list { overflow-y: auto; }
.bell-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 1rem;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.1s;
}
.bell-item:hover { background: var(--bg-3); }
.bell-item:last-child { border-bottom: none; }
.bi-icon { font-size: 1.05rem; flex-shrink: 0; }
.bi-body { flex: 1; min-width: 0; }
.bi-text { font-size: 0.8rem; color: var(--text); }
.bi-meta { font-size: 0.7rem; color: var(--text-3); margin-top: 0.1rem; }
.badge { flex-shrink: 0; font-size: 0.6rem; }

.bell-footer {
  display: block;
  text-align: center;
  padding: 0.6rem;
  font-size: 0.78rem;
  color: var(--accent);
  text-decoration: none;
  border-top: 1px solid var(--border);
}
.bell-footer:hover { background: var(--bg-3); }

.bell-backdrop { position: fixed; inset: 0; z-index: 110; }

.drop-enter-active, .drop-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
