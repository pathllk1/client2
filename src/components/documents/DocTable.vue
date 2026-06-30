<script setup lang="ts">
import { ref } from 'vue'

interface DocumentItem {
  id: string;
  firm_id: string;
  user_id: string;
  name: string;
  reference_number: string;
  description: string | null;
  start_date: string | null;
  original_expiry_date: string;
  closed_date: string | null;
  extended_expiry_date: string | null;
  value: number | string;
  status: string;
  computed_status?: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

const props = defineProps<{
  documents: DocumentItem[]
  loading: boolean
  sortBy: string
  sortOrder: string
}>()

const emit = defineEmits<{
  (e: 'edit', doc: DocumentItem): void
  (e: 'delete', id: string): void
  (e: 'sort', field: string): void
}>()

// State to track expanded detail rows on mobile/tablet
const expandedRowIds = ref<Record<string, boolean>>({})

const toggleRow = (id: string) => {
  expandedRowIds.value[id] = !expandedRowIds.value[id]
}

// Formatting Utilities
const formatCurrency = (val: number | string) => {
  const num = parseFloat(String(val)) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const firstPart = dateStr.split('T')[0];
  if (!firstPart) return dateStr;
  const parts = firstPart.split('-');
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  if (!year || !month || !day) return dateStr;
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-xs flex flex-col h-full">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
      <div class="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 animate-pulse">Loading documents...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="documents.length === 0" class="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-2">
      <span class="text-3xl">📂</span>
      <h3 class="text-sm font-bold text-gray-800 dark:text-gray-200">No documents found</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 max-w-xs">No records belong to this firm or match your search criteria.</p>
    </div>

    <!-- Table content -->
    <div v-else class="flex-1 overflow-auto">
      <table class="w-full text-left border-collapse table-fixed min-w-full">
        <thead>
          <tr class="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            <!-- Expand spacer column for mobile/tablet chevrons -->
            <th class="px-3 py-2 sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 w-[42px] lg:hidden"></th>
            
            <!-- Document Name (Always visible) -->
            <th class="px-4 py-2 sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 w-[40%] sm:w-[25%] lg:w-[20%]" :aria-sort="sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'">
              <button @click="$emit('sort', 'name')" class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer border-0 bg-transparent font-bold text-left p-0 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded w-full">
                Document Name
                <UIcon 
                  :name="sortBy === 'name' ? (sortOrder === 'asc' ? 'i-heroicons-arrow-up-20-solid' : 'i-heroicons-arrow-down-20-solid') : 'i-heroicons-arrows-up-down-20-solid'" 
                  class="w-3.5 h-3.5 shrink-0" 
                  :class="sortBy === 'name' ? 'text-teal-600 dark:text-teal-400' : 'opacity-25'"
                />
              </button>
            </th>

            <!-- Reference Number (Hidden on mobile) -->
            <th class="hidden sm:table-cell px-4 py-2 sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 w-[20%] lg:w-[13%]" :aria-sort="sortBy === 'reference_number' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'">
              <button @click="$emit('sort', 'reference_number')" class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer border-0 bg-transparent font-bold text-left p-0 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded w-full">
                Ref Number
                <UIcon 
                  :name="sortBy === 'reference_number' ? (sortOrder === 'asc' ? 'i-heroicons-arrow-up-20-solid' : 'i-heroicons-arrow-down-20-solid') : 'i-heroicons-arrows-up-down-20-solid'" 
                  class="w-3.5 h-3.5 shrink-0" 
                  :class="sortBy === 'reference_number' ? 'text-teal-600 dark:text-teal-400' : 'opacity-25'"
                />
              </button>
            </th>

            <!-- Description (Hidden on mobile/tablet) -->
            <th class="hidden lg:table-cell px-4 py-2 sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 w-[22%]" :aria-sort="sortBy === 'description' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'">
              <button @click="$emit('sort', 'description')" class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer border-0 bg-transparent font-bold text-left p-0 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded w-full">
                Description
                <UIcon 
                  :name="sortBy === 'description' ? (sortOrder === 'asc' ? 'i-heroicons-arrow-up-20-solid' : 'i-heroicons-arrow-down-20-solid') : 'i-heroicons-arrows-up-down-20-solid'" 
                  class="w-3.5 h-3.5 shrink-0" 
                  :class="sortBy === 'description' ? 'text-teal-600 dark:text-teal-400' : 'opacity-25'"
                />
              </button>
            </th>

            <!-- Start Date (Hidden on mobile/tablet) -->
            <th class="hidden lg:table-cell px-4 py-2 sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 w-[11%]" :aria-sort="sortBy === 'start_date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'">
              <button @click="$emit('sort', 'start_date')" class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer border-0 bg-transparent font-bold text-left p-0 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded w-full">
                Start Date
                <UIcon 
                  :name="sortBy === 'start_date' ? (sortOrder === 'asc' ? 'i-heroicons-arrow-up-20-solid' : 'i-heroicons-arrow-down-20-solid') : 'i-heroicons-arrows-up-down-20-solid'" 
                  class="w-3.5 h-3.5 shrink-0" 
                  :class="sortBy === 'start_date' ? 'text-teal-600 dark:text-teal-400' : 'opacity-25'"
                />
              </button>
            </th>

            <!-- Expiry Date (Always visible) -->
            <th class="px-4 py-2 sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 w-[30%] sm:w-[20%] lg:w-[14%]" :aria-sort="sortBy === 'expiry_date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'">
              <button @click="$emit('sort', 'expiry_date')" class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer border-0 bg-transparent font-bold text-left p-0 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded w-full">
                Expiry Date
                <UIcon 
                  :name="sortBy === 'expiry_date' ? (sortOrder === 'asc' ? 'i-heroicons-arrow-up-20-solid' : 'i-heroicons-arrow-down-20-solid') : 'i-heroicons-arrows-up-down-20-solid'" 
                  class="w-3.5 h-3.5 shrink-0" 
                  :class="sortBy === 'expiry_date' ? 'text-teal-600 dark:text-teal-400' : 'opacity-25'"
                />
              </button>
            </th>

            <!-- Value (Hidden on mobile, right-aligned) -->
            <th class="hidden sm:table-cell px-4 py-2 sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 w-[15%] lg:w-[10%] text-right" :aria-sort="sortBy === 'value' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'">
              <button @click="$emit('sort', 'value')" class="flex items-center justify-end gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer border-0 bg-transparent font-bold text-right p-0 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded w-full">
                Value
                <UIcon 
                  :name="sortBy === 'value' ? (sortOrder === 'asc' ? 'i-heroicons-arrow-up-20-solid' : 'i-heroicons-arrow-down-20-solid') : 'i-heroicons-arrows-up-down-20-solid'" 
                  class="w-3.5 h-3.5 shrink-0" 
                  :class="sortBy === 'value' ? 'text-teal-600 dark:text-teal-400' : 'opacity-25'"
                />
              </button>
            </th>

            <!-- Status (Always visible) -->
            <th class="px-4 py-2 sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 w-[18%] sm:w-[12%] lg:w-[10%]" :aria-sort="sortBy === 'status' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'">
              <button @click="$emit('sort', 'status')" class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer border-0 bg-transparent font-bold text-left p-0 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded w-full">
                Status
                <UIcon 
                  :name="sortBy === 'status' ? (sortOrder === 'asc' ? 'i-heroicons-arrow-up-20-solid' : 'i-heroicons-arrow-down-20-solid') : 'i-heroicons-arrows-up-down-20-solid'" 
                  class="w-3.5 h-3.5 shrink-0" 
                  :class="sortBy === 'status' ? 'text-teal-600 dark:text-teal-400' : 'opacity-25'"
                />
              </button>
            </th>

            <!-- Actions (Always visible) -->
            <th class="px-4 py-2 sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 w-[12%] sm:w-[8%] lg:w-[10%] text-right">
              <span class="font-bold text-gray-400 dark:text-gray-500">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-850 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <template v-for="doc in documents" :key="doc.id">
            <tr 
              class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition odd:bg-white even:bg-gray-50/15 dark:odd:bg-gray-900 dark:even:bg-gray-900/30"
              :class="{'bg-teal-50/10 dark:bg-teal-950/10': expandedRowIds[doc.id]}"
            >
              <!-- Expand Chevron Column (Hidden on desktop) -->
              <td class="px-3 py-2.5 lg:hidden text-center">
                <button 
                  @click="toggleRow(doc.id)"
                  class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 rounded transition cursor-pointer flex items-center justify-center mx-auto focus:outline-none focus:ring-1 focus:ring-teal-500"
                  :title="expandedRowIds[doc.id] ? 'Collapse details' : 'Expand details'"
                  :aria-expanded="expandedRowIds[doc.id] ? 'true' : 'false'"
                >
                  <UIcon 
                    name="i-heroicons-chevron-right-20-solid" 
                    class="w-4 h-4 transition-transform duration-200"
                    :class="expandedRowIds[doc.id] ? 'rotate-90 text-teal-600 dark:text-teal-400' : ''"
                  />
                </button>
              </td>

              <!-- Name & File Indicator -->
              <td class="px-4 py-2.5 min-w-0 max-w-0" :class="{'bg-teal-50/5 dark:bg-teal-950/5': sortBy === 'name'}">
                <div class="flex items-center gap-2">
                  <span class="text-base shrink-0">📄</span>
                  <div class="min-w-0">
                    <p class="font-bold text-gray-900 dark:text-gray-100 truncate" :title="doc.name">{{ doc.name }}</p>
                    <p v-if="doc.file_name" class="text-[10px] text-gray-400 font-semibold truncate max-w-[130px] sm:max-w-[150px]" :title="doc.file_name">
                      📎 {{ doc.file_name }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Ref No (Hidden on mobile) -->
              <td class="hidden sm:table-cell px-4 py-2.5 text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400 max-w-0 truncate" :class="{'bg-teal-50/5 dark:bg-teal-950/5': sortBy === 'reference_number'}" :title="doc.reference_number">
                {{ doc.reference_number }}
              </td>

              <!-- Description (Hidden on mobile/tablet) -->
              <td class="hidden lg:table-cell px-4 py-2.5 text-gray-500 dark:text-gray-450 font-normal max-w-0 truncate" :class="{'bg-teal-50/5 dark:bg-teal-950/5': sortBy === 'description'}" :title="doc.description || ''">
                {{ doc.description || 'No description provided' }}
              </td>

              <!-- Start Date (Hidden on mobile/tablet) -->
              <td class="hidden lg:table-cell px-4 py-2.5 text-gray-500 dark:text-gray-450" :class="{'bg-teal-50/5 dark:bg-teal-950/5': sortBy === 'start_date'}">
                {{ formatDate(doc.start_date) }}
              </td>

              <!-- Expiry Date -->
              <td class="px-4 py-2.5" :class="{'bg-teal-50/5 dark:bg-teal-950/5': sortBy === 'expiry_date'}">
                <div class="space-y-0.5">
                  <p :class="[doc.extended_expiry_date ? 'text-gray-300 dark:text-gray-600 line-through text-[10px] font-normal' : 'font-semibold text-gray-800 dark:text-gray-250']">
                    {{ formatDate(doc.original_expiry_date) }}
                  </p>
                  <p v-if="doc.extended_expiry_date" class="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-0.5">
                    {{ formatDate(doc.extended_expiry_date) }}
                    <span class="text-[8px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 px-1 py-0.2 rounded font-black uppercase">Ext</span>
                  </p>
                </div>
              </td>

              <!-- Value (Hidden on mobile, right-aligned) -->
              <td class="hidden sm:table-cell px-4 py-2.5 font-bold text-gray-900 dark:text-gray-100 text-right" :class="{'bg-teal-50/5 dark:bg-teal-950/5': sortBy === 'value'}">
                {{ formatCurrency(doc.value) }}
              </td>

              <!-- Status Pill -->
              <td class="px-4 py-2.5" :class="{'bg-teal-50/5 dark:bg-teal-950/5': sortBy === 'status'}">
                <span 
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
                  :class="{
                    'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/50': doc.computed_status === 'Active',
                    'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100/50 dark:border-rose-900/50': doc.computed_status === 'Expired',
                    'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/50': doc.computed_status === 'Pending',
                    'bg-gray-50 dark:bg-gray-850 text-gray-600 dark:text-gray-400 border-gray-100/50 dark:border-gray-800': doc.computed_status === 'Closed'
                  }"
                >
                  {{ doc.computed_status || doc.status }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-2.5 text-right">
                <div class="flex justify-end gap-1">
                  <!-- View/Download File -->
                  <a 
                    v-if="doc.file_url"
                    :href="doc.file_url" 
                    target="_blank"
                    class="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded transition"
                    title="View uploaded file"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <!-- Edit Button -->
                  <button 
                    @click="$emit('edit', doc)"
                    class="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition cursor-pointer border-0 bg-transparent"
                    title="Edit Document"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <!-- Delete Button -->
                  <button 
                    @click="$emit('delete', doc.id)"
                    class="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition cursor-pointer border-0 bg-transparent"
                    title="Delete Document"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Expanded Sub-row details (mobile/tablet only) -->
            <tr v-if="expandedRowIds[doc.id]" class="bg-gray-50/30 dark:bg-gray-900/10 lg:hidden transition-all duration-300">
              <td colspan="100%" class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <!-- Mobile-only fields (reference number and value) -->
                  <div class="sm:hidden space-y-1">
                    <p class="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Reference Number</p>
                    <p class="font-mono font-bold text-gray-700 dark:text-gray-300 break-all">{{ doc.reference_number }}</p>
                  </div>
                  <div class="sm:hidden space-y-1">
                    <p class="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Value</p>
                    <p class="font-bold text-gray-950 dark:text-gray-100">{{ formatCurrency(doc.value) }}</p>
                  </div>
                  
                  <!-- Tablet/Mobile details (description and start date) -->
                  <div class="space-y-1 sm:col-span-2">
                    <p class="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Description</p>
                    <p class="font-normal text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{{ doc.description || 'No description provided' }}</p>
                  </div>
                  <div class="space-y-1">
                    <p class="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Start Date</p>
                    <p class="font-medium text-gray-700 dark:text-gray-300">{{ formatDate(doc.start_date) }}</p>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
