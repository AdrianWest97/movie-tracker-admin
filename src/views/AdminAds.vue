<script setup>
import { ref, computed, onMounted, useTemplateRef } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.vue';
import Toast from '../components/Toast.vue';
import AdEditModal from '../components/AdEditModal.vue';

const ads = ref([]);
const slots = ref([]);
const loading = ref(true);
const editing = ref(null);
const toDelete = ref(null);
const toastRef = useTemplateRef('toast');

// Build label/dropdown options from the live slots table so newly
// created placements (movie_bottom, collection_top, share_sidebar,
// anything an admin defines later) appear here without code changes.
const slotLabelByKey = computed(() => {
  const m = {};
  for (const s of slots.value) m[s.key] = s.label;
  return m;
});

const aggregate = computed(() => {
  const active = ads.value.filter(a => a.isActive).length;
  const imp = ads.value.reduce((s, a) => s + a.impressions, 0);
  const clk = ads.value.reduce((s, a) => s + a.clicks, 0);
  const ctr = imp ? ((clk / imp) * 100).toFixed(2) : '0.00';
  return { total: ads.value.length, active, impressions: imp, clicks: clk, ctr };
});

async function load() {
  loading.value = true;
  try {
    const [adsRes, slotsRes] = await Promise.all([
      api.get('/admin/ads'),
      api.get('/admin/slots')
    ]);
    ads.value = adsRes.data.ads;
    slots.value = slotsRes.data.slots;
  } finally {
    loading.value = false;
  }
}

function openCreate() { editing.value = 'new'; }
function openEdit(ad) { editing.value = { ...ad }; }

async function handleSaved(ad) {
  toastRef.value?.show(editing.value === 'new' ? `Created "${ad.headline}"` : `Updated "${ad.headline}"`);
  editing.value = null;
  await load();
}

async function toggleActive(ad) {
  try {
    await api.patch(`/admin/ads/${ad.id}`, { isActive: !ad.isActive });
    toastRef.value?.show(ad.isActive ? 'Ad paused' : 'Ad activated');
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

async function changeSlot(ad, newSlot) {
  if (newSlot === ad.slot) return;
  try {
    await api.patch(`/admin/ads/${ad.id}`, { slot: newSlot });
    toastRef.value?.show(`Moved "${ad.headline}" to ${slotLabelByKey.value[newSlot] || newSlot}`);
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

async function confirmDelete() {
  const ad = toDelete.value;
  toDelete.value = null;
  try {
    await api.delete(`/admin/ads/${ad.id}`);
    toastRef.value?.show(`Deleted "${ad.headline}"`);
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

const FORMAT_LABEL = {
  leaderboard: 'Leaderboard', billboard: 'Billboard', mpu: 'MPU',
  half_page: 'Half page', mobile_banner: 'Mobile', native_card: 'Native',
  sponsored_post: 'Sponsored post', text_link: 'Text link'
};
const FORMAT_DIMS = {
  leaderboard: '728×90', billboard: '970×250', mpu: '300×250',
  half_page: '300×600', mobile_banner: '320×50', native_card: '2:3',
  sponsored_post: 'fluid', text_link: '—'
};

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
      <div>
        <div class="eyebrow mb-2 text-amber-accent">— Inventory</div>
        <h1 class="display text-4xl sm:text-5xl leading-tight">Ads</h1>
        <p class="text-bone-300 mt-2 text-sm">Sell placement on the public catalogue. Define slot, schedule, target URL, and track performance.</p>
      </div>
      <button @click="openCreate" class="btn-primary">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        New ad
      </button>
    </div>

    <!-- Aggregate strip -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      <div class="card-flat p-5">
        <div class="eyebrow">Total ads</div>
        <div class="display text-3xl font-light mt-2 tabular-nums">{{ aggregate.total }}</div>
        <div class="text-[11px] text-bone-300 mt-1">{{ aggregate.active }} active</div>
      </div>
      <div class="card-flat p-5">
        <div class="eyebrow">Impressions</div>
        <div class="display text-3xl font-light mt-2 tabular-nums">{{ aggregate.impressions }}</div>
      </div>
      <div class="card-flat p-5">
        <div class="eyebrow">Clicks</div>
        <div class="display text-3xl font-light mt-2 tabular-nums">{{ aggregate.clicks }}</div>
      </div>
      <div class="card-flat p-5">
        <div class="eyebrow">CTR</div>
        <div class="display text-3xl font-light mt-2 tabular-nums text-amber-accent">{{ aggregate.ctr }}%</div>
      </div>
    </div>

    <div v-if="loading" class="card p-8 text-center text-bone-300">Loading…</div>
    <div v-else-if="ads.length === 0" class="card p-14 text-center">
      <p class="display text-2xl mb-2">No ads yet.</p>
      <p class="text-bone-300 text-sm">Create one to start selling placement on Adrian&rsquo;s Cut.</p>
      <button @click="openCreate" class="btn-primary mt-5 inline-flex">Create the first ad</button>
    </div>

    <div v-else class="card overflow-x-auto">
      <table class="w-full text-sm min-w-[640px]">
        <thead class="bg-ink-800/70 text-bone-300 text-[10px] uppercase tracking-eyebrow">
          <tr>
            <th class="text-left px-4 py-3">Ad</th>
            <th class="text-left px-4 py-3 hidden lg:table-cell">Format</th>
            <th class="text-left px-4 py-3 hidden md:table-cell">Slot</th>
            <th class="text-left px-4 py-3 hidden sm:table-cell">Status</th>
            <th class="text-right px-4 py-3 hidden md:table-cell">Imp.</th>
            <th class="text-right px-4 py-3 hidden lg:table-cell">Unique</th>
            <th class="text-right px-4 py-3 hidden md:table-cell">Clicks</th>
            <th class="text-right px-4 py-3 hidden lg:table-cell">CTR</th>
            <th class="text-right px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ad in ads" :key="ad.id" class="border-t border-ink-800/60 hover:bg-ink-800/40">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded bg-ink-800 overflow-hidden shrink-0">
                  <img v-if="ad.imageUrl" :src="ad.imageUrl" :alt="ad.headline" class="w-full h-full object-cover" />
                </div>
                <div class="min-w-0">
                  <RouterLink :to="`/ads/${ad.id}`" class="text-bone-50 font-medium truncate hover:text-amber-accent transition-colors block">{{ ad.headline }}</RouterLink>
                  <div class="text-[11px] text-bone-300 truncate">{{ ad.advertiser }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 hidden lg:table-cell">
              <div class="text-[11px] text-bone-200">{{ FORMAT_LABEL[ad.format] || ad.format }}</div>
              <div class="mono text-[10px] text-bone-300">{{ FORMAT_DIMS[ad.format] }}</div>
            </td>
            <td class="px-4 py-3 hidden md:table-cell">
              <select
                :value="ad.slot"
                @change="changeSlot(ad, $event.target.value)"
                class="field !py-1 !px-2 !text-[11px] uppercase tracking-eyebrow !w-auto"
                :title="`Move ${ad.headline} to a different slot`"
              >
                <option v-for="s in slots" :key="s.key" :value="s.key" :disabled="!s.isActive">
                  {{ s.label }}{{ !s.isActive ? ' (paused)' : '' }}
                </option>
              </select>
            </td>
            <td class="px-4 py-3 hidden sm:table-cell">
              <span v-if="ad.isActive" class="chip-accent">Live</span>
              <span v-else class="chip">Paused</span>
            </td>
            <td class="px-4 py-3 text-right mono tabular-nums hidden md:table-cell">{{ ad.impressions }}</td>
            <td class="px-4 py-3 text-right mono tabular-nums hidden lg:table-cell text-bone-200">{{ ad.uniqueViewers }}</td>
            <td class="px-4 py-3 text-right mono tabular-nums hidden md:table-cell">{{ ad.clicks }}</td>
            <td class="px-4 py-3 text-right mono tabular-nums hidden lg:table-cell text-amber-accent">
              {{ ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) + '%' : '—' }}
            </td>
            <td class="px-4 py-3 text-right">
              <div class="inline-flex items-center gap-1">
                <RouterLink :to="`/ads/${ad.id}`" class="btn-ghost btn-sm text-amber-accent">Stats</RouterLink>
                <button @click="openEdit(ad)" class="btn-ghost btn-sm">Edit</button>
                <button @click="toggleActive(ad)" class="btn-ghost btn-sm">{{ ad.isActive ? 'Pause' : 'Activate' }}</button>
                <button @click="toDelete = ad" class="btn-ghost btn-sm text-ruby-400">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdEditModal
      v-if="editing"
      :ad="editing === 'new' ? null : editing"
      @close="editing = null"
      @saved="handleSaved"
    />

    <ConfirmModal
      :open="!!toDelete"
      :title="`Delete “${toDelete?.headline}”?`"
      body="This permanently removes the ad and its performance history."
      confirm-label="Delete"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />

    <Toast ref="toast" />
  </div>
</template>
