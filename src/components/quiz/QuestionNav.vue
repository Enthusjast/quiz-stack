<script setup lang="ts">
import type { ProblemState } from '@/types/problem'

const props = defineProps<{
  problemStates: ProblemState[]
  currentIndex: number
}>()

const emit = defineEmits<{
  goTo: [index: number]
}>()

function stateColor(state: ProblemState): string {
  switch (state) {
    case 0: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    case 1: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    case 2: return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
    case 3: return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
  }
}

function stateRing(index: number): string {
  return index === props.currentIndex
    ? 'ring-2 ring-indigo-400 dark:ring-indigo-500'
    : ''
}
</script>

<template>
  <div class="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
    <button
      v-for="(state, idx) in problemStates"
      :key="idx"
      @click="emit('goTo', idx)"
      :class="[
        'flex h-8 w-8 items-center justify-center rounded-md text-xs font-mono font-medium transition-all hover:scale-105',
        stateColor(state),
        stateRing(idx),
      ]"
      :title="`第 ${idx + 1} 题`"
    >
      {{ idx + 1 }}
    </button>
  </div>
</template>