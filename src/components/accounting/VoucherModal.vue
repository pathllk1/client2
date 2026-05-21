<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h2 class="text-2xl font-bold text-gray-800">Create Financial Voucher</h2>
        <button @click="$emit('update:modelValue', false)" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-8 overflow-y-auto flex-1 space-y-8">
        <!-- Top Metadata -->
        <div class="grid grid-cols-3 gap-6">
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Voucher Type</label>
            <select v-model="form.vtype" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="PAYMENT">Payment</option>
              <option value="RECEIPT">Receipt</option>
              <option value="JOURNAL">Journal</option>
              <option value="CONTRA">Contra</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Transaction Date</label>
            <input type="date" v-model="form.vdate" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
             <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Reference / Narration</label>
             <input type="text" v-model="form.narration" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="General narration..." />
          </div>
        </div>

        <!-- Ledger Lines -->
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-gray-700 uppercase text-xs tracking-wider">Accounting Entries</h3>
            <button @click="addLine" class="text-blue-600 text-sm font-bold hover:underline">+ Add Line</button>
          </div>
          
          <div class="space-y-3">
             <div v-for="(entry, index) in form.entries" :key="index" class="flex items-start space-x-3 group animate-fadeIn">
                <div class="flex-1">
                  <input type="text" v-model="entry.accountHead" placeholder="Account Head (e.g. Cash, Rent)" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div class="w-32">
                   <select v-model="entry.accountType" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm">
                      <option value="ASSET">Asset</option>
                      <option value="LIABILITY">Liability</option>
                      <option value="INCOME">Income</option>
                      <option value="EXPENSE">Expense</option>
                   </select>
                </div>
                <div class="w-32">
                   <input type="number" v-model="entry.debitAmount" placeholder="Debit" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-right font-medium text-red-600" />
                </div>
                <div class="w-32">
                   <input type="number" v-model="entry.creditAmount" placeholder="Credit" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-right font-medium text-green-600" />
                </div>
                <button @click="removeLine(index)" class="mt-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
             </div>
          </div>
        </div>

        <!-- Totals Footer -->
        <div class="bg-gray-900 rounded-2xl p-6 text-white flex justify-between items-center shadow-inner">
           <div class="flex space-x-12">
              <div>
                <p class="text-gray-400 text-xs uppercase font-bold mb-1">Total Debit</p>
                <p class="text-xl font-mono">₹{{ totalDebit.toFixed(2) }}</p>
              </div>
              <div>
                <p class="text-gray-400 text-xs uppercase font-bold mb-1">Total Credit</p>
                <p class="text-xl font-mono">₹{{ totalCredit.toFixed(2) }}</p>
              </div>
           </div>
           <div class="text-right">
              <p class="text-gray-400 text-xs uppercase font-bold mb-1">Balance Status</p>
              <p v-if="Math.abs(totalDebit - totalCredit) < 0.01" class="text-green-400 font-bold flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                 </svg>
                 BALANCED
              </p>
              <p v-else class="text-red-400 font-bold">UNBALANCED (Diff: ₹{{ Math.abs(totalDebit - totalCredit).toFixed(2) }})</p>
           </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4">
        <button
          @click="$emit('update:modelValue', false)"
          class="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
        >
          Discard
        </button>
        <button
          @click="submitVoucher"
          :disabled="!isBalanced || loading"
          class="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all transform active:scale-95"
        >
          Post Voucher
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useAccounting } from '../../composables/useAccounting';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const { createVoucher, loading } = useAccounting();

const form = reactive({
  vtype: 'JOURNAL',
  vdate: new Date().toISOString().split('T')[0],
  narration: '',
  entries: [
    { accountHead: '', accountType: 'ASSET', debitAmount: 0, creditAmount: 0 },
    { accountHead: '', accountType: 'LIABILITY', debitAmount: 0, creditAmount: 0 }
  ]
});

const totalDebit = computed(() => form.entries.reduce((sum, e) => sum + (parseFloat(e.debitAmount as any) || 0), 0));
const totalCredit = computed(() => form.entries.reduce((sum, e) => sum + (parseFloat(e.creditAmount as any) || 0), 0));
const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 0.01 && totalDebit.value > 0);

function addLine() {
  form.entries.push({ accountHead: '', accountType: 'EXPENSE', debitAmount: 0, creditAmount: 0 });
}

function removeLine(index: number) {
  form.entries.splice(index, 1);
  if (form.entries.length < 2) addLine();
}

async function submitVoucher() {
  try {
    const result = await createVoucher(form);
    if (result.success) {
      emit('saved');
      emit('update:modelValue', false);
      resetForm();
    }
  } catch (err: any) {
    alert(err.message || 'Failed to post voucher');
  }
}

function resetForm() {
  form.vtype = 'JOURNAL';
  form.narration = '';
  form.entries = [
    { accountHead: '', accountType: 'ASSET', debitAmount: 0, creditAmount: 0 },
    { accountHead: '', accountType: 'LIABILITY', debitAmount: 0, creditAmount: 0 }
  ];
}
</script>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
