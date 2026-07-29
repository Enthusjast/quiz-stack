<script setup lang="ts">
import type { BankEntry } from '@/types/problem'
import { BookOpen, Clock, Sparkles } from '@lucide/vue'
import { computed } from 'vue'

const props = defineProps<{
  bankId: string
  bank: BankEntry
  hasProgress?: boolean
  progressCount?: number
}>()

const emit = defineEmits<{
  select: [bankId: string]
}>()

const ariaLabel = computed(() => {
  const parts = [`题库: ${props.bank.title}`, `${props.bank.questionCount} 道题`]
  if (props.hasProgress) parts.push('有练习进度')
  if (props.bank.new) parts.push('新题库')
  return parts.join('，')
})

</script>

<template>
  <button
    type="button"
    :aria-label="ariaLabel"
    class="card-bank paper-surface paper-flat paper-no-lift group relative isolate min-w-0 max-w-full overflow-hidden text-left"
    @click="emit('select', bankId)"
  >
    <!-- Card body -->
    <div class="flex min-w-0 items-start gap-3 sm:gap-4">
      <!-- Icon column -->
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors duration-200 group-hover:bg-primary-100 group-active:scale-95 dark:bg-primary-950/60 dark:text-primary-400 dark:group-hover:bg-primary-900/60"
      >
        <BookOpen class="h-5 w-5" />
      </div>

      <!-- Main content -->
      <div class="flex-1 min-w-0">
        <!-- Title row -->
        <div class="mb-1.5 flex min-w-0 flex-wrap items-center gap-2">
          <h3
            class="min-w-0 basis-full break-words text-base font-semibold leading-tight text-slate-900 transition-colors duration-200 group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-400"
          >
            {{ bank.title }}
          </h3>
          <!-- Inline badges -->
          <span
            v-if="hasProgress"
            class="inline-flex max-w-full shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/60 transition-colors duration-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
            :title="`${progressCount} 个练习模式有进度`"
          >
            <Clock class="h-3 w-3" />
            <span>有进度</span>
          </span>
          <span
            v-if="bank.new"
            class="inline-flex max-w-full shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200/60 transition-colors duration-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/50"
          >
            <Sparkles class="h-3 w-3" />
            <span>NEW</span>
          </span>
        </div>

        <!-- Category tags -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            v-for="cat in bank.categories"
            :key="cat"
            class="inline-flex min-w-0 max-w-full items-center gap-1 whitespace-normal break-words rounded-md bg-slate-100 px-2 py-0.5 text-left text-xs font-medium text-slate-600 transition-colors duration-200 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700"
          >
            <span class="h-1 w-1 shrink-0 rounded-full bg-primary-400 dark:bg-primary-500" />
            <span class="min-w-0 break-all">{{ cat }}</span>
          </span>
        </div>
      </div>

      <!-- Question count -->
      <div class="flex shrink-0 flex-col items-end">
        <span
          class="text-2xl font-bold tabular-nums leading-none text-slate-900 transition-colors duration-200 group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-400"
        >
          {{ bank.questionCount }}
        </span>
        <span class="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">题</span>
      </div>
    </div>

    <!-- Progress bar (only when has progress) -->
    <div
      v-if="hasProgress"
      class="progress-track mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
    >
      <div
        class="progress-fill paper-gradient-success h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 ease-out dark:from-emerald-500 dark:to-emerald-400"
        :style="{ width: '100%' }"
      />
    </div>
  </button>
</template>

<style scoped>
.card-bank {
  @apply w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5;
  @apply transition-all duration-200 ease-out;
  @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white;
  @apply dark:border-slate-700/80 dark:bg-slate-800/90 dark:focus-visible:ring-offset-slate-900;
  cursor: pointer;
  /* Subtle inner glow gradient (light mode) */
  background-image: linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.02) 100%);
}

.dark .card-bank {
  background-image: linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.04) 100%);
}

/* Hover lift + shadow enhance */
.card-bank:hover {
  @apply -translate-y-1 border-primary-200 shadow-md;
  @apply dark:border-primary-800/60 dark:shadow-lg;
}

/* Active press */
.card-bank:active {
  @apply translate-y-0 scale-[0.985] shadow-sm;
  transition-duration: 80ms;
}

/* Focus-visible: keep ring but don't lift */
.card-bank:focus-visible:hover {
  @apply -translate-y-1;
}

/* --- Progress bar animation --- */
.progress-track {
  background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 100%);
}

.dark .progress-track {
  background: linear-gradient(90deg, #1e293b 0%, #334155 100%);
}

.progress-fill {
  transform-origin: left center;
  animation: progress-grow 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes progress-grow {
  from {
    transform: scaleX(0);
    opacity: 0.3;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .card-bank,
  .card-bank:hover,
  .card-bank:active {
    transition-duration: 0.01ms !important;
    transform: none !important;
  }

  .progress-fill {
    animation: none;
  }
}
</style>
