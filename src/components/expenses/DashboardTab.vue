<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useExpenses } from '@/composables/useExpenses'

const {
  stats,
  expenses,
  registers,
  costCenters,
  fetchStats,
  fetchExpenses,
  fetchRegisters,
  fetchCostCenters,
  loading
} = useExpenses()

onMounted(async () => {
  await Promise.all([
    fetchStats(),
    fetchExpenses({ limit: 5 }),
    fetchRegisters(),
    fetchCostCenters()
  ])
})

const totalCash = computed(() => {
  return registers.value.reduce((sum, r) => sum + parseFloat(r.balance), 0)
})

// Cost Center wise Cash Breakup
const costCenterCashBreakdown = computed(() => {
  const breakdown: Record<string, { id: string, name: string, total: number }> = {}
  
  // Pre-initialize defined cost centers
  costCenters.value.forEach(cc => {
    breakdown[cc.id] = { id: cc.id, name: cc.name, total: 0 }
  })
  
  // Group registers balance by cost center
  registers.value.forEach(r => {
    if (r.cost_center_id) {
      if (!breakdown[r.cost_center_id]) {
        breakdown[r.cost_center_id] = { id: r.cost_center_id, name: r.cost_center_name || 'General', total: 0 }
      }
      breakdown[r.cost_center_id]!.total += parseFloat(r.balance)
    }
  })
  
  return Object.values(breakdown)
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
</script>

<template>
  <div class="flex-1 flex flex-col gap-5 pb-8">
    <!-- Top Cards (Monthly Spend & Cash Balance) -->
    <div class="grid grid-cols-2 gap-3.5">
      <!-- Spend Card -->
      <div class="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-4 rounded-3xl shadow-md flex flex-col justify-between h-28 relative overflow-hidden">
        <!-- Decoration Glass Circle -->
        <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-sm"></div>
        <div class="flex items-center gap-1.5 opacity-90">
          <UIcon name="i-heroicons-arrow-trending-up" class="w-4 h-4" />
          <span class="text-[9px] font-black uppercase tracking-widest">This Month</span>
        </div>
        <div>
          <h4 class="text-xs opacity-75 font-semibold uppercase leading-none">Total Spend</h4>
          <p class="text-xl font-black mt-1 leading-tight">{{ formatCurrency(stats?.monthlyTotal || 0) }}</p>
        </div>
      </div>

      <!-- Cash Balance Card -->
      <div class="bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-4 rounded-3xl shadow-md flex flex-col justify-between h-28 relative overflow-hidden">
        <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-sm"></div>
        <div class="flex items-center gap-1.5 opacity-90">
          <UIcon name="i-heroicons-wallet" class="w-4 h-4" />
          <span class="text-[9px] font-black uppercase tracking-widest">Cash Register</span>
        </div>
        <div>
          <h4 class="text-xs opacity-75 font-semibold uppercase leading-none">Cash Balance</h4>
          <p class="text-xl font-black mt-1 leading-tight">{{ formatCurrency(totalCash) }}</p>
        </div>
      </div>
    </div>

    <!-- Cost Center Cash Breakdown -->
    <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
      <div class="flex justify-between items-center">
        <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Cash by Cost Center
        </h3>
        <span class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Total: {{ formatCurrency(totalCash) }}
        </span>
      </div>
      
      <div v-if="costCenterCashBreakdown.length === 0" class="py-4 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
        <UIcon name="i-heroicons-wallet" class="w-8 h-8 stroke-1 mb-1" />
        <span class="text-[10px] font-black uppercase tracking-wider">No cash drawers set up</span>
      </div>
      
      <div v-else class="grid grid-cols-2 gap-3">
        <div 
          v-for="item in costCenterCashBreakdown" 
          :key="item.id" 
          class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100/50 dark:border-slate-850"
        >
          <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
            {{ item.name }}
          </span>
          <span 
            class="text-xs font-black mt-1 block leading-none"
            :class="item.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
          >
            {{ formatCurrency(item.total) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Category Breakdown (Enterprise Progress Bars) -->
    <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
      <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        Spend By Category
      </h3>
      
      <div v-if="!stats?.categoryBreakdown || stats.categoryBreakdown.length === 0" class="py-6 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
        <UIcon name="i-heroicons-chart-pie" class="w-10 h-10 stroke-1 mb-2" />
        <span class="text-xs font-black uppercase tracking-wider">No expenses logged yet</span>
      </div>

      <div v-else class="space-y-3.5">
        <div v-for="cat in stats.categoryBreakdown" :key="cat.name" class="space-y-1.5">
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-slate-700 dark:text-slate-200">{{ cat.name }}</span>
            <span class="font-black text-slate-950 dark:text-white">{{ formatCurrency(cat.total) }}</span>
          </div>
          <!-- Custom Premium Progress Bar -->
          <div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="getCategoryColor(cat.name)"
              :style="{ width: `${stats?.monthlyTotal ? (cat.total / stats.monthlyTotal) * 100 : 0}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Expenses List -->
    <div class="flex flex-col gap-3">
      <div class="flex justify-between items-center px-1">
        <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Recent Activity
        </h3>
      </div>

      <div v-if="expenses.length === 0" class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-8 flex flex-col items-center text-slate-400 dark:text-slate-600">
        <UIcon name="i-heroicons-queue-list" class="w-10 h-10 stroke-1 mb-2" />
        <span class="text-xs font-black uppercase tracking-wider">No recent transactions</span>
      </div>

      <div v-else class="space-y-2.5">
        <div
          v-for="exp in expenses"
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
                <span>•</span>
                <span class="text-indigo-600 dark:text-indigo-400">{{ exp.cost_center_name }}</span>
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
</template>
