<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import Wordmark from '../components/Wordmark.vue';
import { useRecaptcha } from '../composables/useRecaptcha.js';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { execute: executeRecaptcha } = useRecaptcha();

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const token = await executeRecaptcha('admin_login');
    await auth.login(email.value, password.value, token);
    router.push(route.query.redirect?.toString() || '/');
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Sign-in failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
    <!-- Backdrop gradient -->
    <div class="absolute inset-0 -z-10">
      <div class="absolute inset-0" style="background:
        radial-gradient(40rem 30rem at 20% 0%,  rgba(232,176,74,0.10) 0%, transparent 60%),
        radial-gradient(30rem 25rem at 80% 100%, rgba(232,176,74,0.06) 0%, transparent 60%),
        linear-gradient(180deg, rgba(8,7,10,0.4), rgba(8,7,10,0.95));"></div>
    </div>

    <div class="w-full max-w-sm">
      <div class="mb-12 flex items-center gap-3">
        <span class="w-8 h-8 rounded-md bg-amber-accent/15 text-amber-accent flex items-center justify-center">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.5L22 10l-5 4.5L18 22l-6-3.5L6 22l1-7.5L2 10l7-1.5z"/></svg>
        </span>
        <div>
          <div class="leading-none"><Wordmark size="md" /></div>
          <div class="eyebrow text-amber-accent leading-none mt-1">— admin console</div>
        </div>
      </div>

      <div class="eyebrow mb-3">— Restricted access</div>
      <h1 class="display text-4xl mb-2 leading-tight">Sign in.</h1>
      <p class="text-bone-300 mb-8 text-sm">This area is for site administrators only. User accounts cannot sign in here.</p>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="label" for="email">Email</label>
          <input id="email" v-model="email" type="email" required class="field" autocomplete="email" />
        </div>
        <div>
          <label class="label" for="password">Password</label>
          <input id="password" v-model="password" type="password" required class="field" autocomplete="current-password" />
        </div>

        <div v-if="error" class="text-sm text-ruby-400 bg-ruby-700/10 border border-ruby-700/30 rounded-md px-3 py-2">
          {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn-primary btn-lg w-full">
          {{ loading ? 'Signing in…' : 'Sign in to admin' }}
        </button>

        <p class="recaptcha-tos">
          Protected by reCAPTCHA —
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
          ·
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>
        </p>
      </form>

      <p class="text-[11px] text-bone-300 mt-8 leading-relaxed">
        Looking for the main app?
        <a :href="`http://${typeof location !== 'undefined' ? location.hostname : 'localhost'}:5173`" class="text-amber-accent hover:underline">Open Adrian&rsquo;s Cut →</a>
      </p>
    </div>
  </div>
</template>
