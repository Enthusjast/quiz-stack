import { ref, computed, onBeforeUnmount } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  Problem,
  PracticeMode,
  ProblemState,
  UserAnswer,
  QuestionBank,
  QuizSnapshot,
} from '@/types/problem'
import { shuffle, shuffleChoices } from '@/utils/shuffle'
import { getItem, setItem, removeItem } from '@/utils/storage'
import { hashCode } from '@/utils/format'
import { useWrongProblems } from '@/composables/useWrongProblems'

const SNAPSHOT_PREFIX = 'quiz-stack-snapshot-'

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
    // Fill-in-the-blank: no choices to shuffle
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

export function useQuiz(bankId: string) {
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
  const submitted = ref(false)    // whether current question has been submitted
  const showResult = ref(false)  // show final summary

  // ---- timer ----
  let timerHandle: ReturnType<typeof setInterval> | null = null

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

  // ---- computed ----
  const currentProblem: ComputedRef<PreparedProblem | null> = computed(() =>
    problems.value[currentIndex.value] ?? null
  )

  const totalCount = computed(() => problems.value.length)

  const correctCount = computed(() => problemStates.value.filter((s) => s === 2).length)

  const attemptedCount = computed(() => problemStates.value.filter((s) => s >= 2).length)

  const accuracy = computed(() => {
    if (attemptedCount.value === 0) return 0
    return Math.round((correctCount.value / attemptedCount.value) * 100)
  })

  const isDone = computed(() => {
    // All problems have been attempted at least once
    return problemStates.value.length > 0 && problemStates.value.every((s) => s >= 2)
  })

  // ---- snapshot key ----
  function snapshotKey(): string {
    return SNAPSHOT_PREFIX + bankId + '-' + mode.value
  }

  // ---- persistence ----
  function saveSnapshot() {
    const snap: QuizSnapshot = {
      bankId,
      mode: mode.value,
      problemIndices: problems.value.map((_, i) => i), // restore won't need this; we just save state
      currentIndex: currentIndex.value,
      answers: answers.value,
      problemStates: problemStates.value,
      startTime: startTime.value,
      elapsedSeconds: elapsedSeconds.value,
    }
    setItem(snapshotKey(), snap)
  }

  function loadSnapshot(): QuizSnapshot | null {
    return getItem<QuizSnapshot | null>(snapshotKey(), null)
  }

  function clearSnapshot() {
    removeItem(snapshotKey())
  }

  // ---- core logic ----

  async function loadBank(modeParam?: PracticeMode) {
    loading.value = true
    error.value = null

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

      // Build problem list with shuffled choices
      const seed = hashCode(bankId)
      let rng = (): number => Math.random()
      if (mode.value === 'random') {
        rng = (() => {
          let s = seed
          return () => {
            s = (s * 1664525 + 1013904223) | 0
            return ((s >>> 0) / 4294967296 + 0.5) % 1
          }
        })()
      }

      const prepared = bank.problems.map((p) => prepareProblem(p, rng))

      // Shuffle problem order for random mode
      if (mode.value === 'random') {
        const shuffled = shuffle(prepared, rng)
        problems.value = shuffled
      } else {
        problems.value = prepared
      }

      // Check for saved snapshot
      const snap = loadSnapshot()
      if (snap && snap.problemStates && snap.problemStates.length === problems.value.length) {
        currentIndex.value = snap.currentIndex
        answers.value = snap.answers
        problemStates.value = snap.problemStates
        startTime.value = snap.startTime
        elapsedSeconds.value = snap.elapsedSeconds
        submitted.value = false
      } else {
        currentIndex.value = 0
        answers.value = new Array(problems.value.length).fill(null)
        problemStates.value = new Array(problems.value.length).fill(0)
        startTime.value = Date.now()
        elapsedSeconds.value = 0
        submitted.value = false
      }

      startTimer()
    } catch (e: any) {
      error.value = e.message || 'Failed to load question bank'
    } finally {
      loading.value = false
    }
  }

  function goTo(index: number) {
    if (index >= 0 && index < problems.value.length) {
      currentIndex.value = index
      submitted.value = problemStates.value[index] >= 2
      saveSnapshot()
    }
  }

  function next() {
    if (currentIndex.value < problems.value.length - 1) {
      goTo(currentIndex.value + 1)
    }
  }

  function prev() {
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
        // Support semicolon-separated synonyms per blank
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
    if (submitted.value) return
    const idx = currentIndex.value
    if (idx < 0 || idx >= problems.value.length) return

    const isCorrect = checkAnswer(userAnswer)
    answers.value[idx] = userAnswer
    // On first attempt: 2=correct, 3=wrong. Subsequent: re-submit keeps last state.
    problemStates.value[idx] = isCorrect ? 2 : 3
    submitted.value = true

    // Add to wrong problems if incorrect
    if (!isCorrect) {
      const { addWrong } = useWrongProblems()
      addWrong(problems.value[idx].original)
    }

    saveSnapshot()
  }

  /** Allow re-submitting an already-submitted question. */
  function retry() {
    submitted.value = false
    saveSnapshot()
  }

  function finish() {
    stopTimer()
    clearSnapshot()
    showResult.value = true
  }

  function reset() {
    stopTimer()
    clearSnapshot()
    answers.value = new Array(problems.value.length).fill(null)
    problemStates.value = new Array(problems.value.length).fill(0)
    currentIndex.value = 0
    submitted.value = false
    showResult.value = false
    startTime.value = Date.now()
    elapsedSeconds.value = 0
    startTimer()
  }

  function getWrongProblems(): PreparedProblem[] {
    return problems.value.filter((_, i) => problemStates.value[i] === 3)
  }

  // ---- cleanup ----
  onBeforeUnmount(() => {
    stopTimer()
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
    // computed
    currentProblem,
    totalCount,
    correctCount,
    attemptedCount,
    accuracy,
    isDone,
    // actions
    loadBank,
    goTo,
    next,
    prev,
    submitAnswer,
    retry,
    finish,
    reset,
    getWrongProblems,
    clearSnapshot,
  }
}