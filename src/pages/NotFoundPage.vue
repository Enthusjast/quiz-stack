<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Home, ArrowLeft, Search, HelpCircle, Puzzle } from '@lucide/vue'

const router = useRouter()
const visible = ref(false)

onMounted(() => {
  // Stagger entrance — trigger after mount so transition classes apply
  requestAnimationFrame(() => {
    visible.value = true
  })
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div
    class="relative flex min-h-[80vh] w-full min-w-0 max-w-full flex-col items-center justify-center overflow-x-clip px-4 py-16 text-center"
  >
    <!-- ===== Main content ===== -->
    <div class="relative z-10 flex flex-col items-center gap-2">

      <!-- Icon badge -->
      <div
        class="paper-surface paper-flat mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 shadow-sm ring-1 ring-blue-200/60 dark:bg-blue-900/30 dark:ring-blue-700/30"
        :class="visible ? 'animate-scale-in' : 'opacity-0'"
      >
        <Puzzle class="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>

      <!-- 404 mega-text -->
      <h1
        class="text-8xl font-extrabold leading-none sm:text-9xl"
        :class="visible ? 'animate-slide-up' : 'opacity-0'"
        style="animation-delay: 150ms"
        aria-label="404"
      >
        <span
          class="paper-display-primary bg-gradient-to-br from-blue-600 via-blue-500 to-violet-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400"
        >4</span><span
          class="paper-display-accent bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent"
        >0</span><span
          class="paper-display-secondary bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-purple-400 dark:to-pink-400"
        >4</span>
      </h1>

      <!-- Title -->
      <h2
        class="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl"
        :class="visible ? 'animate-slide-up' : 'opacity-0'"
        style="animation-delay: 200ms"
      >
        哎呀，页面走丢了
      </h2>

      <!-- Description -->
      <p
        class="mt-1 max-w-md text-base text-slate-500 dark:text-slate-400 sm:text-lg"
        :class="visible ? 'animate-slide-up' : 'opacity-0'"
        style="animation-delay: 250ms"
      >
        你访问的页面可能已被移除、链接已失效，或是你输入了一个神秘的地址。
      </p>

      <!-- Action buttons -->
      <div
        class="mt-8 flex flex-wrap items-center justify-center gap-3"
        :class="visible ? 'animate-slide-up' : 'opacity-0'"
        style="animation-delay: 300ms"
      >
        <button type="button" class="btn btn-primary paper-gradient-primary paper-flat px-5 py-2.5 text-base" @click="router.push('/')">
          <Home class="h-4 w-4" />
          返回首页
        </button>

        <button type="button" class="btn btn-secondary paper-flat px-5 py-2.5 text-base" @click="goBack">
          <ArrowLeft class="h-4 w-4" />
          返回上页
        </button>
      </div>

      <!-- Quick links -->
      <div
        class="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
        :class="visible ? 'animate-fade-in' : 'opacity-0'"
        style="animation-delay: 400ms"
      >
        <router-link
          to="/"
          class="inline-flex items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <Search class="h-3.5 w-3.5" />
          看看题库
        </router-link>

        <a
          href="mailto:hi@horace.space?subject=遇到的问题"
          class="inline-flex items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <HelpCircle class="h-3.5 w-3.5" />
          报告问题
        </a>
      </div>
    </div>
  </div>
</template>
