<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <div>
        <button @click="$router.back()" class="text-blue-600 flex items-center text-sm font-bold mb-2 hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <h1 class="text-3xl font-bold text-gray-900">Account Ledger</h1>
        <div class="mt-4 flex items-center gap-4">
           <select v-model="accountHead" @change="updateHead" class="px-4 py-2 border-2 border-blue-500 rounded-xl font-bold text-sm bg-white outline-none focus:ring-4 focus:ring-blue-100">
              <option v-for="head in chartOfAccounts" :key="head._id" :value="head.account_name">{{ head.account_name }}</option>
           </select>
           <div class="bg-gray-100 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 uppercase tracking-widest border border-gray-200">
              {{ currentBalance.balanceType }} BALANCE: <span :class="currentBalance.balanceType === 'DR' ? 'text-emerald-600' : 'text-rose-600'" class="font-black font-mono">₹{{ currentBalance.balance.toLocaleString() }}</span>
           </div>
        </div>
      </div>
      <div class="flex space-x-3 items-end pb-1">
         <div class="flex flex-col">
            <label class="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">From</label>
            <input type="date" v-model="filters.fromDate" @change="loadLedger" class="px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
         </div>
         <div class="flex flex-col">
            <label class="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">To</label>
            <input type="date" v-model="filters.toDate" @change="loadLedger" class="px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
         </div>
         <button 
           @click="onExportPDF"
           :disabled="exportLoading || !accountHead"
           class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm h-[38px] flex items-center gap-1.5 transition-all disabled:opacity-50"
         >
           <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
           </svg>
           {{ exportLoading ? 'Exporting...' : 'Export PDF' }}
         </button>
      </div>
    </div>

    <!-- Ledger Entries -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <th class="px-6 py-4 font-semibold">Date</th>
              <th class="px-6 py-4 font-semibold">Voucher / Ref</th>
              <th class="px-6 py-4 font-semibold">Narration</th>
              <th class="px-6 py-4 font-semibold text-right">Debit (Dr)</th>
              <th class="px-6 py-4 font-semibold text-right">Credit (Cr)</th>
              <th class="px-6 py-4 font-semibold text-right">Running Bal</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm">
            <tr v-for="(entry, idx) in runningLedger" :key="idx" class="hover:bg-gray-50/50 transition-colors">
              <td class="px-6 py-4 text-gray-600 whitespace-nowrap">{{ entry.transactionDate }}</td>
              <td class="px-6 py-4">
                <div class="font-bold text-gray-900">{{ entry.voucherNo || entry.refType }}</div>
                <div class="text-[10px] text-gray-400 uppercase tracking-widest">{{ entry.voucherType }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="max-w-xs text-gray-700 leading-relaxed">{{ entry.narration }}</div>
              </td>
              <td class="px-6 py-4 text-right font-medium text-red-600">
                {{ entry.debitAmount > 0 ? '₹' + entry.debitAmount.toLocaleString() : '' }}
              </td>
              <td class="px-6 py-4 text-right font-medium text-green-600">
                {{ entry.creditAmount > 0 ? '₹' + entry.creditAmount.toLocaleString() : '' }}
              </td>
              <td class="px-6 py-4 text-right font-bold bg-gray-50/30">
                ₹{{ Math.abs(entry.runningBalance).toLocaleString() }} {{ entry.runningBalance >= 0 ? 'Dr' : 'Cr' }}
              </td>
            </tr>
            <tr v-if="ledgerEntries.length === 0">
              <td colspan="6" class="px-6 py-20 text-center text-gray-400 italic">No transactions found for this account in the selected range.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAccounting } from '../../composables/useAccounting';

const route = useRoute();
const { ledgerEntries, accountBalance, fetchLedger, fetchAccountBalance, fetchCOA, chartOfAccounts, exportLedgerPdf } = useAccounting();

const exportLoading = ref(false);
const onExportPDF = async () => {
  if (!accountHead.value) return;
  exportLoading.value = true;
  try {
    await exportLedgerPdf({
      accountHead: accountHead.value,
      fromDate: filters.fromDate,
      toDate: filters.toDate
    });
  } catch (err: any) {
    console.error('Failed to export PDF:', err);
  } finally {
    exportLoading.value = false;
  }
};

const accountHead = ref<string>('');
const filters = reactive({
  fromDate: '',
  toDate: new Date().toISOString().split('T')[0]
});

onMounted(() => {
  fetchCOA();
  if (route.query.head) {
    accountHead.value = route.query.head as string;
    loadLedger();
  }
});

async function updateHead() {
   loadLedger();
}

watch(() => route.query.head, (newHead) => {
  if (newHead) {
    accountHead.value = newHead as string;
    loadLedger();
  }
});

async function loadLedger() {
  await Promise.all([
    fetchLedger({ accountHead: accountHead.value, ...filters }),
    fetchAccountBalance(accountHead.value, filters.toDate)
  ]);
}

const currentBalance = computed(() => accountBalance.value);

const runningLedger = computed(() => {
  let bal = 0;
  // This is a simplification; for a true running balance we need the opening balance
  // of the account before filters.fromDate.
  return ledgerEntries.value.map(entry => {
    bal += (entry.debitAmount || 0) - (entry.creditAmount || 0);
    return { ...entry, runningBalance: bal };
  });
});
</script>
