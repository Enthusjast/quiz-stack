<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { BankRegistry, BankEntry } from '@/types/problem'
import BankCard from '@/components/common/BankCard.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import CategoryTags from '@/components/common/CategoryTags.vue'

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const registry = ref<BankRegistry>({ categories: [], recommended: [], banks: {} })
const searchQuery = ref('')
const selectedCategory = ref('')

onMounted(async () => {
  try {
    const resp = await fetch('data/list.json')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    registry.value = await resp.json()
  } catch (e: any) {
    error.value = e.message || '加载题库列表失败'
  } finally {
    loading.value = false
  }
})

const filteredBanks = computed<[string, BankEntry][]>(() => {
  let entries = Object.entries(registry.value.banks)

  // Featured banks shown first when no filter active
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

function selectBank(bankId: string) {
  router.push({ name: 'quiz', params: { bankId } })
}
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

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div
        v-for="i in 3"
        :key="i"
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
        {{ selectedCategory || '全部' }} · {{ filteredBanks.length }} 个题库
      </p>

      <!-- Bank list -->
      <div class="grid gap-3 sm:grid-cols-2">
        <BankCard
          v-for="[id, bank] in filteredBanks"
          :key="id"
          :bank-id="id"
          :bank="bank"
          @select="selectBank"
        />
      </div>

      <div v-if="filteredBanks.length === 0" class="py-16 text-center">
        <p class="text-gray-500 dark:text-gray-400">没有找到匹配的题库</p>
      </div>
    </template>
  </div>
</template>