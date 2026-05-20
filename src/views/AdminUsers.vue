<script setup>
import { ref, computed, onMounted, useTemplateRef } from 'vue';
import api from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.vue';
import Toast from '../components/Toast.vue';
import UserCreateModal from '../components/UserCreateModal.vue';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const users = ref([]);
const loading = ref(true);
const search = ref('');
const roleFilter = ref('all'); // all | user | admin | suspended
const selected = ref(null); // user being viewed/edited
const userActivity = ref([]);
const userActivityLoading = ref(false);
const showCreate = ref(false);
const toReset = ref(null);
const toDelete = ref(null);
const toastRef = useTemplateRef('toast');

const ACTION_LABEL = {
  'auth.register': 'Account created', 'auth.login': 'Signed in', 'auth.logout': 'Signed out',
  'auth.login_blocked': 'Login blocked',
  'collection.add': 'Added film', 'collection.remove': 'Removed film',
  'rating.submit': 'Rated film',
  'search.text': 'Search', 'search.ai': 'AI search', 'ai.recommend': 'AI rec'
};

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return users.value.filter(u => {
    if (roleFilter.value === 'admin' && u.role !== 'admin') return false;
    if (roleFilter.value === 'user' && u.role !== 'user') return false;
    if (roleFilter.value === 'suspended' && !u.isSuspended) return false;
    if (!q) return true;
    return (u.email || '').toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q);
  });
});

const counts = computed(() => ({
  all: users.value.length,
  user: users.value.filter(u => u.role === 'user').length,
  admin: users.value.filter(u => u.role === 'admin').length,
  suspended: users.value.filter(u => u.isSuspended).length
}));

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/users');
    users.value = data.users;
  } finally {
    loading.value = false;
  }
}

async function viewUser(u) {
  selected.value = u;
  userActivity.value = [];
  userActivityLoading.value = true;
  try {
    const { data } = await api.get(`/admin/users/${u.id}/activity`);
    userActivity.value = data.entries;
  } finally {
    userActivityLoading.value = false;
  }
}

async function toggleSuspend(u) {
  try {
    await api.patch(`/admin/users/${u.id}`, { isSuspended: !u.isSuspended });
    toastRef.value?.show(u.isSuspended ? `Reinstated ${u.email}` : `Suspended ${u.email}`);
    await load();
    if (selected.value?.id === u.id) selected.value = { ...selected.value, isSuspended: !u.isSuspended };
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

async function toggleRole(u) {
  const newRole = u.role === 'admin' ? 'user' : 'admin';
  try {
    await api.patch(`/admin/users/${u.id}`, { role: newRole });
    toastRef.value?.show(`${u.email} is now ${newRole}`);
    await load();
    if (selected.value?.id === u.id) selected.value = { ...selected.value, role: newRole };
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

async function confirmReset() {
  const u = toReset.value;
  toReset.value = null;
  try {
    await api.post(`/admin/users/${u.id}/reset-password`, {});
    toastRef.value?.show(`Reset link emailed to ${u.email}`);
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

async function handleCreated() {
  showCreate.value = false;
  await load();
}

async function confirmDelete() {
  const u = toDelete.value;
  toDelete.value = null;
  try {
    await api.delete(`/admin/users/${u.id}`);
    toastRef.value?.show(`Deleted ${u.email}`);
    if (selected.value?.id === u.id) selected.value = null;
    await load();
  } catch (e) {
    toastRef.value?.show(e.response?.data?.error || 'Failed');
  }
}

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

onMounted(load);
</script>

<template>
  <div class="p-6 lg:p-10">
    <div class="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <div class="eyebrow mb-2 text-amber-accent">— People</div>
        <h1 class="display text-4xl sm:text-5xl leading-tight">Users</h1>
        <p class="text-bone-300 mt-2 text-sm">Create accounts, promote admins, reset passwords, suspend bad actors.</p>
      </div>
      <button @click="showCreate = true" class="btn-primary self-start sm:self-auto">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        New user
      </button>
    </div>

    <!-- Filter pills -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
      <div class="flex items-center gap-1 flex-wrap">
        <button
          v-for="opt in [
            { id: 'all',       label: 'All',       count: counts.all },
            { id: 'user',      label: 'Users',     count: counts.user },
            { id: 'admin',     label: 'Admins',    count: counts.admin },
            { id: 'suspended', label: 'Suspended', count: counts.suspended }
          ]"
          :key="opt.id"
          @click="roleFilter = opt.id"
          :class="['px-3 py-1.5 text-xs uppercase tracking-eyebrow rounded-full border transition-colors',
                   roleFilter === opt.id
                    ? 'bg-bone-50 text-ink-950 border-bone-50'
                    : 'border-ink-700 text-bone-300 hover:text-bone-50']"
        >{{ opt.label }} <span class="mono ml-1.5 opacity-60">{{ opt.count }}</span></button>
      </div>
      <div class="relative max-w-sm w-full">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="search" type="text" class="field !pl-10" placeholder="Search name or email…" />
      </div>
    </div>

    <div v-if="loading" class="card p-8 text-center text-bone-300">Loading users…</div>
    <div v-else-if="filtered.length === 0" class="card p-12 text-center">
      <p class="display text-2xl mb-2">No users match.</p>
    </div>
    <div v-else class="card overflow-x-auto">
      <table class="w-full text-sm min-w-[640px]">
        <thead class="bg-ink-800/70 text-bone-300 text-[10px] uppercase tracking-eyebrow">
          <tr>
            <th class="text-left px-4 py-3">User</th>
            <th class="text-left px-4 py-3 hidden md:table-cell">Role</th>
            <th class="text-left px-4 py-3 hidden lg:table-cell">Films</th>
            <th class="text-left px-4 py-3 hidden lg:table-cell">Ratings</th>
            <th class="text-left px-4 py-3 hidden sm:table-cell">Joined</th>
            <th class="text-left px-4 py-3 hidden md:table-cell">Last seen</th>
            <th class="text-right px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtered" :key="u.id" class="border-t border-ink-800/60 hover:bg-ink-800/40">
            <td class="px-4 py-3">
              <button @click="viewUser(u)" class="flex items-center gap-3 text-left group">
                <span class="w-8 h-8 rounded-full bg-ink-800 text-bone-100 text-xs font-semibold flex items-center justify-center">
                  {{ (u.displayName || u.email).slice(0,2).toUpperCase() }}
                </span>
                <span class="min-w-0">
                  <span class="block text-bone-50 font-medium truncate group-hover:text-amber-accent transition-colors">{{ u.displayName }}</span>
                  <span class="block text-[11px] text-bone-300 truncate">{{ u.email }}</span>
                </span>
              </button>
            </td>
            <td class="px-4 py-3 hidden md:table-cell">
              <span v-if="u.role === 'admin'" class="chip-accent">Admin</span>
              <span v-else class="chip">User</span>
              <span v-if="u.isSuspended" class="chip border-ruby-700/40 text-ruby-400 ml-1.5">Suspended</span>
            </td>
            <td class="px-4 py-3 mono tabular-nums hidden lg:table-cell">{{ u.collectionCount }}</td>
            <td class="px-4 py-3 mono tabular-nums hidden lg:table-cell">{{ u.ratingsCount }}</td>
            <td class="px-4 py-3 text-bone-300 hidden sm:table-cell">{{ formatDate(u.createdAt) }}</td>
            <td class="px-4 py-3 text-bone-300 hidden md:table-cell">{{ formatDate(u.lastActiveAt) }}</td>
            <td class="px-4 py-3 text-right">
              <div class="inline-flex items-center gap-1">
                <button @click="viewUser(u)" class="btn-ghost btn-sm">View</button>
                <button
                  v-if="u.id !== auth.user?.id"
                  @click="toggleRole(u)"
                  class="btn-ghost btn-sm"
                >{{ u.role === 'admin' ? 'Demote' : 'Promote' }}</button>
                <button
                  v-if="u.id !== auth.user?.id"
                  @click="toggleSuspend(u)"
                  class="btn-ghost btn-sm"
                >{{ u.isSuspended ? 'Reinstate' : 'Suspend' }}</button>
                <button
                  @click="toReset = u"
                  class="btn-ghost btn-sm"
                  title="Email a one-time reset link"
                >Reset pw</button>
                <button
                  v-if="u.id !== auth.user?.id"
                  @click="toDelete = u"
                  class="btn-ghost btn-sm text-ruby-400"
                >Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- User detail drawer -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-150 ease-in"
      enter-from-class="translate-x-full opacity-0"
      leave-to-class="translate-x-full opacity-0"
    >
      <div v-if="selected" class="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-ink-900 border-l border-ink-700 shadow-poster overflow-y-auto">
        <div class="p-6 sticky top-0 bg-ink-900/95 backdrop-blur border-b border-ink-800 flex items-center justify-between">
          <div class="eyebrow text-amber-accent">— User</div>
          <button @click="selected = null" class="text-bone-300 hover:text-bone-50" aria-label="Close">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6">
          <div class="flex items-center gap-3 mb-5">
            <span class="w-12 h-12 rounded-full bg-amber-accent/20 text-amber-accent text-base font-semibold flex items-center justify-center">
              {{ (selected.displayName || selected.email).slice(0,2).toUpperCase() }}
            </span>
            <div class="min-w-0">
              <div class="display text-xl text-bone-50 truncate">{{ selected.displayName }}</div>
              <div class="text-[11px] text-bone-300 truncate">{{ selected.email }}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="card-flat p-3">
              <div class="eyebrow">Films</div>
              <div class="display text-2xl mt-1 tabular-nums">{{ selected.collectionCount }}</div>
            </div>
            <div class="card-flat p-3">
              <div class="eyebrow">Ratings</div>
              <div class="display text-2xl mt-1 tabular-nums">{{ selected.ratingsCount }}</div>
            </div>
            <div class="card-flat p-3">
              <div class="eyebrow">Role</div>
              <div class="text-bone-50 text-sm mt-1.5">{{ selected.role }}</div>
            </div>
            <div class="card-flat p-3">
              <div class="eyebrow">Status</div>
              <div class="text-sm mt-1.5" :class="selected.isSuspended ? 'text-ruby-400' : 'text-moss-400'">
                {{ selected.isSuspended ? 'Suspended' : 'Active' }}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 mt-5">
            <button v-if="selected.id !== auth.user?.id" @click="toggleRole(selected)" class="btn-secondary btn-sm">
              {{ selected.role === 'admin' ? 'Demote to user' : 'Promote to admin' }}
            </button>
            <button v-if="selected.id !== auth.user?.id" @click="toggleSuspend(selected)" class="btn-secondary btn-sm">
              {{ selected.isSuspended ? 'Reinstate' : 'Suspend login' }}
            </button>
            <button v-if="selected.id !== auth.user?.id" @click="toDelete = selected" class="btn-danger btn-sm">
              Delete account
            </button>
          </div>

          <div class="mt-8">
            <div class="eyebrow mb-3">— Recent activity</div>
            <div v-if="userActivityLoading" class="text-bone-300 text-sm">Loading…</div>
            <ul v-else-if="userActivity.length" class="space-y-2.5 max-h-[28rem] overflow-y-auto">
              <li v-for="e in userActivity" :key="e.id" class="text-sm">
                <div class="text-bone-50">{{ ACTION_LABEL[e.actionType] || e.actionType }}<span v-if="e.resourceLabel"> · <span class="text-bone-300">{{ e.resourceLabel }}</span></span></div>
                <div class="mono text-[11px] text-bone-300 tabular-nums">{{ formatTime(e.createdAtUtc) }}</div>
              </li>
            </ul>
            <div v-else class="text-bone-300 text-sm">No activity recorded.</div>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmModal
      :open="!!toDelete"
      :title="`Delete ${toDelete?.email}?`"
      body="This permanently removes the account, their collection, ratings, and reviews. Their audit-log entries are kept (with user_id nulled)."
      confirm-label="Delete account"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />

    <ConfirmModal
      :open="!!toReset"
      :title="`Send password-reset email to ${toReset?.email}?`"
      body="A one-time link will be emailed to them. The link expires in 1 hour. We never reveal a user's current password."
      confirm-label="Send reset link"
      @confirm="confirmReset"
      @cancel="toReset = null"
    />

    <UserCreateModal
      v-if="showCreate"
      @close="showCreate = false"
      @created="handleCreated"
    />

    <Toast ref="toast" />
  </div>
</template>
