<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">General Ledger</h1>
        <p class="text-gray-600 mt-1">Review account balances and financial transactions</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="showVoucherModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Voucher
        </button>
      </div>
    </div>

    <!-- Trial Balance Grid -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h2 class="font-semibold text-gray-800">Trial Balance</h2>
        <div class="flex items-center space-x-4">
           <input type="date" v-model="toDate" @change="fetchTrialBalance(toDate)" class="px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold border-b">Account Head</th>
              <th class="px-6 py-4 font-semibold border-b">Category</th>
              <th class="px-6 py-4 font-semibold border-b text-right">Debit (Dr)</th>
              <th class="px-6 py-4 font-semibold border-b text-right">Credit (Cr)</th>
              <th class="px-6 py-4 font-semibold border-b text-right">Net Balance</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="row in trialBalance" :key="row.accountHead" class="hover:bg-gray-50 transition-colors cursor-pointer" @click="viewLedger(row.accountHead)">
              <td class="px-6 py-4 font-medium text-blue-600 hover:underline">{{ row.accountHead }}</td>
              <td class="px-6 py-4 text-gray-500 text-sm">{{ formatCategory(row.accountType) }}</td>
              <td class="px-6 py-4 text-right text-gray-900">₹{{ row.totalDebit.toLocaleString() }}</td>
              <td class="px-6 py-4 text-right text-gray-900">₹{{ row.totalCredit.toLocaleString() }}</td>
              <td class="px-6 py-4 text-right">
                <span :class="row.balanceType === 'DR' ? 'text-red-600' : 'text-green-600'" class="font-bold">
                  ₹{{ row.balance.toLocaleString() }} {{ row.balanceType }}
                </span>
              </td>
            </tr>
            <tr v-if="trialBalance.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-gray-400">No accounting data found for this period.</td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-900 text-white font-bold">
            <tr>
              <td colspan="2" class="px-6 py-4">TOTAL</td>
              <td class="px-6 py-4 text-right">₹{{ totalDebit.toLocaleString() }}</td>
              <td class="px-6 py-4 text-right">₹{{ totalCredit.toLocaleString() }}</td>
              <td class="px-6 py-4 text-right">
                 <span :class="Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-green-400' : 'text-red-400'">
                   Diff: ₹{{ Math.abs(totalDebit - totalCredit).toFixed(2) }}
                 </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    
    <VoucherModal v-model="showVoucherModal" @saved="fetchTrialBalance(toDate)" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccounting } from '../../composables/useAccounting';
import VoucherModal from '../../components/accounting/VoucherModal.vue';

const router = useRouter();
const { trialBalance, fetchTrialBalance } = useAccounting();

const toDate = ref(new Date().toISOString().split('T')[0]);
const showVoucherModal = ref(false);

onMounted(() => {
  fetchTrialBalance(toDate.value);
});

const totalDebit = computed(() => trialBalance.value.reduce((sum, r) => sum + r.totalDebit, 0));
const totalCredit = computed(() => trialBalance.value.reduce((sum, r) => sum + r.totalCredit, 0));

function formatCategory(type: string) {
  return type.replace(/_/g, ' ');
}

function viewLedger(head: string) {
  router.push({ path: '/accounting/ledger-view', query: { head } });
}
</script>
