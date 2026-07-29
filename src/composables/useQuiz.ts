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
  PreparedProblem,
} from '@/types/problem'
import {
  PROBLEM_TYPE_LABELS,
  QUIZ_SNAPSHOT_VERSION,
  WARMUP_CONFIRMATION_ANSWER,
} from '@/types/problem'
import { shuffle, shuffleChoices } from '@/utils/shuffle'
import { getItem, setItem, removeItem } from '@/utils/storage'
import {
  createProblemIds,
  isAnswerForProblem,
  isCustomPracticeConfig,
  isPracticeMode,
  isProblem,
  questionBankDigest,
  stableChecksum,
} from '@/utils/problem'
import { useWrongProblems } from '@/composables/useWrongProblems'
import {
  createRecord,
  getRecord,
  saveRecord,
} from '@/composables/usePracticeRecords'

const SNAPSHOT_PREFIX = 'quiz-stack-snapshot-'
const SESSIONS_KEY = 'quiz-stack-sessions'
export const WRONG_REVIEW_BANK_ID = 'wrong-review'
const WRONG_REVIEW_TITLE = '错题复习'
const PRACTICE_MODES: readonly PracticeMode[] = [
  'sequential',
  'random',
  'wrong-review',
  'mock-exam',
  'custom-practice',
]

interface IndexedProblem {
  id: string
  sourceIndex: number
  problem: Problem
}

interface BuiltSession {
  problems: PreparedProblem[]
  examSections: MockExamSection[]
  sourceDigest: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function snapshotStorageKey(bankId: string, mode: PracticeMode): string {
  return `${SNAPSHOT_PREFIX}${bankId}-${mode}`
}

function normalizedCustomConfig(config: CustomPracticeConfig): CustomPracticeConfig {
  return {
    enabledTypes: [...config.enabledTypes].sort((a, b) => a - b),
    shuffle: config.shuffle,
  }
}

function customConfigsEqual(
  left: CustomPracticeConfig | null | undefined,
  right: CustomPracticeConfig | null | undefined
): boolean {
  if (!left || !right) return left === right
  const normalizedLeft = normalizedCustomConfig(left)
  const normalizedRight = normalizedCustomConfig(right)
  return normalizedLeft.shuffle === normalizedRight.shuffle &&
    arraysEqual(normalizedLeft.enabledTypes, normalizedRight.enabledTypes)
}

function readSessionRegistry(): Record<string, PracticeMode[]> {
  const stored = getItem<unknown>(SESSIONS_KEY, {})
  if (!isRecord(stored)) return {}

  const registry: Record<string, PracticeMode[]> = {}
  for (const [bankId, modes] of Object.entries(stored)) {
    if (!Array.isArray(modes)) continue
    const validModes = modes.filter(isPracticeMode)
    if (validModes.length > 0) registry[bankId] = [...new Set(validModes)]
  }
  return registry
}

/** List all active session modes for a given bank. */
export function getBankSessions(bankId: string): PracticeMode[] {
  return readSessionRegistry()[bankId] ?? []
}

/** Check if a bank has any saved session snapshots. */
export function hasSnapshot(bankId: string): boolean {
  return getBankSessions(bankId).length > 0
}

function registerSession(bankId: string, mode: PracticeMode): boolean {
  const all = readSessionRegistry()
  const modes = all[bankId] ?? []
  if (!modes.includes(mode)) all[bankId] = [...modes, mode]
  return setItem(SESSIONS_KEY, all)
}

function unregisterSession(bankId: string, mode: PracticeMode): boolean {
  const all = readSessionRegistry()
  if (!all[bankId]) return true
  all[bankId] = all[bankId].filter((entry) => entry !== mode)
  if (all[bankId].length === 0) delete all[bankId]
  return setItem(SESSIONS_KEY, all)
}

/** Clear all snapshots and session entries for a given bank. */
export function clearAllSnapshots(bankId: string): boolean {
  let success = true
  for (const mode of PRACTICE_MODES) {
    success = removeItem(snapshotStorageKey(bankId, mode)) && success
    success = unregisterSession(bankId, mode) && success
  }
  return success
}

function prepareProblem(entry: IndexedProblem, rng: () => number): PreparedProblem {
  const problem = entry.problem
  if (problem.type === 3) {
    return {
      id: entry.id,
      sourceIndex: entry.sourceIndex,
      original: problem,
      shuffledChoices: [],
      mappedAnswer: problem.answer,
    }
  }

  if (problem.type === 0) {
    if (!problem.choices?.length) {
      return {
        id: entry.id,
        sourceIndex: entry.sourceIndex,
        original: problem,
        shuffledChoices: [],
        mappedAnswer: problem.answer ?? WARMUP_CONFIRMATION_ANSWER,
      }
    }

    const answerIndex = typeof problem.answer === 'number'
      ? problem.answer
      : problem.choices.indexOf(problem.answer ?? '')
    if (answerIndex >= 0) {
      const shuffled = shuffleChoices(problem.choices, answerIndex, rng)
      return {
        id: entry.id,
        sourceIndex: entry.sourceIndex,
        original: problem,
        shuffledChoices: shuffled.shuffledChoices,
        mappedAnswer: shuffled.mappedAnswer,
      }
    }

    return {
      id: entry.id,
      sourceIndex: entry.sourceIndex,
      original: problem,
      shuffledChoices: shuffle(problem.choices, rng),
      mappedAnswer: problem.answer ?? WARMUP_CONFIRMATION_ANSWER,
    }
  }

  const { shuffledChoices, mappedAnswer } = shuffleChoices(
    problem.choices,
    problem.answer,
    rng
  )
  return {
    id: entry.id,
    sourceIndex: entry.sourceIndex,
    original: problem,
    shuffledChoices,
    mappedAnswer,
  }
}

function makeSeededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function createSessionSeed(): number {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
  }
  return (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0
}

function createSessionId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${createSessionSeed().toString(36)}`
}

function parseQuestionBank(value: unknown): QuestionBank {
  if (!isRecord(value) || typeof value.title !== 'string' || value.title.trim() === '') {
    throw new Error('题库格式无效：缺少 title')
  }
  if (!Array.isArray(value.problems) || !value.problems.every(isProblem)) {
    throw new Error('题库格式无效：problems 中包含无效题目')
  }

  const test = value.test
  if (test !== undefined) {
    const scalarIsValid = Number.isInteger(test) && (test as number) >= 0
    const arrayIsValid = Array.isArray(test) && test.length === 5 &&
      test.every((count) => Number.isInteger(count) && count >= 0)
    if (!scalarIsValid && !arrayIsValid) {
      throw new Error('题库格式无效：test 必须是非负整数或 5 项非负整数数组')
    }
  }

  const score = value.score
  if (score !== undefined && (
    !Array.isArray(score) || score.length !== 5 ||
    !score.every((points) => typeof points === 'number' && Number.isFinite(points) && points >= 0)
  )) {
    throw new Error('题库格式无效：score 必须是 5 项非负数字数组')
  }

  return value as unknown as QuestionBank
}

function indexProblems(source: readonly Problem[]): IndexedProblem[] {
  const ids = createProblemIds(source)
  return source.map((problem, sourceIndex) => ({
    id: ids[sourceIndex],
    sourceIndex,
    problem,
  }))
}

function createExamSections(
  selected: readonly PreparedProblem[],
  score: QuestionBank['score']
): MockExamSection[] {
  const sections: MockExamSection[] = []
  for (let problemType = 0; problemType <= 4; problemType++) {
    const count = selected.filter((problem) => problem.original.type === problemType).length
    if (count === 0) continue
    const scorePerProblem = score?.[problemType] ?? 0
    sections.push({
      problemType,
      typeLabel: PROBLEM_TYPE_LABELS[problemType] ?? `类型${problemType}`,
      count,
      scorePerProblem,
      totalScore: count * scorePerProblem,
      correct: 0,
    })
  }
  return sections
}

function groupPreparedByType(problems: readonly PreparedProblem[]): PreparedProblem[] {
  const grouped: PreparedProblem[] = []
  for (let problemType = 0; problemType <= 4; problemType++) {
    grouped.push(...problems.filter((problem) => problem.original.type === problemType))
  }
  return grouped
}

function createBankDigest(bank: QuestionBank, source: readonly Problem[]): string {
  const configDigest = stableChecksum(JSON.stringify({
    test: bank.test ?? null,
    score: bank.score ?? null,
  }))
  return `${questionBankDigest(source)}:${configDigest}`
}

function buildSession(
  bank: QuestionBank,
  selectedMode: PracticeMode,
  config: CustomPracticeConfig | null,
  seed: number,
  wrongSource: readonly Problem[]
): BuiltSession {
  const source = selectedMode === 'wrong-review' ? [...wrongSource] : bank.problems
  if (selectedMode === 'wrong-review' && source.length === 0) {
    throw new Error('还没有错题，先去练习吧！')
  }

  const indexed = indexProblems(source)
  const rng = makeSeededRng(seed)
  let prepared: PreparedProblem[]
  let examSections: MockExamSection[] = []

  if (selectedMode === 'mock-exam') {
    if (Array.isArray(bank.test)) {
      const selected: PreparedProblem[] = []
      for (let problemType = 0; problemType <= 4; problemType++) {
        const count = bank.test[problemType] ?? 0
        if (count === 0) continue
        const candidates = indexed
          .filter((entry) => entry.problem.type === problemType)
          .map((entry) => prepareProblem(entry, rng))
        if (candidates.length < count) {
          throw new Error(
            `模拟考试配置无效：${PROBLEM_TYPE_LABELS[problemType] ?? `类型 ${problemType}`}要求 ${count} 题，但题库只有 ${candidates.length} 题`
          )
        }
        selected.push(...shuffle(candidates, rng).slice(0, count))
      }
      prepared = selected
      examSections = createExamSections(prepared, bank.score)
    } else {
      const allPrepared = indexed.map((entry) => prepareProblem(entry, rng))
      const count = typeof bank.test === 'number' ? bank.test : allPrepared.length
      if (count <= 0 || count > allPrepared.length) {
        throw new Error(`模拟考试配置无效：要求 ${count} 题，但题库共有 ${allPrepared.length} 题`)
      }
      const selected = shuffle(allPrepared, rng).slice(0, count)
      if (bank.test !== undefined || bank.score !== undefined) {
        prepared = groupPreparedByType(selected)
        examSections = createExamSections(prepared, bank.score)
      } else {
        prepared = selected
      }
    }
  } else if (selectedMode === 'custom-practice') {
    if (!config) throw new Error('自定义练习配置无效')
    const filtered = indexed.filter((entry) => config.enabledTypes.includes(entry.problem.type))
    if (filtered.length === 0) throw new Error('没有符合筛选条件的题目')
    prepared = filtered.map((entry) => prepareProblem(entry, rng))
    if (config.shuffle) prepared = shuffle(prepared, rng)
  } else {
    prepared = indexed.map((entry) => prepareProblem(entry, rng))
    if (selectedMode === 'random' || selectedMode === 'wrong-review') {
      prepared = shuffle(prepared, rng)
    }
  }

  if (prepared.length === 0) throw new Error('题库中没有可用题目')
  return {
    problems: prepared,
    examSections,
    sourceDigest: createBankDigest(bank, source),
  }
}

function checkPreparedAnswer(prepared: PreparedProblem, userAnswer: UserAnswer): boolean {
  if (userAnswer === null) return false
  const correct = prepared.mappedAnswer
  switch (prepared.original.type) {
    case 0:
      return true
    case 1:
    case 4:
      return userAnswer === correct
    case 2: {
      if (!Array.isArray(userAnswer) || !Array.isArray(correct)) return false
      if (userAnswer.length !== correct.length) return false
      const expected = [...correct].sort((a, b) => a - b)
      const actual = [...userAnswer].sort((a, b) => a - b)
      return expected.every((answer, index) => answer === actual[index])
    }
    case 3: {
      if (typeof userAnswer !== 'string') return false
      const correctBlanks = String(correct).split(',').map((answer) => answer.trim())
      const userBlanks = userAnswer.split(',').map((answer) => answer.trim())
      if (correctBlanks.length !== userBlanks.length) return false
      return correctBlanks.every((correctBlank, index) =>
        correctBlank.split(';').map((synonym) => synonym.trim()).includes(userBlanks[index])
      )
    }
  }
}

function snapshotMetadataSeed(
  value: unknown,
  bankId: string,
  selectedMode: PracticeMode,
  digest: string,
  config: CustomPracticeConfig | null
): number | null {
  if (!isRecord(value) || value.schemaVersion !== QUIZ_SNAPSHOT_VERSION) return null
  if (value.bankId !== bankId || value.mode !== selectedMode || value.bankDigest !== digest) return null
  if (!Number.isInteger(value.sessionSeed) || (value.sessionSeed as number) < 0 ||
      (value.sessionSeed as number) > 0xffffffff) return null
  if (selectedMode === 'custom-practice') {
    if (!isCustomPracticeConfig(value.customConfig) ||
        !customConfigsEqual(value.customConfig, config)) return null
  }
  return value.sessionSeed as number
}

function validateSnapshot(
  value: unknown,
  bankId: string,
  selectedMode: PracticeMode,
  prepared: readonly PreparedProblem[],
  digest: string,
  config: CustomPracticeConfig | null
): string | null {
  if (!isRecord(value)) return '文件根节点必须是对象'
  if (value.schemaVersion !== QUIZ_SNAPSHOT_VERSION) {
    return `不支持的快照版本（需要 ${QUIZ_SNAPSHOT_VERSION}）`
  }
  if (value.bankId !== bankId) return '题库 ID 不匹配'
  if (!isPracticeMode(value.mode)) return 'mode 无效'
  if (value.mode !== selectedMode) return '练习模式不匹配'
  if (typeof value.sessionId !== 'string' ||
      !/^[a-zA-Z0-9-]{8,128}$/.test(value.sessionId)) {
    return 'sessionId 无效'
  }
  if (!Number.isInteger(value.sessionSeed) || (value.sessionSeed as number) < 0 ||
      (value.sessionSeed as number) > 0xffffffff) return 'sessionSeed 无效'
  if (value.bankDigest !== digest) return '题库内容已变更'

  const expectedIds = prepared.map((problem) => problem.id)
  const expectedIndices = prepared.map((problem) => problem.sourceIndex)
  if (!Array.isArray(value.problemIds) || !value.problemIds.every((id) => typeof id === 'string') ||
      !arraysEqual(value.problemIds, expectedIds)) return '题目顺序或内容不匹配'
  if (!Array.isArray(value.problemIndices) ||
      !value.problemIndices.every((index) => Number.isInteger(index) && index >= 0) ||
      !arraysEqual(value.problemIndices, expectedIndices)) return '题目来源索引不匹配'

  if (!Number.isInteger(value.currentIndex) || (value.currentIndex as number) < 0 ||
      (value.currentIndex as number) >= prepared.length) return 'currentIndex 超出范围'
  if (!Array.isArray(value.answers) || value.answers.length !== prepared.length) {
    return 'answers 数量不匹配'
  }
  if (!Array.isArray(value.problemStates) || value.problemStates.length !== prepared.length ||
      !value.problemStates.every((state) => [0, 1, 2, 3].includes(state as number))) {
    return 'problemStates 无效'
  }

  if (typeof value.examSubmitted !== 'boolean') return 'examSubmitted 无效'
  if (typeof value.completed !== 'boolean') return 'completed 无效'
  const examSubmitted = value.examSubmitted
  if (selectedMode !== 'mock-exam' && examSubmitted) return '非考试模式不能包含交卷状态'
  if (selectedMode === 'mock-exam' && value.completed !== examSubmitted) {
    return '考试完成状态与交卷状态不一致'
  }
  if (!value.completed && value.completionRecordId !== undefined) {
    return '未完成快照不能包含完成记录 ID'
  }
  if (value.completed && value.completionRecordId !== `${bankId}-${value.sessionId}`) {
    return '完成记录 ID 与会话不匹配'
  }

  for (let index = 0; index < prepared.length; index++) {
    const answer = value.answers[index]
    const state = value.problemStates[index] as number
    if (!isAnswerForProblem(answer, prepared[index].original)) {
      return `第 ${index + 1} 题答案类型或范围无效`
    }
    if (state === 0 && answer !== null) return `第 ${index + 1} 题未答状态与答案不一致`
    if ((state === 1 || state === 2) && answer === null) {
      return `第 ${index + 1} 题作答状态缺少答案`
    }
    if (state === 3 && answer === null && !(selectedMode === 'mock-exam' && examSubmitted)) {
      return `第 ${index + 1} 题错误状态缺少答案`
    }
    if (selectedMode === 'mock-exam') {
      if (examSubmitted && state !== 2 && state !== 3) return '已交卷快照包含未评分题目'
      if (!examSubmitted && state !== 0 && state !== 1) return '未交卷快照包含评分结果'
    } else if (state === 1) {
      return '非考试模式不能包含待评分状态'
    }

    const isGraded = selectedMode !== 'mock-exam' || examSubmitted
    if (isGraded && (state === 2 || state === 3)) {
      const answerIsCorrect = checkPreparedAnswer(prepared[index], answer)
      if ((state === 2) !== answerIsCorrect) {
        return `第 ${index + 1} 题评分状态与答案不一致`
      }
    }
  }

  if (selectedMode === 'custom-practice') {
    if (!isCustomPracticeConfig(value.customConfig) ||
        !customConfigsEqual(value.customConfig, config)) return '自定义练习配置不匹配'
  } else if (value.customConfig !== undefined) {
    return '当前模式不应包含自定义练习配置'
  }

  if (!Number.isFinite(value.startTime) || (value.startTime as number) < 0) return 'startTime 无效'
  if (!Number.isSafeInteger(value.elapsedSeconds) || (value.elapsedSeconds as number) < 0) {
    return 'elapsedSeconds 无效'
  }
  if (value.savedAt !== undefined && (!Number.isFinite(value.savedAt) || (value.savedAt as number) < 0)) {
    return 'savedAt 无效'
  }
  if (
    !Array.isArray(value.retryCounts) || value.retryCounts.length !== prepared.length ||
    !value.retryCounts.every((count) => Number.isSafeInteger(count) && count >= 0)
  ) return 'retryCounts 无效'
  return null
}

export function useQuiz(bankId: string) {
  const { addWrong, addManyWrong, wrongProblems } = useWrongProblems()

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
  const resumeError = ref<string | null>(null)
  const retryCounts = ref<number[]>([])
  const saveStatus: Ref<'idle' | 'saving' | 'saved' | 'error'> = ref('idle')
  const lastSaveTime = ref('')
  const customConfig = ref<CustomPracticeConfig | null>(null)
  const examSections = ref<MockExamSection[]>([])
  const examSubmitted = ref(false)

  const sessionSeed = ref(createSessionSeed())
  const sessionId = ref(createSessionId())
  const sourceDigest = ref('')
  const completionRecordId = ref<string | null>(null)
  let loadedBank: QuestionBank | null = null

  const examTotalScore = computed(() =>
    examSections.value.reduce((sum, section) => sum + section.totalScore, 0)
  )
  const examEarnedScore = computed(() =>
    examSections.value.reduce(
      (sum, section) => sum + section.correct * section.scorePerProblem,
      0
    )
  )

  let timerHandle: ReturnType<typeof setInterval> | null = null
  let timerStartedAt: number | null = null
  let timerBaseElapsed = 0
  let autoAdvanceHandle: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  let loadRequestId = 0

  function syncElapsedTime() {
    if (timerStartedAt === null) return
    elapsedSeconds.value = timerBaseElapsed +
      Math.floor((Date.now() - timerStartedAt) / 1000)
    startTime.value = Date.now() - elapsedSeconds.value * 1000
  }

  function canRunTimer(): boolean {
    return !loading.value && error.value === null && problems.value.length > 0 &&
      !showResult.value && !showResumePrompt.value && !examSubmitted.value &&
      (typeof document === 'undefined' || !document.hidden)
  }

  function startTimer() {
    if (timerHandle !== null || !canRunTimer()) return
    timerBaseElapsed = elapsedSeconds.value
    timerStartedAt = Date.now()
    startTime.value = timerStartedAt - timerBaseElapsed * 1000
    timerHandle = setInterval(syncElapsedTime, 1000)
  }

  function stopTimer() {
    syncElapsedTime()
    if (timerHandle !== null) clearInterval(timerHandle)
    timerHandle = null
    timerStartedAt = null
    timerBaseElapsed = elapsedSeconds.value
  }

  function cancelAutoAdvance() {
    if (autoAdvanceHandle !== null) {
      clearTimeout(autoAdvanceHandle)
      autoAdvanceHandle = null
    }
  }

  const currentProblem: ComputedRef<PreparedProblem | null> = computed(() =>
    problems.value[currentIndex.value] ?? null
  )
  const totalCount = computed(() => problems.value.length)
  const correctCount = computed(() => problemStates.value.filter((state) => state === 2).length)
  const attemptedCount = computed(() => problemStates.value.filter((state) => state >= 2).length)
  const answeredCount = computed(() => problemStates.value.filter((state) => state >= 1).length)
  const accuracy = computed(() => attemptedCount.value === 0
    ? 0
    : Math.round((correctCount.value / attemptedCount.value) * 100)
  )
  const isDone = computed(() =>
    problemStates.value.length > 0 && problemStates.value.every((state) => state >= 2)
  )

  function snapshotKey(selectedMode: PracticeMode = mode.value): string {
    return snapshotStorageKey(bankId, selectedMode)
  }

  function buildSnapshot(completed = showResult.value || examSubmitted.value): QuizSnapshot {
    syncElapsedTime()
    return {
      schemaVersion: QUIZ_SNAPSHOT_VERSION,
      bankId,
      mode: mode.value,
      sessionId: sessionId.value,
      sessionSeed: sessionSeed.value,
      bankDigest: sourceDigest.value,
      problemIds: problems.value.map((problem) => problem.id),
      problemIndices: problems.value.map((problem) => problem.sourceIndex),
      currentIndex: currentIndex.value,
      answers: answers.value.map((answer) => Array.isArray(answer) ? [...answer] : answer),
      problemStates: [...problemStates.value],
      startTime: Date.now() - elapsedSeconds.value * 1000,
      elapsedSeconds: elapsedSeconds.value,
      retryCounts: [...retryCounts.value],
      savedAt: Date.now(),
      customConfig: customConfig.value ? normalizedCustomConfig(customConfig.value) : undefined,
      examSubmitted: examSubmitted.value,
      completed,
      completionRecordId: completionRecordId.value ?? undefined,
    }
  }

  function markSaved() {
    saveStatus.value = 'saved'
    const now = new Date()
    lastSaveTime.value = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((part) => String(part).padStart(2, '0'))
      .join(':')
  }

  function persistSnapshot(snapshot: QuizSnapshot): boolean {
    const alreadyRegistered = getBankSessions(bankId).includes(snapshot.mode)
    const shouldRegister = !snapshot.completed
    if (shouldRegister && !alreadyRegistered && !registerSession(bankId, snapshot.mode)) return false
    if (!setItem(snapshotKey(snapshot.mode), snapshot)) {
      if (shouldRegister && !alreadyRegistered) unregisterSession(bankId, snapshot.mode)
      return false
    }
    if (!shouldRegister && !unregisterSession(bankId, snapshot.mode)) return false
    return true
  }

  function saveSnapshot(): boolean {
    saveStatus.value = 'saving'
    const success = persistSnapshot(buildSnapshot())
    if (success) markSaved()
    else saveStatus.value = 'error'
    return success
  }

  function loadSnapshot(selectedMode: PracticeMode = mode.value): unknown {
    return getItem<unknown>(snapshotKey(selectedMode), null)
  }

  function clearSnapshot(): boolean {
    const removed = removeItem(snapshotKey())
    const unregistered = unregisterSession(bankId, mode.value)
    if (removed && unregistered) {
      saveStatus.value = 'idle'
      return true
    }
    saveStatus.value = 'error'
    return false
  }

  function updateExamSectionScores() {
    for (const section of examSections.value) {
      section.correct = problems.value.reduce((count, problem, index) =>
        count + (problem.original.type === section.problemType && problemStates.value[index] === 2 ? 1 : 0),
      0)
    }
  }

  function initFreshState() {
    currentIndex.value = 0
    answers.value = new Array<UserAnswer>(problems.value.length).fill(null)
    problemStates.value = new Array<ProblemState>(problems.value.length).fill(0)
    retryCounts.value = new Array<number>(problems.value.length).fill(0)
    startTime.value = Date.now()
    elapsedSeconds.value = 0
    submitted.value = false
    showResult.value = false
    showResumePrompt.value = false
    resumeError.value = null
    examSubmitted.value = false
    completionRecordId.value = null
    saveStatus.value = 'idle'
    for (const section of examSections.value) section.correct = 0
  }

  function applySnapshot(snapshot: QuizSnapshot) {
    stopTimer()
    sessionSeed.value = snapshot.sessionSeed
    sessionId.value = snapshot.sessionId
    currentIndex.value = snapshot.currentIndex
    answers.value = snapshot.answers.map((answer) => Array.isArray(answer) ? [...answer] : answer)
    problemStates.value = [...snapshot.problemStates]
    retryCounts.value = [...snapshot.retryCounts]
    elapsedSeconds.value = snapshot.elapsedSeconds
    startTime.value = Date.now() - snapshot.elapsedSeconds * 1000
    timerBaseElapsed = snapshot.elapsedSeconds
    customConfig.value = snapshot.customConfig
      ? normalizedCustomConfig(snapshot.customConfig)
      : null
    examSubmitted.value = snapshot.examSubmitted
    showResult.value = snapshot.completed
    completionRecordId.value = snapshot.completionRecordId ?? null
    submitted.value = examSubmitted.value || (
      mode.value !== 'mock-exam' && problemStates.value[currentIndex.value] >= 2
    )
    updateExamSectionScores()
    showResumePrompt.value = false
    resumeError.value = null
    markSaved()
    if (snapshot.completed && !saveCompletedRecord(snapshot)) saveStatus.value = 'error'
    if (canRunTimer()) startTimer()
  }

  function rebuild(
    bank: QuestionBank,
    selectedMode: PracticeMode,
    config: CustomPracticeConfig | null,
    seed: number
  ): BuiltSession {
    return buildSession(bank, selectedMode, config, seed, wrongProblems.value)
  }

  async function loadBank(
    modeParam?: PracticeMode,
    customConfigParam?: CustomPracticeConfig
  ) {
    if (disposed) return
    if (canSaveLifecycleSnapshot()) saveSnapshot()
    const requestId = ++loadRequestId
    loading.value = true
    error.value = null
    resumeError.value = null
    showResumePrompt.value = false
    stopTimer()
    cancelAutoAdvance()

    try {
      if (modeParam !== undefined && !isPracticeMode(modeParam)) {
        throw new Error('无效的练习模式')
      }
      const selectedMode = modeParam ?? mode.value
      if (selectedMode === 'wrong-review' && bankId !== WRONG_REVIEW_BANK_ID) {
        throw new Error('错题复习必须使用专用入口')
      }
      if (selectedMode !== 'wrong-review' && bankId === WRONG_REVIEW_BANK_ID) {
        throw new Error('错题复习入口仅支持错题复习模式')
      }

      let bank: QuestionBank
      if (selectedMode === 'wrong-review') {
        bank = {
          title: WRONG_REVIEW_TITLE,
          problems: [...wrongProblems.value],
        }
      } else {
        const response = await fetch(`data/${bankId}.json`)
        if (disposed || requestId !== loadRequestId) return
        if (!response.ok) throw new Error(`题库加载失败：HTTP ${response.status}`)
        bank = parseQuestionBank(await response.json() as unknown)
        if (disposed || requestId !== loadRequestId) return
      }
      loadedBank = bank
      title.value = bank.title
      originalProblems.value = bank.problems
      mode.value = selectedMode

      const rawSnapshot = loadSnapshot(selectedMode)
      let config: CustomPracticeConfig | null = null
      if (selectedMode === 'custom-practice') {
        const savedConfig = isRecord(rawSnapshot) && isCustomPracticeConfig(rawSnapshot.customConfig)
          ? rawSnapshot.customConfig
          : null
        const requestedConfig = customConfigParam ?? savedConfig
        if (!requestedConfig || !isCustomPracticeConfig(requestedConfig)) {
          throw new Error('自定义练习配置无效')
        }
        config = normalizedCustomConfig(requestedConfig)
      }
      customConfig.value = config

      const source = selectedMode === 'wrong-review' ? wrongProblems.value : bank.problems
      const digest = createBankDigest(bank, source)
      let seed = snapshotMetadataSeed(rawSnapshot, bankId, selectedMode, digest, config) ??
        createSessionSeed()
      let built = rebuild(bank, selectedMode, config, seed)
      const validationError = validateSnapshot(
        rawSnapshot,
        bankId,
        selectedMode,
        built.problems,
        built.sourceDigest,
        config
      )

      if (validationError !== null) {
        if (rawSnapshot !== null) removeItem(snapshotKey(selectedMode))
        unregisterSession(bankId, selectedMode)
        seed = createSessionSeed()
        built = rebuild(bank, selectedMode, config, seed)
      }

      sessionSeed.value = seed
      sourceDigest.value = built.sourceDigest
      problems.value = built.problems
      examSections.value = built.examSections

      if (validationError === null && (rawSnapshot as QuizSnapshot).completed) {
        applySnapshot(rawSnapshot as QuizSnapshot)
      } else if (validationError === null) {
        initFreshState()
        showResumePrompt.value = true
        markSaved()
      } else {
        sessionId.value = createSessionId()
        initFreshState()
      }
    } catch (caught: unknown) {
      if (!disposed && requestId === loadRequestId) {
        error.value = caught instanceof Error ? caught.message : '题库加载失败'
      }
    } finally {
      if (!disposed && requestId === loadRequestId) loading.value = false
    }

    if (!disposed && requestId === loadRequestId &&
        !error.value && !showResult.value && !showResumePrompt.value) {
      startTimer()
      if (saveStatus.value === 'idle') saveSnapshot()
    }
  }

  function currentSnapshotValidation(raw: unknown): string | null {
    return validateSnapshot(
      raw,
      bankId,
      mode.value,
      problems.value,
      sourceDigest.value,
      customConfig.value
    )
  }

  /** Resume the previously saved session if it still matches the loaded questions. */
  function resumeSession(): boolean {
    const raw = loadSnapshot()
    if (currentSnapshotValidation(raw) !== null) {
      resumeError.value = '保存的练习进度已失效，请重新开始。'
      return false
    }
    resumeError.value = null
    applySnapshot(raw as QuizSnapshot)
    return true
  }

  /** Start a new attempt with a new random seed. */
  function startFresh(): boolean {
    if (disposed || loading.value || error.value !== null || !loadedBank || problems.value.length === 0) {
      return false
    }
    stopTimer()
    cancelAutoAdvance()
    clearSnapshot()
    sessionSeed.value = createSessionSeed()
    sessionId.value = createSessionId()
    completionRecordId.value = null
    if (loadedBank) {
      const built = rebuild(loadedBank, mode.value, customConfig.value, sessionSeed.value)
      problems.value = built.problems
      examSections.value = built.examSections
      sourceDigest.value = built.sourceDigest
    }
    initFreshState()
    startTimer()
    return saveSnapshot()
  }

  function goTo(index: number) {
    cancelAutoAdvance()
    if (!Number.isInteger(index) || index < 0 || index >= problems.value.length) return
    currentIndex.value = index
    submitted.value = mode.value === 'mock-exam' && !examSubmitted.value
      ? false
      : problemStates.value[index] >= 2
    saveSnapshot()
  }

  function next() {
    if (currentIndex.value < problems.value.length - 1) goTo(currentIndex.value + 1)
  }

  function prev() {
    if (currentIndex.value > 0) goTo(currentIndex.value - 1)
  }

  function checkAnswer(userAnswer: UserAnswer): boolean {
    const prepared = currentProblem.value
    return prepared ? checkPreparedAnswer(prepared, userAnswer) : false
  }

  function scheduleAutoAdvance() {
    if (!['sequential', 'random', 'mock-exam'].includes(mode.value)) return
    cancelAutoAdvance()
    autoAdvanceHandle = setTimeout(() => {
      autoAdvanceHandle = null
      if (currentIndex.value < problems.value.length - 1) goTo(currentIndex.value + 1)
    }, 200)
  }

  function checkAutoSubmit() {
    if (mode.value !== 'mock-exam' || examSubmitted.value) return
    if (problemStates.value.length > 0 && problemStates.value.every((state) => state >= 1)) {
      cancelAutoAdvance()
      autoAdvanceHandle = setTimeout(() => {
        autoAdvanceHandle = null
        submitExam()
      }, 800)
    }
  }

  function submitAnswer(userAnswer: UserAnswer) {
    const index = currentIndex.value
    const prepared = problems.value[index]
    if (!prepared || !isAnswerForProblem(userAnswer, prepared.original) || userAnswer === null) return

    if (mode.value === 'mock-exam' && !examSubmitted.value) {
      answers.value[index] = Array.isArray(userAnswer) ? [...userAnswer] : userAnswer
      problemStates.value[index] = 1
      submitted.value = false
      saveSnapshot()
      scheduleAutoAdvance()
      checkAutoSubmit()
      return
    }
    if ((mode.value === 'mock-exam' && examSubmitted.value) || submitted.value) return

    const isCorrect = checkAnswer(userAnswer)
    answers.value[index] = Array.isArray(userAnswer) ? [...userAnswer] : userAnswer
    problemStates.value[index] = isCorrect ? 2 : 3
    submitted.value = true

    let wrongProblemSaved = true
    if (!isCorrect) wrongProblemSaved = addWrong(prepared.original)
    const snapshotSaved = saveSnapshot()
    if (!wrongProblemSaved || !snapshotSaved) saveStatus.value = 'error'
    if (isCorrect && (mode.value === 'sequential' || mode.value === 'random')) {
      scheduleAutoAdvance()
    }
  }

  function ensureCompletionRecordId(): string {
    if (!completionRecordId.value) {
      completionRecordId.value = `${bankId}-${sessionId.value}`
    }
    return completionRecordId.value
  }

  function saveCompletedRecord(snapshot: QuizSnapshot): boolean {
    const recordId = ensureCompletionRecordId()
    const existing = getRecord(recordId)
    const record = existing ?? createRecord({
      bankId,
      bankTitle: title.value,
      mode: mode.value,
      customConfig: customConfig.value,
      totalQuestions: problems.value.length,
      correctCount: correctCount.value,
      attemptedCount: attemptedCount.value,
      elapsedSeconds: elapsedSeconds.value,
      accuracy: accuracy.value,
      snapshot,
      completed: true,
    })

    record.id = recordId
    record.bankTitle = title.value
    record.mode = mode.value
    record.customConfig = customConfig.value ?? undefined
    record.totalQuestions = problems.value.length
    record.correctCount = correctCount.value
    record.attemptedCount = attemptedCount.value
    record.elapsedSeconds = elapsedSeconds.value
    record.accuracy = accuracy.value
    record.snapshot = snapshot
    record.completed = true
    return saveRecord(record)
  }

  /** Submit and persist a terminal mock-exam state. */
  function submitExam() {
    if (mode.value !== 'mock-exam' || examSubmitted.value) return
    cancelAutoAdvance()
    stopTimer()
    examSubmitted.value = true

    const incorrectProblems: Problem[] = []
    for (let index = 0; index < problems.value.length; index++) {
      const answer = answers.value[index]
      const correct = answer !== null && checkPreparedAnswer(problems.value[index], answer)
      problemStates.value[index] = correct ? 2 : 3
      if (!correct) incorrectProblems.push(problems.value[index].original)
    }
    const wrongProblemsSaved = addManyWrong(incorrectProblems)

    updateExamSectionScores()
    showResult.value = true
    submitted.value = true
    ensureCompletionRecordId()
    const snapshot = buildSnapshot(true)
    const snapshotSaved = persistSnapshot(snapshot)
    const recordSaved = saveCompletedRecord(snapshot)
    if (snapshotSaved && wrongProblemsSaved && recordSaved) markSaved()
    else saveStatus.value = 'error'
  }

  function retry() {
    if (examSubmitted.value) return
    cancelAutoAdvance()
    const index = currentIndex.value
    if (!problems.value[index]) return
    retryCounts.value[index] = (retryCounts.value[index] ?? 0) + 1
    submitted.value = false
    saveSnapshot()
  }

  function finish() {
    stopTimer()
    cancelAutoAdvance()
    showResult.value = true
    ensureCompletionRecordId()
    const snapshot = buildSnapshot(true)
    const snapshotSaved = persistSnapshot(snapshot)
    const recordSaved = saveCompletedRecord(snapshot)
    if (snapshotSaved && recordSaved) clearSnapshot()
    else saveStatus.value = 'error'
  }

  function reset() {
    stopTimer()
    cancelAutoAdvance()
    clearSnapshot()
    sessionSeed.value = createSessionSeed()
    sessionId.value = createSessionId()
    problems.value = []
    examSections.value = []
    sourceDigest.value = ''
    initFreshState()
  }

  function getWrongProblems(): PreparedProblem[] {
    return problems.value.filter((_, index) => problemStates.value[index] === 3)
  }

  function exportSession() {
    const snapshot = loadSnapshot()
    if (currentSnapshotValidation(snapshot) !== null) return
    const exportData = {
      ...(snapshot as QuizSnapshot),
      exportedAt: Date.now(),
      bankTitle: title.value,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const modeLabel = mode.value === 'sequential' ? '顺序' :
      mode.value === 'random' ? '乱序' :
      mode.value === 'mock-exam' ? '考试' :
      mode.value === 'custom-practice' ? '自定义' : '错题'
    const safeTitle = title.value.replace(/[^a-zA-Z0-9一-鿿]/g, '_').slice(0, 30)
    anchor.download = `quiz-progress-${safeTitle}-${modeLabel}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  /** Validate completely, persist, then replace state as one in-memory operation. */
  function importSession(jsonString: string): string | null {
    try {
      const parsed: unknown = JSON.parse(jsonString)
      if (!isRecord(parsed)) return '导入失败：文件根节点必须是对象'
      if (parsed.bankId !== bankId) {
        return `导入失败：题库 ID 不匹配（当前为 ${bankId}，文件为 ${String(parsed.bankId ?? '未知')}）`
      }
      if (!isPracticeMode(parsed.mode)) return '导入失败：mode 无效'
      if (parsed.mode !== mode.value) return '导入失败：练习模式与当前模式不匹配'
      if (!loadedBank) return '导入失败：题库尚未加载完成'
      if (!Number.isInteger(parsed.sessionSeed) || (parsed.sessionSeed as number) < 0 ||
          (parsed.sessionSeed as number) > 0xffffffff) return '导入失败：sessionSeed 无效'

      let importedConfig: CustomPracticeConfig | null = null
      if (parsed.mode === 'custom-practice') {
        if (!isCustomPracticeConfig(parsed.customConfig)) return '导入失败：自定义练习配置无效'
        importedConfig = normalizedCustomConfig(parsed.customConfig)
      }

      const built = rebuild(loadedBank, parsed.mode, importedConfig, parsed.sessionSeed as number)
      const validationError = validateSnapshot(
        parsed,
        bankId,
        parsed.mode,
        built.problems,
        built.sourceDigest,
        importedConfig
      )
      if (validationError) return `导入失败：${validationError}`

      const snapshot = parsed as unknown as QuizSnapshot
      if (!persistSnapshot(snapshot)) return '导入失败：浏览器存储写入失败'

      stopTimer()
      cancelAutoAdvance()
      customConfig.value = importedConfig
      sessionSeed.value = snapshot.sessionSeed
      sourceDigest.value = built.sourceDigest
      problems.value = built.problems
      examSections.value = built.examSections
      applySnapshot(snapshot)
      return null
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : '未知错误'
      return `导入失败：无法解析或应用 JSON 文件（${message}）`
    }
  }

  function canSaveLifecycleSnapshot(): boolean {
    return !disposed && !loading.value && error.value === null && problems.value.length > 0 &&
      sourceDigest.value !== '' && !showResult.value && !showResumePrompt.value
  }

  function onUnload() {
    if (canSaveLifecycleSnapshot()) saveSnapshot()
  }

  function onVisibilityChange() {
    if (document.hidden) {
      stopTimer()
      if (canSaveLifecycleSnapshot()) saveSnapshot()
    } else if (canRunTimer()) {
      startTimer()
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    stopTimer()
    cancelAutoAdvance()
    window.removeEventListener('beforeunload', onUnload)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (canSaveLifecycleSnapshot()) saveSnapshot()
    disposed = true
    loadRequestId += 1
  })

  return {
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
    resumeError,
    retryCounts,
    saveStatus,
    lastSaveTime,
    customConfig,
    examSections,
    examSubmitted,
    examTotalScore,
    examEarnedScore,
    currentProblem,
    totalCount,
    correctCount,
    attemptedCount,
    answeredCount,
    accuracy,
    isDone,
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
