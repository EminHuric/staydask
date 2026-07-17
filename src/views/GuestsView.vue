<!-- src/views/GuestsView.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Guests</h1>
        <p class="text-muted text-sm mt-2">{{ filtered.length }} guest{{ filtered.length !== 1 ? 's' : '' }} in database</p>
      </div>
      <button class="btn btn-primary" @click="openAdd">+ Add Guest</button>
    </div>

    <!-- Search -->
    <div class="filters-bar">
      <input v-model="search" class="form-input search-input" placeholder="Search by name, phone, email, country…" />
      <button v-if="search" class="btn btn-ghost btn-sm" @click="search = ''">Clear</button>
    </div>

    <!-- Empty -->
    <div v-if="filtered.length === 0 && !guestsStore.loading" class="empty-card">
      <div style="font-size: 2.5rem; margin-bottom: 0.75rem">👥</div>
      <h3>{{ search ? 'No guests found' : 'No guests yet' }}</h3>
      <p class="text-muted text-sm">Guests are added automatically when you create bookings.</p>
    </div>

    <!-- Guest cards grid -->
    <div v-else class="guests-grid">
      <div v-for="g in filtered" :key="g.id" class="guest-card" @click="openDetail(g)">
        <div class="guest-avatar">{{ initials(g.fullName) }}</div>
        <div class="guest-info">
          <div class="guest-name">{{ g.fullName }}</div>
          <div class="guest-meta">
            <span v-if="g.phone">📞 {{ g.phone }}</span>
            <span v-if="g.email">✉️ {{ g.email }}</span>
            <span v-if="g.country || g.origin">📍 {{ g.country || g.origin }}</span>
          </div>
          <div class="guest-stats">
            <span class="guest-stat">
              <strong>{{ guestBookings(g.id).length }}</strong> stay{{ guestBookings(g.id).length !== 1 ? 's' : '' }}
            </span>
            <span v-if="guestRevenue(g.id) > 0" class="guest-stat text-accent">
              €{{ guestRevenue(g.id).toLocaleString() }}
            </span>
            <span v-if="lastReservation(g.id)" class="guest-stat text-muted">
              Last: {{ formatDate(lastReservation(g.id)) }}
            </span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm guest-edit-btn" @click.stop="openEdit(g)">Edit</button>
      </div>
    </div>

    <!-- Add/Edit modal -->
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-title">
            <span>{{ editingId ? 'Edit Guest' : 'Add Guest' }}</span>
            <button class="btn btn-ghost btn-sm" @click="closeModal">✕</button>
          </div>
          <form @submit.prevent="saveGuest" class="modal-form">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input v-model="form.fullName" class="form-input" placeholder="John Smith" required />
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Phone</label>
                <input v-model="form.phone" class="form-input" placeholder="+385 91 234 5678" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Email</label>
                <input v-model="form.email" class="form-input" type="email" placeholder="john@example.com" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Country</label>
                <input v-model="form.country" class="form-input" placeholder="Germany" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Origin / City</label>
                <input v-model="form.origin" class="form-input" placeholder="Berlin" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea v-model="form.notes" class="form-input" rows="2" placeholder="Any notes about this guest…"></textarea>
            </div>
            <div class="modal-footer">
              <button v-if="editingId" type="button" class="btn btn-danger btn-sm" @click="removeGuest">Delete</button>
              <div class="flex-1"></div>
              <button type="button" class="btn btn-ghost" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Saving…' : (editingId ? 'Save' : 'Add Guest') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Booking edit modal (opened from history row) -->
    <BookingModal
      v-if="editingBooking"
      :booking="editingBooking"
      @close="editingBooking = null"
      @saved="editingBooking = null"
    />

    <!-- Guest detail drawer -->
    <Transition name="slide-right">
      <div v-if="detailGuest" class="detail-overlay" @click.self="detailGuest = null">
        <div class="detail-panel">
          <div class="detail-header">
            <div class="detail-avatar">{{ initials(detailGuest.fullName) }}</div>
            <div class="detail-title-group">
              <h2>{{ detailGuest.fullName }}</h2>
              <div class="guest-meta">
                <span v-if="detailGuest.phone">📞 {{ detailGuest.phone }}</span>
                <span v-if="detailGuest.email">✉️ {{ detailGuest.email }}</span>
                <span v-if="detailGuest.country">🌍 {{ detailGuest.country }}</span>
                <span v-if="detailGuest.origin">📍 {{ detailGuest.origin }}</span>
              </div>
            </div>
            <div class="detail-header-actions">
              <button class="btn btn-ghost btn-sm" @click="openEdit(detailGuest); detailGuest = null">Edit</button>
              <button class="btn btn-ghost btn-sm" @click="detailGuest = null">✕</button>
            </div>
          </div>

          <div v-if="detailGuest.notes" class="detail-notes">
            <div class="form-label mb-2">Notes</div>
            <p class="text-sm text-muted">{{ detailGuest.notes }}</p>
          </div>

          <!-- Stats -->
          <div class="detail-stats">
            <div class="detail-stat">
              <div class="stat-value">{{ guestBookings(detailGuest.id).length }}</div>
              <div class="stat-label">Stays</div>
            </div>
            <div class="detail-stat">
              <div class="stat-value">{{ guestNights(detailGuest.id) }}</div>
              <div class="stat-label">Nights</div>
            </div>
            <div class="detail-stat accent">
              <div class="stat-value">€{{ guestRevenue(detailGuest.id).toLocaleString() }}</div>
              <div class="stat-label">Total Spent</div>
            </div>
            <div class="detail-stat" style="grid-column: span 3">
              <div class="stat-value stat-value-sm">{{ lastReservation(detailGuest.id) ? formatDate(lastReservation(detailGuest.id)) : '—' }}</div>
              <div class="stat-label">Last Reservation</div>
            </div>
          </div>

          <!-- Booking history -->
          <div class="detail-section-title">Booking History</div>
          <div v-if="guestBookings(detailGuest.id).length === 0" class="text-sm text-muted" style="padding: 1rem 0">
            No bookings yet.
          </div>
          <div v-else class="booking-history">
            <div v-for="b in guestBookings(detailGuest.id)" :key="b.id"
              class="history-item"
              @click="editingBooking = b"
            >
              <!-- Top row: apartment + status badge -->
              <div class="history-top">
                <div class="history-apt">
                  <span class="apt-dot" :style="{ background: aptColor(b.apartmentId) }"></span>
                  <span class="history-apt-name">{{ aptName(b.apartmentId) }}</span>
                </div>
                <span :class="['badge', statusBadge(b), 'badge-sm']">{{ statusLabel(b) }}</span>
              </div>
              <!-- Middle row: dates + nights -->
              <div class="history-dates">
                📅 {{ formatDate(b.checkIn) }} → {{ formatDate(b.checkOut) }}
                <span class="history-nights">{{ b.days }}n</span>
              </div>
              <!-- Bottom row: pricing breakdown + edit hint -->
              <div class="history-pricing">
                <div class="history-price-detail">
                  <span class="price-per-night">€{{ b.pricePerNight }}/night</span>
                  <span class="price-sep">·</span>
                  <span class="price-total">€{{ (b.totalPrice || 0).toLocaleString() }} total</span>
                  <span v-if="(b.totalPrice || 0) - (b.totalPaid || 0) > 0" class="price-owed">
                    · <span style="color:var(--red)">€{{ ((b.totalPrice||0)-(b.totalPaid||0)).toLocaleString() }} owed</span>
                  </span>
                  <span v-else class="price-paid-tag">✓ Paid</span>
                </div>
                <span class="edit-hint">Edit →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format, parseISO, isWithinInterval, startOfDay, isAfter } from 'date-fns'
import { useGuestsStore } from '@/stores/guests'
import { useBookingsStore } from '@/stores/bookings'
import { useApartmentsStore } from '@/stores/apartments'
import BookingModal from '@/components/BookingModal.vue'

const guestsStore = useGuestsStore()
const bookingsStore = useBookingsStore()
const apartmentsStore = useApartmentsStore()

const search = ref('')
const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)
const detailGuest = ref(null)
const editingBooking = ref(null)

const defaultForm = () => ({ fullName: '', phone: '', email: '', country: '', origin: '', notes: '' })
const form = ref(defaultForm())

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  let list = guestsStore.guests
  if (q) {
    list = list.filter(g =>
      g.fullName?.toLowerCase().includes(q) ||
      g.phone?.includes(q) ||
      g.email?.toLowerCase().includes(q) ||
      g.country?.toLowerCase().includes(q) ||
      g.origin?.toLowerCase().includes(q)
    )
  }
  return list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
})

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

function guestBookings(guestId) {
  const g = guestsStore.guests.find(g => g.id === guestId)
  if (!g) return []
  return bookingsStore.bookings.filter(b =>
    b.status !== 'cancelled' &&
    (b.guestName?.toLowerCase() === g.fullName?.toLowerCase() ||
    (b.phone && b.phone === g.phone))
  ).sort((a, b) => (b.checkIn || '') > (a.checkIn || '') ? 1 : -1)
}

function guestRevenue(guestId) {
  return guestBookings(guestId).reduce((s, b) => s + (b.totalPrice || 0), 0)
}

function guestNights(guestId) {
  return guestBookings(guestId).reduce((s, b) => s + (b.days || 0), 0)
}

function lastReservation(guestId) {
  const bookings = guestBookings(guestId)
  return bookings.length > 0 ? bookings[0].checkIn : null
}

function aptName(id) {
  return apartmentsStore.apartments.find(a => a.id === id)?.name || '—'
}

function aptColor(id) {
  return apartmentsStore.apartments.find(a => a.id === id)?.color || '#3b82f6'
}

function formatDate(d) {
  if (!d) return '—'
  return format(parseISO(d), 'dd MMM yyyy')
}

function statusLabel(b) {
  const today = startOfDay(new Date())
  const ci = startOfDay(parseISO(b.checkIn))
  const co = startOfDay(parseISO(b.checkOut))
  if (isWithinInterval(today, { start: ci, end: co })) return 'Active'
  if (isAfter(ci, today)) return 'Upcoming'
  return 'Past'
}

function statusBadge(b) {
  const s = statusLabel(b)
  if (s === 'Active') return 'badge-green'
  if (s === 'Upcoming') return 'badge-blue'
  return 'badge-amber'
}

function openAdd() {
  editingId.value = null
  form.value = defaultForm()
  showModal.value = true
}

function openEdit(g) {
  editingId.value = g.id
  form.value = {
    fullName: g.fullName || '',
    phone: g.phone || '',
    email: g.email || '',
    country: g.country || '',
    origin: g.origin || '',
    notes: g.notes || ''
  }
  showModal.value = true
}

function openDetail(g) {
  detailGuest.value = g
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function saveGuest() {
  saving.value = true
  if (editingId.value) {
    await guestsStore.updateGuest(editingId.value, form.value)
  } else {
    await guestsStore.addGuest(form.value)
  }
  saving.value = false
  closeModal()
}

async function removeGuest() {
  saving.value = true
  await guestsStore.deleteGuest(editingId.value)
  saving.value = false
  closeModal()
}
</script>

<style scoped>
.page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 1rem;
}

.filters-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  align-items: center;
}
.search-input { flex: 1; max-width: 440px; }

.empty-card {
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 3rem;
  text-align: center;
}

.guests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0.75rem;
}

.guest-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
}
.guest-card:hover { border-color: var(--accent); background: var(--bg-3); }

.guest-avatar {
  width: 44px; height: 44px;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.875rem; font-weight: 700;
  flex-shrink: 0;
}

.guest-info { flex: 1; min-width: 0; }
.guest-name { font-weight: 600; font-size: 0.9rem; color: var(--text); margin-bottom: 0.2rem; }
.guest-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.72rem;
  color: var(--text-3);
  margin-bottom: 0.4rem;
}
.guest-stats { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.guest-stat { font-size: 0.72rem; color: var(--text-2); }
.text-accent { color: var(--accent); }
.text-muted { color: var(--text-3); }

.guest-edit-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  opacity: 0;
  transition: opacity 0.15s;
}
.guest-card:hover .guest-edit-btn { opacity: 1; }

/* Modal */
.modal-form { display: flex; flex-direction: column; gap: 0.875rem; }
.form-row { display: flex; gap: 0.75rem; }
.flex-1 { flex: 1; min-width: 0; }
.modal-footer { display: flex; align-items: center; gap: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--border); }
textarea.form-input { resize: vertical; }

/* Detail drawer */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 300;
  display: flex;
  justify-content: flex-end;
}

.detail-panel {
  width: 100%;
  max-width: 480px;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.detail-avatar {
  width: 56px; height: 56px;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 700;
  flex-shrink: 0;
}

.detail-title-group { flex: 1; min-width: 0; }
.detail-title-group h2 { font-size: 1.1rem; margin-bottom: 0.3rem; }
.detail-header-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

.detail-notes {
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  padding: 0.875rem;
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.detail-stat {
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  text-align: center;
}
.detail-stat.accent { background: var(--accent-dim); }
.detail-stat .stat-value { font-size: 1.2rem; font-weight: 700; color: var(--text); }
.detail-stat .stat-value-sm { font-size: 0.9rem; }
.detail-stat.accent .stat-value { color: var(--accent); }
.detail-stat .stat-label { font-size: 0.65rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.2rem; }

.detail-section-title {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-3);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.booking-history { display: flex; flex-direction: column; gap: 0.5rem; }

.history-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem 0.875rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.history-item:hover {
  border-color: var(--accent);
  background: var(--bg-card);
}
.history-item:active { transform: scale(0.99); }

.history-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.history-apt {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.history-apt-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
}

.history-dates {
  font-size: 0.75rem;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.history-nights {
  background: var(--bg-2);
  border-radius: 99px;
  padding: 0.05rem 0.45rem;
  font-size: 0.68rem;
  color: var(--text-3);
  font-weight: 600;
}

.history-pricing {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.1rem;
}
.history-price-detail {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.75rem;
}
.price-per-night { color: var(--text-2); }
.price-sep { color: var(--text-3); }
.price-total { font-weight: 700; color: var(--text); }
.price-owed { color: var(--text-3); }
.price-paid-tag { color: var(--green); font-weight: 600; font-size: 0.7rem; }
.edit-hint {
  font-size: 0.72rem;
  color: var(--accent);
  font-weight: 600;
  flex-shrink: 0;
  opacity: 0.45;
  transition: opacity 0.15s;
}
.history-item:hover .edit-hint { opacity: 1; }
/* Always fully visible on touch devices */
@media (hover: none) {
  .edit-hint { opacity: 1; }
}

.apt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.badge-sm { font-size: 0.65rem; padding: 0.1rem 0.4rem; }

/* Transitions */
.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.25s ease;
}
.slide-right-enter-from, .slide-right-leave-to {
  transform: translateX(100%);
}
.slide-right-enter-to { transform: translateX(0); }

.mb-2 { margin-bottom: 0.5rem; }

@media (max-width: 768px) {
  .page { padding: 1rem 1rem 6rem; }
  .detail-panel { max-width: 100%; border-left: none; border-top: 1px solid var(--border); }
  .guest-edit-btn { opacity: 1; }
}
@media (max-width: 600px) {
  .page-header { flex-direction: column; align-items: stretch; }
  .page-header > .btn { width: 100%; justify-content: center; padding: .75rem; }
  .search-input { max-width: 100%; }
  .guests-grid { grid-template-columns: 1fr; }
}
</style>
