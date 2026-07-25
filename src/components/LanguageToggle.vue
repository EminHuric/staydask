<!-- src/components/LanguageToggle.vue -->
<!-- Small SR | EN pill. Persists choice to localStorage via the i18n store. -->
<template>
  <div class="lang-toggle" role="group" aria-label="Language">
    <button
      :class="['lang-opt', { active: i18nState.locale === 'sr' }]"
      @click="setLocale('sr')"
      type="button"
    >SR</button>
    <button
      :class="['lang-opt', { active: i18nState.locale === 'en' }]"
      @click="setLocale('en')"
      type="button"
    >EN</button>
  </div>
</template>

<script setup>
import { i18nState, setLocale } from '@/i18n'
</script>

<style scoped>
.lang-toggle {
  display: inline-flex;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: 99px;
  padding: 2px;
  flex-shrink: 0;
}
.lang-opt {
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--text-3);
  padding: 0.2rem 0.55rem;
  border-radius: 99px;
  transition: color 0.15s, background 0.15s;
  line-height: 1.4;
}
.lang-opt:hover { color: var(--text-2); }
.lang-opt.active {
  background: var(--accent);
  color: #08090e;
}
</style>
