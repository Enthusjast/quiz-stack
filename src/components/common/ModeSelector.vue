<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PracticeMode, CustomPracticeConfig } from '@/types/problem'
import { PROBLEM_TYPE_LABELS } from '@/types/problem'
import {
  X,
  ArrowLeft,
  Settings2,
  ListOrdered,
  Shuffle,
  FileText,
  RotateCcw,
} from '@lucide/vue'

const props = defineProps<{
  show: boolean
  /** The review option is only available when the parent has loaded wrong problems. */
  wrongProblemCount?: number
}>()

const emit = defineEmits<{
  close: []
  confirm: [mode: PracticeMode]
  'confirm-custom': [config: CustomPracticeConfig]
}>()

// ---- custom practice sub-panel state ----
const showCustomPanel = ref(false)
const enabledTypes = ref<Record<number, boolean>>({
  0: true,
  1: true,
  2: true,
  3: true,
  4: true,
})
const shuffleEnabled = ref(true)
const validationShake = ref(false)
const dialogRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const backButtonRef = ref<HTMLButtonElement | null>(null)
let previouslyFocusedElement: HTMLElement | null = null
let previousBodyOverflow: string | null = null
let resetTimer: ReturnType<typeof setTimeout> | undefined

// ---- mode card definitions ----
interface ModeCard {
  mode: PracticeMode | 'custom'
  icon: typeof ListOrdered
  color: string
  bgClass: string
  title: string
  description: string
  action: () => void
}

const modeCards = computed<ModeCard[]>(() => {
  const cards: ModeCard[] = [{
    mode: 'sequential',
    icon: ListOrdered,
    color: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    title: '顺序练习',
    description: '按照题库原始顺序逐题练习，选择题选项会随机打乱',
    action: () => emit('confirm', 'sequential'),
  }, {
    mode: 'random',
    icon: Shuffle,
    color: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    title: '乱序练习',
    description: '题目和选项顺序完全随机，全面检验知识掌握',
    action: () => emit('confirm', 'random'),
  }]

  if ((props.wrongProblemCount ?? 0) > 0) {
    cards.push({
      mode: 'wrong-review',
      icon: RotateCcw,
      color: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-100 dark:bg-rose-900/30',
      title: '错题复习',
      description: `集中复习错题本中的 ${props.wrongProblemCount} 道题`,
      action: () => emit('confirm', 'wrong-review'),
    })
  }

  cards.push({
    mode: 'mock-exam',
    icon: FileText,
    color: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    title: '模拟考试',
    description: '限时作答，交卷后统一判分，支持分题型计分',
    action: () => emit('confirm', 'mock-exam'),
  }, {
    mode: 'custom',
    icon: Settings2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    title: '自定义练习',
    description: '选择特定题型和乱序方式，量身定制练习内容',
    action: openCustomPanel,
  })

  return cards
})

function openCustomPanel() {
  showCustomPanel.value = true
}

function closeCustomPanel() {
  showCustomPanel.value = false
}

function focusActivePanel() {
  nextTick(() => {
    if (!props.show) return
    const preferred = showCustomPanel.value ? backButtonRef.value : closeButtonRef.value
    ;(preferred ?? dialogRef.value)?.focus({ preventScroll: true })
  })
}

function handleEscape(event: KeyboardEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (showCustomPanel.value) {
    closeCustomPanel()
  } else {
    emit('close')
  }
}

function trapFocus(event: KeyboardEvent) {
  const dialog = dialogRef.value
  if (!dialog) return

  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0)

  if (focusable.length === 0) {
    event.preventDefault()
    dialog.focus({ preventScroll: true })
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement

  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault()
    last.focus({ preventScroll: true })
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault()
    first.focus({ preventScroll: true })
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (!props.show) return
  if (event.key === 'Escape') handleEscape(event)
  else if (event.key === 'Tab') trapFocus(event)
}

function handleFocusIn(event: FocusEvent) {
  const dialog = dialogRef.value
  if (!props.show || !dialog || !(event.target instanceof Node)) return
  if (dialog.contains(event.target)) return
  focusActivePanel()
}

function addDocumentListeners() {
  document.addEventListener('keydown', handleDocumentKeydown)
  document.addEventListener('focusin', handleFocusIn)
}

function removeDocumentListeners() {
  document.removeEventListener('keydown', handleDocumentKeydown)
  document.removeEventListener('focusin', handleFocusIn)
}

function unlockBodyScroll() {
  if (previousBodyOverflow === null) return
  document.body.style.overflow = previousBodyOverflow
  previousBodyOverflow = null
}

function restorePreviousFocus() {
  const target = previouslyFocusedElement
  previouslyFocusedElement = null
  nextTick(() => {
    if (target?.isConnected) target.focus()
  })
}

function toggleType(type: number) {
  enabledTypes.value[type] = !enabledTypes.value[type]
}

function confirmCustom() {
  const types = Object.entries(enabledTypes.value)
    .filter(([, v]) => v)
    .map(([k]) => Number(k))

  if (types.length === 0) {
    // At least one type must be selected — enable single choice by default
    enabledTypes.value[1] = true
    // Trigger shake animation for visual feedback
    validationShake.value = true
    setTimeout(() => {
      validationShake.value = false
    }, 500)
    return
  }

  emit('confirm-custom', {
    enabledTypes: types,
    shuffle: shuffleEnabled.value,
  })
  showCustomPanel.value = false
}

watch(() => props.show, (visible) => {
  if (resetTimer) clearTimeout(resetTimer)

  if (visible) {
    previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    if (previousBodyOverflow === null) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    addDocumentListeners()
    focusActivePanel()
    return
  }

  removeDocumentListeners()
  unlockBodyScroll()
  restorePreviousFocus()
  resetTimer = setTimeout(() => {
    showCustomPanel.value = false
  }, 250)
}, { immediate: true })

onMounted(() => {
  if (props.show) focusActivePanel()
})

onBeforeUnmount(() => {
  if (resetTimer) clearTimeout(resetTimer)
  removeDocumentListeners()
  unlockBodyScroll()
  restorePreviousFocus()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <!-- Main mode list panel -->
        <Transition name="panel-forward" mode="out-in" @after-enter="focusActivePanel">
          <div
            v-if="!showCustomPanel"
            ref="dialogRef"
            key="main"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mode-selector-title"
            tabindex="-1"
            class="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-800 sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-6"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between mb-5">
              <h2 id="mode-selector-title" class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                选择练习模式
              </h2>
              <button
                ref="closeButtonRef"
                type="button"
                class="btn btn-ghost h-9 w-9 p-0"
                aria-label="关闭"
                @click="emit('close')"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Mode cards -->
            <div class="space-y-3">
              <button
                v-for="card in modeCards"
                :key="card.mode"
                type="button"
                class="card w-full text-left cursor-pointer group
                       active:scale-[0.985] transition-transform duration-150
                       hover:border-blue-300 dark:hover:border-blue-700
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
                @click="card.action"
              >
                <div class="flex items-start gap-3.5">
                  <!-- Icon circle -->
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                           transition-transform duration-200 group-hover:scale-110"
                    :class="card.bgClass"
                  >
                    <component :is="card.icon" class="h-5 w-5" :class="card.color" />
                  </div>
                  <!-- Text -->
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-slate-900 dark:text-slate-100 leading-6">
                      {{ card.title }}
                    </h3>
                    <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {{ card.description }}
                    </p>
                  </div>
                  <!-- Arrow hint -->
                  <div class="mt-2 shrink-0 text-slate-300 dark:text-slate-600
                              transition-all duration-200
                              group-hover:text-slate-400 group-hover:translate-x-0.5
                              dark:group-hover:text-slate-400">
                    <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Custom practice sub-panel -->
          <div
            v-else
            ref="dialogRef"
            key="custom"
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-practice-title"
            tabindex="-1"
            class="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-800 sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-6"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center gap-3 mb-5">
              <button
                ref="backButtonRef"
                type="button"
                class="btn btn-ghost h-9 w-9 shrink-0 p-0"
                aria-label="返回"
                @click="closeCustomPanel"
              >
                <ArrowLeft class="h-5 w-5" />
              </button>
              <h2 id="custom-practice-title" class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                自定义练习
              </h2>
            </div>

            <div class="space-y-5">
              <!-- Type toggles -->
              <fieldset>
                <legend class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2.5">
                  选择题型（至少一种）
                </legend>
                <div
                  class="space-y-2"
                  :class="{ 'animate-shake': validationShake }"
                >
                  <label
                    v-for="type in [0, 1, 2, 3, 4]"
                    :key="type"
                    class="flex items-center gap-3 cursor-pointer rounded-lg border px-4 py-2.5
                           transition-all duration-200
                           border-gray-200 hover:bg-gray-50
                           dark:border-gray-700 dark:hover:bg-gray-800/50
                           has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-2
                           dark:has-[:focus-visible]:ring-offset-slate-800"
                    :class="enabledTypes[type]
                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700'
                      : ''"
                  >
                    <div class="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        :checked="enabledTypes[type]"
                        class="sr-only"
                        @change="toggleType(type)"
                      />
                      <div
                        class="flex h-5 w-5 items-center justify-center rounded
                               border-2 transition-all duration-200"
                        :class="enabledTypes[type]
                          ? 'border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400 scale-100'
                          : 'border-gray-300 dark:border-gray-600 scale-95'"
                      >
                        <svg
                          v-if="enabledTypes[type]"
                          class="h-3 w-3 text-white"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <span
                      class="text-sm transition-colors duration-200"
                      :class="enabledTypes[type]
                        ? 'text-slate-900 font-medium dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400'"
                    >
                      {{ PROBLEM_TYPE_LABELS[type] }}
                    </span>
                  </label>
                </div>
              </fieldset>

              <!-- Shuffle toggle -->
              <div
                class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3
                       dark:border-gray-700"
              >
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {{ shuffleEnabled ? '乱序出题' : '顺序出题' }}
                </span>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="shuffleEnabled"
                  :aria-label="shuffleEnabled ? '切换为顺序出题' : '切换为乱序出题'"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                         border-2 border-transparent transition-colors duration-200
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                         focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
                  :class="shuffleEnabled ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-600'"
                  @click="shuffleEnabled = !shuffleEnabled"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full
                           bg-white shadow-sm ring-0 transition-transform duration-200 ease-out"
                    :class="shuffleEnabled ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </div>

              <!-- Minimum selection hint -->
              <p
                v-if="Object.values(enabledTypes).filter(Boolean).length === 1"
                class="text-xs text-amber-600 dark:text-amber-400"
              >
                已选到最小数量，至少保留一种题型
              </p>

              <!-- Confirm button -->
              <button
                type="button"
                class="btn btn-primary w-full text-base py-2.5 active:scale-[0.98] transition-transform"
                @click="confirmCustom"
              >
                开始练习
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Panel slide transition — forward (enter custom panel) */
.panel-forward-enter-active {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.panel-forward-leave-active {
  transition: opacity 150ms ease-in, transform 150ms ease-in;
}
.panel-forward-enter-from {
  opacity: 0;
  transform: translateX(32px);
}
.panel-forward-leave-to {
  opacity: 0;
  transform: translateX(-32px);
}

@media (prefers-reduced-motion: reduce) {
  .panel-forward-enter-active,
  .panel-forward-leave-active {
    transition: opacity 100ms ease-out;
  }
  .panel-forward-enter-from,
  .panel-forward-leave-to {
    transform: none;
  }
}

/* Shake animation for validation feedback */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 400ms ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .animate-shake {
    animation: none;
  }
}
</style>
