<script setup lang="ts">
import { computed } from 'vue'
import type { PreparedProblem, ProblemState, UserAnswer, MockExamSection } from '@/types/problem'
import { formatTime } from '@/utils/format'
import { CircleCheckBig, RotateCcw, Trophy } from '@lucide/vue'

const props = defineProps<{
  problems: PreparedProblem[]
  problemStates: ProblemState[]
  answers: UserAnswer[]
  elapsedSeconds: number
  /** Mock exam section breakdown (only for mock-exam mode) */
  examSections?: MockExamSection[]
  /** Mock exam total possible score */
  examTotalScore?: number
  /** Mock exam earned score */
  examEarnedScore?: number
}>()

const emit = defineEmits<{
  reset: []
}>()

const isExam = computed(() => (props.examSections?.length ?? 0) > 0)

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

function formatAnswer(ans: UserAnswer | null | undefined): string {
  if (ans === null || ans === undefined) return '未作答'
  if (Array.isArray(ans)) return ans.map((n) => String.fromCharCode(65 + n)).join(', ')
  return String(ans)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Score card -->
    <div class="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center text-white">
      <p class="text-lg opacity-90">{{ isExam ? '考试完成！' : '答题完成！' }}</p>

      <!-- Mock exam: show earned/total score -->
      <div v-if="isExam && examTotalScore" class="mt-2">
        <div class="flex items-baseline justify-center gap-2">
          <span class="text-5xl font-bold tabular-nums">{{ examEarnedScore }}</span>
          <span class="text-2xl opacity-70">/ {{ examTotalScore }}</span>
        </div>
        <p class="text-sm opacity-80 mt-1">
          得分率 {{ examTotalScore > 0 ? Math.round((examEarnedScore! / examTotalScore) * 100) : 0 }}%
        </p>
      </div>

      <!-- Standard mode: show percentage -->
      <template v-else>
        <p class="mt-2 text-5xl font-bold tabular-nums">{{ score }}</p>
        <p class="text-sm opacity-80">正确率</p>
      </template>

      <div class="mt-4 flex justify-center gap-6 text-sm">
        <span>{{ correctCount }} 正确</span>
        <span>{{ totalCount - correctCount }} 错误</span>
        <span>用时 {{ formatTime(elapsedSeconds) }}</span>
      </div>
    </div>

    <!-- Mock exam: per-section score breakdown -->
    <div v-if="isExam && examSections && examSections.length > 0">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">成绩明细</h3>
      <div class="rounded-lg border border-gray-200 overflow-hidden dark:border-gray-700">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 dark:bg-gray-800">
              <th class="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">题型</th>
              <th class="px-4 py-2.5 text-center font-medium text-gray-600 dark:text-gray-400">题数</th>
              <th class="px-4 py-2.5 text-center font-medium text-gray-600 dark:text-gray-400">每题分值</th>
              <th class="px-4 py-2.5 text-center font-medium text-gray-600 dark:text-gray-400">得分</th>
              <th class="px-4 py-2.5 text-center font-medium text-gray-600 dark:text-gray-400">满分</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(section, idx) in examSections"
              :key="idx"
              class="border-t border-gray-100 dark:border-gray-800"
              :class="idx % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''"
            >
              <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {{ section.typeLabel }}
              </td>
              <td class="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                {{ section.count }}
              </td>
              <td class="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                {{ section.scorePerProblem }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="font-semibold tabular-nums"
                  :class="section.correct === section.count && section.count > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-900 dark:text-white'"
                >
                  {{ section.correct * section.scorePerProblem }}
                </span>
              </td>
              <td class="px-4 py-3 text-center text-gray-500 dark:text-gray-400 tabular-nums">
                {{ section.totalScore }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
              <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">合计</td>
              <td class="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                {{ examSections.reduce((s, sec) => s + sec.count, 0) }}
              </td>
              <td class="px-4 py-3"></td>
              <td class="px-4 py-3 text-center font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {{ examEarnedScore }}
              </td>
              <td class="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white tabular-nums">
                {{ examTotalScore }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Trophy for perfect score -->
      <div
        v-if="examTotalScore && examEarnedScore === examTotalScore"
        class="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
      >
        <Trophy class="h-6 w-6 text-amber-500" />
        <span class="text-amber-800 dark:text-amber-300 font-semibold">满分！太厉害了！🎉</span>
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
