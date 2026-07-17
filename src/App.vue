<!-- src/App.vue -->
<template>
  <router-view />
</template>

<script setup>
import { watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { useApartmentsStore } from './stores/apartments'
import { useBookingsStore } from './stores/bookings'
import { useGuestsStore } from './stores/guests'

const authStore = useAuthStore()
const apartmentsStore = useApartmentsStore()
const bookingsStore = useBookingsStore()
const guestsStore = useGuestsStore()

watch(() => authStore.isAuthenticated, (auth) => {
  if (auth) {
    apartmentsStore.subscribe()
    bookingsStore.subscribe()
    guestsStore.subscribe()
  } else {
    apartmentsStore.unsubscribeAll()
    bookingsStore.unsubscribeAll()
    guestsStore.unsubscribeAll()
  }
}, { immediate: true })
</script>
