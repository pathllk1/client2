<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccounting } from '@/composables/useAccounting';

const router = useRouter();
const { trialBalance, fetchTrialBalance, loading, error } = useAccounting();

const fromDate = ref('');
const toDate = ref(new Date().toISOString().split('T')[0]);
const searchQuery = ref('');

const loadData = async () => {
  const params: { fromDate?: string; toDate?: string } = {};
  if (fromDate.value) params.fromDate = fromDate.value;
  if (toDate.value) params.toDate = toDate.value;
  await fetchTrialBalance(params);
};

const clearFilters = async () => {
  fromDate.value = '';
  toDate.value = new Date().toISOString().split('T')[0];
  searchQuery.value = '';
  await loadData();
};

const filteredAccounts = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return trialBalance.value;
  return trialBalance.value.filter(
    (a) =>
      a.accountHead.toLowerCase().includes(query) ||
      (a.accountType && a.accountType.toLowerCase().includes(query))
  );
});

const totalDebits = computed(() =>
  filteredAccounts.value.reduce((sum, a) => sum + (a.totalDebit || 0), 0)
);

const totalCredits = computed(() =>
  filteredAccounts.value.reduce((sum, a) => sum + (a.totalCredit || 0), 0)
);

const diff = computed(() => Math.abs(totalDebits.value - totalCredits.value));
const isBalanced = computed(() => diff.value < 0.01);

const formatINR = (n: number) => {
  return '₹ ' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
};

const viewLedger = (head: string) => {
  router.push({ path: '/accounting/ledger-view', query: { head } });
};

const triggerPrint = () => {
  window.print();
};

onMounted(loadData);
</script>

<template>
  <div class="p-4 max-w-[1600px] mx-auto space-y-4 print:p-0 print:space-y-3">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-0">
      <div class="space-y-0.5">
        <p class="text-[9px] font-black text-indigo-600 uppercase tracking-widest print:hidden">Accounting Reports</p>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Trial Balance</h1>
        <p class="text-xs text-slate-500 font-medium">Verify that total debits equal total credits</p>
        <p v-if="fromDate || toDate" class="text-xs text-indigo-600 font-bold hidden print:block">
          Period: {{ fromDate ? fromDate : 'Beginning' }} to {{ toDate }}
        </p>
      </div>
      <div class="flex items-center gap-2 print:hidden">
        <button 
          @click="router.push('/accounting/ledger')" 
          class="px-4 py-2 bg-white text-slate-900 border-2 border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          Dashboard
        </button>
        <button 
          @click="triggerPrint"
          class="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Print Report
        </button>
      </div>
    </header>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:hidden">
      <div class="flex-1 min-w-[240px]">
        <div class="relative">
          <span class="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search account heads..."
            class="w-full bg-slate-50 border-2 border-transparent rounded-xl pl-10 pr-3 py-2 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-xs"
          />
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] font-black uppercase text-slate-400">From</span>
        <input 
          v-model="fromDate" 
          type="date" 
          class="px-3 py-2 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-xs"
        />
        <span class="text-[10px] font-black uppercase text-slate-400">To</span>
        <input 
          v-model="toDate" 
          type="date" 
          class="px-3 py-2 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-xs"
        />
      </div>
      <div class="flex gap-1.5">
        <button 
          @click="loadData"
          class="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
        >
          Apply
        </button>
        <button 
          @click="clearFilters"
          class="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-center justify-between">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <p class="text-xs font-bold">{{ error }}</p>
      </div>
      <button @click="loadData" class="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-rose-700 transition-all">Retry</button>
    </div>

    <!-- KPI Ticker Strip -->
    <div v-if="!loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-all border-l-4 border-l-emerald-500">
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Debits</p>
        <p class="text-xl font-black text-emerald-600 tracking-tight font-mono mt-1">{{ formatINR(totalDebits) }}</p>
      </div>
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-all border-l-4 border-l-rose-500">
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Credits</p>
        <p class="text-xl font-black text-rose-600 tracking-tight font-mono mt-1">{{ formatINR(totalCredits) }}</p>
      </div>
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-all border-l-4" :class="isBalanced ? 'border-l-indigo-500' : 'border-l-amber-500'">
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Trial Balance Status</p>
        <div class="flex items-center gap-1.5 mt-1">
          <p class="text-xl font-black tracking-tight" :class="isBalanced ? 'text-indigo-600' : 'text-amber-600'">
            {{ isBalanced ? 'Balanced' : 'Imbalanced' }}
          </p>
          <svg v-if="isBalanced" class="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
        </div>
        <p v-if="!isBalanced" class="text-[10px] font-bold text-rose-500 mt-0.5">Difference: {{ formatINR(diff) }}</p>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:border-none print:shadow-none">
      <div v-if="loading" class="flex flex-col items-center justify-center py-10 gap-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading trial balance...</p>
      </div>
      <div v-else-if="filteredAccounts.length === 0" class="py-10 text-center space-y-2">
        <svg class="w-10 h-10 text-slate-200 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <p class="text-xs font-bold text-slate-500">No ledger heads found matching the criteria.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] print:bg-slate-100">
              <th class="px-5 py-2.5">Account Head</th>
              <th class="px-4 py-2.5">Category</th>
              <th class="px-4 py-2.5 text-right">Debits (DR)</th>
              <th class="px-4 py-2.5 text-right">Credits (CR)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 font-medium text-slate-700 text-xs">
            <tr 
              v-for="row in filteredAccounts" 
              :key="row.accountHead" 
              class="hover:bg-slate-50/50 transition-all cursor-pointer group print:hover:bg-transparent"
              @click="viewLedger(row.accountHead)"
            >
              <td class="px-5 py-2">
                <div class="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{{ row.accountHead }}</div>
              </td>
              <td class="px-4 py-2">
                <span class="inline-flex px-2 py-0.5 rounded-lg bg-slate-100 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  {{ row.accountType?.replace(/_/g, ' ') || 'GENERAL' }}
                </span>
              </td>
              <td class="px-4 py-2 text-right font-bold text-slate-600 font-mono">
                {{ row.totalDebit > 0 ? formatINR(row.totalDebit) : '—' }}
              </td>
              <td class="px-4 py-2 text-right font-bold text-slate-600 font-mono">
                {{ row.totalCredit > 0 ? formatINR(row.totalCredit) : '—' }}
              </td>
            </tr>
            <!-- Totals row -->
            <tr class="bg-slate-50/50 font-black border-t-2 border-slate-200 print:bg-slate-100">
              <td colspan="2" class="px-5 py-2.5 text-[9px] uppercase tracking-widest text-slate-700">Grand Totals</td>
              <td class="px-4 py-2.5 text-right font-mono text-emerald-600">
                {{ formatINR(totalDebits) }}
              </td>
              <td class="px-4 py-2.5 text-right font-mono text-rose-600">
                {{ formatINR(totalCredits) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  body {
    background: white !important;
    color: black !important;
  }
  .print\:hidden {
    display: none !important;
  }
  .print\:block {
    display: block !important;
  }
  .print\:shadow-none {
    box-shadow: none !important;
  }
  .print\:border-none {
    border: none !important;
  }
  .print\:p-0 {
    padding: 0 !important;
  }
  .print\:space-y-4 > :not([class*="hidden"]) ~ :not([class*="hidden"]) {
    margin-top: 1rem !important;
  }
}
</style>
