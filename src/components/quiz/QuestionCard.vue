<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CheckCircle2, XCircle, Circle, Lightbulb, Send, RotateCcw } from '@lucide/vue'
import type { PreparedProblem, UserAnswer, ProblemState } from '@/types/problem'
import { CHOICE_LETTERS, PROBLEM_TYPE_LABELS, WARMUP_CONFIRMATION_ANSWER } from '@/types/problem'

const props = defineProps<{
  problem: PreparedProblem
  problemIndex: number
  totalCount: number
  submitted: boolean
  problemState: ProblemState   // 0|1|2|3
  previousAnswer: UserAnswer | null // previously submitted answer (for showing red/green)
  retryCount?: number          // how many times this question has been retried
}>()

const emit = defineEmits<{
  submit: [answer: UserAnswer]
  retry: []
}>()

// ---- reactive answer state ----
const selectedSingle = ref<number | null>(null)
const selectedMulti = ref<number[]>([])
const fillText = ref('')

// Reset local selections when problem changes
function resetLocal() {
  selectedSingle.value = null
  selectedMulti.value = []
  fillText.value = ''
}

// Restore previous answer (for mock exam navigation or on mount)
function restorePrevious() {
  const prev = props.previousAnswer
  if (prev === null || prev === undefined) {
    resetLocal()
    return
  }
  if (typeof prev === 'number') {
    selectedSingle.value = prev
    selectedMulti.value = []
    fillText.value = ''
  } else if (Array.isArray(prev)) {
    selectedSingle.value = null
    selectedMulti.value = [...prev]
    fillText.value = ''
  } else if (typeof prev === 'string') {
    selectedSingle.value = null
    selectedMulti.value = []
    fillText.value = prev
  }
}

watch([
  () => props.problem,
  () => props.problemIndex,
  () => props.previousAnswer,
  () => props.problemState,
], () => {
  // Restore previous answer if in mock exam (state=1) or already submitted
  if (props.problemState === 1 || props.problemState >= 2) {
    restorePrevious()
  } else {
    resetLocal()
  }
}, { immediate: true })

const problemType = computed<number>(() => props.problem.original.type)
const warmupType = computed(() => problemType.value === 0)
const warmupChoiceType = computed(() => {
  if (!warmupType.value || props.problem.shuffledChoices.length === 0) return false
  const original = props.problem.original as { choices?: string[]; answer?: unknown }
  return typeof original.answer === 'number'
    || (typeof original.answer === 'string' && Boolean(original.choices?.includes(original.answer)))
})
const warmupConfirmType = computed(() => warmupType.value && !warmupChoiceType.value)

const singleChoiceType = computed(() =>
  problemType.value === 1
  || problemType.value === 4
  || warmupChoiceType.value
)

const multiChoiceType = computed(() => problemType.value === 2)
const fillType = computed(() => problemType.value === 3)

const correctAnswer = computed(() => props.problem.mappedAnswer)
const warmupReferenceAnswer = computed(() => {
  if (!warmupConfirmType.value) return null
  const answer = (props.problem.original as { answer?: unknown }).answer
  return typeof answer === 'string' && answer.trim() ? answer : null
})

function isCorrectChoice(idx: number): boolean {
  // Type 0 is always awarded; keep the selected legacy choice consistent with that result.
  if (warmupType.value && props.problemState === 2 && isUserChoice(idx)) {
    return true
  }
  if (Array.isArray(correctAnswer.value)) {
    return correctAnswer.value.includes(idx)
  }
  return correctAnswer.value === idx
}

function isUserChoice(idx: number): boolean {
  if (Array.isArray(props.previousAnswer)) {
    return (props.previousAnswer as number[]).includes(idx)
  }
  return props.previousAnswer === idx
}

/**
 * Enhanced color-coded choice backgrounds with claymorphism depth.
 *
 * Submitted states:
 *   - Correct + chosen:  solid green bg with glow
 *   - Wrong + chosen:    solid red bg with glow
 *   - Correct + missed:  solid amber bg (user didn't select this correct answer)
 *   - Default:           muted
 *
 * Unsubmitted states:
 *   - Selected:          primary ring + subtle bg glow
 *   - Default:           soft border with hover lift effect
 */
function choiceClass(idx: number): string {
  if (!props.submitted) {
    // Interactive selection (not yet submitted or exam mode)
    if (singleChoiceType.value) {
      return selectedSingle.value === idx
        ? 'paper-option paper-option-selected paper-selected-ring paper-flat paper-no-lift border-primary-400 bg-primary-50/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_4px_12px_-2px_rgba(37,99,235,0.15)] dark:border-primary-500 dark:bg-primary-950/40 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_4px_12px_-2px_rgba(59,130,246,0.2)] ring-2 ring-primary-300/60 dark:ring-primary-700/60'
        : 'paper-option paper-option-neutral paper-flat paper-no-lift border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-[0_1px_2px_0_rgba(0,0,0,0.04),0_2px_8px_-1px_rgba(0,0,0,0.04)] dark:border-slate-700/60 dark:bg-slate-800/40 dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.2),0_2px_8px_-1px_rgba(0,0,0,0.15)] hover:border-slate-300 hover:shadow-[0_2px_4px_0_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.06)] dark:hover:border-slate-600 dark:hover:shadow-[0_2px_4px_0_rgba(0,0,0,0.3),0_4px_12px_-2px_rgba(0,0,0,0.25)] hover:-translate-y-px'
    }
    if (multiChoiceType.value) {
      return selectedMulti.value.includes(idx)
        ? 'paper-option paper-option-selected paper-selected-ring paper-flat paper-no-lift border-primary-400 bg-primary-50/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_4px_12px_-2px_rgba(37,99,235,0.15)] dark:border-primary-500 dark:bg-primary-950/40 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_4px_12px_-2px_rgba(59,130,246,0.2)] ring-2 ring-primary-300/60 dark:ring-primary-700/60'
        : 'paper-option paper-option-neutral paper-flat paper-no-lift border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-[0_1px_2px_0_rgba(0,0,0,0.04),0_2px_8px_-1px_rgba(0,0,0,0.04)] dark:border-slate-700/60 dark:bg-slate-800/40 dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.2),0_2px_8px_-1px_rgba(0,0,0,0.15)] hover:border-slate-300 hover:shadow-[0_2px_4px_0_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.06)] dark:hover:border-slate-600 dark:hover:shadow-[0_2px_4px_0_rgba(0,0,0,0.3),0_4px_12px_-2px_rgba(0,0,0,0.25)] hover:-translate-y-px'
    }
    return ''
  }

  // Submitted: show full-color backgrounds with soft glows
  if (isCorrectChoice(idx) && isUserChoice(idx)) {
    // Correct & chosen -- emerald glow
    return 'paper-option paper-feedback paper-feedback-success paper-flat paper-no-lift border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_2px_8px_-1px_rgba(16,185,129,0.15)] dark:border-emerald-600 dark:from-emerald-950/50 dark:to-emerald-950/30 dark:text-emerald-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_2px_8px_-1px_rgba(16,185,129,0.1)] font-medium'
  }
  if (!isCorrectChoice(idx) && isUserChoice(idx)) {
    // Wrong & chosen -- red glow
    return 'paper-option paper-feedback paper-feedback-error paper-flat paper-no-lift border-red-400 bg-gradient-to-br from-red-50 to-red-100/50 text-red-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_2px_8px_-1px_rgba(239,68,68,0.15)] dark:border-red-600 dark:from-red-950/50 dark:to-red-950/30 dark:text-red-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_2px_8px_-1px_rgba(239,68,68,0.1)]'
  }
  if (isCorrectChoice(idx) && !isUserChoice(idx)) {
    // Correct but missed -- amber glow
    return 'paper-option paper-feedback paper-feedback-warning paper-flat paper-no-lift border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_2px_8px_-1px_rgba(245,158,11,0.15)] dark:border-amber-600 dark:from-amber-950/50 dark:to-amber-950/30 dark:text-amber-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_2px_8px_-1px_rgba(245,158,11,0.1)] font-medium'
  }
  // Not chosen, not correct -- muted
  return 'paper-option paper-option-neutral paper-flat paper-no-lift border-slate-200/60 dark:border-slate-700/40 bg-white/30 dark:bg-slate-800/20 opacity-50'
}

/**
 * Choice letter badge class (inside the choice button).
 */
function letterClass(idx: number): string {
  if (!props.submitted) {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700/80 dark:text-slate-400'
  }
  if (isCorrectChoice(idx) && isUserChoice(idx)) {
    return 'bg-emerald-200/80 text-emerald-700 shadow-[0_1px_2px_rgba(16,185,129,0.15)] dark:bg-emerald-800/60 dark:text-emerald-200'
  }
  if (!isCorrectChoice(idx) && isUserChoice(idx)) {
    return 'bg-red-200/80 text-red-700 shadow-[0_1px_2px_rgba(239,68,68,0.15)] dark:bg-red-800/60 dark:text-red-200'
  }
  if (isCorrectChoice(idx) && !isUserChoice(idx)) {
    return 'bg-amber-200/80 text-amber-700 shadow-[0_1px_2px_rgba(245,158,11,0.15)] dark:bg-amber-800/60 dark:text-amber-200'
  }
  return 'bg-slate-100/50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500'
}

function selectSingle(idx: number) {
  if (props.submitted) return
  selectedSingle.value = idx
}

function toggleMulti(idx: number) {
  if (props.submitted) return
  const pos = selectedMulti.value.indexOf(idx)
  if (pos >= 0) {
    selectedMulti.value.splice(pos, 1)
  } else {
    selectedMulti.value.push(idx)
  }
}

function handleSubmit() {
  if (props.submitted) {
    emit('retry')
    resetLocal()
    return
  }

  let answer: UserAnswer
  if (warmupConfirmType.value) {
    answer = WARMUP_CONFIRMATION_ANSWER
  } else if (singleChoiceType.value) {
    if (selectedSingle.value === null) return
    answer = selectedSingle.value
  } else if (multiChoiceType.value) {
    if (selectedMulti.value.length === 0) return
    answer = [...selectedMulti.value]
  } else {
    if (!fillText.value.trim()) return
    answer = fillText.value.trim()
  }
  emit('submit', answer)
}

const submitLabel = computed(() => {
  if (props.submitted) return '重做'
  if (props.problemState === 1) return '确认修改'
  if (warmupConfirmType.value) return '确认完成'
  return '提交答案'
})
</script>

<template>
  <div class="animate-scale-in space-y-6">
    <!-- Problem header -->
    <div class="flex items-center gap-3 flex-wrap">
      <!-- Type badge with gradient -->
      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-100 to-blue-200/60 px-3 py-1 text-xs font-semibold text-blue-700 shadow-[0_1px_3px_0_rgba(37,99,235,0.08),inset_0_1px_0_0_rgba(255,255,255,0.5)] dark:from-blue-900/60 dark:to-blue-800/40 dark:text-blue-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
      >
        {{ PROBLEM_TYPE_LABELS[problem.original.type] }}
      </span>

      <!-- Question counter -->
      <span class="text-sm font-medium tabular-nums text-slate-400 dark:text-slate-500">
        <span class="text-slate-700 dark:text-slate-300">{{ problemIndex + 1 }}</span>
        <span class="mx-0.5 opacity-60">/</span>
        <span>{{ totalCount }}</span>
      </span>

      <!-- Retry count badge -->
      <span
        v-if="retryCount && retryCount > 0 && !submitted"
        class="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-1 text-xs font-medium text-amber-700 shadow-[0_1px_2px_rgba(245,158,11,0.1),inset_0_1px_0_0_rgba(255,255,255,0.4)] dark:bg-amber-900/40 dark:text-amber-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
      >
        重试第 {{ retryCount }} 次
      </span>
    </div>

    <!-- Problem content -->
    <div class="relative">
      <!-- Subtle gradient accent bar -->
      <div class="paper-gradient-primary absolute bottom-1 left-0 top-1 w-1 rounded-full bg-gradient-to-b from-blue-500 via-purple-500 to-amber-400 opacity-70 dark:opacity-50" />
      <p class="pl-5 text-lg font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap dark:text-slate-100">
        {{ problem.original.content }}
      </p>
    </div>

    <!-- Choices -->
    <div class="space-y-3">
      <template v-if="singleChoiceType || multiChoiceType">
        <button
          v-for="(choice, idx) in problem.shuffledChoices"
          :key="idx"
          type="button"
          @click="singleChoiceType ? selectSingle(idx) : toggleMulti(idx)"
          :disabled="submitted"
          :class="[
            'w-full flex items-center gap-3.5 rounded-xl border-2 px-5 py-3.5 text-left transition-all duration-200 ease-out',
            'active:scale-[0.985] touch-manipulation',
            'cursor-pointer select-none',
            choiceClass(idx),
          ]"
          :style="{ animationDelay: (idx * 60) + 'ms' }"
          class="animate-[fade-in_300ms_ease-out_both]"
        >
          <!-- Letter badge -->
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200"
            :class="letterClass(idx)"
          >
            {{ CHOICE_LETTERS[idx] }}
          </span>

          <!-- Choice text -->
          <span class="flex-1 text-[15px] leading-snug">{{ choice }}</span>

          <!-- Status icon -->
          <span class="ml-auto shrink-0">
            <CheckCircle2
              v-if="submitted && isCorrectChoice(idx) && isUserChoice(idx)"
              class="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            />
            <XCircle
              v-else-if="submitted && !isCorrectChoice(idx) && isUserChoice(idx)"
              class="h-5 w-5 text-red-500 dark:text-red-400"
            />
            <CheckCircle2
              v-else-if="submitted && isCorrectChoice(idx) && !isUserChoice(idx)"
              class="h-5 w-5 text-amber-600 dark:text-amber-400"
            />
            <Circle v-else class="h-5 w-5 text-slate-300 dark:text-slate-600" />
          </span>
        </button>
      </template>

      <template v-if="fillType">
        <div class="relative">
          <input
            v-model="fillText"
            type="text"
            :disabled="submitted"
            :placeholder="problemState === 1 ? '修改答案（多空用逗号分隔）' : '输入答案（多空用逗号分隔）'"
            class="paper-control paper-flat w-full rounded-xl border-2 border-slate-200/80 bg-white/80 px-5 py-3.5 text-[15px] text-slate-900 placeholder-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all duration-200 placeholder:text-sm focus:border-primary-400 focus:bg-white focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_2px_8px_-1px_rgba(37,99,235,0.12)] focus:outline-none focus:ring-4 focus:ring-primary-100/60 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-white dark:placeholder-slate-500 dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] dark:focus:border-primary-500 dark:focus:bg-slate-800/60 dark:focus:ring-primary-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
            @keyup.enter="handleSubmit"
          />
        </div>

        <!-- Reveal correct answer after submission -->
        <div v-if="submitted" class="paper-feedback paper-flat animate-fade-in rounded-xl p-5"
          :class="problemState === 2
            ? 'paper-feedback-success bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-300/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_2px_8px_-1px_rgba(16,185,129,0.12)] dark:from-emerald-950/40 dark:to-emerald-950/20 dark:border-emerald-700/40 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]'
            : 'paper-feedback-error bg-gradient-to-br from-red-50 to-red-100/50 border border-red-300/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_2px_8px_-1px_rgba(239,68,68,0.12)] dark:from-red-950/40 dark:to-red-950/20 dark:border-red-700/40 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]'"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">正确答案</p>
          <p class="mt-1 text-base font-semibold text-green-700 dark:text-green-400">{{ correctAnswer }}</p>
          <p v-if="problemState !== 2" class="mt-2 flex items-center gap-1.5 text-sm">
            <XCircle class="h-4 w-4 text-red-400 dark:text-red-500" />
            <span class="text-red-600 dark:text-red-400">你的答案：</span>
            <span class="font-medium text-red-700 dark:text-red-300">{{ previousAnswer }}</span>
          </p>
        </div>
      </template>

      <div
        v-if="submitted && warmupReferenceAnswer"
        class="paper-feedback paper-feedback-success paper-flat animate-fade-in rounded-xl border border-emerald-300/60 bg-emerald-50 p-5 dark:border-emerald-700/40 dark:bg-emerald-950/30"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">参考答案</p>
        <p class="mt-1 whitespace-pre-wrap text-base font-semibold text-emerald-700 dark:text-emerald-300">
          {{ warmupReferenceAnswer }}
        </p>
      </div>
    </div>

    <!-- Hint (shown after submission) -->
    <div
      v-if="submitted && problem.original.hint"
      class="paper-feedback paper-feedback-warning paper-flat animate-fade-in rounded-xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_2px_8px_-2px_rgba(245,158,11,0.1)] dark:border-amber-700/40 dark:from-amber-950/40 dark:to-amber-950/20 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
      style="animation-delay: 100ms; animation-fill-mode: both;"
    >
      <div class="flex items-start gap-2.5">
        <Lightbulb class="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
        <div>
          <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">解析</p>
          <p class="mt-1 text-sm leading-relaxed text-amber-700 dark:text-amber-400">{{ problem.original.hint }}</p>
        </div>
      </div>
    </div>

    <!-- Submit / Retry button -->
    <div class="flex justify-center pt-1">
      <button
        type="button"
        @click="handleSubmit"
        :class="[
          'group relative inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-base font-semibold transition-all duration-200 ease-out',
          'paper-flat paper-no-lift',
          'active:scale-[0.97] touch-manipulation select-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
          submitted
            ? 'paper-surface-muted bg-gradient-to-b from-slate-100 to-slate-200/80 text-slate-700 shadow-[0_2px_6px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.7)] hover:from-slate-200 hover:to-slate-300/80 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:from-slate-800 dark:to-slate-700/80 dark:text-slate-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] dark:hover:from-slate-700 dark:hover:to-slate-600/80 focus-visible:ring-slate-400'
            : 'paper-gradient-primary bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-[0_4px_16px_-2px_rgba(37,99,235,0.3),0_2px_4px_-1px_rgba(37,99,235,0.15),inset_0_1px_0_0_rgba(255,255,255,0.25)] hover:from-primary-600 hover:to-primary-700 hover:shadow-[0_6px_20px_-3px_rgba(37,99,235,0.35),0_3px_6px_-1px_rgba(37,99,235,0.2)] dark:from-primary-600 dark:to-primary-700 dark:shadow-[0_4px_16px_-2px_rgba(59,130,246,0.25),inset_0_1px_0_0_rgba(255,255,255,0.1)] dark:hover:from-primary-700 dark:hover:to-primary-800 focus-visible:ring-primary-500',
        ]"
      >
        <Send v-if="!submitted" class="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" />
        <RotateCcw v-else class="h-4 w-4 transition-transform duration-200 group-hover:rotate-[-30deg]" />
        {{ submitLabel }}
      </button>
    </div>
  </div>
</template>
