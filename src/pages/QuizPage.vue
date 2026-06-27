<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, List, Save, CheckCircle2, AlertTriangle, Download, Upload, Keyboard } from '@lucide/vue'
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
const showShortcutHint = ref(true)
const quizReady = ref(false)

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

// Animate quiz content entrance after loading
watch([loading, showModeSelector], ([l, sms]) => {
  if (!l && !sms && !showResumePrompt.value && !error.value) {
    requestAnimationFrame(() => { quizReady.value = true })
  }
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
  quizReady.value = false
  showShortcutHint.value = true
  reset()
  showModeSelector.value = true
}

function goBack() {
  router.push('/')
}

// Keyboard shortcuts
function onKeydown(e: KeyboardEvent) {
  if (showResult.value || showModeSelector.value) return
  // Don't override arrow keys when an input or textarea is focused
  const tag = (e.target as HTMLElement)?.tagName
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
  if (e.key === 'ArrowLeft') {
    if (!isInput) e.preventDefault()
    prev()
  }
  if (e.key === 'ArrowRight') {
    if (!isInput) e.preventDefault()
    next()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// Dismiss shortcut hint after first interaction or on scroll
function dismissShortcutHint() {
  showShortcutHint.value = false
}
onMounted(() => {
  window.addEventListener('wheel', dismissShortcutHint, { once: true })
  window.addEventListener('touchstart', dismissShortcutHint, { once: true })
})
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
    <div v-if="loading && !showModeSelector" class="py-8 space-y-6 animate-fade-in">
      <!-- Title skeleton -->
      <div class="space-y-3">
        <div class="skeleton-shimmer h-8 w-2/3 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div class="skeleton-shimmer h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <!-- Progress skeleton -->
      <div class="skeleton-shimmer h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
      <!-- Stat pills skeleton -->
      <div class="flex gap-2">
        <div class="skeleton-shimmer h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div class="skeleton-shimmer h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div class="skeleton-shimmer h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <!-- Question card skeleton -->
      <div class="skeleton-shimmer rounded-xl border border-gray-200 bg-white p-6 space-y-4 dark:border-gray-700 dark:bg-gray-800">
        <div class="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div class="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div class="space-y-3 pt-2">
          <div v-for="i in 4" :key="i" class="skeleton-shimmer h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <div class="flex justify-center pt-2">
          <div class="skeleton-shimmer h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <!-- Nav buttons skeleton -->
      <div class="flex justify-between">
        <div class="skeleton-shimmer h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div class="skeleton-shimmer h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>

    <!-- Resume prompt -->
    <div v-else-if="showResumePrompt" class="py-16 text-center">
      <div class="mx-auto max-w-md animate-scale-in rounded-2xl border border-indigo-200 bg-white p-8 shadow-lg ring-1 ring-indigo-100 dark:border-indigo-800 dark:bg-gray-800/80 dark:shadow-indigo-900/20 dark:ring-indigo-900/30">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
          <Save class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p class="text-lg font-semibold text-gray-900 dark:text-white">检测到上次的练习进度</p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">是否继续上次的练习？</p>
        <div class="mt-6 flex justify-center gap-3">
          <button class="btn btn-primary px-6 shadow-sm" @click="resumeSession">继续练习</button>
          <button class="btn btn-secondary px-6" @click="startFresh">重新开始</button>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="py-16 text-center">
      <div class="mx-auto max-w-md animate-scale-in rounded-2xl border border-red-200 bg-white p-8 shadow-lg ring-1 ring-red-100 dark:border-red-800 dark:bg-gray-800/80">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
          <AlertTriangle class="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <p class="text-lg font-medium text-red-600 dark:text-red-400">{{ error }}</p>
        <button class="btn btn-secondary mt-6" @click="goBack">返回首页</button>
      </div>
    </div>

    <!-- Quiz -->
    <template v-else-if="!showModeSelector">
      <!-- Result screen -->
      <div v-if="showResult" class="py-8 animate-slide-up">
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
        <header
          class="relative mb-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-xl transition-colors dark:border-gray-700/60 dark:bg-gray-800/70 sm:px-4"
          :class="{ 'animate-slide-down': quizReady }"
        >
          <div class="flex items-center gap-3 min-w-0">
            <button
              class="btn btn-ghost p-2 shrink-0 -ml-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/70"
              aria-label="返回题库列表"
              @click="goBack"
            >
              <ArrowLeft class="h-5 w-5" />
            </button>
            <div class="min-w-0">
              <h1 class="truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                {{ title }}
              </h1>
              <div class="mt-0.5 flex items-center gap-2.5 text-xs">
                <QuizTimer :seconds="elapsedSeconds" />
                <span class="text-gray-300 dark:text-gray-600 select-none">|</span>
                <!-- Mode badge -->
                <span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 shadow-sm dark:bg-blue-900/60 dark:text-blue-300">
                  {{ mode === 'sequential' ? '顺序' : mode === 'random' ? '乱序' : mode === 'mock-exam' ? '考试' : mode === 'custom-practice' ? '自定义' : '错题' }}
                </span>
                <!-- Save status indicator -->
                <span
                  v-if="saveStatus === 'saved'"
                  class="inline-flex items-center gap-1 text-green-600 dark:text-green-400"
                  :title="`上次保存于 ${lastSaveTime}`"
                >
                  <CheckCircle2 class="h-3 w-3" />
                  已保存
                </span>
                <span
                  v-else-if="saveStatus === 'saving'"
                  class="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500"
                >
                  <Save class="h-3 w-3 animate-pulse" />
                  保存中
                </span>
                <span
                  v-else-if="saveStatus === 'error'"
                  class="inline-flex items-center gap-1 text-red-500 dark:text-red-400"
                >
                  <AlertTriangle class="h-3 w-3" />
                  保存失败
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Export / Import (desktop) -->
            <button
              class="hidden sm:inline-flex items-center justify-center rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700/60 dark:hover:text-gray-300"
              title="导出进度"
              aria-label="导出练习进度"
              @click="handleExport"
            >
              <Download class="h-4 w-4" />
            </button>
            <button
              class="hidden sm:inline-flex items-center justify-center rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700/60 dark:hover:text-gray-300"
              title="导入进度"
              aria-label="导入练习进度"
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
            <!-- Nav toggle (mobile) -->
            <button
              class="inline-flex items-center justify-center rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:hidden dark:hover:bg-gray-700/60 dark:hover:text-gray-300"
              aria-label="打开题目导航"
              @click="showNavPanel = !showNavPanel"
            >
              <List class="h-5 w-5" />
            </button>
            <!-- Finish button -->
            <button
              class="btn group rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/20 transition-all duration-200 hover:from-blue-700 hover:to-blue-600 hover:shadow-md hover:shadow-blue-500/25 active:scale-[0.97] sm:px-5 dark:from-blue-600 dark:to-blue-500 dark:shadow-blue-500/15"
              :aria-label="mode === 'mock-exam' ? '提交试卷' : '结束练习'"
              @click="handleFinish"
            >
              {{ mode === 'mock-exam' ? '交卷' : '结束' }}
            </button>
          </div>
        </header>

        <!-- Import status messages -->
        <Transition name="fade-slide">
          <div
            v-if="importError"
            class="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30"
          >
            <AlertTriangle class="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <p class="text-sm text-red-600 dark:text-red-400">{{ importError }}</p>
          </div>
        </Transition>
        <Transition name="fade-slide">
          <div
            v-if="importSuccess"
            class="mb-4 flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30"
          >
            <CheckCircle2 class="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
            <p class="text-sm text-green-600 dark:text-green-400">进度导入成功</p>
          </div>
        </Transition>

        <!-- Keyboard shortcut hint -->
        <Transition name="fade-slide">
          <div
            v-if="showShortcutHint && totalCount > 0"
            class="mb-5 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 text-xs backdrop-blur-sm dark:border-blue-900/40 dark:bg-blue-950/30"
          >
            <Keyboard class="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
            <span class="text-blue-700 dark:text-blue-300">
              键盘快捷键：<kbd class="mx-0.5 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-blue-700 dark:bg-blue-800/60 dark:text-blue-300">&#8592;</kbd> 上一题
              <kbd class="mx-0.5 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-blue-700 dark:bg-blue-800/60 dark:text-blue-300">&#8594;</kbd> 下一题
            </span>
            <button
              class="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/50 dark:hover:text-blue-300"
              aria-label="关闭快捷键提示"
              @click="showShortcutHint = false"
            >&times;</button>
          </div>
        </Transition>

        <!-- Progress -->
        <div class="mb-6" :class="{ 'animate-fade-in': quizReady }" style="animation-delay: 100ms; animation-fill-mode: both;">
          <QuizProgress
            :current-index="currentIndex"
            :total-count="totalCount"
            :correct-count="correctCount"
            :attempted-count="mode === 'mock-exam' ? answeredCount : attemptedCount"
            :accuracy="accuracy"
          />
          <!-- Exam progress: answered / total -->
          <p v-if="mode === 'mock-exam'" class="mt-1 text-[11px] text-gray-400 dark:text-gray-500 text-right tabular-nums">
            已作答 <span class="font-medium text-gray-500 dark:text-gray-400">{{ answeredCount }}</span> / {{ totalCount }} 题
          </p>
        </div>

        <div class="flex gap-6">
          <!-- Question area -->
          <div class="flex-1 min-w-0" :class="{ 'animate-fade-in': quizReady }" style="animation-delay: 150ms; animation-fill-mode: both;">
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
            <nav class="mt-6 flex items-center justify-between" aria-label="题目导航">
              <button
                class="btn btn-secondary group rounded-xl px-4 py-2.5 text-sm shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.97] disabled:opacity-40 disabled:shadow-none disabled:hover:shadow-none"
                :disabled="currentIndex === 0"
                aria-label="上一题"
                @click="prev"
              >
                <ChevronLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5 group-active:translate-x-0" />
                上一题
              </button>
              <span class="flex items-center gap-1 text-sm tabular-nums text-gray-400 dark:text-gray-500">
                <span class="font-semibold text-gray-600 dark:text-gray-300">{{ currentIndex + 1 }}</span>
                <span>/</span>
                <span>{{ totalCount }}</span>
              </span>
              <button
                class="btn btn-secondary group rounded-xl px-4 py-2.5 text-sm shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.97] disabled:opacity-40 disabled:shadow-none disabled:hover:shadow-none"
                :disabled="currentIndex >= totalCount - 1"
                aria-label="下一题"
                @click="next"
              >
                下一题
                <ChevronRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-active:translate-x-0" />
              </button>
            </nav>
          </div>

          <!-- Number grid sidebar (large desktop) -->
          <aside class="hidden w-72 shrink-0 lg:block" :class="{ 'animate-slide-in-right': quizReady }" style="animation-delay: 200ms; animation-fill-mode: both;">
            <div class="sticky top-20 rounded-2xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/50">
              <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">题目导航</h3>
              <QuestionNav
                :problem-states="problemStates"
                :current-index="currentIndex"
                :exam-sections="examSections.length > 0 ? examSections : undefined"
                @go-to="goTo"
              />
            </div>
          </aside>
        </div>

        <!-- Mobile bottom bar -->
        <div class="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200/60 bg-white/90 px-4 py-2.5 backdrop-blur-xl lg:hidden dark:border-gray-700/60 dark:bg-gray-900/90">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-gray-500 dark:text-gray-400">
              {{ mode === 'sequential' ? '顺序' : mode === 'random' ? '乱序' : mode === 'mock-exam' ? '考试' : mode === 'custom-practice' ? '自定义' : '错题' }}
            </span>
            <span class="font-mono tabular-nums font-semibold text-gray-700 dark:text-gray-300">
              {{ currentIndex + 1 }} / {{ totalCount }}
            </span>
            <span
              v-if="saveStatus === 'saved'"
              class="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400"
            >
              <CheckCircle2 class="h-3 w-3" />
              已保存
            </span>
            <span v-else-if="saveStatus === 'saving'" class="inline-flex items-center gap-1 text-gray-400">
              <Save class="h-3 w-3 animate-pulse" />
              保存中
            </span>
            <span v-else-if="saveStatus === 'error'" class="inline-flex items-center gap-1 text-red-500">
              <AlertTriangle class="h-3 w-3" />
              保存失败
            </span>
            <span v-else class="text-gray-400">—</span>
          </div>
        </div>

        <!-- Number grid overlay (mobile) -->
        <Transition name="nav-panel">
          <div
            v-if="showNavPanel"
            class="fixed inset-0 z-40 flex items-end lg:hidden"
            @click.self="showNavPanel = false"
          >
            <div
              class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              @click="showNavPanel = false"
            />
            <div class="relative w-full rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-2xl dark:bg-gray-900 max-h-[60vh] overflow-y-auto">
              <!-- Drag handle -->
              <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">题目导航</h3>
                <button
                  class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  aria-label="关闭题目导航"
                  @click="showNavPanel = false"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <QuestionNav
                :problem-states="problemStates"
                :current-index="currentIndex"
                :exam-sections="examSections.length > 0 ? examSections : undefined"
                @go-to="(i: number) => { goTo(i); showNavPanel = false }"
              />
            </div>
          </div>
        </Transition>
      </template>
    </template>
  </div>
</template>
