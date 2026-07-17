<!-- src/components/PaymentPanel.vue -->
<!-- Slide-in panel for managing payments on an existing booking -->
<template>
  <div class="panel-overlay" @click.self="$emit('close')">
    <div class="panel">
      <!-- Header -->
      <div class="panel-header">
        <div>
          <div class="panel-title">Payment Management</div>
          <div class="panel-sub">{{ booking.reservationId }}</div>
        </div>
        <button class="icon-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Booking summary -->
      <div class="booking-summary">
        <div class="summary-guest">
          <div class="guest-avatar-sm">{{ initials(booking.guestName) }}</div>
          <div>
            <div class="font-medium" style="color:var(--text)">{{ booking.guestName }}</div>
            <div class="text-xs text-muted">{{ aptName }} · {{ formatDate(booking.checkIn) }} → {{ formatDate(booking.checkOut) }} · {{ booking.days }}n</div>
          </div>
        </div>
        <span :class="['badge', statusBadge(booking.paymentStatus)]">{{ statusLabel(booking.paymentStatus) }}</span>
      </div>

      <!-- Financial summary cards -->
      <div class="fin-grid">
        <div class="fin-card">
          <div class="fin-value">€{{ (booking.totalPrice || 0).toLocaleString() }}</div>
          <div class="fin-label">Total</div>
        </div>
        <div class="fin-card">
          <div class="fin-value text-green">€{{ (booking.totalPaid || 0).toLocaleString() }}</div>
          <div class="fin-label">Collected</div>
        </div>
        <div class="fin-card" :class="{ accent: remaining > 0 }">
          <div class="fin-value" :style="remaining > 0 ? 'color:var(--red)' : 'color:var(--green)'">
            €{{ remaining.toLocaleString() }}
          </div>
          <div class="fin-label">Remaining</div>
        </div>
      </div>

      <!-- Deposit line -->
      <div class="deposit-line">
        <span class="text-sm text-muted">Deposit: €{{ (booking.depositAmount || 0).toLocaleString() }}</span>
        <span :class="['badge', booking.depositPaid ? 'badge-green' : 'badge-red']" style="font-size:.7rem">
          {{ booking.depositPaid ? 'Deposit Paid' : 'Deposit Pending' }}
        </span>
      </div>

      <!-- Progress bar -->
      <div class="progress-wrap">
        <div class="progress-bg">
          <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <span class="progress-label">{{ progressPct }}% paid</span>
      </div>

      <!-- Payment history -->
      <div class="section-title">Payment History</div>
      <div v-if="!payments.length" class="empty-payments">
        No payments recorded yet.
      </div>
      <div v-else class="payments-list">
        <div v-for="p in payments" :key="p.id" class="payment-row">
          <div class="payment-type-badge" :class="p.type === 'deposit' ? 'deposit' : 'payment'">
            {{ p.type === 'deposit' ? 'DEP' : 'PMT' }}
          </div>
          <div class="payment-info">
            <div class="payment-date">{{ formatDate(p.date) }}</div>
            <div v-if="p.note" class="payment-note">{{ p.note }}</div>
          </div>
          <div class="payment-amount">€{{ (p.amount || 0).toLocaleString() }}</div>
          <button class="remove-btn" @click="removePayment(p.id)" title="Remove payment">×</button>
        </div>
      </div>

      <!-- Add payment form -->
      <div class="section-title" style="margin-top:1rem">Add Payment</div>
      <div v-if="booking.status === 'cancelled'" class="text-sm text-muted" style="padding:.5rem 0">
        Cannot add payments to a cancelled reservation.
      </div>
      <form v-else @submit.prevent="submitPayment" class="add-payment-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Amount (€) *</label>
            <input v-model.number="pForm.amount" class="form-input" type="number"
              min="0.01" step="0.01" placeholder="0.00" required />
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Date *</label>
            <input v-model="pForm.date" class="form-input" type="date" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Type</label>
            <select v-model="pForm.type" class="form-input">
              <option value="payment">Payment</option>
              <option value="deposit">Deposit</option>
              <option value="refund">Refund</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Note</label>
            <input v-model="pForm.note" class="form-input" placeholder="e.g. Cash, Transfer…" />
          </div>
        </div>
        <div v-if="payErr" class="error-banner">{{ payErr }}</div>
        <button type="submit" class="btn btn-primary w-full" :disabled="addingPayment">
          {{ addingPayment ? 'Adding…' : '+ Add Payment' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format, parseISO } from 'date-fns'
import { useBookingsStore } from '@/stores/bookings'
import { useApartmentsStore } from '@/stores/apartments'

const props = defineProps({ booking: { type: Object, required: true } })
const emit = defineEmits(['close'])

const bookingsStore = useBookingsStore()
const apartmentsStore = useApartmentsStore()

const aptName = computed(() =>
  apartmentsStore.apartments.find(a => a.id === props.booking.apartmentId)?.name || '—'
)

const payments = computed(() => (props.booking.payments || [])
  .slice().sort((a, b) => a.date > b.date ? 1 : -1)
)

const remaining = computed(() =>
  Math.max(0, (props.booking.totalPrice || 0) - (props.booking.totalPaid || 0))
)

const progressPct = computed(() => {
  const total = props.booking.totalPrice || 0
  if (total === 0) return 0
  return Math.min(100, Math.round(((props.booking.totalPaid || 0) / total) * 100))
})

function initials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase()
}

function formatDate(d) {
  if (!d) return '—'
  return format(parseISO(d), 'dd MMM yyyy')
}

function statusLabel(s) {
  return { unpaid: 'Unpaid', deposit_paid: 'Deposit Paid', partial: 'Partially Paid', paid: 'Fully Paid', cancelled: 'Cancelled' }[s] || s
}

function statusBadge(s) {
  return { unpaid: 'badge-red', deposit_paid: 'badge-amber', partial: 'badge-blue', paid: 'badge-green', cancelled: 'badge-red' }[s] || 'badge-amber'
}

// Add payment form
const addingPayment = ref(false)
const payErr = ref('')
const pForm = ref({
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  type: 'payment',
  note: ''
})

async function submitPayment() {
  payErr.value = ''
  if (!pForm.value.amount || pForm.value.amount <= 0) {
    payErr.value = 'Amount must be greater than 0.'
    return
  }
  addingPayment.value = true
  try {
    await bookingsStore.addPayment(props.booking.id, {
      amount: pForm.value.amount,
      date: pForm.value.date,
      type: pForm.value.type,
      note: pForm.value.note
    })
    pForm.value.amount = ''
    pForm.value.note = ''
  } catch (e) {
    payErr.value = e.message
  }
  addingPayment.value = false
}

async function removePayment(paymentId) {
  await bookingsStore.removePayment(props.booking.id, paymentId)
}
</script>

<style scoped>
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
  z-index: 300;
  display: flex;
  justify-content: flex-end;
}

.panel {
  width: 100%;
  max-width: 440px;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 5;
}
.panel-title { font-size: 1rem; font-weight: 700; color: var(--text); }
.panel-sub { font-size: .72rem; color: var(--text-3); font-family: monospace; margin-top: 2px; }
.icon-btn { background: none; border: none; color: var(--text-2); cursor: pointer; font-size: 1rem; padding: .25rem; }

.booking-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--bg-3);
  gap: 1rem;
}
.summary-guest { display: flex; align-items: center; gap: .75rem; }
.guest-avatar-sm {
  width: 36px; height: 36px;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .8rem; font-weight: 700; flex-shrink: 0;
}

.fin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border-bottom: 1px solid var(--border);
}
.fin-card {
  padding: 1rem;
  text-align: center;
  border-right: 1px solid var(--border);
}
.fin-card:last-child { border-right: none; }
.fin-card.accent { background: var(--accent-dim); }
.fin-value { font-size: 1.1rem; font-weight: 700; color: var(--text); }
.fin-label { font-size: .65rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-3); margin-top: .2rem; }

.deposit-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .75rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.progress-wrap {
  padding: .75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: .75rem;
  border-bottom: 1px solid var(--border);
}
.progress-bg {
  flex: 1;
  height: 8px;
  background: var(--bg-3);
  border-radius: 99px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 99px;
  transition: width .4s ease;
}
.progress-label { font-size: .75rem; color: var(--text-2); white-space: nowrap; }

.section-title {
  padding: .875rem 1.5rem .4rem;
  font-size: .68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--text-3);
}

.empty-payments {
  padding: 1rem 1.5rem;
  font-size: .82rem;
  color: var(--text-3);
}

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.payment-row {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .7rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  transition: background .1s;
}
.payment-row:hover { background: var(--bg-3); }

.payment-type-badge {
  width: 36px; height: 20px;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: .6rem; font-weight: 700; flex-shrink: 0;
}
.payment-type-badge.deposit { background: var(--accent-dim); color: var(--accent); }
.payment-type-badge.payment { background: var(--green-dim); color: var(--green); }

.payment-info { flex: 1; min-width: 0; }
.payment-date { font-size: .78rem; color: var(--text-2); }
.payment-note { font-size: .7rem; color: var(--text-3); margin-top: .1rem; }
.payment-amount { font-size: .9rem; font-weight: 700; color: var(--text); }
.remove-btn {
  background: none; border: none; color: var(--text-3);
  cursor: pointer; font-size: 1.1rem; padding: .2rem .4rem;
  border-radius: 4px; line-height: 1;
  transition: background .15s, color .15s;
}
.remove-btn:hover { background: var(--red-dim); color: var(--red); }

.add-payment-form {
  padding: .5rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
}
.form-row { display: flex; gap: .75rem; }
.flex-1 { flex: 1; min-width: 0; }

.error-banner {
  padding: .5rem .75rem;
  background: var(--red-dim);
  color: var(--red);
  border-radius: var(--radius-sm);
  font-size: .8rem;
}

.text-green { color: var(--green); }

@media (max-width: 600px) {
  .panel { max-width: 100%; border-left: none; }
}
</style>
