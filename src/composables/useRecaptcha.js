// reCAPTCHA v3 twin of the public-frontend composable — keep in lockstep.
// Loads the SDK eagerly so Google's badge renders as soon as the form
// mounts, not only on the first submit.

let scriptPromise = null;
function loadScript(siteKey) {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.grecaptcha && window.grecaptcha.execute) return resolve();
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const wait = () => {
        if (window.grecaptcha && window.grecaptcha.ready) {
          window.grecaptcha.ready(() => resolve());
        } else {
          setTimeout(wait, 50);
        }
      };
      wait();
    };
    s.onerror = () => reject(new Error('reCAPTCHA script failed to load'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function useRecaptcha() {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
  const disabled = !siteKey;

  if (!disabled) {
    loadScript(siteKey).catch(err => console.warn('[recaptcha]', err.message));
  }

  async function execute(action) {
    if (disabled) return '';
    await loadScript(siteKey);
    return window.grecaptcha.execute(siteKey, { action });
  }

  return { execute, disabled };
}
