<!-- src/views/NotesView.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Notes</h1>
        <p class="text-muted text-sm mt-2">
          Your private notes. Only you and the platform administrator can see them.
        </p>
      </div>
    </div>

    <!-- Add note -->
    <div class="card add-card">
      <textarea
        v-model="draft"
        class="form-input note-input"
        rows="3"
        placeholder="Write a note, reminder or message for the admin…"
        @keydown.ctrl.enter="add"
      ></textarea>
      <div class="add-row">
        <span class="text-xs text-muted hint">Tip: Ctrl + Enter to save</span>
        <button class="btn btn-primary" :disabled="!draft.trim()" @click="add">Add note</button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="notesStore.notes.length === 0 && !notesStore.loading" class="empty-card">
      <div class="empty-icon">📝</div>
      <h3>No notes yet</h3>
      <p class="text-muted text-sm">Add a note above — anything you want to remember or share with the admin.</p>
    </div>

    <!-- Notes list -->
    <div class="notes-list">
      <div
        v-for="n in notesStore.notes"
        :key="n.id"
        class="note-item"
        :class="{ 'from-admin': n.authorRole === 'admin' && n.authorId !== authStore.user?.uid }"
      >
        <div class="note-head">
          <span class="note-author">
            <template v-if="n.authorId === authStore.user?.uid">You</template>
            <template v-else>{{ n.authorName }}</template>
            <span
              v-if="n.authorRole === 'admin' && n.authorId !== authStore.user?.uid"
              class="badge badge-amber"
            >Admin</span>
          </span>
          <span class="note-date">{{ formatDateTime(n.createdAt) }}</span>
        </div>
        <div class="note-text">{{ n.text }}</div>
        <button
          v-if="n.authorId === authStore.user?.uid || authStore.isAdmin"
          class="note-del"
          title="Delete note"
          @click="remove(n.id)"
        >🗑</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { format } from 'date-fns'
import { useNotesStore } from '@/stores/notes'
import { useAuthStore } from '@/stores/auth'

const notesStore = useNotesStore()
const authStore = useAuthStore()

const draft = ref('')

onMounted(() => notesStore.subscribe())
onUnmounted(() => notesStore.unsubscribeAll())

async function add() {
  const body = draft.value.trim()
  if (!body) return
  await notesStore.addNote(body)
  draft.value = ''
}

async function remove(id) {
  await notesStore.deleteNote(id)
}

function formatDateTime(ts) {
  if (!ts) return 'just now'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return format(d, 'dd MMM yyyy, HH:mm')
}
</script>

<style scoped>
.page { padding: 1.5rem; max-width: 760px; margin: 0 auto; }
.page-header { margin-bottom: 1.25rem; }

.add-card { margin-bottom: 1.25rem; }
.note-input { width: 100%; resize: vertical; min-height: 70px; }
.add-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 0.75rem; gap: 1rem;
}
.hint { white-space: nowrap; }

.empty-card {
  background: var(--bg-card);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  padding: 2.5rem 1.5rem;
  text-align: center;
}
.empty-icon { font-size: 2rem; margin-bottom: 0.5rem; }
.empty-card h3 { color: var(--text); margin-bottom: 0.35rem; }

.notes-list { display: flex; flex-direction: column; gap: 0.6rem; }
.note-item {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.85rem 2.2rem 0.85rem 1rem;
}
.note-item.from-admin {
  border-left: 3px solid var(--accent);
  background: var(--accent-dim);
}
.note-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
.note-author { font-size: 0.78rem; font-weight: 600; color: var(--text-2); display: flex; align-items: center; gap: 0.4rem; }
.note-date { font-size: 0.7rem; color: var(--text-3); white-space: nowrap; }
.note-text { font-size: 0.9rem; color: var(--text); line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
.note-del {
  position: absolute; top: 0.6rem; right: 0.6rem;
  background: none; border: none; cursor: pointer;
  font-size: 0.85rem; opacity: 0.5; padding: 0.15rem;
}
.note-del:hover { opacity: 1; }

@media (max-width: 768px) {
  .page { padding: 1rem 1rem 6rem; }
}
</style>
