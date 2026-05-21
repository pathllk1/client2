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
                <p class="text-[8px] font-black text-slate-400 uppercase">Net Diff</p>
                <p class="text-xs font-black font-mono" :class="Math.abs(totalDebit - totalCredit) < 0.1 ? 'text-emerald-600' : 'text-rose-600'">₹{{ (totalDebit - totalCredit).toLocaleString() }}</p>
             </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
             <div class="p-4 rounded-3xl bg-emerald-50 border border-emerald-100">
                <p class="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Receipts</p>
                <p class="text-sm font-black text-emerald-700 font-mono">₹{{ stats.receipts.toLocaleString() }}</p>
                <p class="text-[9px] font-bold text-emerald-500 mt-1 uppercase">Total In</p>
             </div>
             <div class="p-4 rounded-3xl bg-rose-50 border border-rose-100">
                <p class="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2">Payments</p>
                <p class="text-sm font-black text-rose-700 font-mono">₹{{ stats.payments.toLocaleString() }}</p>
                <p class="text-[9px] font-bold text-rose-500 mt-1 uppercase">Total Out</p>
             </div>
             <div class="p-4 rounded-3xl bg-blue-50 border border-blue-100">
                <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Vouchers</p>
                <p class="text-sm font-black text-blue-700 font-mono">{{ stats.vouchersCount }}</p>
                <p class="text-[9px] font-bold text-blue-500 mt-1 uppercase">Recent</p>
             </div>
             <div class="p-4 rounded-3xl bg-amber-50 border border-amber-100">
                <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Parties</p>
                <p class="text-sm font-black text-amber-700 font-mono">{{ parties.length }}</p>
                <p class="text-[9px] font-bold text-amber-500 mt-1 uppercase">Active</p>
             </div>
          </div>
          
          <div class="mt-8 space-y-4">
             <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Quick Workflows</h3>
             <button @click="$router.push('/accounting/parties')" class="w-full p-4 flex items-center gap-4 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 group">
                <div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></svg>
                </div>
                <div class="text-left">
                   <h4 class="text-sm font-black text-slate-900 tracking-tight">Parties Hub</h4>
                   <p class="text-[10px] text-slate-400 font-bold uppercase">Customer & Supplier Masters</p>
                </div>
             </button>
             <button @click="$router.push('/accounting/ledger-view')" class="w-full p-4 flex items-center gap-4 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 group">
                <div class="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div class="text-left">
                   <h4 class="text-sm font-black text-slate-900 tracking-tight">General Ledger</h4>
                   <p class="text-[10px] text-slate-400 font-bold uppercase">Full account reporting</p>
                </div>
             </button>
          </div>
       </div>

       <!-- Trial Balance & Account Heads -->
       <div class="lg:col-span-2 space-y-8">
          <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <div class="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 class="text-xl font-black text-slate-900 tracking-tight">Account Head Register</h2>
                  <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Trial balance and net exposure</p>
                </div>
                <div class="flex items-center gap-2">
                   <input type="date" v-model="toDate" @change="fetchTrialBalance(toDate)" class="px-4 py-2 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-sm" />
                </div>
             </div>
             <div class="overflow-x-auto">
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
                               {{ formatCategory(row.accountType) }}
                            </span>
                         </td>
                         <td class="px-6 py-5 text-right">
                            <div class="font-bold text-slate-600 font-mono">₹{{ row.totalDebit.toLocaleString() }}</div>
                         </td>
                         <td class="px-6 py-5 text-right">
                            <div class="font-bold text-slate-600 font-mono">₹{{ row.totalCredit.toLocaleString() }}</div>
                         </td>
                         <td class="px-8 py-5 text-right">
                            <div class="flex flex-col items-end">
                               <span :class="row.balanceType === 'DR' ? 'text-rose-600' : 'text-emerald-600'" class="font-black font-mono">
                                  ₹{{ row.balance.toLocaleString() }}
                               </span>
                               <span :class="row.balanceType === 'DR' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'" class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-0.5">
                                  {{ row.balanceType }}
                               </span>
                            </div>
                         </td>
                      </tr>
                   </tbody>
                   <tfoot class="bg-slate-900 text-white font-black">
                      <tr>
                         <td colspan="2" class="px-8 py-6 text-sm uppercase tracking-widest">Aggregate Totals</td>
                         <td class="px-6 py-6 text-right font-mono">₹{{ totalDebit.toLocaleString() }}</td>
                         <td class="px-6 py-6 text-right font-mono">₹{{ totalCredit.toLocaleString() }}</td>
                         <td class="px-8 py-6 text-right">
                            <div class="flex flex-col items-end">
                               <span :class="Math.abs(totalDebit - totalCredit) < 0.1 ? 'text-emerald-400' : 'text-rose-400'" class="text-sm font-mono">
                                  DIFF: ₹{{ Math.abs(totalDebit - totalCredit).toLocaleString() }}
                               </span>
                            </div>
                         </td>
                      </tr>
                   </tfoot>
                </table>
             </div>
          </div>
       </div>
    </div>

    <VoucherModal v-model="showVoucherModal" @saved="refreshData" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccounting } from '../../composables/useAccounting';
import { useBilling } from '../../composables/useBilling';
import VoucherModal from '../../components/accounting/VoucherModal.vue';

const router = useRouter();
const { trialBalance, fetchTrialBalance, fetchLedger, ledgerEntries } = useAccounting();
const { fetchBills, bills, fetchParties, parties } = useBilling();

const toDate = ref(new Date().toISOString().split('T')[0]);
const showVoucherModal = ref(false);

const refreshData = async () => {
  await Promise.all([
    fetchTrialBalance(toDate.value),
    fetchBills({ limit: 100 }),
    fetchParties()
  ]);
};

onMounted(refreshData);

const totalDebit = computed(() => trialBalance.value.reduce((sum, r) => sum + r.totalDebit, 0));
const totalCredit = computed(() => trialBalance.value.reduce((sum, r) => sum + r.totalCredit, 0));

const stats = computed(() => {
  const receipts = bills.value.filter(b => b.btype === 'SALES').reduce((sum, b) => sum + (b.netTotal || 0), 0);
  const payments = bills.value.filter(b => b.btype === 'PURCHASE').reduce((sum, b) => sum + (b.netTotal || 0), 0);
  return {
    receipts,
    payments,
    vouchersCount: bills.value.length
  };
});

const compactStats = computed(() => [
  { 
    label: 'Ledger Accounts', 
    value: trialBalance.value.length, 
    meta: 'Total account heads', 
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
    value: `₹${Math.abs(totalDebit.value - totalCredit.value).toLocaleString()}`, 
    meta: totalDebit.value >= totalCredit.value ? 'Debit Surplus' : 'Credit Surplus', 
    borderColor: 'border-violet-500',
    textColor: 'text-violet-600'
  },
  { 
    label: 'Sales Revenue', 
    value: `₹${stats.value.receipts.toLocaleString()}`, 
    meta: 'Invoiced this session', 
    borderColor: 'border-teal-500',
    textColor: 'text-teal-600'
  },
  { 
    label: 'Purchase Cost', 
    value: `₹${stats.value.payments.toLocaleString()}`, 
    meta: 'Vendor bills registered', 
    borderColor: 'border-amber-500',
    textColor: 'text-amber-600'
  }
]);

function formatCategory(type: string) {
  return type?.replace(/_/g, ' ') || 'GENERAL';
}

function viewLedger(head: string) {
  router.push({ path: '/accounting/ledger-view', query: { head } });
}
</script>
