/**
 * Practice record system — persists each completed/finished quiz session
 * as a record with metadata for history viewing, stats, and resuming.
 *
 * Pattern adapted from vtix-ng's practiceRecords.ts.
 */
import { ref } from 'vue'
import type { PracticeMode, CustomPracticeConfig, QuizSnapshot } from '@/types/problem'
import { getItem, setItem, removeItem } from '@/utils/storage'
import { isCustomPracticeConfig, isPracticeMode } from '@/utils/problem'

const RECORDS_INDEX_KEY = 'quiz-stack-records-index'
const RECORD_PREFIX = 'quiz-stack-record-'
const PAGE_SIZE = 10

function isNonnegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

export interface PracticeRecord {
  /** Unique record ID (timestamp-based) */
  id: string
  /** Bank ID (e.g. "demo") */
  bankId: string
  /** Bank title */
  bankTitle: string
  /** Practice mode */
  mode: PracticeMode
  /** Custom practice config (if applicable) */
  customConfig?: CustomPracticeConfig
  /** Total questions in the session */
  totalQuestions: number
  /** Number of correct answers */
  correctCount: number
  /** Number attempted (answered + graded) */
  attemptedCount: number
  /** Elapsed time in seconds */
  elapsedSeconds: number
  /** Accuracy percentage */
  accuracy: number
  /** Snapshot for resuming */
  snapshot: QuizSnapshot | null
  /** When the record was created */
  createdAt: number
  /** When the record was last updated */
  updatedAt: number
  /** Whether the session was completed (true) or in-progress (false) */
  completed: boolean
  /** Soft delete marker */
  deletedAt?: number
}

/** Get all record IDs from the index, newest first. */
function getIndex(): string[] {
  const value = getItem<unknown>(RECORDS_INDEX_KEY, [])
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : []
}

function saveIndex(ids: string[]): boolean {
  return setItem(RECORDS_INDEX_KEY, ids)
}

/** Read a single record by ID. */
export function getRecord(id: string): PracticeRecord | null {
  const record = getItem<unknown>(RECORD_PREFIX + id, null)
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  const candidate = record as Partial<PracticeRecord>
  if (
    candidate.id !== id ||
    typeof candidate.bankId !== 'string' ||
    typeof candidate.bankTitle !== 'string' ||
    !isPracticeMode(candidate.mode) ||
    !isNonnegativeInteger(candidate.totalQuestions) ||
    !isNonnegativeInteger(candidate.correctCount) ||
    !isNonnegativeInteger(candidate.attemptedCount) ||
    !isNonnegativeInteger(candidate.elapsedSeconds) ||
    typeof candidate.accuracy !== 'number' || !Number.isFinite(candidate.accuracy) ||
    typeof candidate.createdAt !== 'number' || !Number.isFinite(candidate.createdAt) ||
    typeof candidate.updatedAt !== 'number' || !Number.isFinite(candidate.updatedAt) ||
    typeof candidate.completed !== 'boolean'
  ) return null
  if (candidate.customConfig !== undefined && !isCustomPracticeConfig(candidate.customConfig)) return null
  return candidate as PracticeRecord
}

/** Save or update a record. If the record already exists, it's updated. */
export function saveRecord(record: PracticeRecord): boolean {
  const ids = getIndex()
  const isNew = !ids.includes(record.id)
  record.updatedAt = Date.now()
  if (!setItem(RECORD_PREFIX + record.id, record)) {
    return false
  }

  if (isNew) {
    ids.unshift(record.id)
    if (!saveIndex(ids)) {
      removeItem(RECORD_PREFIX + record.id)
      return false
    }
  }
  return true
}

/** Soft-delete a record. */
export function deleteRecord(id: string): boolean {
  const record = getRecord(id)
  if (record) {
    record.deletedAt = Date.now()
    return saveRecord(record)
  }
  return false
}

/** Permanently remove a record. */
export function purgeRecord(id: string): boolean {
  const storedRecord = getItem<unknown>(RECORD_PREFIX + id, null)
  if (!removeItem(RECORD_PREFIX + id)) return false
  const ids = getIndex().filter((i) => i !== id)
  if (saveIndex(ids)) return true

  // Keep the record and index consistent if updating the index fails.
  if (storedRecord !== null) setItem(RECORD_PREFIX + id, storedRecord)
  return false
}

/** Create a new practice record from quiz session data. */
export function createRecord(params: {
  bankId: string
  bankTitle: string
  mode: PracticeMode
  customConfig?: CustomPracticeConfig | null
  totalQuestions: number
  correctCount: number
  attemptedCount: number
  elapsedSeconds: number
  accuracy: number
  snapshot: QuizSnapshot | null
  completed: boolean
}): PracticeRecord {
  const now = Date.now()
  return {
    id: `${params.bankId}-${now}`,
    bankId: params.bankId,
    bankTitle: params.bankTitle,
    mode: params.mode,
    customConfig: params.customConfig ?? undefined,
    totalQuestions: params.totalQuestions,
    correctCount: params.correctCount,
    attemptedCount: params.attemptedCount,
    elapsedSeconds: params.elapsedSeconds,
    accuracy: params.accuracy,
    snapshot: params.snapshot,
    createdAt: now,
    updatedAt: now,
    completed: params.completed,
  }
}

// ---- query helpers ----

function getActiveRecords(): PracticeRecord[] {
  const records: PracticeRecord[] = []
  for (const id of getIndex()) {
    const record = getRecord(id)
    if (record && !record.deletedAt) records.push(record)
  }
  return records
}

/** Get all non-deleted records, newest first, with pagination. */
export function getRecords(page: number = 1, pageSize: number = PAGE_SIZE): {
  records: PracticeRecord[]
  total: number
  hasMore: boolean
} {
  const records = getActiveRecords()
  const total = records.length
  const start = (page - 1) * pageSize
  const paged = records.slice(start, start + pageSize)
  return { records: paged, total, hasMore: start + pageSize < total }
}

/** Get records for a specific bank. */
export function getRecordsForBank(bankId: string): PracticeRecord[] {
  return getActiveRecords().filter((record) => record.bankId === bankId)
}

// ---- stats for home page ----

export interface PracticeStats {
  todayCount: number
  totalSessions: number
  totalTimeSeconds: number
  totalCorrect: number
  totalAttempted: number
  recentRecords: PracticeRecord[]
}

export function getPracticeStats(): PracticeStats {
  const records = getActiveRecords()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayTs = todayStart.getTime()

  const todayRecords = records.filter((r) => r.createdAt >= todayTs && r.completed)
  const completedRecords = records.filter((r) => r.completed)

  return {
    todayCount: todayRecords.length,
    totalSessions: completedRecords.length,
    totalTimeSeconds: completedRecords.reduce((s, r) => s + r.elapsedSeconds, 0),
    totalCorrect: completedRecords.reduce((s, r) => s + r.correctCount, 0),
    totalAttempted: completedRecords.reduce((s, r) => s + r.attemptedCount, 0),
    recentRecords: records.filter((r) => r.completed).slice(0, 3),
  }
}

// ---- reactive composable (for use in components) ----

export function usePracticeRecords() {
  const records = ref<PracticeRecord[]>([])
  const total = ref(0)
  const hasMore = ref(false)
  const page = ref(1)

  function loadPage(p?: number) {
    if (p) page.value = p
    const result = getRecords(page.value)
    records.value = result.records
    total.value = result.total
    hasMore.value = result.hasMore
  }

  function removeRecord(id: string) {
    const success = deleteRecord(id)
    loadPage(page.value)
    return success
  }

  function purgeRecordAction(id: string) {
    const success = purgeRecord(id)
    loadPage(page.value)
    return success
  }

  // Initial load
  loadPage(1)

  return {
    records,
    total,
    hasMore,
    page,
    loadPage,
    removeRecord,
    purgeRecord: purgeRecordAction,
  }
}
