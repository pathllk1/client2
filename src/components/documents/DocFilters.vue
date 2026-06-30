<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  searchQuery: string
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'download'): void
}>()

const localSearchQuery = computed({
  get: () => props.searchQuery,
  set: (val) => emit('update:searchQuery', val)
})
</script>

<template>
  <div class="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between gap-3 shadow-xs shrink-0">
    <!-- Search Input -->
    <div class="relative flex-1 max-w-xs">
      <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input 
        v-model="localSearchQuery"
        type="text" 
        placeholder="Quick search documents..." 
        class="w-full pl-8 pr-3 py-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-gray-800 transition-all text-gray-700 dark:text-gray-200"
      />
    </div>

    <!-- Download Button -->
    <button 
      @click="$emit('download')" 
      class="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer border-0 shrink-0"
    >
      <span>📥</span> Export Excel
    </button>
  </div>
</template>
