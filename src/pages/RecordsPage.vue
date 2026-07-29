<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Play,
  Search,
  Target,
  Trash2,
} from '@lucide/vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import {
  getRecords,
  purgeRecord,
  type PracticeRecord,
} from '@/composables/usePracticeRecords'
import { WRONG_REVIEW_BANK_ID } from '@/composables/useQuiz'
import type { PracticeMode, ProblemState } from '@/types/problem'
import { formatDateTime, formatTime } from '@/utils/format'

const router = useRouter()
const route = useRoute()
const PAGE_SIZE = 10

const keyword = ref('')
const modeFilter = ref<PracticeMode | ''>('')
const page = ref(1)
const expandedId = ref<string | null>(null)
const pendingDelete = ref<PracticeRecord | null>(null)
const operationError = ref<string | null>(null)
const recordsHeading = ref<HTMLElement | null>(null)
const recordList = ref<HTMLElement | null>(null)
let requestedRecordRunId = 0

const records = ref<PracticeRecord[]>([])

const modeLabels: Record<PracticeMode, string> = {
  sequential: '顺序练习',
  random: '乱序练习',
  'wrong-review': '错题复习',
  'mock-exam': '模拟考试',
  'custom-practice': '自定义练习',
}

const modeOptions = computed(() => {
  const modes = new Set(records.value.map((record) => record.mode))
  return Array.from(modes)
})

const filteredRecords = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return records.value.filter((record) => {
    if (modeFilter.value && record.mode !== modeFilter.value) return false
    if (query && !record.bankTitle.toLocaleLowerCase().includes(query)) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / PAGE_SIZE)))
const pagedRecords = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredRecords.value.slice(start, start + PAGE_SIZE)
})

const summary = computed(() => {
  const attempted = records.value.reduce((sum, record) => sum + record.attemptedCount, 0)
  const correct = records.value.reduce((sum, record) => sum + record.correctCount, 0)
  return {
    sessions: records.value.length,
    questions: attempted,
    accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    seconds: records.value.reduce((sum, record) => sum + record.elapsedSeconds, 0),
  }
})

watch([keyword, modeFilter], () => {
  page.value = 1
  expandedId.value = null
})

watch(totalPages, (total) => {
  if (page.value > total) page.value = total
})

async function syncRequestedRecord() {
  const runId = ++requestedRecordRunId
  const requestedId = typeof route.query.record === 'string' ? route.query.record : ''
  if (!requestedId) {
    expandedId.value = null
    return
  }

  const recordIndex = records.value.findIndex((record) => record.id === requestedId)
  if (recordIndex < 0) {
    expandedId.value = null
    return
  }

  const filtersChanged = keyword.value !== '' || modeFilter.value !== ''
  keyword.value = ''
  modeFilter.value = ''
  if (filtersChanged) await nextTick()
  if (runId !== requestedRecordRunId || route.query.record !== requestedId) return

  page.value = Math.floor(recordIndex / PAGE_SIZE) + 1
  expandedId.value = requestedId
}

function loadRecords() {
  records.value = getRecords(1, Number.MAX_SAFE_INTEGER).records
}

function stateCount(record: PracticeRecord, state: ProblemState): number {
  const states = record.snapshot?.problemStates
  if (!Array.isArray(states)) return 0
  return states.filter((value) => value === state).length
}

function startAgain(record: PracticeRecord) {
  const query: Record<string, string> = {
    mode: record.mode,
    fresh: '1',
  }
  if (record.customConfig) {
    query.types = record.customConfig.enabledTypes.join(',')
    query.shuffle = record.customConfig.shuffle ? '1' : '0'
  }
  const bankId = record.mode === 'wrong-review' ? WRONG_REVIEW_BANK_ID : record.bankId
  router.push({ name: 'quiz', params: { bankId }, query })
}

function confirmDelete(record: PracticeRecord) {
  pendingDelete.value = record
}

async function deletePendingRecord() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  const deletedIndex = filteredRecords.value.findIndex((record) => record.id === id)
  if (!purgeRecord(id)) {
    operationError.value = '记录删除失败，请检查浏览器存储权限或剩余空间。'
    pendingDelete.value = null
    return
  }
  operationError.value = null
  if (expandedId.value === id) expandedId.value = null
  pendingDelete.value = null
  if (route.query.record === id) {
    const query = { ...route.query }
    delete query.record
    try {
      await router.replace({ name: 'records', query, hash: route.hash })
    } catch {
      // The record is already deleted; keep the local list and focus in sync.
    }
  }
  loadRecords()

  const nextRecords = filteredRecords.value
  const nextRecord = deletedIndex >= 0 && nextRecords.length > 0
    ? nextRecords[Math.min(deletedIndex, nextRecords.length - 1)]
    : null
  if (nextRecord) {
    const nextIndex = nextRecords.findIndex((record) => record.id === nextRecord.id)
    page.value = Math.floor(nextIndex / PAGE_SIZE) + 1
  }
  await nextTick()

  const nextButton = nextRecord
    ? Array.from(recordList.value?.querySelectorAll<HTMLButtonElement>('[data-record-expand]') ?? [])
        .find((button) => button.dataset.recordId === nextRecord.id)
    : null
  ;(nextButton ?? recordsHeading.value)?.focus({ preventScroll: true })
}

function clearFilters() {
  keyword.value = ''
  modeFilter.value = ''
}

loadRecords()
watch(
  () => route.query.record,
  () => { void syncRequestedRecord() },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-4 pb-16">
    <header class="flex items-center gap-3 py-6">
      <button type="button" class="btn btn-ghost h-9 w-9 p-0" aria-label="返回首页" @click="router.push('/')">
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div class="min-w-0">
        <h1 ref="recordsHeading" tabindex="-1" class="rounded text-2xl font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-white">练习记录</h1>
        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ records.length }} 条记录</p>
      </div>
    </header>

    <section v-if="records.length > 0" aria-label="练习汇总" class="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
      <div class="bg-white p-4 dark:bg-slate-800">
        <History class="mb-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
        <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{{ summary.sessions }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">完成次数</p>
      </div>
      <div class="bg-white p-4 dark:bg-slate-800">
        <BookOpen class="mb-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{{ summary.questions }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">累计作答</p>
      </div>
      <div class="bg-white p-4 dark:bg-slate-800">
        <Target class="mb-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
        <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{{ summary.accuracy }}%</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">平均正确率</p>
      </div>
      <div class="bg-white p-4 dark:bg-slate-800">
        <Clock3 class="mb-2 h-4 w-4 text-violet-600 dark:text-violet-400" />
        <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{{ formatTime(summary.seconds) }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">累计用时</p>
      </div>
    </section>

    <section v-if="records.length > 0" aria-label="筛选记录" class="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
      <label class="relative block">
        <span class="sr-only">搜索题库</span>
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input v-model="keyword" type="search" placeholder="搜索题库" class="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
      </label>
      <label>
        <span class="sr-only">练习模式</span>
        <select v-model="modeFilter" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <option value="">全部模式</option>
          <option v-for="item in modeOptions" :key="item" :value="item">{{ modeLabels[item] }}</option>
        </select>
      </label>
    </section>

    <p v-if="operationError" role="alert" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
      {{ operationError }}
    </p>

    <section ref="recordList" v-if="pagedRecords.length > 0" aria-label="记录列表" class="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <article v-for="record in pagedRecords" :key="record.id" class="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
        <div class="flex min-w-0 flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <h2 class="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{{ record.bankTitle }}</h2>
              <span class="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300">{{ modeLabels[record.mode] }}</span>
            </div>
            <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span class="inline-flex items-center gap-1"><CalendarClock class="h-3.5 w-3.5" />{{ formatDateTime(record.createdAt) }}</span>
              <span>{{ record.correctCount }}/{{ record.attemptedCount }} 正确</span>
              <span>{{ record.accuracy }}%</span>
              <span>{{ formatTime(record.elapsedSeconds) }}</span>
            </div>
          </div>

          <div class="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              class="btn btn-ghost h-9 px-2.5"
              data-record-expand
              :data-record-id="record.id"
              :aria-label="`${expandedId === record.id ? '收起' : '展开'} ${record.bankTitle} 的记录详情`"
              :aria-expanded="expandedId === record.id"
              :aria-controls="`record-${record.id}`"
              @click="expandedId = expandedId === record.id ? null : record.id"
            >
              <ChevronDown class="h-4 w-4 transition-transform" :class="{ 'rotate-180': expandedId === record.id }" />
              <span class="hidden sm:inline">详情</span>
            </button>
            <button type="button" class="btn btn-primary h-9 px-3" @click="startAgain(record)">
              <Play class="h-4 w-4" />
              <span>再练一次</span>
            </button>
            <button type="button" class="btn btn-ghost h-9 w-9 p-0 text-red-500 hover:text-red-700 dark:text-red-400" :aria-label="`删除 ${record.bankTitle} 的练习记录`" title="删除记录" @click="confirmDelete(record)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div v-if="expandedId === record.id" :id="`record-${record.id}`" class="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
          <div class="bg-slate-50 px-4 py-3 dark:bg-slate-900/50"><p class="text-xs text-slate-500">题目数</p><p class="mt-1 font-semibold tabular-nums text-slate-800 dark:text-slate-100">{{ record.totalQuestions }}</p></div>
          <div class="bg-slate-50 px-4 py-3 dark:bg-slate-900/50"><p class="text-xs text-slate-500">答对</p><p class="mt-1 font-semibold tabular-nums text-emerald-600">{{ stateCount(record, 2) || record.correctCount }}</p></div>
          <div class="bg-slate-50 px-4 py-3 dark:bg-slate-900/50"><p class="text-xs text-slate-500">答错</p><p class="mt-1 font-semibold tabular-nums text-red-600">{{ stateCount(record, 3) }}</p></div>
          <div class="bg-slate-50 px-4 py-3 dark:bg-slate-900/50"><p class="text-xs text-slate-500">未作答</p><p class="mt-1 font-semibold tabular-nums text-slate-700 dark:text-slate-200">{{ stateCount(record, 0) }}</p></div>
        </div>
      </article>
    </section>

    <div v-else class="py-20 text-center">
      <History class="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
      <h2 class="mt-4 font-semibold text-slate-700 dark:text-slate-300">{{ records.length === 0 ? '还没有练习记录' : '没有匹配的记录' }}</h2>
      <button v-if="records.length === 0" type="button" class="btn btn-primary mt-5" @click="router.push('/')">开始练习</button>
      <button v-else type="button" class="btn btn-secondary mt-5" @click="clearFilters">清除筛选</button>
    </div>

    <nav v-if="filteredRecords.length > PAGE_SIZE" class="mt-6 flex items-center justify-center gap-3" aria-label="记录分页">
      <button type="button" class="btn btn-secondary h-9 w-9 p-0" :disabled="page <= 1" aria-label="上一页" @click="page--"><ChevronLeft class="h-4 w-4" /></button>
      <span class="min-w-20 text-center text-sm tabular-nums text-slate-500 dark:text-slate-400">{{ page }} / {{ totalPages }}</span>
      <button type="button" class="btn btn-secondary h-9 w-9 p-0" :disabled="page >= totalPages" aria-label="下一页" @click="page++"><ChevronRight class="h-4 w-4" /></button>
    </nav>

    <ConfirmDialog
      :show="pendingDelete !== null"
      title="删除练习记录"
      :message="pendingDelete ? `确认删除「${pendingDelete.bankTitle}」的这条练习记录？` : ''"
      confirm-text="删除"
      danger
      @confirm="deletePendingRecord"
      @cancel="pendingDelete = null"
    />
  </div>
</template>
