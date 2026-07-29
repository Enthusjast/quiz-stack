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
      <div class="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          class="paper-gradient-primary h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          :style="{ width: totalCount > 0 ? ((currentIndex + 1) / totalCount * 100) + '%' : '0%' }"
        />
      </div>
      <span class="text-xs tabular-nums font-medium text-slate-500 dark:text-slate-400 min-w-[3rem] text-right">
        {{ totalCount > 0 ? Math.round((currentIndex + 1) / totalCount * 100) : 0 }}%
      </span>
    </div>

    <!-- Stats -->
    <div class="flex flex-wrap gap-2 text-sm">
      <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
        正确 {{ correctCount }}
      </span>
      <span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
        已做 {{ attemptedCount }}
      </span>
      <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        正确率 {{ accuracy }}%
      </span>
    </div>
  </div>
</template>
