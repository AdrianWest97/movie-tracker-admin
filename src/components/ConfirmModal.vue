<script setup>
defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, default: 'Are you sure?' },
  body: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  danger: { type: Boolean, default: false }
});
const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    leave-active-class="transition duration-100 ease-in"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm"
      @click.self="emit('cancel')"
      role="dialog"
      aria-modal="true"
    >
      <div class="card max-w-sm w-full p-6 animate-fade-up">
        <h3 class="display text-xl font-semibold">{{ title }}</h3>
        <p v-if="body" class="text-sm text-bone-300 mt-2 leading-relaxed">{{ body }}</p>
        <div class="flex items-center justify-end gap-2 mt-6">
          <button class="btn-secondary" @click="emit('cancel')">{{ cancelLabel }}</button>
          <button :class="danger ? 'btn-danger' : 'btn-primary'" @click="emit('confirm')">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
