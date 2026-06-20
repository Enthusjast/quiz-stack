<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { BankRegistry, BankEntry } from '@/types/problem'
import { getBankSessions } from '@/composables/useQuiz'
import { getPracticeStats } from '@/composables/usePracticeRecords'
import { formatTime, formatRelativeTime } from '@/utils/format'
import BankCard from '@/components/common/BankCard.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import CategoryTags from '@/components/common/CategoryTags.vue'
import { BarChart3, Clock, Target, TrendingUp } from '@lucide/vue'

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const registry = ref<BankRegistry>({ categories: [], recommended: [], banks: {} })
const searchQuery = ref('')
const selectedCategory = ref('')
const bankPage = ref(1)
const BANKS_PER_PAGE = 10

const stats = ref(getPracticeStats())

onMounted(async () => {
  try {
    const resp = await fetch('data/list.json')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    registry.value = await resp.json()
    stats.value = getPracticeStats()
  } catch (e: any) {
    error.value = e.message || '加载题库列表失败'
  } finally {
    loading.value = false
  }
})

const bankProgress = computed(() => {
  const result: Record<string, number> = {}
  for (const id of Object.keys(registry.value.banks)) {
    const sessions = getBankSessions(id)
    if (sessions.length > 0) result[id] = sessions.length
  }
  return result
})

const filteredBanks = computed<[string, BankEntry][]>(() => {
  let entries = Object.entries(registry.value.banks)

  if (!searchQuery.value && !selectedCategory.value) {
    const recommendedSet = new Set(registry.value.recommended)
    entries.sort(([a], [b]) => {
      const aRec = recommendedSet.has(a) ? 0 : 1
      const bRec = recommendedSet.has(b) ? 0 : 1
      return aRec - bRec
    })
  }

  if (selectedCategory.value) {
    entries = entries.filter(([, bank]) =>
      bank.categories.includes(selectedCategory.value)
    )
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    entries = entries.filter(([, bank]) =>
      bank.title.toLowerCase().includes(q)
    )
  }

  return entries
})

const totalBanks = computed(() => filteredBanks.value.length)
const totalPages = computed(() => Math.ceil(totalBanks.value / BANKS_PER_PAGE))

const pagedBanks = computed(() => {
  const start = (bankPage.value - 1) * BANKS_PER_PAGE
  return filteredBanks.value.slice(start, start + BANKS_PER_PAGE)
})

function selectBank(bankId: string) {
  router.push({ name: 'quiz', params: { bankId } })
}

// Reset page when filters change
import { watch } from 'vue'
watch([searchQuery, selectedCategory], () => {
  bankPage.value = 1
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 pb-16">
    <!-- Hero -->
    <div class="py-12 text-center">
      <h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
        Quiz Stack
      </h1>
      <p class="mt-3 text-lg text-gray-500 dark:text-gray-400">
        静态刷题网站 — 自主学习，随时随地练习
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div v-for="i in 4" :key="i" class="animate-pulse rounded-xl bg-gray-100 p-4 dark:bg-gray-800">
          <div class="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          <div class="mt-2 h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div
        v-for="i in 3"
        :key="'bank-'+i"
        class="animate-pulse rounded-xl border border-gray-200 bg-gray-100 p-6 dark:border-gray-800 dark:bg-gray-800"
      >
        <div class="h-5 w-3/4 rounded bg-gray-300 dark:bg-gray-700" />
        <div class="mt-3 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/30">
      <p class="text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="Object.keys(registry.banks).length === 0" class="py-16 text-center">
      <p class="text-gray-500 dark:text-gray-400">暂无题库，请将题库 JSON 文件放在 public/data/ 目录下</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Stats dashboard -->
      <div v-if="stats.totalSessions > 0" class="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
          <div class="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
            <Target class="h-3.5 w-3.5" />
            今日刷题
          </div>
          <p class="mt-1 text-2xl font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
            {{ stats.todayCount }}
          </p>
          <p class="text-xs text-indigo-500 dark:text-indigo-400">次</p>
        </div>
        <div class="rounded-xl border border-green-100 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-950/20">
          <div class="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <BarChart3 class="h-3.5 w-3.5" />
            总练习
          </div>
          <p class="mt-1 text-2xl font-bold tabular-nums text-green-700 dark:text-green-300">
            {{ stats.totalSessions }}
          </p>
          <p class="text-xs text-green-500 dark:text-green-400">次</p>
        </div>
        <div class="rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <div class="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Clock class="h-3.5 w-3.5" />
            总耗时
          </div>
          <p class="mt-1 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {{ formatTime(stats.totalTimeSeconds) }}
          </p>
          <p class="text-xs text-amber-500 dark:text-amber-400">mm:ss</p>
        </div>
        <div class="rounded-xl border border-purple-100 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/20">
          <div class="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
            <TrendingUp class="h-3.5 w-3.5" />
            正确率
          </div>
          <p class="mt-1 text-2xl font-bold tabular-nums text-purple-700 dark:text-purple-300">
            {{ stats.totalAttempted > 0 ? Math.round(stats.totalCorrect / stats.totalAttempted * 100) : 0 }}%
          </p>
          <p class="text-xs text-purple-500 dark:text-purple-400">{{ stats.totalCorrect }}/{{ stats.totalAttempted }}</p>
        </div>
      </div>

      <!-- Recent records -->
      <div v-if="stats.recentRecords.length > 0" class="mb-8">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">最近练习</h3>
        <div class="space-y-2">
          <div
            v-for="rec in stats.recentRecords"
            :key="rec.id"
            class="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="router.push({ name: 'quiz', params: { bankId: rec.bankId } })"
          >
            <span class="flex-1 truncate text-sm text-gray-800 dark:text-gray-200">
              {{ rec.bankTitle }}
            </span>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {{ rec.mode === 'sequential' ? '顺序' : rec.mode === 'random' ? '乱序' : rec.mode === 'mock-exam' ? '考试' : rec.mode === 'custom-practice' ? '自定义' : '错题' }}
            </span>
            <span class="text-xs font-mono tabular-nums text-gray-500 dark:text-gray-400">
              {{ rec.correctCount }}/{{ rec.totalQuestions }}
            </span>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {{ formatRelativeTime(rec.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Search & Filter -->
      <div class="mb-6 space-y-4">
        <SearchBar v-model="searchQuery" placeholder="搜索题库名称..." />
        <CategoryTags
          :categories="registry.categories"
          :selected="selectedCategory"
          @select="selectedCategory = $event"
        />
      </div>

      <!-- Results info -->
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {{ selectedCategory || '全部' }} · {{ totalBanks }} 个题库
      </p>

      <!-- Bank list -->
      <div class="grid gap-3 sm:grid-cols-2">
        <BankCard
          v-for="[id, bank] in pagedBanks"
          :key="id"
          :bank-id="id"
          :bank="bank"
          :has-progress="id in bankProgress"
          :progress-count="bankProgress[id]"
          @select="selectBank"
        />
      </div>

      <div v-if="filteredBanks.length === 0" class="py-16 text-center">
        <p class="text-gray-500 dark:text-gray-400">没有找到匹配的题库</p>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-2">
        <button
          class="btn btn-ghost px-3 py-1 text-sm"
          :disabled="bankPage <= 1"
          @click="bankPage--"
        >
          上一页
        </button>
        <span
          v-for="p in totalPages"
          :key="p"
          class="flex h-8 w-8 items-center justify-center rounded text-sm cursor-pointer"
          :class="p === bankPage
            ? 'bg-indigo-500 text-white font-semibold'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
          @click="bankPage = p"
        >
          {{ p }}
        </span>
        <button
          class="btn btn-ghost px-3 py-1 text-sm"
          :disabled="bankPage >= totalPages"
          @click="bankPage++"
        >
          下一页
        </button>
      </div>
    </template>
  </div>
</template>
