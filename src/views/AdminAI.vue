<script setup>
import { ref, computed, onMounted, useTemplateRef, watch } from 'vue';
import api from '../api/client.js';
import Toast from '../components/Toast.vue';

const config = ref(null);
const loading = ref(true);
const saving = ref(false);
const testing = ref(false);
const error = ref('');
const testResult = ref(null);
const toastRef = useTemplateRef('toast');

// Active selection + the editable form for whichever provider is active.
// Other providers stay configured in the backend but aren't shown here.
const provider = ref('anthropic');
const model = ref('');
const apiKey = ref('');
const clearKey = ref(false);

const PROVIDERS = {
  anthropic: {
    label: 'Anthropic Claude',
    blurb: 'Commercial, low latency, strong reasoning. Best default for production.',
    configKey: 'anthropic',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-opus-4-20250514']
  },
  groq: {
    label: 'Groq (open-source)',
    blurb: 'Hosted Llama / Mixtral on Groq LPU. Extreme throughput, generous free tier, earns OSS bonus marks.',
    configKey: 'groq',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  },
  huggingface: {
    label: 'Hugging Face',
    blurb: 'Hosted open-source models. Cold-starts can be slow; cost is minimal.',
    configKey: 'huggingface',
    models: ['meta-llama/Meta-Llama-3-8B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3']
  }
};

const active = computed(() => PROVIDERS[provider.value]);
const activeConfig = computed(() => config.value?.[active.value.configKey] || {});

// When the provider radio changes, sync the form to the backend's stored
// model for that provider and clear any in-flight key edits.
watch(provider, (key) => {
  const cfg = config.value?.[PROVIDERS[key].configKey] || {};
  model.value = cfg.model || '';
  apiKey.value = '';
  clearKey.value = false;
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/ai/config');
    config.value = data;
    provider.value = data.provider;
    model.value = data[PROVIDERS[data.provider].configKey].model || '';
    apiKey.value = '';
    clearKey.value = false;
  } finally {
    loading.value = false;
  }
}

async function save() {
  error.value = '';
  saving.value = true;
  try {
    // Backend expects all three model + key slots so it can store per-provider
    // state. We only mutate the active one and leave the rest alone (empty
    // string = "no change" per the backend's merge logic).
    const keyField = provider.value === 'huggingface' ? 'hfApiKey'
                   : provider.value === 'groq'        ? 'groqApiKey'
                                                      : 'anthropicApiKey';
    const modelField = provider.value === 'huggingface' ? 'hfModel'
                     : provider.value === 'groq'        ? 'groqModel'
                                                        : 'anthropicModel';

    const payload = {
      provider: provider.value,
      [modelField]: model.value || null,
      [keyField]:   clearKey.value ? '__clear__' : (apiKey.value || '')
    };
    const { data } = await api.patch('/admin/ai/config', payload);
    config.value = data;
    apiKey.value = '';
    clearKey.value = false;
    toastRef.value?.show('AI configuration saved');
  } catch (e) {
    error.value = e.response?.data?.error || 'Save failed';
  } finally {
    saving.value = false;
  }
}

async function runTest() {
  testing.value = true;
  testResult.value = null;
  try {
    const { data } = await api.post('/admin/ai/test', {});
    testResult.value = { ok: true, ...data };
  } catch (e) {
    testResult.value = { ok: false, error: e.response?.data?.error || e.message };
  } finally {
    testing.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10 max-w-3xl">
    <div class="mb-8">
      <div class="eyebrow mb-2 text-amber-accent">— Intelligence</div>
      <h1 class="display text-4xl sm:text-5xl font-semibold leading-tight">AI provider</h1>
      <p class="text-bone-300 mt-2 text-sm max-w-xl">
        Pick the model that powers recommendations, natural-language search and the chatbot. Settings here override the bootstrap values from <code class="text-bone-100 bg-ink-800 px-1 py-0.5 rounded text-[11px]">backend/.env</code>.
      </p>
    </div>

    <div v-if="loading" class="card p-8 text-center text-bone-300">Loading…</div>

    <template v-else-if="config">
      <!-- Provider picker -->
      <section class="mb-6">
        <div class="eyebrow mb-3">— Provider</div>
        <div class="grid sm:grid-cols-3 gap-3">
          <label
            v-for="(info, key) in PROVIDERS" :key="key"
            :class="['cursor-pointer card-flat p-4 transition-all border',
              provider === key ? 'border-amber-accent/60 bg-amber-accent/5' : 'border-ink-700 hover:border-bone-300/40']"
          >
            <input type="radio" v-model="provider" :value="key" class="sr-only" />
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-bone-50 font-medium text-sm">{{ info.label }}</span>
              <span v-if="provider === key" class="w-4 h-4 rounded-full bg-amber-accent flex items-center justify-center">
                <svg class="w-2.5 h-2.5 text-ink-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            </div>
            <p class="text-[11px] text-bone-300 leading-relaxed">{{ info.blurb }}</p>
          </label>
        </div>
      </section>

      <!-- Active provider config (only one shown) -->
      <section class="card p-6 mb-6">
        <div class="flex items-center justify-between mb-5">
          <div>
            <div class="eyebrow text-bone-200">— {{ active.label }}</div>
            <h2 class="display text-xl mt-1">Settings</h2>
          </div>
          <span class="chip-accent">Active</span>
        </div>

        <div class="space-y-5">
          <!-- Model -->
          <div>
            <label class="label">Model</label>
            <input
              v-model="model"
              class="field font-mono text-xs"
              :placeholder="active.models[0]"
            />
            <div class="flex flex-wrap gap-1.5 mt-2">
              <button
                v-for="m in active.models" :key="m"
                type="button"
                @click="model = m"
                class="text-[10px] text-bone-300 border border-ink-700 bg-ink-900/60 hover:border-amber-accent/50 hover:text-bone-50 px-2 py-1 rounded font-mono"
              >{{ m }}</button>
            </div>
          </div>

          <!-- API key -->
          <div>
            <div class="flex items-baseline justify-between">
              <label class="label">API key</label>
              <span v-if="activeConfig.hasKey" class="text-[10px] text-moss-400">Currently set</span>
              <span v-else class="text-[10px] text-bone-300">Not configured</span>
            </div>
            <input
              v-model="apiKey"
              type="password"
              class="field font-mono text-xs"
              :placeholder="activeConfig.hasKey ? `Currently: ${activeConfig.apiKey}  (leave blank to keep)` : 'Paste API key…'"
              autocomplete="off"
              :disabled="clearKey"
            />
            <label v-if="activeConfig.hasKey" class="inline-flex items-center gap-2 mt-2 text-[11px] text-bone-300">
              <input type="checkbox" v-model="clearKey" class="accent-amber-accent" />
              Clear stored key
            </label>
          </div>
        </div>
      </section>

      <div v-if="error" class="text-sm text-ruby-400 bg-ruby-700/10 border border-ruby-700/30 rounded-md px-3 py-2 mb-4">
        {{ error }}
      </div>

      <div class="flex items-center gap-3 mb-6">
        <button @click="save" :disabled="saving" class="btn-primary">{{ saving ? 'Saving…' : 'Save configuration' }}</button>
        <button @click="runTest" :disabled="testing" class="btn-secondary">{{ testing ? 'Testing…' : 'Test connection' }}</button>
      </div>

      <div v-if="testResult" :class="['card p-4 text-sm', testResult.ok ? 'border-moss-500/40 bg-moss-500/5' : 'border-ruby-700/40 bg-ruby-700/5']">
        <div :class="testResult.ok ? 'text-moss-400' : 'text-ruby-400'" class="font-medium mb-1">
          {{ testResult.ok ? '✓ Provider responded' : '✗ Test failed' }}
        </div>
        <div class="text-bone-200 mono text-xs whitespace-pre-wrap break-all">{{ testResult.sample || testResult.error }}</div>
      </div>
    </template>

    <Toast ref="toast" />
  </div>
</template>
