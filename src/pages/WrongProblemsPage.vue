<script setup lang="ts">
import { ref } from 'vue'
import { useWrongProblems } from '@/composables/useWrongProblems'
import { useRouter } from 'vue-router'
import { ArrowLeft, Trash2, Download, Upload } from '@lucide/vue'
import type { Problem } from '@/types/problem'
import { PROBLEM_TYPE_LABELS, CHOICE_LETTERS } from '@/types/problem'

const router = useRouter()
const { wrongProblems, count, removeWrong, clearAll, exportJSON, importJSON } = useWrongProblems()
const importMessage = ref<string | null>(null)

function formatAnswer(p: Problem): string {
  if (p.type === 3) return p.answer as string
  if (p.type === 2) return (p.answer as number[]).map((n) => CHOICE_LETTERS[n]).join(', ')
  return CHOICE_LETTERS[p.answer as number]
}

function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importJSON(file).then(({ success, count }) => {
    importMessage.value = success
      ? `成功导入，当前共 ${count} 道错题`
      : '导入失败，请检查文件格式'
    input.value = ''
  })
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 pb-16">
    <!-- Header -->
    <div class="flex items-center justify-between py-6">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost p-1.5" @click="router.push('/')">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">错题本</h1>
        <span class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/50 dark:text-red-400">
          {{ count }} 题
        </span>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="count === 0" class="py-16 text-center">
      <p class="text-lg text-gray-500 dark:text-gray-400">还没有错题，继续练习吧！</p>
      <button class="btn btn-primary mt-4" @click="router.push('/')">去刷题</button>
    </div>

    <!-- Actions -->
    <div v-else class="mb-6 flex flex-wrap gap-2">
      <button class="btn btn-secondary text-sm" @click="exportJSON">
        <Download class="h-4 w-4" />
        导出
      </button>
      <label class="btn btn-secondary text-sm cursor-pointer">
        <Upload class="h-4 w-4" />
        导入
        <input
          type="file"
          accept=".json"
          class="hidden"
          @change="handleImport"
        />
      </label>
      <button class="btn btn-ghost text-sm text-red-500 hover:text-red-700 dark:text-red-400" @click="clearAll">
        <Trash2 class="h-4 w-4" />
        清空
      </button>
      <span v-if="importMessage" class="ml-2 self-center text-sm text-gray-500 dark:text-gray-400">
        {{ importMessage }}
      </span>
    </div>

    <!-- Wrong problem list -->
    <div v-if="count > 0" class="space-y-3">
      <div
        v-for="(problem, idx) in wrongProblems"
        :key="idx"
        class="card flex items-start justify-between gap-4"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {{ PROBLEM_TYPE_LABELS[problem.type] }}
            </span>
          </div>
          <p class="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{{ problem.content }}</p>
          <p class="mt-1 text-xs text-green-600 dark:text-green-400">
            正确答案：{{ formatAnswer(problem) }}
          </p>
          <p v-if="problem.hint" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
            解析：{{ problem.hint }}
          </p>
        </div>
        <button
          class="btn btn-ghost p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0"
          @click="removeWrong(problem)"
          title="移出错题本"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>