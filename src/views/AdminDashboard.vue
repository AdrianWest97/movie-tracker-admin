<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../api/client.js';

const data = ref(null);
const loading = ref(true);

const ACTION_LABEL = {
  'auth.register': 'Account created',
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.login_blocked': 'Login blocked (suspended)',
  'collection.add': 'Added to collection',
  'collection.remove': 'Removed from collection',
  'rating.submit': 'Rated a film',
  'search.text': 'Filtered search',
  'search.ai': 'AI search',
  'ai.recommend': 'AI recommendation',
  'admin.user.update': 'Admin · updated user',
  'admin.user.delete': 'Admin · deleted user',
  'admin.movie.create': 'Admin · added film',
  'admin.movie.update': 'Admin · edited film',
  'admin.movie.archive': 'Admin · archived film',
  'admin.movie.unarchive': 'Admin · restored film',
  'admin.movie.delete': 'Admin · deleted film',
  'admin.review.hide': 'Admin · hid review',
  'admin.review.unhide': 'Admin · restored review'
};

const peakDay = computed(() => {
  if (!data.value?.activityByDay?.length) return null;
  return data.value.activityByDay.reduce((a, b) => (a.count >= b.count ? a : b));
});

const sparklineDays = computed(() => {
  if (!data.value?.activityByDay) return [];
  // Pad to 14 days even if no activity
  const map = new Map(data.value.activityByDay.map(d => [d.day, d.count]));
  const out = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: map.get(key) || 0 });
  }
  return out;
});
const maxCount = computed(() => Math.max(1, ...sparklineDays.value.map(d => d.count)));

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

async function load() {
  loading.value = true;
  try {
    const { data: payload } = await api.get('/admin/stats');
    data.value = payload;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

// ── Seed sample data ────────────────────────────────────────────────────────
// Bounded to fresh/empty databases. The backend refuses past 10 movies so the
// UI guard is just for affordance; the button still surfaces during a sparse
// catalogue.
const SEED_VISIBLE_THRESHOLD = 10;
const seedDialogOpen = ref(false);
const seedConfirmText = ref('');
const seeding = ref(false);
const seedResult = ref(null);
const seedError = ref(null);

const showSeedCard = computed(() =>
  !loading.value && data.value && (data.value.totals.movies ?? 0) < SEED_VISIBLE_THRESHOLD
);

function openSeed() {
  seedConfirmText.value = '';
  seedResult.value = null;
  seedError.value = null;
  seedDialogOpen.value = true;
}

async function confirmSeed() {
  if (seedConfirmText.value !== 'seed') return;
  seeding.value = true;
  seedError.value = null;
  try {
    const { data: res } = await api.post('/admin/seed', { confirm: 'seed' });
    seedResult.value = res.summary;
    await load(); // refresh stats so the card hides once seeded
  } catch (err) {
    seedError.value = err.response?.data?.error || 'Seed failed';
  } finally {
    seeding.value = false;
  }
}
</script>

<template>
  <div class="p-6 lg:p-10">
    <div class="mb-10">
      <div class="eyebrow mb-2 text-amber-accent">— Site overview</div>
      <h1 class="display text-4xl sm:text-5xl font-semibold leading-tight">Dashboard</h1>
      <p class="text-bone-300 mt-2 text-sm">Real-time snapshot of users, catalogue, and AI usage.</p>
    </div>

    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div v-for="i in 8" :key="i" class="card-flat p-5">
        <div class="skeleton h-3 w-16 mb-3"></div>
        <div class="skeleton h-8 w-20"></div>
      </div>
    </div>

    <template v-else-if="data">
      <!-- Stat tiles -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="card-flat p-5">
          <div class="eyebrow">Users</div>
          <div class="display text-3xl font-semibold mt-2 tabular-nums">{{ data.totals.users }}</div>
          <div class="text-[11px] text-bone-300 mt-1">{{ data.totals.admins }} admin · {{ data.totals.suspended }} suspended</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">Films in catalogue</div>
          <div class="display text-3xl font-semibold mt-2 tabular-nums">{{ data.totals.movies - data.totals.archivedMovies }}</div>
          <div class="text-[11px] text-bone-300 mt-1">{{ data.totals.archivedMovies }} archived</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">Ratings submitted</div>
          <div class="display text-3xl font-semibold mt-2 tabular-nums">{{ data.totals.ratings }}</div>
          <div class="text-[11px] text-bone-300 mt-1">{{ data.totals.hiddenReviews }} review{{ data.totals.hiddenReviews === 1 ? '' : 's' }} hidden</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">AI requests</div>
          <div class="display text-3xl font-semibold mt-2 tabular-nums text-amber-accent">{{ data.totals.aiSearches + data.totals.aiRecommendations }}</div>
          <div class="text-[11px] text-bone-300 mt-1">{{ data.totals.aiSearches }} searches · {{ data.totals.aiRecommendations }} recs</div>
        </div>
      </div>

      <!-- Seed sample data — only surfaces while the catalogue is sparse.
           Guard rails are server-side (typed confirm + ≤10 movies). -->
      <div
        v-if="showSeedCard"
        class="card mt-6 p-6 grid sm:grid-cols-[1fr_auto] items-center gap-4"
      >
        <div>
          <div class="eyebrow text-amber-accent">— Demo data</div>
          <h2 class="display text-2xl mt-1 leading-tight">Seed the catalogue</h2>
          <p class="text-sm text-bone-300 mt-2 max-w-2xl leading-relaxed">
            Populate the database with 25 sample films, 8 cinephile users, 32 reviews, and 5 example ads.
            Idempotent — re-running won't duplicate rows. Disabled once the catalogue exceeds 10 films.
          </p>
        </div>
        <button @click="openSeed" class="btn-primary shrink-0">Seed sample data</button>
      </div>

      <!-- Seed confirm dialog — typed "seed" required. -->
      <div
        v-if="seedDialogOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm"
        @click.self="seedDialogOpen = false"
        role="dialog"
        aria-modal="true"
      >
        <div class="card max-w-md w-full p-6 animate-fade-up">
          <div class="eyebrow text-amber-accent">— Confirm</div>
          <h3 class="display text-xl font-semibold mt-1">Seed sample data?</h3>
          <p class="text-sm text-bone-300 mt-2 leading-relaxed">
            This adds demo films, users, reviews, and ads. It's idempotent and bounded
            (won't run if the catalogue already has more than 10 films). To proceed,
            type <span class="mono text-amber-accent">seed</span> below.
          </p>
          <input
            v-model="seedConfirmText"
            placeholder="seed"
            class="input mt-4 w-full"
            autofocus
            @keyup.enter="confirmSeed"
          />
          <div v-if="seedError" class="text-sm text-red-400 mt-3">{{ seedError }}</div>
          <div v-if="seedResult" class="text-sm text-bone-50 mt-3 mono">
            Inserted: {{ seedResult.movies }} movies · {{ seedResult.users }} users ·
            {{ seedResult.reviews }} reviews · {{ seedResult.ads }} ads
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button @click="seedDialogOpen = false" class="btn-secondary">{{ seedResult ? 'Done' : 'Cancel' }}</button>
            <button
              v-if="!seedResult"
              @click="confirmSeed"
              :disabled="seedConfirmText !== 'seed' || seeding"
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >{{ seeding ? 'Seeding…' : 'Confirm seed' }}</button>
          </div>
        </div>
      </div>

      <!-- Activity sparkline -->
      <div class="card mt-6 p-6">
        <div class="flex items-end justify-between mb-5">
          <div>
            <div class="eyebrow">Activity · last 14 days</div>
            <h2 class="display text-2xl mt-1">Trail of events</h2>
          </div>
          <div v-if="peakDay" class="text-right">
            <div class="text-[11px] uppercase tracking-eyebrow text-bone-300">Peak</div>
            <div class="text-bone-50 mono text-xs mt-0.5">{{ peakDay.day }} · {{ peakDay.count }}</div>
          </div>
        </div>
        <div class="flex items-end gap-1 h-32">
          <div
            v-for="d in sparklineDays"
            :key="d.day"
            class="flex-1 min-w-0 rounded-sm bg-amber-accent/20 border-t-2 border-amber-accent/70 transition-colors hover:bg-amber-accent/40"
            :style="{ height: `${Math.max(2, (d.count / maxCount) * 100)}%` }"
            :title="`${d.day} — ${d.count} event${d.count === 1 ? '' : 's'}`"
          ></div>
        </div>
        <div class="flex justify-between mt-2 mono text-[10px] text-bone-300">
          <span>{{ sparklineDays[0]?.day.slice(5) }}</span>
          <span>{{ sparklineDays.at(-1)?.day.slice(5) }}</span>
        </div>
      </div>

      <!-- Two-up: Top rated + Most collected -->
      <div class="grid lg:grid-cols-2 gap-6 mt-6">
        <div class="card p-6">
          <div class="eyebrow mb-1">Top rated · by users</div>
          <h2 class="display text-xl">Highest-rated films</h2>
          <p v-if="data.topRated.length === 0" class="text-bone-300 text-sm mt-4">No ratings yet.</p>
          <ol v-else class="mt-5 space-y-3">
            <li v-for="(m, i) in data.topRated" :key="m.id" class="flex items-center gap-3">
              <span class="mono text-xs text-bone-300 w-6 tabular-nums">#{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="w-9 h-12 rounded bg-ink-800 overflow-hidden shrink-0">
                <img v-if="m.posterUrl" :src="m.posterUrl" :alt="m.title" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-bone-50 truncate">{{ m.title }} <span class="text-bone-300 text-xs">· {{ m.year }}</span></div>
                <div class="text-[11px] text-bone-300">{{ m.voteCount }} vote{{ m.voteCount === 1 ? '' : 's' }}</div>
              </div>
              <span class="rating-personal">{{ m.avgRating }}</span>
            </li>
          </ol>
        </div>

        <div class="card p-6">
          <div class="eyebrow mb-1">Most collected</div>
          <h2 class="display text-xl">Crowd favourites</h2>
          <p v-if="data.mostCollected.length === 0" class="text-bone-300 text-sm mt-4">No films collected yet.</p>
          <ol v-else class="mt-5 space-y-3">
            <li v-for="(m, i) in data.mostCollected" :key="m.id" class="flex items-center gap-3">
              <span class="mono text-xs text-bone-300 w-6 tabular-nums">#{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="w-9 h-12 rounded bg-ink-800 overflow-hidden shrink-0">
                <img v-if="m.posterUrl" :src="m.posterUrl" :alt="m.title" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-bone-50 truncate">{{ m.title }} <span class="text-bone-300 text-xs">· {{ m.year }}</span></div>
              </div>
              <span class="chip">{{ m.collectionCount }}</span>
            </li>
          </ol>
        </div>
      </div>

      <!-- Recent activity -->
      <div class="card p-6 mt-6">
        <div class="flex items-end justify-between mb-5">
          <div>
            <div class="eyebrow">Activity stream</div>
            <h2 class="display text-xl">Recent events</h2>
          </div>
          <RouterLink to="/activity" class="text-xs text-amber-accent hover:underline">View all →</RouterLink>
        </div>
        <ul class="divide-y divide-ink-800/70">
          <li v-for="entry in data.recentActivity" :key="entry.id" class="py-3 flex items-baseline gap-3 text-sm">
            <span class="mono text-[11px] text-bone-300 tabular-nums w-32 shrink-0">{{ formatTime(entry.createdAtUtc) }}</span>
            <span class="text-bone-50 font-medium">{{ ACTION_LABEL[entry.actionType] || entry.actionType }}</span>
            <span class="text-bone-300 truncate flex-1">
              <span v-if="entry.user?.displayName">{{ entry.user.displayName }}</span>
              <span v-if="entry.resourceLabel">  ·  <span class="text-bone-200">{{ entry.resourceLabel }}</span></span>
            </span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
