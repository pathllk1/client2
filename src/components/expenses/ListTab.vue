<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useExpenses } from '@/composables/useExpenses'

const emit = defineEmits(['edit', 'refresh-dashboard'])

const {
  expenses,
  categories,
  costCenters,
  projects,
  fetchExpenses,
  fetchCategories,
  fetchCostCenters,
  fetchRecentProjects,
  deleteExpense
} = useExpenses()

const filters = reactive({
  categoryId: '',
  costCenterId: '',
  project: '',
  search: ''
})

const showFilters = ref(false)

const blurActiveInput = () => {
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

const loadData = async () => {
  await Promise.all([
    fetchExpenses(filters),
    fetchCategories(),
    fetchCostCenters(),
    fetchRecentProjects()
  ])
}

onMounted(() => {
  loadData()
})

// Trigger reload on filter updates
watch(filters, () => {
  fetchExpenses(filters)
})

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this expense?')) return
  const res = await deleteExpense(id)
  if (res.success) {
    loadData()
    emit('refresh-dashboard')
  } else {
    alert(res.message || 'Deletion failed')
  }
}

const exportToExcel = async () => {
  if (expenses.value.length === 0) {
    alert('No expenses to export')
    return
  }

  const dateStr = new Date().toISOString().split('T')[0]
  const selectedCostCenter = filters.costCenterId
    ? costCenters.value.find(c => c.id === filters.costCenterId)
    : null

  let filename = `Expenses_Report_${dateStr}.xlsx`
  if (selectedCostCenter) {
    filename = `Expenses_Report_${selectedCostCenter.name.replace(/\s+/g, '_')}_${dateStr}.xlsx`
  }

  try {
    const { useApi } = await import('@/utils/api')
    const apiInstance = useApi()
    const queryParams: any = {}
    if (filters.categoryId) queryParams.categoryId = filters.categoryId
    if (filters.costCenterId) queryParams.costCenterId = filters.costCenterId
    if (filters.project) queryParams.project = filters.project
    if (filters.search) queryParams.search = filters.search

    const blob = await apiInstance.get('/expenses/export', { params: queryParams, responseType: 'blob' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (err: any) {
    alert('Export failed: ' + err.message)
  }
}

const formatCurrency = (val: string | number) => {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(num) ? '₹0.00' : `₹${num.toFixed(2)}`
}

const formatFullDate = (iso: string) => {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const getCategoryColor = (name: string) => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colors = [
    'bg-violet-500', 'bg-emerald-500', 'bg-sky-500', 
    'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'
  ]
  return colors[hash % colors.length]
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <!-- Search Bar & Filter Toggle -->
    <div class="flex gap-2 items-center">
      <div class="flex-1 relative">
        <UInput
          v-model="filters.search"
          placeholder="Search expenses..."
          icon="i-heroicons-magnifying-glass"
          size="md"
          class="w-full"
        />
      </div>
      <button
        @click="exportToExcel"
        class="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all cursor-pointer"
        title="Export to Excel"
      >
        <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5" />
      </button>
      <button
        @click="showFilters = !showFilters"
        class="p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer"
        :class="[
          showFilters || filters.categoryId || filters.costCenterId || filters.project
            ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 border-indigo-200/50 dark:border-indigo-900/50'
            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
        ]"
      >
        <UIcon name="i-heroicons-funnel" class="w-5 h-5" />
      </button>
    </div>

    <!-- Collapsible Filters Box (Mobile-first Layout) -->
    <div
      v-if="showFilters"
      class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl flex flex-col gap-3 shadow-sm"
    >
      <div class="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Filters</span>
        <button
          @click="Object.assign(filters, { categoryId: '', costCenterId: '', project: '', search: '' })"
          class="text-[9px] font-black uppercase tracking-widest text-red-500"
        >
          Clear All
        </button>
      </div>

      <!-- Category Filter -->
      <div class="flex flex-col gap-1">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Category</label>
        <USelect
          v-model="filters.categoryId"
          :items="[
            { label: 'All Categories', value: '' },
            ...categories.map(c => ({ label: c.name, value: c.id }))
          ]"
          size="sm"
          @click="blurActiveInput"
        />
      </div>

      <!-- Cost Center Filter -->
      <div class="flex flex-col gap-1">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Cost Center</label>
        <USelect
          v-model="filters.costCenterId"
          :items="[
            { label: 'All Cost Centers', value: '' },
            ...costCenters.map(cc => ({ label: cc.name, value: cc.id }))
          ]"
          size="sm"
          @click="blurActiveInput"
        />
      </div>

      <!-- Project Filter -->
      <div class="flex flex-col gap-1">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Project</label>
        <USelect
          v-model="filters.project"
          :items="[
            { label: 'All Projects', value: '' },
            ...projects.map(p => ({ label: p, value: p }))
          ]"
          size="sm"
          @click="blurActiveInput"
        />
      </div>
    </div>

    <!-- Expenses List -->
    <div class="flex-1 flex flex-col gap-3 pb-8">
      <div v-if="expenses.length === 0" class="py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
        <UIcon name="i-heroicons-face-frown" class="w-12 h-12 stroke-1 mb-2" />
        <span class="text-xs font-black uppercase tracking-wider">No matching expenses found</span>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="exp in expenses"
          :key="exp.id"
          class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm flex items-center justify-between transition-all"
        >
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl text-white flex items-center justify-center shadow-sm" :class="getCategoryColor(exp.category_name)">
              <UIcon name="i-heroicons-tag" class="w-4 h-4" />
            </div>
            <div>
              <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-1.5">
                <span>{{ exp.description || exp.category_name }}</span>
                <span v-if="exp.paid_to_received_from" class="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  ({{ exp.paid_to_received_from }})
                </span>
              </h4>
              <div class="flex items-center gap-2 mt-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                <span>{{ formatFullDate(exp.expense_date) }}</span>
                <span>•</span>
                <span class="text-indigo-600 dark:text-indigo-400">{{ exp.cost_center_name }}</span>
                <span v-if="exp.project">•</span>
                <span v-if="exp.project" class="text-emerald-600 dark:text-emerald-400">{{ exp.project }}</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="text-right">
              <span class="font-black text-xs text-slate-900 dark:text-white block">
                -{{ formatCurrency(exp.amount) }}
              </span>
              <span class="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {{ exp.payment_mode === 'CASH' && exp.cash_register_name ? `CASH (${exp.cash_register_name})` : exp.payment_mode }}
              </span>
            </div>

            <!-- Action Buttons for Mobile Tap -->
            <div class="flex gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-2">
              <UButton
                size="xs"
                variant="ghost"
                color="primary"
                icon="i-heroicons-pencil-square"
                class="rounded-full"
                @click="emit('edit', exp)"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-heroicons-trash"
                class="rounded-full"
                @click="handleDelete(exp.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
