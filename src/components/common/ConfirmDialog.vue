<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'

defineProps<{
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      @click.self="emit('cancel')"
    >
      <div
        class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
        @click.stop
      >
        <div class="flex items-start gap-4">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="danger ? 'bg-red-100 dark:bg-red-900/40' : 'bg-amber-100 dark:bg-amber-900/40'"
          >
            <AlertTriangle
              class="h-5 w-5"
              :class="danger ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'"
            />
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ message }}</p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button class="btn btn-secondary text-sm" @click="emit('cancel')">
            {{ cancelText || '取消' }}
          </button>
          <button
            class="btn text-sm"
            :class="danger ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'"
            @click="emit('confirm')"
          >
            {{ confirmText || '确认' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
