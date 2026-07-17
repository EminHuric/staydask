<!-- src/components/BookingModal.vue -->
<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal booking-modal">

      <!-- Header -->
      <div class="modal-header">
        <div>
          <div class="modal-title-text">{{ booking ? 'Edit Reservation' : 'New Reservation' }}</div>
          <div v-if="booking?.reservationId" class="reservation-id">{{ booking.reservationId }}</div>
        </div>
        <button class="icon-btn" @click="$emit('close')">✕</button>
      </div>

      <form @submit.prevent="save">

        <!-- ── Guest ──────────────────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">Guest</div>
          <div class="form-group" style="position:relative">
            <label class="form-label">Full Name *</label>
            <input v-model="form.guestName" class="form-input" placeholder="Search existing or type new name…"
              required autocomplete="off" @input="searchGuests" @focus="showSugg = true" />
            <div v-if="showSugg && suggestions.length" class="suggestions-drop">
              <button v-for="g in suggestions" :key="g.id" type="button"
                class="suggestion-item" @click="selectGuest(g)">
                <span class="font-medium" style="color:var(--text);font-size:.85rem">{{ g.fullName }}</span>
                <span style="font-size:.72rem;color:var(--text-3)">{{ g.phone }} · {{ g.origin }}</span>
              </button>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Phone</label>
              <input v-model="form.phone" class="form-input" placeholder="+385 91 234 5678" />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Country / City</label>
              <input v-model="form.origin" class="form-input" placeholder="e.g. Zagreb, Croatia" />
            </div>
          </div>
        </div>

        <!-- ── Booking ────────────────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">Reservation</div>
          <div class="form-group">
            <label class="form-label">Apartment *</label>
            <select v-model="form.apartmentId" class="form-input" required @change="fillDefaultPrice">
              <option value="" disabled>Select apartment…</option>
              <option v-for="apt in apartments" :key="apt.id" :value="apt.id">{{ apt.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Check-in *</label>
              <input v-model="form.checkIn" class="form-input" type="date" required />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Check-out *</label>
              <input v-model="form.checkOut" class="form-input" type="date" required />
            </div>
          </div>
          <!-- Nights summary -->
          <div v-if="nights > 0" class="nights-chip">
            {{ nights }} night{{ nights !== 1 ? 's' : '' }}
          </div>
        </div>

        <!-- ── Pricing ────────────────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">Pricing</div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Price / Night (€)</label>
              <input v-model.number="form.pricePerNight" class="form-input" type="number" min="0" step="0.01" />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Deposit Amount (€)</label>
              <input v-model.number="form.depositAmount" class="form-input" type="number" min="0" step="0.01" />
            </div>
          </div>
          <!-- Price summary -->
          <div v-if="nights > 0" class="price-summary">
            <div class="price-row">
              <span>Total ({{ nights }}n × €{{ form.pricePerNight }})</span>
              <span class="font-bold" style="color:var(--text)">€{{ totalPrice.toFixed(2) }}</span>
            </div>
            <div class="price-row">
              <span>Deposit</span>
              <span>€{{ (form.depositAmount || 0).toFixed(2) }}</span>
            </div>
            <div class="price-row" style="color:var(--text-3)">
              <span>Remaining after deposit</span>
              <span>€{{ Math.max(0, totalPrice - (form.depositAmount || 0)).toFixed(2) }}</span>
            </div>
          </div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.depositPaid" style="accent-color:var(--accent)" />
            <span class="form-label" style="margin:0">Deposit received / paid</span>
          </label>
        </div>

        <!-- ── Notes & Tags ──────────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">Notes & Tags</div>
          <div class="form-group">
            <label class="form-label">Private Notes</label>
            <textarea v-model="form.notes" class="form-input" rows="2"
              placeholder="VIP guest, late arrival, baby bed needed…"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Tags</label>
            <div class="tags-grid">
              <label v-for="t in TAGS" :key="t.value" class="tag-option"
                :class="{ active: form.tags.includes(t.value) }"
                @click.prevent="toggleTag(t.value)">
                {{ t.label }}
              </label>
            </div>
          </div>
        </div>

        <!-- Conflict error -->
        <div v-if="conflictMsg" class="conflict-banner">
          <span class="conflict-icon">⚠️</span>
          <span>{{ conflictMsg }}</span>
        </div>

        <!-- General error -->
        <div v-else-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

        <!-- ── Footer ────────────────────────────────────────────── -->
        <div class="modal-footer-row">
          <div class="footer-left">
            <button v-if="booking && booking.status !== 'cancelled'"
              type="button" class="btn btn-danger btn-sm" @click="showCancelConfirm = true">
              Cancel Reservation
            </button>
            <span v-if="booking?.status === 'cancelled'" class="badge badge-red">Cancelled</span>
          </div>
          <div class="footer-right">
            <button type="button" class="btn btn-ghost" @click="$emit('close')">Close</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving…' : (booking ? 'Save Changes' : 'Create Reservation') }}
            </button>
          </div>
        </div>
      </form>

      <!-- Cancel confirm overlay -->
      <div v-if="showCancelConfirm" class="inner-overlay">
        <div class="inner-confirm">
          <h3>Cancel Reservation?</h3>
          <p class="text-sm text-muted" style="margin-top:.5rem">
            The reservation will be marked as <strong>Cancelled</strong> and the apartment will be
            freed. Payment history is preserved. This cannot be undone.
          </p>
          <div class="flex gap-3 mt-4 justify-end">
            <button class="btn btn-ghost btn-sm" @click="showCancelConfirm = false">Keep</button>
            <button class="btn btn-danger btn-sm" @click="doCancel" :disabled="saving">
              Yes, Cancel It
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { differenceInDays, parseISO } from 'date-fns'
import { useBookingsStore } from '@/stores/bookings'
import { useApartmentsStore } from '@/stores/apartments'
import { useGuestsStore } from '@/stores/guests'

const props = defineProps({
  booking: { type: Object, default: null },
  presetAptId: { type: String, default: null },
  presetDate: { type: String, default: null }
})
const emit = defineEmits(['close', 'saved'])

const bookingsStore = useBookingsStore()
const apartmentsStore = useApartmentsStore()
const guestsStore = useGuestsStore()

const apartments = computed(() => apartmentsStore.apartments)
const saving = ref(false)
const errorMsg = ref('')
const conflictMsg = ref('')
const showCancelConfirm = ref(false)
const showSugg = ref(false)
const suggestions = ref([])

const TAGS = [
  { value: 'vip', label: '⭐ VIP' },
  { value: 'late_arrival', label: '🌙 Late Arrival' },
  { value: 'early_checkin', label: '🌅 Early Check-in' },
  { value: 'baby_bed', label: '👶 Baby Bed' },
  { value: 'pet', label: '🐾 Pet' },
  { value: 'special_request', label: '📝 Special Request' },
  { value: 'repeat_guest', label: '🔄 Repeat Guest' },
  { value: 'long_stay', label: '📅 Long Stay' },
]

const form = ref({
  guestName: '', phone: '', origin: '',
  apartmentId: '', checkIn: '', checkOut: '',
  pricePerNight: 0, depositAmount: 0, depositPaid: false,
  notes: '', tags: []
})

onMounted(() => {
  if (props.booking) {
    const b = props.booking
    form.value = {
      guestName: b.guestName || '',
      phone: b.phone || '',
      origin: b.origin || '',
      apartmentId: b.apartmentId || '',
      checkIn: b.checkIn || '',
      checkOut: b.checkOut || '',
      pricePerNight: b.pricePerNight || 0,
      depositAmount: b.depositAmount || 0,
      depositPaid: b.depositPaid || false,
      notes: b.notes || '',
      tags: b.tags ? [...b.tags] : []
    }
  } else {
    if (props.presetAptId) form.value.apartmentId = props.presetAptId
    if (props.presetDate) {
      form.value.checkIn = props.presetDate
      const d = new Date(props.presetDate)
      d.setDate(d.getDate() + 1)
      form.value.checkOut = d.toISOString().slice(0, 10)
    }
    fillDefaultPrice()
  }
  document.addEventListener('click', hideSugg)
})
onBeforeUnmount(() => document.removeEventListener('click', hideSugg))

function hideSugg() { showSugg.value = false }

function searchGuests() {
  const q = form.value.guestName.toLowerCase().trim()
  if (q.length < 2) { suggestions.value = []; return }
  suggestions.value = guestsStore.guests
    .filter(g => g.fullName?.toLowerCase().includes(q))
    .slice(0, 6)
  showSugg.value = true
}

function selectGuest(g) {
  form.value.guestName = g.fullName
  form.value.phone = form.value.phone || g.phone || ''
  form.value.origin = form.value.origin || g.origin || ''
  suggestions.value = []
  showSugg.value = false
}

function fillDefaultPrice() {
  if (!form.value.apartmentId || props.booking) return
  const apt = apartments.value.find(a => a.id === form.value.apartmentId)
  if (apt) form.value.pricePerNight = apt.pricePerNight || 0
}

function toggleTag(val) {
  const idx = form.value.tags.indexOf(val)
  if (idx === -1) form.value.tags.push(val)
  else form.value.tags.splice(idx, 1)
}

const nights = computed(() => {
  if (!form.value.checkIn || !form.value.checkOut) return 0
  const n = differenceInDays(parseISO(form.value.checkOut), parseISO(form.value.checkIn))
  return n > 0 ? n : 0
})
const totalPrice = computed(() => nights.value * (form.value.pricePerNight || 0))

async function save() {
  errorMsg.value = ''
  conflictMsg.value = ''
  if (nights.value <= 0) { errorMsg.value = 'Check-out must be after check-in.'; return }
  saving.value = true
  try {
    // Upsert guest record
    if (form.value.guestName) {
      await guestsStore.findOrCreateGuest({
        fullName: form.value.guestName,
        phone: form.value.phone,
        origin: form.value.origin
      })
    }
    const data = {
      guestName: form.value.guestName,
      phone: form.value.phone,
      origin: form.value.origin,
      notes: form.value.notes,
      tags: form.value.tags,
      apartmentId: form.value.apartmentId,
      checkIn: form.value.checkIn,
      checkOut: form.value.checkOut,
      pricePerNight: form.value.pricePerNight,
      depositAmount: form.value.depositAmount,
      depositPaid: form.value.depositPaid
    }
    if (props.booking) {
      await bookingsStore.updateBooking(props.booking.id, data)
    } else {
      await bookingsStore.addBooking(data)
    }
    emit('saved')
    emit('close')
  } catch (e) {
    if (e.isConflict) conflictMsg.value = e.message
    else errorMsg.value = e.message || 'Failed to save.'
  }
  saving.value = false
}

async function doCancel() {
  saving.value = true
  await bookingsStore.cancelBooking(props.booking.id)
  saving.value = false
  emit('saved')
  emit('close')
}
</script>

<style scoped>
.booking-modal {
  max-width: 580px;
  max-height: 92vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 0;
  position: relative;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-title-text { font-size: 1rem; font-weight: 700; color: var(--text); }
.reservation-id { font-size: 0.72rem; color: var(--text-3); font-family: monospace; margin-top: 2px; }
.icon-btn { background: none; border: none; color: var(--text-2); cursor: pointer; font-size: 1rem; padding: 0.25rem; }

form { display: flex; flex-direction: column; gap: 0; overflow-y: auto; }

.form-section {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-3);
}

.form-row { display: flex; gap: 0.75rem; }
.flex-1 { flex: 1; min-width: 0; }

.nights-chip {
  display: inline-flex;
  align-items: center;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  width: fit-content;
}

.price-summary {
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.price-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--text-2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.tag-option {
  padding: 0.3rem 0.7rem;
  border-radius: 99px;
  font-size: 0.75rem;
  border: 1px solid var(--border);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.tag-option:hover { border-color: var(--accent); color: var(--accent); }
.tag-option.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); font-weight: 600; }

.conflict-banner {
  margin: 0.75rem 1.5rem;
  padding: 0.75rem 1rem;
  background: var(--red-dim);
  border: 1px solid rgba(239,68,68,.3);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  color: var(--red);
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}
.conflict-icon { flex-shrink: 0; }

.error-banner {
  margin: 0.75rem 1.5rem;
  padding: 0.6rem 0.9rem;
  background: var(--red-dim);
  color: var(--red);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
}

.modal-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  gap: 0.75rem;
  flex-shrink: 0;
}
.footer-left { display: flex; align-items: center; gap: 0.5rem; }
.footer-right { display: flex; gap: 0.75rem; }

/* Guest suggestions */
.suggestions-drop {
  position: absolute;
  top: 100%;
  left: 0; right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  z-index: 50;
  max-height: 180px;
  overflow-y: auto;
  margin-top: 2px;
}
.suggestion-item {
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.875rem;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.suggestion-item:hover { background: var(--bg-3); }

/* Inner confirm overlay */
.inner-overlay {
  position: absolute;
  inset: 0;
  background: rgba(13,15,20,.88);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 10;
}
.inner-confirm {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  width: 100%;
  max-width: 320px;
}

textarea.form-input { resize: vertical; }

@media (max-width: 600px) {
  .booking-modal { max-height: 100dvh; border-radius: 0; }
  .form-row { flex-direction: column; }
  .modal-footer-row { flex-direction: column; align-items: stretch; }
  .footer-right { flex-direction: row; justify-content: flex-end; }
}
</style>
