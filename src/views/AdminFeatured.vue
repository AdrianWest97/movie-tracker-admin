<script setup>
import { ref, computed, onMounted, useTemplateRef } from 'vue';
import api from '../api/client.js';
import Toast from '../components/Toast.vue';

const loading = ref(true);
const saving = ref(false);
const search = ref('');
const movies = ref([]);
const featured = ref([]); // ordered list of movie objects
const initialIds = ref([]);
const toastRef = useTemplateRef('toast');

const featuredIds = computed(() => new Set(featured.value.map(m => m.id)));

const filteredCatalogue = computed(() => {
  const q = search.value.trim().toLowerCase();
  return movies.value
    .filter(m => !m.isArchived)
    .filter(m => {
      if (featuredIds.value.has(m.id)) return false;
      if (!q) return true;
      return (m.title || '').toLowerCase().includes(q)
        || (m.director || '').toLowerCase().includes(q)
        || (m.cast || []).some(c => c.toLowerCase().includes(q));
    })
    .slice(0, 60);
});

const dirty = computed(() => {
  const cur = featured.value.map(m => m.id);
  if (cur.length !== initialIds.value.length) return true;
  return cur.some((id, i) => id !== initialIds.value[i]);
});

async function load() {
  loading.value = true;
  try {
    const [moviesRes, featuredRes] = await Promise.all([
      api.get('/admin/movies'),
      api.get('/admin/featured')
    ]);
    movies.value = moviesRes.data.movies;
    featured.value = featuredRes.data.films.map(f => f.movie);
    initialIds.value = featured.value.map(m => m.id);
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed to load');
  } finally {
    loading.value = false;
  }
}

function addToFeatured(movie) {
  if (featured.value.length >= 12) {
    toastRef.value?.show('Maximum of 12 featured films');
    return;
  }
  featured.value.push(movie);
}

function removeFromFeatured(movie) {
  featured.value = featured.value.filter(m => m.id !== movie.id);
}

function moveUp(idx) {
  if (idx <= 0) return;
  const arr = featured.value;
  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
}

function moveDown(idx) {
  if (idx >= featured.value.length - 1) return;
  const arr = featured.value;
  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
}

async function save() {
  saving.value = true;
  try {
    const movieIds = featured.value.map(m => m.id);
    const { data } = await api.put('/admin/featured', { movieIds });
    featured.value = data.films.map(f => f.movie);
    initialIds.value = featured.value.map(m => m.id);
    toastRef.value?.show('Featured rotation saved');
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed to save');
  } finally {
    saving.value = false;
  }
}

function reset() {
  const byId = new Map(movies.value.map(m => [m.id, m]));
  featured.value = initialIds.value.map(id => byId.get(id)).filter(Boolean);
}

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
      <div>
        <div class="eyebrow mb-2 text-amber-accent">— Curation</div>
        <h1 class="display text-4xl sm:text-5xl font-semibold leading-tight">Featured films</h1>
        <p class="text-bone-300 mt-2 text-sm">
          Pick the films that rotate through the cinematic hero on the public Discover page.
          When this list is empty, the hero falls back to the top-rated films.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="reset" :disabled="!dirty || saving" class="btn-ghost">Reset</button>
        <button @click="save" :disabled="!dirty || saving" class="btn-primary">
          {{ saving ? 'Saving…' : (dirty ? `Save rotation (${featured.length})` : 'Saved') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="card p-8 text-center text-bone-300">Loading…</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: catalogue search -->
      <div class="card p-5 lg:p-6">
        <div class="eyebrow mb-3">— Catalogue</div>
        <div class="relative mb-4">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input v-model="search" type="text" class="field !pl-10" placeholder="Search title, director, cast…" />
        </div>
        <div v-if="filteredCatalogue.length === 0" class="text-sm text-bone-300 py-8 text-center">
          No films match. {{ search ? 'Try a different search.' : 'All films are already featured.' }}
        </div>
        <ul v-else class="space-y-1 max-h-[60vh] overflow-y-auto -mr-2 pr-2">
          <li
            v-for="m in filteredCatalogue"
            :key="m.id"
            class="flex items-center gap-3 p-2 rounded-md hover:bg-ink-800/60 group"
          >
            <div class="w-9 h-12 rounded bg-ink-800 overflow-hidden shrink-0">
              <img v-if="m.posterUrl" :src="m.posterUrl" :alt="m.title" class="w-full h-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-bone-50 font-medium truncate text-sm">{{ m.title }}</div>
              <div class="text-[11px] text-bone-300 truncate">
                {{ m.year || '—' }}
                <span v-if="m.director" class="text-ink-500"> · </span>
                <span v-if="m.director">{{ m.director }}</span>
                <span v-if="m.imdbRating != null" class="text-amber-accent ml-2">IMDb {{ m.imdbRating }}</span>
              </div>
            </div>
            <button
              @click="addToFeatured(m)"
              class="btn-ghost btn-sm text-amber-accent opacity-0 group-hover:opacity-100 transition-opacity"
              :title="`Add ${m.title} to featured rotation`"
            >
              + Add
            </button>
          </li>
        </ul>
      </div>

      <!-- Right: featured rotation -->
      <div class="card p-5 lg:p-6">
        <div class="flex items-center justify-between mb-3">
          <div class="eyebrow">— Rotation ({{ featured.length }})</div>
          <span v-if="dirty" class="chip-accent !text-[10px] !py-0">Unsaved changes</span>
        </div>
        <p class="text-xs text-bone-300 mb-4">
          Use the arrows to reorder. The first film opens the hero on /discover.
        </p>

        <div v-if="featured.length === 0" class="border border-dashed border-ink-700 rounded-md p-10 text-center">
          <p class="display text-xl mb-1">No films selected.</p>
          <p class="text-sm text-bone-300">The hero will fall back to the top-rated films.</p>
        </div>

        <ul v-else class="space-y-2 max-h-[60vh] overflow-y-auto -mr-2 pr-2">
          <li
            v-for="(m, idx) in featured"
            :key="m.id"
            class="flex items-center gap-3 p-2.5 rounded-md border border-ink-800/80 bg-ink-900/40"
          >
            <span class="display text-2xl text-amber-accent w-6 tabular-nums text-right">{{ idx + 1 }}</span>
            <div class="w-9 h-12 rounded bg-ink-800 overflow-hidden shrink-0">
              <img v-if="m.posterUrl" :src="m.posterUrl" :alt="m.title" class="w-full h-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-bone-50 font-medium truncate text-sm">{{ m.title }}</div>
              <div class="text-[11px] text-bone-300 truncate">
                {{ m.year || '—' }}<span v-if="m.director" class="text-ink-500"> · </span>{{ m.director }}
              </div>
            </div>
            <div class="inline-flex items-center gap-0.5">
              <button
                @click="moveUp(idx)"
                :disabled="idx === 0"
                class="btn-ghost btn-sm !px-1.5"
                title="Move up"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button
                @click="moveDown(idx)"
                :disabled="idx === featured.length - 1"
                class="btn-ghost btn-sm !px-1.5"
                title="Move down"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <button
                @click="removeFromFeatured(m)"
                class="btn-ghost btn-sm text-ruby-400 !px-1.5"
                title="Remove"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <Toast ref="toast" />
  </div>
</template>
