<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWrongProblems } from '@/composables/useWrongProblems'
import { useRouter } from 'vue-router'
import {
  ArrowLeft, Trash2, Download, Upload, Search, FilterX, X,
  ListX, BookOpen, CheckCircle2, Hash, FileQuestion,
  LayoutList, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from '@lucide/vue'
import type { Problem } from '@/types/problem'
import { PROBLEM_TYPE_LABELS, CHOICE_LETTERS } from '@/types/problem'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const router = useRouter()
const { wrongProblems, count, removeWrong, clearAll, exportJSON, importJSON } = useWrongProblems()
const importMessage = ref<string | null>(null)

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
const statsByType = computed(() => {
  const map: Record<number, number> = {}
  for (const p of wrongProblems.value) {
    map[p.type] = (map[p.type] || 0) + 1
  }
  return map
})

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
const keywordFilter = ref('')
const typeFilter = ref<number | null>(null)
const page = ref(1)
const PAGE_SIZE = 10

// Reset page when filters change
watch([keywordFilter, typeFilter], () => { page.value = 1 })

const filtered = computed(() => {
  let list = wrongProblems.value
  if (keywordFilter.value) {
    const q = keywordFilter.value.toLowerCase()
    list = list.filter((p) => p.content.toLowerCase().includes(q))
  }
  if (typeFilter.value !== null) {
    list = list.filter((p) => p.type === typeFilter.value)
  }
  return list
})

const totalFiltered = computed(() => filtered.value.length)
const totalPages = computed(() => Math.ceil(totalFiltered.value / PAGE_SIZE))

const paged = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

// ---------------------------------------------------------------------------
// Multi-select for batch delete
// ---------------------------------------------------------------------------
const selectedIndices = ref<Set<number>>(new Set())

function toggleSelect(idx: number) {
  const s = new Set(selectedIndices.value)
  if (s.has(idx)) s.delete(idx)
  else s.add(idx)
  selectedIndices.value = s
}

function selectAll() {
  if (selectedIndices.value.size === paged.value.length) {
    selectedIndices.value = new Set()
  } else {
    selectedIndices.value = new Set(paged.value.map((_, i) => i))
  }
}

function deleteSelected() {
  const toRemove = paged.value.filter((_, i) => selectedIndices.value.has(i))
  for (const p of toRemove) removeWrong(p)
  selectedIndices.value = new Set()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatAnswer(p: Problem): string {
  if (p.type === 3) return p.answer as string
  if (p.type === 2) return (p.answer as number[]).map((n) => CHOICE_LETTERS[n]).join(', ')
  return CHOICE_LETTERS[p.answer as number]
}

function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importJSON(file).then(({ success, count: c }) => {
    importMessage.value = success
      ? `成功导入，当前共 ${c} 道错题`
      : '导入失败，请检查文件格式'
    input.value = ''
  })
}

function clearFilters() {
  keywordFilter.value = ''
  typeFilter.value = null
}

// ---------------------------------------------------------------------------
// Confirmation dialog
// ---------------------------------------------------------------------------
const confirmShow = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmAction = ref<() => void>(() => {})

function askConfirm(title: string, message: string, action: () => void) {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmAction.value = action
  confirmShow.value = true
}

function onConfirm() {
  confirmShow.value = false
  confirmAction.value()
}

function confirmDeleteSelected() {
  askConfirm(
    '删除选中错题',
    `确认删除选中的 ${selectedIndices.value.size} 道错题？此操作不可恢复。`,
    () => { deleteSelected() },
  )
}

function confirmClearAll() {
  askConfirm(
    '清空错题本',
    '确认清空所有错题？此操作不可恢复。',
    () => { clearAll() },
  )
}

// ---------------------------------------------------------------------------
// Available types for filter
// ---------------------------------------------------------------------------
const availableTypes = computed(() => {
  const types = new Set(wrongProblems.value.map((p) => p.type))
  return Array.from(types).sort()
})

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------
const showingStart = computed(() =>
  totalFiltered.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1,
)
const showingEnd = computed(() =>
  Math.min(page.value * PAGE_SIZE, totalFiltered.value),
)

const visiblePages = computed(() => {
  const pages: number[] = []
  const tp = totalPages.value
  const p = page.value
  // Show first, last, current +/- 2 neighbors
  let start = Math.max(1, p - 2)
  let end = Math.min(tp, p + 2)
  // Expand to always show at least 5 pages when possible
  if (tp > 5) {
    if (p <= 3) {
      end = Math.min(5, tp)
    } else if (p >= tp - 2) {
      start = Math.max(tp - 4, 1)
    }
  }
  // Always include first & last
  if (start > 1) pages.push(1)
  if (start > 2) pages.push(-1) // ellipsis
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < tp - 1) pages.push(-2) // ellipsis
  if (end < tp) pages.push(tp)
  return pages
})

// ---------------------------------------------------------------------------
// Type chip colours
// ---------------------------------------------------------------------------
const typeChipClass = (t: number): string => {
  const map: Record<number, string> = {
    1: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    2: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    3: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    4: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
  }
  return map[t] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
}

const typeDotClass = (t: number): string => {
  const map: Record<number, string> = {
    1: 'bg-blue-500',
    2: 'bg-purple-500',
    3: 'bg-amber-500',
    4: 'bg-green-500',
  }
  return map[t] || 'bg-gray-500'
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 pb-16">

    <!-- ============================================================ -->
    <!-- Header                                                       -->
    <!-- ============================================================ -->
    <div class="flex items-center justify-between py-6">
      <div class="flex items-center gap-3">
        <button
          class="btn btn-ghost p-1.5"
          aria-label="返回首页"
          @click="router.push('/')"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          错题本
        </h1>
        <span
          v-if="count > 0"
          class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-800"
        >
          <Hash class="h-3 w-3" />
          {{ count }}
        </span>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- Stats Dashboard (only when there are wrong problems)         -->
    <!-- ============================================================ -->
    <div
      v-if="count > 0"
      class="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 animate-slide-up"
    >
      <div
        v-for="t in [1, 2, 3, 4]"
        :key="t"
        class="rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5 transition-colors duration-200"
        :class="[
          typeChipClass(t),
          statsByType[t]
            ? 'cursor-default'
            : 'opacity-50',
        ]"
      >
        <p class="text-[11px] font-medium leading-tight sm:text-xs">
          {{ PROBLEM_TYPE_LABELS[t] }}
        </p>
        <p class="mt-1 text-xl font-bold tabular-nums leading-tight sm:text-2xl">
          {{ statsByType[t] || 0 }}
        </p>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- Empty State                                                  -->
    <!-- ============================================================ -->
    <div
      v-if="count === 0"
      class="flex flex-col items-center justify-center py-20 text-center animate-fade-in"
    >
      <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-950/20 dark:ring-blue-900">
        <BookOpen class="h-9 w-9 text-blue-400 dark:text-blue-500" />
      </div>
      <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300">
        错题本还是空的
      </h2>
      <p class="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        练习中答错的题目会自动收录到这里，方便你针对性复习。加油，坚持就是胜利！
      </p>
      <button class="btn btn-primary mt-6" @click="router.push('/')">
        开始练习
      </button>
    </div>

    <!-- ============================================================ -->
    <!-- Content (when there are wrong problems)                      -->
    <!-- ============================================================ -->
    <template v-if="count > 0">

      <!-- ========================================================== -->
      <!-- Filter Bar                                                 -->
      <!-- ========================================================== -->
      <div class="mb-5 space-y-3">
        <!-- Keyword search -->
        <div class="relative">
          <Search class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            v-model="keywordFilter"
            type="text"
            placeholder="搜索题目内容..."
            class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-colors duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-600 dark:focus:ring-blue-900"
          />
          <button
            v-if="keywordFilter"
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="清除搜索"
            @click="keywordFilter = ''"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Type filter chips + clear all -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200"
            :class="typeFilter === null
              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800'"
            @click="typeFilter = null"
          >
            <LayoutList class="h-3.5 w-3.5" />
            全部
          </button>
          <button
            v-for="t in availableTypes"
            :key="t"
            class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200"
            :class="typeFilter === t
              ? `border-current ${typeChipClass(t)} ring-1 ring-inset ring-current/20`
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800'"
            @click="typeFilter = typeFilter === t ? null : t"
          >
            <span class="inline-block h-2 w-2 rounded-full" :class="typeDotClass(t)" />
            {{ PROBLEM_TYPE_LABELS[t] }}
          </button>

          <!-- Clear filters -->
          <button
            v-if="keywordFilter || typeFilter !== null"
            class="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            @click="clearFilters"
            aria-label="清除所有筛选"
          >
            <FilterX class="h-3.5 w-3.5" />
            清除
          </button>
        </div>

        <!-- Results summary -->
        <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span>
            {{ totalFiltered }} 道匹配
          </span>
          <span aria-hidden="true">&middot;</span>
          <span>
            第 {{ page }} / {{ totalPages || 1 }} 页
          </span>
          <span v-if="selectedIndices.size > 0" class="ml-auto font-medium text-blue-600 dark:text-blue-400">
            已选 {{ selectedIndices.size }} 项
          </span>
        </div>
      </div>

      <!-- ========================================================== -->
      <!-- Toolbar                                                    -->
      <!-- ========================================================== -->
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <button
          class="btn btn-secondary text-xs"
          @click="exportJSON"
          aria-label="导出错题"
        >
          <Download class="h-3.5 w-3.5" />
          导出
        </button>
        <label
          class="btn btn-secondary text-xs cursor-pointer"
          aria-label="导入错题"
        >
          <Upload class="h-3.5 w-3.5" />
          导入
          <input type="file" accept=".json" class="hidden" @change="handleImport" />
        </label>

        <span class="flex-1" />

        <button
          v-if="selectedIndices.size > 0"
          class="btn btn-ghost text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          @click="confirmDeleteSelected"
          aria-label="批量删除选中项"
        >
          <Trash2 class="h-3.5 w-3.5" />
          删除选中 ({{ selectedIndices.size }})
        </button>
        <button
          class="btn btn-ghost text-xs text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
          @click="confirmClearAll"
          aria-label="清空全部错题"
        >
          <Trash2 class="h-3.5 w-3.5" />
          清空全部
        </button>

        <span
          v-if="importMessage"
          class="ml-auto self-center animate-fade-in text-xs text-gray-500 dark:text-gray-400"
        >
          {{ importMessage }}
        </span>
      </div>

      <!-- ========================================================== -->
      <!-- Select all toggle                                          -->
      <!-- ========================================================== -->
      <div v-if="paged.length > 0" class="mb-3">
        <label
          class="inline-flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 transition-colors cursor-pointer select-none hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            :checked="selectedIndices.size === paged.length && paged.length > 0"
            @change="selectAll"
          />
          全选当前页
        </label>
      </div>

      <!-- ========================================================== -->
      <!-- Problem List                                               -->
      <!-- ========================================================== -->
      <TransitionGroup
        name="list"
        tag="div"
        class="space-y-2.5"
      >
        <div
          v-for="(problem, idx) in paged"
          :key="problem.content"
          class="group relative flex items-start gap-3 rounded-xl border bg-white p-4 transition-all duration-200 sm:p-5"
          :class="selectedIndices.has(idx)
            ? 'border-blue-300 bg-blue-50/60 ring-2 ring-blue-400/30 shadow-md dark:border-blue-700 dark:bg-blue-950/20 dark:ring-blue-600/30'
            : 'border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-gray-600'"
        >
          <!-- Checkbox -->
          <label class="mt-0.5 flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              :checked="selectedIndices.has(idx)"
              @change="toggleSelect(idx)"
            />
          </label>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <!-- Type badge + meta -->
            <div class="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium"
                :class="typeChipClass(problem.type)"
              >
                <span class="inline-block h-1.5 w-1.5 rounded-full" :class="typeDotClass(problem.type)" />
                {{ PROBLEM_TYPE_LABELS[problem.type] }}
              </span>
              <span
                v-if="problem.hint"
                class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
              >
                <FileQuestion class="h-3 w-3" />
                有解析
              </span>
            </div>

            <!-- Problem text -->
            <p class="text-sm leading-relaxed text-gray-800 dark:text-gray-200 line-clamp-2">
              {{ problem.content }}
            </p>

            <!-- Answer row -->
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span class="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 class="h-3.5 w-3.5" />
                答案：{{ formatAnswer(problem) }}
              </span>
              <span
                v-if="problem.hint"
                class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1"
              >
                {{ problem.hint }}
              </span>
            </div>
          </div>

          <!-- Remove button -->
          <button
            class="btn btn-ghost shrink-0 p-1.5 text-gray-300 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
            :class="selectedIndices.has(idx) ? 'opacity-100' : ''"
            @click="removeWrong(problem)"
            :aria-label="`移出「${problem.content.slice(0, 20)}」`"
            title="移出错题本"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>

      <!-- ========================================================== -->
      <!-- No results (filtered)                                      -->
      <!-- ========================================================== -->
      <div
        v-if="totalFiltered === 0 && count > 0"
        class="flex flex-col items-center py-16 text-center animate-fade-in"
      >
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <ListX class="h-7 w-7 text-gray-400" />
        </div>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
          没有匹配的错题
        </p>
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
          试试调整筛选条件
        </p>
        <button class="btn btn-ghost mt-4 text-xs" @click="clearFilters">
          清除筛选
        </button>
      </div>

      <!-- ========================================================== -->
      <!-- Pagination                                                 -->
      <!-- ========================================================== -->
      <div
        v-if="totalPages > 1"
        class="mt-8 flex flex-col items-center gap-3"
      >
        <!-- Showing info -->
        <p class="text-xs text-gray-400 dark:text-gray-500">
          显示 {{ showingStart }}-{{ showingEnd }} / 共 {{ totalFiltered }} 道
        </p>

        <!-- Page controls -->
        <nav class="flex items-center gap-1" aria-label="分页导航">
          <!-- First page -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-gray-800"
            :disabled="page <= 1"
            @click="page = 1"
            aria-label="第一页"
          >
            <ChevronsLeft class="h-4 w-4" />
          </button>
          <!-- Previous -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
            :disabled="page <= 1"
            @click="page--"
            aria-label="上一页"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>

          <!-- Page numbers -->
          <template v-for="p in visiblePages" :key="p">
            <span
              v-if="p < 0"
              class="flex h-8 w-8 items-center justify-center text-xs text-gray-400"
              aria-hidden="true"
            >&hellip;</span>
            <button
              v-else
              class="flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-1 text-xs font-medium transition-all duration-200"
              :class="p === page
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:bg-blue-700 dark:shadow-blue-950'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
              @click="page = p"
              :aria-label="`第 ${p} 页`"
              :aria-current="p === page ? 'page' : undefined"
            >
              {{ p }}
            </button>
          </template>

          <!-- Next -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
            :disabled="page >= totalPages"
            @click="page++"
            aria-label="下一页"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
          <!-- Last page -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-gray-800"
            :disabled="page >= totalPages"
            @click="page = totalPages"
            aria-label="最后一页"
          >
            <ChevronsRight class="h-4 w-4" />
          </button>
        </nav>
      </div>
    </template>

    <!-- ============================================================ -->
    <!-- Confirmation Dialog                                          -->
    <!-- ============================================================ -->
    <ConfirmDialog
      :show="confirmShow"
      :title="confirmTitle"
      :message="confirmMessage"
      danger
      @confirm="onConfirm"
      @cancel="confirmShow = false"
    />
  </div>
</template>
