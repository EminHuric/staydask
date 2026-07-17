<!-- src/views/ApartmentsView.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Apartments</h1>
        <p class="text-muted text-sm mt-2">
          {{ apartments.length }}{{ apartmentsStore.limit != null ? ` / ${apartmentsStore.limit}` : '' }}
          apartment{{ apartments.length !== 1 ? 's' : '' }} in your workspace
        </p>
      </div>
      <button class="btn btn-primary add-btn" :disabled="atLimit" :title="atLimit ? limitMessage : ''" @click="openAdd">+ Add Apartment</button>
    </div>

    <p v-if="atLimit" class="limit-banner">{{ limitMessage }}</p>

    <!-- Empty state -->
    <div v-if="apartments.length === 0 && !loading" class="empty-card">
      <div class="empty-icon">🏠</div>
      <h3>No apartments yet</h3>
      <p class="text-muted text-sm">Add your first apartment to start managing bookings.</p>
      <button class="btn btn-primary mt-4" :disabled="atLimit" @click="openAdd">+ Add Apartment</button>
    </div>

    <!-- Apartments grid -->
    <div class="apt-grid">
      <div v-for="apt in apartments" :key="apt.id" class="apt-card">
        <div class="apt-card-header" :style="{ borderTop: `3px solid ${apt.color || '#3b82f6'}` }">
          <div class="apt-title-row">
            <h3>{{ apt.name }}</h3>
          </div>
          <div class="apt-meta">
            <span class="apt-meta-item">👥 {{ apt.maxGuests || apt.capacity || 1 }} guests max</span>
            <span class="apt-meta-item">💰 €{{ apt.pricePerNight || 0 }}/night</span>
          </div>
          <div class="apt-actions">
            <button class="btn btn-ghost btn-sm" @click="openStats(apt)">📊 Stats</button>
            <button class="btn btn-ghost btn-sm" @click="openEdit(apt)">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" @click="confirmDelete(apt)">🗑 Delete</button>
          </div>
        </div>

        <div v-if="apt.description" class="apt-description">{{ apt.description }}</div>

        <div v-if="apt.features && apt.features.length > 0" class="apt-features">
          <span v-for="f in apt.features" :key="f" class="feature-tag">{{ featureLabel(f) }}</span>
        </div>

        <!-- Quick stats bar -->
        <div class="apt-stats">
          <div class="apt-stat">
            <span class="apt-stat-value">{{ stats(apt.id).bookings }}</span>
            <span class="apt-stat-label">Bookings</span>
          </div>
          <div class="apt-stat">
            <span class="apt-stat-value text-green">€{{ stats(apt.id).collected.toLocaleString() }}</span>
            <span class="apt-stat-label">Collected</span>
          </div>
          <div class="apt-stat">
            <span class="apt-stat-value">{{ stats(apt.id).occupancy }}%</span>
            <span class="apt-stat-label">Occupancy</span>
          </div>
          <div class="apt-stat" v-if="stats(apt.id).activeNow">
            <span class="apt-stat-value" style="color:var(--green)">Active</span>
            <span class="apt-stat-label">Status</span>
          </div>
          <div class="apt-stat" v-else>
            <span class="apt-stat-value text-muted" style="font-size:.8rem">{{ stats(apt.id).nextCheckIn || '—' }}</span>
            <span class="apt-stat-label">Next Check-in</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Detail Panel -->
    <Transition name="slide-right">
      <div v-if="statsApt" class="detail-overlay" @click.self="statsApt = null">
        <div class="detail-panel">
          <div class="detail-header">
            <div>
              <h2>{{ statsApt.name }}</h2>
              <div class="text-xs text-muted mt-1">{{ statsApt.maxGuests || statsApt.capacity }} guests · €{{ statsApt.pricePerNight }}/night</div>
            </div>
            <button class="btn btn-ghost btn-sm" @click="statsApt = null">✕</button>
          </div>

          <div class="color-strip" :style="{ background: statsApt.color || '#3b82f6' }"></div>

          <!-- KPI grid -->
          <div class="stats-kpi-grid">
            <div class="stats-kpi">
              <div class="stats-kpi-val">{{ detailStats.bookings }}</div>
              <div class="stats-kpi-lbl">Total Bookings</div>
            </div>
            <div class="stats-kpi">
              <div class="stats-kpi-val">{{ detailStats.nights }}</div>
              <div class="stats-kpi-lbl">Nights Sold</div>
            </div>
            <div class="stats-kpi green">
              <div class="stats-kpi-val">€{{ detailStats.collected.toLocaleString() }}</div>
              <div class="stats-kpi-lbl">Collected</div>
            </div>
            <div class="stats-kpi">
              <div class="stats-kpi-val">€{{ detailStats.expected.toLocaleString() }}</div>
              <div class="stats-kpi-lbl">Expected</div>
            </div>
            <div class="stats-kpi" :class="{ red: detailStats.outstanding > 0 }">
              <div class="stats-kpi-val">€{{ detailStats.outstanding.toLocaleString() }}</div>
              <div class="stats-kpi-lbl">Outstanding</div>
            </div>
            <div class="stats-kpi accent">
              <div class="stats-kpi-val">{{ detailStats.occupancy }}%</div>
              <div class="stats-kpi-lbl">Occupancy (yr)</div>
            </div>
            <div class="stats-kpi">
              <div class="stats-kpi-val">€{{ detailStats.avgPerNight }}</div>
              <div class="stats-kpi-lbl">Avg / Night</div>
            </div>
            <div class="stats-kpi">
              <div class="stats-kpi-val">{{ detailStats.availableDays }}</div>
              <div class="stats-kpi-lbl">Available Days</div>
            </div>
          </div>

          <!-- Payment breakdown -->
          <div class="detail-section-title">Payment Breakdown</div>
          <div class="pay-breakdown">
            <div v-for="s in detailStats.payBreakdown" :key="s.key" :class="['pay-row', s.key]">
              <span class="pay-row-label">{{ s.label }}</span>
              <span class="pay-row-count">{{ s.count }}</span>
              <span class="pay-row-amount">€{{ s.amount.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Recent bookings -->
          <div class="detail-section-title">Recent Bookings</div>
          <div v-if="detailStats.recentBookings.length === 0" class="text-sm text-muted" style="padding:.5rem 0">
            No bookings for this apartment.
          </div>
          <div v-else class="recent-bookings-list">
            <div v-for="b in detailStats.recentBookings" :key="b.id" class="recent-booking-item">
              <div class="rb-dates">{{ fmtDate(b.checkIn) }} → {{ fmtDate(b.checkOut) }}</div>
              <div class="rb-guest">{{ b.guestName }}</div>
              <div class="rb-right">
                <span class="rb-price">€{{ (b.totalPrice||0).toLocaleString() }}</span>
                <span :class="['badge', payBadge(b.paymentStatus)]" style="font-size:.62rem">{{ payLabel(b.paymentStatus) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Add/Edit Modal -->
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-title">
            <span>{{ editing ? 'Edit Apartment' : 'Add Apartment' }}</span>
            <button class="btn btn-ghost btn-sm" @click="closeModal">✕</button>
          </div>

          <form @submit.prevent="saveApartment" class="modal-form">
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Apartment Name *</label>
                <input v-model="form.name" class="form-input" placeholder="e.g. Ocean Suite A" required />
              </div>
              <div class="form-group" style="width: 110px">
                <label class="form-label">Color</label>
                <div class="color-grid">
                  <button v-for="c in COLORS" :key="c" type="button"
                    class="color-dot"
                    :style="{ background: c, outline: form.color === c ? `2px solid white` : 'none', outlineOffset: '2px' }"
                    @click="form.color = c">
                  </button>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Max Guests *</label>
                <input v-model.number="form.maxGuests" class="form-input" type="number" min="1" max="20" required />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Default Price / Night (€)</label>
                <input v-model.number="form.pricePerNight" class="form-input" type="number" min="0" step="0.01" />
              </div>
            </div>

            <div v-if="formError" class="error-msg">{{ formError }}</div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea v-model="form.description" class="form-input" rows="2"
                placeholder="Short description of the apartment…"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Features</label>
              <div class="features-grid">
                <label v-for="f in FEATURES" :key="f.value" class="feature-checkbox">
                  <input type="checkbox" :value="f.value" v-model="form.features" />
                  <span>{{ f.label }}</span>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Apartment') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Delete confirm -->
    <Transition name="fade">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal" style="max-width: 380px">
          <div class="modal-title">Delete Apartment</div>
          <p class="text-muted text-sm mb-4">
            Are you sure you want to delete <strong style="color: var(--text)">{{ deleteTarget.name }}</strong>?
            This will not delete existing bookings but they will lose their apartment reference.
          </p>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="deleteTarget = null">Cancel</button>
            <button class="btn btn-danger" @click="doDelete" :disabled="saving">
              {{ saving ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format, parseISO, isWithinInterval, startOfDay, isAfter, getDaysInYear } from 'date-fns'
import { useApartmentsStore } from '@/stores/apartments'
import { useBookingsStore } from '@/stores/bookings'

const apartmentsStore = useApartmentsStore()
const bookingsStore = useBookingsStore()

const apartments = computed(() => apartmentsStore.apartments)
const loading = computed(() => apartmentsStore.loading)
const atLimit = computed(() => apartmentsStore.limit != null && apartments.value.length >= apartmentsStore.limit)
const limitMessage = computed(() => `You've reached your apartment limit (${apartmentsStore.limit}). Ask your admin to raise it.`)
const formError = ref('')
const thisYear = new Date().getFullYear()
const today = startOfDay(new Date())

const COLORS = ['#3b82f6','#22c55e','#f5a623','#ef4444','#a855f7','#06b6d4','#ec4899','#f59e0b','#10b981','#6366f1']

const FEATURES = [
  { value: 'sea_view', label: '🌊 Sea View' },
  { value: 'mountain_view', label: '⛰️ Mountain View' },
  { value: 'pool', label: '🏊 Pool' },
  { value: 'beach', label: '🏖️ Beach Access' },
  { value: 'balcony', label: '🌿 Balcony' },
  { value: 'terrace', label: '☀️ Terrace' },
  { value: 'garden', label: '🌳 Garden' },
  { value: 'wifi', label: '📶 WiFi' },
  { value: 'parking', label: '🅿️ Parking' },
  { value: 'ac', label: '❄️ Air Conditioning' },
  { value: 'kitchen', label: '🍳 Kitchen' },
  { value: 'washer', label: '🧺 Washing Machine' },
  { value: 'pets', label: '🐾 Pets Allowed' },
]

const PAY_LABELS = { unpaid: 'Unpaid', deposit_paid: 'Deposit', partial: 'Partial', paid: 'Paid' }
const PAY_BADGES = { unpaid: 'badge-red', deposit_paid: 'badge-amber', partial: 'badge-blue', paid: 'badge-green' }
function payLabel(s) { return PAY_LABELS[s] || s }
function payBadge(s) { return PAY_BADGES[s] || 'badge-amber' }
function featureLabel(val) { return FEATURES.find(f => f.value === val)?.label || val }
function fmtDate(d) { return d ? format(parseISO(d), 'dd MMM yy') : '—' }

function aptBookings(id) {
  return bookingsStore.bookings.filter(b => b.apartmentId === id && b.status !== 'cancelled')
}

function stats(id) {
  const bs = aptBookings(id)
  const yearBs = bs.filter(b => parseISO(b.checkIn).getFullYear() === thisYear)
  const nights = yearBs.reduce((s, b) => s + (b.days || 0), 0)
  const activeNow = bs.some(b => isWithinInterval(today, {
    start: startOfDay(parseISO(b.checkIn)),
    end: startOfDay(parseISO(b.checkOut))
  }))
  const upcoming = bs
    .filter(b => isAfter(parseISO(b.checkIn), today))
    .sort((a, b) => a.checkIn > b.checkIn ? 1 : -1)
  const nextCheckIn = upcoming[0]?.checkIn ? fmtDate(upcoming[0].checkIn) : null
  return {
    bookings: bs.length,
    collected: bs.reduce((s, b) => s + (b.totalPaid || 0), 0),
    occupancy: Math.min(100, Math.round(nights / getDaysInYear(new Date(thisYear, 0)) * 100)),
    activeNow,
    nextCheckIn
  }
}

// Stats panel
const statsApt = ref(null)

const detailStats = computed(() => {
  if (!statsApt.value) return {}
  const id = statsApt.value.id
  const bs = aptBookings(id)
  const yearBs = bs.filter(b => parseISO(b.checkIn).getFullYear() === thisYear)
  const nights = yearBs.reduce((s, b) => s + (b.days || 0), 0)
  const expected = yearBs.reduce((s, b) => s + (b.totalPrice || 0), 0)
  const collected = yearBs.reduce((s, b) => s + (b.totalPaid || 0), 0)
  const daysInYear = getDaysInYear(new Date(thisYear, 0))
  const occupancy = Math.min(100, Math.round(nights / daysInYear * 100))
  return {
    bookings: bs.length,
    nights,
    expected,
    collected,
    outstanding: expected - collected,
    occupancy,
    avgPerNight: nights > 0 ? Math.round(expected / nights) : 0,
    availableDays: daysInYear - nights,
    payBreakdown: [
      { key: 'unpaid', label: 'Unpaid', count: yearBs.filter(b => b.paymentStatus === 'unpaid').length, amount: yearBs.filter(b => b.paymentStatus === 'unpaid').reduce((s, b) => s + (b.totalPrice || 0), 0) },
      { key: 'deposit_paid', label: 'Deposit Paid', count: yearBs.filter(b => b.paymentStatus === 'deposit_paid').length, amount: yearBs.filter(b => b.paymentStatus === 'deposit_paid').reduce((s, b) => s + (b.totalPaid || 0), 0) },
      { key: 'partial', label: 'Partially Paid', count: yearBs.filter(b => b.paymentStatus === 'partial').length, amount: yearBs.filter(b => b.paymentStatus === 'partial').reduce((s, b) => s + (b.totalPaid || 0), 0) },
      { key: 'paid', label: 'Fully Paid', count: yearBs.filter(b => b.paymentStatus === 'paid').length, amount: yearBs.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + (b.totalPrice || 0), 0) },
    ],
    recentBookings: bs.slice().sort((a, b) => (b.checkIn || '') > (a.checkIn || '') ? 1 : -1).slice(0, 8)
  }
})

function openStats(apt) { statsApt.value = apt }

// Modal state
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const deleteTarget = ref(null)

const defaultForm = () => ({
  name: '', maxGuests: 2, pricePerNight: 0,
  description: '', features: [], color: '#3b82f6'
})
const form = ref(defaultForm())

function openAdd() {
  if (atLimit.value) return
  editing.value = null
  form.value = defaultForm()
  formError.value = ''
  showModal.value = true
}

function openEdit(apt) {
  editing.value = apt.id
  form.value = {
    name: apt.name || '',
    maxGuests: apt.maxGuests || apt.capacity || 2,
    pricePerNight: apt.pricePerNight || 0,
    description: apt.description || '',
    features: apt.features ? [...apt.features] : [],
    color: apt.color || '#3b82f6'
  }
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
  formError.value = ''
}

function confirmDelete(apt) {
  deleteTarget.value = apt
}

async function saveApartment() {
  saving.value = true
  formError.value = ''
  const data = {
    name: form.value.name,
    maxGuests: form.value.maxGuests,
    capacity: form.value.maxGuests,
    pricePerNight: form.value.pricePerNight,
    description: form.value.description,
    features: form.value.features,
    color: form.value.color
  }
  try {
    if (editing.value) {
      await apartmentsStore.updateApartment(editing.value, data)
    } else {
      await apartmentsStore.addApartment(data)
    }
    closeModal()
  } catch (e) {
    formError.value = e.message
  }
  saving.value = false
}

async function doDelete() {
  saving.value = true
  await apartmentsStore.deleteApartment(deleteTarget.value.id)
  saving.value = false
  deleteTarget.value = null
}
</script>

<style scoped>
/* ── Page layout ── */
.page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}
.page-header-text { flex: 1; min-width: 0; }
.add-btn { flex-shrink: 0; white-space: nowrap; }
.add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.limit-banner {
  background: var(--red-dim);
  color: var(--red);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.9rem;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.error-msg {
  padding: 0.6rem 0.9rem;
  background: var(--red-dim);
  color: var(--red);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

/* ── Empty state ── */
.empty-card {
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 3rem 1.5rem;
  text-align: center;
}
.empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }

/* ── Grid ── */
.apt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

/* ── Card ── */
.apt-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color .2s, box-shadow .2s;
  box-shadow: var(--shadow-sm);
}
.apt-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.apt-card-header { padding: 1.1rem 1.1rem 0.75rem; }
.apt-title-row { margin-bottom: 0.35rem; }
.apt-title-row h3 { font-size: 1rem; color: var(--text); }

.apt-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}
.apt-meta-item { font-size: 0.78rem; color: var(--text-2); }

/* Action buttons row — full width, easy to tap */
.apt-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.apt-actions .btn {
  flex: 1;
  justify-content: center;
  min-width: 0;
  font-size: 0.75rem;
  padding: 0.45rem 0.5rem;
}

.apt-description {
  padding: 0 1.1rem 0.6rem;
  font-size: 0.8rem;
  color: var(--text-2);
  line-height: 1.5;
}
.apt-features {
  padding: 0 1.1rem 0.6rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.feature-tag {
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: 99px;
  padding: 0.15rem 0.55rem;
  font-size: 0.7rem;
  color: var(--text-2);
}

/* Stats strip at bottom of card */
.apt-stats {
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 0.7rem 1.1rem;
  margin-top: auto;
  gap: 0.5rem;
}
.apt-stat { display: flex; flex-direction: column; gap: 0.1rem; }
.apt-stat-value { font-size: 0.82rem; font-weight: 700; color: var(--text); }
.apt-stat-label { font-size: 0.6rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }
.text-green { color: var(--green); }
.text-muted { color: var(--text-3); }

/* ── Stats detail panel ── */
.detail-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
  z-index: 300;
  display: flex;
  justify-content: flex-end;
}
.detail-panel {
  width: 100%;
  max-width: 440px;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  gap: 1rem;
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 2;
}
.color-strip { height: 3px; }

.stats-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  border-bottom: 1px solid var(--border);
}
.stats-kpi {
  padding: .75rem .5rem;
  text-align: center;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.stats-kpi:nth-child(4n) { border-right: none; }
.stats-kpi.green { background: var(--green-dim); }
.stats-kpi.red { background: var(--red-dim); }
.stats-kpi.accent { background: var(--accent-dim); }
.stats-kpi-val { font-size: .85rem; font-weight: 700; color: var(--text); }
.stats-kpi-lbl { font-size: .58rem; text-transform: uppercase; letter-spacing: .04em; color: var(--text-3); margin-top: .15rem; }

.detail-section-title {
  font-size: .65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--text-3);
  padding: .875rem 1.5rem .3rem;
}

.pay-breakdown { padding: .25rem 1.5rem .75rem; display: flex; flex-direction: column; gap: .35rem; }
.pay-row { display: flex; align-items: center; gap: .6rem; padding: .45rem .75rem; border-radius: var(--radius-sm); background: var(--bg-3); font-size: .78rem; }
.pay-row.unpaid { border-left: 3px solid var(--red); }
.pay-row.deposit_paid { border-left: 3px solid var(--accent); }
.pay-row.partial { border-left: 3px solid var(--blue); }
.pay-row.paid { border-left: 3px solid var(--green); }
.pay-row-label { flex: 1; color: var(--text-2); }
.pay-row-count { font-weight: 700; color: var(--text); }
.pay-row-amount { color: var(--text-2); min-width: 55px; text-align: right; }

.recent-bookings-list { padding: 0 1.5rem 1.5rem; display: flex; flex-direction: column; gap: .4rem; }
.recent-booking-item { display: flex; align-items: center; gap: .6rem; padding: .5rem .75rem; background: var(--bg-3); border-radius: var(--radius-sm); flex-wrap: wrap; }
.rb-dates { font-size: .7rem; color: var(--text-3); min-width: 120px; }
.rb-guest { flex: 1; font-size: .78rem; color: var(--text); min-width: 80px; }
.rb-right { display: flex; align-items: center; gap: .4rem; }
.rb-price { font-size: .78rem; font-weight: 600; color: var(--text); }

/* ── Modal form ── */
.modal-form { display: flex; flex-direction: column; gap: 0.875rem; }
.form-row { display: flex; gap: 0.875rem; }
.flex-1 { flex: 1; min-width: 0; }

.color-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.color-dot {
  width: 26px; height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.12s, border-color 0.12s;
  flex-shrink: 0;
}
.color-dot:hover { transform: scale(1.15); }

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  max-height: 190px;
  overflow-y: auto;
  padding: 0.6rem;
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.feature-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-2);
  cursor: pointer;
  padding: 0.2rem 0;
  -webkit-tap-highlight-color: transparent;
}
.feature-checkbox input { cursor: pointer; accent-color: var(--accent); width: 16px; height: 16px; }
textarea.form-input { resize: vertical; min-height: 60px; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--border);
  margin-top: 0.25rem;
}
.modal-footer .btn { flex: 1; justify-content: center; }

.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }

/* ── Transition ── */
.slide-right-enter-active, .slide-right-leave-active { transition: transform .25s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }

/* ── Mobile ── */
@media (max-width: 640px) {
  .page { padding: 0.875rem 0.875rem 6rem; }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  .add-btn { width: 100%; justify-content: center; padding: 0.75rem; font-size: 0.95rem; }

  .apt-grid { grid-template-columns: 1fr; gap: 0.75rem; }

  .apt-stats { grid-template-columns: repeat(2, 1fr); }

  .form-row { flex-direction: column; gap: 0.75rem; }
  .features-grid { grid-template-columns: 1fr; max-height: 160px; }

  .detail-panel { max-width: 100%; border-left: none; }
  .stats-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .stats-kpi:nth-child(2n) { border-right: none; }
  .stats-kpi:nth-child(4n) { border-right: none; }
}

@media (min-width: 641px) and (max-width: 900px) {
  .apt-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
