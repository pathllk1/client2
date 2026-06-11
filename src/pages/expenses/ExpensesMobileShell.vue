<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardTab from '@/components/expenses/DashboardTab.vue'
import ListTab from '@/components/expenses/ListTab.vue'
import CostCentersTab from '@/components/expenses/CostCentersTab.vue'
import CashTab from '@/components/expenses/CashTab.vue'
import SettingsTab from '@/components/expenses/SettingsTab.vue'
import ExpenseSheet from '@/components/expenses/ExpenseSheet.vue'

// Tab switching
const activeTab = ref<'dashboard' | 'expenses' | 'costcenters' | 'cash' | 'settings'>('dashboard')

// Expense Sheet Modal Trigger
const showExpenseSheet = ref(false)
const selectedExpense = ref<any | null>(null)

// Refresh key to force reload tab components
const refreshKey = ref(0)

const triggerTabRefresh = () => {
  refreshKey.value++
}

const handleEditExpense = (expense: any) => {
  selectedExpense.value = expense
  showExpenseSheet.value = true
}

const handleNewExpenseClick = () => {
  selectedExpense.value = null
  showExpenseSheet.value = true
}

const handleExpenseSaved = () => {
  triggerTabRefresh()
}

const tabTitle = computed(() => {
  const map = {
    dashboard: 'My Cash Flow',
    expenses: 'Expenses Register',
    costcenters: 'Cost Center Breakups',
    cash: 'Cash Registers',
    settings: 'Settings'
  }
  return map[activeTab.value]
})
</script>

<template>
  <div class="w-full min-h-[calc(100vh-170px)] py-2 px-1 flex justify-center items-center bg-slate-100 dark:bg-slate-950">
    <!-- Simulating a premium smartphone screen shell on desktop screens, fullscreen on mobile -->
    <div class="w-full max-w-md bg-slate-50 dark:bg-slate-950 shadow-xl border border-slate-200/50 dark:border-slate-800 rounded-3xl h-[calc(100vh-200px)] max-h-[820px] min-h-[480px] flex flex-col relative overflow-hidden">
      <!-- Phone Status Bar Emulation -->
      <div class="h-6 px-5 flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-600 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-20">
        <span>Gemini Expenses</span>
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-wifi" class="w-3 h-3" />
          <UIcon name="i-heroicons-battery-50" class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- App Header -->
      <header class="px-5 py-3.5 flex justify-between items-center bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850/30 sticky top-6 z-20 shadow-sm shadow-slate-100/10">
        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-heroicons-arrow-left"
            size="sm"
            class="rounded-full md:hidden"
            @click="$router.push('/')"
          />
          <h1 class="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
            {{ tabTitle }}
          </h1>
        </div>
        <div class="p-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700">
          <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
      </header>

      <!-- Dynamic Tab Viewports -->
      <main class="flex-1 px-5 py-4 overflow-y-auto scrollbar-hide">
        <KeepAlive>
          <component
            :is="
              activeTab === 'dashboard' ? DashboardTab :
              activeTab === 'expenses' ? ListTab :
              activeTab === 'costcenters' ? CostCentersTab :
              activeTab === 'cash' ? CashTab : SettingsTab
            "
            :key="activeTab + '_' + refreshKey"
            @edit="handleEditExpense"
            @refresh-dashboard="triggerTabRefresh"
          />
        </KeepAlive>
      </main>

      <!-- Floating Action Button (FAB) (Optimized for right-thumb use on mobile screens) -->
      <button
        @click="handleNewExpenseClick"
        class="absolute bottom-20 right-5 z-10 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Add Expense"
      >
        <UIcon name="i-heroicons-plus" class="w-6 h-6 stroke-[3]" />
      </button>

      <!-- Bottom Navigation Bar Tabs -->
      <nav class="h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-850 grid grid-cols-5 items-center sticky bottom-0 z-20 shadow-lg">
        <!-- Dashboard Tab -->
        <button
          @click="activeTab = 'dashboard'"
          class="flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
          :class="activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'"
        >
          <UIcon :name="activeTab === 'dashboard' ? 'i-heroicons-home-solid' : 'i-heroicons-home'" class="w-5 h-5" />
          <span class="text-[8px] font-black uppercase tracking-wider">Home</span>
        </button>

        <!-- Expenses List Tab -->
        <button
          @click="activeTab = 'expenses'"
          class="flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
          :class="activeTab === 'expenses' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'"
        >
          <UIcon :name="activeTab === 'expenses' ? 'i-heroicons-list-bullet-solid' : 'i-heroicons-list-bullet'" class="w-5 h-5" />
          <span class="text-[8px] font-black uppercase tracking-wider">List</span>
        </button>

        <!-- Cost Centers Tab -->
        <button
          @click="activeTab = 'costcenters'"
          class="flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
          :class="activeTab === 'costcenters' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'"
        >
          <UIcon :name="activeTab === 'costcenters' ? 'i-heroicons-building-office-2-solid' : 'i-heroicons-building-office-2'" class="w-5 h-5" />
          <span class="text-[8px] font-black uppercase tracking-wider">Centers</span>
        </button>

        <!-- Cash Accounts Tab -->
        <button
          @click="activeTab = 'cash'"
          class="flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
          :class="activeTab === 'cash' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'"
        >
          <UIcon :name="activeTab === 'cash' ? 'i-heroicons-wallet-solid' : 'i-heroicons-wallet'" class="w-5 h-5" />
          <span class="text-[8px] font-black uppercase tracking-wider">Cash</span>
        </button>

        <!-- Settings Tab -->
        <button
          @click="activeTab = 'settings'"
          class="flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
          :class="activeTab === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'"
        >
          <UIcon :name="activeTab === 'settings' ? 'i-heroicons-cog-6-tooth-solid' : 'i-heroicons-cog-6-tooth'" class="w-5 h-5" />
          <span class="text-[8px] font-black uppercase tracking-wider">Settings</span>
        </button>
      </nav>

      <!-- Bottom Expense Form Sheet Modal (Moved Inside Phone Container) -->
      <ExpenseSheet
        v-model="showExpenseSheet"
        :expense="selectedExpense"
        @saved="handleExpenseSaved"
      />
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  scrollbar-width: none;
}
</style>
