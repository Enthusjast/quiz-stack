<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, List, Save, CheckCircle2, AlertTriangle, Download, Upload, X } from '@lucide/vue'
import { useQuiz, WRONG_REVIEW_BANK_ID } from '@/composables/useQuiz'
import { useWrongProblems } from '@/composables/useWrongProblems'
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
const quizReady = ref(false)
const navOpenButton = ref<HTMLButtonElement | null>(null)
const navCloseButton = ref<HTMLButtonElement | null>(null)
const navDialog = ref<HTMLElement | null>(null)
let bodyOverflowBeforeNav: string | null = null

const { count: wrongProblemCount } = useWrongProblems()

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
  resumeError,
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
watch([loading, showModeSelector, showResumePrompt], ([l, sms, resumePrompt]) => {
  if (!l && !sms && !resumePrompt && !error.value) {
    requestAnimationFrame(() => { quizReady.value = true })
  }
})

const importError = ref<string | null>(null)
const importSuccess = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const MAX_SESSION_IMPORT_BYTES = 2 * 1024 * 1024
let importSuccessTimer: ReturnType<typeof setTimeout> | null = null
let importRequestId = 0

function handleExport() {
  exportSession()
}

function handleImportClick() {
  fileInput.value?.click()
}

function showImportError(message: string) {
  importError.value = message
  importSuccess.value = false
  if (importSuccessTimer) {
    clearTimeout(importSuccessTimer)
    importSuccessTimer = null
  }
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const requestId = ++importRequestId
  importError.value = null
  importSuccess.value = false
  if (file.size > MAX_SESSION_IMPORT_BYTES) {
    showImportError('文件过大，练习进度文件不能超过 2 MB。')
    input.value = ''
    return
  }

  let reader: FileReader
  try {
    reader = new FileReader()
  } catch {
    showImportError('当前浏览器无法读取所选文件。')
    input.value = ''
    return
  }
  reader.onload = () => {
    if (requestId !== importRequestId) return
    if (typeof reader.result !== 'string') {
      showImportError('文件读取失败，请重试。')
      return
    }
    try {
      const err = importSession(reader.result)
      if (err) {
        showImportError(err)
        return
      }
      importError.value = null
      importSuccess.value = true
      if (importSuccessTimer) clearTimeout(importSuccessTimer)
      importSuccessTimer = setTimeout(() => {
        importSuccess.value = false
        importSuccessTimer = null
      }, 3000)
    } catch {
      showImportError('导入失败，请检查文件内容。')
    }
  }
  reader.onerror = () => {
    if (requestId === importRequestId) showImportError('文件读取失败，请重试。')
  }
  reader.onabort = () => {
    if (requestId === importRequestId) showImportError('文件读取已取消。')
  }
  try {
    reader.readAsText(file)
  } catch {
    showImportError('无法读取所选文件。')
  }
  // Reset input so the same file can be imported again
  input.value = ''
}

function handleModeConfirm(mode: PracticeMode) {
  if (mode === 'wrong-review' && bankId !== WRONG_REVIEW_BANK_ID) {
    void router.push({
      name: 'quiz',
      params: { bankId: WRONG_REVIEW_BANK_ID },
      query: { mode: 'wrong-review' },
    })
    return
  }
  showModeSelector.value = false
  void loadBank(mode)
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
  if (bankId === WRONG_REVIEW_BANK_ID) {
    startFresh()
    return
  }
  reset()
  showModeSelector.value = true
}

function goBack() {
  router.push('/')
}

// Keyboard shortcuts
function onKeydown(e: KeyboardEvent) {
  if (showNavPanel.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      showNavPanel.value = false
    } else if (e.key === 'Tab') {
      trapNavFocus(e)
    }
    return
  }
  if (showResult.value || showModeSelector.value) return
  const tag = (e.target as HTMLElement)?.tagName
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
  if (isInput) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  }
}

function trapNavFocus(event: KeyboardEvent) {
  const dialog = navDialog.value
  if (!dialog) return
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0)
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(showNavPanel, async (open) => {
  if (open) {
    bodyOverflowBeforeNav = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    navCloseButton.value?.focus()
  } else if (bodyOverflowBeforeNav !== null) {
    document.body.style.overflow = bodyOverflowBeforeNav
    bodyOverflowBeforeNav = null
    await nextTick()
    navOpenButton.value?.focus()
  }
})

const validRouteModes = new Set<PracticeMode>([
  'sequential',
  'random',
  'wrong-review',
  'mock-exam',
  'custom-practice',
])

interface RouteLaunchRequest {
  bankId: string
  mode: PracticeMode
  config?: CustomPracticeConfig
  fresh: boolean
  signature: string
  cleanSignature: string
  redirectToWrongReview: boolean
}

let routeSyncRunId = 0
let routeSyncDisposed = false
let suppressedRouteSignature: string | null = null
let stopRouteWatcher: (() => void) | null = null

function routeRequestSignature(
  requestBankId: string,
  requestedMode: PracticeMode,
  config: CustomPracticeConfig | undefined,
  fresh: boolean,
): string {
  return JSON.stringify([
    requestBankId,
    requestedMode,
    config?.enabledTypes ?? null,
    config?.shuffle ?? null,
    fresh,
  ])
}

function readRouteLaunchRequest(): RouteLaunchRequest | null {
  const routeBankId = typeof route.params.bankId === 'string' ? route.params.bankId : ''
  if (route.name !== 'quiz' || routeBankId !== bankId) return null

  const requested = routeBankId === WRONG_REVIEW_BANK_ID
    ? 'wrong-review'
    : typeof route.query.mode === 'string' ? route.query.mode : ''
  if (!validRouteModes.has(requested as PracticeMode)) return null

  const requestedMode = requested as PracticeMode
  let config: CustomPracticeConfig | undefined
  if (requestedMode === 'custom-practice') {
    const enabledTypes = typeof route.query.types === 'string'
      ? route.query.types.split(',').map(Number).filter((type) => Number.isInteger(type) && type >= 0 && type <= 4)
      : []
    if (enabledTypes.length === 0) return null
    config = {
      enabledTypes: Array.from(new Set(enabledTypes)).sort((left, right) => left - right),
      shuffle: route.query.shuffle !== '0',
    }
  }

  const fresh = route.query.fresh === '1'
  return {
    bankId: routeBankId,
    mode: requestedMode,
    config,
    fresh,
    signature: routeRequestSignature(routeBankId, requestedMode, config, fresh),
    cleanSignature: routeRequestSignature(routeBankId, requestedMode, config, false),
    redirectToWrongReview: requestedMode === 'wrong-review' && routeBankId !== WRONG_REVIEW_BANK_ID,
  }
}

function cloneCurrentQuery(): LocationQueryRaw {
  return Object.fromEntries(
    Object.entries(route.query).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : value,
    ]),
  )
}

function isCurrentRouteRun(runId: number, signature: string): boolean {
  if (routeSyncDisposed || runId !== routeSyncRunId) return false
  return readRouteLaunchRequest()?.signature === signature
}

async function startFromRouteQuery(request: RouteLaunchRequest) {
  const runId = ++routeSyncRunId

  if (request.redirectToWrongReview) {
    if (!isCurrentRouteRun(runId, request.signature)) return
    const nextQuery = cloneCurrentQuery()
    nextQuery.mode = 'wrong-review'
    try {
      await router.replace({
        name: 'quiz',
        params: { bankId: WRONG_REVIEW_BANK_ID },
        query: nextQuery,
        hash: route.hash,
      })
    } catch {
      // A cancelled navigation leaves the current route untouched.
    }
    return
  }

  quizReady.value = false
  showModeSelector.value = false
  await loadBank(request.mode, request.config)
  if (!isCurrentRouteRun(runId, request.signature)) return
  if (!request.fresh || error.value) return

  if (!startFresh() || !isCurrentRouteRun(runId, request.signature)) return
  const nextQuery = cloneCurrentQuery()
  delete nextQuery.fresh
  suppressedRouteSignature = request.cleanSignature
  try {
    await router.replace({
      name: 'quiz',
      params: { bankId: request.bankId },
      query: nextQuery,
      hash: route.hash,
    })
  } catch {
    // Keep fresh=1 in the URL so the user can retry the navigation.
  } finally {
    await nextTick()
    if (suppressedRouteSignature === request.cleanSignature) {
      suppressedRouteSignature = null
    }
  }
}

function syncFromRouteQuery() {
  const request = readRouteLaunchRequest()
  if (!request) {
    routeSyncRunId += 1
    return
  }
  if (suppressedRouteSignature === request.signature) {
    suppressedRouteSignature = null
    return
  }

  void startFromRouteQuery(request)
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  stopRouteWatcher = watch(
    () => readRouteLaunchRequest()?.signature ?? null,
    syncFromRouteQuery,
  )
  syncFromRouteQuery()
})

onBeforeUnmount(() => {
  routeSyncDisposed = true
  routeSyncRunId += 1
  stopRouteWatcher?.()
  stopRouteWatcher = null
  importRequestId += 1
  window.removeEventListener('keydown', onKeydown)
  if (importSuccessTimer) clearTimeout(importSuccessTimer)
  if (bodyOverflowBeforeNav !== null) {
    document.body.style.overflow = bodyOverflowBeforeNav
    bodyOverflowBeforeNav = null
  }
})
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-4 pb-16">
    <!-- Mode Selector -->
    <ModeSelector
      :show="showModeSelector"
      :wrong-problem-count="wrongProblemCount"
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
      <div class="paper-surface paper-flat skeleton-shimmer space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
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
      <div class="paper-surface paper-flat mx-auto max-w-md animate-scale-in rounded-2xl border border-indigo-200 bg-white p-8 shadow-lg ring-1 ring-indigo-100 dark:border-indigo-800 dark:bg-gray-800/80 dark:shadow-indigo-900/20 dark:ring-indigo-900/30">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
          <Save class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p class="text-lg font-semibold text-gray-900 dark:text-white">检测到上次的练习进度</p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">是否继续上次的练习？</p>
        <p v-if="resumeError" role="alert" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ resumeError }}</p>
        <div class="mt-6 flex justify-center gap-3">
          <button type="button" class="btn btn-primary paper-gradient-primary paper-flat px-6 shadow-sm" @click="resumeSession">继续练习</button>
          <button type="button" class="btn btn-secondary paper-flat px-6" @click="startFresh">重新开始</button>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="py-16 text-center">
      <div class="paper-feedback paper-feedback-error paper-flat mx-auto max-w-md animate-scale-in rounded-2xl border border-red-200 bg-white p-8 shadow-lg ring-1 ring-red-100 dark:border-red-800 dark:bg-gray-800/80">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
          <AlertTriangle class="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <p class="text-lg font-medium text-red-600 dark:text-red-400">{{ error }}</p>
        <button type="button" class="btn btn-secondary paper-flat mt-6" @click="goBack">返回首页</button>
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
          <button type="button" class="btn btn-ghost paper-flat" @click="goBack">返回题库列表</button>
        </div>
      </div>

      <!-- Quiz screen -->
      <template v-else>
        <!-- Top bar -->
        <header
          class="paper-surface paper-flat relative mb-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-xl transition-colors dark:border-gray-700/60 dark:bg-gray-800/70 sm:px-4"
          :class="{ 'animate-slide-down': quizReady }"
        >
          <div class="flex items-center gap-3 min-w-0">
            <button
              type="button"
              class="btn btn-ghost paper-flat -ml-1 shrink-0 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700/70"
              aria-label="返回题库列表"
              @click="goBack"
            >
              <ArrowLeft class="h-5 w-5" />
            </button>
            <div class="min-w-0">
              <h1 class="truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                {{ title }}
              </h1>
              <div class="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:gap-x-2.5">
                <QuizTimer :seconds="elapsedSeconds" />
                <span class="hidden select-none text-gray-300 dark:text-gray-600 sm:inline">|</span>
                <!-- Mode badge -->
                <span class="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 shadow-sm dark:bg-blue-900/60 dark:text-blue-300 sm:px-2">
                  {{ mode === 'sequential' ? '顺序' : mode === 'random' ? '乱序' : mode === 'mock-exam' ? '考试' : mode === 'custom-practice' ? '自定义' : '错题' }}
                </span>
                <!-- Save status indicator -->
                <span
                  v-if="saveStatus === 'saved'"
                  class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-green-600 dark:text-green-400"
                  :title="`上次保存于 ${lastSaveTime}`"
                >
                  <CheckCircle2 class="h-3 w-3" />
                  已保存
                </span>
                <span
                  v-else-if="saveStatus === 'saving'"
                  class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-gray-400 dark:text-gray-500"
                >
                  <Save class="h-3 w-3 animate-pulse" />
                  保存中
                </span>
                <span
                  v-else-if="saveStatus === 'error'"
                  class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-red-500 dark:text-red-400"
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
              type="button"
              class="paper-flat hidden items-center justify-center rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700/60 dark:hover:text-gray-300 sm:inline-flex"
              title="导出进度"
              aria-label="导出练习进度"
              @click="handleExport"
            >
              <Download class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="paper-flat hidden items-center justify-center rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700/60 dark:hover:text-gray-300 sm:inline-flex"
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
              ref="navOpenButton"
              type="button"
              class="paper-flat inline-flex items-center justify-center rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700/60 dark:hover:text-gray-300 lg:hidden"
              aria-label="打开题目导航"
              @click="showNavPanel = !showNavPanel"
            >
              <List class="h-5 w-5" />
            </button>
            <!-- Finish button -->
            <button
              type="button"
              class="btn paper-gradient-primary paper-flat paper-no-lift group rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/20 transition-all duration-200 hover:from-blue-700 hover:to-blue-600 hover:shadow-md hover:shadow-blue-500/25 active:scale-[0.97] sm:px-5 dark:from-blue-600 dark:to-blue-500 dark:shadow-blue-500/15"
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
            role="alert"
            class="paper-feedback paper-feedback-error paper-flat mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30"
          >
            <AlertTriangle class="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <p class="text-sm text-red-600 dark:text-red-400">{{ importError }}</p>
          </div>
        </Transition>
        <Transition name="fade-slide">
          <div
            v-if="importSuccess"
            role="status"
            class="paper-feedback paper-feedback-success paper-flat mb-4 flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30"
          >
            <CheckCircle2 class="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
            <p class="text-sm text-green-600 dark:text-green-400">进度导入成功</p>
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
                type="button"
                class="btn btn-secondary paper-flat paper-no-lift group rounded-xl px-4 py-2.5 text-sm shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.97] disabled:opacity-40 disabled:shadow-none disabled:hover:shadow-none"
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
                type="button"
                class="btn btn-secondary paper-flat paper-no-lift group rounded-xl px-4 py-2.5 text-sm shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.97] disabled:opacity-40 disabled:shadow-none disabled:hover:shadow-none"
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
            <div class="paper-surface paper-flat sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/50">
              <h3 class="shrink-0 px-4 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">题目导航</h3>
              <div class="flex-1 overflow-y-auto px-4 pb-4 pt-3 [&::-webkit-scrollbar]:hidden" style="scrollbar-width: none;">
                <QuestionNav
                  :problem-states="problemStates"
                  :current-index="currentIndex"
                  :exam-sections="examSections.length > 0 ? examSections : undefined"
                  @go-to="goTo"
                />
              </div>
            </div>
          </aside>
        </div>

        <!-- Mobile bottom bar -->
        <div class="paper-surface-strong paper-flat fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200/60 bg-white/90 px-4 py-2.5 backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/90 lg:hidden">
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
            role="presentation"
            @click.self="showNavPanel = false"
          >
            <div
              class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              @click="showNavPanel = false"
            />
            <section
              ref="navDialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-nav-title"
              tabindex="-1"
              class="paper-surface-strong paper-flat relative max-h-[60dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-2xl dark:bg-gray-900"
            >
              <!-- Drag handle -->
              <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
              <div class="flex items-center justify-between mb-3">
                <h3 id="mobile-nav-title" class="text-sm font-semibold text-gray-700 dark:text-gray-300">题目导航</h3>
                <button
                  ref="navCloseButton"
                  type="button"
                  class="paper-flat rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  aria-label="关闭题目导航"
                  @click="showNavPanel = false"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
              <QuestionNav
                :problem-states="problemStates"
                :current-index="currentIndex"
                :exam-sections="examSections.length > 0 ? examSections : undefined"
                @go-to="(i: number) => { goTo(i); showNavPanel = false }"
              />
            </section>
          </div>
        </Transition>
      </template>
    </template>
  </div>
</template>
