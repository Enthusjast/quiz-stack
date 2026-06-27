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
    class="relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden px-4 py-16 text-center"
  >
    <!-- ===== Decorative background blobs ===== -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <!-- Top-right blob -->
      <div
        class="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-200/30 opacity-60 blur-3xl dark:bg-blue-500/10"
        :class="{ 'animate-fade-in': visible }"
        style="animation-delay: 100ms"
      />
      <!-- Bottom-left blob -->
      <div
        class="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-amber-200/30 opacity-50 blur-3xl dark:bg-amber-500/10"
        :class="{ 'animate-fade-in': visible }"
        style="animation-delay: 200ms"
      />
      <!-- Center accent blob -->
      <div
        class="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/20 opacity-40 blur-3xl dark:bg-violet-500/8"
        :class="{ 'animate-fade-in': visible }"
        style="animation-delay: 150ms"
      />
    </div>

    <!-- ===== Floating geometric decorations ===== -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <!-- Small square -->
      <div
        class="absolute left-[10%] top-[18%] h-4 w-4 rotate-12 rounded-sm border-2 border-blue-300/60 opacity-50 dark:border-blue-500/30"
        :class="{ 'animate-slide-up': visible }"
        style="animation-delay: 300ms"
      />
      <!-- Small circle -->
      <div
        class="absolute right-[12%] top-[22%] h-3 w-3 rounded-full border-2 border-amber-300/60 opacity-40 dark:border-amber-500/25"
        :class="{ 'animate-slide-up': visible }"
        style="animation-delay: 400ms"
      />
      <!-- Dash line decoration -->
      <div
        class="absolute bottom-[20%] left-[15%] h-0.5 w-12 rotate-12 rounded-full bg-blue-300/40 dark:bg-blue-500/20"
        :class="{ 'animate-slide-up': visible }"
        style="animation-delay: 500ms"
      />
      <!-- Dot grid -->
      <div
        class="absolute bottom-[25%] right-[10%] h-1.5 w-1.5 rounded-full bg-amber-400/50 dark:bg-amber-400/25"
        :class="{ 'animate-slide-up': visible }"
        style="animation-delay: 450ms"
      />
    </div>

    <!-- ===== Main content ===== -->
    <div class="relative z-10 flex flex-col items-center gap-2">

      <!-- Icon badge -->
      <div
        class="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 shadow-sm ring-1 ring-blue-200/60 dark:bg-blue-900/30 dark:ring-blue-700/30"
        :class="visible ? 'animate-scale-in' : 'opacity-0'"
      >
        <Puzzle class="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>

      <!-- 404 mega-text -->
      <h1
        class="text-[clamp(7rem,18vw,13rem)] font-extrabold leading-none tracking-tighter"
        :class="visible ? 'animate-slide-up' : 'opacity-0'"
        style="animation-delay: 150ms"
        aria-label="404"
      >
        <span
          class="bg-gradient-to-br from-blue-600 via-blue-500 to-violet-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400"
        >4</span><span
          class="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent"
        >0</span><span
          class="bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-purple-400 dark:to-pink-400"
        >4</span>
      </h1>

      <!-- Title -->
      <h2
        class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl"
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
        <button class="btn btn-primary text-base px-5 py-2.5" @click="router.push('/')">
          <Home class="h-4 w-4" />
          返回首页
        </button>

        <button class="btn btn-secondary text-base px-5 py-2.5" @click="goBack">
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
