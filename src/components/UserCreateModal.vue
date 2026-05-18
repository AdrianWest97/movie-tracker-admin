<script setup>
import { ref, reactive } from 'vue';
import api from '../api/client.js';

const emit = defineEmits(['close', 'created']);

const form = reactive({
  email: '',
  displayName: '',
  role: 'user',
  password: '',
  sendWelcomeEmail: true
});
const error = ref('');
const submitting = ref(false);
const result = ref(null); // { user, generatedPassword }

async function submit() {
  error.value = '';
  submitting.value = true;
  try {
    const body = { ...form };
    if (!body.password) delete body.password;  // server generates one
    const { data } = await api.post('/admin/users', body);
    result.value = data;
    emit('created', data);
  } catch (e) {
    const issues = e.response?.data?.issues;
    error.value = issues ? issues.map(i => `${i.path}: ${i.message}`).join(' · ')
                         : (e.response?.data?.error || 'Failed to create user');
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
      <div class="card max-w-md w-full p-6 lg:p-8 animate-fade-up my-8">
        <div class="flex items-center justify-between mb-1">
          <div class="eyebrow text-amber-accent">— New user</div>
          <button @click="emit('close')" class="text-bone-300 hover:text-bone-50">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <template v-if="!result">
          <h2 class="display text-3xl font-semibold mb-6">Create an account</h2>
          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label class="label">Email</label>
              <input v-model="form.email" type="email" required class="field" />
            </div>
            <div>
              <label class="label">Display name</label>
              <input v-model="form.displayName" required minlength="1" maxlength="80" class="field" />
            </div>
            <div>
              <label class="label">Role</label>
              <select v-model="form.role" class="field">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label class="label">Password (leave blank to auto-generate)</label>
              <input v-model="form.password" type="text" minlength="8" maxlength="128" class="field font-mono text-sm" placeholder="Auto-generate if blank" />
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-bone-200">
              <input type="checkbox" v-model="form.sendWelcomeEmail" class="accent-amber-accent w-4 h-4" />
              Send welcome email with sign-in details
            </label>

            <div v-if="error" class="text-sm text-ruby-400 bg-ruby-700/10 border border-ruby-700/30 rounded-md px-3 py-2">{{ error }}</div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button type="button" @click="emit('close')" class="btn-ghost">Cancel</button>
              <button type="submit" :disabled="submitting" class="btn-primary">{{ submitting ? 'Creating…' : 'Create user' }}</button>
            </div>
          </form>
        </template>

        <template v-else>
          <h2 class="display text-3xl font-semibold mb-2">User created.</h2>
          <p class="text-bone-300 text-sm mb-5">
            {{ result.user.displayName }} ({{ result.user.email }}) is set up as <span class="text-bone-50">{{ result.user.role }}</span>.
          </p>
          <div v-if="result.generatedPassword" class="card-flat p-4 mb-5">
            <div class="eyebrow mb-2">— Temporary password</div>
            <div class="font-mono text-amber-accent text-lg break-all">{{ result.generatedPassword }}</div>
            <p class="text-[11px] text-bone-300 mt-2 leading-relaxed">
              {{ form.sendWelcomeEmail
                  ? 'Also emailed to the user. They should change it after first sign-in.'
                  : 'Copy this now — it will NOT be shown again.' }}
            </p>
          </div>
          <p v-else class="text-sm text-bone-300 mb-5">
            They can sign in with the password you provided. Welcome email
            {{ form.sendWelcomeEmail ? 'sent.' : 'not sent.' }}
          </p>
          <button @click="emit('close')" class="btn-primary w-full">Done</button>
        </template>
      </div>
    </div>
  </Transition>
</template>
