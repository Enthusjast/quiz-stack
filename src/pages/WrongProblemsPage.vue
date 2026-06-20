<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWrongProblems } from '@/composables/useWrongProblems'
import { useRouter } from 'vue-router'
import { ArrowLeft, Trash2, Download, Upload, Search, FilterX } from '@lucide/vue'
import type { Problem } from '@/types/problem'
import { PROBLEM_TYPE_LABELS, CHOICE_LETTERS } from '@/types/problem'

const router = useRouter()
const { wrongProblems, count, removeWrong, clearAll, exportJSON, importJSON } = useWrongProblems()
const importMessage = ref<string | null>(null)

// Filters
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

// Multi-select for batch delete
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

// Compute which types are present for the filter dropdown
const availableTypes = computed(() => {
  const types = new Set(wrongProblems.value.map(p => p.type))
  return Array.from(types).sort()
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 pb-16">
    <!-- Header -->
    <div class="flex items-center justify-between py-6">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost p-1.5" @click="router.push('/')">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">错题本</h1>
        <span class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/50 dark:text-red-400">
          {{ count }} 题
        </span>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="count === 0" class="py-16 text-center">
      <p class="text-lg text-gray-500 dark:text-gray-400">还没有错题，继续练习吧！</p>
      <button class="btn btn-primary mt-4" @click="router.push('/')">去刷题</button>
    </div>

    <template v-else>
      <!-- Filter bar -->
      <div class="mb-4 space-y-3">
        <div class="flex flex-wrap gap-2">
          <!-- Keyword search -->
          <div class="relative flex-1 min-w-[160px]">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              v-model="keywordFilter"
              type="text"
              placeholder="搜索题目内容..."
              class="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <!-- Type filter -->
          <select
            v-model="typeFilter"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option :value="null">全部类型</option>
            <option v-for="t in availableTypes" :key="t" :value="t">
              {{ PROBLEM_TYPE_LABELS[t] }}
            </option>
          </select>
          <!-- Clear filters -->
          <button
            v-if="keywordFilter || typeFilter !== null"
            class="btn btn-ghost p-1.5 text-gray-400"
            @click="clearFilters"
            title="清除筛选"
          >
            <FilterX class="h-4 w-4" />
          </button>
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          {{ totalFiltered }} 道匹配 · 第 {{ page }} / {{ totalPages || 1 }} 页
        </p>
      </div>

      <!-- Actions -->
      <div class="mb-4 flex flex-wrap gap-2">
        <button class="btn btn-secondary text-sm" @click="exportJSON">
          <Download class="h-4 w-4" />
          导出
        </button>
        <label class="btn btn-secondary text-sm cursor-pointer">
          <Upload class="h-4 w-4" />
          导入
          <input type="file" accept=".json" class="hidden" @change="handleImport" />
        </label>
        <button
          v-if="selectedIndices.size > 0"
          class="btn btn-ghost text-sm text-red-500 hover:text-red-700 dark:text-red-400"
          @click="deleteSelected"
        >
          <Trash2 class="h-4 w-4" />
          删除选中 ({{ selectedIndices.size }})
        </button>
        <button class="btn btn-ghost text-sm text-red-500 hover:text-red-700 dark:text-red-400" @click="clearAll">
          <Trash2 class="h-4 w-4" />
          清空全部
        </button>
        <span v-if="importMessage" class="ml-2 self-center text-sm text-gray-500 dark:text-gray-400">
          {{ importMessage }}
        </span>
      </div>

      <!-- Select all toggle -->
      <div v-if="paged.length > 0" class="mb-2">
        <label class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            class="rounded"
            :checked="selectedIndices.size === paged.length && paged.length > 0"
            @change="selectAll"
          />
          全选当前页
        </label>
      </div>

      <!-- Wrong problem list -->
      <div class="space-y-3">
        <div
          v-for="(problem, idx) in paged"
          :key="idx"
          class="card flex items-start gap-3"
          :class="selectedIndices.has(idx) ? 'ring-2 ring-indigo-400 dark:ring-indigo-600' : ''"
        >
          <input
            type="checkbox"
            class="mt-1 rounded"
            :checked="selectedIndices.has(idx)"
            @change="toggleSelect(idx)"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {{ PROBLEM_TYPE_LABELS[problem.type] }}
              </span>
            </div>
            <p class="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{{ problem.content }}</p>
            <p class="mt-1 text-xs text-green-600 dark:text-green-400">
              正确答案：{{ formatAnswer(problem) }}
            </p>
            <p v-if="problem.hint" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
              解析：{{ problem.hint }}
            </p>
          </div>
          <button
            class="btn btn-ghost p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0"
            @click="removeWrong(problem)"
            title="移出错题本"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-6 flex items-center justify-center gap-2">
        <button class="btn btn-ghost px-3 py-1 text-sm" :disabled="page <= 1" @click="page--">上一页</button>
        <span
          v-for="p in totalPages"
          :key="p"
          class="flex h-7 w-7 items-center justify-center rounded text-xs cursor-pointer"
          :class="p === page
            ? 'bg-indigo-500 text-white font-semibold'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
          @click="page = p"
        >{{ p }}</span>
        <button class="btn btn-ghost px-3 py-1 text-sm" :disabled="page >= totalPages" @click="page++">下一页</button>
      </div>

      <div v-if="totalFiltered === 0 && count > 0" class="py-16 text-center">
        <p class="text-gray-500 dark:text-gray-400">没有匹配的错题</p>
        <button class="btn btn-ghost text-sm mt-2" @click="clearFilters">清除筛选</button>
      </div>
    </template>
  </div>
</template>
