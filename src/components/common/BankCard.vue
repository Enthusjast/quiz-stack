<script setup lang="ts">
import type { BankEntry } from '@/types/problem'

defineProps<{
  bankId: string
  bank: BankEntry
}>()

const emit = defineEmits<{
  select: [bankId: string]
}>()
</script>

<template>
  <button
    class="card w-full text-left cursor-pointer group"
    @click="emit('select', bankId)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <h3 class="text-base font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors truncate">
          {{ bank.title }}
        </h3>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <span
            v-for="cat in bank.categories"
            :key="cat"
            class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            {{ cat }}
          </span>
        </div>
      </div>
      <div class="shrink-0 text-right">
        <span class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
          {{ bank.questionCount }}
        </span>
        <span class="block text-xs text-gray-500 dark:text-gray-400">题</span>
      </div>
    </div>
  </button>
</template>