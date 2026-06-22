<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, List, Save, CheckCircle2, AlertTriangle, Download, Upload } from '@lucide/vue'
import { useQuiz } from '@/composables/useQuiz'
import type { PracticeMode, CustomPracticeConfig } from '@/types/problem'
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
  mode,
  problems,
  currentIndex,
  answers,
  problemStates,
  elapsedSeconds,
  submitted,
  showResult,
  showResumePrompt,
  retryCounts,
  saveStatus,
  lastSaveTime,
  examSections,
  examTotalScore,
  examEarnedScore,
  currentProblem,
  totalCount,
  correctCount,
  attemptedCount,
  answeredCount,
  accuracy,
  loadBank,
  goTo,
  next,
  prev,
  submitAnswer,
  submitExam,
  retry,
  finish,
  reset,
  resumeSession,
  startFresh,
  exportSession,
  importSession,
} = useQuiz(bankId)

// Sync document title with bank title
watch(title, (t) => {
  if (t) document.title = `${t} — Quiz Stack`
})

const importError = ref<string | null>(null)
const importSuccess = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function handleExport() {
  exportSession()
}

function handleImportClick() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const err = importSession(reader.result as string)
    if (err) {
      importError.value = err
      importSuccess.value = false
    } else {
      importError.value = null
      importSuccess.value = true
      setTimeout(() => { importSuccess.value = false }, 3000)
    }
  }
  reader.readAsText(file)
  // Reset input so the same file can be imported again
  input.value = ''
}

function handleModeConfirm(mode: PracticeMode) {
  showModeSelector.value = false
  loadBank(mode)
}

function handleCustomPractice(config: CustomPracticeConfig) {
  showModeSelector.value = false
  loadBank('custom-practice', config)
}

function handleSubmit(answer: any) {
  submitAnswer(answer)
}

function handleFinish() {
  if (mode.value === 'mock-exam') {
    submitExam()
  } else {
    finish()
  }
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
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pb-16">
    <!-- Mode Selector -->
    <ModeSelector
      :show="showModeSelector"
      @close="router.push('/')"
      @confirm="handleModeConfirm"
      @confirm-custom="handleCustomPractice"
    />

    <!-- Loading skeleton -->
    <div v-if="loading && !showModeSelector" class="py-8 space-y-6 animate-pulse">
      <div class="h-8 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div class="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div class="h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>

    <!-- Resume prompt -->
    <div v-else-if="showResumePrompt" class="py-16 text-center">
      <div class="rounded-lg border border-indigo-200 bg-indigo-50 p-8 dark:border-indigo-800 dark:bg-indigo-950/30">
        <p class="text-lg font-semibold text-indigo-900 dark:text-indigo-200">检测到上次的练习进度</p>
        <p class="mt-2 text-sm text-indigo-700 dark:text-indigo-400">是否继续上次的练习？</p>
        <div class="mt-6 flex justify-center gap-3">
          <button class="btn btn-primary" @click="resumeSession">继续练习</button>
          <button class="btn btn-secondary" @click="startFresh">重新开始</button>
        </div>
      </div>
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
          :exam-sections="examSections"
          :exam-total-score="examTotalScore"
          :exam-earned-score="examEarnedScore"
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
              <div class="flex items-center gap-3">
                <QuizTimer :seconds="elapsedSeconds" />
                <!-- Mode badge -->
                <span class="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {{ mode === 'sequential' ? '顺序' : mode === 'random' ? '乱序' : mode === 'mock-exam' ? '考试' : mode === 'custom-practice' ? '自定义' : '错题' }}
                </span>
                <!-- Save status indicator -->
                <span
                  v-if="saveStatus === 'saved'"
                  class="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                  :title="`上次保存于 ${lastSaveTime}`"
                >
                  <CheckCircle2 class="h-3.5 w-3.5" />
                  已保存
                </span>
                <span
                  v-else-if="saveStatus === 'saving'"
                  class="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  <Save class="h-3.5 w-3.5 animate-pulse" />
                  保存中...
                </span>
                <span
                  v-else-if="saveStatus === 'error'"
                  class="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400"
                >
                  <AlertTriangle class="h-3.5 w-3.5" />
                  保存失败
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <!-- Export / Import (hidden on mobile to save space) -->
            <button
              class="hidden sm:inline-flex btn btn-ghost p-1.5"
              title="导出进度"
              @click="handleExport"
            >
              <Download class="h-4 w-4" />
            </button>
            <button
              class="hidden sm:inline-flex btn btn-ghost p-1.5"
              title="导入进度"
              @click="handleImportClick"
            >
              <Upload class="h-4 w-4" />
            </button>
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              class="hidden"
              @change="handleFileChange"
            />
            <button
              class="btn btn-ghost p-1.5 sm:hidden"
              @click="showNavPanel = !showNavPanel"
            >
              <List class="h-5 w-5" />
            </button>
            <button class="btn btn-secondary text-sm" @click="handleFinish">
              {{ mode === 'mock-exam' ? '交卷' : '结束' }}
            </button>
          </div>
        </div>

        <!-- Import status messages -->
        <div
          v-if="importError"
          class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 dark:border-red-800 dark:bg-red-950/30"
        >
          <p class="text-sm text-red-600 dark:text-red-400">{{ importError }}</p>
        </div>
        <div
          v-if="importSuccess"
          class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 dark:border-green-800 dark:bg-green-950/30"
        >
          <p class="text-sm text-green-600 dark:text-green-400">✅ 进度导入成功</p>
        </div>

        <!-- Progress -->
        <div class="mb-6">
          <QuizProgress
            :current-index="currentIndex"
            :total-count="totalCount"
            :correct-count="correctCount"
            :attempted-count="mode === 'mock-exam' ? answeredCount : attemptedCount"
            :accuracy="accuracy"
          />
          <!-- Exam progress: answered / total -->
          <p v-if="mode === 'mock-exam'" class="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
            已作答 {{ answeredCount }} / {{ totalCount }} 题
          </p>
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
              :retry-count="retryCounts[currentIndex] ?? 0"
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
                :exam-sections="examSections.length > 0 ? examSections : undefined"
                @go-to="goTo"
              />
            </div>
          </div>
        </div>

        <!-- Mobile bottom bar -->
        <div class="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-2 sm:hidden dark:border-gray-700 dark:bg-gray-900/95">
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-500 dark:text-gray-400">
              {{ mode === 'sequential' ? '顺序' : mode === 'random' ? '乱序' : mode === 'mock-exam' ? '考试' : mode === 'custom-practice' ? '自定义' : '错题' }}
            </span>
            <span class="font-mono tabular-nums text-gray-700 dark:text-gray-300">
              {{ currentIndex + 1 }} / {{ totalCount }}
            </span>
            <span v-if="saveStatus === 'saved'" class="text-green-600 dark:text-green-400">已保存</span>
            <span v-else-if="saveStatus === 'saving'" class="text-gray-400">保存中</span>
            <span v-else-if="saveStatus === 'error'" class="text-red-500">保存失败</span>
            <span v-else class="text-gray-400">—</span>
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
              :exam-sections="examSections.length > 0 ? examSections : undefined"
              @go-to="(i: number) => { goTo(i); showNavPanel = false }"
            />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
