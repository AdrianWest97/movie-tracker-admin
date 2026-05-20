<script setup>
import { ref, computed, onMounted, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.vue';
import Toast from '../components/Toast.vue';

const router = useRouter();

const PAGE_SIZE = 200;

const movies = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const search = ref('');
const filter = ref('active'); // 'all' | 'active' | 'archived'
const pagination = ref({ total: 0, limit: PAGE_SIZE, offset: 0, hasMore: false });
const toDelete = ref(null);
const toArchive = ref(null);
const toastRef = useTemplateRef('toast');

let searchTimer = null;

// Active/archived filter stays client-side: the server doesn't gate on it
// (the admin needs to see both). Counts derive from the loaded page —
// approximate for huge catalogues but admin tooling, not a public view.
const filtered = computed(() => {
  return movies.value.filter(m => {
    if (filter.value === 'active' && m.isArchived) return false;
    if (filter.value === 'archived' && !m.isArchived) return false;
    return true;
  });
});

const counts = computed(() => ({
  all: movies.value.length,
  active: movies.value.filter(m => !m.isArchived).length,
  archived: movies.value.filter(m => m.isArchived).length
}));

function buildParams(offset = 0) {
  const params = { limit: PAGE_SIZE, offset };
  if (search.value.trim()) params.q = search.value.trim();
  return params;
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/movies', { params: buildParams(0) });
    movies.value = data.movies;
    pagination.value = data.pagination || { total: data.movies.length, limit: PAGE_SIZE, offset: 0, hasMore: false };
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value || !pagination.value.hasMore) return;
  loadingMore.value = true;
  try {
    const nextOffset = pagination.value.offset + pagination.value.limit;
    const { data } = await api.get('/admin/movies', { params: buildParams(nextOffset) });
    movies.value = movies.value.concat(data.movies);
    pagination.value = data.pagination || { ...pagination.value, hasMore: false };
  } finally {
    loadingMore.value = false;
  }
}

// Debounce search → server. 240ms is the same beat used in the consumer
// app's search composable.
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => load(), 240);
}

function openCreate() { router.push({ name: 'movie-new' }); }
function openEdit(movie) { router.push({ name: 'movie-edit', params: { id: movie.id } }); }

async function confirmArchive() {
  const m = toArchive.value;
  toArchive.value = null;
  try {
    await api.post(`/admin/movies/${m.id}/archive`, { archive: !m.isArchived });
    toastRef.value?.show(m.isArchived ? `Restored “${m.title}”` : `Archived “${m.title}”`);
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

async function confirmDelete() {
  const m = toDelete.value;
  toDelete.value = null;
  try {
    await api.delete(`/admin/movies/${m.id}`);
    toastRef.value?.show(`Deleted “${m.title}”`);
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10">
    <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
      <div>
        <div class="eyebrow mb-3 text-amber-accent">— Catalogue</div>
        <h1 class="display text-4xl sm:text-5xl font-light leading-[1.05] tracking-tight">Films</h1>
        <p class="text-bone-300 mt-3 text-sm leading-relaxed">Add, edit, archive and delete films in the master catalogue.</p>
      </div>
      <button @click="openCreate" class="btn-primary">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        Add a film
      </button>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
      <div class="flex items-center gap-1 flex-wrap">
        <button
          v-for="opt in [
            { id: 'active',   label: 'Active',   count: counts.active },
            { id: 'archived', label: 'Archived', count: counts.archived },
            { id: 'all',      label: 'All',      count: counts.all }
          ]"
          :key="opt.id"
          @click="filter = opt.id"
          :class="['px-3 py-1.5 text-xs uppercase tracking-eyebrow rounded-full border transition-colors',
                   filter === opt.id
                    ? 'bg-bone-50 text-ink-950 border-bone-50'
                    : 'border-ink-700 text-bone-300 hover:text-bone-50']"
        >{{ opt.label }} <span class="mono ml-1.5 opacity-60">{{ opt.count }}</span></button>
      </div>
      <div class="relative max-w-sm w-full">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="search" @input="onSearchInput" type="text" class="field !pl-10" placeholder="Search title, director, cast…" />
      </div>
    </div>

    <!-- Table -->
    <div v-if="loading" class="card p-8 text-center text-bone-300">Loading films…</div>
    <div v-else-if="filtered.length === 0" class="card p-12 text-center">
      <p class="display text-2xl mb-2">No films match.</p>
      <p class="text-bone-300 text-sm">Try a different search or filter.</p>
    </div>
    <div v-else class="card overflow-x-auto">
      <table class="w-full text-sm min-w-[640px]">
        <thead class="bg-ink-800/70 text-bone-300 text-[10px] uppercase tracking-eyebrow">
          <tr>
            <th class="text-left px-4 py-3">Film</th>
            <th class="text-left px-4 py-3 hidden md:table-cell">Director</th>
            <th class="text-left px-4 py-3 hidden lg:table-cell">Genres</th>
            <th class="text-left px-4 py-3 hidden sm:table-cell">Year</th>
            <th class="text-left px-4 py-3 hidden md:table-cell">IMDb</th>
            <th class="text-left px-4 py-3 hidden md:table-cell">RT</th>
            <th class="text-left px-4 py-3">Status</th>
            <th class="text-right px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filtered" :key="m.id" class="border-t border-ink-800/60 hover:bg-ink-800/40">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-12 rounded bg-ink-800 overflow-hidden shrink-0">
                  <img v-if="m.posterUrl" :src="m.posterUrl" :alt="m.title" class="w-full h-full object-cover" />
                </div>
                <div class="min-w-0">
                  <div class="text-bone-50 font-medium truncate">{{ m.title }}</div>
                  <div class="text-[11px] text-bone-300 truncate">{{ (m.cast || []).slice(0,2).join(' · ') }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-bone-200 hidden md:table-cell">{{ m.director || '—' }}</td>
            <td class="px-4 py-3 hidden lg:table-cell">
              <div class="flex flex-wrap gap-1">
                <span v-for="g in (m.genres || []).slice(0, 3)" :key="g" class="chip">{{ g }}</span>
              </div>
            </td>
            <td class="px-4 py-3 mono text-bone-200 hidden sm:table-cell tabular-nums">{{ m.year || '—' }}</td>
            <td class="px-4 py-3 hidden md:table-cell">
              <span v-if="m.imdbRating != null" class="rating-imdb">{{ m.imdbRating }}</span>
              <span v-else class="text-bone-300">—</span>
            </td>
            <td class="px-4 py-3 hidden md:table-cell">
              <span v-if="m.rottenTomatoesRating != null" class="rating-rt">{{ m.rottenTomatoesRating }}%</span>
              <span v-else class="text-bone-300">—</span>
            </td>
            <td class="px-4 py-3">
              <span v-if="m.isArchived" class="chip border-ink-600 text-bone-300">Archived</span>
              <span v-else class="chip-accent">Active</span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="inline-flex items-center gap-1">
                <button @click="openEdit(m)" class="btn-ghost btn-sm" title="Edit">Edit</button>
                <button @click="toArchive = m" class="btn-ghost btn-sm" :title="m.isArchived ? 'Restore' : 'Archive'">
                  {{ m.isArchived ? 'Restore' : 'Archive' }}
                </button>
                <button @click="toDelete = m" class="btn-ghost btn-sm text-ruby-400" title="Delete">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pagination.hasMore" class="mt-6 flex justify-center">
      <button
        type="button"
        class="btn-secondary btn-sm"
        :disabled="loadingMore"
        @click="loadMore"
      >{{ loadingMore ? 'Loading…' : `Load more (${pagination.total - movies.length} left)` }}</button>
    </div>


    <ConfirmModal
      :open="!!toArchive"
      :title="toArchive?.isArchived ? `Restore “${toArchive.title}”?` : `Archive “${toArchive?.title}”?`"
      :body="toArchive?.isArchived ? 'It will reappear in the public catalogue and AI candidate pool.' : 'It will be hidden from the public catalogue and AI candidate pool. User collections that reference it are preserved.'"
      :confirm-label="toArchive?.isArchived ? 'Restore' : 'Archive'"
      @confirm="confirmArchive"
      @cancel="toArchive = null"
    />

    <ConfirmModal
      :open="!!toDelete"
      :title="`Delete “${toDelete?.title}”?`"
      body="This is permanent. Only films with no user references can be deleted; otherwise archive instead."
      confirm-label="Delete"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />

    <Toast ref="toast" />
  </div>
</template>
