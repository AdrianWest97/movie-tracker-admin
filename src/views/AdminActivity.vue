<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api/client.js';

const entries = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const done = ref(false);
const filterType = ref('all');

const ACTIONS = {
  // Auth
  'auth.register':                 { label: 'Account created',           tone: 'moss',    icon: 'user-plus' },
  'auth.login':                    { label: 'Signed in',                  tone: 'moss',    icon: 'log-in'    },
  'auth.logout':                   { label: 'Signed out',                 tone: 'neutral', icon: 'log-out'   },
  'auth.login_blocked':            { label: 'Login blocked (suspended)',  tone: 'ruby',    icon: 'shield'    },
  'auth.password_reset':           { label: 'Password reset',             tone: 'amber',   icon: 'key'       },
  'auth.password_reset_requested': { label: 'Password reset requested',   tone: 'amber',   icon: 'key'       },
  'auth.password_change':          { label: 'Password changed',           tone: 'amber',   icon: 'key'       },
  'auth.email_verify':             { label: 'Email verified',             tone: 'moss',    icon: 'check'     },

  // Collection + ratings
  'collection.add':                { label: 'Added to collection',        tone: 'amber',   icon: 'plus'      },
  'collection.remove':             { label: 'Removed from collection',    tone: 'ruby',    icon: 'minus'     },
  'rating.submit':                 { label: 'Rated a film',               tone: 'amber',   icon: 'star'      },

  // Search + AI
  'search.text':                   { label: 'Filtered search',            tone: 'neutral', icon: 'search'    },
  'search.ai':                     { label: 'AI search',                  tone: 'sparkle', icon: 'sparkle'   },
  'ai.recommend':                  { label: 'AI recommendation',          tone: 'sparkle', icon: 'sparkle'   },
  'ai.chat':                       { label: 'AI chat',                    tone: 'sparkle', icon: 'sparkle'   },

  // Admin: users
  'admin.user.create':             { label: 'Admin: created user',        tone: 'admin',   icon: 'user-plus' },
  'admin.user.update':             { label: 'Admin: updated user',        tone: 'admin',   icon: 'shield'    },
  'admin.user.delete':             { label: 'Admin: deleted user',        tone: 'ruby',    icon: 'shield'    },
  'admin.user.password_reset':     { label: 'Admin: reset user password', tone: 'admin',   icon: 'key'       },

  // Admin: catalogue + reviews
  'admin.movie.create':            { label: 'Admin: added film',          tone: 'admin',   icon: 'plus'      },
  'admin.movie.update':            { label: 'Admin: edited film',         tone: 'admin',   icon: 'shield'    },
  'admin.movie.archive':           { label: 'Admin: archived film',       tone: 'neutral', icon: 'shield'    },
  'admin.movie.unarchive':         { label: 'Admin: restored film',       tone: 'moss',    icon: 'shield'    },
  'admin.movie.delete':            { label: 'Admin: deleted film',        tone: 'ruby',    icon: 'shield'    },
  'admin.review.hide':             { label: 'Admin: hid review',          tone: 'ruby',    icon: 'shield'    },
  'admin.review.unhide':           { label: 'Admin: restored review',     tone: 'moss',    icon: 'shield'    },
  'admin.featured.update':         { label: 'Admin: updated featured',    tone: 'admin',   icon: 'sparkle'   },

  // Admin: ads
  'admin.ad.create':               { label: 'Admin: created ad',          tone: 'admin',   icon: 'megaphone' },
  'admin.ad.update':               { label: 'Admin: edited ad',           tone: 'admin',   icon: 'megaphone' },
  'admin.ad.delete':               { label: 'Admin: deleted ad',          tone: 'ruby',    icon: 'megaphone' },

  // Admin: config
  'admin.ai.config_update':        { label: 'Admin: updated AI config',   tone: 'admin',   icon: 'sparkle'   },
  'admin.flags.update':            { label: 'Admin: updated flags',       tone: 'admin',   icon: 'flag'      }
};

const toneClass = (tone) => ({
  moss:    'bg-moss-500/15 text-moss-400 border-moss-500/30',
  amber:   'bg-amber-accent/15 text-amber-accent border-amber-accent/30',
  ruby:    'bg-ruby-500/15 text-ruby-400 border-ruby-700/40',
  neutral: 'bg-ink-700/40 text-bone-200 border-ink-600',
  sparkle: 'bg-bone-50/10 text-bone-50 border-bone-100/30',
  admin:   'bg-amber-accent/15 text-amber-accent border-amber-accent/40'
})[tone] || 'bg-ink-700/40 text-bone-200 border-ink-600';

function metaFor(actionType) {
  return ACTIONS[actionType] || { label: actionType, tone: 'neutral', icon: 'dot' };
}

const groupedByDay = computed(() => {
  const groups = new Map();
  for (const e of entries.value) {
    const d = new Date(e.createdAtUtc);
    const key = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  return Array.from(groups.entries());
});

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function describeDetails(entry) {
  if (!entry.details) return '';
  if (entry.actionType === 'search.text') {
    const parts = [];
    if (entry.details.q) parts.push(`“${entry.details.q}”`);
    if (entry.details.director) parts.push(`dir: ${entry.details.director}`);
    if (entry.details.cast) parts.push(`cast: ${entry.details.cast}`);
    if (entry.details.genre) parts.push(`genre: ${entry.details.genre}`);
    parts.push(`${entry.details.resultCount} result${entry.details.resultCount === 1 ? '' : 's'}`);
    return parts.join(' · ');
  }
  if (entry.actionType === 'search.ai') {
    return `“${entry.details.query}” → ${entry.details.resultCount} result${entry.details.resultCount === 1 ? '' : 's'}`;
  }
  if (entry.actionType === 'rating.submit') return `${entry.details.rating}/10`;
  if (entry.actionType === 'collection.add') return entry.details.status === 'watched' ? 'Watched' : 'Watchlist';
  if (entry.actionType === 'admin.user.update' && entry.details) {
    return Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(' · ');
  }
  return '';
}

async function load() {
  loading.value = true;
  try {
    const params = { limit: 100 };
    if (filterType.value !== 'all') params.actionPrefix = filterType.value;
    const { data } = await api.get('/admin/audit', { params });
    entries.value = data.entries;
    done.value = data.entries.length < 100;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (done.value || !entries.value.length) return;
  loadingMore.value = true;
  try {
    const params = { limit: 100, before: entries.value.at(-1).createdAtUtc };
    if (filterType.value !== 'all') params.actionPrefix = filterType.value;
    const { data } = await api.get('/admin/audit', { params });
    entries.value.push(...data.entries);
    done.value = data.entries.length < 100;
  } finally {
    loadingMore.value = false;
  }
}

function setFilter(t) {
  filterType.value = t;
  load();
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'auth', label: 'Auth' },
  { id: 'collection', label: 'Collection' },
  { id: 'rating', label: 'Ratings' },
  { id: 'search', label: 'Searches' },
  { id: 'ai', label: 'AI' },
  { id: 'admin', label: 'Admin' }
];

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10 max-w-5xl">
    <div class="mb-8">
      <div class="eyebrow mb-2 text-amber-accent">— Cross-user · Append-only · UTC</div>
      <h1 class="display text-4xl sm:text-5xl font-semibold leading-tight">Site activity</h1>
      <p class="text-bone-300 mt-2 text-sm">Every event across every user, including admin actions. Immutable by DB trigger.</p>
    </div>

    <div class="flex items-center gap-1 mb-8 flex-wrap">
      <button
        v-for="f in filters"
        :key="f.id"
        @click="setFilter(f.id)"
        :class="['px-3 py-1.5 text-xs uppercase tracking-eyebrow rounded-full border transition-colors',
                 filterType === f.id
                  ? 'bg-bone-50 text-ink-950 border-bone-50'
                  : 'border-ink-700 text-bone-300 hover:text-bone-50']"
      >{{ f.label }}</button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 6" :key="i" class="card-flat p-4 flex gap-3">
        <div class="skeleton w-9 h-9 rounded-full"></div>
        <div class="flex-1 space-y-2">
          <div class="skeleton h-4 w-1/3"></div>
          <div class="skeleton h-3 w-2/3"></div>
        </div>
      </div>
    </div>

    <div v-else-if="entries.length === 0" class="card p-12 text-center">
      <p class="display text-2xl">No activity matches.</p>
    </div>

    <div v-else class="space-y-10">
      <div v-for="[day, items] in groupedByDay" :key="day">
        <div class="eyebrow mb-4 text-bone-200">— {{ day }}</div>
        <ol class="relative pl-8 sm:pl-10 border-l border-ink-700/70 space-y-5">
          <li v-for="entry in items" :key="entry.id" class="relative pl-4 sm:pl-5">
            <span :class="['absolute -left-[1.18rem] sm:-left-[1.45rem] top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center', toneClass(metaFor(entry.actionType).tone)]">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" v-if="metaFor(entry.actionType).icon === 'sparkle'"><path d="M12 2l1.7 4.7L18 8.4l-4.3 1.7L12 14.8l-1.7-4.7L6 8.4l4.3-1.7z"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" v-else-if="metaFor(entry.actionType).icon === 'star'"><path d="M12 2l2.39 6.95H22l-6.2 4.5L18.18 22 12 17.27 5.82 22l2.38-8.55L2 8.95h7.61z"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'shield'"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'plus'"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'minus'"><line x1="5" x2="19" y1="12" y2="12"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'search'"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'log-in'"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'log-out'"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'user-plus'"><path d="M19 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="11" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'key'"><circle cx="7.5" cy="15.5" r="3.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'check'"><polyline points="20 6 9 17 4 12"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'megaphone'"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="metaFor(entry.actionType).icon === 'flag'"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
              <svg class="w-3 h-3" v-else viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
            </span>

            <div class="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 pt-1">
              <span class="text-bone-50 font-medium">{{ metaFor(entry.actionType).label }}</span>
              <span class="hidden sm:inline text-bone-300">·</span>
              <span class="text-sm text-bone-200">{{ entry.resourceLabel || entry.resourceType || '—' }}</span>
              <span v-if="entry.user" class="hidden sm:inline text-bone-300">·</span>
              <span v-if="entry.user" class="text-sm text-bone-300">{{ entry.user.displayName || entry.user.email }}</span>
              <span class="hidden sm:inline ml-auto mono text-[11px] text-bone-300 tabular-nums">{{ formatTime(entry.createdAtUtc) }}</span>
            </div>
            <div v-if="describeDetails(entry)" class="text-sm text-bone-300 mt-0.5">{{ describeDetails(entry) }}</div>
            <div class="sm:hidden mono text-[11px] text-bone-300 mt-1 tabular-nums">{{ formatTime(entry.createdAtUtc) }}</div>
          </li>
        </ol>
      </div>
    </div>

    <div v-if="!done && entries.length" class="text-center mt-10">
      <button @click="loadMore" :disabled="loadingMore" class="btn-secondary">
        {{ loadingMore ? 'Loading…' : 'Load older entries' }}
      </button>
    </div>
  </div>
</template>
