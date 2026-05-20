// Resolves the public app URL for admin → public navigation.
// Prod sets VITE_PUBLIC_APP_URL at build time (admin and public live on
// different domains). Dev falls back to current hostname on port 5173 so
// running the frontend on a remappped port (or via tunnel) still works.
export function publicAppUrl() {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof location !== 'undefined') {
    return `${location.protocol}//${location.hostname}:5173`;
  }
  return 'http://localhost:5173';
}
