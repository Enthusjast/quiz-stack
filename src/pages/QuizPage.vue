<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, List } from '@lucide/vue'
import { useQuiz } from '@/composables/useQuiz'
import type { PracticeMode } from '@/types/problem'
import QuestionCard from '@/components/quiz/QuestionCard.vue'
import QuestionNav from '@/components/quiz/QuestionNav.vue'
import QuizProgress from '@/components/quiz/QuizProgress.vue'
import QuizTimer from '@/components/quiz/QuizTimer.vue'
import QuizResult from '@/components/quiz/QuizResult.vue'
import ModeSelector from '@/components/common/ModeSelector.vue'

const route = useRoute()
const router = useRouter()
const bankId = route.params.bankId as string

const showModeSelector = ref(true)
const showNavPanel = ref(false)

const {
  loading,
  error,
  title,
  problems,
  currentIndex,
  answers,
  problemStates,
  elapsedSeconds,
  submitted,
  showResult,
  currentProblem,
  totalCount,
  correctCount,
  attemptedCount,
  accuracy,
  loadBank,
  goTo,
  next,
  prev,
  submitAnswer,
  retry,
  finish,
  reset,
} = useQuiz(bankId)

function handleModeConfirm(mode: PracticeMode) {
  showModeSelector.value = false
  loadBank(mode)
}

function handleSubmit(answer: any) {
  submitAnswer(answer)
}

function handleFinish() {
  finish()
}

function handleReset() {
  reset()
  showModeSelector.value = true
}

function goBack() {
  router.push('/')
}

// Keyboard shortcuts
function onKeydown(e: KeyboardEvent) {
  if (showResult.value || showModeSelector.value) return
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pb-16">
    <!-- Mode Selector -->
    <ModeSelector
      :show="showModeSelector"
      @close="router.push('/')"
      @confirm="handleModeConfirm"
    />

    <!-- Loading -->
    <div v-if="loading && !showModeSelector" class="flex items-center justify-center py-32">
      <div class="animate-spin h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="py-16 text-center">
      <div class="rounded-lg border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-950/30">
        <p class="text-lg text-red-600 dark:text-red-400">❌ {{ error }}</p>
        <button class="btn btn-secondary mt-4" @click="goBack">返回首页</button>
      </div>
    </div>

    <!-- Quiz -->
    <template v-else-if="!showModeSelector">
      <!-- Result screen -->
      <div v-if="showResult" class="py-8">
        <QuizResult
          :problems="problems"
          :problem-states="problemStates"
          :answers="answers"
          :elapsed-seconds="elapsedSeconds"
          @reset="handleReset"
        />
        <div class="mt-6 text-center">
          <button class="btn btn-ghost" @click="goBack">返回题库列表</button>
        </div>
      </div>

      <!-- Quiz screen -->
      <template v-else>
        <!-- Top bar -->
        <div class="mb-6 flex items-center justify-between pt-4">
          <div class="flex items-center gap-3 min-w-0">
            <button class="btn btn-ghost p-1.5 shrink-0" @click="goBack">
              <ArrowLeft class="h-5 w-5" />
            </button>
            <div class="min-w-0">
              <h1 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {{ title }}
              </h1>
              <QuizTimer :seconds="elapsedSeconds" />
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              class="btn btn-ghost p-1.5 sm:hidden"
              @click="showNavPanel = !showNavPanel"
            >
              <List class="h-5 w-5" />
            </button>
            <button class="btn btn-secondary text-sm" @click="handleFinish">
              结束
            </button>
          </div>
        </div>

        <!-- Progress -->
        <div class="mb-6">
          <QuizProgress
            :current-index="currentIndex"
            :total-count="totalCount"
            :correct-count="correctCount"
            :attempted-count="attemptedCount"
            :accuracy="accuracy"
          />
        </div>

        <div class="flex gap-6">
          <!-- Question area -->
          <div class="flex-1 min-w-0">
            <QuestionCard
              v-if="currentProblem"
              :key="currentIndex"
              :problem="currentProblem"
              :problem-index="currentIndex"
              :total-count="totalCount"
              :submitted="submitted"
              :problem-state="problemStates[currentIndex] ?? 0"
              :previous-answer="answers[currentIndex] ?? null"
              @submit="handleSubmit"
              @retry="retry"
            />

            <!-- Navigation arrows -->
            <div class="mt-6 flex justify-between">
              <button
                class="btn btn-secondary"
                :disabled="currentIndex === 0"
                @click="prev"
              >
                <ChevronLeft class="h-4 w-4" />
                上一题
              </button>
              <span class="flex items-center text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                {{ currentIndex + 1 }} / {{ totalCount }}
              </span>
              <button
                class="btn btn-secondary"
                :disabled="currentIndex >= totalCount - 1"
                @click="next"
              >
                下一题
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Number grid sidebar (desktop) -->
          <div class="hidden w-56 shrink-0 sm:block">
            <div class="sticky top-20">
              <h3 class="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">题目导航</h3>
              <QuestionNav
                :problem-states="problemStates"
                :current-index="currentIndex"
                @go-to="goTo"
              />
            </div>
          </div>
        </div>

        <!-- Number grid overlay (mobile) -->
        <div
          v-if="showNavPanel"
          class="fixed inset-0 z-40 flex items-end bg-black/30 sm:hidden"
          @click.self="showNavPanel = false"
        >
          <div class="w-full rounded-t-2xl bg-white p-4 shadow-xl dark:bg-gray-900 max-h-[60vh] overflow-y-auto">
            <h3 class="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">题目导航</h3>
            <QuestionNav
              :problem-states="problemStates"
              :current-index="currentIndex"
              @go-to="(i: number) => { goTo(i); showNavPanel = false }"
            />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>