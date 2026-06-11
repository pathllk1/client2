<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useExpenses } from '@/composables/useExpenses'

const {
  expenses,
  costCenters,
  stats,
  fetchCostCenters,
  fetchExpenses,
  fetchStats,
  loading
} = useExpenses()

const activeCcId = ref<string | null>(null)
const fromDate = ref('')
const toDate = ref('')

const loadFilteredExpenses = async () => {
  await fetchExpenses({
    limit: 1000,
    fromDate: fromDate.value || undefined,
    toDate: toDate.value || undefined
  })
}

onMounted(async () => {
  await Promise.all([
    fetchCostCenters(),
    loadFilteredExpenses(),
    fetchStats()
  ])
  if (costCenters.value.length > 0) {
    activeCcId.value = costCenters.value[0]?.id || null
  }
})

watch([fromDate, toDate], () => {
  loadFilteredExpenses()
})

// Calculate total spend and transactions per cost center
const costCenterStats = computed(() => {
  const map: Record<string, { total: number; count: number; categoryBreakdown: Record<string, number> }> = {}
  
  // Pre-initialize
  costCenters.value.forEach(cc => {
    map[cc.id] = { total: 0, count: 0, categoryBreakdown: {} }
  })
  
  // Group expenses
  expenses.value.forEach(exp => {
    const ccId = exp.cost_center_id
    if (!map[ccId]) {
      map[ccId] = { total: 0, count: 0, categoryBreakdown: {} }
    }
    const amt = parseFloat(exp.amount)
    map[ccId].total += amt
    map[ccId].count += 1
    
    const cat = exp.category_name || 'Uncategorized'
    map[ccId].categoryBreakdown[cat] = (map[ccId].categoryBreakdown[cat] || 0) + amt
  })
  
  return map
})

const formatCurrency = (val: number | string) => {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(num) ? '₹0.00' : `₹${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

const getCategoryColor = (name: string) => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colors = [
    'bg-violet-500', 'bg-emerald-500', 'bg-sky-500', 
    'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'
  ]
  return colors[hash % colors.length]
}

// Export specific cost center
const exportCostCenter = async (ccId: string, ccName: string) => {
  let dateSuffix = ''
  if (fromDate.value && toDate.value) {
    dateSuffix = `_from_${fromDate.value}_to_${toDate.value}`
  } else if (fromDate.value) {
    dateSuffix = `_from_${fromDate.value}`
  } else if (toDate.value) {
    dateSuffix = `_to_${toDate.value}`
  } else {
    dateSuffix = `_${new Date().toISOString().split('T')[0]}`
  }
  const filename = `Expenses_Report_${ccName.replace(/\s+/g, '_')}${dateSuffix}.xlsx`

  try {
    const { useApi } = await import('@/utils/api')
    const apiInstance = useApi()
    
    const queryParams: any = {
      costCenterId: ccId,
      fromDate: fromDate.value || undefined,
      toDate: toDate.value || undefined
    }
    
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

// Filtered expenses for active cost center
const activeCcExpenses = computed(() => {
  if (!activeCcId.value) return []
  return expenses.value.filter(exp => exp.cost_center_id === activeCcId.value)
})

// Filtered category breakdown for active cost center
const activeCcCategoryBreakdown = computed(() => {
  if (!activeCcId.value || !costCenterStats.value[activeCcId.value]) return []
  const breakdown = costCenterStats.value[activeCcId.value]?.categoryBreakdown || {}
  return Object.entries(breakdown)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
})

const getCategoryPercentage = (catTotal: number) => {
  if (!activeCcId.value) return 0
  const ccStats = costCenterStats.value[activeCcId.value]
  if (!ccStats || ccStats.total === 0) return 0
  return (catTotal / ccStats.total) * 100
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-4 pb-8">
    <div class="flex justify-between items-center px-1">
      <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        Cost Center Breakups
      </h3>
      <button 
        v-if="fromDate || toDate" 
        @click="fromDate = ''; toDate = ''"
        class="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors cursor-pointer"
      >
        Clear Dates
      </button>
    </div>

    <!-- Horizontal Scroll of Cost Center Badges -->
    <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
      <button
        v-for="cc in costCenters"
        :key="cc.id"
        @click="activeCcId = cc.id"
        class="px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all duration-200 snap-center cursor-pointer shrink-0 animate-fade-in"
        :class="[
          activeCcId === cc.id
            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
        ]"
      >
        {{ cc.name }}
      </button>
    </div>

    <!-- Date Range Filters -->
    <div class="grid grid-cols-2 gap-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-3xl shadow-sm">
      <div class="flex flex-col gap-1">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">From Date</label>
        <UInput
          type="date"
          v-model="fromDate"
          size="sm"
          icon="i-heroicons-calendar"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">To Date</label>
        <UInput
          type="date"
          v-model="toDate"
          size="sm"
          icon="i-heroicons-calendar"
          class="w-full"
        />
      </div>
    </div>

    <div v-if="!activeCcId" class="py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
      <UIcon name="i-heroicons-building-office" class="w-12 h-12 stroke-1 mb-2 animate-bounce" />
      <span class="text-xs font-black uppercase tracking-wider">No Cost Centers set up</span>
    </div>

    <div v-else class="flex flex-col gap-4">
      <!-- Cost Center Detail Card -->
      <div 
        v-for="cc in costCenters.filter(c => c.id === activeCcId)" 
        :key="cc.id"
        class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-4"
      >
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              {{ cc.name }}
            </h2>
            <p v-if="cc.description" class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase mt-0.5">
              {{ cc.description }}
            </p>
          </div>
          
          <button
            @click="exportCostCenter(cc.id, cc.name)"
            class="px-3.5 py-2 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm shadow-emerald-50/50"
            title="Export this Cost Center"
          >
            <UIcon name="i-heroicons-arrow-down-tray" class="w-3.5 h-3.5 stroke-[3]" />
            <span>Export</span>
          </button>
        </div>

        <!-- Metric Boxes -->
        <div class="grid grid-cols-2 gap-3.5 mt-1">
          <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100/50 dark:border-slate-850">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Spent</span>
            <span class="text-lg font-black text-slate-900 dark:text-white block mt-1 leading-none">
              {{ formatCurrency(costCenterStats[cc.id]?.total || 0) }}
            </span>
          </div>
          
          <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100/50 dark:border-slate-850">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Transactions</span>
            <span class="text-lg font-black text-slate-900 dark:text-white block mt-1 leading-none">
              {{ costCenterStats[cc.id]?.count || 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- Spend By Category (Specific to this Cost Center) -->
      <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
        <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Spend By Category
        </h3>
        
        <div v-if="activeCcCategoryBreakdown.length === 0" class="py-6 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
          <UIcon name="i-heroicons-chart-pie" class="w-10 h-10 stroke-1 mb-2 animate-pulse" />
          <span class="text-xs font-black uppercase tracking-wider">No category spend recorded</span>
        </div>

        <div v-else class="space-y-3.5">
          <div v-for="cat in activeCcCategoryBreakdown" :key="cat.name" class="space-y-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="font-bold text-slate-700 dark:text-slate-200">{{ cat.name }}</span>
              <span class="font-black text-slate-950 dark:text-white">{{ formatCurrency(cat.total) }}</span>
            </div>
            <!-- Custom Premium Progress Bar -->
            <div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700 animate-slide-in"
                :class="getCategoryColor(cat.name)"
                :style="{ width: `${getCategoryPercentage(cat.total)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Cost Center Transactions -->
      <div class="flex flex-col gap-3">
        <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
          Recent Activity
        </h3>

        <div v-if="activeCcExpenses.length === 0" class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-8 flex flex-col items-center text-slate-400 dark:text-slate-600">
          <UIcon name="i-heroicons-queue-list" class="w-10 h-10 stroke-1 mb-2" />
          <span class="text-xs font-black uppercase tracking-wider">No recent transactions</span>
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="exp in activeCcExpenses"
            :key="exp.id"
            class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm flex items-center justify-between transition-transform duration-200 active:scale-98"
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
                  <span>{{ formatDate(exp.expense_date) }}</span>
                  <span v-if="exp.project">•</span>
                  <span v-if="exp.project" class="text-emerald-600 dark:text-emerald-400">{{ exp.project }}</span>
                </div>
              </div>
            </div>
            <span class="font-black text-xs text-slate-900 dark:text-white">
              -{{ formatCurrency(exp.amount) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
