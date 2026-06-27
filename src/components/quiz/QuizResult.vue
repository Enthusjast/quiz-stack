<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { PreparedProblem, ProblemState, UserAnswer, MockExamSection } from '@/types/problem'
import { CHOICE_LETTERS } from '@/types/problem'
import { formatTime } from '@/utils/format'
import {
  CircleCheckBig,
  RotateCcw,
  Trophy,
  Sparkles,
  Medal,
  Zap,
  Star,
  Timer,
  Target,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
  CheckCheck,
  ListChecks,
  Check,
  X,
  AlertTriangle,
} from '@lucide/vue'

const props = defineProps<{
  problems: PreparedProblem[]
  problemStates: ProblemState[]
  answers: UserAnswer[]
  elapsedSeconds: number
  examSections?: MockExamSection[]
  examTotalScore?: number
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
const scorePercentage = computed(() =>
  totalCount.value > 0 ? Math.round((correctCount.value / totalCount.value) * 100) : 0
)

const examPercentage = computed(() =>
  props.examTotalScore && props.examTotalScore > 0
    ? Math.round((props.examEarnedScore! / props.examTotalScore) * 100)
    : 0
)

const displayScore = computed(() => (isExam.value ? examPercentage.value : scorePercentage.value))

// ── Animated counter ──
const animatedScore = ref(0)
const cardVisible = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    cardVisible.value = true
    const target = displayScore.value
    const duration = 1400
    const startTime = performance.now()
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      animatedScore.value = Math.round(eased * target)
      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
  })
})

watch(displayScore, (val) => {
  animatedScore.value = val
})

// ── Performance tier ──
type Tier = {
  label: string
  color: string
  icon: typeof Trophy
  bg: string
  border: string
}

const tier = computed<Tier>(() => {
  const s = displayScore.value
  if (s >= 95) return { label: '传奇', color: 'text-amber-600 dark:text-amber-400', icon: Sparkles, bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-700' }
  if (s >= 85) return { label: '大师', color: 'text-purple-600 dark:text-purple-400', icon: Medal, bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700' }
  if (s >= 70) return { label: '达人', color: 'text-blue-600 dark:text-blue-400', icon: Zap, bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700' }
  if (s >= 50) return { label: '学徒', color: 'text-teal-600 dark:text-teal-400', icon: Star, bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-300 dark:border-teal-700' }
  return { label: '萌新', color: 'text-slate-500 dark:text-slate-400', icon: BookOpen, bg: 'bg-slate-50 dark:bg-slate-800/40', border: 'border-slate-300 dark:border-slate-700' }
})

// ── SVG ring geometry ──
const ringRadius = 54
const ringCircumference = 2 * Math.PI * ringRadius
const ringOffset = computed(() => ringCircumference * (1 - displayScore.value / 100))

const isExamPerfect = computed(() =>
  isExam.value && props.examTotalScore ? props.examEarnedScore === props.examTotalScore : displayScore.value === 100
)

// ── Wrong-item expandable hints ──
const wrongItems = computed(() => results.value.filter((r) => !r.isCorrect))
const expandedWrong = ref<Record<number, boolean>>({})

function toggleWrong(idx: number) {
  expandedWrong.value[idx] = !expandedWrong.value[idx]
}

// ── Helpers ──
function formatAnswer(ans: UserAnswer | null | undefined, problem?: PreparedProblem): string {
  if (ans === null || ans === undefined) return '未作答'

  if (problem?.original.type === 3) return String(ans)

  if (typeof ans === 'number') {
    const letter = CHOICE_LETTERS[ans] ?? String(ans)
    const text = problem?.shuffledChoices[ans]
    return text ? `${letter}. ${text}` : letter
  }

  if (Array.isArray(ans)) {
    return ans
      .map((n) => {
        const letter = CHOICE_LETTERS[n] ?? String(n)
        const text = problem?.shuffledChoices[n]
        return text ? `${letter}. ${text}` : letter
      })
      .join('、')
  }

  return String(ans)
}

const avgTimePerQ = computed(() =>
  totalCount.value > 0 ? Math.round(props.elapsedSeconds / totalCount.value) : 0
)

const hasWrong = computed(() => wrongItems.value.length > 0)

const questionTypeLabel: Record<number, string> = { 1: '单选', 2: '多选', 3: '填空', 4: '判断' }
</script>

<template>
  <div class="space-y-8">
    <!-- ═══════ Score Card ═══════ -->
    <div
      class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-8 text-white shadow-xl shadow-purple-500/20 transition-all duration-700 dark:shadow-purple-900/30"
      :class="cardVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'"
    >
      <!-- Decorative blobs -->
      <div class="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />

      <div class="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
        <!-- SVG Ring chart -->
        <div class="relative flex shrink-0 items-center justify-center">
          <svg class="h-32 w-32 -rotate-90" viewBox="0 0 120 120" aria-label="成绩圆环图">
            <!-- Background ring -->
            <circle
              cx="60" cy="60" :r="ringRadius"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              stroke-width="8"
              stroke-linecap="round"
            />
            <!-- Progress ring -->
            <circle
              cx="60" cy="60" :r="ringRadius"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              stroke-linecap="round"
              class="text-amber-300 transition-[stroke-dashoffset] duration-1000 ease-out"
              :style="{
                strokeDasharray: ringCircumference,
                strokeDashoffset: ringOffset,
              }"
            />
            <!-- Glow ring -->
            <circle
              cx="60" cy="60" :r="ringRadius"
              fill="none"
              stroke="rgba(252,211,77,0.3)"
              stroke-width="14"
              stroke-linecap="round"
              class="transition-[stroke-dashoffset] duration-1000 ease-out"
              :style="{
                strokeDasharray: ringCircumference,
                strokeDashoffset: ringOffset,
              }"
            />
          </svg>
          <!-- Score text in center of ring -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-3xl font-bold tabular-nums leading-none">
              {{ animatedScore }}
            </span>
            <span class="text-xs font-medium opacity-70">分</span>
          </div>
        </div>

        <!-- Title + stats -->
        <div class="flex flex-col items-center text-center sm:items-start sm:text-left">
          <p class="text-lg font-semibold tracking-wide opacity-90">
            {{ isExam ? '考试完成' : '答题完成' }}
          </p>

          <!-- Exam mode numeric score -->
          <div v-if="isExam && examTotalScore" class="mt-1 flex items-baseline gap-1.5">
            <span class="text-3xl font-bold tabular-nums">{{ examEarnedScore }}</span>
            <span class="text-lg opacity-60">/ {{ examTotalScore }}</span>
          </div>

          <!-- Tier badge -->
          <div
            class="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold backdrop-blur-sm"
            :class="[tier.bg, tier.border, tier.color]"
            style="border-width: 1px;"
          >
            <component :is="tier.icon" class="h-4 w-4" />
            {{ tier.label }}
          </div>

          <!-- Stat pills -->
          <div class="mt-4 flex flex-wrap justify-center gap-4 text-xs sm:justify-start">
            <span class="inline-flex items-center gap-1 opacity-80">
              <CheckCheck class="h-3.5 w-3.5" />
              {{ correctCount }} 正确
            </span>
            <span class="inline-flex items-center gap-1 opacity-80">
              <X class="h-3.5 w-3.5" />
              {{ totalCount - correctCount }} 错误
            </span>
            <span class="inline-flex items-center gap-1 opacity-80">
              <Timer class="h-3.5 w-3.5" />
              {{ formatTime(elapsedSeconds) }}
            </span>
            <span class="inline-flex items-center gap-1 opacity-80">
              <Target class="h-3.5 w-3.5" />
              {{ avgTimePerQ }}s/题
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════ Mock Exam Section Breakdown ═══════ -->
    <div v-if="isExam && examSections && examSections.length > 0" class="space-y-4">
      <div class="flex items-center gap-2">
        <ListChecks class="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">成绩明细</h3>
      </div>

      <!-- Desktop table -->
      <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/80 sm:block">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800">
              <th class="px-5 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">题型</th>
              <th class="px-5 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">题数</th>
              <th class="px-5 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">分值/题</th>
              <th class="px-5 py-3 text-center font-semibold text-gray-600 dark:text-gray-400" style="width: 180px;">正确率</th>
              <th class="px-5 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">得分</th>
              <th class="px-5 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">满分</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(section, idx) in examSections"
              :key="idx"
              class="border-t border-gray-100 transition-colors hover:bg-gray-50/50 dark:border-gray-700/50 dark:hover:bg-gray-750/40"
            >
              <td class="px-5 py-3.5">
                <span class="font-semibold text-gray-900 dark:text-white">{{ section.typeLabel }}</span>
              </td>
              <td class="px-5 py-3.5 text-center text-gray-600 dark:text-gray-400 tabular-nums">
                {{ section.count }}
              </td>
              <td class="px-5 py-3.5 text-center text-gray-600 dark:text-gray-400 tabular-nums">
                {{ section.scorePerProblem }}
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2">
                  <!-- Mini progress bar -->
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      class="h-full rounded-full transition-all duration-700 ease-out"
                      :class="section.count > 0 && section.correct === section.count
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : section.correct > 0
                          ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
                          : 'bg-gray-300 dark:bg-gray-600'"
                      :style="{ width: section.count > 0 ? (section.correct / section.count * 100) + '%' : '0%' }"
                    />
                  </div>
                  <span class="w-12 text-right text-xs tabular-nums font-medium text-gray-500 dark:text-gray-400">
                    {{ section.count > 0 ? Math.round(section.correct / section.count * 100) : 0 }}%
                  </span>
                </div>
              </td>
              <td class="px-5 py-3.5 text-center tabular-nums">
                <span
                  class="font-bold"
                  :class="section.correct === section.count && section.count > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : section.correct > 0
                      ? 'text-gray-900 dark:text-white'
                      : 'text-red-500 dark:text-red-400'"
                >
                  {{ section.correct * section.scorePerProblem }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-center text-gray-500 dark:text-gray-400 tabular-nums font-medium">
                {{ section.totalScore }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-800">
              <td class="px-5 py-3.5 font-bold text-gray-900 dark:text-white">合计</td>
              <td class="px-5 py-3.5 text-center font-semibold text-gray-600 dark:text-gray-400 tabular-nums">
                {{ examSections.reduce((s, sec) => s + sec.count, 0) }}
              </td>
              <td class="px-5 py-3.5"></td>
              <td class="px-5 py-3.5 text-center font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {{ displayScore }}%
              </td>
              <td class="px-5 py-3.5 text-center text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {{ examEarnedScore }}
              </td>
              <td class="px-5 py-3.5 text-center font-bold text-gray-900 dark:text-white tabular-nums">
                {{ examTotalScore }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Mobile card-based section breakdown -->
      <div class="space-y-3 sm:hidden">
        <div
          v-for="(section, idx) in examSections"
          :key="idx"
          class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="font-semibold text-gray-900 dark:text-white">{{ section.typeLabel }}</span>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-bold"
              :class="section.correct === section.count && section.count > 0
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'"
            >
              {{ section.correct * section.scorePerProblem }} / {{ section.totalScore }}
            </span>
          </div>
          <div class="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :class="section.count > 0 && section.correct === section.count
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                : 'bg-gradient-to-r from-blue-400 to-indigo-500'"
              :style="{ width: section.count > 0 ? (section.correct / section.count * 100) + '%' : '0%' }"
            />
          </div>
          <div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{{ section.count }} 题 (每题 {{ section.scorePerProblem }} 分)</span>
            <span class="font-medium">{{ section.count > 0 ? Math.round(section.correct / section.count * 100) : 0 }}%</span>
          </div>
        </div>
        <!-- Mobile total -->
        <div class="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
          <div class="flex items-center justify-between">
            <span class="font-bold text-indigo-700 dark:text-indigo-300">合计</span>
            <span class="text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {{ examEarnedScore }} / {{ examTotalScore }}
            </span>
          </div>
        </div>
      </div>

      <!-- Perfect exam trophy -->
      <div
        v-if="isExamPerfect"
        class="flex items-center justify-center gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 p-5 shadow-lg shadow-amber-200/50 dark:border-amber-700 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-950/40 dark:shadow-amber-900/20"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200 shadow-inner dark:bg-amber-800/60">
          <Trophy class="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p class="text-lg font-bold text-amber-800 dark:text-amber-300">满分！太厉害了！</p>
          <p class="text-sm text-amber-600 dark:text-amber-400">你是当之无愧的学霸 🎉</p>
        </div>
      </div>
    </div>

    <!-- ═══════ Wrong Answer Review ═══════ -->
    <div v-if="hasWrong" class="space-y-4">
      <div class="flex items-center gap-2">
        <AlertTriangle class="h-5 w-5 text-red-500 dark:text-red-400" />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          错题回顾
          <span class="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">{{ wrongItems.length }} 题</span>
        </h3>
      </div>

      <div class="space-y-3">
        <div
          v-for="(r, idx) in wrongItems"
          :key="idx"
          class="group rounded-2xl border border-red-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-red-800/60 dark:bg-gray-800/80"
          :style="cardVisible ? { animationDelay: idx * 60 + 'ms' } : undefined"
          :class="cardVisible ? 'animate-slide-up-in' : 'opacity-0 translate-y-3'"
        >
          <div class="flex items-start gap-3">
            <!-- Index number -->
            <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900/50 dark:text-red-400">
              {{ idx + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <!-- Type badge -->
              <div class="mb-1.5">
                <span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {{ questionTypeLabel[r.problem.original.type] ?? '' }}
                </span>
              </div>

              <!-- Question text -->
              <p class="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
                {{ r.problem.original.content }}
              </p>

              <!-- Answer comparison -->
              <div class="mt-3 space-y-2">
                <div class="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/20">
                  <X class="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
                  <div>
                    <span class="text-[10px] font-semibold uppercase text-red-400 dark:text-red-500">你的答案</span>
                    <p class="text-sm text-red-700 dark:text-red-300">{{ formatAnswer(r.answer, r.problem) }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/20">
                  <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                  <div>
                    <span class="text-[10px] font-semibold uppercase text-emerald-400 dark:text-emerald-500">正确答案</span>
                    <p class="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                      {{ formatAnswer(r.problem.mappedAnswer, r.problem) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Hint (expandable) -->
              <div v-if="r.problem.original.hint" class="mt-3">
                <button
                  class="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  @click="toggleWrong(idx)"
                >
                  <Lightbulb class="h-3.5 w-3.5 shrink-0" />
                  查看解析
                  <ChevronDown
                    v-if="!expandedWrong[idx]"
                    class="ml-auto h-3.5 w-3.5 transition-transform duration-200"
                  />
                  <ChevronUp
                    v-else
                    class="ml-auto h-3.5 w-3.5 transition-transform duration-200"
                  />
                </button>
                <div
                  v-if="expandedWrong[idx]"
                  class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  {{ r.problem.original.hint }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════ All Correct Celebration ═══════ -->
    <div
      v-else
      class="relative overflow-hidden rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-8 text-center shadow-xl shadow-emerald-200/60 transition-all duration-500 dark:border-emerald-700 dark:from-emerald-950/40 dark:via-green-950/30 dark:to-teal-950/30 dark:shadow-emerald-900/20"
      :class="cardVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95'"
    >
      <!-- Decorative glyphs -->
      <div class="pointer-events-none absolute top-4 left-6 text-4xl opacity-20 select-none">&#11088;</div>
      <div class="pointer-events-none absolute top-8 right-8 text-3xl opacity-20 select-none">&#127775;</div>
      <div class="pointer-events-none absolute bottom-6 left-10 text-2xl opacity-20 select-none">&#127942;</div>
      <div class="pointer-events-none absolute bottom-4 right-6 text-3xl opacity-20 select-none">&#11088;</div>

      <div class="relative">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-200 shadow-lg shadow-emerald-300/50 dark:bg-emerald-800/60 dark:shadow-emerald-900/30">
          <CircleCheckBig class="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p class="text-xl font-bold text-emerald-800 dark:text-emerald-300">全部正确！</p>
        <p class="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
          {{ isExam ? '满分通过，你太棒了！' : '完美通关，无懈可击！' }} 🎉
        </p>
        <p class="mt-3 text-xs text-emerald-500 dark:text-emerald-500">
          {{ totalCount }} 题全对 &middot; 用时 {{ formatTime(elapsedSeconds) }}
        </p>
      </div>
    </div>

    <!-- ═══════ Actions ═══════ -->
    <div class="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
      <button
        class="btn group rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.97] dark:shadow-purple-700/20"
        @click="emit('reset')"
      >
        <RotateCcw class="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-30deg]" />
        重新开始
      </button>
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .animate-slide-up-in {
    animation: quiz-slide-up-in 0.45s ease-out both;
  }
}

@keyframes quiz-slide-up-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
