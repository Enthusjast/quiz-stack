import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  Problem,
  PracticeMode,
  ProblemState,
  UserAnswer,
  QuestionBank,
  QuizSnapshot,
  CustomPracticeConfig,
  MockExamSection,
} from '@/types/problem'
import { PROBLEM_TYPE_LABELS } from '@/types/problem'
import { shuffle, shuffleChoices } from '@/utils/shuffle'
import { getItem, setItem, removeItem } from '@/utils/storage'
import { hashCode } from '@/utils/format'
import { useWrongProblems } from '@/composables/useWrongProblems'
import { createRecord, saveRecord } from '@/composables/usePracticeRecords'

const SNAPSHOT_PREFIX = 'quiz-stack-snapshot-'
const SESSIONS_KEY = 'quiz-stack-sessions'

// ============================================================
// Module-level helpers (for cross-bank progress tracking)
// ============================================================

/** List all active session modes for a given bank. */
export function getBankSessions(bankId: string): PracticeMode[] {
  const all: Record<string, PracticeMode[]> = getItem(SESSIONS_KEY, {})
  return all[bankId] ?? []
}

/** Check if a bank has any saved session snapshots. */
export function hasSnapshot(bankId: string): boolean {
  return getBankSessions(bankId).length > 0
}

function registerSession(bankId: string, mode: PracticeMode) {
  const all: Record<string, PracticeMode[]> = getItem(SESSIONS_KEY, {})
  if (!all[bankId]) all[bankId] = []
  if (!all[bankId].includes(mode)) all[bankId].push(mode)
  setItem(SESSIONS_KEY, all)
}

function unregisterSession(bankId: string, mode: PracticeMode) {
  const all: Record<string, PracticeMode[]> = getItem(SESSIONS_KEY, {})
  if (all[bankId]) {
    all[bankId] = all[bankId].filter((m) => m !== mode)
    if (all[bankId].length === 0) delete all[bankId]
    setItem(SESSIONS_KEY, all)
  }
}

/** Clear all snapshots and session entries for a given bank. */
export function clearAllSnapshots(bankId: string) {
  const modes = getBankSessions(bankId)
  for (const mode of modes) {
    removeItem(SNAPSHOT_PREFIX + bankId + '-' + mode)
  }
  unregisterSession(bankId, 'sequential')
  unregisterSession(bankId, 'random')
  unregisterSession(bankId, 'wrong-review')
  unregisterSession(bankId, 'mock-exam')
  unregisterSession(bankId, 'custom-practice')
}

// ============================================================
// Prepare problem helpers
// ============================================================

/**
 * Represents a single question ready for display (choices may be shuffled).
 */
export interface PreparedProblem {
  original: Problem
  /** Shuffled choices (for type 1, 2, 4). Empty for type 3. */
  shuffledChoices: string[]
  /** Answer mapped to shuffled indices (or string for fill-in-blank). */
  mappedAnswer: number | number[] | string
}

function prepareProblem(problem: Problem, rng: () => number): PreparedProblem {
  if (problem.type === 3) {
    return {
      original: problem,
      shuffledChoices: [],
      mappedAnswer: problem.answer,
    }
  }
  const { shuffledChoices, mappedAnswer } = shuffleChoices(
    problem.choices as string[],
    problem.answer as number | number[],
    rng
  )
  return { original: problem, shuffledChoices, mappedAnswer }
}

// ============================================================
// Seeded RNG
// ============================================================

function makeSeededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) | 0
    return ((s >>> 0) / 4294967296 + 0.5) % 1
  }
}

// ============================================================
// useQuiz composable
// ============================================================

export function useQuiz(bankId: string) {
  // ---- wrong problems singleton ----
  const { addWrong, wrongProblems } = useWrongProblems()

  // ---- reactive state ----
  const loading = ref(true)
  const error = ref<string | null>(null)
  const title = ref('')
  const mode: Ref<PracticeMode> = ref('sequential')
  const problems = ref<PreparedProblem[]>([])
  const originalProblems = ref<Problem[]>([])
  const currentIndex = ref(0)
  const answers = ref<UserAnswer[]>([])
  const problemStates = ref<ProblemState[]>([])
  const startTime = ref(Date.now())
  const elapsedSeconds = ref(0)
  const submitted = ref(false)
  const showResult = ref(false)
  const showResumePrompt = ref(false)

  // ---- retry tracking ----
  const retryCounts = ref<number[]>([])

  // ---- save status ----
  const saveStatus: Ref<'idle' | 'saving' | 'saved' | 'error'> = ref('idle')
  const lastSaveTime = ref('')

  // ---- custom practice ----
  const customConfig = ref<CustomPracticeConfig | null>(null)

  // ---- mock exam ----
  const examSections = ref<MockExamSection[]>([])
  const examSubmitted = ref(false)
  const examTotalScore = computed(() =>
    examSections.value.reduce((sum, s) => sum + s.totalScore, 0)
  )
  const examEarnedScore = computed(() =>
    examSections.value.reduce((sum, s) => sum + s.correct * s.scorePerProblem, 0)
  )

  // ---- timer ----
  let timerHandle: ReturnType<typeof setInterval> | null = null
  let autoAdvanceHandle: ReturnType<typeof setTimeout> | null = null

  function startTimer() {
    if (timerHandle !== null) return
    timerHandle = setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
    }, 1000)
  }

  function stopTimer() {
    if (timerHandle !== null) {
      clearInterval(timerHandle)
      timerHandle = null
    }
  }

  function cancelAutoAdvance() {
    if (autoAdvanceHandle !== null) {
      clearTimeout(autoAdvanceHandle)
      autoAdvanceHandle = null
    }
  }

  // ---- computed ----
  const currentProblem: ComputedRef<PreparedProblem | null> = computed(() =>
    problems.value[currentIndex.value] ?? null
  )

  const totalCount = computed(() => problems.value.length)

  const correctCount = computed(() => problemStates.value.filter((s) => s === 2).length)

  const attemptedCount = computed(() => problemStates.value.filter((s) => s >= 2).length)

  const answeredCount = computed(() =>
    problemStates.value.filter((s) => s >= 1).length
  )

  const accuracy = computed(() => {
    if (attemptedCount.value === 0) return 0
    return Math.round((correctCount.value / attemptedCount.value) * 100)
  })

  const isDone = computed(() => {
    return problemStates.value.length > 0 && problemStates.value.every((s) => s >= 2)
  })

  // ---- snapshot key ----
  function snapshotKey(): string {
    return SNAPSHOT_PREFIX + bankId + '-' + mode.value
  }

  // ---- persistence ----
  function saveSnapshot() {
    saveStatus.value = 'saving'
    try {
      const snap: QuizSnapshot = {
        bankId,
        mode: mode.value,
        problemIndices: problems.value.map((_, i) => i),
        currentIndex: currentIndex.value,
        answers: answers.value,
        problemStates: problemStates.value,
        startTime: startTime.value,
        elapsedSeconds: elapsedSeconds.value,
        retryCounts: retryCounts.value,
        savedAt: Date.now(),
        customConfig: customConfig.value ?? undefined,
      }
      setItem(snapshotKey(), snap)
      registerSession(bankId, mode.value)
      saveStatus.value = 'saved'
      const now = new Date()
      lastSaveTime.value = String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0')
    } catch (e) {
      saveStatus.value = 'error'
    }
  }

  function loadSnapshot(): QuizSnapshot | null {
    return getItem<QuizSnapshot | null>(snapshotKey(), null)
  }

  function clearSnapshot() {
    removeItem(snapshotKey())
    unregisterSession(bankId, mode.value)
    saveStatus.value = 'idle'
  }

  // ---- core logic ----

  async function loadBank(
    modeParam?: PracticeMode,
    customConfigParam?: CustomPracticeConfig
  ) {
    loading.value = true
    error.value = null
    cancelAutoAdvance()

    try {
      const resp = await fetch(`data/${bankId}.json`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const bank: QuestionBank = await resp.json()

      if (!bank.problems || !Array.isArray(bank.problems)) {
        throw new Error('Invalid bank format: missing "problems" array')
      }

      title.value = bank.title
      originalProblems.value = bank.problems

      // Determine mode
      if (modeParam) {
        mode.value = modeParam
      }

      const seed = hashCode(bankId)
      const rng = makeSeededRng(seed)

      // ---- Mock exam mode: select problems per test/score config ----
      if (mode.value === 'mock-exam') {
        const testConfig = bank.test
        const scoreConfig = bank.score

        if (!testConfig) {
          // No exam config on bank — fall back to all problems
          const prepared = bank.problems.map((p) => prepareProblem(p, rng))
          const shuffled = shuffle(prepared, rng)
          problems.value = shuffled
          examSections.value = []
        } else if (typeof testConfig === 'number') {
          // Scalar: take first N after shuffle
          const prepared = bank.problems.map((p) => prepareProblem(p, rng))
          const shuffled = shuffle(prepared, rng)
          problems.value = shuffled.slice(0, testConfig)
          examSections.value = []
        } else {
          // Array [n0, n1, n2, n3, n4]: per-type selection
          const selected: PreparedProblem[] = []
          const sections: MockExamSection[] = []

          for (let type = 0; type <= 4; type++) {
            const count = testConfig[type] ?? 0
            if (count === 0) continue

            const ofType = bank.problems
              .filter((p) => p.type === type)
              .map((p) => prepareProblem(p, rng))
            const shuffled = shuffle(ofType, rng)
            const chosen = shuffled.slice(0, count)

            selected.push(...chosen)

            const scorePer = (scoreConfig?.[type] ?? 0)
            sections.push({
              typeLabel: PROBLEM_TYPE_LABELS[type] || `类型${type}`,
              count: chosen.length,
              scorePerProblem: scorePer,
              totalScore: chosen.length * scorePer,
              correct: 0,
            })
          }

          problems.value = selected
          examSections.value = sections
        }
      } else if (mode.value === 'custom-practice' && customConfigParam) {
        // ---- Custom practice: filter by enabled types ----
        customConfig.value = customConfigParam
        const filtered = bank.problems.filter((p) =>
          customConfigParam.enabledTypes.includes(p.type)
        )

        if (filtered.length === 0) {
          throw new Error('没有符合筛选条件的题目')
        }

        let prepared = filtered.map((p) => prepareProblem(p, rng))

        if (customConfigParam.shuffle) {
          prepared = shuffle(prepared, rng)
        }

        problems.value = prepared
      } else if (mode.value === 'wrong-review') {
        // ---- Wrong review: load from accumulated wrong problems ----
        if (wrongProblems.value.length === 0) {
          throw new Error('还没有错题，先去练习吧！')
        }
        const prepared = wrongProblems.value.map((p) => prepareProblem(p, rng))
        problems.value = shuffle(prepared, rng)
      } else {
        // ---- Standard modes (sequential / random) ----
        const prepared = bank.problems.map((p) => prepareProblem(p, rng))

        if (mode.value === 'random') {
          problems.value = shuffle(prepared, rng)
        } else {
          problems.value = prepared
        }
      }

      // Check for saved snapshot
      const snap = loadSnapshot()
      if (snap && snap.problemStates && snap.problemStates.length === problems.value.length) {
        // Resume existing session
        currentIndex.value = snap.currentIndex
        answers.value = snap.answers
        problemStates.value = snap.problemStates
        startTime.value = snap.startTime
        elapsedSeconds.value = snap.elapsedSeconds
        submitted.value = problemStates.value[snap.currentIndex] >= 2
        retryCounts.value = snap.retryCounts ?? new Array(problems.value.length).fill(0)
        customConfig.value = snap.customConfig ?? null
        showResumePrompt.value = false
        saveStatus.value = 'saved'
      } else {
        // No snapshot or problem count mismatch — start fresh
        initFreshState()
      }

      startTimer()
    } catch (e: any) {
      error.value = e.message || 'Failed to load question bank'
    } finally {
      loading.value = false
    }
  }

  function initFreshState() {
    currentIndex.value = 0
    answers.value = new Array(problems.value.length).fill(null)
    problemStates.value = new Array(problems.value.length).fill(0)
    retryCounts.value = new Array(problems.value.length).fill(0)
    startTime.value = Date.now()
    elapsedSeconds.value = 0
    submitted.value = false
    saveStatus.value = 'idle'
    showResumePrompt.value = false
  }

  /** Resume the previously saved session. */
  function resumeSession() {
    const snap = loadSnapshot()
    if (snap && snap.problemStates && snap.problemStates.length === problems.value.length) {
      currentIndex.value = snap.currentIndex
      answers.value = snap.answers
      problemStates.value = snap.problemStates
      startTime.value = snap.startTime
      elapsedSeconds.value = snap.elapsedSeconds
      retryCounts.value = snap.retryCounts ?? new Array(problems.value.length).fill(0)
      customConfig.value = snap.customConfig ?? null
      submitted.value = problemStates.value[snap.currentIndex] >= 2
      showResumePrompt.value = false
      saveStatus.value = 'saved'
    }
  }

  /** Start fresh, discarding any saved snapshot. */
  function startFresh() {
    clearSnapshot()
    initFreshState()
    saveSnapshot()
  }

  function goTo(index: number) {
    cancelAutoAdvance()
    if (index >= 0 && index < problems.value.length) {
      currentIndex.value = index
      // In exam mode (not yet submitted): always allow re-answering
      submitted.value = mode.value === 'mock-exam' && !examSubmitted.value
        ? false
        : problemStates.value[index] >= 2
      saveSnapshot()
    }
  }

  function next() {
    cancelAutoAdvance()
    if (currentIndex.value < problems.value.length - 1) {
      goTo(currentIndex.value + 1)
    }
  }

  function prev() {
    cancelAutoAdvance()
    if (currentIndex.value > 0) {
      goTo(currentIndex.value - 1)
    }
  }

  /**
   * Check the user's answer against the correct answer.
   */
  function checkAnswer(userAnswer: UserAnswer): boolean {
    const prep = currentProblem.value
    if (!prep) return false

    const correct = prep.mappedAnswer

    switch (prep.original.type) {
      case 1: // single choice
      case 4: // true/false
        return userAnswer === (correct as number)

      case 2: { // multi choice
        if (!Array.isArray(userAnswer)) return false
        const ca = correct as number[]
        if (userAnswer.length !== ca.length) return false
        const caSorted = [...ca].sort()
        const uaSorted = [...userAnswer].sort()
        return caSorted.every((v, i) => v === uaSorted[i])
      }

      case 3: { // fill-in-the-blank
        if (typeof userAnswer !== 'string') return false
        const correctStr = String(correct)
        const correctBlanks = correctStr.split(',').map((s) => s.trim())
        const userBlanks = userAnswer.split(',').map((s) => s.trim())
        if (correctBlanks.length !== userBlanks.length) return false
        return correctBlanks.every((cb, i) => {
          const synonyms = cb.split(';').map((s) => s.trim())
          return synonyms.includes(userBlanks[i])
        })
      }

      default:
        return false
    }
  }

  function submitAnswer(userAnswer: UserAnswer) {
    const idx = currentIndex.value
    if (idx < 0 || idx >= problems.value.length) return

    // In mock exam mode: save answer but don't grade
    if (mode.value === 'mock-exam' && !examSubmitted.value) {
      answers.value[idx] = userAnswer
      problemStates.value[idx] = 1 // answered but not graded
      submitted.value = false
      saveSnapshot()
      // Auto-advance in exam mode too
      scheduleAutoAdvance()
      // Check if all questions answered → auto-submit
      checkAutoSubmit()
      return
    }

    // In mock exam already submitted: don't allow re-answering
    if (mode.value === 'mock-exam' && examSubmitted.value) return

    // Standard modes: grade immediately
    if (submitted.value) return

    const isCorrect = checkAnswer(userAnswer)
    answers.value[idx] = userAnswer
    problemStates.value[idx] = isCorrect ? 2 : 3
    submitted.value = true

    // Add to wrong problems if incorrect
    if (!isCorrect) {
      addWrong(problems.value[idx].original)
    }

    saveSnapshot()

    // Auto-advance on correct answer (sequential & random modes only)
    if (isCorrect && (mode.value === 'sequential' || mode.value === 'random')) {
      scheduleAutoAdvance()
    }
  }

  function scheduleAutoAdvance() {
    // Only auto-advance in sequential, random, and mock-exam modes
    if (mode.value !== 'sequential' && mode.value !== 'random' && mode.value !== 'mock-exam') return
    cancelAutoAdvance()
    autoAdvanceHandle = setTimeout(() => {
      if (currentIndex.value < problems.value.length - 1) {
        goTo(currentIndex.value + 1)
      }
    }, 200)
  }

  /** Check if all questions are answered in mock exam — auto-submit if so. */
  function checkAutoSubmit() {
    if (mode.value !== 'mock-exam' || examSubmitted.value) return
    const allAnswered = problemStates.value.every((s) => s >= 1)
    if (allAnswered && problemStates.value.length > 0) {
      cancelAutoAdvance()
      // Brief delay so the user sees the last answer confirmed
      autoAdvanceHandle = setTimeout(() => {
        submitExam()
      }, 800)
    }
  }

  /** Submit exam: grade all answers, compute per-section scores. */
  function submitExam() {
    if (mode.value !== 'mock-exam' || examSubmitted.value) return
    examSubmitted.value = true

    // Grade all problems
    for (let i = 0; i < problems.value.length; i++) {
      const ans = answers.value[i]
      if (ans === null || ans === undefined) {
        // Unanswered — mark as wrong
        problemStates.value[i] = 3
        continue
      }

      // Temporarily set current index for checkAnswer to work
      const savedIdx = currentIndex.value
      currentIndex.value = i
      const correct = checkAnswer(ans)
      problemStates.value[i] = correct ? 2 : 3

      // Add to wrong problems if incorrect
      if (!correct) {
        addWrong(problems.value[i].original)
      }

      currentIndex.value = savedIdx
    }

    // Compute per-section correctness if sections exist
    if (examSections.value.length > 0) {
      let problemOffset = 0
      for (const section of examSections.value) {
        section.correct = 0
        for (let j = 0; j < section.count; j++) {
          const idx = problemOffset + j
          if (problemStates.value[idx] === 2) {
            section.correct++
          }
        }
        problemOffset += section.count
      }
    }

    saveSnapshot()
    showResult.value = true
    submitted.value = true
    // Create a practice record for the completed exam
    saveCompletedRecord()
  }

  function saveCompletedRecord() {
    try {
      const record = createRecord({
        bankId,
        bankTitle: title.value,
        mode: mode.value,
        customConfig: customConfig.value,
        totalQuestions: problems.value.length,
        correctCount: correctCount.value,
        attemptedCount: attemptedCount.value || problems.value.length,
        elapsedSeconds: elapsedSeconds.value,
        accuracy: accuracy.value,
        snapshot: loadSnapshot(),
        completed: true,
      })
      saveRecord(record)
    } catch {
      // Non-critical — don't break the UI if record save fails
    }
  }

  function retry() {
    cancelAutoAdvance()
    const idx = currentIndex.value
    retryCounts.value[idx] = (retryCounts.value[idx] ?? 0) + 1
    submitted.value = false
    saveSnapshot()
  }

  function finish() {
    stopTimer()
    cancelAutoAdvance()
    clearSnapshot()
    showResult.value = true
    saveCompletedRecord()
  }

  function reset() {
    stopTimer()
    cancelAutoAdvance()
    clearSnapshot()
    answers.value = new Array(problems.value.length).fill(null)
    problemStates.value = new Array(problems.value.length).fill(0)
    retryCounts.value = new Array(problems.value.length).fill(0)
    currentIndex.value = 0
    submitted.value = false
    showResult.value = false
    showResumePrompt.value = false
    examSubmitted.value = false
    startTime.value = Date.now()
    elapsedSeconds.value = 0
    saveStatus.value = 'idle'
    startTimer()
  }

  function getWrongProblems(): PreparedProblem[] {
    return problems.value.filter((_, i) => problemStates.value[i] === 3)
  }

  // ---- session export / import ----

  /** Export current session snapshot as a downloadable JSON file. */
  function exportSession() {
    const snap = loadSnapshot()
    if (!snap) return
    // Add metadata for the export file
    const exportData = {
      ...snap,
      exportedAt: Date.now(),
      bankTitle: title.value,
      bankId,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const modeLabel =
      mode.value === 'sequential' ? '顺序' :
      mode.value === 'random' ? '乱序' :
      mode.value === 'mock-exam' ? '考试' :
      mode.value === 'custom-practice' ? '自定义' : '错题'
    const safeTitle = title.value.replace(/[^a-zA-Z0-9一-鿿]/g, '_').slice(0, 30)
    a.download = `quiz-progress-${safeTitle}-${modeLabel}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /** Import a previously exported session snapshot. Returns error message if invalid. */
  function importSession(jsonString: string): string | null {
    try {
      const data = JSON.parse(jsonString)

      // Validate essential fields
      if (!data.bankId || data.bankId !== bankId) {
        return '导入失败：题库 ID 不匹配（当前为 ' + bankId + '，文件为 ' + (data.bankId || '未知') + '）'
      }
      if (!Array.isArray(data.problemStates) || !Array.isArray(data.answers)) {
        return '导入失败：文件格式无效（缺少 problemStates 或 answers）'
      }
      if (data.problemStates.length !== problems.value.length) {
        return `导入失败：题目数量不匹配（当前 ${problems.value.length} 题，文件 ${data.problemStates.length} 题）`
      }

      // Validate state values
      if (!data.problemStates.every((s: any) => [0, 1, 2, 3, -1].includes(s))) {
        return '导入失败：problemStates 包含无效值'
      }

      // Restore state
      if (data.mode) mode.value = data.mode
      currentIndex.value = data.currentIndex ?? 0
      answers.value = data.answers
      problemStates.value = data.problemStates
      retryCounts.value = data.retryCounts ?? new Array(problems.value.length).fill(0)
      if (data.elapsedSeconds) elapsedSeconds.value = data.elapsedSeconds
      if (data.startTime) startTime.value = data.startTime
      if (data.customConfig) customConfig.value = data.customConfig

      submitted.value = problemStates.value[currentIndex.value] >= 2
      saveSnapshot()
      return null // success
    } catch (e: any) {
      return '导入失败：无法解析 JSON 文件（' + e.message + '）'
    }
  }

  // ---- lifecycle ----

  /** Save on browser close / refresh. */
  function onUnload() {
    if (!showResult.value) saveSnapshot()
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onUnload)
  })

  onBeforeUnmount(() => {
    stopTimer()
    cancelAutoAdvance()
    window.removeEventListener('beforeunload', onUnload)
    if (!showResult.value) {
      saveSnapshot()
    }
  })

  return {
    // state
    loading,
    error,
    title,
    mode,
    problems,
    currentIndex,
    answers,
    problemStates,
    startTime,
    elapsedSeconds,
    submitted,
    showResult,
    showResumePrompt,
    retryCounts,
    saveStatus,
    lastSaveTime,
    customConfig,
    // mock exam
    examSections,
    examSubmitted,
    examTotalScore,
    examEarnedScore,
    // computed
    currentProblem,
    totalCount,
    correctCount,
    attemptedCount,
    answeredCount,
    accuracy,
    isDone,
    // actions
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
    getWrongProblems,
    clearSnapshot,
    exportSession,
    importSession,
  }
}
