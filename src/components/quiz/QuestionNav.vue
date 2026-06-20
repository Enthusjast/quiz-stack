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

function stateColor(state: ProblemState): string {
  switch (state) {
    case -1: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
    case 0: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    case 1: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
    case 2: return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
    case 3: return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
  }
}

function stateRing(index: number): string {
  return index === props.currentIndex
    ? 'ring-2 ring-indigo-400 dark:ring-indigo-500'
    : ''
}

const hasSections = computed(() =>
  (props.examSections?.length ?? 0) > 0
)

/** Build section header labels with offsets */
const sectionHeaders = computed(() => {
  if (!hasSections.value) return []
  const headers: { label: string; atIndex: number }[] = []
  let offset = 0
  for (const sec of props.examSections!) {
    const scorePart = sec.totalScore > 0 ? `，${sec.totalScore}分` : ''
    headers.push({
      label: `${sec.typeLabel}（${sec.count}题${scorePart}）`,
      atIndex: offset,
    })
    offset += sec.count
  }
  return headers
})
</script>

<template>
  <div>
    <!-- Simple mode: plain grid -->
    <div v-if="!hasSections" class="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
      <button
        v-for="(state, idx) in problemStates"
        :key="idx"
        @click="emit('goTo', idx)"
        :class="[
          'flex h-8 w-8 items-center justify-center rounded-md text-xs font-mono font-medium transition-all hover:scale-105',
          stateColor(state),
          stateRing(idx),
        ]"
        :title="`第 ${idx + 1} 题`"
      >
        {{ idx + 1 }}
      </button>
    </div>

    <!-- Exam mode: grouped by section -->
    <div v-else class="space-y-3">
      <template v-for="(section, si) in examSections" :key="si">
        <div class="text-xs font-medium text-gray-500 dark:text-gray-400">
          {{ sectionHeaders[si].label }}
        </div>
        <div class="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
          <button
            v-for="j in section.count"
            :key="j"
            @click="emit('goTo', sectionHeaders[si].atIndex + j - 1)"
            :class="[
              'flex h-8 w-8 items-center justify-center rounded-md text-xs font-mono font-medium transition-all hover:scale-105',
              stateColor(problemStates[sectionHeaders[si].atIndex + j - 1]),
              stateRing(sectionHeaders[si].atIndex + j - 1),
            ]"
            :title="`第 ${sectionHeaders[si].atIndex + j} 题`"
          >
            {{ sectionHeaders[si].atIndex + j }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
