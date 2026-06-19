<script setup lang="ts">
defineProps<{
  categories: string[]
  selected: string
}>()

const emit = defineEmits<{
  select: [category: string]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      :class="[
        'rounded-full px-3 py-1 text-sm font-medium transition-colors',
        selected === ''
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
      ]"
      @click="emit('select', '')"
    >
      全部
    </button>
    <button
      v-for="cat in categories"
      :key="cat"
      :class="[
        'rounded-full px-3 py-1 text-sm font-medium transition-colors',
        selected === cat
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
      ]"
      @click="emit('select', cat)"
    >
      {{ cat }}
    </button>
  </div>
</template>