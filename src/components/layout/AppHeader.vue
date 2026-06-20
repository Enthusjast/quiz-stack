<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Moon, Sun, BookOpen, Layers } from '@lucide/vue'

const router = useRouter()
const isDark = ref(false)
const themeStyle = ref<'card' | 'paper'>('card')

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('quiz-stack-theme', isDark.value ? 'dark' : 'light')
}

function toggleStyle() {
  themeStyle.value = themeStyle.value === 'card' ? 'paper' : 'card'
  document.documentElement.classList.toggle('theme-paper', themeStyle.value === 'paper')
  localStorage.setItem('quiz-stack-theme-style', themeStyle.value)
}

function initTheme() {
  // Dark/light
  const saved = localStorage.getItem('quiz-stack-theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
  // Card/paper style
  const savedStyle = localStorage.getItem('quiz-stack-theme-style') as 'card' | 'paper' | null
  if (savedStyle === 'paper') {
    themeStyle.value = 'paper'
    document.documentElement.classList.add('theme-paper')
  }
}

onMounted(() => initTheme())
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/80">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <button
        class="flex items-center gap-2 rounded-lg px-2 py-1 text-lg font-semibold text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800 transition-colors"
        @click="router.push('/')"
      >
        <BookOpen class="h-5 w-5 text-indigo-600" />
        <span>Quiz Stack</span>
      </button>

      <nav class="flex items-center gap-1">
        <button
          class="btn btn-ghost rounded-lg p-2"
          :class="{ 'text-indigo-600': $route.path === '/wrong-problems' }"
          @click="router.push('/wrong-problems')"
        >
          错题
        </button>
        <button
          class="btn btn-ghost rounded-lg p-2"
          @click="toggleStyle"
          :title="themeStyle === 'card' ? '切换到纸张风格' : '切换到卡片风格'"
        >
          <Layers class="h-5 w-5" />
        </button>
        <button
          class="btn btn-ghost rounded-lg p-2"
          @click="toggleTheme"
          :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
        >
          <component :is="isDark ? Sun : Moon" class="h-5 w-5" />
        </button>
      </nav>
    </div>
  </header>
</template>
