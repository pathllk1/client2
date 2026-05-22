<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
    <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 animate-scale-in">
      <!-- Header -->
      <header class="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
           <h2 class="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Create Financial Voucher</h2>
           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Double-entry accounting record</p>
        </div>
        <button @click="$emit('update:modelValue', false)" class="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:text-slate-900 shadow-sm border border-slate-200 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <!-- Body -->
      <div class="p-8 overflow-y-auto flex-1 space-y-8">
        <!-- Top Metadata -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-2">
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Type</label>
            <select v-model="form.vtype" class="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-violet-500 outline-none transition-all font-black text-xs uppercase tracking-wider appearance-none">
              <option value="PAYMENT">Payment (Out)</option>
              <option value="RECEIPT">Receipt (In)</option>
              <option value="JOURNAL">Journal (Adjustment)</option>
              <option value="CONTRA">Contra (Internal)</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Date</label>
            <input type="date" v-model="form.vdate" class="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-violet-500 outline-none transition-all font-bold" />
          </div>
          <div class="space-y-2">
             <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">General Narration</label>
             <input type="text" v-model="form.narration" class="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-violet-500 outline-none transition-all font-bold placeholder:font-medium" placeholder="Record purpose..." />
          </div>
        </div>

        <!-- Ledger Lines -->
        <div class="space-y-4">
          <div class="flex justify-between items-center px-1">
            <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
               <span class="w-2 h-2 rounded-full bg-violet-500"></span>
               Accounting Entries
            </h3>
            <button @click="addLine" class="px-4 py-1.5 bg-violet-50 text-violet-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-100 transition-colors border border-violet-100">+ Add Entry</button>
          </div>
          
          <div class="space-y-3">
             <div v-for="(entry, index) in form.entries" :key="index" class="flex items-start gap-3 group animate-fadeIn">
                <div class="flex-1 relative">
                  <input type="text" v-model="entry.accountHead" 
                         list="coa-suggestions"
                         @change="handleHeadChange(entry)"
                         placeholder="Account Head (e.g. Cash, HDFC Bank)" 
                         class="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-violet-500 outline-none transition-all font-bold" />
                  <p v-if="entry.accountType" class="absolute -bottom-5 left-1 text-[8px] font-black text-slate-400 uppercase tracking-tighter">{{ entry.accountType }}</p>
                </div>
                <div class="w-32">
                   <select v-model="entry.accountType" class="w-full px-4 py-3 bg-slate-100 border-2 border-transparent rounded-2xl focus:bg-white focus:border-violet-500 outline-none transition-all font-black text-[10px] uppercase tracking-tighter appearance-none">
                      <option value="ASSET">Asset</option>
                      <option value="LIABILITY">Liability</option>
                      <option value="INCOME">Income</option>
                      <option value="EXPENSE">Expense</option>
                      <option value="BANK">Bank</option>
                   </select>
                </div>
                <div class="w-32">
                   <input type="number" v-model="entry.debitAmount" placeholder="Debit" 
                          class="w-full px-4 py-3 bg-rose-50/50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-rose-500 outline-none transition-all text-right font-black font-mono text-xs text-rose-600" />
                </div>
                <div class="w-32">
                   <input type="number" v-model="entry.creditAmount" placeholder="Credit" 
                          class="w-full px-4 py-3 bg-emerald-50/50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-right font-black font-mono text-xs text-emerald-600" />
                </div>
                <button @click="removeLine(index)" class="mt-3 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
             </div>
          </div>
        </div>

        <datalist id="coa-suggestions">
           <option v-for="head in chartOfAccounts" :key="head._id" :value="head.account_name">{{ head.account_type }}</option>
        </datalist>

        <!-- Totals Footer -->
        <div class="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden">
           <div class="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent pointer-events-none"></div>
           <div class="flex space-x-12 relative z-10">
              <div class="space-y-1">
                <p class="text-slate-400 text-[9px] uppercase font-black tracking-widest">Total Debit</p>
                <p class="text-2xl font-black font-mono text-rose-400">₹{{ totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</p>
              </div>
              <div class="w-px h-12 bg-slate-700 hidden md:block"></div>
              <div class="space-y-1">
                <p class="text-slate-400 text-[9px] uppercase font-black tracking-widest">Total Credit</p>
                <p class="text-2xl font-black font-mono text-emerald-400">₹{{ totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</p>
              </div>
           </div>
           <div class="text-right mt-6 md:mt-0 relative z-10">
              <p class="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">Double-Entry Status</p>
              <div v-if="Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0" class="flex items-center gap-2 text-emerald-400 font-black tracking-tight italic">
                 <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                 PERFECTLY BALANCED
              </div>
              <div v-else-if="totalDebit > 0 || totalCredit > 0" class="text-rose-400 font-black flex items-center gap-2 italic">
                 <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                 OUT OF SYNC: ₹{{ Math.abs(totalDebit - totalCredit).toLocaleString() }}
              </div>
              <p v-else class="text-slate-500 font-black uppercase text-xs">Waiting for entries...</p>
           </div>
        </div>
      </div>

      <!-- Actions -->
      <footer class="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 shrink-0">
        <button @click="$emit('update:modelValue', false)" class="px-8 py-3.5 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-colors">Discard Draft</button>
        <button @click="submitVoucher" :disabled="!isBalanced || loading" class="px-12 py-3.5 bg-violet-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-violet-200 hover:bg-violet-700 disabled:opacity-30 disabled:shadow-none transition-all transform active:scale-95 flex items-center gap-3">
          <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          Commit Voucher
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAccounting } from '../../composables/useAccounting';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const { createVoucher, loading, fetchCOA, chartOfAccounts } = useAccounting();

const form = reactive({
  vtype: 'JOURNAL',
  vdate: new Date().toISOString().split('T')[0],
  narration: '',
  entries: [
    { accountHead: '', accountType: 'ASSET', debitAmount: 0, creditAmount: 0 },
    { accountHead: '', accountType: 'LIABILITY', debitAmount: 0, creditAmount: 0 }
  ]
});

onMounted(() => {
  fetchCOA();
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

function handleHeadChange(entry: any) {
   const head = chartOfAccounts.value.find(h => h.account_name === entry.accountHead);
   if (head) {
      entry.accountType = head.account_type;
   }
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
.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
