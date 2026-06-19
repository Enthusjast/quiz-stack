<script setup lang="ts">
defineProps<{
  currentIndex: number
  totalCount: number
  correctCount: number
  attemptedCount: number
  accuracy: number
}>()
</script>

<template>
  <div class="space-y-3">
    <!-- Progress bar -->
    <div class="flex items-center gap-3">
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          class="h-full rounded-full bg-indigo-500 transition-all duration-300"
          :style="{ width: totalCount > 0 ? ((currentIndex + 1) / totalCount * 100) + '%' : '0%' }"
        />
      </div>
      <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">
        {{ currentIndex + 1 }}/{{ totalCount }}
      </span>
    </div>

    <!-- Stats -->
    <div class="flex flex-wrap gap-3 text-sm">
      <span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-green-700 dark:bg-green-900/50 dark:text-green-400">
        正确 {{ correctCount }}
      </span>
      <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
        已做 {{ attemptedCount }}
      </span>
      <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        正确率 {{ accuracy }}%
      </span>
    </div>
  </div>
</template>