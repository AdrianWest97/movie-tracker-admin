import axios from 'axios';

// Separate storage keys so admin and public sessions can co-exist in the same
// browser (e.g. you're signed into the public app as a user, AND the admin app
// as the admin) without overwriting each other.
const TOKEN_KEY = 'mt.admin.token';
const USER_KEY  = 'mt.admin.user';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export { TOKEN_KEY, USER_KEY };
export default api;
