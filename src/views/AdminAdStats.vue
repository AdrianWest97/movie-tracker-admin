<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import api from '../api/client.js';

const route = useRoute();
const data = ref(null);
const loading = ref(true);
const error = ref('');

const FORMAT_LABEL = {
  leaderboard: 'Leaderboard 728×90', billboard: 'Billboard 970×250', mpu: 'MPU 300×250',
  half_page: 'Half page 300×600', mobile_banner: 'Mobile banner 320×50',
  native_card: 'Native card', sponsored_post: 'Sponsored post', text_link: 'Text link'
};

async function load() {
  loading.value = true; error.value = '';
  try {
    const { data: payload } = await api.get(`/admin/ads/${route.params.id}/stats`);
    data.value = payload;
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not load stats.';
  } finally {
    loading.value = false;
  }
}

// Pad daily series to 30 days for a stable axis.
const sparkDays = computed(() => {
  if (!data.value?.daily) return [];
  const map = new Map(data.value.daily.map(d => [d.day, d]));
  const out = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = map.get(key) || { day: key, impressions: 0, clicks: 0 };
    out.push(found);
  }
  return out;
});
const maxDaily = computed(() => Math.max(1, ...sparkDays.value.map(d => d.impressions)));

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function hostFromReferrer(r) {
  if (!r || r === '(direct)') return 'Direct';
  try { return new URL(r).hostname; } catch { return r; }
}

onMounted(load);
watch(() => route.params.id, load);
</script>

<template>
  <div class="p-6 lg:p-10 max-w-6xl">
    <RouterLink to="/ads" class="text-xs text-bone-300 hover:text-bone-50 inline-flex items-center gap-1 mb-6">
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      All ads
    </RouterLink>

    <div v-if="loading" class="card p-8 text-center text-bone-300">Loading…</div>
    <div v-else-if="error" class="card p-8 text-ruby-400">{{ error }}</div>

    <template v-else-if="data">
      <!-- Header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-10">
        <div class="min-w-0">
          <div class="eyebrow mb-2 text-amber-accent">
            — Sponsored by {{ data.ad.advertiser }}
          </div>
          <h1 class="display text-4xl sm:text-5xl font-semibold leading-tight">{{ data.ad.headline }}</h1>
          <p v-if="data.ad.body" class="text-bone-300 mt-2 max-w-2xl">{{ data.ad.body }}</p>
          <div class="flex flex-wrap items-center gap-3 mt-4 text-[11px] text-bone-300">
            <span class="chip">{{ FORMAT_LABEL[data.ad.format] || data.ad.format }}</span>
            <span class="chip">Slot · {{ data.ad.slot }}</span>
            <span :class="data.ad.isActive ? 'chip-accent' : 'chip'">{{ data.ad.isActive ? 'Live' : 'Paused' }}</span>
            <a :href="data.ad.targetUrl" target="_blank" rel="noopener" class="text-amber-accent hover:underline truncate max-w-[24rem]">{{ data.ad.targetUrl }} ↗</a>
          </div>
        </div>
        <div v-if="data.ad.imageUrl" class="w-40 h-24 rounded-lg overflow-hidden border border-ink-700 shrink-0">
          <img :src="data.ad.imageUrl" :alt="data.ad.headline" class="w-full h-full object-cover" />
        </div>
      </div>

      <!-- Tile row -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <div class="card-flat p-5">
          <div class="eyebrow">Impressions</div>
          <div class="display text-3xl font-semibold mt-2 tabular-nums">{{ data.totals.impressions }}</div>
          <div class="text-[11px] text-bone-300 mt-1">{{ data.totals.uniqueImpressions }} unique</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">Clicks</div>
          <div class="display text-3xl font-semibold mt-2 tabular-nums">{{ data.totals.clicks }}</div>
          <div class="text-[11px] text-bone-300 mt-1">{{ data.totals.uniqueClicks }} unique</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">CTR</div>
          <div class="display text-3xl font-semibold mt-2 tabular-nums text-amber-accent">{{ data.totals.ctr }}%</div>
          <div class="text-[11px] text-bone-300 mt-1">{{ data.totals.uniqueCtr }}% unique-CTR</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">Authed views</div>
          <div class="display text-3xl font-semibold mt-2 tabular-nums">{{ data.totals.authedImpressions }}</div>
          <div class="text-[11px] text-bone-300 mt-1">signed-in users</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">Anon views</div>
          <div class="display text-3xl font-semibold mt-2 tabular-nums">{{ data.totals.anonImpressions }}</div>
          <div class="text-[11px] text-bone-300 mt-1">visitors</div>
        </div>
      </div>

      <!-- Daily chart -->
      <div class="card p-6 mb-6">
        <div class="flex items-end justify-between mb-5">
          <div>
            <div class="eyebrow">— Last 30 days</div>
            <h2 class="display text-xl mt-1">Daily performance</h2>
          </div>
          <div class="text-[11px] uppercase tracking-eyebrow text-bone-300 flex gap-4">
            <span><span class="inline-block w-2 h-2 rounded-sm bg-amber-accent/70 mr-1.5"></span>Impressions</span>
            <span><span class="inline-block w-2 h-2 rounded-sm bg-ruby-500 mr-1.5"></span>Clicks</span>
          </div>
        </div>
        <div class="flex items-end gap-1 h-40">
          <div v-for="d in sparkDays" :key="d.day" class="flex-1 min-w-0 relative flex flex-col-reverse"
               :title="`${d.day} — ${d.impressions} impressions · ${d.clicks} clicks`">
            <div class="bg-amber-accent/40 border-t-2 border-amber-accent rounded-sm"
                 :style="{ height: `${(d.impressions / maxDaily) * 100}%`, minHeight: '2px' }"></div>
            <div v-if="d.clicks" class="bg-ruby-500/80 border-t-2 border-ruby-500 absolute inset-x-0 bottom-0 rounded-sm"
                 :style="{ height: `${(d.clicks / maxDaily) * 100}%`, minHeight: '2px' }"></div>
          </div>
        </div>
        <div class="flex justify-between mt-2 mono text-[10px] text-bone-300/80">
          <span>{{ sparkDays[0]?.day.slice(5) }}</span>
          <span>{{ sparkDays.at(-1)?.day.slice(5) }}</span>
        </div>
      </div>

      <!-- Three breakdowns -->
      <div class="grid lg:grid-cols-3 gap-6 mb-6">
        <!-- Referrers -->
        <div class="card p-6">
          <div class="eyebrow mb-1">— Traffic source</div>
          <h2 class="display text-lg mb-5">Where viewers came from</h2>
          <ul v-if="data.referrers.length" class="space-y-2.5">
            <li v-for="r in data.referrers" :key="r.source" class="text-sm">
              <div class="flex items-center justify-between">
                <span class="text-bone-100 truncate min-w-0 mr-3">{{ hostFromReferrer(r.source) }}</span>
                <span class="mono text-[11px] text-bone-300 tabular-nums">{{ r.impressions }}</span>
              </div>
              <div class="mt-1 h-1 bg-ink-800 rounded-full overflow-hidden">
                <div class="h-full bg-amber-accent/70" :style="{ width: `${(r.impressions / data.referrers[0].impressions) * 100}%` }"></div>
              </div>
            </li>
          </ul>
          <p v-else class="text-bone-300 text-sm">No traffic yet.</p>
        </div>

        <!-- Devices -->
        <div class="card p-6">
          <div class="eyebrow mb-1">— Device</div>
          <h2 class="display text-lg mb-5">Where it shows</h2>
          <ul v-if="data.devices.length" class="space-y-3">
            <li v-for="d in data.devices" :key="d.device" class="text-sm">
              <div class="flex items-center justify-between mb-1">
                <span class="inline-flex items-center gap-2 text-bone-100">
                  <svg v-if="d.device === 'mobile'" class="w-4 h-4 text-amber-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>
                  <svg v-else-if="d.device === 'tablet'" class="w-4 h-4 text-amber-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M12 18h.01"/></svg>
                  <svg v-else class="w-4 h-4 text-amber-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                  <span class="capitalize">{{ d.device }}</span>
                </span>
                <span class="mono text-[11px] text-bone-300 tabular-nums">{{ d.impressions }} · {{ d.clicks }} clicks</span>
              </div>
              <div class="h-1 bg-ink-800 rounded-full overflow-hidden">
                <div class="h-full bg-amber-accent/70" :style="{ width: `${(d.impressions / data.devices[0].impressions) * 100}%` }"></div>
              </div>
            </li>
          </ul>
          <p v-else class="text-bone-300 text-sm">No device data yet.</p>
        </div>

        <!-- Top pages -->
        <div class="card p-6">
          <div class="eyebrow mb-1">— Top pages</div>
          <h2 class="display text-lg mb-5">Where it showed up</h2>
          <ul v-if="data.pages.length" class="space-y-2.5">
            <li v-for="p in data.pages" :key="p.page" class="text-sm">
              <div class="flex items-center justify-between">
                <span class="mono text-[11px] text-bone-200 truncate min-w-0 mr-3">{{ p.page }}</span>
                <span class="mono text-[11px] text-bone-300 tabular-nums">{{ p.impressions }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="text-bone-300 text-sm">No page data yet.</p>
        </div>
      </div>

      <!-- Recent click feed -->
      <div class="card p-6">
        <div class="eyebrow mb-1">— Live</div>
        <h2 class="display text-xl mb-5">Recent clicks</h2>
        <ul v-if="data.recentClicks.length" class="divide-y divide-ink-800/70">
          <li v-for="(c, i) in data.recentClicks" :key="i" class="py-3 text-sm flex items-baseline gap-3">
            <span class="mono text-[11px] text-bone-300 tabular-nums w-36 shrink-0">{{ formatTime(c.at) }}</span>
            <span class="text-bone-100 truncate flex-1">
              <span v-if="c.userEmail">{{ c.userEmail }}</span>
              <span v-else class="text-bone-300 italic">visitor</span>
              <span class="text-bone-300"> · from </span>
              <span class="text-amber-accent">{{ hostFromReferrer(c.referrer) }}</span>
              <span v-if="c.pagePath" class="text-bone-300"> on </span>
              <span v-if="c.pagePath" class="mono text-[11px]">{{ c.pagePath }}</span>
            </span>
            <span class="capitalize text-[11px] text-bone-300">{{ c.device || '—' }}</span>
          </li>
        </ul>
        <p v-else class="text-bone-300 text-sm">No clicks yet.</p>
      </div>
    </template>
  </div>
</template>
