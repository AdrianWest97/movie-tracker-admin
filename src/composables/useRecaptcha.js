import { onMounted, onBeforeUnmount, ref } from 'vue';

let scriptPromise = null;
function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.grecaptcha && window.grecaptcha.render) return resolve();
    const s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const tick = () => (window.grecaptcha && window.grecaptcha.render ? resolve() : setTimeout(tick, 50));
      tick();
    };
    s.onerror = () => reject(new Error('reCAPTCHA script failed to load'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function useRecaptcha() {
  const containerRef = ref(null);
  const ready = ref(false);
  const widgetId = ref(null);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
  const disabled = !siteKey;

  onMounted(async () => {
    if (disabled) return;
    try {
      await loadScript();
      if (!containerRef.value) return;
      widgetId.value = window.grecaptcha.render(containerRef.value, {
        sitekey: siteKey,
        theme: 'dark'
      });
      ready.value = true;
    } catch (err) {
      console.warn('[recaptcha]', err.message);
    }
  });

  onBeforeUnmount(() => {
    if (widgetId.value !== null && window.grecaptcha?.reset) {
      try { window.grecaptcha.reset(widgetId.value); } catch {}
    }
  });

  function getToken() {
    if (disabled) return '';
    if (widgetId.value === null) return null;
    return window.grecaptcha.getResponse(widgetId.value) || null;
  }

  function reset() {
    if (disabled || widgetId.value === null) return;
    try { window.grecaptcha.reset(widgetId.value); } catch {}
  }

  return { containerRef, getToken, reset, ready, disabled };
}
