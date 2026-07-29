import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Register service worker for PWA offline support
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Service worker registration is non-critical.
    })
  })
}

const app = createApp(App)
app.use(router)
app.mount('#app')
