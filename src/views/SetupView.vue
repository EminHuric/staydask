<!-- src/views/SetupView.vue -->
<!-- First-run setup: creates the super admin account (only works when zero users exist) -->
<template>
  <div class="setup-bg">
    <div class="setup-card">
      <div class="setup-logo">
        <div class="logo-icon">🏠</div>
        <div>
          <div class="serif" style="font-size:1.6rem; color: var(--text)">RMS</div>
          <div class="text-xs text-muted">First-time Setup</div>
        </div>
      </div>

      <div v-if="done" class="done-state">
        <div style="font-size: 2.5rem; margin-bottom: 1rem">✅</div>
        <h2>Admin account created!</h2>
        <p class="text-muted text-sm mt-2">Redirecting you to the app…</p>
      </div>

      <template v-else>
        <p class="setup-intro">
          Welcome! Create your <strong>super admin</strong> account to get started.
          This page only appears once — when no accounts exist yet.
        </p>

        <form @submit.prevent="handleSetup" class="setup-form">
          <div class="form-group">
            <label class="form-label">Your Name</label>
            <input v-model="form.name" class="form-input" placeholder="e.g. Marco" required />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input v-model="form.email" class="form-input" type="email" placeholder="you@email.com" required />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input v-model="form.password" class="form-input" type="password"
              placeholder="min. 6 characters" minlength="6" required />
          </div>

          <div v-if="error" class="error-msg">{{ error }}</div>

          <button type="submit" class="btn btn-primary w-full" :disabled="loading">
            {{ loading ? 'Creating account…' : 'Create Admin Account →' }}
          </button>
        </form>

        <p class="setup-footer">
          Already have an account?
          <router-link to="/login" style="color: var(--accent)">Sign in</router-link>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const error = ref('')
const done = ref(false)

const form = ref({ name: '', email: '', password: '' })

async function handleSetup() {
  error.value = ''
  loading.value = true
  const res = await authStore.createFirstAdmin({
    name: form.value.name,
    email: form.value.email,
    password: form.value.password
  })
  loading.value = false
  if (res.success) {
    done.value = true
    setTimeout(() => router.push('/calendar'), 1500)
  } else {
    error.value = res.error
  }
}
</script>

<style scoped>
.setup-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  background-image: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,166,35,0.08) 0%, transparent 70%);
  padding: 1rem;
}

.setup-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  box-shadow: var(--shadow);
}

.setup-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.logo-icon {
  width: 48px; height: 48px;
  background: var(--accent-dim);
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem;
}

.setup-intro {
  font-size: 0.85rem;
  color: var(--text-2);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  padding: 0.875rem;
  background: var(--accent-dim);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(245,166,35,0.2);
}

.setup-form { display: flex; flex-direction: column; gap: 1rem; }

.error-msg {
  padding: 0.6rem 0.9rem;
  background: var(--red-dim);
  color: var(--red);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.setup-footer {
  margin-top: 1.25rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-3);
}

.done-state { text-align: center; padding: 1rem 0; }
</style>
