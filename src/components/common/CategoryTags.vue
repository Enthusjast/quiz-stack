<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { Layers, Hash } from '@lucide/vue'

// ── Default icon mapping (common quiz categories) ──
const DEFAULT_ICON_MAP: Record<string, any> = {
  '全部': Layers,
}

const props = withDefaults(
  defineProps<{
    categories: string[]
    selected: string
    /** Per-category Lucide icon overrides */
    iconMap?: Record<string, any>
    /** Per-category item counts (shown as badge) */
    counts?: Record<string, number>
    /** Visual size variant */
    size?: 'sm' | 'md' | 'lg'
    /** Enable staggered entrance animation */
    animate?: boolean
    /** Accessible label for the group */
    label?: string
  }>(),
  {
    iconMap: () => ({}),
    counts: undefined,
    size: 'md',
    animate: true,
    label: '分类筛选',
  },
)

const emit = defineEmits<{
  select: [category: string]
}>()

// ── Scroll state for overflow fade indicators ──
const scrollContainer = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const hasOverflow = ref(false)

// ── Staggered reveal ──
const revealed = ref(false)
const itemCount = computed(() => props.categories.length + 1) // +1 for "全部"

function updateScrollState() {
  const el = scrollContainer.value
  if (!el) return
  const tolerance = 2
  canScrollLeft.value = el.scrollLeft > tolerance
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance
  hasOverflow.value = el.scrollWidth > el.clientWidth + tolerance
}

onMounted(() => {
  nextTick(() => {
    updateScrollState()
    // Reveal after a micro-frame to trigger staggered animation
    if (props.animate) {
      requestAnimationFrame(() => {
        revealed.value = true
      })
    }
  })
})

// ── Size token map ──
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        pill: 'px-3 py-1 text-xs gap-1.5',
        icon: 'h-3.5 w-3.5',
        badge: 'text-[10px] px-1.5 py-px',
        gap: 'gap-1.5',
      }
    case 'lg':
      return {
        pill: 'px-5 py-2.5 text-base gap-2.5',
        icon: 'h-5 w-5',
        badge: 'text-xs px-2 py-0.5',
        gap: 'gap-3',
      }
    default: // md
      return {
        pill: 'px-4 py-2 text-sm gap-2',
        icon: 'h-4 w-4',
        badge: 'text-[11px] px-1.5 py-0.5',
        gap: 'gap-2',
      }
  }
})

// ── Resolve icon for a category ──
function getIcon(cat: string): any | null {
  if (props.iconMap[cat]) return props.iconMap[cat]
  if (DEFAULT_ICON_MAP[cat]) return DEFAULT_ICON_MAP[cat]
  return Hash // fallback icon
}

// ── Keyboard navigation ──
function onTagKeydown(e: KeyboardEvent, index: number) {
  const total = itemCount.value
  let nextIndex = index

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    nextIndex = (index + 1) % total
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    nextIndex = (index - 1 + total) % total
  } else {
    return
  }

  // Focus the next/prev button
  const buttons = scrollContainer.value?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
  buttons?.[nextIndex]?.focus()
}

// ── Scroll helpers ──
function scrollBy(direction: 'left' | 'right') {
  const el = scrollContainer.value
  if (!el) return
  const amount = el.clientWidth * 0.6
  el.scrollBy({
    left: direction === 'left' ? -amount : amount,
    behavior: 'smooth',
  })
}

// ── Tags list (including "全部") ──
interface TagItem {
  key: string
  label: string
  value: string
  isAll: boolean
}
const tags = computed<TagItem[]>(() => [
  { key: '__all__', label: '全部', value: '', isAll: true },
  ...props.categories.map((cat) => ({
    key: cat,
    label: cat,
    value: cat,
    isAll: false,
  })),
])
</script>

<template>
  <div class="category-tags-wrapper relative" :class="sizeClasses.gap">
    <!-- ===== Overflow fade masks ===== -->
    <div
      v-if="hasOverflow"
      aria-hidden="true"
      class="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-10 rounded-l-full opacity-0 transition-opacity duration-300"
      :class="[
        canScrollLeft
          ? 'opacity-100 bg-gradient-to-r from-blue-50/95 via-blue-50/70 to-transparent dark:from-slate-900/95 dark:via-slate-900/70'
          : '',
      ]"
      @click="scrollBy('left')"
    />
    <div
      v-if="hasOverflow"
      aria-hidden="true"
      class="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-10 rounded-r-full opacity-0 transition-opacity duration-300"
      :class="[
        canScrollRight
          ? 'opacity-100 bg-gradient-to-l from-blue-50/95 via-blue-50/70 to-transparent dark:from-slate-900/95 dark:via-slate-900/70'
          : '',
      ]"
      @click="scrollBy('right')"
    />

    <!-- ===== Tags container ===== -->
    <div
      ref="scrollContainer"
      role="radiogroup"
      :aria-label="label"
      class="category-tags-track flex flex-nowrap pb-1 -mb-1 scroll-smooth"
      :class="[sizeClasses.gap, hasOverflow ? 'overflow-x-auto no-scrollbar pr-4' : 'flex-wrap']"
      @scroll.passive="updateScrollState"
    >
      <TransitionGroup name="tag-stagger" tag="div" class="contents">
        <button
          v-for="(tag, idx) in tags"
          :key="tag.key"
          role="radio"
          :aria-checked="selected === tag.value"
          :aria-label="tag.isAll ? '显示全部题目' : `筛选分类: ${tag.label}`"
          :tabindex="selected === tag.value ? 0 : -1"
          :style="{
            transitionDelay: animate ? `${20 + idx * 40}ms` : '0ms',
            animationDelay: animate ? `${20 + idx * 40}ms` : '0ms',
          }"
          :class="[
            // ── Base pill ──
            sizeClasses.pill,
            'relative inline-flex items-center rounded-full font-medium select-none',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2',
            'dark:focus-visible:ring-offset-slate-900',
            // ── Animations ──
            animate
              ? [
                  'tag-stagger-item opacity-0 translate-y-2',
                  { 'opacity-100 translate-y-0': revealed },
                ]
              : '',
            // ── Selected state ──
            selected === tag.value
              ? [
                  // Claymorphism: multi-layer shadow for depth
                  'bg-blue-600 text-white',
                  'shadow-md shadow-blue-600/30',
                  'dark:bg-blue-500 dark:shadow-lg dark:shadow-blue-500/25',
                  // Inner highlight glow
                  'after:absolute after:inset-0 after:rounded-full',
                  'after:bg-gradient-to-b after:from-white/15 after:to-transparent',
                  'after:pointer-events-none',
                  // Hover
                  'hover:bg-blue-700 dark:hover:bg-blue-600',
                  // Press: spring-like squish
                  'active:scale-[0.94] active:shadow-sm active:shadow-blue-600/20',
                  'dark:active:shadow-sm dark:active:shadow-blue-500/15',
                  // Tag: slightly larger
                  'scale-105',
                ]
              : [
                  // Unselected state
                  'bg-white text-slate-600',
                  'shadow-sm shadow-slate-200/40',
                  'border border-slate-200/80',
                  'dark:bg-slate-800 dark:text-slate-400',
                  'dark:shadow-none dark:border-slate-700/80',
                  // Hover
                  'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
                  'hover:shadow-md hover:shadow-blue-100/60',
                  'dark:hover:bg-slate-700/80 dark:hover:text-slate-200',
                  'dark:hover:border-slate-600',
                  // Press
                  'active:scale-[0.94] active:bg-blue-100 dark:active:bg-slate-700',
                  // Normal scale
                  'scale-100',
                ],
          ]"
          @click="emit('select', tag.value)"
          @keydown="onTagKeydown($event, idx)"
        >
          <!-- ── Icon ── -->
          <component
            :is="getIcon(tag.isAll ? '全部' : tag.label)"
            :class="[
              sizeClasses.icon,
              'shrink-0 transition-transform duration-200',
              selected === tag.value
                ? 'text-white/90'
                : 'text-slate-400 dark:text-slate-500',
              selected === tag.value ? '' : 'group-hover:text-blue-500 dark:group-hover:text-blue-400',
            ]"
          />

          <!-- ── Label ── -->
          <span class="truncate">{{ tag.label }}</span>

          <!-- ── Active indicator dot ── -->
          <span
            v-if="selected === tag.value"
            aria-hidden="true"
            class="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-5 rounded-full bg-blue-300/60 dark:bg-blue-400/40"
          />

          <!-- ── Count badge ── -->
          <span
            v-if="counts && !tag.isAll && counts[tag.value] !== undefined"
            :class="[
              sizeClasses.badge,
              'inline-flex items-center rounded-full font-semibold tabular-nums',
              'transition-colors duration-200',
              selected === tag.value
                ? 'bg-white/20 text-white'
                : 'bg-slate-200/70 text-slate-500 dark:bg-slate-700/70 dark:text-slate-400',
            ]"
          >
            {{ counts[tag.value] }}
          </span>

          <!-- ── "All" total count badge ── -->
          <span
            v-if="counts && tag.isAll && Object.values(counts).reduce((a, b) => a + b, 0) > 0"
            :class="[
              sizeClasses.badge,
              'inline-flex items-center rounded-full font-semibold tabular-nums',
              'transition-colors duration-200',
              selected === tag.value
                ? 'bg-white/20 text-white'
                : 'bg-slate-200/70 text-slate-500 dark:bg-slate-700/70 dark:text-slate-400',
            ]"
          >
            {{ Object.values(counts).reduce((a, b) => a + b, 0) }}
          </span>
        </button>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
/* ── Scrollbar hiding ── */
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* ── Staggered entrance transition ── */
.tag-stagger-enter-active {
  transition: opacity 350ms ease-out, transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
}
.tag-stagger-leave-active {
  transition: opacity 200ms ease-in, transform 200ms ease-in;
}
.tag-stagger-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.92);
}
.tag-stagger-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.9);
}
.tag-stagger-move {
  transition: transform 300ms ease;
}

/* ── Respect reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .tag-stagger-enter-active,
  .tag-stagger-leave-active {
    transition: opacity 150ms ease-out;
  }
  .tag-stagger-enter-from,
  .tag-stagger-leave-to {
    transform: none;
  }
  .tag-stagger-move {
    transition: none;
  }
  .tag-stagger-item {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
