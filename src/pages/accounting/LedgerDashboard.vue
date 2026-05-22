<template>
  <div class="p-6 max-w-[1600px] mx-auto space-y-8">
    <!-- Header Section -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
           <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
           <span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Accounts Live</span>
        </div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Ledger & Financials</h1>
        <p class="text-sm text-slate-500 font-medium">Monitoring {{ trialBalance.length }} account heads</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden lg:flex items-center gap-4 mr-4">
           <div class="text-right">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Debit</p>
              <p class="text-sm font-black text-emerald-600 font-mono">₹{{ totalDebit.toLocaleString() }}</p>
           </div>
           <div class="w-px h-8 bg-slate-200"></div>
           <div class="text-right">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Credit</p>
              <p class="text-sm font-black text-rose-600 font-mono">₹{{ totalCredit.toLocaleString() }}</p>
           </div>
        </div>
        <button @click="showVoucherModal = true" class="px-6 py-3 bg-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          New Voucher
        </button>
        <button @click="$router.push('/accounting/bills')" class="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">
          Invoices
        </button>
        <button @click="refreshData" class="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
    </header>

    <!-- KPI Ticker Strip -->
    <div class="flex divide-x divide-slate-100 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
       <div v-for="stat in compactStats" :key="stat.label" class="flex-1 min-w-[200px] p-6 group hover:bg-slate-50 transition-all border-l-4" :class="stat.borderColor">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{{ stat.label }}</p>
          <div class="text-xl font-black text-slate-900 tracking-tight font-mono" :class="stat.textColor">{{ stat.value }}</div>
          <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">{{ stat.meta }}</p>
       </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
       <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div class="flex items-center justify-between mb-6">
             <div>
                <h2 class="text-xl font-black text-slate-900 tracking-tight">Account Type Mix</h2>
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Debit & Credit by Type</p>
             </div>
             <div class="flex items-center gap-3">
               <span class="flex items-center gap-1.5 text-[10px] font-black text-emerald-600"><span class="h-2 w-2 rounded-full bg-emerald-500"></span> DR</span>
               <span class="flex items-center gap-1.5 text-[10px] font-black text-rose-600"><span class="h-2 w-2 rounded-full bg-rose-500"></span> CR</span>
             </div>
          </div>
          <div class="h-[300px] relative">
             <canvas id="typeChart"></canvas>
          </div>
       </div>

       <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div class="mb-6">
             <h2 class="text-xl font-black text-slate-900 tracking-tight">Top Account Exposure</h2>
             <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Balance leaders</p>
          </div>
          <div class="h-[300px] relative">
             <canvas id="exposureChart"></canvas>
          </div>
       </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
       <!-- Voucher Pulse & Signals -->
       <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div class="flex items-center justify-between mb-8">
             <div>
                <h2 class="text-xl font-black text-slate-900 tracking-tight">Voucher Pulse</h2>
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Transaction signals</p>
             </div>
             <div class="px-3 py-1 bg-slate-100 rounded-xl text-right">
                <p class="text-[8px] font-black text-slate-400 uppercase">Net</p>
                <p class="text-xs font-black font-mono leading-tight">₹{{ (vouchersSummary.net_position || 0).toLocaleString() }}</p>
             </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
             <div class="p-4 rounded-3xl bg-emerald-50 border border-emerald-100">
                <p class="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Receipts</p>
                <p class="text-sm font-black text-emerald-700 font-mono">₹{{ (vouchersSummary.total_receipts || 0).toLocaleString() }}</p>
                <p class="text-[9px] font-bold text-emerald-500 mt-1 uppercase">Total In</p>
             </div>
             <div class="p-4 rounded-3xl bg-rose-50 border border-rose-100">
                <p class="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2">Payments</p>
                <p class="text-sm font-black text-rose-700 font-mono">₹{{ (vouchersSummary.total_payments || 0).toLocaleString() }}</p>
                <p class="text-[9px] font-bold text-rose-500 mt-1 uppercase">Total Out</p>
             </div>
             <div class="p-4 rounded-3xl bg-blue-50 border border-blue-100">
                <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Vouchers</p>
                <p class="text-sm font-black text-blue-700 font-mono">{{ vouchersSummary.recent_transactions_count || 0 }}</p>
                <p class="text-[9px] font-bold text-blue-500 mt-1 uppercase">Last 30 Days</p>
             </div>
             <div class="p-4 rounded-3xl bg-amber-50 border border-amber-100">
                <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Journals</p>
                <p class="text-sm font-black text-amber-700 font-mono">{{ journalSummary.recent_journal_entries_count || 0 }}</p>
                <p class="text-[9px] font-bold text-amber-500 mt-1 uppercase">Last 30 Days</p>
             </div>
          </div>
          
          <div class="mt-8 space-y-4">
             <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Quick Workflows</h3>
             <button @click="$router.push('/accounting/parties')" class="w-full p-4 flex items-center gap-4 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 group">
                <div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></svg>
                </div>
                <div class="text-left">
                   <h4 class="text-sm font-black text-slate-900 tracking-tight">Parties Hub</h4>
                   <p class="text-[10px] text-slate-400 font-bold uppercase">Customer & Supplier Masters</p>
                </div>
             </button>
             <button @click="$router.push('/accounting/ledger-view')" class="w-full p-4 flex items-center gap-4 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 group">
                <div class="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div class="text-left">
                   <h4 class="text-sm font-black text-slate-900 tracking-tight">General Ledger</h4>
                   <p class="text-[10px] text-slate-400 font-bold uppercase">Full account reporting</p>
                </div>
             </button>
             <button @click="$router.push('/accounting/banking')" class="w-full p-4 flex items-center gap-4 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 group">
                <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>
                <div class="text-left">
                   <h4 class="text-sm font-black text-slate-900 tracking-tight">Banking Hub</h4>
                   <p class="text-[10px] text-slate-400 font-bold uppercase">Manage Treasury & Bank A/Cs</p>
                </div>
             </button>
          </div>
       </div>

       <!-- Table Tabs -->
       <div class="lg:col-span-2 space-y-8">
          <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <div class="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 class="text-xl font-black text-slate-900 tracking-tight">{{ activeTab === 'heads' ? 'Account Head Register' : 'Account Type Summaries' }}</h2>
                  <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{{ activeTab === 'heads' ? 'Trial balance and net exposure' : 'Net balance per category' }}</p>
                </div>
                <div class="flex items-center gap-3">
                   <div class="inline-flex rounded-2xl bg-slate-100 p-1">
                      <button @click="activeTab = 'types'" :class="activeTab === 'types' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Types</button>
                      <button @click="activeTab = 'heads'" :class="activeTab === 'heads' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Heads</button>
                   </div>
                   <input type="date" v-model="toDate" @change="refreshData" class="px-4 py-2 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-sm" />
                </div>
             </div>
             
             <!-- Account Heads Table -->
             <div v-if="activeTab === 'heads'" class="overflow-x-auto">
                <table class="w-full text-left">
                   <thead>
                      <tr class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                         <th class="px-8 py-5">Account Head</th>
                         <th class="px-6 py-5">Category</th>
                         <th class="px-6 py-5 text-right">Debit</th>
                         <th class="px-6 py-5 text-right">Credit</th>
                         <th class="px-8 py-5 text-right">Net Balance</th>
                      </tr>
                   </thead>
                   <tbody class="divide-y divide-slate-50">
                      <tr v-for="row in trialBalance" :key="row.accountHead" class="hover:bg-slate-50/80 transition-all cursor-pointer group" @click="viewLedger(row.accountHead)">
                         <td class="px-8 py-5">
                            <div class="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{{ row.accountHead }}</div>
                         </td>
                         <td class="px-6 py-5">
                            <span class="inline-flex px-3 py-1 rounded-xl bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                               {{ row.accountType?.replace(/_/g, ' ') || 'GENERAL' }}
                            </span>
                         </td>
                         <td class="px-6 py-5 text-right font-bold text-slate-600 font-mono text-xs">₹{{ row.totalDebit.toLocaleString() }}</td>
                         <td class="px-6 py-5 text-right font-bold text-slate-600 font-mono text-xs">₹{{ row.totalCredit.toLocaleString() }}</td>
                         <td class="px-8 py-5 text-right">
                            <div class="flex flex-col items-end">
                               <span :class="row.balanceType === 'DR' ? 'text-emerald-600' : 'text-rose-600'" class="font-black font-mono text-sm">
                                  ₹{{ row.balance.toLocaleString() }}
                               </span>
                               <span :class="row.balanceType === 'DR' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'" class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-0.5">
                                  {{ row.balanceType }}
                               </span>
                            </div>
                         </td>
                      </tr>
                   </tbody>
                </table>
             </div>

             <!-- Account Types Table -->
             <div v-else class="overflow-x-auto">
                <table class="w-full text-left">
                   <thead>
                      <tr class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                         <th class="px-8 py-5">Account Type</th>
                         <th class="px-6 py-5 text-right">Accounts</th>
                         <th class="px-6 py-5 text-right">Total Debit</th>
                         <th class="px-6 py-5 text-right">Total Credit</th>
                         <th class="px-8 py-5 text-right">Net Balance</th>
                      </tr>
                   </thead>
                   <tbody class="divide-y divide-slate-50">
                      <tr v-for="type in accountTypeSummaries" :key="type.account_type" class="hover:bg-slate-50/80 transition-all cursor-pointer group" @click="drillDownType(type.account_type)">
                         <td class="px-8 py-5">
                            <div class="font-black text-slate-900 group-hover:text-violet-600 transition-colors uppercase tracking-tight">{{ type.account_type?.replace(/_/g, ' ') }}</div>
                         </td>
                         <td class="px-6 py-5 text-right font-bold text-slate-500 font-mono">{{ type.account_count }}</td>
                         <td class="px-6 py-5 text-right font-bold text-slate-600 font-mono text-xs">₹{{ type.total_debit.toLocaleString() }}</td>
                         <td class="px-6 py-5 text-right font-bold text-slate-600 font-mono text-xs">₹{{ type.total_credit.toLocaleString() }}</td>
                         <td class="px-8 py-5 text-right">
                            <div class="flex flex-col items-end">
                               <span :class="type.total_balance >= 0 ? 'text-emerald-600' : 'text-rose-600'" class="font-black font-mono text-sm">
                                  ₹{{ Math.abs(type.total_balance).toLocaleString() }}
                               </span>
                               <span :class="type.total_balance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'" class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-0.5">
                                  {{ type.total_balance >= 0 ? 'DR' : 'CR' }}
                               </span>
                            </div>
                         </td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </div>
       </div>
    </div>

    <!-- Sub-Ledger Modal -->
    <div v-if="showDrillModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showDrillModal = false">
       <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col animate-scale-in">
          <header class="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
             <div>
                <span class="text-[10px] font-black text-violet-600 uppercase tracking-widest">{{ drillType }}</span>
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Drill-Down: {{ drillType?.replace(/_/g, ' ') }}</h2>
             </div>
             <button @click="showDrillModal = false" class="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
          </header>
          <div class="flex-1 overflow-y-auto p-8">
             <table class="w-full text-left">
                <thead>
                   <tr class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <th class="pb-4">Account Head</th>
                      <th class="pb-4 text-right">Debits</th>
                      <th class="pb-4 text-right">Credits</th>
                      <th class="pb-4 text-right">Balance</th>
                   </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                   <tr v-for="h in drillAccounts" :key="h.accountHead" class="group hover:bg-slate-50 transition-all cursor-pointer" @click="viewLedger(h.accountHead)">
                      <td class="py-4">
                         <div class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{{ h.accountHead }}</div>
                      </td>
                      <td class="py-4 text-right font-mono text-xs text-emerald-600 font-bold">₹{{ h.totalDebit.toLocaleString() }}</td>
                      <td class="py-4 text-right font-mono text-xs text-rose-600 font-bold">₹{{ h.totalCredit.toLocaleString() }}</td>
                      <td class="py-4 text-right">
                         <div class="flex items-center justify-end gap-2">
                            <span class="font-black font-mono text-xs" :class="h.balanceType === 'DR' ? 'text-emerald-700' : 'text-rose-700'">₹{{ h.balance.toLocaleString() }}</span>
                            <span class="text-[8px] font-black px-1 py-0.5 rounded" :class="h.balanceType === 'DR' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">{{ h.balanceType }}</span>
                         </div>
                      </td>
                   </tr>
                </tbody>
             </table>
          </div>
       </div>
    </div>

    <VoucherModal v-model="showVoucherModal" @saved="refreshData" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAccounting } from '../../composables/useAccounting';
import VoucherModal from '../../components/accounting/VoucherModal.vue';
import Chart from 'chart.js/auto';

const router = useRouter();
const { 
  trialBalance, fetchTrialBalance, 
  vouchersSummary, fetchVouchersSummary, 
  journalSummary, fetchJournalSummary,
  accountTypeSummaries, fetchAccountTypeSummaries
} = useAccounting();

const toDate = ref(new Date().toISOString().split('T')[0]);
const showVoucherModal = ref(false);
const activeTab = ref('types');

// Drill-down State
const showDrillModal = ref(false);
const drillType = ref('');
const drillAccounts = computed(() => {
  return trialBalance.value.filter(a => a.accountType === drillType.value)
    .sort((a, b) => b.balance - a.balance);
});

let typeChart: Chart | null = null;
let exposureChart: Chart | null = null;

const refreshData = async () => {
  await Promise.all([
    fetchTrialBalance(toDate.value),
    fetchVouchersSummary(),
    fetchJournalSummary(),
    fetchAccountTypeSummaries(toDate.value)
  ]);
  renderCharts();
};

onMounted(refreshData);

const totalDebit = computed(() => trialBalance.value.reduce((sum, r) => sum + r.totalDebit, 0));
const totalCredit = computed(() => trialBalance.value.reduce((sum, r) => sum + r.totalCredit, 0));

const compactStats = computed(() => [
  { 
    label: 'Ledger Accounts', 
    value: trialBalance.value.length, 
    meta: `${accountTypeSummaries.value.length} account types`, 
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600'
  },
  { 
    label: 'Total Debit', 
    value: `₹${totalDebit.value.toLocaleString()}`, 
    meta: 'Total ledger exposure', 
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-600'
  },
  { 
    label: 'Total Credit', 
    value: `₹${totalCredit.value.toLocaleString()}`, 
    meta: 'Total liability pool', 
    borderColor: 'border-rose-500',
    textColor: 'text-rose-600'
  },
  { 
    label: 'Net Position', 
    value: `₹${Math.abs(totalDebit.value - totalCredit.value).toLocaleString()} ${totalDebit.value >= totalCredit.value ? 'DR' : 'CR'}`, 
    meta: 'Ledger-wide exposure', 
    borderColor: 'border-violet-500',
    textColor: 'text-violet-600'
  },
  { 
    label: 'Receipts', 
    value: `₹${(vouchersSummary.value.total_receipts || 0).toLocaleString()}`, 
    meta: `${vouchersSummary.value.recent_transactions_count || 0} recent transactions`, 
    borderColor: 'border-teal-500',
    textColor: 'text-teal-600'
  },
  { 
    label: 'Journal Entries', 
    value: (journalSummary.value.total_journal_entries || 0).toLocaleString(), 
    meta: `${journalSummary.value.recent_journal_entries_count || 0} in last 30 days`, 
    borderColor: 'border-amber-500',
    textColor: 'text-amber-600'
  }
]);

const renderCharts = async () => {
  await nextTick();
  
  // Type Chart
  const typeCtx = document.getElementById('typeChart') as HTMLCanvasElement;
  if (typeCtx) {
    if (typeChart) typeChart.destroy();
    typeChart = new Chart(typeCtx, {
      type: 'bar',
      data: {
        labels: accountTypeSummaries.value.map(t => t.account_type?.replace(/_/g, ' ')),
        datasets: [
          {
            label: 'Debit',
            data: accountTypeSummaries.value.map(t => t.total_debit),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 8
          },
          {
            label: 'Credit',
            data: accountTypeSummaries.value.map(t => t.total_credit),
            backgroundColor: 'rgba(244, 63, 94, 0.8)',
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'JetBrains Mono', size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 9 } } }
        }
      }
    });
  }

  // Exposure Chart
  const exposureCtx = document.getElementById('exposureChart') as HTMLCanvasElement;
  if (exposureCtx) {
    if (exposureChart) exposureChart.destroy();
    const sorted = [...trialBalance.value].sort((a, b) => b.balance - a.balance).slice(0, 8);
    exposureChart = new Chart(exposureCtx, {
      type: 'bar',
      data: {
        labels: sorted.map(a => a.accountHead),
        datasets: [{
          data: sorted.map(a => a.balance),
          backgroundColor: sorted.map(a => a.balanceType === 'DR' ? 'rgba(37, 99, 235, 0.8)' : 'rgba(219, 39, 119, 0.8)'),
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'JetBrains Mono', size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 10 } } }
        }
      }
    });
  }
};

function drillDownType(type: string) {
  drillType.value = type;
  showDrillModal.value = true;
}

function viewLedger(head: string) {
  router.push({ path: '/accounting/ledger-view', query: { head } });
}
</script>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
