import { onMounted, onBeforeUnmount, watch } from 'vue';

// Wire up the three things every modal needs but most are missing:
//   - Esc closes (calls the onClose callback)
//   - Body scroll is locked while open
//   - Focus returns to whatever opened the modal on close
//
// Two usage modes:
//
// 1. **Lifetime-bound** (most admin modals — mounted via `v-if` so the
//    component lifecycle IS the open state):
//      useDialogA11y(() => emit('close'));
//
// 2. **Open-state-watched** (modals that mount permanently and toggle via
//    an `open` prop — like the public ConfirmModal):
//      useDialogA11y(() => emit('cancel'), () => props.open);
//
// The second arg is optional; omitted = lifetime-bound mode.
export function useDialogA11y(onClose, openRef = null) {
  let prevActive = null;
  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  }

  function activate() {
    prevActive = document.activeElement;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeydown);
  }

  function deactivate() {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', onKeydown);
    prevActive?.focus?.();
    prevActive = null;
  }

  if (openRef) {
    watch(openRef, (isOpen) => { isOpen ? activate() : deactivate(); }, { immediate: true });
  } else {
    onMounted(activate);
  }
  onBeforeUnmount(deactivate);
}
