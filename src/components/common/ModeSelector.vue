<script setup lang="ts">
import { ref } from 'vue'
import type { PracticeMode, CustomPracticeConfig } from '@/types/problem'
import { PROBLEM_TYPE_LABELS } from '@/types/problem'
import { X, ArrowLeft, Settings2 } from '@lucide/vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [mode: PracticeMode]
  'confirm-custom': [config: CustomPracticeConfig]
}>()

// ---- custom practice sub-panel state ----
const showCustomPanel = ref(false)
const enabledTypes = ref<Record<number, boolean>>({
  0: true,
  1: true,
  2: true,
  3: true,
  4: true,
})
const shuffleEnabled = ref(true)

function openCustomPanel() {
  showCustomPanel.value = true
}

function closeCustomPanel() {
  showCustomPanel.value = false
}

function toggleType(type: number) {
  enabledTypes.value[type] = !enabledTypes.value[type]
}

function confirmCustom() {
  const types = Object.entries(enabledTypes.value)
    .filter(([, v]) => v)
    .map(([k]) => Number(k))

  if (types.length === 0) {
    // At least one type must be selected — enable single choice by default
    enabledTypes.value[1] = true
    return
  }

  emit('confirm-custom', {
    enabledTypes: types,
    shuffle: shuffleEnabled.value,
  })
  showCustomPanel.value = false
}
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
        <!-- Main mode list -->
        <template v-if="!showCustomPanel">
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

            <button
              class="card w-full text-left cursor-pointer group"
              @click="emit('confirm', 'mock-exam')"
            >
              <h3 class="font-semibold text-gray-900 dark:text-white">📝 模拟考试</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">限时作答，交卷后统一判分，支持分题型计分</p>
            </button>

            <button
              class="card w-full text-left cursor-pointer group"
              @click="openCustomPanel"
            >
              <h3 class="font-semibold text-gray-900 dark:text-white">
                <Settings2 class="inline h-4 w-4 mr-1" />
                自定义练习
              </h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">选择特定题型和乱序方式，量身定制练习内容</p>
            </button>
          </div>
        </template>

        <!-- Custom practice sub-panel -->
        <template v-else>
          <div class="flex items-center gap-3 mb-4">
            <button class="btn btn-ghost p-1" @click="closeCustomPanel">
              <ArrowLeft class="h-5 w-5" />
            </button>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">自定义练习</h2>
          </div>

          <div class="space-y-5">
            <!-- Type toggles -->
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">选择题型</p>
              <div class="space-y-2">
                <label
                  v-for="type in [0, 1, 2, 3, 4]"
                  :key="type"
                  class="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  :class="enabledTypes[type] ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-700' : ''"
                >
                  <div class="relative">
                    <input
                      type="checkbox"
                      :checked="enabledTypes[type]"
                      class="sr-only"
                      @change="toggleType(type)"
                    />
                    <div
                      class="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors"
                      :class="enabledTypes[type]
                        ? 'border-indigo-500 bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-400'
                        : 'border-gray-300 dark:border-gray-600'"
                    >
                      <svg v-if="enabledTypes[type]" class="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <span class="text-sm text-gray-700 dark:text-gray-300">
                    {{ PROBLEM_TYPE_LABELS[type] }}
                  </span>
                </label>
              </div>
            </div>

            <!-- Shuffle toggle -->
            <div class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 dark:border-gray-700">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">乱序出题</span>
              <button
                type="button"
                role="switch"
                :aria-checked="shuffleEnabled"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                :class="shuffleEnabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'"
                @click="shuffleEnabled = !shuffleEnabled"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200"
                  :class="shuffleEnabled ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>

            <!-- Confirm -->
            <button class="btn btn-primary w-full text-base py-2.5" @click="confirmCustom">
              开始练习
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
