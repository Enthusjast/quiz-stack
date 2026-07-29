<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Moon, Sun, BookOpen, History, Layers, RotateCcw } from '@lucide/vue'

const router = useRouter()
const route = useRoute()
const isDark = ref(false)
const themeStyle = ref<'card' | 'paper'>('card')
const scrolled = ref(false)

const isActive = computed(() => (path: string) => route.path === path)

let scrollTimer: ReturnType<typeof setTimeout> | null = null

function getStoredPreference(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStoredPreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in privacy modes; the in-memory UI state still applies.
  }
}

function onScroll() {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    scrolled.value = window.scrollY > 8
    scrollTimer = null
  }, 16)
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  setStoredPreference('quiz-stack-theme', isDark.value ? 'dark' : 'light')
}

function toggleStyle() {
  themeStyle.value = themeStyle.value === 'card' ? 'paper' : 'card'
  document.documentElement.classList.toggle('theme-paper', themeStyle.value === 'paper')
  setStoredPreference('quiz-stack-theme-style', themeStyle.value)
}

function initTheme() {
  const savedTheme = getStoredPreference('quiz-stack-theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = savedTheme === 'dark' || (savedTheme !== 'light' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark.value)

  const savedStyle = getStoredPreference('quiz-stack-theme-style')
  themeStyle.value = savedStyle === 'paper' ? 'paper' : 'card'
  document.documentElement.classList.toggle('theme-paper', themeStyle.value === 'paper')
}

function navigateHome() {
  router.push('/')
}

function navigateWrongProblems() {
  router.push('/wrong-problems')
}

function navigateRecords() {
  router.push('/records')
}

onMounted(() => {
  initTheme()
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (scrollTimer) clearTimeout(scrollTimer)
})
</script>

<template>
  <header
    class="paper-flat sticky top-0 z-50 transition-shadow duration-300"
    :class="scrolled
      ? 'shadow-lg shadow-violet-500/5 dark:shadow-black/30'
      : 'shadow-none'"
    role="banner"
  >
    <!-- Gradient top border line -->
    <div
      class="paper-gradient-primary paper-flat absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent dark:via-violet-300/30"
      aria-hidden="true"
    />

    <!-- Background with subtle gradient and backdrop blur -->
    <div
      class="paper-surface-strong absolute inset-0 bg-gradient-to-b from-violet-50/95 via-white/90 to-white/85 backdrop-blur-xl dark:from-slate-950/95 dark:via-slate-900/90 dark:to-slate-900/85"
      aria-hidden="true"
    />

    <div class="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:py-3">
      <!-- Brand / Logo -->
      <button
        type="button"
        class="group relative flex items-center gap-2.5 rounded-xl px-2 py-1.5 -ml-2 transition-all duration-200 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
        aria-label="Go to homepage"
        @click="navigateHome"
      >
        <!-- Logo icon box (matching footer style) -->
        <div
          class="paper-gradient-primary paper-flat flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20 transition-shadow duration-200 group-hover:shadow-lg group-hover:shadow-violet-500/30 dark:shadow-violet-400/10 dark:group-hover:shadow-violet-400/15"
          aria-hidden="true"
        >
          <BookOpen class="h-4 w-4 text-white" />
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-lg font-bold text-gray-900 transition-colors duration-200 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-300">
            Quiz Stack
          </span>
          <span class="text-xs font-medium text-gray-400 dark:text-gray-500" aria-hidden="true">题栈</span>
        </div>
      </button>

      <!-- Navigation + Actions -->
      <nav class="flex items-center gap-0.5 sm:gap-1" aria-label="Main navigation">
        <!-- Wrong Problems link -->
        <button
          type="button"
          class="relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
          :class="isActive('/wrong-problems')
            ? 'text-violet-700 dark:text-violet-300'
            : 'text-slate-600 hover:text-violet-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-violet-300 dark:hover:bg-slate-800/80'"
          aria-label="打开错题本"
          :aria-current="isActive('/wrong-problems') ? 'page' : undefined"
          @click="navigateWrongProblems"
        >
          <RotateCcw class="h-4 w-4" />
          <span class="hidden sm:inline">错题</span>
          <!-- Active indicator bar -->
          <span
            class="absolute bottom-0 left-1/2 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-200 ease-out dark:from-violet-400 dark:to-purple-400"
            :class="isActive('/wrong-problems')
              ? 'w-6 -translate-x-1/2 opacity-100'
              : 'w-0 -translate-x-1/2 opacity-0'"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          class="relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
          :class="isActive('/records')
            ? 'text-violet-700 dark:text-violet-300'
            : 'text-slate-600 hover:bg-slate-100 hover:text-violet-600 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-violet-300'"
          aria-label="打开练习记录"
          :aria-current="isActive('/records') ? 'page' : undefined"
          @click="navigateRecords"
        >
          <History class="h-4 w-4" />
          <span class="hidden sm:inline">记录</span>
          <span
            class="absolute bottom-0 left-1/2 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-200 ease-out dark:from-violet-400 dark:to-purple-400"
            :class="isActive('/records')
              ? 'w-6 -translate-x-1/2 opacity-100'
              : 'w-0 -translate-x-1/2 opacity-0'"
            aria-hidden="true"
          />
        </button>

        <!-- Separator -->
        <div
          class="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700"
          role="separator"
          aria-hidden="true"
        />

        <!-- Style toggle button -->
        <button
          type="button"
          class="relative inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-all duration-200 ease-out hover:text-violet-600 hover:bg-slate-100 active:scale-[0.92] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-400 dark:hover:text-violet-300 dark:hover:bg-slate-800/80 dark:focus-visible:ring-offset-slate-900"
          :class="{ 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20': themeStyle === 'paper' }"
          :aria-label="themeStyle === 'card' ? 'Switch to paper style' : 'Switch to card style'"
          :title="themeStyle === 'card' ? '切换到纸张风格' : '切换到卡片风格'"
          @click="toggleStyle"
        >
          <Layers class="h-4 w-4 transition-transform duration-200" :class="{ 'rotate-180': themeStyle === 'paper' }" />
        </button>

        <!-- Theme toggle button -->
        <button
          type="button"
          class="relative inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-all duration-200 ease-out hover:text-amber-500 hover:bg-amber-50 active:scale-[0.92] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-amber-900/20 dark:focus-visible:ring-offset-slate-900"
          aria-label="Toggle theme"
          :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
          @click="toggleTheme"
        >
          <!-- Keep both icons in DOM for crossfade -->
          <span class="relative h-4 w-4" aria-hidden="true">
            <Sun
              class="absolute inset-0 h-full w-full transition-all duration-300 ease-out"
              :class="isDark
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 rotate-90 scale-50'"
            />
            <Moon
              class="absolute inset-0 h-full w-full transition-all duration-300 ease-out"
              :class="isDark
                ? 'opacity-0 -rotate-90 scale-50'
                : 'opacity-100 rotate-0 scale-100'"
            />
          </span>
        </button>
      </nav>
    </div>
  </header>
</template>
