import { defineStore } from 'pinia';
import api, { TOKEN_KEY, USER_KEY } from '../api/client.js';

export const useAuthStore = defineStore('admin-auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
    token: localStorage.getItem(TOKEN_KEY) || null
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    isAdmin: (s) => s.user?.role === 'admin'
  },
  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.user?.role !== 'admin') {
        // Don't persist a non-admin session in the admin app.
        throw new Error('This account does not have admin access.');
      }
      this._setSession(data);
    },
    async logout() {
      try { await api.post('/auth/logout'); } catch {}
      this.token = null;
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    async refreshUser() {
      const { data } = await api.get('/auth/me');
      if (data.role !== 'admin') {
        await this.logout();
        throw new Error('Admin access revoked.');
      }
      this.user = data;
      localStorage.setItem(USER_KEY, JSON.stringify(data));
    },
    _setSession({ token, user }) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }
});
