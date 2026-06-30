<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  totalItems: number
  currentPage: number
  pageSize: number
}>()

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
  (e: 'update:pageSize', size: number): void
}>()

const totalPages = computed(() => {
  return Math.ceil(props.totalItems / props.pageSize) || 1
})

const startRange = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.currentPage - 1) * props.pageSize + 1
})

const endRange = computed(() => {
  return Math.min(props.currentPage * props.pageSize, props.totalItems)
})

const localPageSize = computed({
  get: () => props.pageSize,
  set: (val) => {
    emit('update:pageSize', val)
    emit('update:currentPage', 1) // reset to page 1 on page size change
  }
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:currentPage', page)
  }
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, props.currentPage - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})
</script>

<template>
  <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs text-xs font-semibold text-gray-500 dark:text-gray-400">
    <!-- Info -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
      <div>
        Showing <span class="font-bold text-gray-700 dark:text-gray-200">{{ startRange }}–{{ endRange }}</span> of 
        <span class="font-bold text-gray-700 dark:text-gray-200">{{ totalItems }}</span> records
      </div>
      
      <!-- Rows per page selector -->
      <div class="flex items-center gap-1.5">
        <span>Rows per page:</span>
        <select v-model="localPageSize" class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-1.5 py-0.5 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-1">
      <!-- First Page -->
      <button 
        @click="goToPage(1)" 
        :disabled="currentPage === 1"
        class="p-1 px-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300"
        title="First Page"
      >
        «
      </button>

      <!-- Prev -->
      <button 
        @click="goToPage(currentPage - 1)" 
        :disabled="currentPage === 1"
        class="p-1 px-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300"
        title="Previous Page"
      >
        ‹
      </button>

      <!-- Page Numbers -->
      <button 
        v-for="page in visiblePages" 
        :key="page"
        @click="goToPage(page)"
        class="px-2.5 py-1 border rounded-md transition cursor-pointer text-xs font-bold"
        :class="currentPage === page 
          ? 'bg-teal-500 text-white border-teal-500' 
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900'"
      >
        {{ page }}
      </button>

      <!-- Next -->
      <button 
        @click="goToPage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="p-1 px-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300"
        title="Next Page"
      >
        ›
      </button>

      <!-- Last Page -->
      <button 
        @click="goToPage(totalPages)" 
        :disabled="currentPage === totalPages"
        class="p-1 px-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300"
        title="Last Page"
      >
        »
      </button>
    </div>
  </div>
</template>
