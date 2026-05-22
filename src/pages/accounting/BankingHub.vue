<template>
  <div class="p-6 max-w-[1600px] mx-auto space-y-8">
    <!-- Header Section -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
           <span class="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
           <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Financial Treasury</span>
        </div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Banking Hub</h1>
        <p class="text-sm text-slate-500 font-medium">Manage firm bank accounts and monitor real-time treasury balances</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="openCreateModal" class="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Add Bank Account
        </button>
        <button @click="$router.push('/accounting/ledger')" class="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
        </button>
      </div>
    </header>

    <!-- KPI Strip -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
       <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Accounts</p>
          <div class="text-2xl font-black text-slate-900">{{ accounts.length }}</div>
       </div>
       <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Liquidity</p>
          <div class="text-2xl font-black text-emerald-600 font-mono">₹{{ totalLiquidity.toLocaleString() }}</div>
       </div>
       <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-violet-500">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Default Channel</p>
          <div class="text-sm font-black text-slate-900 truncate mt-2">{{ defaultAccount?.bank_name || 'Not Set' }}</div>
       </div>
       <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Linked COA Heads</p>
          <div class="text-2xl font-black text-slate-900">{{ accounts.length }}</div>
       </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
       <!-- Accounts List -->
       <div class="lg:col-span-2 space-y-4">
          <div v-for="acc in accountsWithBalances" :key="acc._id" class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
             <div class="flex flex-col md:flex-row justify-between gap-6">
                <div class="flex gap-6">
                   <div class="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                   </div>
                   <div>
                      <div class="flex items-center gap-3 mb-1">
                         <h3 class="text-xl font-black text-slate-900">{{ acc.account_name }}</h3>
                         <span v-if="acc.is_default" class="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-tighter">Primary</span>
                         <span class="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter" :class="acc.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'">{{ acc.status }}</span>
                      </div>
                      <p class="text-sm font-bold text-slate-500">{{ acc.bank_name }} <span class="text-slate-300 mx-2">|</span> {{ acc.branch_name }}</p>
                      <div class="grid grid-cols-2 gap-x-8 gap-y-1 mt-4">
                         <div>
                            <p class="text-[9px] font-black text-slate-400 uppercase">Account Number</p>
                            <p class="text-xs font-bold text-slate-700 font-mono">{{ acc.account_number }}</p>
                         </div>
                         <div>
                            <p class="text-[9px] font-black text-slate-400 uppercase">IFSC Code</p>
                            <p class="text-xs font-bold text-slate-700 font-mono">{{ acc.ifsc_code }}</p>
                         </div>
                      </div>
                   </div>
                </div>
                <div class="flex flex-col items-end justify-between min-w-[200px]">
                   <div class="text-right">
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Balance</p>
                      <div class="text-2xl font-black font-mono" :class="acc.balanceType === 'DR' ? 'text-emerald-600' : 'text-rose-600'">
                         ₹{{ acc.balance?.toLocaleString() || '0' }}
                         <span class="text-[10px] ml-1">{{ acc.balanceType }}</span>
                      </div>
                   </div>
                   <div class="flex gap-2">
                      <button @click="viewHistory(acc._id)" class="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Transaction History">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </button>
                      <button @click="openEditModal(acc)" class="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white transition-all">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button @click="confirmDelete(acc)" class="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                   </div>
                </div>
             </div>
          </div>

          <div v-if="accounts.length === 0" class="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 py-20 text-center">
             <div class="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6 text-slate-400">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
             </div>
             <h3 class="text-xl font-black text-slate-900 tracking-tight">No Bank Accounts Found</h3>
             <p class="text-slate-500 font-medium max-w-sm mx-auto mt-2">Create your first bank account to enable bank-based vouchers and professional invoice printing.</p>
             <button @click="openCreateModal" class="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Add First Account</button>
          </div>
       </div>

       <!-- Side Stats / Help -->
       <div class="space-y-8">
          <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
             <div class="relative z-10">
                <h3 class="text-xl font-black tracking-tight mb-2">Centralized Ledger</h3>
                <p class="text-sm text-blue-100 leading-relaxed font-medium">Every bank account added here is automatically mapped to your Chart of Accounts. All transactions across Wages, Sales, and Vouchers are strictly consistent.</p>
                <div class="mt-6 space-y-3">
                   <div class="flex items-center gap-3 text-xs font-bold text-blue-50">
                      <div class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</div>
                      Real-time aggregate balances
                   </div>
                   <div class="flex items-center gap-3 text-xs font-bold text-blue-50">
                      <div class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</div>
                      Unified transaction history
                   </div>
                   <div class="flex items-center gap-3 text-xs font-bold text-blue-50">
                      <div class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</div>
                      Automatic COA head generation
                   </div>
                </div>
             </div>
             <svg class="absolute -right-8 -bottom-8 w-40 h-40 text-white/10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.21 1.87 1.15 0 1.81-.58 1.81-1.39 0-2.34-4.57-1.18-4.57-4.26 0-1.5 1.04-2.67 2.67-3.07V5.86h2.67v1.9c1.3.2 2.63 1.14 2.86 3.01h-1.96c-.2-1.01-.73-1.63-1.89-1.63-1.14 0-1.65.61-1.65 1.34 0 2.2 4.57 1.05 4.57 4.21 0 1.63-1.07 2.66-2.73 3.09z"/></svg>
          </div>

          <!-- History Modal / Drawer placeholder -->
          <div v-if="selectedHistoryAcc" class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
             <div class="flex items-center justify-between mb-6">
                <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">Recent Activity</h3>
                <button @click="selectedHistoryAcc = null" class="text-slate-400 hover:text-slate-900">&times;</button>
             </div>
             <div v-if="historyLoading" class="flex justify-center py-10">
                <span class="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></span>
             </div>
             <div v-else-if="history.length" class="space-y-4">
                <div v-for="h in history" :key="h._id" class="flex items-start justify-between gap-4 pb-4 border-b border-slate-50 last:border-0">
                   <div>
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{{ h.transactionDate }}</p>
                      <p class="text-xs font-bold text-slate-900 line-clamp-1">{{ h.narration }}</p>
                   </div>
                   <p class="text-xs font-black font-mono whitespace-nowrap" :class="h.debitAmount > 0 ? 'text-emerald-600' : 'text-rose-600'">
                      {{ h.debitAmount > 0 ? '+' : '-' }} ₹{{ (h.debitAmount || h.creditAmount).toLocaleString() }}
                   </p>
                </div>
             </div>
             <p v-else class="text-xs text-slate-400 font-medium text-center py-6">No recent transactions</p>
          </div>
       </div>
    </div>

    <!-- Modal -->
    <BankingModal v-model="showModal" :edit-data="selectedAcc" @saved="fetchData" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/utils/api';
import BankingModal from '@/components/accounting/BankingModal.vue';

const accounts = ref<any[]>([]);
const balances = ref<Record<string, any>>({});
const history = ref<any[]>([]);
const historyLoading = ref(false);
const selectedHistoryAcc = ref<string | null>(null);

const showModal = ref(false);
const selectedAcc = ref<any>(null);

const fetchData = async () => {
  try {
    const res = await api.get('/banking');
    if (res.success) {
      accounts.value = res.data;
      // Fetch balances for each account
      await Promise.all(accounts.value.map(async (acc) => {
        const balRes = await api.get(`/banking/${acc._id}`);
        if (balRes.success) {
          balances.value[acc._id] = balRes.data;
        }
      }));
    }
  } catch (err) {
    console.error('Failed to fetch accounts', err);
  }
};

onMounted(fetchData);

const accountsWithBalances = computed(() => {
  return accounts.value.map(acc => ({
    ...acc,
    ...(balances.value[acc._id] || { balance: 0, balanceType: 'DR' })
  }));
});

const totalLiquidity = computed(() => {
  return accountsWithBalances.value.reduce((sum, acc) => {
    return acc.balanceType === 'DR' ? sum + acc.balance : sum - acc.balance;
  }, 0);
});

const defaultAccount = computed(() => accounts.value.find(a => a.is_default));

function openCreateModal() {
  selectedAcc.value = null;
  showModal.value = true;
}

function openEditModal(acc: any) {
  selectedAcc.value = acc;
  showModal.value = true;
}

async function viewHistory(id: string) {
  selectedHistoryAcc.value = id;
  historyLoading.value = true;
  try {
    const res = await api.get(`/banking/${id}/history`);
    if (res.success) {
      history.value = res.data;
    }
  } catch (err) {
    console.error('Failed to fetch history', err);
  } finally {
    historyLoading.value = false;
  }
}

async function confirmDelete(acc: any) {
  if (confirm(`Delete bank account "${acc.account_name}"? This action cannot be undone.`)) {
    try {
      const res = await api.delete(`/banking/${acc._id}`);
      if (res.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete account');
    }
  }
}
</script>
