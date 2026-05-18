<script setup>
import { ref, computed, onMounted, useTemplateRef } from 'vue';
import api from '../api/client.js';
import Toast from '../components/Toast.vue';

const PUBLIC_APP_URL = 'http://localhost:5173';

const reviews = ref([]);          // always holds all reviews
const loading = ref(true);
const filter = ref('visible');    // visible | hidden | all
const reasonDraft = ref({});
const toastRef = useTemplateRef('toast');

const counts = computed(() => ({
  all: reviews.value.length,
  visible: reviews.value.filter(r => !r.isHidden).length,
  hidden: reviews.value.filter(r => r.isHidden).length
}));

const filtered = computed(() => {
  if (filter.value === 'visible') return reviews.value.filter(r => !r.isHidden);
  if (filter.value === 'hidden') return reviews.value.filter(r => r.isHidden);
  return reviews.value;
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/reviews', { params: { status: 'all' } });
    reviews.value = data.reviews;
  } finally {
    loading.value = false;
  }
}

function setFilter(v) { filter.value = v; }

async function hide(r) {
  const reason = (reasonDraft.value[r.id] || '').trim() || 'Hidden by an admin.';
  try {
    await api.patch(`/admin/reviews/${r.id}`, { isHidden: true, reason });
    toastRef.value?.show('Review hidden');
    reasonDraft.value[r.id] = '';
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

async function unhide(r) {
  try {
    await api.patch(`/admin/reviews/${r.id}`, { isHidden: false });
    toastRef.value?.show('Review restored');
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10 max-w-5xl">
    <div class="mb-8">
      <div class="eyebrow mb-2 text-amber-accent">— Content moderation</div>
      <h1 class="display text-4xl sm:text-5xl font-semibold leading-tight">Reviews</h1>
      <p class="text-bone-300 mt-2 text-sm">
        Hidden reviews stay in the database — the author's rating is preserved — but they're suppressed
        from public share links and aggregate stats.
      </p>
    </div>

    <div class="flex items-center gap-1 mb-7 flex-wrap">
      <button
        v-for="opt in [
          { id: 'visible', label: 'Visible',  count: counts.visible },
          { id: 'hidden',  label: 'Hidden',   count: counts.hidden },
          { id: 'all',     label: 'All',      count: counts.all }
        ]"
        :key="opt.id"
        @click="setFilter(opt.id)"
        :class="['px-3 py-1.5 text-xs uppercase tracking-eyebrow rounded-full border transition-colors',
                 filter === opt.id
                  ? 'bg-bone-50 text-ink-950 border-bone-50'
                  : 'border-ink-700 text-bone-300 hover:text-bone-50']"
      >{{ opt.label }} <span class="mono ml-1.5 opacity-60">{{ opt.count }}</span></button>
    </div>

    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="card p-5">
        <div class="skeleton h-4 w-1/3 mb-3"></div>
        <div class="skeleton h-3 w-full mb-2"></div>
        <div class="skeleton h-3 w-3/4"></div>
      </div>
    </div>

    <div v-else-if="filtered.length === 0" class="card p-14 text-center">
      <p class="display text-2xl mb-2">Nothing here.</p>
      <p class="text-bone-300 text-sm">{{ filter === 'visible' ? 'No reviews need attention.' : (filter === 'hidden' ? 'No moderated reviews.' : 'No reviews yet.') }}</p>
    </div>

    <div v-else class="space-y-4">
      <article v-for="r in filtered" :key="r.id" class="card p-5 lg:p-6">
        <div class="flex items-start gap-4">
          <a :href="`${PUBLIC_APP_URL}/movie/${r.movie.id}`" target="_blank" rel="noopener" class="w-12 h-16 rounded bg-ink-800 overflow-hidden shrink-0">
            <img v-if="r.movie.posterUrl" :src="r.movie.posterUrl" :alt="r.movie.title" class="w-full h-full object-cover" />
          </a>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <a :href="`${PUBLIC_APP_URL}/movie/${r.movie.id}`" target="_blank" rel="noopener" class="display text-lg text-bone-50 hover:text-amber-accent transition-colors">
                {{ r.movie.title }}
                <svg class="inline-block w-3 h-3 ml-0.5 -mt-0.5 text-bone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
              </a>
              <span class="rating-personal !text-[11px] !py-0.5 !px-2">{{ r.rating }}/10</span>
              <span v-if="r.isHidden" class="chip border-ruby-700/40 text-ruby-400">Hidden</span>
            </div>
            <div class="text-[11px] text-bone-300 mt-0.5">
              <span class="text-bone-100">{{ r.user.displayName }}</span> · {{ r.user.email }} · {{ formatDate(r.createdAt) }}
            </div>
            <blockquote class="mt-3 text-bone-100/95 leading-relaxed italic border-l-2 border-amber-accent/60 pl-4">
              “{{ r.review }}”
            </blockquote>

            <div v-if="r.isHidden && r.hiddenReason" class="mt-3 text-[12px] text-ruby-400 bg-ruby-700/10 border border-ruby-700/30 rounded-md px-3 py-2">
              <span class="font-medium">Hidden reason:</span> {{ r.hiddenReason }}
            </div>

            <div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <template v-if="!r.isHidden">
                <input
                  v-model="reasonDraft[r.id]"
                  type="text"
                  placeholder="Optional reason (audit-logged)"
                  class="field text-xs flex-1 max-w-md"
                  maxlength="200"
                />
                <button @click="hide(r)" class="btn-danger btn-sm">Hide review</button>
              </template>
              <button v-else @click="unhide(r)" class="btn-secondary btn-sm">Restore review</button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <Toast ref="toast" />
  </div>
</template>
