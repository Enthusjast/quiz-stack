<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Circle, CheckCircle2, XCircle } from '@lucide/vue'
import type { PreparedProblem, UserAnswer, ProblemState } from '@/types/problem'
import { PROBLEM_TYPE_LABELS, CHOICE_LETTERS } from '@/types/problem'

const props = defineProps<{
  problem: PreparedProblem
  problemIndex: number
  totalCount: number
  submitted: boolean
  problemState: ProblemState   // 0|1|2|3
  previousAnswer: UserAnswer   // previously submitted answer (for showing red/green)
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
// (handled by :key on parent — so onMounted equivalent via reset on creation)
function resetLocal() {
  selectedSingle.value = null
  selectedMulti.value = []
  fillText.value = ''
}

watch(() => props.problemIndex, () => resetLocal())
// Also reset on first render
resetLocal()

const singleChoiceType = computed(() =>
  props.problem.original.type === 1 || props.problem.original.type === 4
)

const multiChoiceType = computed(() => props.problem.original.type === 2)
const fillType = computed(() => props.problem.original.type === 3)

const correctAnswer = computed(() => props.problem.mappedAnswer)

function isCorrectChoice(idx: number): boolean {
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

function choiceClass(idx: number): string {
  if (!props.submitted) {
    // Interactive selection
    if (singleChoiceType.value) {
      return selectedSingle.value === idx
        ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/50 ring-2 ring-indigo-200 dark:ring-indigo-800'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }
    if (multiChoiceType.value) {
      return selectedMulti.value.includes(idx)
        ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/50 ring-2 ring-indigo-200 dark:ring-indigo-800'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }
    return ''
  }

  // Submitted: show correct/wrong
  if (isCorrectChoice(idx) && isUserChoice(idx)) {
    return 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-950/50'
  }
  if (isCorrectChoice(idx) && !isUserChoice(idx)) {
    return 'border-green-400 bg-green-50/50 dark:border-green-700 dark:bg-green-950/30'
  }
  if (!isCorrectChoice(idx) && isUserChoice(idx)) {
    return 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/50'
  }
  return 'border-gray-200 dark:border-gray-700 opacity-60'
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
  if (singleChoiceType.value) {
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
</script>

<template>
  <div class="space-y-5">
    <!-- Problem header -->
    <div class="flex items-center gap-3">
      <span class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
        {{ PROBLEM_TYPE_LABELS[problem.original.type] }}
      </span>
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ problemIndex + 1 }} / {{ totalCount }}
      </span>
    </div>

    <!-- Problem content -->
    <div class="text-lg font-medium text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
      {{ problem.original.content }}
    </div>

    <!-- Choices -->
    <div class="space-y-2.5">
      <template v-if="singleChoiceType || multiChoiceType">
        <button
          v-for="(choice, idx) in problem.shuffledChoices"
          :key="idx"
          @click="singleChoiceType ? selectSingle(idx) : toggleMulti(idx)"
          :class="[
            'w-full flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all duration-150',
            choiceClass(idx),
          ]"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            :class="!submitted
              ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              : isCorrectChoice(idx)
                ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'"
          >
            {{ CHOICE_LETTERS[idx] }}
          </span>
          <span class="text-gray-800 dark:text-gray-200">{{ choice }}</span>
          <span class="ml-auto shrink-0">
            <CheckCircle2
              v-if="submitted && isCorrectChoice(idx) && isUserChoice(idx)"
              class="h-5 w-5 text-green-600 dark:text-green-400"
            />
            <XCircle
              v-else-if="submitted && !isCorrectChoice(idx) && isUserChoice(idx)"
              class="h-5 w-5 text-red-500 dark:text-red-400"
            />
            <CheckCircle2
              v-else-if="submitted && isCorrectChoice(idx) && !isUserChoice(idx)"
              class="h-5 w-5 text-green-400 dark:text-green-500"
            />
            <Circle v-else class="h-5 w-5 text-gray-300 dark:text-gray-600" />
          </span>
        </button>
      </template>

      <template v-if="fillType">
        <input
          v-model="fillText"
          type="text"
          :disabled="submitted"
          :placeholder="'输入答案（多空用逗号分隔）'"
          class="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-400"
          @keyup.enter="handleSubmit"
        />

        <!-- Reveal correct answer after submission -->
        <div v-if="submitted" class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p class="text-sm text-gray-500 dark:text-gray-400">正确答案：</p>
          <p class="text-green-700 dark:text-green-400 font-medium">{{ correctAnswer }}</p>
          <p v-if="String(previousAnswer) !== String(correctAnswer)" class="mt-1 text-sm text-red-500 dark:text-red-400">
            你的答案：{{ previousAnswer }}
          </p>
        </div>
      </template>
    </div>

    <!-- Hint (shown after submission) -->
    <div
      v-if="submitted && problem.original.hint"
      class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
    >
      <p class="text-sm font-medium text-amber-800 dark:text-amber-300">💡 解析</p>
      <p class="mt-1 text-sm text-amber-700 dark:text-amber-400">{{ problem.original.hint }}</p>
    </div>

    <!-- Submit / Retry button -->
    <div class="flex justify-center pt-2">
      <button
        @click="handleSubmit"
        :class="[
          'btn px-8 py-2.5 text-base',
          submitted ? 'btn-secondary' : 'btn-primary',
        ]"
      >
        {{ submitted ? '重做' : '提交答案' }}
      </button>
    </div>
  </div>
</template>