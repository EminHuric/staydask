<!-- src/components/AccountSwitcher.vue -->
<!-- Instagram-style account switcher. Lists accounts signed in on THIS device
     (stored locally, per-browser, so each person only sees their own) and
     switches between them in one click. -->
<template>
  <div class="acct-switcher">
    <div class="acct-list">
      <!-- Current account (optional — the host may already show it) -->
      <div v-if="showCurrent && current" class="acct-item is-current">
        <span class="acct-av">{{ initial(current) }}</span>
        <div class="acct-meta">
          <div class="acct-name">{{ current.username || current.email }}</div>
          <div class="acct-role">{{ roleLabel(current.role) }}</div>
        </div>
        <span class="acct-check" aria-hidden="true">✓</span>
      </div>

      <!-- Other saved accounts -->
      <div v-for="a in others" :key="a.uid" class="acct-item">
        <button class="acct-pick" :disabled="busy" @click="switchTo(a)">
          <span class="acct-av alt">{{ initial(a) }}</span>
          <div class="acct-meta">
            <div class="acct-name">{{ a.username || a.email }}</div>
            <div class="acct-role">{{ roleLabel(a.role) }}</div>
          </div>
          <span class="acct-switch-ico" aria-hidden="true">⇄</span>
        </button>
        <button class="acct-remove" :title="t('Remove account from this device')" @click.stop="removeAccount(a)">✕</button>
      </div>
    </div>

    <button class="acct-add" :disabled="busy" @click="addAccount">{{ t('+ Add account') }}</button>

    <div v-if="busy" class="acct-status">{{ t('Switching…') }}</div>
    <div v-if="msg" class="acct-msg">{{ msg }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { accountsState, forgetAccount } from '@/savedAccounts'
import { t } from '@/i18n'

defineProps({ showCurrent: { type: Boolean, default: true } })
const emit = defineEmits(['switched', 'add'])

const authStore = useAuthStore()
const router = useRouter()

const busy = ref(false)
const msg = ref('')

const currentUid = computed(() => authStore.user?.uid)
const current = computed(() =>
  accountsState.list.find(a => a.uid === currentUid.value) || {
    uid: currentUid.value,
    username: authStore.userProfile?.username || authStore.userProfile?.email,
    email: authStore.userProfile?.email,
    role: authStore.userProfile?.role
  }
)
const others = computed(() => accountsState.list.filter(a => a.uid !== currentUid.value))

function initial(a) {
  return (a.username || a.email || '?')[0].toUpperCase()
}
function roleLabel(role) {
  return role === 'admin' ? t('Admin') : t('Owner')
}

async function switchTo(a) {
  if (busy.value) return
  busy.value = true
  msg.value = ''
  const res = await authStore.switchAccount(a.uid)
  if (res.success) {
    // Full reload so every store re-subscribes for the new workspace.
    window.location.assign('/')
  } else {
    busy.value = false
    if (res.removed) {
      msg.value = t('Password for {email} changed — account removed. Sign in again to add it.', { email: a.email })
    }
  }
}

function removeAccount(a) {
  forgetAccount(a.uid)
}

async function addAccount() {
  emit('add')
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.acct-switcher { display: flex; flex-direction: column; gap: 0.4rem; }
.acct-list { display: flex; flex-direction: column; gap: 0.3rem; }

.acct-item { display: flex; align-items: center; gap: 0.3rem; }

.acct-pick,
.acct-item.is-current {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--bg-3);
  border: 1px solid var(--border);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.acct-pick:hover:not(:disabled) { border-color: var(--accent); background: var(--bg-card); }
.acct-pick:disabled { opacity: 0.6; cursor: default; }
.acct-item.is-current { cursor: default; border-color: var(--border-strong); }

.acct-av {
  width: 28px; height: 28px; flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent-dim);
  color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
}
.acct-av.alt { background: var(--blue-dim); color: var(--blue); }

.acct-meta { flex: 1; min-width: 0; }
.acct-name { font-size: 0.8rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acct-role { font-size: 0.62rem; color: var(--text-3); margin-top: 1px; }

.acct-check { color: var(--green); font-size: 0.85rem; flex-shrink: 0; }
.acct-switch-ico { color: var(--text-3); font-size: 0.9rem; flex-shrink: 0; }

.acct-remove {
  flex-shrink: 0;
  width: 24px; height: 24px;
  border: none; background: none;
  color: var(--text-3);
  cursor: pointer;
  border-radius: var(--radius-xs);
  font-size: 0.7rem;
  line-height: 1;
}
.acct-remove:hover { background: var(--red-dim); color: var(--red); }

.acct-add {
  width: 100%;
  padding: 0.45rem;
  border: 1px dashed var(--border-strong);
  background: none;
  color: var(--text-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: inherit;
  transition: border-color 0.15s, color 0.15s;
}
.acct-add:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.acct-add:disabled { opacity: 0.5; cursor: default; }

.acct-status { font-size: 0.72rem; color: var(--text-3); text-align: center; padding: 0.15rem; }
.acct-msg {
  font-size: 0.72rem;
  color: var(--red);
  background: var(--red-dim);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.55rem;
  line-height: 1.4;
}
</style>
