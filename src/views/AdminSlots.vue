<script setup>
import { ref, computed, onMounted, useTemplateRef } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.vue';
import Toast from '../components/Toast.vue';
import SlotEditModal from '../components/SlotEditModal.vue';

const slots = ref([]);
const loading = ref(true);
const editing = ref(null);
const toDelete = ref(null);
const toastRef = useTemplateRef('toast');

const aggregate = computed(() => {
  const active = slots.value.filter(s => s.isActive).length;
  const ads = slots.value.reduce((sum, s) => sum + (s.activeAdCount || 0), 0);
  const requests = slots.value.reduce((sum, s) => sum + (s.pendingRequestCount || 0), 0);
  return { total: slots.value.length, active, ads, requests };
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/slots');
    slots.value = data.slots;
  } finally {
    loading.value = false;
  }
}

function openCreate() { editing.value = 'new'; }
function openEdit(slot) { editing.value = { ...slot }; }

async function handleSaved(slot) {
  toastRef.value?.show(editing.value === 'new' ? `Created "${slot.label}"` : `Updated "${slot.label}"`);
  editing.value = null;
  await load();
}

async function toggleActive(s) {
  try {
    await api.patch(`/admin/slots/${s.id}`, { isActive: !s.isActive });
    toastRef.value?.show(s.isActive ? 'Slot paused' : 'Slot activated');
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

async function confirmDelete() {
  if (!toDelete.value) return;
  try {
    await api.delete(`/admin/slots/${toDelete.value.id}`);
    toastRef.value?.show(`Deleted "${toDelete.value.label}"`);
    toDelete.value = null;
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

function priceLabel(s) {
  const dollars = (s.basePriceCents / 100).toFixed(0);
  const unit = s.priceUnit === 'month' ? '/mo'
             : s.priceUnit === 'week'  ? '/wk'
             : s.priceUnit === 'cpm'   ? ' CPM'
             : '';
  return `$${dollars}${unit}`;
}

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10 space-y-8">
    <header class="flex items-end justify-between gap-4">
      <div>
        <div class="eyebrow mb-2 text-amber-accent">Inventory</div>
        <h1 class="display text-4xl sm:text-5xl leading-tight">Slots</h1>
        <p class="text-sm text-bone-300 mt-3 max-w-xl leading-relaxed">
          Define ad slots, set pricing, and toggle availability. Slots flow through to the
          <RouterLink to="/ad-requests" class="underline-offset-2 hover:text-amber-accent">ad-request</RouterLink> review queue.
        </p>
      </div>
      <button @click="openCreate" class="btn-primary">+ New slot</button>
    </header>

    <!-- KPIs -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="kpi"><div class="kpi-label">Slots</div><div class="kpi-value">{{ aggregate.total }}</div></div>
      <div class="kpi"><div class="kpi-label">Active</div><div class="kpi-value">{{ aggregate.active }}</div></div>
      <div class="kpi"><div class="kpi-label">Active ads</div><div class="kpi-value">{{ aggregate.ads }}</div></div>
      <div class="kpi"><div class="kpi-label">Pending requests</div><div class="kpi-value">{{ aggregate.requests }}</div></div>
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-sm text-bone-300">Loading…</div>
    <div v-else-if="!slots.length" class="text-sm text-bone-300 italic">No slots yet.</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-[10px] uppercase tracking-eyebrow text-bone-300 border-b border-ink-800">
            <th class="py-3 pr-4">Key / Label</th>
            <th class="py-3 pr-4">Placement</th>
            <th class="py-3 pr-4">Format</th>
            <th class="py-3 pr-4 text-right">Price</th>
            <th class="py-3 pr-4 text-right">Ads</th>
            <th class="py-3 pr-4 text-right">Requests</th>
            <th class="py-3 pr-4">Active</th>
            <th class="py-3 pr-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in slots" :key="s.id" class="border-b border-ink-800/70">
            <td class="py-3 pr-4">
              <div class="font-medium">{{ s.label }}</div>
              <div class="mono text-[11px] text-bone-300">{{ s.key }}</div>
            </td>
            <td class="py-3 pr-4 text-bone-300">
              <div v-if="s.placementRoute" class="mono text-[11px]">{{ s.placementRoute }}</div>
              <div v-if="s.placementPosition" class="text-[11px] uppercase tracking-eyebrow text-bone-300">{{ s.placementPosition }}</div>
            </td>
            <td class="py-3 pr-4 text-bone-300">
              <div class="text-[12px]">{{ s.recommendedFormat || '—' }}</div>
              <div v-if="s.dimensions" class="mono text-[10px] text-bone-300">{{ s.dimensions }}</div>
            </td>
            <td class="py-3 pr-4 text-right mono">{{ priceLabel(s) }}</td>
            <td class="py-3 pr-4 text-right">{{ s.activeAdCount }}</td>
            <td class="py-3 pr-4 text-right">
              <RouterLink v-if="s.pendingRequestCount" to="/ad-requests" class="text-amber-accent underline-offset-2 hover:underline">
                {{ s.pendingRequestCount }}
              </RouterLink>
              <span v-else class="text-bone-300">0</span>
            </td>
            <td class="py-3 pr-4">
              <button
                @click="toggleActive(s)"
                class="toggle-pill"
                :class="s.isActive ? 'toggle-on' : 'toggle-off'"
                :title="s.isActive ? 'Pause this slot' : 'Activate this slot'"
              >{{ s.isActive ? 'Active' : 'Paused' }}</button>
            </td>
            <td class="py-3 pr-2 text-right whitespace-nowrap">
              <button @click="openEdit(s)" class="btn-ghost btn-sm mr-1">Edit</button>
              <button @click="toDelete = s" class="btn-ghost btn-sm text-amber-accent">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <SlotEditModal
      v-if="editing"
      :slot="editing === 'new' ? null : editing"
      @saved="handleSaved"
      @close="editing = null"
    />
    <ConfirmModal
      :open="!!toDelete"
      title="Delete slot?"
      :body="toDelete ? `Permanently delete “${toDelete.label}”. This only works if no ads currently target this slot.` : ''"
      confirm-label="Delete"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />
    <Toast ref="toast" />
  </div>
</template>

<style scoped>
.kpi { background: theme('colors.ink.900'); border: 1px solid theme('colors.ink.800'); border-radius: 10px; padding: 14px 16px; }
.kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: theme('colors.bone.300'); }
.kpi-value { font-size: 22px; font-weight: 300; color: theme('colors.bone.50'); margin-top: 4px; font-family: theme('fontFamily.display'); letter-spacing: -0.02em; }

.toggle-pill {
  display: inline-block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 180ms, color 180ms;
}
.toggle-on  { background: rgba(80, 220, 130, 0.16); color: rgba(150, 230, 170, 1); }
.toggle-off { background: theme('colors.ink.800'); color: theme('colors.bone.400'); }
.toggle-pill:hover { filter: brightness(1.1); }
</style>
