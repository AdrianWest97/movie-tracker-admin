<script setup>
import { ref, onMounted, useTemplateRef } from 'vue';
import api from '../api/client.js';
import Toast from '../components/Toast.vue';

const flags = ref({});
const loading = ref(true);
const saving = ref({});
const toastRef = useTemplateRef('toast');

const META = {
  ai_enabled:      { title: 'AI features',      desc: 'AI search and recommendations on Discover.' },
  chatbot_enabled: { title: 'Chatbot',          desc: 'The floating concierge and /chat page.' },
  signups_enabled: { title: 'Public sign-ups',  desc: 'Whether new users can register from the website.' },
  ads_enabled:     { title: 'Ads',              desc: 'Whether active ads are served to the public site.' }
};

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/flags');
    flags.value = data.flags;
  } finally {
    loading.value = false;
  }
}

async function toggle(key) {
  const next = !flags.value[key];
  saving.value[key] = true;
  try {
    const { data } = await api.patch('/admin/flags', { [key]: next });
    flags.value = data.flags;
    toastRef.value?.show(`${META[key].title} ${next ? 'enabled' : 'disabled'}`);
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Update failed');
  } finally {
    saving.value[key] = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10 max-w-3xl">
    <div class="mb-8">
      <div class="eyebrow mb-2 text-amber-accent">— Runtime switches</div>
      <h1 class="display text-4xl sm:text-5xl font-semibold leading-tight">Feature flags</h1>
      <p class="text-bone-300 mt-2 text-sm">Toggle features on and off without redeploying. Changes are immediate and audit-logged.</p>
    </div>

    <div v-if="loading" class="card p-8 text-center text-bone-300">Loading…</div>

    <ul v-else class="space-y-3">
      <li v-for="(meta, key) in META" :key="key" class="card p-5 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="text-bone-50 font-medium">{{ meta.title }}</div>
          <div class="text-[11px] mono text-bone-300 mt-0.5">{{ key }}</div>
          <p class="text-sm text-bone-300 mt-1.5">{{ meta.desc }}</p>
        </div>
        <button
          @click="toggle(key)"
          :disabled="saving[key]"
          :class="['relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0',
                   flags[key] ? 'bg-amber-accent' : 'bg-ink-700']"
          :aria-pressed="flags[key]"
          aria-label="Toggle"
        >
          <span :class="['inline-block h-5 w-5 rounded-full bg-ink-950 shadow-rim transition-transform',
                         flags[key] ? 'translate-x-6' : 'translate-x-1']"></span>
        </button>
      </li>
    </ul>

    <Toast ref="toast" />
  </div>
</template>
