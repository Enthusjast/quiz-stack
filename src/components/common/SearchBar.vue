<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Search, X, Command } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    /** Visual size variant */
    size?: 'sm' | 'md' | 'lg'
    /** Automatically focus on mount */
    autofocus?: boolean
    /** Debounce delay in ms (0 = no debounce) */
    debounce?: number
    /** Show a keyboard shortcut hint when idle */
    shortcut?: string
    /** Accessible label for screen readers */
    label?: string
  }>(),
  {
    placeholder: '搜索题库...',
    size: 'md',
    autofocus: false,
    debounce: 0,
    shortcut: undefined,
    label: '搜索',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** Emitted on Enter key or explicit submit action */
  submit: [value: string]
}>()

// ---- State ----
const inputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
/** Track whether the OS uses a Command key (Mac) vs Ctrl (others) */
const isMac = ref(false)

// ---- Size token maps ----
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        wrapper: 'h-9',
        input: 'text-xs pl-8 pr-8 py-1.5',
        iconLeft: 'left-2.5 h-3.5 w-3.5',
        iconRight: 'right-1.5 h-3 w-3 rounded-md p-0.5',
        shortcut: 'right-1.5 py-px px-1.5 text-[10px] gap-0.5',
      }
    case 'lg':
      return {
        wrapper: 'h-12',
        input: 'text-base pl-11 pr-11 py-3',
        iconLeft: 'left-3.5 h-5 w-5',
        iconRight: 'right-2 h-3.5 w-3.5 rounded-lg p-1',
        shortcut: 'right-2 py-0.5 px-2 text-xs gap-1',
      }
    default: // md
      return {
        wrapper: 'h-10',
        input: 'text-sm pl-10 pr-10 py-2',
        iconLeft: 'left-3 h-4 w-4',
        iconRight: 'right-2 h-3.5 w-3.5 rounded-lg p-0.5',
        shortcut: 'right-2 py-px px-1.5 text-[11px] gap-0.5',
      }
  }
})

// ---- Methods ----

function onInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  if (props.debounce > 0) {
    if (debounceTimer.value) clearTimeout(debounceTimer.value)
    debounceTimer.value = setTimeout(() => emit('update:modelValue', value), props.debounce)
  } else {
    emit('update:modelValue', value)
  }
}

function clear() {
  emit('update:modelValue', '')
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  nextTick(() => inputRef.value?.focus())
}

function onSubmit() {
  emit('submit', props.modelValue)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (props.modelValue) {
      clear()
    } else {
      inputRef.value?.blur()
    }
  }
}

function focus() {
  inputRef.value?.focus()
}

// ---- Lifecycle ----

onMounted(() => {
  isMac.value = /Mac|iPod|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent)
  if (props.autofocus) {
    nextTick(() => inputRef.value?.focus())
  }
})

onUnmounted(() => {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
})

defineExpose({ focus, clear, inputRef })
</script>

<template>
  <div class="search-bar-wrapper relative group" :class="sizeClasses.wrapper">
    <!-- ===== Background glow on focus (hidden in paper theme) ===== -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -inset-1 -z-10 rounded-2xl opacity-0 blur-lg transition-all duration-500"
      :class="[
        isFocused
          ? 'bg-blue-400/20 opacity-100 dark:bg-blue-500/15'
          : 'group-hover:bg-slate-200/30 dark:group-hover:bg-slate-700/20',
        size === 'lg' ? '-inset-1.5 rounded-[1.125rem]' : '',
      ]"
    />

    <!-- ===== Search icon (left) ===== -->
    <label
      class="absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-300 cursor-text"
      :class="[
        sizeClasses.iconLeft,
        isFocused
          ? 'text-blue-500 dark:text-blue-400'
          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400',
      ]"
      :aria-label="label"
      @click="focus"
    >
      <Search
        class="transition-transform duration-300"
        :class="isFocused ? 'scale-110' : 'group-hover:scale-105'"
      />
    </label>

    <!-- ===== Input field ===== -->
    <input
      ref="inputRef"
      type="search"
      :value="modelValue"
      @input="onInput"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @keydown="onKeydown"
      @keyup.enter="onSubmit"
      :placeholder="placeholder"
      :aria-label="label"
      :class="[
        sizeClasses.input,
        'w-full rounded-xl border-2 transition-all duration-300',
        'bg-white/90 text-slate-900 placeholder:text-slate-400',
        'dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500',
        'backdrop-blur-sm',
        // Border & ring states
        isFocused
          ? [
              'border-blue-400 dark:border-blue-500',
              'shadow-lg shadow-blue-500/10 dark:shadow-blue-400/8',
              'ring-4 ring-blue-500/12 dark:ring-blue-400/10',
            ]
          : [
              'border-slate-200 dark:border-slate-700',
              'shadow-sm',
              'hover:border-slate-300 dark:hover:border-slate-600',
              'hover:shadow-md',
            ],
        // Paper theme overrides
        'theme-paper:rounded-lg theme-paper:shadow-none theme-paper:ring-0',
        size === 'lg' ? 'theme-paper:rounded-lg' : '',
      ]"
      autocomplete="off"
      spellcheck="false"
    />

    <!-- ===== Keyboard shortcut hint (when idle & no value) ===== -->
    <div
      v-if="!modelValue && !isFocused"
      class="absolute top-1/2 -translate-y-1/2 z-10 flex items-center rounded-md border border-slate-200/60 bg-slate-100/80 text-slate-400 backdrop-blur-sm transition-all duration-300 pointer-events-none select-none dark:border-slate-700/60 dark:bg-slate-700/70 dark:text-slate-500 group-hover:border-slate-300 dark:group-hover:border-slate-600"
      :class="shortcut ? sizeClasses.shortcut : 'hidden'"
    >
      <template v-if="shortcut">
        <Command v-if="isMac" class="h-3 w-3" />
        <span v-else class="text-[10px] font-medium leading-none tracking-wide">Ctrl</span>
        <span class="font-medium leading-none">{{ shortcut }}</span>
      </template>
    </div>

    <!-- ===== Clear button (right) ===== -->
    <Transition name="search-clear">
      <button
        v-if="modelValue"
        class="absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center text-slate-400 transition-all duration-200 hover:text-slate-700 hover:bg-slate-200/70 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-600/60 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
        :class="sizeClasses.iconRight"
        @click="clear"
        aria-label="清除搜索"
        type="button"
      >
        <X class="transition-transform duration-200" :class="sizeClasses.iconRight" />
      </button>
    </Transition>
  </div>
</template>

<style scoped>
/* ===== Clear button transition ===== */
.search-clear-enter-active {
  transition: all 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.search-clear-leave-active {
  transition: all 150ms ease-in;
}
.search-clear-enter-from {
  opacity: 0;
  transform: translateY(-50%) scale(0.5);
}
.search-clear-leave-to {
  opacity: 0;
  transform: translateY(-50%) scale(0.5) rotate(90deg);
}

/* ===== Paper theme overrides ===== */
.theme-paper .search-bar-wrapper :deep(input) {
  border-radius: 0.5rem;
  box-shadow: none;
}
.theme-paper .search-bar-wrapper :deep(input:focus) {
  box-shadow: none;
  ring-width: 2px;
}
</style>
