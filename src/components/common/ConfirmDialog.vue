<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { AlertTriangle, Info } from '@lucide/vue'

const props = withDefaults(defineProps<{
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
}>(), {
  confirmText: '确认',
  cancelText: '取消',
  danger: false,
  loading: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmBtnRef = ref<HTMLButtonElement>()
const cancelBtnRef = ref<HTMLButtonElement>()

// ── Focus management ──────────────────────────────────────────
// Auto-focus: cancel for destructive actions (safer default),
// confirm for non-destructive (convenient default)
watch(() => props.show, async (val) => {
  if (val) {
    await nextTick()
    if (props.danger) {
      cancelBtnRef.value?.focus()
    } else {
      confirmBtnRef.value?.focus()
    }
  }
})

// ── Keyboard: Escape to dismiss ───────────────────────────────
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !props.loading) {
    emit('cancel')
  }
}

// ── Body scroll lock ──────────────────────────────────────────
watch(() => props.show, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)
  } else {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm" appear>
      <div
        v-if="show"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="'confirm-title'"
        :aria-describedby="'confirm-message'"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="!loading && emit('cancel')"
      >
        <!-- Scrim / backdrop -->
        <div
          class="confirm-scrim absolute inset-0 bg-slate-900/40 backdrop-blur-[3px]"
          aria-hidden="true"
        />

        <!-- Claymorphism card -->
        <div
          class="confirm-card relative w-full max-w-sm overflow-hidden
                 rounded-[24px] border-[2.5px] border-white/70
                 bg-[#F4F1FA] p-0
                 shadow-[6px_6px_16px_rgba(0,0,0,0.06),-6px_-6px_16px_rgba(255,255,255,0.95),inset_0.5px_0.5px_0px_rgba(255,255,255,0.8)]
                 dark:border-slate-600/50 dark:bg-slate-800
                 dark:shadow-[6px_6px_16px_rgba(0,0,0,0.35),-2px_-2px_10px_rgba(255,255,255,0.02),inset_0.5px_0.5px_0px_rgba(255,255,255,0.03)]"
          @click.stop
        >
          <!-- Header strip (subtle top accent, claymorphism inner-glow) -->
          <div
            class="h-1.5 w-full rounded-t-[22px]"
            :class="danger
              ? 'bg-gradient-to-r from-red-400 to-red-500 dark:from-red-500 dark:to-red-600'
              : 'bg-gradient-to-r from-blue-400 to-violet-500 dark:from-blue-500 dark:to-violet-600'"
          />

          <div class="px-6 pt-5 pb-6">
            <!-- Icon + Title + Message -->
            <div class="flex items-start gap-4">
              <!-- Icon container: claymorphism debossed (inner shadow) -->
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-white/60
                       shadow-[inset_2px_2px_5px_rgba(0,0,0,0.06),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]
                       dark:border-slate-500/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.25)]"
                :class="danger
                  ? 'bg-red-100 dark:bg-red-900/25'
                  : 'bg-blue-100 dark:bg-blue-900/25'"
                aria-hidden="true"
              >
                <AlertTriangle
                  v-if="danger"
                  class="h-6 w-6 text-red-500 dark:text-red-400"
                />
                <Info
                  v-else
                  class="h-6 w-6 text-blue-500 dark:text-blue-400"
                />
              </div>

              <div class="flex-1 min-w-0 pt-0.5">
                <h2
                  id="confirm-title"
                  class="text-base font-semibold leading-snug text-slate-800 dark:text-slate-100"
                >
                  {{ title }}
                </h2>
                <p
                  id="confirm-message"
                  class="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
                >
                  {{ message }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex justify-end gap-3">
              <!-- Cancel button: claymorphism soft UI -->
              <button
                ref="cancelBtnRef"
                type="button"
                class="confirm-btn-cancel px-5 py-2.5 rounded-2xl text-sm font-semibold
                       border-2 border-slate-200
                       bg-white
                       text-slate-600
                       shadow-[2px_2px_6px_rgba(0,0,0,0.03),-2px_-2px_6px_rgba(255,255,255,0.95)]
                       hover:text-slate-800 hover:border-slate-300
                       hover:shadow-[2px_2px_8px_rgba(0,0,0,0.05),-2px_-2px_8px_rgba(255,255,255,0.98)]
                       active:scale-[0.96] active:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.06)]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                       transition-all duration-150 ease-out
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                       dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300
                       dark:hover:text-slate-100 dark:hover:border-slate-500
                       dark:shadow-[2px_2px_6px_rgba(0,0,0,0.2)]
                       dark:hover:shadow-[2px_2px_8px_rgba(0,0,0,0.3)]
                       dark:active:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.2)]
                       dark:focus-visible:ring-offset-slate-800"
                :disabled="loading"
                @click="emit('cancel')"
              >
                {{ cancelText }}
              </button>

              <!-- Confirm button -->
              <button
                ref="confirmBtnRef"
                type="button"
                class="confirm-btn px-5 py-2.5 rounded-2xl text-sm font-semibold
                       border-2 text-white
                       shadow-[2px_2px_8px_rgba(0,0,0,0.12),-1px_-1px_4px_rgba(255,255,255,0.1)]
                       hover:shadow-[2px_2px_12px_rgba(0,0,0,0.15),-1px_-1px_6px_rgba(255,255,255,0.15)]
                       active:scale-[0.96] active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.15)]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1FA]
                       transition-all duration-150 ease-out
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                       dark:focus-visible:ring-offset-slate-800"
                :class="danger
                  ? 'border-red-400 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus-visible:ring-red-400/70 shadow-[2px_2px_8px_rgba(220,38,38,0.25),-1px_-1px_4px_rgba(255,255,255,0.08)] hover:shadow-[2px_2px_12px_rgba(220,38,38,0.35)] dark:border-red-500 dark:from-red-600 dark:to-red-700 dark:hover:from-red-500 dark:hover:to-red-600 dark:focus-visible:ring-red-400/70'
                  : 'border-blue-400 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus-visible:ring-blue-400/70 dark:border-blue-500 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-500 dark:hover:to-blue-600 dark:focus-visible:ring-blue-400/70'"
                :disabled="loading"
                @click="emit('confirm')"
              >
                <!-- Loading spinner -->
                <span v-if="loading" class="flex items-center gap-2">
                  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{{ confirmText }}</span>
                </span>
                <span v-else>{{ confirmText }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * Confirm Dialog Transitions
 *
 * Claymorphism-appropriate: soft fade + bounce-in for playful entrance,
 * fast shrink-out for responsive dismissal.
 */

/* ── Overlay (scrim + card wrapper) ─────────────────────────── */
.confirm-enter-active {
  transition: opacity 250ms ease-out;
}
.confirm-leave-active {
  transition: opacity 180ms ease-in;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

/* ── Scrim (independent fade for depth perception) ──────────── */
.confirm-scrim {
  transition: opacity 300ms ease-out;
}
.confirm-enter-from .confirm-scrim,
.confirm-leave-to .confirm-scrim {
  opacity: 0;
}

/* ── Card: spring-bounce pop-in (claymorphism playful) ──────── */
.confirm-card {
  animation: confirm-pop-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.confirm-leave-active .confirm-card {
  animation: confirm-shrink-out 160ms ease-in both;
}

@keyframes confirm-pop-in {
  0% {
    opacity: 0;
    transform: scale(0.88) translateY(24px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes confirm-shrink-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.92);
  }
}

/* ── Reduced motion: instant appear/disappear ───────────────── */
@media (prefers-reduced-motion: reduce) {
  .confirm-enter-active,
  .confirm-leave-active {
    transition: opacity 100ms ease-out;
  }

  .confirm-card {
    animation: none;
    transition: opacity 100ms ease-out;
  }

  .confirm-enter-from .confirm-card,
  .confirm-leave-to .confirm-card {
    opacity: 0;
  }

  .confirm-btn,
  .confirm-btn-cancel {
    transition: none;
  }
}
</style>
