<!-- src/views/CalendarView.vue -->
<!-- Core feature: apartment × day resource calendar with booking bars -->
<template>
  <div class="cal-page">
    <!-- Nav bar -->
    <div class="cal-nav">
      <div class="cal-nav-left">
        <button class="btn btn-ghost btn-sm" @click="prevMonth">← Prev</button>
        <h2 class="cal-title">{{ monthLabel }}</h2>
        <button class="btn btn-ghost btn-sm" @click="nextMonth">Next →</button>
        <button class="btn btn-ghost btn-sm today-btn" @click="goToday">Today</button>
      </div>
      <div class="cal-nav-right">
        <select v-model="currentYear" class="form-input year-select" @change="applyYear">
          <option v-for="y in yearRange" :key="y" :value="y">{{ y }}</option>
        </select>
        <button class="btn btn-primary" @click="openAdd(null, null)">+ New Booking</button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="apartments.length === 0" class="cal-empty">
      <div style="font-size: 3rem; margin-bottom: 1rem">🏠</div>
      <h3>No apartments yet</h3>
      <p class="text-muted text-sm">
        <router-link to="/apartments" style="color: var(--accent)">Add your apartments</router-link>
        to start managing bookings on the calendar.
      </p>
    </div>

    <!-- Legend -->
    <div v-if="apartments.length > 0" class="cal-legend">
      <div v-for="apt in apartments" :key="apt.id" class="legend-item">
        <span class="legend-dot" :style="{ background: apt.color || '#3b82f6' }"></span>
        <span>{{ apt.name }}</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: var(--bg-3); border: 1px solid var(--border)"></span>
        <span style="color: var(--text-3)">Available</span>
      </div>
    </div>

    <!-- Calendar grid -->
    <div v-if="apartments.length > 0" class="cal-outer">
      <div class="cal-scroll">
        <!-- Header: day numbers -->
        <div class="cal-grid" :style="gridStyle">
          <!-- Corner cell -->
          <div class="cal-corner">Apartment</div>

          <!-- Day header cells -->
          <div
            v-for="day in daysInMonth"
            :key="day"
            class="cal-day-header"
            :class="{
              'is-today': isToday(day),
              'is-weekend': isWeekend(day)
            }"
          >
            <span class="day-num">{{ day }}</span>
            <span class="day-name">{{ getDayName(day) }}</span>
          </div>

          <!-- Apartment rows -->
          <template v-for="apt in apartments" :key="apt.id">
            <!-- Apartment label -->
            <div class="apt-label">
              <span class="apt-label-dot" :style="{ background: apt.color || '#3b82f6' }"></span>
              <span class="apt-label-name">{{ apt.name }}</span>
            </div>

            <!-- Day cells row (with booking bars overlaid) -->
            <div class="cells-row" :style="cellsRowStyle">
              <!-- Empty cells (clickable for adding) -->
              <div
                v-for="day in daysInMonth"
                :key="day"
                class="cal-cell"
                :class="{ 'is-today': isToday(day), 'is-weekend': isWeekend(day) }"
                @click="openAdd(apt, day)"
              ></div>

              <!-- Booking bars (absolutely positioned over cells) -->
              <div
                v-for="b in getBookingsForAptInMonth(apt.id)"
                :key="b.id"
                class="booking-bar"
                :style="barStyle(b, apt)"
                @click.stop="openEdit(b)"
                :title="`${b.guestName} · ${b.checkIn} → ${b.checkOut} · €${b.totalPrice}`"
              >
                <span class="bar-name">{{ b.guestName }}</span>
                <span class="bar-price">€{{ b.totalPrice?.toLocaleString() }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Booking modal -->
    <BookingModal
      v-if="showModal"
      :booking="selectedBooking"
      :preset-apt-id="presetAptId"
      :preset-date="presetDateStr"
      @close="showModal = false"
      @saved="showModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  startOfMonth, endOfMonth, getDaysInMonth, getDay, getDate,
  differenceInDays, parseISO, isAfter, isBefore, max, min,
  addMonths, subMonths, format, isToday as dateFnsIsToday, addDays
} from 'date-fns'
import { useApartmentsStore } from '@/stores/apartments'
import { useBookingsStore } from '@/stores/bookings'
import BookingModal from '@/components/BookingModal.vue'

const CELL_W = 38  // px — width of each day column, must match CSS

const apartmentsStore = useApartmentsStore()
const bookingsStore = useBookingsStore()

const apartments = computed(() => apartmentsStore.apartments)
const bookings = computed(() => bookingsStore.bookings)

const currentDate = ref(new Date())
const currentYear = ref(new Date().getFullYear())

const yearRange = computed(() => {
  const base = new Date().getFullYear()
  return Array.from({ length: 8 }, (_, i) => base - 2 + i)
})

const monthLabel = computed(() => format(currentDate.value, 'MMMM yyyy'))

const daysInMonth = computed(() => {
  const n = getDaysInMonth(currentDate.value)
  return Array.from({ length: n }, (_, i) => i + 1)
})

function prevMonth() {
  currentDate.value = subMonths(currentDate.value, 1)
  currentYear.value = currentDate.value.getFullYear()
}
function nextMonth() {
  currentDate.value = addMonths(currentDate.value, 1)
  currentYear.value = currentDate.value.getFullYear()
}
function goToday() {
  currentDate.value = new Date()
  currentYear.value = currentDate.value.getFullYear()
}
function applyYear() {
  const d = new Date(currentDate.value)
  d.setFullYear(currentYear.value)
  currentDate.value = d
}

// Grid CSS: 1 apt-label column + N day columns
const gridStyle = computed(() => ({
  gridTemplateColumns: `160px repeat(${daysInMonth.value.length}, ${CELL_W}px)`
}))

const cellsRowStyle = computed(() => ({
  gridColumn: `2 / span ${daysInMonth.value.length}`,
  gridTemplateColumns: `repeat(${daysInMonth.value.length}, ${CELL_W}px)`
}))

function isToday(day) {
  const d = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), day)
  return dateFnsIsToday(d)
}

function isWeekend(day) {
  const d = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), day)
  const dow = getDay(d)
  return dow === 0 || dow === 6
}

function getDayName(day) {
  const d = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), day)
  return ['Su','Mo','Tu','We','Th','Fr','Sa'][getDay(d)]
}

// Get bookings for apartment that overlap with the current month
function getBookingsForAptInMonth(aptId) {
  const mStart = startOfMonth(currentDate.value)
  const mEnd = addDays(endOfMonth(currentDate.value), 1) // exclusive

  return bookings.value.filter(b => {
    if (b.apartmentId !== aptId) return false
    if (b.status === 'cancelled') return false
    const ci = parseISO(b.checkIn)
    const co = parseISO(b.checkOut)
    return isBefore(ci, mEnd) && isAfter(co, mStart)
  })
}

// Calculate booking bar position & width using pixel math
function barStyle(b, apt) {
  const mStart = startOfMonth(currentDate.value)
  const mEnd = addDays(endOfMonth(currentDate.value), 1) // exclusive

  const ci = parseISO(b.checkIn)
  const co = parseISO(b.checkOut)

  const displayStart = max([ci, mStart])
  const displayEnd = min([co, mEnd])

  const startOffset = differenceInDays(displayStart, mStart) // 0-based day index
  const duration = differenceInDays(displayEnd, displayStart)

  const left = startOffset * CELL_W + 2
  const width = Math.max(duration * CELL_W - 4, CELL_W - 4)

  return {
    left: `${left}px`,
    width: `${width}px`,
    background: apt.color || '#3b82f6'
  }
}

// Modal state
const showModal = ref(false)
const selectedBooking = ref(null)
const presetAptId = ref(null)
const presetDateStr = ref(null)

function openAdd(apt, day) {
  selectedBooking.value = null
  presetAptId.value = apt?.id || null
  if (apt && day) {
    const d = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), day)
    presetDateStr.value = format(d, 'yyyy-MM-dd')
  } else {
    presetDateStr.value = null
  }
  showModal.value = true
}

function openEdit(booking) {
  selectedBooking.value = booking
  presetAptId.value = null
  presetDateStr.value = null
  showModal.value = true
}
</script>

<style scoped>
.cal-page {
  padding: 1.25rem 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
}

/* Nav */
.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.cal-nav-left { display: flex; align-items: center; gap: 0.5rem; }
.cal-nav-right { display: flex; align-items: center; gap: 0.75rem; }
.cal-title { font-size: 1.1rem; font-weight: 700; min-width: 140px; text-align: center; }
.today-btn { font-size: 0.75rem; }
.year-select { width: 100px; padding: 0.4rem 0.6rem; }

/* Legend */
.cal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
}
.legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-2); }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

/* Empty state */
.cal-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  text-align: center;
  padding: 3rem;
}

/* Calendar outer / scroll */
.cal-outer {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  min-height: 0;
}

.cal-scroll {
  overflow-x: auto;
  overflow-y: auto;
  height: 100%;
  max-height: calc(100vh - 220px);
}

/* Grid */
.cal-grid {
  display: grid;
  min-width: max-content;
}

/* Corner cell */
.cal-corner {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 20;
  background: var(--bg-2);
  border-right: 1px solid var(--border);
  border-bottom: 2px solid var(--border);
  padding: 0.5rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  display: flex;
  align-items: flex-end;
}

/* Day header cells */
.cal-day-header {
  position: sticky;
  top: 0;
  z-index: 15;
  background: var(--bg-2);
  border-right: 1px solid var(--border-subtle);
  border-bottom: 2px solid var(--border);
  padding: 0.4rem 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 38px;
}

.day-num {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}
.day-name {
  font-size: 0.6rem;
  color: var(--text-3);
  text-transform: uppercase;
}

.cal-day-header.is-today { background: var(--accent-dim); }
.cal-day-header.is-today .day-num { color: var(--accent); }
.cal-day-header.is-weekend { background: var(--bg-3); }

/* Apartment label column */
.apt-label {
  position: sticky;
  left: 0;
  z-index: 10;
  background: var(--bg-2);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
}

.apt-label-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.apt-label-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
}

/* Cells row (relative container for absolute booking bars) */
.cells-row {
  position: relative;
  display: grid;
  border-bottom: 1px solid var(--border-subtle);
  height: 48px;
}

/* Individual day cell */
.cal-cell {
  border-right: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 0.1s;
  height: 48px;
}
.cal-cell:hover { background: var(--bg-3); }
.cal-cell.is-today { background: rgba(245,166,35,0.04); }
.cal-cell.is-weekend { background: var(--bg-3); opacity: 0.7; }

/* Booking bars */
.booking-bar {
  position: absolute;
  top: 5px;
  height: calc(100% - 10px);
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem;
  gap: 0.25rem;
  overflow: hidden;
  transition: filter 0.15s, transform 0.1s;
  z-index: 5;
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
}
.booking-bar:hover {
  filter: brightness(1.15);
  transform: scaleY(1.05);
  z-index: 6;
}

.bar-name {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}
.bar-price {
  font-size: 0.65rem;
  color: rgba(255,255,255,0.75);
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .cal-page { padding: 0.75rem; gap: 0.75rem; }
  .cal-title { font-size: 0.95rem; min-width: 110px; }
  .cal-scroll { max-height: calc(100vh - 190px); }
}
</style>
