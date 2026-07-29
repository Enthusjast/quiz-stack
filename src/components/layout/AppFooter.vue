<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const currentYear = new Date().getFullYear()

const quickLinks = [
  { label: '首页', to: '/' },
  { label: '错题本', to: '/wrong-problems' },
]

const techStack = [
  { name: 'Vue 3', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { name: 'TypeScript', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { name: 'Tailwind CSS', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  { name: 'Vite', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
]

function navigate(to: string) {
  router.push(to)
}
</script>

<template>
  <footer
    class="relative mt-auto min-w-0 max-w-full overflow-hidden border-t border-transparent"
    role="contentinfo"
    aria-label="Site footer"
  >
    <!-- Gradient top border line -->
    <div
      class="paper-gradient-primary paper-flat absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent dark:via-indigo-300/40"
      aria-hidden="true"
    />

    <!-- Background gradient -->
    <div
      class="paper-surface-strong absolute inset-0 bg-gradient-to-b from-slate-50/80 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-950"
      aria-hidden="true"
    />

    <div class="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <!-- Top row: multi-column on desktop, stacked on mobile -->
      <div class="grid gap-10 sm:grid-cols-3 sm:gap-8">
        <!-- Column 1: Brand -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2.5">
            <!-- Logo icon -->
            <div
              class="paper-gradient-primary paper-flat flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 dark:shadow-indigo-400/10"
              aria-hidden="true"
            >
              <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span class="text-lg font-bold text-gray-900 dark:text-white">
                Quiz Stack
              </span>
              <span class="ml-1 text-sm font-medium text-gray-400 dark:text-gray-500">题栈</span>
            </div>
          </div>
          <p class="max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            高效刷题，智能自测。用题栈记录每一次进步，让学习更轻松。
          </p>
        </div>

        <!-- Column 2: Quick Links -->
        <div class="flex flex-col gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            快速导航
          </h3>
          <ul class="flex flex-col gap-2">
            <li v-for="link in quickLinks" :key="link.to">
              <button
                type="button"
                class="group relative inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors duration-200 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 rounded dark:text-gray-400 dark:hover:text-indigo-400"
                @click="navigate(link.to)"
              >
                <span
                  class="paper-gradient-primary paper-flat absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 group-hover:w-full dark:from-indigo-400 dark:to-purple-400"
                  aria-hidden="true"
                />
                <svg class="h-3.5 w-3.5 text-gray-400 transition-colors duration-200 group-hover:text-indigo-500 dark:text-gray-500 dark:group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                {{ link.label }}
              </button>
            </li>
          </ul>
        </div>

        <!-- Column 3: Tech Stack + GitHub -->
        <div class="flex flex-col gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            技术栈
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="tech in techStack"
              :key="tech.name"
              :class="tech.color"
              class="paper-no-lift inline-flex select-none rounded-md px-2 py-0.5 text-xs font-medium transition-transform duration-200 hover:scale-105"
            >
              {{ tech.name }}
            </span>
          </div>
          <a
            href="https://github.com/Enthusjast/quiz-stack"
            target="_blank"
            rel="noopener noreferrer"
            class="paper-surface paper-flat paper-no-lift group mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800/80"
          >
            <svg class="h-4 w-4 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8"/>
            </svg>
            <span class="relative">
              GitHub
              <span
                class="paper-gradient-primary paper-flat absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 group-hover:w-full dark:from-indigo-400 dark:to-purple-400"
                aria-hidden="true"
              />
            </span>
            <svg class="h-3 w-3 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 -translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      <!-- Bottom bar: copyright -->
      <div class="mt-10 border-t border-gray-200 pt-6 dark:border-gray-800">
        <p class="text-center text-xs text-gray-400 dark:text-gray-500">
          &copy; {{ currentYear }} Quiz Stack &mdash; 题栈. Open source under the
          <a
            href="https://github.com/Enthusjast/quiz-stack/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            class="underline decoration-gray-300 underline-offset-2 transition-colors duration-200 hover:text-gray-600 hover:decoration-gray-400 dark:decoration-gray-700 dark:hover:text-gray-300 dark:hover:decoration-gray-500"
          >MIT License</a>.
        </p>
      </div>
    </div>
  </footer>
</template>
