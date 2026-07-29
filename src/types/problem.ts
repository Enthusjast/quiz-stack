// ============================================================
// Problem types — compatible with vstc/vtix-ng JSON format
// So existing question bank files can be used without changes.
// ============================================================

/** 热身题 — an acknowledgement question that is always awarded. */
export type WarmupProblem = {
  type: 0
  content: string
  /** Optional choices for legacy banks that render warmups as a single choice. */
  choices?: string[]
  /** Optional reference answer. It does not affect the awarded result. */
  answer?: number | string
  hint?: string
}

/** 单选题 — choose one correct answer from choices */
export type SingleChoiceProblem = {
  type: 1
  content: string
  choices: string[]
  answer: number
  hint?: string
}

/** 多选题 — choose multiple correct answers */
export type MultiChoiceProblem = {
  type: 2
  content: string
  choices: string[]
  answer: number[]
  hint?: string
}

/** 填空题 — fill in the blank(s) */
export type FillInBlankProblem = {
  type: 3
  content: string
  answer: string
  hint?: string
}

/** 判断题 — true/false judgment */
export type TrueFalseProblem = {
  type: 4
  content: string
  choices: [string, string]
  answer: number
  hint?: string
}

/** Discriminated union of all problem types */
export type Problem =
  | WarmupProblem
  | SingleChoiceProblem
  | MultiChoiceProblem
  | FillInBlankProblem
  | TrueFalseProblem

/** A question bank file (e.g. public/data/demo.json) */
export interface QuestionBank {
  title: string
  problems: Problem[]
  /** Mock exam config: number of questions (scalar = total, array = per-type [0,1,2,3,4]) */
  test?: number | [number, number, number, number, number]
  /** Mock exam scoring: points per problem for each type [type0, type1, type2, type3, type4] */
  score?: [number, number, number, number, number]
}

/** Registry entry for one bank in list.json */
export interface BankEntry {
  title: string
  categories: string[]
  questionCount: number
  time?: number
  new?: boolean
}

/** Registry file format (public/data/list.json) */
export interface BankRegistry {
  categories: string[]
  recommended: string[]
  banks: Record<string, BankEntry>
}

// ============================================================
// Quiz session state
// ============================================================

/** Practice mode */
export type PracticeMode =
  | 'sequential'
  | 'random'
  | 'wrong-review'
  | 'mock-exam'
  | 'custom-practice'

/** Custom practice configuration (type 0-4 filter + shuffle toggle) */
export interface CustomPracticeConfig {
  /** Problem types to include (0=热身, 1=单选, 2=多选, 3=填空, 4=判断) */
  enabledTypes: number[]
  /** Whether to shuffle question order */
  shuffle: boolean
}

/** Per-section score breakdown for mock exam result display */
export interface MockExamSection {
  /** Numeric problem type represented by this section. */
  problemType: number
  /** Type label (e.g. "单选题") */
  typeLabel: string
  /** Number of problems in this section */
  count: number
  /** Points per problem */
  scorePerProblem: number
  /** Total points for this section (count × scorePerProblem) */
  totalScore: number
  /** Number of correctly answered problems */
  correct: number
}

/**
 * Problem state:
 *    0 = unanswered
 *    1 = answered but not graded (mock exam only)
 *    2 = correct
 *    3 = wrong
 */
export type ProblemState = 0 | 1 | 2 | 3

/** User's answer; null represents an unanswered problem. */
export type UserAnswer = number | number[] | string | null

/** Current persisted session format. */
export const QUIZ_SNAPSHOT_VERSION = 2 as const

/** Value submitted by acknowledgement-style type 0 questions. */
export const WARMUP_CONFIRMATION_ANSWER = '__warmup_confirmed__'

/** Persisted quiz session snapshot (goes into localStorage) */
export interface QuizSnapshot {
  schemaVersion: typeof QUIZ_SNAPSHOT_VERSION
  bankId: string
  mode: PracticeMode
  /** Stable identifier for this attempt, used for idempotent records. */
  sessionId: string
  /** Per-attempt seed used for question and choice order. */
  sessionSeed: number
  /** Digest of the ordered source questions. */
  bankDigest: string
  /** Stable IDs in the exact displayed order. */
  problemIds: string[]
  /** Source indices retained for diagnostics/backward export tooling. */
  problemIndices: number[]
  currentIndex: number
  answers: UserAnswer[]
  problemStates: ProblemState[]
  startTime: number
  elapsedSeconds: number
  /** Retry count per problem */
  retryCounts: number[]
  /** Unix timestamp of last save */
  savedAt?: number
  /** Custom practice config (for custom-practice mode) */
  customConfig?: CustomPracticeConfig
  /** Whether a mock exam has been submitted and graded. */
  examSubmitted: boolean
  /** Whether this attempt has reached its terminal result screen. */
  completed: boolean
  /** Stable record ID once a completion record has been created. */
  completionRecordId?: string
}

/** Label for each problem type */
export const PROBLEM_TYPE_LABELS: Record<number, string> = {
  0: '热身题',
  1: '单选题',
  2: '多选题',
  3: '填空题',
  4: '判断题',
}

/** Choice letters */
export const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const

/** A problem prepared for display (choices shuffled, answer remapped) */
export interface PreparedProblem {
  /** Stable full-content ID, disambiguated for duplicate occurrences. */
  id: string
  /** Index in the source collection used to build this session. */
  sourceIndex: number
  original: Problem
  shuffledChoices: string[]
  mappedAnswer: number | number[] | string
}
