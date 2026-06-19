// ============================================================
// Problem types — compatible with vstc/vtix-ng JSON format
// So existing question bank files can be used without changes.
// ============================================================

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
  | SingleChoiceProblem
  | MultiChoiceProblem
  | FillInBlankProblem
  | TrueFalseProblem

/** A question bank file (e.g. public/data/demo.json) */
export interface QuestionBank {
  title: string
  problems: Problem[]
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
export type PracticeMode = 'sequential' | 'random' | 'wrong-review'

/** Problem state: 0=unanswered  1=attempted  2=correct  3=wrong */
export type ProblemState = 0 | 1 | 2 | 3

/** User's answer: can be a single choice index (number), multiple indices (number[]), or text (string) */
export type UserAnswer = number | number[] | string

/** Persisted quiz session snapshot (goes into localStorage) */
export interface QuizSnapshot {
  bankId: string
  mode: PracticeMode
  problemIndices: number[]
  currentIndex: number
  answers: UserAnswer[]
  problemStates: ProblemState[]
  startTime: number
  elapsedSeconds: number
}

/** Label for each problem type */
export const PROBLEM_TYPE_LABELS: Record<number, string> = {
  1: '单选题',
  2: '多选题',
  3: '填空题',
  4: '判断题',
}

/** Choice letters */
export const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const

/** A problem prepared for display (choices shuffled, answer remapped) */
export interface PreparedProblem {
  original: Problem
  shuffledChoices: string[]
  mappedAnswer: number | number[] | string
}