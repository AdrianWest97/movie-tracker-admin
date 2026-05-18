<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, useTemplateRef, watch, nextTick } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import api from '../api/client.js';
import Toast from '../components/Toast.vue';

const route = useRoute();
const router = useRouter();
const toastRef = useTemplateRef('toast');

const isNew = computed(() => route.name === 'movie-new');
const movieId = computed(() => (isNew.value ? null : Number(route.params.id)));

const loading = ref(!isNew.value);
const submitting = ref(false);
const error = ref('');
const loadError = ref('');
const lookupNote = ref('');

const form = reactive({
  title: '',
  year: '',
  director: '',
  posterUrl: '',
  trailerUrl: '',
  omdbId: '',
  imdbRating: '',
  rottenTomatoesRating: '',
  cast: '',
  genres: '',
  overview: ''
});

// ─── OMDB title search (replaces the old IMDb-id field) ─────────────────────

const searchQuery = ref('');
const searchResults = ref([]);
const searchOpen = ref(false);
const searching = ref(false);
const searchError = ref('');
const searchEl = useTemplateRef('searchEl');
let searchTimer = null;

function parseList(s) {
  return s.split(',').map(p => p.trim()).filter(Boolean);
}

watch(searchQuery, (q) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchError.value = '';
  if (q.trim().length < 2) {
    searchResults.value = [];
    searchOpen.value = false;
    return;
  }
  searchTimer = setTimeout(doSearch, 280);
});

async function doSearch() {
  searching.value = true;
  try {
    const { data } = await api.get('/admin/omdb/search', { params: { q: searchQuery.value.trim() } });
    searchResults.value = data.results || [];
    searchOpen.value = true;
  } catch (e) {
    searchError.value = e.response?.data?.error || 'OMDB search failed.';
    searchResults.value = [];
  } finally {
    searching.value = false;
  }
}

async function pickResult(r) {
  searchOpen.value = false;
  try {
    const { data } = await api.get('/admin/omdb/lookup', { params: { imdbId: r.imdbId } });
    const d = data.data;
    form.title = d.title || form.title;
    if (d.year)               form.year = d.year;
    if (d.director)           form.director = d.director;
    if (d.posterUrl)          form.posterUrl = d.posterUrl;
    if (d.imdbRating != null) form.imdbRating = d.imdbRating;
    if (d.rottenTomatoesRating != null) form.rottenTomatoesRating = d.rottenTomatoesRating;
    if (d.cast?.length)       form.cast = d.cast.join(', ');
    if (d.genres?.length)     form.genres = d.genres.join(', ');
    if (d.overview)           form.overview = d.overview;
    form.omdbId = d.imdbId;
    searchQuery.value = d.title;
    lookupNote.value = `Loaded from OMDB · IMDb ${d.imdbRating ?? '—'} · RT ${d.rottenTomatoesRating != null ? d.rottenTomatoesRating + '%' : '—'}. Review and click Save.`;
  } catch (e) {
    searchError.value = e.response?.data?.error || 'OMDB lookup failed.';
  }
}

function handleSearchBlur() {
  // Delay so a click on a result button registers before we close.
  setTimeout(() => { searchOpen.value = false; }, 150);
}

// ─── Load / save ────────────────────────────────────────────────────────────

async function load() {
  if (isNew.value) {
    loading.value = false;
    await nextTick();
    searchEl.value?.focus();
    return;
  }
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/admin/movies');
    const m = data.movies.find(x => x.id === movieId.value);
    if (!m) {
      loadError.value = 'Film not found.';
      return;
    }
    form.title = m.title || '';
    form.year = m.year ?? '';
    form.director = m.director || '';
    form.posterUrl = m.posterUrl || '';
    form.trailerUrl = m.trailerUrl || '';
    form.omdbId = m.omdbId || '';
    form.imdbRating = m.imdbRating ?? '';
    form.rottenTomatoesRating = m.rottenTomatoesRating ?? '';
    form.cast = (m.cast || []).join(', ');
    form.genres = (m.genres || []).join(', ');
    form.overview = m.overview || '';
  } catch (e) {
    loadError.value = e.response?.data?.error || 'Failed to load film.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer); });
watch(() => route.params.id, load);

async function submit() {
  error.value = '';
  submitting.value = true;
  try {
    const body = {
      title: form.title.trim(),
      year: form.year === '' ? null : Number(form.year),
      director: form.director.trim() || null,
      posterUrl: form.posterUrl.trim() || null,
      trailerUrl: form.trailerUrl.trim() || null,
      omdbId: form.omdbId.trim() || null,
      imdbRating: form.imdbRating === '' ? null : Number(form.imdbRating),
      rottenTomatoesRating: form.rottenTomatoesRating === '' ? null : Number(form.rottenTomatoesRating),
      cast: parseList(form.cast),
      genres: parseList(form.genres),
      overview: form.overview.trim() || null
    };
    let saved;
    if (isNew.value) {
      const { data } = await api.post('/admin/movies', body);
      saved = data.movie;
    } else {
      const { data } = await api.patch(`/admin/movies/${movieId.value}`, body);
      saved = data.movie;
    }
    toastRef.value?.show(isNew.value ? `Added “${saved.title}”` : `Updated “${saved.title}”`);
    setTimeout(() => router.push({ name: 'movies' }), 350);
  } catch (e) {
    const issues = e.response?.data?.issues;
    error.value = issues
      ? issues.map(i => `${i.path}: ${i.message}`).join(' · ')
      : (e.response?.data?.error || 'Failed to save.');
  } finally {
    submitting.value = false;
  }
}

const previewCast = computed(() => parseList(form.cast).slice(0, 3));
const previewGenres = computed(() => parseList(form.genres).slice(0, 3));
</script>

<template>
  <div class="p-6 lg:p-10 max-w-7xl">
    <!-- Header -->
    <div class="flex flex-col gap-3 mb-8">
      <RouterLink :to="{ name: 'movies' }" class="btn-ghost btn-sm self-start -ml-2">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Catalogue
      </RouterLink>
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div class="eyebrow mb-2 text-amber-accent">{{ isNew ? '— New film' : '— Edit film' }}</div>
          <h1 class="display text-4xl sm:text-5xl font-semibold leading-tight">
            {{ isNew ? 'Add a film' : (form.title || 'Edit film') }}
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink :to="{ name: 'movies' }" class="btn-ghost">Cancel</RouterLink>
          <button
            type="button"
            @click="submit"
            :disabled="submitting || loading"
            class="btn-primary"
          >
            {{ submitting ? 'Saving…' : (isNew ? 'Add film' : 'Save changes') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="card p-12 text-center text-bone-300">Loading film…</div>
    <div v-else-if="loadError" class="card p-12 text-center text-ruby-400">{{ loadError }}</div>

    <!-- Two-column layout: form left, live preview right -->
    <form v-else @submit.prevent="submit" class="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-8">
      <!-- Form column -->
      <div class="space-y-10">
        <!-- OMDB title search -->
        <section>
          <div class="eyebrow mb-3">— Find on OMDB</div>
          <p class="text-xs text-bone-300 mb-3 max-w-xl leading-relaxed">
            {{ isNew
              ? 'Search a title to auto-fill ratings, poster, plot, cast and genres. Skip and enter manually if the film isn\'t on OMDB.'
              : 'Search a different title to relink this film to another OMDB record, or skip to keep the current data and edit fields manually.' }}
          </p>

          <div class="relative max-w-2xl">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input
              ref="searchEl"
              v-model="searchQuery"
              type="text"
              class="field !pl-10"
              placeholder="Title — e.g. Past Lives, Anatomy of a Fall"
              autocomplete="off"
              @focus="searchOpen = searchResults.length > 0"
              @blur="handleSearchBlur"
            />
            <span
              v-if="searching"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-bone-300"
            >
              Searching…
            </span>

            <!-- Results dropdown -->
            <ul
              v-if="searchOpen && searchResults.length"
              class="absolute z-20 left-0 right-0 mt-2 card overflow-hidden max-h-80 overflow-y-auto shadow-lift"
            >
              <li v-for="r in searchResults" :key="r.imdbId" class="border-b border-ink-800/60 last:border-b-0">
                <button
                  type="button"
                  @mousedown.prevent="pickResult(r)"
                  class="w-full flex items-center gap-3 p-2.5 text-left hover:bg-ink-800/60 transition-colors"
                >
                  <div class="w-9 h-12 rounded bg-ink-800 overflow-hidden shrink-0">
                    <img v-if="r.posterUrl" :src="r.posterUrl" :alt="r.title" class="w-full h-full object-cover" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-bone-50 text-sm font-medium truncate">{{ r.title }}</div>
                    <div class="text-[11px] text-bone-300 truncate">
                      <span class="mono">{{ r.year || '—' }}</span>
                      <span class="text-ink-500"> · </span>
                      <span class="mono">{{ r.imdbId }}</span>
                    </div>
                  </div>
                  <span v-if="r.alreadyInCatalogue" class="chip-accent !text-[10px] !py-0 shrink-0">In catalogue</span>
                </button>
              </li>
            </ul>
          </div>

          <p v-if="lookupNote" class="text-[11px] text-amber-accent mt-2.5">{{ lookupNote }}</p>
          <p v-else-if="form.omdbId" class="text-[11px] text-bone-300 mt-2.5">
            Linked to OMDB · <span class="mono text-bone-200">{{ form.omdbId }}</span>
          </p>
          <p v-if="searchError" class="text-[11px] text-ruby-400 mt-2.5">{{ searchError }}</p>
        </section>

        <!-- Identity -->
        <section>
          <div class="eyebrow mb-4">— Identity</div>
          <div class="space-y-4 max-w-2xl">
            <div>
              <label class="label">Title</label>
              <input v-model="form.title" class="field" required maxlength="200" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Year</label>
                <input v-model="form.year" type="number" class="field" min="1880" max="2100" />
              </div>
              <div>
                <label class="label">Director</label>
                <input v-model="form.director" class="field" maxlength="120" />
              </div>
            </div>
          </div>
        </section>

        <!-- Credits -->
        <section>
          <div class="eyebrow mb-4">— Credits</div>
          <div class="space-y-4 max-w-2xl">
            <div>
              <label class="label">Cast (comma-separated)</label>
              <input v-model="form.cast" class="field" placeholder="e.g. Tim Robbins, Morgan Freeman" />
            </div>
            <div>
              <label class="label">Genres (comma-separated)</label>
              <input v-model="form.genres" class="field" placeholder="e.g. Drama, Crime" />
            </div>
          </div>
        </section>

        <!-- Ratings -->
        <section>
          <div class="eyebrow mb-4">— Ratings</div>
          <div class="grid grid-cols-2 gap-3 max-w-2xl">
            <div>
              <label class="label">IMDb (0–10)</label>
              <input v-model="form.imdbRating" type="number" step="0.1" min="0" max="10" class="field" />
            </div>
            <div>
              <label class="label">Rotten Tomatoes (0–100)</label>
              <input v-model="form.rottenTomatoesRating" type="number" min="0" max="100" class="field" />
            </div>
          </div>
        </section>

        <!-- Media -->
        <section>
          <div class="eyebrow mb-4">— Media</div>
          <div class="space-y-4 max-w-2xl">
            <div>
              <label class="label">Poster URL</label>
              <input v-model="form.posterUrl" type="url" class="field" placeholder="https://image.tmdb.org/..." />
            </div>
            <div>
              <label class="label">YouTube trailer URL</label>
              <input v-model="form.trailerUrl" type="url" class="field" placeholder="https://www.youtube.com/watch?v=..." />
              <p class="text-[11px] text-bone-300 mt-1.5">Powers the muted-autoplay hero trailer + the full-screen play button on the public film page.</p>
            </div>
          </div>
        </section>

        <!-- Synopsis -->
        <section>
          <div class="eyebrow mb-4">— Synopsis</div>
          <div class="max-w-2xl">
            <textarea
              v-model="form.overview"
              rows="5"
              maxlength="4000"
              class="field font-sans resize-y leading-relaxed"
              placeholder="A short, opinionated summary that fits in the hero overview."
            />
            <p class="text-[11px] text-bone-300 mt-1.5">Max 4000 characters. The hero clamps to ~3 lines, so lead with the strongest sentence.</p>
          </div>
        </section>

        <!-- Errors + footer actions -->
        <div v-if="error" class="text-sm text-ruby-400 bg-ruby-700/10 border border-ruby-700/30 rounded-md px-3 py-2 max-w-2xl">
          {{ error }}
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-ink-800/80 max-w-2xl">
          <RouterLink :to="{ name: 'movies' }" class="btn-ghost">Cancel</RouterLink>
          <button type="submit" :disabled="submitting" class="btn-primary">
            {{ submitting ? 'Saving…' : (isNew ? 'Add film' : 'Save changes') }}
          </button>
        </div>
      </div>

      <!-- Live preview column -->
      <aside class="lg:sticky lg:top-20 lg:self-start space-y-4">
        <div class="eyebrow">— Live preview</div>
        <div class="card overflow-hidden">
          <div class="aspect-[2/3] bg-ink-800 relative">
            <img
              v-if="form.posterUrl"
              :src="form.posterUrl"
              :alt="form.title"
              class="absolute inset-0 w-full h-full object-cover"
              @error="$event.target.style.display = 'none'"
            />
            <div v-else class="absolute inset-0 flex items-center justify-center text-ink-500 text-xs uppercase tracking-eyebrow">
              No poster
            </div>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <h3 class="display text-xl font-medium leading-tight line-clamp-2">{{ form.title || 'Untitled film' }}</h3>
              <div class="text-xs text-bone-300 mt-1">
                <span class="mono">{{ form.year || '—' }}</span>
                <span v-if="form.director" class="text-ink-500"> · </span>
                <span v-if="form.director">{{ form.director }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span v-if="form.imdbRating !== '' && form.imdbRating != null" class="rating-imdb">
                <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="currentColor"><path d="M12 2l2.39 6.95H22l-6.2 4.5L18.18 22 12 17.27 5.82 22l2.38-8.55L2 8.95h7.61z"/></svg>
                {{ form.imdbRating }}
              </span>
              <span v-if="form.rottenTomatoesRating !== '' && form.rottenTomatoesRating != null" class="rating-rt">
                <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>
                {{ form.rottenTomatoesRating }}%
              </span>
            </div>
            <div v-if="previewGenres.length" class="flex flex-wrap gap-1.5">
              <span v-for="g in previewGenres" :key="g" class="chip !text-[10px]">{{ g }}</span>
            </div>
            <p v-if="form.overview" class="text-xs text-bone-200 leading-relaxed line-clamp-4">
              {{ form.overview }}
            </p>
            <div v-if="previewCast.length" class="text-[11px] text-bone-300 leading-relaxed line-clamp-2">
              {{ previewCast.join(' · ') }}
            </div>
          </div>
        </div>
        <p class="text-[11px] text-bone-300 px-1">
          Reflects the current form values. Click <span class="text-bone-100">{{ isNew ? 'Add film' : 'Save changes' }}</span> to persist.
        </p>
      </aside>
    </form>

    <Toast ref="toast" />
  </div>
</template>
