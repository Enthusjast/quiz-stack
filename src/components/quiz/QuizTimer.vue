<script setup lang="ts">
import { formatTime } from '@/utils/format'

defineProps<{
  seconds: number
}>()
</script>

<template>
  <span class="tabular-nums text-sm text-gray-500 dark:text-gray-400">
    ⏱ {{ formatTime(seconds) }}
  </span>
</template>