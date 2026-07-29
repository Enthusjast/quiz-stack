import type {
  CustomPracticeConfig,
  PracticeMode,
  Problem,
  UserAnswer,
} from '@/types/problem'

const PRACTICE_MODES: readonly PracticeMode[] = [
  'sequential',
  'random',
  'wrong-review',
  'mock-exam',
  'custom-practice',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isChoiceIndex(value: unknown, choices: string[]): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < choices.length
}

/** Runtime validation for imported and remotely loaded question data. */
export function isProblem(value: unknown): value is Problem {
  if (!isRecord(value) || typeof value.content !== 'string' || value.content.trim() === '') {
    return false
  }
  if (value.hint !== undefined && typeof value.hint !== 'string') return false

  switch (value.type) {
    case 0: {
      if (value.choices !== undefined && (!isStringArray(value.choices) || value.choices.length === 0)) {
        return false
      }
      if (value.answer === undefined) return true
      if (typeof value.answer === 'string') return value.answer.trim() !== ''
      return Array.isArray(value.choices) && isChoiceIndex(value.answer, value.choices)
    }
    case 1:
    case 4: {
      if (!isStringArray(value.choices) || value.choices.length < 2) return false
      const choices = value.choices
      if (value.type === 4 && choices.length !== 2) return false
      return isChoiceIndex(value.answer, choices)
    }
    case 2: {
      if (!isStringArray(value.choices) || value.choices.length < 2) return false
      if (!Array.isArray(value.answer) || value.answer.length === 0) return false
      const choices = value.choices
      if (!value.answer.every((answer) => isChoiceIndex(answer, choices))) return false
      return new Set(value.answer).size === value.answer.length
    }
    case 3:
      return typeof value.answer === 'string' && value.answer.trim() !== ''
    default:
      return false
  }
}

export function isPracticeMode(value: unknown): value is PracticeMode {
  return typeof value === 'string' && PRACTICE_MODES.includes(value as PracticeMode)
}

export function isCustomPracticeConfig(value: unknown): value is CustomPracticeConfig {
  if (!isRecord(value) || typeof value.shuffle !== 'boolean' || !Array.isArray(value.enabledTypes)) {
    return false
  }
  if (value.enabledTypes.length === 0) return false
  if (!value.enabledTypes.every((type) => Number.isInteger(type) && type >= 0 && type <= 4)) {
    return false
  }
  return new Set(value.enabledTypes).size === value.enabledTypes.length
}

function canonicalProblem(problem: Problem): string {
  return JSON.stringify({
    type: problem.type,
    content: problem.content,
    choices: 'choices' in problem ? problem.choices ?? null : null,
    answer: problem.answer ?? null,
    hint: problem.hint ?? null,
  })
}

/** A compact deterministic checksum. This is an identity guard, not a security hash. */
export function stableChecksum(value: string): string {
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    first ^= code
    first = Math.imul(first, 0x01000193)
    second ^= code + i
    second = Math.imul(second, 0x85ebca6b)
    second ^= second >>> 13
  }
  return `${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`
}

/** Identity includes every behaviorally relevant field, unlike the old prompt-only hash. */
export function problemFingerprint(problem: Problem): string {
  return stableChecksum(canonicalProblem(problem))
}

/** IDs are stable across reloads while preserving identical duplicate occurrences. */
export function createProblemIds(problems: readonly Problem[]): string[] {
  const occurrences = new Map<string, number>()
  return problems.map((problem) => {
    const fingerprint = problemFingerprint(problem)
    const occurrence = occurrences.get(fingerprint) ?? 0
    occurrences.set(fingerprint, occurrence + 1)
    return `${fingerprint}:${occurrence}`
  })
}

export function questionBankDigest(problems: readonly Problem[]): string {
  return stableChecksum(createProblemIds(problems).join('|'))
}

/** Validate an answer's shape and choice bounds without grading it. */
export function isAnswerForProblem(answer: unknown, problem: Problem): answer is UserAnswer {
  if (answer === null) return true
  switch (problem.type) {
    case 0:
      if (problem.choices?.length) {
        return isChoiceIndex(answer, problem.choices) ||
          (typeof answer === 'string' && answer.trim() !== '')
      }
      return typeof answer === 'string' && answer.trim() !== ''
    case 1:
    case 4:
      return isChoiceIndex(answer, problem.choices)
    case 2:
      return Array.isArray(answer) && answer.length > 0 &&
        answer.every((item) => isChoiceIndex(item, problem.choices)) &&
        new Set(answer).size === answer.length
    case 3:
      return typeof answer === 'string' && answer.trim() !== ''
  }
}
