<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-scale-in">
       <header class="bg-gradient-to-r from-blue-700 to-indigo-800 px-8 py-6 text-white flex justify-between items-center">
          <div>
             <h2 class="text-2xl font-black uppercase tracking-tighter">Other Charges</h2>
             <p class="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Manage freight, packing, and additional costs</p>
          </div>
          <button @click="$emit('update:modelValue', false)" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
       </header>

       <div class="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div v-for="(charge, index) in otherCharges" :key="index" class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-4 group">
             <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="md:col-span-1">
                   <label class="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Charge Name</label>
                   <input type="text" v-model="charge.name" placeholder="e.g. Freight" class="w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold" />
                </div>
                <div>
                   <label class="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Amount (₹)</label>
                   <input type="number" step="any" v-model="charge.amount" class="w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-right" />
                </div>
                <div>
                   <label class="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">GST %</label>
                   <input type="number" step="any" v-model="charge.grate" class="w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-right" />
                </div>
             </div>
             <button @click="removeCharge(index)" class="mt-6 text-slate-300 hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
             </button>
          </div>

          <button @click="addCharge" class="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase text-xs tracking-widest hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
             + Add Another Charge Line
          </button>
       </div>

       <div class="p-8 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div class="flex flex-col">
             <span class="text-[10px] font-black text-slate-400 uppercase">Total Charges</span>
             <span class="text-xl font-black text-blue-900">₹{{ totalAmount.toLocaleString() }}</span>
          </div>
          <button @click="$emit('update:modelValue', false)" class="px-10 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all transform active:scale-95">
             Apply Charges
          </button>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  otherCharges: any[];
}>();

const emit = defineEmits(['update:modelValue']);

const totalAmount = computed(() => {
  return props.otherCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
});

function addCharge() {
  props.otherCharges.push({ name: '', amount: 0, grate: 18 });
}

function removeCharge(index: number) {
  props.otherCharges.splice(index, 1);
}
</script>
