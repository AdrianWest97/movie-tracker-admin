import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import './style.css';

const app = createApp(App);

// Last-line catch for unhandled errors — better than a silent white screen.
app.config.errorHandler = (err, _instance, info) => {
  console.error('[vue] unhandled', info, err);
};

app.use(createPinia()).use(router).mount('#app');
