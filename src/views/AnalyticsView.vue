<!-- src/views/AnalyticsView.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Analytics & Finance</h1>
        <p class="text-muted text-sm mt-2">Full financial overview</p>
      </div>
      <div class="year-picker">
        <button class="btn btn-ghost btn-sm" @click="year--">←</button>
        <span class="year-label">{{ year }}</span>
        <button class="btn btn-ghost btn-sm" @click="year++">→</button>
      </div>
    </div>

    <!-- Financial KPI row -->
    <div class="fin-kpi-grid mb-6">
      <div class="fin-kpi">
        <div class="fin-kpi-icon">📋</div>
        <div class="fin-kpi-body">
          <div class="fin-kpi-value">€{{ yearRevenue.toLocaleString() }}</div>
          <div class="fin-kpi-label">Expected Revenue</div>
        </div>
      </div>
      <div class="fin-kpi green">
        <div class="fin-kpi-icon">✅</div>
        <div class="fin-kpi-body">
          <div class="fin-kpi-value">€{{ yearCollected.toLocaleString() }}</div>
          <div class="fin-kpi-label">Total Collected</div>
        </div>
      </div>
      <div class="fin-kpi red">
        <div class="fin-kpi-icon">⏳</div>
        <div class="fin-kpi-body">
          <div class="fin-kpi-value">€{{ yearOutstanding.toLocaleString() }}</div>
          <div class="fin-kpi-label">Outstanding Balance</div>
        </div>
      </div>
      <div class="fin-kpi accent">
        <div class="fin-kpi-icon">🏨</div>
        <div class="fin-kpi-body">
          <div class="fin-kpi-value">{{ yearBookingCount }}</div>
          <div class="fin-kpi-label">Reservations {{ year }}</div>
        </div>
      </div>
      <div class="fin-kpi">
        <div class="fin-kpi-icon">🌙</div>
        <div class="fin-kpi-body">
          <div class="fin-kpi-value">{{ yearNights }}</div>
          <div class="fin-kpi-label">Nights Sold</div>
        </div>
      </div>
      <div class="fin-kpi">
        <div class="fin-kpi-icon">📈</div>
        <div class="fin-kpi-body">
          <div class="fin-kpi-value">€{{ avgPerNight }}</div>
          <div class="fin-kpi-label">Avg / Night</div>
        </div>
      </div>
    </div>

    <!-- Payment status breakdown -->
    <div class="pay-status-row mb-6">
      <div v-for="s in paymentBreakdown" :key="s.key" :class="['pay-status-card', s.key]">
        <div class="pay-status-count">{{ s.count }}</div>
        <div class="pay-status-label">{{ s.label }}</div>
        <div class="pay-status-amount">€{{ s.amount.toLocaleString() }}</div>
      </div>
    </div>

    <!-- Chart + Apt breakdown -->
    <div class="two-col mb-6">
      <!-- Monthly chart -->
      <div class="card">
        <div class="card-header">
          <h2>Monthly Revenue — {{ year }}</h2>
        </div>
        <div class="bar-chart">
          <div v-for="(m, i) in monthlyData" :key="i" class="bar-col">
            <div class="bar-wrap" :title="`${m.label}: €${m.revenue.toLocaleString()}`">
              <div class="bar-bg">
                <div class="bar-fill" :style="{ height: barH(m.revenue) }"
                  :class="{ current: i === currentMonth }"></div>
              </div>
            </div>
            <div class="bar-label" :class="{ current: i === currentMonth }">{{ m.short }}</div>
          </div>
        </div>
      </div>

      <!-- Per-apartment breakdown -->
      <div class="card">
        <div class="card-header"><h2>By Apartment</h2></div>
        <div v-if="apartments.length === 0" class="empty-state">No apartments.</div>
        <div v-else class="apt-list">
          <div v-for="apt in apartments" :key="apt.id" class="apt-row-item">
            <div class="apt-row-header">
              <div class="flex items-center gap-2">
                <span class="apt-dot" :style="{ background: apt.color || '#3b82f6' }"></span>
                <span class="text-sm font-medium">{{ apt.name }}</span>
              </div>
              <div class="text-right">
                <div class="text-sm font-bold text-accent">€{{ aptRevenue(apt.id).toLocaleString() }}</div>
                <div class="text-xs text-muted">of €{{ aptExpected(apt.id).toLocaleString() }}</div>
              </div>
            </div>
            <div class="dual-bar">
              <div class="dual-fill expected" :style="{ width: aptExpectedPct(apt.id) + '%' }"></div>
              <div class="dual-fill collected" :style="{ width: aptRevenuePct(apt.id) + '%', background: apt.color || '#3b82f6' }"></div>
            </div>
            <div class="apt-row-meta">
              <span>{{ aptBookingCount(apt.id) }} bookings · {{ aptNights(apt.id) }}n</span>
              <span>{{ aptOccupancy(apt.id) }}% occ.</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly table -->
    <div class="card mb-6">
      <div class="card-header"><h2>Month-by-Month</h2></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Bookings</th>
              <th>Nights</th>
              <th>Avg/Night</th>
              <th class="text-right">Expected</th>
              <th class="text-right">Collected</th>
              <th class="text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, i) in monthlyData" :key="i" :class="{ 'row-current': i === currentMonth }">
              <td><span :class="{ 'text-accent font-medium': i === currentMonth }">{{ m.label }}</span></td>
              <td>{{ m.count }}</td>
              <td>{{ m.nights }}</td>
              <td>{{ m.nights > 0 ? '€' + Math.round(m.revenue / m.nights) : '—' }}</td>
              <td class="text-right">{{ m.revenue > 0 ? '€' + m.revenue.toLocaleString() : '—' }}</td>
              <td class="text-right text-green">{{ m.collected > 0 ? '€' + m.collected.toLocaleString() : '—' }}</td>
              <td class="text-right" :style="{ color: m.outstanding > 0 ? 'var(--red)' : 'var(--text-3)' }">
                {{ m.outstanding > 0 ? '€' + m.outstanding.toLocaleString() : '—' }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td class="font-medium">Total {{ year }}</td>
              <td>{{ yearBookingCount }}</td>
              <td>{{ yearNights }}</td>
              <td>{{ yearNights > 0 ? '€' + avgPerNight : '—' }}</td>
              <td class="text-right font-bold">€{{ yearRevenue.toLocaleString() }}</td>
              <td class="text-right font-bold text-green">€{{ yearCollected.toLocaleString() }}</td>
              <td class="text-right font-bold" style="color:var(--red)">€{{ yearOutstanding.toLocaleString() }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getMonth, getYear, getDaysInYear, parseISO } from 'date-fns'
import { useBookingsStore } from '@/stores/bookings'
import { useApartmentsStore } from '@/stores/apartments'

const bookingsStore = useBookingsStore()
const apartmentsStore = useApartmentsStore()
const bookings = computed(() => bookingsStore.bookings)
const apartments = computed(() => apartmentsStore.apartments)
const year = ref(new Date().getFullYear())
const currentMonth = computed(() => new Date().getFullYear() === year.value ? new Date().getMonth() : -1)

const MONTHS = [
  { label: 'January', short: 'Jan' }, { label: 'February', short: 'Feb' },
  { label: 'March', short: 'Mar' }, { label: 'April', short: 'Apr' },
  { label: 'May', short: 'May' }, { label: 'June', short: 'Jun' },
  { label: 'July', short: 'Jul' }, { label: 'August', short: 'Aug' },
  { label: 'September', short: 'Sep' }, { label: 'October', short: 'Oct' },
  { label: 'November', short: 'Nov' }, { label: 'December', short: 'Dec' }
]

function yearBookings(y) {
  return bookings.value.filter(b => b.status !== 'cancelled' && getYear(parseISO(b.checkIn)) === y)
}

const monthlyData = computed(() =>
  MONTHS.map((m, i) => {
    const mb = bookings.value.filter(b => {
      if (b.status === 'cancelled') return false
      const d = parseISO(b.checkIn)
      return getYear(d) === year.value && getMonth(d) === i
    })
    const revenue = mb.reduce((s, b) => s + (b.totalPrice || 0), 0)
    const collected = mb.reduce((s, b) => s + (b.totalPaid || 0), 0)
    const nights = mb.reduce((s, b) => s + (b.days || 0), 0)
    return { ...m, count: mb.length, revenue, collected, outstanding: revenue - collected, nights }
  })
)

const yearRevenue = computed(() => monthlyData.value.reduce((s, m) => s + m.revenue, 0))
const yearCollected = computed(() => monthlyData.value.reduce((s, m) => s + m.collected, 0))
const yearOutstanding = computed(() => yearRevenue.value - yearCollected.value)
const yearBookingCount = computed(() => monthlyData.value.reduce((s, m) => s + m.count, 0))
const yearNights = computed(() => monthlyData.value.reduce((s, m) => s + m.nights, 0))
const avgPerNight = computed(() => yearNights.value > 0 ? Math.round(yearRevenue.value / yearNights.value) : 0)
const maxMonthRev = computed(() => Math.max(...monthlyData.value.map(m => m.revenue), 1))
function barH(r) { return Math.max((r / maxMonthRev.value) * 100, r > 0 ? 2 : 0) + '%' }

const paymentBreakdown = computed(() => {
  const yb = yearBookings(year.value)
  return [
    { key: 'unpaid', label: 'Unpaid', count: yb.filter(b => b.paymentStatus === 'unpaid').length, amount: yb.filter(b => b.paymentStatus === 'unpaid').reduce((s, b) => s + (b.totalPrice || 0), 0) },
    { key: 'deposit_paid', label: 'Deposit Paid', count: yb.filter(b => b.paymentStatus === 'deposit_paid').length, amount: yb.filter(b => b.paymentStatus === 'deposit_paid').reduce((s, b) => s + (b.totalPaid || 0), 0) },
    { key: 'partial', label: 'Partially Paid', count: yb.filter(b => b.paymentStatus === 'partial').length, amount: yb.filter(b => b.paymentStatus === 'partial').reduce((s, b) => s + (b.totalPaid || 0), 0) },
    { key: 'paid', label: 'Fully Paid', count: yb.filter(b => b.paymentStatus === 'paid').length, amount: yb.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + (b.totalPrice || 0), 0) },
  ]
})

function aptBookings(id) { return yearBookings(year.value).filter(b => b.apartmentId === id) }
function aptExpected(id) { return aptBookings(id).reduce((s, b) => s + (b.totalPrice || 0), 0) }
function aptRevenue(id) { return aptBookings(id).reduce((s, b) => s + (b.totalPaid || 0), 0) }
function aptBookingCount(id) { return aptBookings(id).length }
function aptNights(id) { return aptBookings(id).reduce((s, b) => s + (b.days || 0), 0) }
function aptOccupancy(id) { return Math.min(100, Math.round(aptNights(id) / getDaysInYear(new Date(year.value, 0)) * 100)) }
const maxAptExpected = computed(() => Math.max(...apartments.value.map(a => aptExpected(a.id)), 1))
function aptExpectedPct(id) { return (aptExpected(id) / maxAptExpected.value) * 100 }
function aptRevenuePct(id) { const e = aptExpected(id); return e ? (aptRevenue(id) / e) * aptExpectedPct(id) : 0 }
</script>

<style scoped>
.page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; }
.year-picker { display: flex; align-items: center; gap: .5rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: .25rem; }
.year-label { font-size: .9rem; font-weight: 700; padding: 0 .5rem; min-width: 54px; text-align: center; }

/* Financial KPIs */
.fin-kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: .75rem; }
.fin-kpi {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: .75rem;
}
.fin-kpi.green { border-color: var(--green); background: var(--green-dim); }
.fin-kpi.red { border-color: var(--red); background: var(--red-dim); }
.fin-kpi.accent { border-color: var(--accent); background: var(--accent-dim); }
.fin-kpi-icon { font-size: 1.3rem; flex-shrink: 0; }
.fin-kpi-value { font-size: 1rem; font-weight: 700; color: var(--text); line-height: 1; }
.fin-kpi-label { font-size: .62rem; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; margin-top: .25rem; }

/* Payment status breakdown */
.pay-status-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; }
.pay-status-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  text-align: center;
}
.pay-status-card.unpaid { border-color: var(--red); background: var(--red-dim); }
.pay-status-card.deposit_paid { border-color: var(--accent); background: var(--accent-dim); }
.pay-status-card.partial { border-color: var(--blue); background: var(--blue-dim); }
.pay-status-card.paid { border-color: var(--green); background: var(--green-dim); }
.pay-status-count { font-size: 1.6rem; font-weight: 700; color: var(--text); }
.pay-status-label { font-size: .7rem; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; margin: .2rem 0 .4rem; }
.pay-status-amount { font-size: .82rem; font-weight: 600; color: var(--text-2); }

/* Two col */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }

/* Bar chart */
.bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 140px; padding-top: .5rem; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
.bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.bar-bg { width: 100%; display: flex; align-items: flex-end; height: 100%; }
.bar-fill { width: 100%; background: var(--accent-dim); border: 1px solid var(--accent); border-radius: 4px 4px 0 0; transition: height .4s; }
.bar-fill.current { background: var(--accent); }
.bar-fill:hover { filter: brightness(1.2); }
.bar-label { font-size: .6rem; color: var(--text-3); }
.bar-label.current { color: var(--accent); font-weight: 700; }

/* Apt list */
.apt-list { display: flex; flex-direction: column; gap: 1rem; }
.apt-row-item { display: flex; flex-direction: column; gap: .35rem; }
.apt-row-header { display: flex; justify-content: space-between; align-items: flex-start; }
.apt-row-meta { display: flex; justify-content: space-between; font-size: .72rem; color: var(--text-3); }
.apt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

/* Dual progress bar */
.dual-bar { position: relative; height: 6px; background: var(--bg-3); border-radius: 99px; overflow: hidden; }
.dual-fill { position: absolute; top: 0; left: 0; height: 100%; border-radius: 99px; transition: width .5s; }
.dual-fill.expected { background: var(--border); }
.dual-fill.collected { background: var(--accent); }

/* Table */
.row-current td { background: var(--accent-dim) !important; }
.total-row td { border-top: 2px solid var(--border) !important; color: var(--text) !important; }
.text-green { color: var(--green); }
.text-right { text-align: right; }
.empty-state { padding: 1.5rem; text-align: center; color: var(--text-3); font-size: .85rem; }
.mb-6 { margin-bottom: 1.5rem; }

@media (max-width: 1100px) {
  .fin-kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .two-col { grid-template-columns: 1fr; }
  .pay-status-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .page { padding: 1rem 1rem 6rem; }
  .fin-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .page-header { flex-direction: column; align-items: stretch; }
  .year-picker { align-self: flex-start; }
}
</style>
