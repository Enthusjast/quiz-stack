import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Swallow — SW registration is non-critical
    })
  })
}

const app = createApp(App)
app.use(router)
app.mount('#app')