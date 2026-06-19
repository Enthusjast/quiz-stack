<script setup lang="ts">
import type { PracticeMode } from '@/types/problem'
import { X } from '@lucide/vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [mode: PracticeMode]
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      @click.self="emit('close')"
    >
      <div
        class="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-900 sm:rounded-2xl sm:m-4"
        @click.stop
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">选择练习模式</h2>
          <button class="btn btn-ghost p-1" @click="emit('close')">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="space-y-3">
          <button
            class="card w-full text-left cursor-pointer group"
            @click="emit('confirm', 'sequential')"
          >
            <h3 class="font-semibold text-gray-900 dark:text-white">📋 顺序练习</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">按照题库原始顺序逐题练习，选择题选项会随机打乱</p>
          </button>

          <button
            class="card w-full text-left cursor-pointer group"
            @click="emit('confirm', 'random')"
          >
            <h3 class="font-semibold text-gray-900 dark:text-white">🔀 乱序练习</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">题目和选项顺序完全随机，全面检验知识掌握</p>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>