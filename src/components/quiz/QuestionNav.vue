<script setup lang="ts">
import { computed } from 'vue'
import type { ProblemState, MockExamSection } from '@/types/problem'

const props = defineProps<{
  problemStates: ProblemState[]
  currentIndex: number
  /** Optional exam sections for grouping (mock exam mode) */
  examSections?: MockExamSection[]
}>()

const emit = defineEmits<{
  goTo: [index: number]
}>()

// ── State style tokens ──────────────────────────────────────────

interface StateVariant {
  label: string
  bg: string
  text: string
  border: string
  ring: string
  dot: string
  hoverBg: string
  hoverBorder: string
  bar: string // color segment in section progress bar
}

const stateVariants: Record<string, StateVariant> = {
  '-1': {
    label: '标记',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700/60',
    ring: 'ring-amber-400 dark:ring-amber-500',
    dot: 'bg-amber-400',
    hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/50',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
    bar: 'bg-amber-400',
  },
  '0': {
    label: '未答',
    bg: 'bg-white dark:bg-slate-800/70',
    text: 'text-slate-400 dark:text-slate-500',
    border: 'border-slate-200 dark:border-slate-700',
    ring: 'ring-slate-400 dark:ring-slate-500',
    dot: 'bg-slate-300 dark:bg-slate-600',
    hoverBg: 'hover:bg-slate-50 dark:hover:bg-slate-700/80',
    hoverBorder: 'hover:border-slate-300 dark:hover:border-slate-600',
    bar: 'bg-slate-300 dark:bg-slate-600',
  },
  '1': {
    label: '已答',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700/60',
    ring: 'ring-blue-400 dark:ring-blue-500',
    dot: 'bg-blue-400',
    hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/50',
    hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-600',
    bar: 'bg-blue-400',
  },
  '2': {
    label: '正确',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700/60',
    ring: 'ring-emerald-400 dark:ring-emerald-500',
    dot: 'bg-emerald-400',
    hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    bar: 'bg-emerald-400',
  },
  '3': {
    label: '错误',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700/60',
    ring: 'ring-red-400 dark:ring-red-500',
    dot: 'bg-red-400',
    hoverBg: 'hover:bg-red-100 dark:hover:bg-red-900/50',
    hoverBorder: 'hover:border-red-400 dark:hover:border-red-600',
    bar: 'bg-red-400',
  },
}

function variantFor(state: ProblemState): StateVariant {
  return stateVariants[String(state)] ?? stateVariants['0']
}

// ── Section helpers ─────────────────────────────────────────────

const hasSections = computed(() => (props.examSections?.length ?? 0) > 0)

const sectionHeaders = computed(() => {
  if (!hasSections.value) return []
  const headers: { label: string; atIndex: number; count: number; totalScore: number }[] = []
  let offset = 0
  for (const sec of props.examSections!) {
    headers.push({
      label: sec.typeLabel,
      atIndex: offset,
      count: sec.count,
      totalScore: sec.totalScore,
    })
    offset += sec.count
  }
  return headers
})

/** Which section contains the current question (exam mode) */
const currentSectionIndex = computed(() => {
  if (!hasSections.value) return -1
  let offset = 0
  for (let i = 0; i < props.examSections!.length; i++) {
    if (props.currentIndex < offset + props.examSections![i].count) return i
    offset += props.examSections![i].count
  }
  return -1
})

function sectionProgress(si: number) {
  const h = sectionHeaders.value[si]
  const slice = props.problemStates.slice(h.atIndex, h.atIndex + h.count)
  const answered = slice.filter(s => s !== 0).length
  const correct = slice.filter(s => s === 2).length
  const wrong = slice.filter(s => s === 3).length
  const pending = slice.filter(s => s === 1).length
  return { answered, correct, wrong, pending, total: h.count }
}

// ── Stats ───────────────────────────────────────────────────────

const stats = computed(() => {
  const total = props.problemStates.length
  const answered = props.problemStates.filter(s => s !== 0).length
  const correct = props.problemStates.filter(s => s === 2).length
  const wrong = props.problemStates.filter(s => s === 3).length
  const marked = props.problemStates.filter(s => s === -1).length
  const pending = props.problemStates.filter(s => s === 1).length
  return { total, answered, correct, wrong, marked, pending }
})

// ── Legend ──────────────────────────────────────────────────────

const legendItems: { state: ProblemState }[] = [
  { state: 0 },
  { state: 1 },
  { state: 2 },
  { state: 3 },
  { state: -1 },
]

// ── Button classes ──────────────────────────────────────────────

/** Adjust button size + grid columns based on total question count */
const gridCols = computed(() => {
  const n = props.problemStates.length
  if (n <= 30) return 'grid-cols-5'
  if (n <= 80) return 'grid-cols-6'
  if (n <= 200) return 'grid-cols-7'
  return 'grid-cols-8'
})

const btnSize = computed(() => {
  const n = props.problemStates.length
  if (n <= 30) return 'size-9 text-sm'
  if (n <= 80) return 'size-8 text-xs'
  if (n <= 300) return 'size-7 text-xs'
  return 'size-6 text-[10px]'
})

function btnClasses(idx: number): string[] {
  const state = props.problemStates[idx]
  const v = variantFor(state)
  const isCurrent = idx === props.currentIndex

  const classes = [
    // Base — sized dynamically via btnSize
    'flex items-center justify-center rounded-lg font-semibold font-mono',
    'border transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
    // State colors
    v.bg, v.text, v.border,
    // Hover
    v.hoverBg, v.hoverBorder, 'hover:scale-105 hover:shadow-md',
    // Dynamic size
    btnSize.value,
  ]

  if (isCurrent) {
    classes.push(
      'ring-2 ring-offset-1 dark:ring-offset-slate-900',
      'scale-110 shadow-lg',
      v.ring,
    )
  }

  return classes
}

function btnAriaLabel(idx: number): string {
  const v = variantFor(props.problemStates[idx])
  return `第 ${idx + 1} 题，${v.label}`
}
</script>

<template>
  <div class="space-y-4">
    <!-- ── Stats bar ──────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-2 px-1">
      <span class="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
        {{ stats.answered }}/{{ stats.total }} 已答
      </span>
      <span
        v-if="stats.correct > 0"
        class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 tabular-nums"
      >
        <span class="inline-block size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        {{ stats.correct }} 正确
      </span>
      <span
        v-if="stats.wrong > 0"
        class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300 tabular-nums"
      >
        <span class="inline-block size-1.5 rounded-full bg-red-400" aria-hidden="true" />
        {{ stats.wrong }} 错误
      </span>
      <span
        v-if="stats.pending > 0"
        class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 tabular-nums"
      >
        <span class="inline-block size-1.5 rounded-full bg-blue-400" aria-hidden="true" />
        {{ stats.pending }} 待批
      </span>
    </div>

    <!-- ── Legend ──────────────────────────────────────────────── -->
    <div
      class="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-500 dark:text-slate-400"
      aria-label="颜色图例"
      role="list"
    >
      <span
        v-for="item in legendItems"
        :key="item.state"
        class="inline-flex items-center gap-1.5"
        role="listitem"
      >
        <span
          class="inline-block size-2 rounded-full"
          :class="stateVariants[String(item.state)].dot"
          aria-hidden="true"
        />
        {{ stateVariants[String(item.state)].label }}
      </span>
    </div>

    <!-- ── Simple grid ─────────────────────────────────────────── -->
    <nav
      v-if="!hasSections"
      class="rounded-2xl border border-slate-200/60 bg-white/60 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/50"
      aria-label="题目导航"
    >
      <div class="grid gap-2" :class="gridCols">
        <button
          v-for="(_state, idx) in problemStates"
          :key="idx"
          @click="emit('goTo', idx)"
          :class="btnClasses(idx)"
          :title="`第 ${idx + 1} 题`"
          :aria-label="btnAriaLabel(idx)"
          :style="{
            animationDelay: `${idx * 20}ms`,
            animationFillMode: 'both',
          }"
          class="animate-fade-in"
        >
          {{ idx + 1 }}
        </button>
      </div>
    </nav>

    <!-- ── Exam mode: section cards ────────────────────────────── -->
    <div v-else class="space-y-4">
      <div
        v-for="(section, si) in examSections"
        :key="si"
        class="animate-slide-up rounded-2xl border bg-white/60 p-5 shadow-sm backdrop-blur-sm transition-colors duration-300 dark:bg-slate-800/50"
        :class="[
          si === currentSectionIndex
            ? 'border-blue-300/80 dark:border-blue-600/60'
            : 'border-slate-200/60 dark:border-slate-700/40',
        ]"
        :style="{
          animationDelay: `${si * 80}ms`,
          animationFillMode: 'both',
        }"
      >
        <!-- Section header -->
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {{ sectionHeaders[si].label }}
          </h3>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400 tabular-nums">
              {{ sectionHeaders[si].count }} 题
            </span>
            <span
              v-if="sectionHeaders[si].totalScore > 0"
              class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 tabular-nums"
            >
              {{ sectionHeaders[si].totalScore }} 分
            </span>
          </div>
        </div>

        <!-- Section progress bar -->
        <div class="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <!-- Correct segment -->
          <div
            v-if="sectionProgress(si).correct > 0"
            class="inline-block h-full bg-emerald-400 transition-all duration-500"
            :style="{ width: (sectionProgress(si).correct / sectionProgress(si).total * 100) + '%' }"
          />
          <!-- Wrong segment -->
          <div
            v-if="sectionProgress(si).wrong > 0"
            class="inline-block h-full bg-red-400 transition-all duration-500"
            :style="{ width: (sectionProgress(si).wrong / sectionProgress(si).total * 100) + '%' }"
          />
          <!-- Pending (answered, ungraded) segment -->
          <div
            v-if="sectionProgress(si).pending > 0"
            class="inline-block h-full bg-blue-400 transition-all duration-500"
            :style="{ width: (sectionProgress(si).pending / sectionProgress(si).total * 100) + '%' }"
          />
        </div>

        <!-- Section stats text -->
        <p
          v-if="sectionProgress(si).answered > 0"
          class="mb-3 text-xs text-slate-400 dark:text-slate-500"
        >
          已答 {{ sectionProgress(si).answered }}/{{ sectionProgress(si).total }}
          <template v-if="sectionProgress(si).correct > 0 || sectionProgress(si).wrong > 0">
            · 正确 {{ sectionProgress(si).correct }} · 错误 {{ sectionProgress(si).wrong }}
          </template>
        </p>

        <!-- Question button grid -->
        <div class="grid gap-2" :class="gridCols">
          <button
            v-for="j in section.count"
            :key="j"
            :data-idx="sectionHeaders[si].atIndex + j - 1"
            @click="emit('goTo', sectionHeaders[si].atIndex + j - 1)"
            :class="btnClasses(sectionHeaders[si].atIndex + j - 1)"
            :title="`第 ${sectionHeaders[si].atIndex + j} 题`"
            :aria-label="btnAriaLabel(sectionHeaders[si].atIndex + j - 1)"
            :style="{
              animationDelay: `${j * 25}ms`,
              animationFillMode: 'both',
            }"
            class="animate-fade-in"
          >
            {{ sectionHeaders[si].atIndex + j }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
