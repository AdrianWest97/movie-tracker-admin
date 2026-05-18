<script setup>
import { ref } from 'vue';

const message = ref('');
const visible = ref(false);
let timer = null;

function show(msg, ms = 2200) {
  message.value = msg;
  visible.value = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { visible.value = false; }, ms);
}

defineExpose({ show });
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    leave-active-class="transition-all duration-150 ease-in"
    enter-from-class="opacity-0 translate-y-2"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="visible"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 card px-4 py-3 text-sm text-bone-50 flex items-center gap-2 shadow-lift"
      role="status"
      aria-live="polite"
    >
      <svg class="w-4 h-4 text-moss-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>{{ message }}</span>
    </div>
  </Transition>
</template>
