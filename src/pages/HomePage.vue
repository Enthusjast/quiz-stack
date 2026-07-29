<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { BankRegistry, BankEntry } from '@/types/problem'
import { getBankSessions } from '@/composables/useQuiz'
import { getPracticeStats } from '@/composables/usePracticeRecords'
import { formatTime, formatRelativeTime } from '@/utils/format'
import BankCard from '@/components/common/BankCard.vue'
import CategoryTags from '@/components/common/CategoryTags.vue'
import {
  Search,
  BarChart3,
  Clock,
  Target,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  PackageOpen,
  ListOrdered,
  Shuffle,
  ClipboardCheck,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from '@lucide/vue'

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
watch([searchQuery, selectedCategory], () => {
  bankPage.value = 1
})

function reloadPage() {
  location.reload()
}

/** Map practice mode to display icon component */
const modeIconMap: Record<string, any> = {
  sequential: ListOrdered,
  random: Shuffle,
  'mock-exam': ClipboardCheck,
  'custom-practice': SlidersHorizontal,
  'wrong-review': RotateCcw,
}

const modeLabelMap: Record<string, string> = {
  sequential: '顺序',
  random: '乱序',
  'mock-exam': '考试',
  'custom-practice': '自定义',
  'wrong-review': '错题',
}

// ---- Stat card definitions for iteration ----
const statCards = computed(() => [
  {
    key: 'today',
    label: '今日刷题',
    value: stats.value.todayCount,
    unit: '次',
    icon: Target,
    colorClass: 'stat-card-indigo',
  },
  {
    key: 'total',
    label: '总练习',
    value: stats.value.totalSessions,
    unit: '次',
    icon: BarChart3,
    colorClass: 'stat-card-green',
  },
  {
    key: 'time',
    label: '总耗时',
    value: formatTime(stats.value.totalTimeSeconds),
    unit: 'mm:ss',
    icon: Clock,
    colorClass: 'stat-card-amber',
  },
  {
    key: 'accuracy',
    label: '正确率',
    value:
      stats.value.totalAttempted > 0
        ? Math.round((stats.value.totalCorrect / stats.value.totalAttempted) * 100) + '%'
        : '0%',
    unit: stats.value.totalCorrect + '/' + stats.value.totalAttempted,
    icon: TrendingUp,
    colorClass: 'stat-card-purple',
  },
])

// ---- Pagination visible page numbers ----
const visiblePages = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = bankPage.value
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4)
    else start = Math.max(1, end - 4)
  }
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-3xl overflow-x-clip px-4 pb-20">
    <!-- ===== Hero Section ===== -->
    <section class="relative overflow-hidden py-14 sm:py-20">
      <!-- Hero content -->
      <div class="text-center">
        <!-- Title with gradient -->
        <h1
          class="hero-title text-5xl font-extrabold sm:text-6xl lg:text-7xl"
        >
          Quiz Stack
        </h1>

        <p class="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
          题栈 — 静态刷题网站
        </p>
      </div>
    </section>

    <!-- ===== Loading State ===== -->
    <div v-if="loading" class="space-y-6">
      <!-- Stat skeleton row -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="i in 4"
          :key="'stat-skel-' + i"
          class="paper-surface paper-flat animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
        >
          <div class="mb-3 h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div class="h-8 w-16 rounded-lg bg-slate-300 dark:bg-slate-600" />
          <div class="mt-2 h-3 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <!-- Bank skeleton row -->
      <div
        v-for="i in 3"
        :key="'bank-skel-' + i"
        class="paper-surface paper-flat animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 space-y-3">
            <div class="h-5 w-3/4 rounded-lg bg-slate-300 dark:bg-slate-600" />
            <div class="flex gap-2">
              <div class="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div class="h-5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
          <div class="text-right">
            <div class="h-8 w-12 rounded-lg bg-slate-300 dark:bg-slate-600" />
            <div class="mt-1 h-3 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Error State ===== -->
    <div
      v-else-if="error"
      class="paper-feedback paper-feedback-error paper-flat rounded-2xl border border-red-200 bg-red-50/80 p-10 text-center backdrop-blur-sm dark:border-red-800 dark:bg-red-950/20"
    >
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
        <AlertTriangle class="h-8 w-8 text-red-500 dark:text-red-400" />
      </div>
      <h3 class="text-lg font-semibold text-red-700 dark:text-red-300">加载失败</h3>
      <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <button
        type="button"
        class="btn btn-primary paper-gradient-primary paper-flat mt-6"
        @click="reloadPage()"
      >
        重新加载
      </button>
    </div>

    <!-- ===== Empty State ===== -->
    <div
      v-else-if="Object.keys(registry.banks).length === 0"
      class="paper-surface-muted paper-flat rounded-2xl border border-slate-200 bg-slate-50/80 p-10 text-center backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/50"
    >
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
        <PackageOpen class="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-300">暂无题库</h3>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        请将题库 JSON 文件放在 <code class="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-mono text-slate-600 dark:bg-slate-700 dark:text-slate-300">public/data/</code> 目录下
      </p>
    </div>

    <!-- ===== Content ===== -->
    <template v-else>
      <!-- Stats Dashboard -->
      <section v-if="stats.totalSessions > 0" class="mb-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            练习统计
          </h2>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            v-for="card in statCards"
            :key="card.key"
            class="paper-surface paper-flat paper-no-lift group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-900/30"
          >
            <!-- Icon container -->
            <div
              class="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
              :class="{
                'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400': card.colorClass === 'stat-card-indigo',
                'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400': card.colorClass === 'stat-card-green',
                'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400': card.colorClass === 'stat-card-amber',
                'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400': card.colorClass === 'stat-card-purple',
              }"
            >
              <component :is="card.icon" class="h-4 w-4" />
            </div>
            <!-- Label -->
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ card.label }}</p>
            <!-- Value -->
            <p
              class="mt-1 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white"
              :class="{
                'text-indigo-700 dark:text-indigo-300': card.colorClass === 'stat-card-indigo',
                'text-emerald-700 dark:text-emerald-300': card.colorClass === 'stat-card-green',
                'text-amber-700 dark:text-amber-300': card.colorClass === 'stat-card-amber',
                'text-violet-700 dark:text-violet-300': card.colorClass === 'stat-card-purple',
              }"
            >
              {{ card.value }}
            </p>
            <!-- Unit -->
            <p class="text-xs text-slate-400 dark:text-slate-500">{{ card.unit }}</p>
          </div>
        </div>
      </section>

      <!-- Recent Records -->
      <section v-if="stats.recentRecords.length > 0" class="mb-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            最近练习
          </h2>
          <button
            v-if="stats.totalSessions > 3"
            type="button"
            class="paper-flat text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            @click="router.push({ name: 'records' })"
          >
            查看全部
          </button>
        </div>
        <div class="space-y-2">
          <button
            v-for="rec in stats.recentRecords"
            :key="rec.id"
            type="button"
            class="paper-surface paper-flat paper-no-lift group flex w-full min-w-0 items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-900/20"
            @click="router.push({ name: 'records', query: { record: rec.id } })"
          >
            <!-- Mode icon -->
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
              :class="{
                'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400': rec.mode === 'sequential',
                'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400': rec.mode === 'random',
                'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400': rec.mode === 'mock-exam',
                'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400': rec.mode === 'custom-practice',
                'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400': rec.mode === 'wrong-review',
              }"
            >
              <component :is="modeIconMap[rec.mode] ?? ListOrdered" class="h-4 w-4" />
            </span>
            <!-- Info -->
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                {{ rec.bankTitle }}
              </span>
              <span class="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{{ modeLabelMap[rec.mode] ?? rec.mode }}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{{ formatRelativeTime(rec.createdAt) }}</span>
              </span>
            </span>
            <!-- Score -->
            <span class="shrink-0 text-right">
              <span
                class="text-lg font-bold tabular-nums"
                :class="{
                  'text-emerald-600 dark:text-emerald-400': rec.correctCount === rec.totalQuestions,
                  'text-amber-600 dark:text-amber-400': rec.correctCount > 0 && rec.correctCount < rec.totalQuestions,
                  'text-rose-500 dark:text-rose-400': rec.correctCount === 0,
                }"
              >
                {{ rec.correctCount }}/{{ rec.totalQuestions }}
              </span>
            </span>
          </button>
        </div>
      </section>

      <!-- Search & Filter -->
      <section class="mb-6 space-y-4">
        <!-- Search bar with icon -->
        <div class="relative">
          <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            :value="searchQuery"
            @input="searchQuery = ($event.target as HTMLInputElement).value"
            placeholder="搜索题库名称..."
            class="paper-control paper-flat w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/15"
          />
        </div>
        <CategoryTags
          :categories="registry.categories"
          :selected="selectedCategory"
          @select="selectedCategory = $event"
        />
      </section>

      <!-- Results info -->
      <div class="mb-4 flex items-baseline gap-2">
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {{ selectedCategory || '全部' }}
        </span>
        <span class="text-sm text-slate-400 dark:text-slate-500">
          {{ totalBanks }} 个题库
        </span>
      </div>

      <!-- Bank list with staggered entrance -->
      <TransitionGroup
        v-if="pagedBanks.length > 0"
        name="bank-stagger"
        tag="div"
        class="grid gap-3 sm:grid-cols-2"
        appear
      >
        <div
          v-for="([id, bank], index) in pagedBanks"
          :key="id"
          :style="{ transitionDelay: `${index * 60}ms` }"
        >
          <BankCard
            :bank-id="id"
            :bank="bank"
            :has-progress="id in bankProgress"
            :progress-count="bankProgress[id]"
            class="bank-stagger-enter-item"
            @select="selectBank"
          />
        </div>
      </TransitionGroup>

      <!-- Empty search results -->
      <div v-if="filteredBanks.length === 0" class="paper-surface-muted paper-flat rounded-xl py-20 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <BookOpen class="h-8 w-8 text-slate-300 dark:text-slate-600" />
        </div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
          没有找到匹配的题库
        </p>
        <button
          type="button"
          class="paper-flat mt-3 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          @click="searchQuery = ''; selectedCategory = ''"
        >
          清除筛选条件
        </button>
      </div>

      <!-- Pagination -->
      <nav
        v-if="totalPages > 1"
        class="mt-10 flex max-w-full flex-wrap items-center justify-center gap-1"
        aria-label="分页导航"
      >
        <!-- Previous -->
        <button
          type="button"
          class="paper-control paper-flat paper-no-lift inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          :disabled="bankPage <= 1"
          aria-label="上一页"
          @click="bankPage--"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>

        <!-- First page + ellipsis -->
        <template v-if="visiblePages[0] > 1">
          <button
            type="button"
            class="paper-control paper-flat paper-no-lift inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            @click="bankPage = 1"
          >
            1
          </button>
          <span
            v-if="visiblePages[0] > 2"
            class="inline-flex h-9 w-9 items-center justify-center text-sm text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          >
            &hellip;
          </span>
        </template>

        <!-- Page numbers -->
        <button
          v-for="p in visiblePages"
          :key="p"
          type="button"
          class="paper-flat paper-no-lift inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all duration-200"
          :class="
            p === bankPage
              ? 'paper-gradient-primary bg-blue-600 text-white shadow-md shadow-blue-600/25 dark:bg-blue-500 dark:shadow-blue-500/25'
              : 'paper-control text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          "
          :aria-label="`第 ${p} 页`"
          :aria-current="p === bankPage ? 'page' : undefined"
          @click="bankPage = p"
        >
          {{ p }}
        </button>

        <!-- Last page + ellipsis -->
        <template v-if="visiblePages[visiblePages.length - 1] < totalPages">
          <span
            v-if="visiblePages[visiblePages.length - 1] < totalPages - 1"
            class="inline-flex h-9 w-9 items-center justify-center text-sm text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          >
            &hellip;
          </span>
          <button
            type="button"
            class="paper-control paper-flat paper-no-lift inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            @click="bankPage = totalPages"
          >
            {{ totalPages }}
          </button>
        </template>

        <!-- Next -->
        <button
          type="button"
          class="paper-control paper-flat paper-no-lift inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          :disabled="bankPage >= totalPages"
          aria-label="下一页"
          @click="bankPage++"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
/* ===== Bank card stagger entrance animation ===== */
.bank-stagger-enter-active {
  transition:
    opacity 400ms cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bank-stagger-leave-active {
  transition:
    opacity 250ms ease-in,
    transform 250ms ease-in;
}

.bank-stagger-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.95);
}

.bank-stagger-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

.bank-stagger-move {
  transition: transform 300ms ease;
}
</style>
