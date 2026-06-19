<script setup lang="ts">
import { computed } from 'vue'
import type { PreparedProblem, ProblemState, UserAnswer } from '@/types/problem'
import { formatTime } from '@/utils/format'
import { CircleCheckBig, RotateCcw } from '@lucide/vue'

const props = defineProps<{
  problems: PreparedProblem[]
  problemStates: ProblemState[]
  answers: UserAnswer[]
  elapsedSeconds: number
}>()

const emit = defineEmits<{
  reset: []
}>()

interface ResultItem {
  problem: PreparedProblem
  state: ProblemState
  answer: UserAnswer
  isCorrect: boolean
}

const results = computed<ResultItem[]>(() =>
  props.problems.map((p, i) => ({
    problem: p,
    state: props.problemStates[i] ?? 0,
    answer: props.answers[i] ?? null,
    isCorrect: props.problemStates[i] === 2,
  }))
)

const correctCount = computed(() => results.value.filter((r) => r.isCorrect).length)
const totalCount = computed(() => results.value.length)
const score = computed(() =>
  totalCount.value > 0 ? Math.round((correctCount.value / totalCount.value) * 100) : 0
)

function formatAnswer(ans: UserAnswer): string {
  if (ans === null || ans === undefined) return '未作答'
  if (Array.isArray(ans)) return ans.map((n) => String.fromCharCode(65 + n)).join(', ')
  return String(ans)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Score card -->
    <div class="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center text-white">
      <p class="text-lg opacity-90">答题完成！</p>
      <p class="mt-2 text-5xl font-bold tabular-nums">{{ score }}</p>
      <p class="text-sm opacity-80">正确率</p>
      <div class="mt-4 flex justify-center gap-6 text-sm">
        <span>{{ correctCount }} 正确</span>
        <span>{{ totalCount - correctCount }} 错误</span>
        <span>用时 {{ formatTime(elapsedSeconds) }}</span>
      </div>
    </div>

    <!-- Wrong list -->
    <div v-if="results.some(r => !r.isCorrect)" class="space-y-3">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">错题回顾</h3>
      <div
        v-for="(r, idx) in results.filter(r => !r.isCorrect)"
        :key="idx"
        class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30"
      >
        <p class="text-sm text-gray-800 dark:text-gray-200">{{ r.problem.original.content }}</p>
        <p class="mt-1 text-xs text-red-600 dark:text-red-400">你的答案：{{ formatAnswer(r.answer) }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">正确答案：{{ formatAnswer(r.problem.mappedAnswer) }}</p>
      </div>
    </div>

    <!-- All correct -->
    <div v-else class="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950/30">
      <CircleCheckBig class="mx-auto h-10 w-10 text-green-500" />
      <p class="mt-2 text-green-700 dark:text-green-400 font-medium">全部正确，太厉害了！🎉</p>
    </div>

    <!-- Actions -->
    <div class="flex justify-center gap-3">
      <button class="btn btn-primary" @click="emit('reset')">
        <RotateCcw class="h-4 w-4" />
        重新开始
      </button>
    </div>
  </div>
</template>