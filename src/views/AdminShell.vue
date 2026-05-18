<script setup>
import { computed } from 'vue';
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import Wordmark from '../components/Wordmark.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const initials = computed(() => {
  const name = auth.user?.displayName || auth.user?.email || '';
  return name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'A';
});

// Each nav item gets a distinct icon. Reads grouped: editorial (catalogue,
// featured) · audience (users, reviews) · ads (ads, slots, ad-requests) ·
// system (ai, flags, analytics, activity). Dashboard sits above the groups.
const NAV = [
  { to: '/',            label: 'Dashboard',     icon: 'dashboard' },
  { to: '/movies',      label: 'Catalogue',     icon: 'film' },
  { to: '/featured',    label: 'Featured',      icon: 'bookmark' },
  { to: '/users',       label: 'Users',         icon: 'users' },
  { to: '/reviews',     label: 'Reviews',       icon: 'message' },
  { to: '/ads',         label: 'Ads',           icon: 'megaphone' },
  { to: '/slots',       label: 'Slots',         icon: 'grid' },
  { to: '/ad-requests', label: 'Ad requests',   icon: 'inbox' },
  { to: '/ai',          label: 'AI',            icon: 'sparkle' },
  { to: '/flags',       label: 'Feature flags', icon: 'flag' },
  { to: '/analytics',   label: 'Analytics',     icon: 'chart' },
  { to: '/activity',    label: 'Activity',      icon: 'pulse' }
];

function isActive(path) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

async function logout() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Top bar -->
    <header class="border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-md sticky top-0 z-30">
      <div class="px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4 h-16">
        <RouterLink to="/" class="flex items-center gap-3">
          <span class="w-7 h-7 rounded-md bg-amber-accent/15 text-amber-accent flex items-center justify-center">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.5L22 10l-5 4.5L18 22l-6-3.5L6 22l1-7.5L2 10l7-1.5z"/></svg>
          </span>
          <Wordmark size="md" />
          <span class="hidden sm:inline-block h-4 w-px bg-ink-700"></span>
          <span class="hidden sm:inline eyebrow text-amber-accent">— admin console</span>
        </RouterLink>

        <div class="flex items-center gap-2">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener"
            class="hidden sm:inline-flex items-center gap-1.5 text-xs text-bone-300 hover:text-bone-50 transition-colors px-3 py-1.5 rounded-md hover:bg-ink-800/70"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            Open public app
          </a>

          <div class="relative group/menu">
            <button
              class="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full border border-ink-700 bg-ink-900/60 hover:border-bone-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-accent"
              aria-haspopup="true"
            >
              <span class="w-7 h-7 rounded-full bg-amber-accent text-ink-950 text-xs font-semibold flex items-center justify-center">{{ initials }}</span>
              <span class="hidden sm:inline text-xs text-bone-200 max-w-[8rem] truncate">{{ auth.user?.displayName }}</span>
              <svg class="w-3 h-3 text-bone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="invisible opacity-0 group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:visible group-focus-within/menu:opacity-100 transition-opacity absolute right-0 top-full mt-2 w-56 card p-1 shadow-lift">
              <div class="px-3 py-2 text-[10px] uppercase tracking-eyebrow text-bone-300 border-b border-ink-800/80">Signed in as admin</div>
              <div class="px-3 py-2 text-sm text-bone-100 truncate">{{ auth.user?.email }}</div>
              <button @click="logout" class="w-full text-left px-3 py-2 text-sm text-bone-200 hover:text-bone-50 hover:bg-ink-800/70 rounded-md">Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Sidebar + page -->
    <div class="flex-1 grid lg:grid-cols-[240px_1fr]">
      <aside class="border-b lg:border-b-0 lg:border-r border-ink-800/80 bg-ink-900/30">
        <div class="lg:sticky lg:top-16 p-4 lg:p-6">
          <nav class="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
            <RouterLink
              v-for="item in NAV"
              :key="item.to"
              :to="item.to"
              :class="[
                // Active = amber text only (the single functional accent),
                // anchored by a 1px amber edge on the inactive side of the
                // tab. No background tint; the marquee rule means amber is
                // marquee-rare, not chip-sprinkled.
                'group relative flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors',
                isActive(item.to)
                  ? 'text-amber-accent lg:before:absolute lg:before:left-0 lg:before:top-2 lg:before:bottom-2 lg:before:w-px lg:before:bg-amber-accent'
                  : 'text-bone-200 hover:text-bone-50 hover:bg-ink-800/60'
              ]"
            >
              <span class="w-4 h-4 inline-flex items-center justify-center">
                <svg v-if="item.icon === 'dashboard'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                <svg v-else-if="item.icon === 'film'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/></svg>
                <svg v-else-if="item.icon === 'bookmark'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                <svg v-else-if="item.icon === 'users'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <svg v-else-if="item.icon === 'message'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <svg v-else-if="item.icon === 'megaphone'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                <svg v-else-if="item.icon === 'grid'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
                <svg v-else-if="item.icon === 'inbox'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                <svg v-else-if="item.icon === 'sparkle'" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M12 2l1.7 4.7L18 8.4l-4.3 1.7L12 14.8l-1.7-4.7L6 8.4l4.3-1.7z"/></svg>
                <svg v-else-if="item.icon === 'flag'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                <svg v-else-if="item.icon === 'chart'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
                <svg v-else-if="item.icon === 'pulse'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>
        </div>
      </aside>

      <div class="min-h-screen">
        <RouterView />
      </div>
    </div>
  </div>
</template>
