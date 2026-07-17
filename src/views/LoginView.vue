<!-- src/views/LoginView.vue -->
<template>
  <div class="login-bg">
    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <div class="logo-icon">🏠</div>
        <div>
          <div class="serif" style="font-size:1.6rem; color: var(--text)">StayDesk</div>
          <div class="text-xs text-muted">Apartment Management Platform</div>
        </div>
      </div>

      <!-- Tab switcher -->
      <div class="tab-bar">
        <button :class="['tab-btn', { active: mode === 'invite' }]" @click="mode = 'invite'">
          🎟 Invite Code
        </button>
        <button :class="['tab-btn', { active: mode === 'login' }]" @click="mode = 'login'">
          🔑 Login
        </button>
      </div>

      <!-- INVITE CODE FORM -->
      <form v-if="mode === 'invite'" @submit.prevent="handleInvite" class="login-form">
        <div class="form-group">
          <label class="form-label">Invite Code</label>
          <input v-model="inviteForm.code" class="form-input code-input"
            placeholder="XXXXXXXX" maxlength="8" autocomplete="off" required />
        </div>
        <div class="form-group">
          <label class="form-label">Choose Username</label>
          <input v-model="inviteForm.username" class="form-input"
            placeholder="yourname" required />
        </div>
        <div class="form-group">
          <label class="form-label">Create Password</label>
          <input v-model="inviteForm.password" type="password" class="form-input"
            placeholder="min. 6 characters" minlength="6" required />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button type="submit" class="btn btn-primary w-full" :disabled="inviteLoading">
          <span v-if="inviteLoading">Creating account…</span>
          <span v-else>Create My Workspace →</span>
        </button>
      </form>

      <!-- LOGIN FORM -->
      <form v-else @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input v-model="loginForm.username" class="form-input" type="email"
            placeholder="you@email.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input v-model="loginForm.password" type="password" class="form-input"
            placeholder="your password" required />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button type="submit" class="btn btn-primary w-full" :disabled="loginLoading">
          <span v-if="loginLoading">Signing in…</span>
          <span v-else>Sign In →</span>
        </button>
      </form>

      <p class="login-footer">
        Need access? Contact your administrator for an invite code.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const mode = ref('invite')
const error = ref('')
const inviteLoading = ref(false)
const loginLoading = ref(false)

const inviteForm = ref({ code: '', username: '', password: '' })
const loginForm = ref({ username: '', password: '' })

async function handleInvite() {
  error.value = ''
  inviteLoading.value = true
  const res = await authStore.loginWithInviteCode(
    inviteForm.value.code,
    inviteForm.value.username,
    inviteForm.value.password
  )
  inviteLoading.value = false
  if (res.success) router.push('/')
  else error.value = res.error
}

async function handleLogin() {
  error.value = ''
  loginLoading.value = true
  const res = await authStore.loginWithCredentials(loginForm.value.username, loginForm.value.password)
  loginLoading.value = false
  if (res.success) router.push('/')
  else error.value = res.error
}
</script>

<style scoped>
.login-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  background-image:
    radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,166,35,0.08) 0%, transparent 70%);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  box-shadow: var(--shadow);
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.logo-icon {
  width: 48px;
  height: 48px;
  background: var(--accent-dim);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

.tab-bar {
  display: flex;
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  padding: 4px;
  margin-bottom: 1.5rem;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-2);
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: var(--bg-card);
  color: var(--text);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
}

.login-form { display: flex; flex-direction: column; gap: 1rem; }

.code-input {
  font-size: 1.4rem;
  letter-spacing: 0.2em;
  text-align: center;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--accent);
}

.error-msg {
  padding: 0.6rem 0.9rem;
  background: var(--red-dim);
  color: var(--red);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.login-footer {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-3);
}
</style>