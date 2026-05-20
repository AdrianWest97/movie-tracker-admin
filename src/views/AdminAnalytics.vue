<script setup>
import { ref, onMounted } from 'vue';
import api from '../api/client.js';

const data = ref(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const { data: payload } = await api.get('/admin/search-analytics');
    data.value = payload;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10 max-w-4xl">
    <div class="mb-8">
      <div class="eyebrow mb-2 text-amber-accent">— Last 30 days</div>
      <h1 class="display text-4xl sm:text-5xl leading-tight">Search analytics</h1>
      <p class="text-bone-300 mt-2 text-sm">What users are searching for, and where they're coming up empty.</p>
    </div>

    <div v-if="loading" class="card p-8 text-center text-bone-300">Loading…</div>

    <template v-else-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div class="card-flat p-5">
          <div class="eyebrow">Text searches</div>
          <div class="display text-3xl font-light mt-2 tabular-nums">{{ data.topQueries.reduce((s, q) => s + q.count, 0) }}</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">AI searches</div>
          <div class="display text-3xl font-light mt-2 tabular-nums text-amber-accent">{{ data.aiSearches }}</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">Chat messages</div>
          <div class="display text-3xl font-light mt-2 tabular-nums">{{ data.chatMessages }}</div>
        </div>
        <div class="card-flat p-5">
          <div class="eyebrow">Zero-result queries</div>
          <div class="display text-3xl font-light mt-2 tabular-nums text-ruby-400">{{ data.zeroResultQueries.length }}</div>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="card p-6">
          <div class="eyebrow mb-1">— Top queries</div>
          <h2 class="display text-xl mb-5">What people search for</h2>
          <p v-if="data.topQueries.length === 0" class="text-bone-300 text-sm">No searches yet.</p>
          <ol v-else class="space-y-2">
            <li v-for="(q, i) in data.topQueries" :key="i" class="flex items-center justify-between gap-3 text-sm">
              <div class="flex items-center gap-3 min-w-0">
                <span class="mono text-[11px] text-bone-300 w-6 tabular-nums">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="text-bone-100 truncate">"{{ q.query }}"</span>
              </div>
              <span class="chip">{{ q.count }}</span>
            </li>
          </ol>
        </div>

        <div class="card p-6">
          <div class="eyebrow mb-1 text-ruby-400">— No results</div>
          <h2 class="display text-xl mb-5">Catalogue gaps</h2>
          <p v-if="data.zeroResultQueries.length === 0" class="text-bone-300 text-sm">Every search has matched something.</p>
          <ol v-else class="space-y-2">
            <li v-for="(q, i) in data.zeroResultQueries" :key="i" class="flex items-center justify-between gap-3 text-sm">
              <div class="flex items-center gap-3 min-w-0">
                <span class="mono text-[11px] text-bone-300 w-6 tabular-nums">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="text-bone-100 truncate">"{{ q.query }}"</span>
              </div>
              <span class="chip border-ruby-700/40 text-ruby-400">{{ q.count }}</span>
            </li>
          </ol>
          <p class="text-[11px] text-bone-300 mt-5 leading-relaxed">
            Patterns here suggest titles to add to the catalogue.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
