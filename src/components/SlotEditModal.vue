<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api/client.js';

const props = defineProps({
  slot: { type: Object, default: null }  // null = create mode
});
const emit = defineEmits(['saved', 'close']);

const isCreate = computed(() => !props.slot);

const form = ref({
  key: props.slot?.key || '',
  label: props.slot?.label || '',
  description: props.slot?.description || '',
  placementRoute: props.slot?.placementRoute || '',
  placementPosition: props.slot?.placementPosition || '',
  recommendedFormat: props.slot?.recommendedFormat || 'native_card',
  dimensions: props.slot?.dimensions || '',
  basePriceCents: props.slot?.basePriceCents ?? 0,
  priceUnit: props.slot?.priceUnit || 'month',
  isActive: props.slot?.isActive ?? true
});

const dollarPrice = computed({
  get: () => (form.value.basePriceCents / 100).toFixed(2),
  set: (v) => { form.value.basePriceCents = Math.round((parseFloat(v) || 0) * 100); }
});

const saving = ref(false);
const error = ref('');

const FORMATS = [
  { value: 'leaderboard',   label: 'Leaderboard 728×90' },
  { value: 'billboard',     label: 'Billboard 970×250' },
  { value: 'mpu',           label: 'MPU 300×250' },
  { value: 'half_page',     label: 'Half-page 300×600' },
  { value: 'mobile_banner', label: 'Mobile banner 320×50' },
  { value: 'native_card',   label: 'Native card (2:3)' },
  { value: 'sponsored_post',label: 'Sponsored post (fluid)' },
  { value: 'text_link',     label: 'Text link' }
];

async function save() {
  error.value = '';
  if (!form.value.key.trim() || !form.value.label.trim()) {
    error.value = 'Key and label are required.';
    return;
  }
  saving.value = true;
  try {
    const payload = {
      key: form.value.key.trim(),
      label: form.value.label.trim(),
      description: form.value.description.trim() || null,
      placementRoute: form.value.placementRoute.trim() || null,
      placementPosition: form.value.placementPosition.trim() || null,
      recommendedFormat: form.value.recommendedFormat || null,
      dimensions: form.value.dimensions.trim() || null,
      basePriceCents: form.value.basePriceCents,
      priceUnit: form.value.priceUnit,
      isActive: form.value.isActive
    };
    const url = isCreate.value ? '/admin/slots' : `/admin/slots/${props.slot.id}`;
    const method = isCreate.value ? 'post' : 'patch';
    const { data } = await api[method](url, payload);
    emit('saved', data.slot);
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to save.';
  } finally {
    saving.value = false;
  }
}

function close() { emit('close'); }
</script>

<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal">
      <header class="modal-head">
        <h2 class="text-lg font-medium">{{ isCreate ? 'New slot' : `Edit ${slot?.label}` }}</h2>
        <button @click="close" class="head-x" aria-label="Close">×</button>
      </header>

      <form @submit.prevent="save" class="modal-body space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="form-label">Key</span>
            <input v-model="form.key" type="text" class="form-input mono" :disabled="!isCreate" required maxlength="80" placeholder="e.g., discover_hero" />
            <span class="form-hint">Lowercase, digits, underscores. Used in code.</span>
          </label>
          <label class="block">
            <span class="form-label">Label</span>
            <input v-model="form.label" type="text" class="form-input" required maxlength="160" placeholder="Discover — Under the hero" />
          </label>
        </div>

        <label class="block">
          <span class="form-label">Description</span>
          <textarea v-model="form.description" maxlength="500" rows="2" class="form-input" placeholder="Where it renders, who it suits"></textarea>
        </label>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="form-label">Placement route</span>
            <input v-model="form.placementRoute" type="text" class="form-input mono" maxlength="120" placeholder="/discover or * for global" />
          </label>
          <label class="block">
            <span class="form-label">Placement position</span>
            <input v-model="form.placementPosition" type="text" class="form-input mono" maxlength="40" placeholder="top, hero, sidebar…" />
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="form-label">Recommended format</span>
            <select v-model="form.recommendedFormat" class="form-input">
              <option v-for="f in FORMATS" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </label>
          <label class="block">
            <span class="form-label">Dimensions</span>
            <input v-model="form.dimensions" type="text" class="form-input mono" maxlength="40" placeholder="970x250, fluid, 2:3…" />
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
          <label class="block">
            <span class="form-label">Base price ($)</span>
            <input v-model="dollarPrice" type="number" step="0.01" min="0" class="form-input" />
            <span class="form-hint">Displayed to advertisers on the public Advertise page.</span>
          </label>
          <label class="block">
            <span class="form-label">Unit</span>
            <select v-model="form.priceUnit" class="form-input">
              <option value="month">per month</option>
              <option value="week">per week</option>
              <option value="cpm">CPM</option>
              <option value="flat">flat fee</option>
            </select>
          </label>
        </div>

        <label class="flex items-center gap-3 cursor-pointer mt-2">
          <input v-model="form.isActive" type="checkbox" class="w-4 h-4 accent-amber-400" />
          <span class="text-sm">Active &mdash; available for ad requests and rendering</span>
        </label>

        <p v-if="error" class="text-sm text-amber-accent">{{ error }}</p>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button type="button" @click="close" class="btn-ghost">Cancel</button>
          <button type="submit" :disabled="saving" class="btn-primary">{{ saving ? 'Saving…' : (isCreate ? 'Create slot' : 'Save changes') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
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
  width: 100%; max-width: 640px;
  display: flex; flex-direction: column;
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
  transition: border-color 180ms;
}
.form-input:focus { border-color: theme('colors.amber.accent'); }
.form-input:disabled { opacity: 0.6; cursor: not-allowed; }
.form-hint { display: block; font-size: 11px; color: theme('colors.bone.400'); margin-top: 4px; }
</style>
