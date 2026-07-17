<!-- src/views/BookingsView.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Reservations</h1>
        <p class="text-muted text-sm mt-2">{{ filtered.length }} reservation{{ filtered.length !== 1 ? 's' : '' }}</p>
      </div>
      <button class="btn btn-primary" @click="openAdd">+ New Reservation</button>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <input v-model="search" class="form-input search-input" placeholder="Search guest, ID, apartment…" />
      <select v-model="filterApt" class="form-input filter-select">
        <option value="">All Apartments</option>
        <option v-for="apt in apartments" :key="apt.id" :value="apt.id">{{ apt.name }}</option>
      </select>
      <select v-model="filterPayment" class="form-input filter-select">
        <option value="">All Payment Status</option>
        <option value="unpaid">Unpaid</option>
        <option value="deposit_paid">Deposit Paid</option>
        <option value="partial">Partially Paid</option>
        <option value="paid">Fully Paid</option>
      </select>
      <select v-model="filterStatus" class="form-input filter-select">
        <option value="">All Reservations</option>
        <option value="active">Active Now</option>
        <option value="upcoming">Upcoming</option>
        <option value="past">Past</option>
      </select>
      <button v-if="hasFilter" class="btn btn-ghost btn-sm" @click="clearFilters">Clear</button>
    </div>

    <!-- Payment status summary bar -->
    <div class="status-summary">
      <button v-for="s in paymentSummary" :key="s.key"
        :class="['summary-chip', s.key, { active: filterPayment === s.key, 'no-filter': s.noFilter }]"
        @click="!s.noFilter && (filterPayment = filterPayment === s.key ? '' : s.key)">
        <span class="chip-count">{{ s.count }}</span>
        <span class="chip-label">{{ s.label }}</span>
      </button>
    </div>

    <!-- Empty -->
    <div v-if="filtered.length === 0" class="empty-card">
      <div style="font-size:2rem;margin-bottom:.5rem">📋</div>
      <p class="text-muted text-sm">No reservations found.</p>
    </div>

    <!-- Table -->
    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Guest</th>
              <th>Apartment</th>
              <th>Dates</th>
              <th>Nights</th>
              <th>Payment</th>
              <th class="text-right">Total</th>
              <th class="text-right">Paid</th>
              <th class="text-right">Owed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in paginated" :key="b.id"
              @click="openEdit(b)" style="cursor:pointer">
              <td>
                <span class="res-id">{{ b.reservationId || '—' }}</span>
              </td>
              <td>
                <div class="font-medium" style="color:var(--text)">{{ b.guestName }}</div>
                <div class="text-xs text-muted">{{ b.origin || b.phone || '' }}</div>
                <div v-if="b.tags?.length" class="row-tags">
                  <span v-for="t in b.tags.slice(0,2)" :key="t" class="mini-tag">{{ tagLabel(t) }}</span>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <span class="apt-dot" :style="{ background: aptColor(b.apartmentId) }"></span>
                  <span>{{ aptName(b.apartmentId) }}</span>
                </div>
              </td>
              <td>
                <div class="text-sm">{{ formatDate(b.checkIn) }}</div>
                <div class="text-xs text-muted">→ {{ formatDate(b.checkOut) }}</div>
              </td>
              <td class="text-center">{{ b.days }}</td>
              <td>
                <span :class="['badge', payBadge(b)]">{{ payLabel(b) }}</span>
              </td>
              <td class="text-right font-medium" style="color:var(--text)">€{{ (b.totalPrice||0).toLocaleString() }}</td>
              <td class="text-right text-green">€{{ (b.totalPaid||0).toLocaleString() }}</td>
              <td class="text-right" :style="{ color: owed(b) > 0 ? 'var(--red)' : 'var(--text-3)' }">
                €{{ owed(b).toLocaleString() }}
              </td>
              <td>
                <div class="row-actions" @click.stop>
                  <button class="btn btn-ghost btn-sm" @click.stop="openPayments(b)">💰</button>
                  <button class="btn btn-ghost btn-sm" @click.stop="openEdit(b)">Edit</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pageCount > 1" class="pagination">
        <button class="btn btn-ghost btn-sm" :disabled="page === 1" @click="page--">← Prev</button>
        <span class="text-sm text-muted">{{ page }} / {{ pageCount }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="page === pageCount" @click="page++">Next →</button>
      </div>
    </div>

    <!-- Booking modal -->
    <BookingModal v-if="showModal" :booking="selectedBooking"
      @close="showModal = false" @saved="showModal = false" />

    <!-- Payment panel -->
    <PaymentPanel v-if="showPayments && paymentBooking"
      :booking="paymentBooking" @close="showPayments = false" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { format, parseISO, isWithinInterval, startOfDay, isAfter, isBefore } from 'date-fns'
import { useBookingsStore } from '@/stores/bookings'
import { useApartmentsStore } from '@/stores/apartments'
import BookingModal from '@/components/BookingModal.vue'
import PaymentPanel from '@/components/PaymentPanel.vue'

const bookingsStore = useBookingsStore()
const apartmentsStore = useApartmentsStore()
const bookings = computed(() => bookingsStore.bookings)
const apartments = computed(() => apartmentsStore.apartments)

const search = ref('')
const filterApt = ref('')
const filterPayment = ref('')
const filterStatus = ref('')
const page = ref(1)
const PER_PAGE = 25
const showModal = ref(false)
const selectedBooking = ref(null)
const showPayments = ref(false)
const paymentBooking = ref(null)

watch([search, filterApt, filterPayment, filterStatus], () => { page.value = 1 })

const hasFilter = computed(() => search.value || filterApt.value || filterPayment.value || filterStatus.value)

const TAGS_MAP = {
  vip: '⭐ VIP', late_arrival: '🌙 Late', early_checkin: '🌅 Early',
  baby_bed: '👶 Baby', pet: '🐾 Pet', special_request: '📝 Special',
  repeat_guest: '🔄 Repeat', long_stay: '📅 Long'
}
function tagLabel(v) { return TAGS_MAP[v] || v }

const filtered = computed(() => {
  const today = startOfDay(new Date())
  // Always exclude cancelled bookings from the UI
  let list = bookings.value.filter(b => b.status !== 'cancelled')

  if (filterApt.value) list = list.filter(b => b.apartmentId === filterApt.value)
  if (filterPayment.value) list = list.filter(b => b.paymentStatus === filterPayment.value)
  if (filterStatus.value === 'active') {
    list = list.filter(b => isWithinInterval(today, {
      start: startOfDay(parseISO(b.checkIn)), end: startOfDay(parseISO(b.checkOut))
    }))
  } else if (filterStatus.value === 'upcoming') {
    list = list.filter(b => isAfter(parseISO(b.checkIn), today))
  } else if (filterStatus.value === 'past') {
    list = list.filter(b => isBefore(parseISO(b.checkOut), today))
  }

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(b =>
      b.guestName?.toLowerCase().includes(q) ||
      b.origin?.toLowerCase().includes(q) ||
      b.phone?.includes(q) ||
      b.reservationId?.toLowerCase().includes(q) ||
      aptName(b.apartmentId)?.toLowerCase().includes(q)
    )
  }
  return list.sort((a, b) => (b.checkIn || '') > (a.checkIn || '') ? 1 : -1)
})

const paymentSummary = computed(() => {
  const active = bookings.value.filter(b => b.status !== 'cancelled')
  const total = active.length
  return [
    { key: 'unpaid', label: 'Unpaid', count: active.filter(b => b.paymentStatus === 'unpaid').length },
    { key: 'deposit_paid', label: 'Deposit', count: active.filter(b => b.paymentStatus === 'deposit_paid').length },
    { key: 'partial', label: 'Partial', count: active.filter(b => b.paymentStatus === 'partial').length },
    { key: 'paid', label: 'Paid', count: active.filter(b => b.paymentStatus === 'paid').length },
    { key: '_total', label: 'Total', count: total, noFilter: true },
  ]
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PER_PAGE)))
const paginated = computed(() => filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))

function aptName(id) { return apartments.value.find(a => a.id === id)?.name || '—' }
function aptColor(id) { return apartments.value.find(a => a.id === id)?.color || '#3b82f6' }
function formatDate(d) { return d ? format(parseISO(d), 'dd MMM yy') : '—' }
function owed(b) { return Math.max(0, (b.totalPrice || 0) - (b.totalPaid || 0)) }

const PAY_LABELS = { unpaid: 'Unpaid', deposit_paid: 'Deposit', partial: 'Partial', paid: 'Paid', cancelled: 'Cancelled' }
const PAY_BADGES = { unpaid: 'badge-red', deposit_paid: 'badge-amber', partial: 'badge-blue', paid: 'badge-green', cancelled: 'badge-red' }
function payLabel(b) {
  if (b.status === 'cancelled') return 'Cancelled'
  return PAY_LABELS[b.paymentStatus] || b.paymentStatus
}
function payBadge(b) {
  if (b.status === 'cancelled') return 'badge-red'
  return PAY_BADGES[b.paymentStatus] || 'badge-amber'
}

function clearFilters() { search.value = ''; filterApt.value = ''; filterPayment.value = ''; filterStatus.value = '' }
function openAdd() { selectedBooking.value = null; showModal.value = true }
function openEdit(b) { selectedBooking.value = b; showModal.value = true }
function openPayments(b) { paymentBooking.value = b; showPayments.value = true }
</script>

<style scoped>
.page { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; gap: 1rem; }

.filters-bar { display: flex; gap: .75rem; margin-bottom: .75rem; flex-wrap: wrap; align-items: center; }
.search-input { flex: 1; min-width: 200px; }
.filter-select { width: 155px; }

.status-summary {
  display: flex;
  gap: .5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.summary-chip {
  display: flex;
  align-items: center;
  gap: .4rem;
  padding: .3rem .8rem;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: var(--bg-3);
  cursor: pointer;
  transition: all .15s;
}
.summary-chip:hover { border-color: var(--text-2); }
.summary-chip.no-filter { cursor: default; font-weight: 600; color: var(--text); border-color: var(--border-strong); }
.summary-chip.no-filter:hover { border-color: var(--border-strong); }
.summary-chip.active { font-weight: 600; }
.summary-chip.unpaid.active { background: var(--red-dim); border-color: var(--red); color: var(--red); }
.summary-chip.deposit_paid.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
.summary-chip.partial.active { background: var(--blue-dim); border-color: var(--blue); color: var(--blue); }
.summary-chip.paid.active { background: var(--green-dim); border-color: var(--green); color: var(--green); }
.chip-count { font-size: .9rem; font-weight: 700; }
.chip-label { font-size: .75rem; color: inherit; }

.empty-card {
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 2.5rem;
  text-align: center;
}

.table-card { padding: 0; overflow: hidden; }
.res-id { font-family: monospace; font-size: .72rem; color: var(--text-3); }
.apt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.row-tags { display: flex; gap: .25rem; margin-top: .2rem; }
.mini-tag { font-size: .6rem; background: var(--bg-3); padding: .1rem .4rem; border-radius: 99px; color: var(--text-3); }
.text-green { color: var(--green); }
.text-center { text-align: center; }

.row-actions { display: flex; gap: .3rem; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: .875rem; border-top: 1px solid var(--border); }

@media (max-width: 768px) {
  .page { padding: 1rem 1rem 6rem; }
  .filters-bar { flex-direction: column; }
  .filter-select, .search-input { width: 100%; }
  .table-wrap { font-size: .8rem; }
}
@media (max-width: 600px) {
  .page-header { flex-direction: column; align-items: stretch; }
  .page-header > .btn { width: 100%; justify-content: center; padding: .75rem; }
}
</style>
