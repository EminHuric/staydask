<!-- src/components/GlobalSearch.vue -->
<!-- Global search: Ctrl+K or click to open. Searches bookings, apartments, guests -->
<template>
  <div>
    <!-- Trigger button -->
    <button class="search-trigger" @click="open = true" title="Search (Ctrl+K)">
      <span class="search-icon">🔍</span>
      <span class="search-hint">Search…</span>
      <kbd class="kbd">Ctrl K</kbd>
    </button>

    <!-- Fullscreen overlay -->
    <Teleport to="body">
      <Transition name="search-fade">
        <div v-if="open" class="search-overlay" @click.self="close">
          <div class="search-box" @keydown.escape="close">
            <!-- Input -->
            <div class="search-input-wrap">
              <span class="si">🔍</span>
              <input
                ref="inputRef"
                v-model="query"
                class="search-input"
                placeholder="Search bookings, guests, apartments…"
                autocomplete="off"
                @keydown.down.prevent="moveDown"
                @keydown.up.prevent="moveUp"
                @keydown.enter.prevent="selectHighlighted"
              />
              <button v-if="query" class="clear-btn" @click="query = ''">✕</button>
              <kbd class="kbd-esc" @click="close">Esc</kbd>
            </div>

            <!-- Results -->
            <div class="search-results" ref="resultsRef">
              <template v-if="query.trim().length > 0">
                <div v-if="results.length === 0" class="no-results">No results for "{{ query }}"</div>
                <template v-else>
                  <template v-for="(group, gi) in groupedResults" :key="gi">
                    <div class="result-group-label">{{ group.label }}</div>
                    <button
                      v-for="(r, ri) in group.items"
                      :key="r.id"
                      :class="['result-item', { highlighted: r._index === highlighted }]"
                      @mouseenter="highlighted = r._index"
                      @click="select(r)"
                    >
                      <span class="result-icon">{{ r.icon }}</span>
                      <div class="result-body">
                        <div class="result-title" v-html="highlight(r.title, query)"></div>
                        <div class="result-sub">{{ r.sub }}</div>
                      </div>
                      <span v-if="r.badge" :class="['badge', r.badgeClass]" style="font-size:.65rem">{{ r.badge }}</span>
                    </button>
                  </template>
                </template>
              </template>
              <div v-else class="search-empty">
                <div class="search-empty-icon">🔍</div>
                <div>Start typing to search across all data</div>
                <div class="search-empty-tips">
                  <span>Bookings</span><span>·</span><span>Guests</span><span>·</span><span>Apartments</span>
                </div>
              </div>
            </div>

            <!-- Footer hint -->
            <div class="search-footer">
              <span><kbd>↑↓</kbd> navigate</span>
              <span><kbd>Enter</kbd> select</span>
              <span><kbd>Esc</kbd> close</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { format, parseISO } from 'date-fns'
import { useBookingsStore } from '@/stores/bookings'
import { useApartmentsStore } from '@/stores/apartments'
import { useGuestsStore } from '@/stores/guests'

const router = useRouter()
const bookingsStore = useBookingsStore()
const apartmentsStore = useApartmentsStore()
const guestsStore = useGuestsStore()

const open = ref(false)
const query = ref('')
const highlighted = ref(0)
const inputRef = ref(null)
const resultsRef = ref(null)

function close() { open.value = false; query.value = '' }

watch(open, async (v) => {
  if (v) { highlighted.value = 0; await nextTick(); inputRef.value?.focus() }
})

watch(query, () => { highlighted.value = 0 })

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open.value = true }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const PAY_LABELS = { unpaid: 'Unpaid', deposit_paid: 'Deposit', partial: 'Partial', paid: 'Paid' }
const PAY_BADGES = { unpaid: 'badge-red', deposit_paid: 'badge-amber', partial: 'badge-blue', paid: 'badge-green' }

function aptName(id) { return apartmentsStore.apartments.find(a => a.id === id)?.name || '—' }
function fmtDate(d) { return d ? format(parseISO(d), 'dd MMM yy') : '' }

const results = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q || q.length < 1) return []
  const out = []

  // Bookings
  bookingsStore.bookings.forEach(b => {
    if (
      b.guestName?.toLowerCase().includes(q) ||
      b.reservationId?.toLowerCase().includes(q) ||
      b.phone?.includes(q) ||
      b.origin?.toLowerCase().includes(q)
    ) {
      out.push({
        type: 'booking',
        id: b.id,
        icon: b.status === 'cancelled' ? '❌' : '📋',
        title: b.guestName || 'Unknown',
        sub: `${b.reservationId || ''} · ${aptName(b.apartmentId)} · ${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)}`,
        badge: PAY_LABELS[b.paymentStatus] || b.paymentStatus,
        badgeClass: PAY_BADGES[b.paymentStatus] || 'badge-amber',
        data: b
      })
    }
  })

  // Guests
  guestsStore.guests.forEach(g => {
    if (
      g.fullName?.toLowerCase().includes(q) ||
      g.phone?.includes(q) ||
      g.email?.toLowerCase().includes(q) ||
      g.country?.toLowerCase().includes(q) ||
      g.origin?.toLowerCase().includes(q)
    ) {
      out.push({
        type: 'guest',
        id: g.id,
        icon: '👤',
        title: g.fullName || 'Unknown',
        sub: [g.phone, g.email, g.country || g.origin].filter(Boolean).join(' · '),
        data: g
      })
    }
  })

  // Apartments
  apartmentsStore.apartments.forEach(a => {
    if (a.name?.toLowerCase().includes(q)) {
      out.push({
        type: 'apartment',
        id: a.id,
        icon: '🏨',
        title: a.name,
        sub: `${a.maxGuests || a.capacity || '?'} guests · €${a.pricePerNight || '?'}/night`,
        data: a
      })
    }
  })

  return out.slice(0, 20).map((r, i) => ({ ...r, _index: i }))
})

const groupedResults = computed(() => {
  const groups = {}
  const labels = { booking: 'Reservations', guest: 'Guests', apartment: 'Apartments' }
  results.value.forEach(r => {
    if (!groups[r.type]) groups[r.type] = { label: labels[r.type], items: [] }
    groups[r.type].items.push(r)
  })
  return Object.values(groups)
})

const totalResults = computed(() => results.value.length)
function moveDown() { highlighted.value = Math.min(highlighted.value + 1, totalResults.value - 1) }
function moveUp() { highlighted.value = Math.max(highlighted.value - 1, 0) }
function selectHighlighted() {
  const r = results.value.find(r => r._index === highlighted.value)
  if (r) select(r)
}

function select(r) {
  close()
  if (r.type === 'booking') router.push('/bookings')
  else if (r.type === 'guest') router.push('/guests')
  else if (r.type === 'apartment') router.push('/apartments')
}

function highlight(text, q) {
  if (!q) return text
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}
</script>

<style scoped>
.search-trigger {
  display: flex;
  align-items: center;
  gap: .5rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: .35rem .75rem;
  color: var(--text-3);
  cursor: pointer;
  font-size: .8rem;
  transition: border-color .15s, background .15s;
  min-width: 160px;
}
.search-trigger:hover { border-color: var(--accent); background: var(--bg-card); color: var(--text-2); }
.search-icon { font-size: .85rem; }
.search-hint { flex: 1; text-align: left; }
.kbd { background: var(--bg-2); border: 1px solid var(--border); border-radius: 4px; padding: .1rem .3rem; font-size: .65rem; font-family: monospace; color: var(--text-3); }

/* Overlay */
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.7);
  backdrop-filter: blur(6px);
  z-index: 400;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8vh;
}

.search-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 580px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .875rem 1rem;
  border-bottom: 1px solid var(--border);
}
.si { font-size: 1rem; flex-shrink: 0; }
.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 1rem;
  font-family: inherit;
}
.search-input::placeholder { color: var(--text-3); }
.clear-btn { background: none; border: none; color: var(--text-3); cursor: pointer; font-size: .9rem; padding: .2rem; }
.kbd-esc { background: var(--bg-3); border: 1px solid var(--border); border-radius: 4px; padding: .15rem .4rem; font-size: .65rem; font-family: monospace; color: var(--text-3); cursor: pointer; flex-shrink: 0; }

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: .5rem 0;
}

.result-group-label {
  font-size: .65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--text-3);
  padding: .5rem 1rem .25rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .6rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  color: var(--text);
  transition: background .1s;
}
.result-item:hover, .result-item.highlighted { background: var(--bg-3); }
.result-icon { font-size: 1rem; flex-shrink: 0; }
.result-body { flex: 1; min-width: 0; }
.result-title { font-size: .88rem; font-weight: 500; color: var(--text); }
.result-title :deep(mark) { background: var(--accent-dim); color: var(--accent); border-radius: 2px; }
.result-sub { font-size: .72rem; color: var(--text-3); margin-top: .1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.no-results {
  padding: 2rem;
  text-align: center;
  font-size: .85rem;
  color: var(--text-3);
}

.search-empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-3);
  font-size: .82rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  align-items: center;
}
.search-empty-icon { font-size: 1.75rem; }
.search-empty-tips { display: flex; gap: .5rem; font-size: .72rem; color: var(--text-3); }

.search-footer {
  display: flex;
  gap: 1.25rem;
  padding: .6rem 1rem;
  border-top: 1px solid var(--border);
  font-size: .72rem;
  color: var(--text-3);
}
.search-footer kbd {
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: .05rem .3rem;
  font-size: .65rem;
  font-family: monospace;
  margin-right: .25rem;
}

/* Transition */
.search-fade-enter-active, .search-fade-leave-active { transition: opacity .15s ease; }
.search-fade-enter-from, .search-fade-leave-to { opacity: 0; }
.search-fade-enter-active .search-box, .search-fade-leave-active .search-box { transition: transform .15s ease; }
.search-fade-enter-from .search-box { transform: translateY(-16px); }
</style>
