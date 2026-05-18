import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../views/AdminShell.vue'),
    children: [
      { path: '',         name: 'dashboard', component: () => import('../views/AdminDashboard.vue') },
      { path: 'movies',          name: 'movies',     component: () => import('../views/AdminMovies.vue') },
      { path: 'movies/new',      name: 'movie-new',  component: () => import('../views/AdminMovieEdit.vue') },
      { path: 'movies/:id/edit', name: 'movie-edit', component: () => import('../views/AdminMovieEdit.vue') },
      { path: 'featured',        name: 'featured',   component: () => import('../views/AdminFeatured.vue') },
      { path: 'users',    name: 'users',     component: () => import('../views/AdminUsers.vue') },
      { path: 'reviews',  name: 'reviews',   component: () => import('../views/AdminReviews.vue') },
      { path: 'ai',       name: 'ai',        component: () => import('../views/AdminAI.vue') },
      { path: 'ads',      name: 'ads',       component: () => import('../views/AdminAds.vue') },
      { path: 'ads/:id',  name: 'ad-stats',  component: () => import('../views/AdminAdStats.vue') },
      { path: 'slots',    name: 'slots',     component: () => import('../views/AdminSlots.vue') },
      { path: 'ad-requests', name: 'ad-requests', component: () => import('../views/AdminAdRequests.vue') },
      { path: 'flags',    name: 'flags',     component: () => import('../views/AdminFlags.vue') },
      { path: 'analytics', name: 'analytics', component: () => import('../views/AdminAnalytics.vue') },
      { path: 'activity', name: 'activity',  component: () => import('../views/AdminActivity.vue') }
    ]
  },
  { path: '/:catchAll(.*)', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && auth.isAuthenticated && auth.isAdmin) {
    return { name: 'dashboard' };
  }
});

export default router;
