/**
 * Practice record system — persists each completed/finished quiz session
 * as a record with metadata for history viewing, stats, and resuming.
 *
 * Pattern adapted from vtix-ng's practiceRecords.ts.
 */
import { ref } from 'vue'
import type { PracticeMode, CustomPracticeConfig } from '@/types/problem'
import { getItem, setItem, removeItem, probeStorage } from '@/utils/storage'

const RECORDS_INDEX_KEY = 'quiz-stack-records-index'
const RECORD_PREFIX = 'quiz-stack-record-'
const PAGE_SIZE = 10

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
  snapshot: any
  /** When the record was created */
  createdAt: number
  /** When the record was last updated */
  updatedAt: number
  /** Whether the session was completed (true) or in-progress (false) */
  completed: boolean
  /** Soft delete marker */
  deletedAt?: number
}

// ---- local state ----
const storageAvailable = ref(probeStorage())

/** Get all record IDs from the index, newest first. */
function getIndex(): string[] {
  if (!storageAvailable.value) return []
  return getItem<string[]>(RECORDS_INDEX_KEY, [])
}

function saveIndex(ids: string[]) {
  if (!storageAvailable.value) return
  setItem(RECORDS_INDEX_KEY, ids)
}

/** Read a single record by ID. */
export function getRecord(id: string): PracticeRecord | null {
  if (!storageAvailable.value) return null
  return getItem<PracticeRecord | null>(RECORD_PREFIX + id, null)
}

/** Save or update a record. If the record already exists, it's updated. */
export function saveRecord(record: PracticeRecord) {
  if (!storageAvailable.value) return
  record.updatedAt = Date.now()
  setItem(RECORD_PREFIX + record.id, record)

  // Add to index if new
  const ids = getIndex()
  if (!ids.includes(record.id)) {
    ids.unshift(record.id)
    saveIndex(ids)
  }
}

/** Soft-delete a record. */
export function deleteRecord(id: string) {
  const record = getRecord(id)
  if (record) {
    record.deletedAt = Date.now()
    saveRecord(record)
  }
}

/** Permanently remove a record. */
export function purgeRecord(id: string) {
  removeItem(RECORD_PREFIX + id)
  const ids = getIndex().filter((i) => i !== id)
  saveIndex(ids)
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
  snapshot: any
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

/** Get all non-deleted records, newest first, with pagination. */
export function getRecords(page: number = 1, pageSize: number = PAGE_SIZE): {
  records: PracticeRecord[]
  total: number
  hasMore: boolean
} {
  const allIds = getIndex()
  const records: PracticeRecord[] = []
  for (const id of allIds) {
    const r = getRecord(id)
    if (r && !r.deletedAt) records.push(r)
  }
  const total = records.length
  const start = (page - 1) * pageSize
  const paged = records.slice(start, start + pageSize)
  return { records: paged, total, hasMore: start + pageSize < total }
}

/** Get records for a specific bank. */
export function getRecordsForBank(bankId: string): PracticeRecord[] {
  return getRecords(1, 1000).records.filter((r) => r.bankId === bankId)
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
  const { records } = getRecords(1, 1000)
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
    deleteRecord(id)
    loadPage(page.value)
  }

  function purgeRecordAction(id: string) {
    purgeRecord(id)
    loadPage(page.value)
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
