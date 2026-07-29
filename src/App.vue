<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

// Dynamically update theme-color meta tag based on dark/light mode
let themeObserver: MutationObserver | null = null

function syncThemeColor() {
  const isDark = document.documentElement.classList.contains('dark')
  const metaLight = document.getElementById('theme-color-meta') as HTMLMetaElement | null
  const metaDark = document.getElementById('theme-color-meta-dark') as HTMLMetaElement | null
  if (metaLight) metaLight.media = isDark ? '(max-width: 0px)' : ''
  if (metaDark) metaDark.media = isDark ? '' : '(max-width: 0px)'
}

onMounted(() => {
  themeObserver = new MutationObserver(syncThemeColor)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  syncThemeColor()
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-blue-50 dark:bg-slate-900">
    <AppHeader />
    <main class="flex-1">
      <router-view v-slot="{ Component, route }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>
    <AppFooter />
  </div>
</template>
