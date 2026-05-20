<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import api from '../api/client.js';
import AdPreview from './AdPreview.vue';
import { useDialogA11y } from '../composables/useDialogA11y.js';

const props = defineProps({ ad: { type: Object, default: null } });
const emit = defineEmits(['close', 'saved']);

// Esc closes + body scroll-lock + focus restore.
useDialogA11y(() => emit('close'));

const isEdit = computed(() => !!props.ad);

const FORMATS = [
  { key: 'leaderboard',     label: 'Leaderboard',     dims: '728×90',  desc: 'Horizontal banner. Sits above hero or between sections.', defaultSlot: 'top' },
  { key: 'billboard',       label: 'Billboard',       dims: '970×250', desc: 'Large hero banner with image + body + CTA.',              defaultSlot: 'hero' },
  { key: 'mpu',             label: 'Medium rectangle (MPU)', dims: '300×250', desc: 'Versatile block — sidebar or inline.',          defaultSlot: 'sidebar' },
  { key: 'half_page',       label: 'Half page',       dims: '300×600', desc: 'Tall vertical banner for sidebars.',                     defaultSlot: 'sidebar' },
  { key: 'mobile_banner',   label: 'Mobile banner',   dims: '320×50',  desc: 'Thin banner shown only on small viewports.',             defaultSlot: 'top' },
  { key: 'native_card',     label: 'Native card',     dims: '2:3',     desc: 'Looks like a movie tile. Drops into the catalogue grid.', defaultSlot: 'inline' },
  { key: 'sponsored_post',  label: 'Sponsored post',  dims: 'fluid',   desc: 'Editorial-style card with image + headline + body + CTA.', defaultSlot: 'between' },
  { key: 'text_link',       label: 'Text link',       dims: 'single line', desc: 'Plain sponsored text. Footer or anywhere unobtrusive.', defaultSlot: 'footer' }
];

// Slots are dynamic — fetched from the slots inventory so newly-created
// placements (collection_top, profile_top, movie_bottom, plus anything
// the admin adds going forward) appear in the picker.
const slotOptions = ref([]);

const form = reactive({
  advertiser: '',
  headline: '',
  body: '',
  imageUrl: '',
  targetUrl: '',
  format: 'native_card',
  slot: 'inline',
  isActive: true,
  startsAt: '',
  endsAt: ''
});

const error = ref('');
const submitting = ref(false);

async function loadSlots() {
  try {
    const { data } = await api.get('/admin/slots');
    slotOptions.value = data.slots.map(s => ({ key: s.key, label: s.label, isActive: s.isActive }));
  } catch { slotOptions.value = []; }
}

onMounted(async () => {
  await loadSlots();
  if (props.ad) {
    form.advertiser = props.ad.advertiser || '';
    form.headline   = props.ad.headline   || '';
    form.body       = props.ad.body       || '';
    form.imageUrl   = props.ad.imageUrl   || '';
    form.targetUrl  = props.ad.targetUrl  || '';
    form.format     = props.ad.format     || 'native_card';
    form.slot       = props.ad.slot       || 'inline';
    form.isActive   = !!props.ad.isActive;
    form.startsAt   = props.ad.startsAt ? toLocalInput(props.ad.startsAt) : '';
    form.endsAt     = props.ad.endsAt   ? toLocalInput(props.ad.endsAt)   : '';
  }
});

const selectedFormat = computed(() => FORMATS.find(f => f.key === form.format));

const previewAd = computed(() => ({
  advertiser: form.advertiser || 'Your brand',
  headline:   form.headline   || 'Your headline appears here',
  body:       form.body       || '',
  imageUrl:   form.imageUrl   || '',
  format:     form.format
}));

function pickFormat(key) {
  form.format = key;
  // Suggest a sensible placement when the format changes.
  const f = FORMATS.find(ff => ff.key === key);
  if (f && !isEdit.value) {
    // Only auto-pick the default slot if it actually exists in inventory.
    if (slotOptions.value.some(s => s.key === f.defaultSlot)) {
      form.slot = f.defaultSlot;
    }
  }
}

// SQLite stores timestamps as 'YYYY-MM-DD HH:MM:SS' (no 'T'); convert
// to <input type="datetime-local"> format which expects 'YYYY-MM-DDTHH:MM'.
function toLocalInput(iso) {
  if (!iso) return '';
  const s = iso.replace(' ', 'T').slice(0, 16);
  return s;
}

function toIso(local) {
  if (!local) return null;
  return new Date(local).toISOString();
}

async function submit() {
  error.value = '';
  if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
    error.value = 'End must be after start.';
    return;
  }
  submitting.value = true;
  try {
    const body = {
      advertiser: form.advertiser.trim(),
      headline:   form.headline.trim(),
      body:       form.body.trim() || null,
      imageUrl:   form.imageUrl.trim() || null,
      targetUrl:  form.targetUrl.trim(),
      format:     form.format,
      slot:       form.slot,
      isActive:   form.isActive,
      startsAt:   toIso(form.startsAt),
      endsAt:     toIso(form.endsAt)
    };
    let saved;
    if (isEdit.value) {
      const { data } = await api.patch(`/admin/ads/${props.ad.id}`, body);
      saved = data.ad;
    } else {
      const { data } = await api.post('/admin/ads', body);
      saved = data.ad;
    }
    emit('saved', saved);
  } catch (e) {
    const issues = e.response?.data?.issues;
    error.value = issues ? issues.map(i => `${i.path}: ${i.message}`).join(' · ')
                         : (e.response?.data?.error || 'Save failed');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    leave-active-class="transition duration-100 ease-in"
    enter-from-class="opacity-0" leave-to-class="opacity-0"
  >
    <div class="fixed inset-0 z-50 flex items-start lg:items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm overflow-y-auto"
         @click.self="emit('close')" role="dialog" aria-modal="true">
      <div class="card max-w-5xl w-full p-6 lg:p-8 animate-fade-up my-8">
        <div class="flex items-center justify-between mb-1">
          <div class="eyebrow text-amber-accent">{{ isEdit ? '— Edit ad' : '— New ad' }}</div>
          <button @click="emit('close')" class="text-bone-300 hover:text-bone-50">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <h2 class="display text-3xl font-medium mb-6">{{ isEdit ? form.headline || 'Edit ad' : 'Create an ad' }}</h2>

        <div class="grid lg:grid-cols-[1fr_minmax(0,300px)] gap-8">
          <!-- Form -->
          <form @submit.prevent="submit" class="space-y-5">
            <!-- Format picker -->
            <div>
              <label class="label mb-2">Creative format</label>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  v-for="f in FORMATS" :key="f.key"
                  type="button"
                  @click="pickFormat(f.key)"
                  :class="['text-left rounded-lg border p-3 transition-colors',
                    form.format === f.key ? 'border-amber-accent/60 bg-amber-accent/5' : 'border-ink-700 hover:border-bone-300/40 bg-ink-900/40']"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-bone-50 text-xs font-medium">{{ f.label }}</span>
                    <span v-if="form.format === f.key" class="w-3.5 h-3.5 rounded-full bg-amber-accent flex items-center justify-center shrink-0">
                      <svg class="w-2 h-2 text-ink-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  </div>
                  <div class="mono text-[10px] text-bone-300 mt-0.5">{{ f.dims }}</div>
                </button>
              </div>
              <p v-if="selectedFormat" class="text-[11px] text-bone-300 mt-2 leading-relaxed">{{ selectedFormat.desc }}</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Advertiser</label>
                <input v-model="form.advertiser" class="field" required maxlength="120" placeholder="e.g. Criterion Channel" />
              </div>
              <div>
                <label class="label">Placement</label>
                <select v-model="form.slot" class="field">
                  <option v-for="s in slotOptions" :key="s.key" :value="s.key" :disabled="!s.isActive">
                    {{ s.label }}{{ !s.isActive ? ' (paused)' : '' }}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label class="label">Headline</label>
              <input v-model="form.headline" class="field" required maxlength="160" placeholder="Short and bold" />
            </div>

            <div>
              <label class="label">Body (optional)</label>
              <textarea v-model="form.body" rows="2" class="field font-sans resize-none" maxlength="400" placeholder="One or two sentences" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Creative image URL (optional)</label>
                <input v-model="form.imageUrl" type="url" class="field" placeholder="https://…" />
              </div>
              <div>
                <label class="label">Target URL</label>
                <input v-model="form.targetUrl" type="url" class="field" required placeholder="https://…" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Starts at (optional)</label>
                <input v-model="form.startsAt" type="datetime-local" class="field" />
                <p class="text-[10px] text-bone-300 mt-1">Leave blank to start immediately.</p>
              </div>
              <div>
                <label class="label">Ends at (optional)</label>
                <input v-model="form.endsAt" type="datetime-local" class="field" :min="form.startsAt || undefined" />
                <p class="text-[10px] text-bone-300 mt-1">Leave blank to run indefinitely.</p>
              </div>
            </div>

            <label class="inline-flex items-center gap-2 text-sm text-bone-200">
              <input type="checkbox" v-model="form.isActive" class="accent-amber-accent w-4 h-4" />
              Ad is active (shown on the public site)
            </label>

            <div v-if="error" class="text-sm text-ruby-400 bg-ruby-700/10 border border-ruby-700/30 rounded-md px-3 py-2">{{ error }}</div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button type="button" @click="emit('close')" class="btn-ghost">Cancel</button>
              <button type="submit" :disabled="submitting" class="btn-primary">
                {{ submitting ? 'Saving…' : (isEdit ? 'Save changes' : 'Create ad') }}
              </button>
            </div>
          </form>

          <!-- Live preview -->
          <aside class="preview-pane">
            <div class="preview-eye">— Live preview</div>
            <div class="preview-stage">
              <AdPreview
                :ad="previewAd"
                :max-width="272"
                :max-height="500"
              />
            </div>
            <p class="preview-hint">
              Updates as you type. Approved ads render at native size in their slot.
            </p>
          </aside>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.preview-pane {
  position: sticky;
  top: 1rem;
  border: 1px solid theme('colors.ink.700');
  border-radius: 10px;
  background: theme('colors.ink.950' / 50%);
  padding: 14px;
  align-self: start;
}
.preview-eye {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: theme('colors.bone.300');
  margin-bottom: 10px;
  font-weight: 500;
}
.preview-stage {
  display: flex;
  justify-content: center;
  align-items: center;
  background:
    linear-gradient(theme('colors.ink.900' / 50%), theme('colors.ink.900' / 50%)),
    repeating-linear-gradient(45deg, theme('colors.ink.800' / 50%) 0 6px, transparent 6px 12px);
  border-radius: 8px;
  padding: 14px;
  min-height: 140px;
}
.preview-hint {
  font-size: 11px;
  color: theme('colors.bone.400');
  margin-top: 10px;
  font-style: italic;
  line-height: 1.4;
}
</style>
