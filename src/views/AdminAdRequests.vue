<script setup>
import { ref, computed, onMounted, useTemplateRef } from 'vue';
import api from '../api/client.js';
import Toast from '../components/Toast.vue';
import { useDialogA11y } from '../composables/useDialogA11y.js';

const requests = ref([]);
const loading = ref(true);
const tab = ref('pending');
const toastRef = useTemplateRef('toast');

const filtered = computed(() => requests.value.filter(r => r.status === tab.value));
const counts = computed(() => ({
  pending:   requests.value.filter(r => r.status === 'pending').length,
  approved:  requests.value.filter(r => r.status === 'approved').length,
  rejected:  requests.value.filter(r => r.status === 'rejected').length,
  withdrawn: requests.value.filter(r => r.status === 'withdrawn').length
}));

const reviewing = ref(null); // request being reviewed
const notes = ref('');
const overrideFormat = ref('');
const submitting = ref(false);

const FORMATS = [
  { value: '',              label: 'Use slot default' },
  { value: 'leaderboard',   label: 'Leaderboard 728×90' },
  { value: 'billboard',     label: 'Billboard 970×250' },
  { value: 'mpu',           label: 'MPU 300×250' },
  { value: 'half_page',     label: 'Half-page 300×600' },
  { value: 'mobile_banner', label: 'Mobile banner 320×50' },
  { value: 'native_card',   label: 'Native card (2:3)' },
  { value: 'sponsored_post',label: 'Sponsored post' },
  { value: 'text_link',     label: 'Text link' }
];

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/ad-requests');
    requests.value = data.requests;
  } finally {
    loading.value = false;
  }
}

function openReview(r) {
  reviewing.value = r;
  notes.value = r.adminNotes || '';
  overrideFormat.value = '';
}
function closeReview() {
  reviewing.value = null;
  notes.value = '';
  overrideFormat.value = '';
}

// Modal a11y: Esc closes the review drawer, body scroll locks while it's
// open, focus returns to whatever opened it.
useDialogA11y(closeReview, () => !!reviewing.value);

async function decide(action) {
  if (!reviewing.value) return;
  submitting.value = true;
  try {
    const payload = { action, adminNotes: notes.value.trim() || null };
    if (action === 'approve' && overrideFormat.value) payload.format = overrideFormat.value;
    await api.post(`/admin/ad-requests/${reviewing.value.id}/review`, payload);
    toastRef.value?.show(action === 'approve' ? 'Approved — ad is live' : 'Rejected');
    closeReview();
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Review failed');
  } finally {
    submitting.value = false;
  }
}

function priceLabel(cents) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(0)}`;
}

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10 space-y-8">
    <header>
      <div class="eyebrow mb-2 text-amber-accent">— Review queue</div>
      <h1 class="display text-4xl sm:text-5xl font-semibold leading-tight">Ad requests</h1>
      <p class="text-sm text-bone-300 mt-3 max-w-xl leading-relaxed">Review submissions from advertisers. Approving creates a live ad row tied to the chosen slot.</p>
    </header>

    <!-- Tabs -->
    <div class="flex items-center gap-1 border-b border-ink-800">
      <button
        v-for="t in ['pending','approved','rejected','withdrawn']" :key="t"
        @click="tab = t"
        class="tab"
        :class="{ 'is-active': tab === t }"
      >
        {{ t }}
        <span class="ml-2 text-[10px] text-bone-300">{{ counts[t] }}</span>
      </button>
    </div>

    <div v-if="loading" class="text-sm text-bone-300">Loading…</div>
    <div v-else-if="!filtered.length" class="text-sm text-bone-300 italic">No {{ tab }} requests.</div>
    <div v-else class="space-y-3">
      <article v-for="r in filtered" :key="r.id" class="card p-5">
        <div class="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-3 flex-wrap">
              <h3 class="text-lg font-medium text-bone-50">{{ r.advertiser }}</h3>
              <span class="text-[10px] uppercase tracking-eyebrow text-bone-300">— {{ r.slotLabel || r.slotKey }}</span>
              <span v-if="r.slotBasePriceCents" class="text-xs text-amber-accent mono">{{ priceLabel(r.slotBasePriceCents) }}/mo</span>
            </div>
            <div class="mt-2 text-bone-100">{{ r.headline }}</div>
            <p v-if="r.body" class="text-sm text-bone-300 mt-1">{{ r.body }}</p>
            <div class="mt-3 text-xs text-bone-300 flex flex-wrap gap-x-5 gap-y-1">
              <span>From: <span class="text-bone-100">{{ r.user.displayName }}</span> <span class="text-bone-300">&lt;{{ r.user.email }}&gt;</span></span>
              <span v-if="r.contactEmail">Reply-to: {{ r.contactEmail }}</span>
              <span v-if="r.budgetCents">Budget: {{ priceLabel(r.budgetCents) }}</span>
              <span>Submitted: <span class="mono">{{ r.createdAt?.slice(0, 16).replace('T', ' ') }}</span></span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-3">
              <a :href="r.targetUrl" target="_blank" rel="noopener" class="text-xs text-amber-accent underline-offset-2 hover:underline truncate max-w-md">{{ r.targetUrl }}</a>
              <a v-if="r.imageUrl" :href="r.imageUrl" target="_blank" rel="noopener" class="text-xs text-bone-300 underline-offset-2 hover:underline">image →</a>
            </div>
            <div v-if="r.adminNotes" class="mt-3 text-sm border-l-2 border-amber-accent pl-3 italic text-bone-300">
              {{ r.adminNotes }}
            </div>
          </div>
          <div class="shrink-0 sm:text-right">
            <span class="status-pill" :class="`status-${r.status}`">{{ r.status }}</span>
            <div v-if="r.status === 'pending'" class="mt-3">
              <button @click="openReview(r)" class="btn-primary btn-sm">Review</button>
            </div>
            <div v-if="r.createdAdId" class="text-[11px] text-bone-300 mt-2">
              Live as ad #{{ r.createdAdId }}
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- Review modal -->
    <div
      v-if="reviewing"
      class="modal-backdrop"
      @click.self="closeReview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div class="modal">
        <header class="modal-head">
          <h2 id="review-modal-title" class="text-lg font-medium">Review request</h2>
          <button @click="closeReview" class="head-x" aria-label="Close review">×</button>
        </header>
        <div class="modal-body space-y-4">
          <div class="text-sm">
            <div><span class="text-bone-300">Advertiser:</span> {{ reviewing.advertiser }}</div>
            <div><span class="text-bone-300">Slot:</span> {{ reviewing.slotLabel || reviewing.slotKey }}</div>
            <div><span class="text-bone-300">Headline:</span> {{ reviewing.headline }}</div>
          </div>
          <label class="block">
            <span class="form-label">Format override <span class="text-bone-300 normal-case">(optional)</span></span>
            <select v-model="overrideFormat" class="form-input">
              <option v-for="f in FORMATS" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </label>
          <label class="block">
            <span class="form-label">Notes <span class="text-bone-300 normal-case">(visible to advertiser)</span></span>
            <textarea v-model="notes" rows="3" maxlength="1000" class="form-input"></textarea>
          </label>
          <div class="flex items-center justify-between gap-3 pt-2">
            <button type="button" @click="closeReview" class="btn-ghost">Cancel</button>
            <div class="flex items-center gap-2">
              <button @click="decide('reject')" :disabled="submitting" class="btn-ghost text-amber-accent">Reject</button>
              <button @click="decide('approve')" :disabled="submitting" class="btn-primary">{{ submitting ? '…' : 'Approve & publish' }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Toast ref="toast" />
  </div>
</template>

<style scoped>
.tab {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.16em;
  color: theme('colors.bone.300');
  cursor: pointer;
  font-weight: 500;
  transition: color 180ms, border-color 180ms;
}
.tab:hover { color: theme('colors.bone.50'); }
.tab.is-active { color: theme('colors.amber.accent'); border-bottom-color: theme('colors.amber.accent'); }

.status-pill {
  display: inline-block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  padding: 3px 9px;
  border-radius: 999px;
  font-weight: 500;
}
.status-pending  { background: theme('colors.amber.accent' / 15%); color: theme('colors.amber.accent'); }
.status-approved { background: rgba(80, 220, 130, 0.16); color: rgba(150, 230, 170, 1); }
.status-rejected { background: rgba(220, 100, 100, 0.16); color: rgba(240, 170, 170, 1); }
.status-withdrawn{ background: theme('colors.ink.800'); color: theme('colors.bone.400'); }

.modal-backdrop {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 5vh 16px;
  overflow-y: auto;
}
.modal {
  background: theme('colors.ink.900');
  border: 1px solid theme('colors.ink.700');
  border-radius: 12px;
  width: 100%; max-width: 560px;
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid theme('colors.ink.800');
}
.head-x {
  background: none; border: none;
  width: 30px; height: 30px;
  font-size: 20px;
  color: theme('colors.bone.300');
  cursor: pointer;
  border-radius: 6px;
}
.head-x:hover { background: theme('colors.ink.800'); color: theme('colors.bone.50'); }
.modal-body { padding: 18px 20px; }

.form-label {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: theme('colors.bone.300');
  margin-bottom: 5px;
  font-weight: 500;
}
.form-input {
  width: 100%;
  background: theme('colors.ink.950');
  border: 1px solid theme('colors.ink.700');
  border-radius: 8px;
  padding: 9px 12px;
  color: theme('colors.bone.50');
  font-size: 14px;
  outline: none;
}
.form-input:focus { border-color: theme('colors.amber.accent'); }
</style>
