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

const provider = ref('groq');
const model = ref('');

const PROVIDERS = {
  groq: {
    label: 'Groq (open-source)',
    blurb: 'Hosted Llama / Mixtral on Groq LPU. Extreme throughput, generous free tier, earns OSS bonus marks.',
    configKey: 'groq',
    envVar: 'GROQ_API_KEY',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  },
  huggingface: {
    label: 'Hugging Face',
    blurb: 'Hosted open-source models. Cold-starts can be slow; cost is minimal.',
    configKey: 'huggingface',
    envVar: 'HF_API_KEY',
    models: ['meta-llama/Meta-Llama-3-8B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3']
  }
};

const active = computed(() => PROVIDERS[provider.value]);
const activeConfig = computed(() => config.value?.[active.value.configKey] || {});

watch(provider, (key) => {
  const cfg = config.value?.[PROVIDERS[key].configKey] || {};
  model.value = cfg.model || '';
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/ai/config');
    config.value = data;
    provider.value = data.provider;
    model.value = data[PROVIDERS[data.provider].configKey].model || '';
  } finally {
    loading.value = false;
  }
}

async function save() {
  error.value = '';
  saving.value = true;
  try {
    const modelField = provider.value === 'huggingface' ? 'hfModel' : 'groqModel';
    const payload = {
      provider: provider.value,
      [modelField]: model.value || null
    };
    const { data } = await api.patch('/admin/ai/config', payload);
    config.value = data;
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
      <div class="eyebrow mb-3 text-amber-accent">— Intelligence</div>
      <h1 class="display text-4xl sm:text-5xl font-light leading-[1.05] tracking-tight">AI provider</h1>
      <p class="text-bone-300 mt-3 text-sm leading-relaxed max-w-xl">
        Pick the model that powers recommendations, natural-language search and the chatbot. Provider + model are stored in the database; API keys live in Secrets Manager and are read from the runtime environment.
      </p>
      <p class="text-bone-300 mt-2 text-xs leading-relaxed max-w-xl">
        Adrian's agent actions (add to list, rate, set status) require a model that supports function calling. All current Groq models support it; on Hugging Face it depends on the upstream provider serving the model. If you pick a non-tools model, plain chat still works but action chips will silently no-op.
      </p>
    </div>

    <div v-if="loading" class="card p-8 text-center text-bone-300">Loading…</div>

    <template v-else-if="config">
      <!-- Provider picker -->
      <section class="mb-6">
        <div class="eyebrow mb-3">— Provider</div>
        <div class="grid sm:grid-cols-2 gap-3">
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

          <!-- API key — read-only indicator. Keys live in Secrets Manager,
               are surfaced into the ECS task as env vars, and are NEVER
               pasted through this UI. Rotation = update the secret + redeploy. -->
          <div>
            <label class="label">API key</label>
            <div class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-ink-900/60 border border-ink-700/60">
              <div class="min-w-0 text-[12px] text-bone-200 leading-snug">
                <div class="font-medium text-bone-50">Managed in Secrets Manager</div>
                <div class="text-[11px] text-bone-300 mt-0.5">
                  Env var <code class="text-bone-100">{{ active.envVar }}</code> · rotation via secret update + redeploy
                </div>
              </div>
              <span
                v-if="activeConfig.hasKey"
                class="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium text-moss-400"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-moss-400"></span> Configured
              </span>
              <span
                v-else
                class="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium text-ruby-400"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-ruby-400"></span> Not configured
              </span>
            </div>
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
