<script setup lang="ts">
import { Clock } from '@lucide/vue'
import { formatTime } from '@/utils/format'

defineProps<{
  seconds: number
}>()
</script>

<template>
  <span class="inline-flex items-center gap-1 tabular-nums text-sm text-slate-500 dark:text-slate-400">
    <Clock class="h-3.5 w-3.5" />
    {{ formatTime(seconds) }}
  </span>
</template>
