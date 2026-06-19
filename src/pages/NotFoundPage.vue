<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Home } from '@lucide/vue'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
    <p class="text-8xl font-bold text-gray-200 dark:text-gray-800">404</p>
    <h1 class="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">页面未找到</h1>
    <p class="mt-2 text-gray-500 dark:text-gray-400">你访问的页面不存在或已被移除</p>
    <button class="btn btn-primary mt-6" @click="router.push('/')">
      <Home class="h-4 w-4" />
      返回首页
    </button>
  </div>
</template>