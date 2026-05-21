<template>
  <div v-if="modelValue" class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
    <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-in border border-slate-200">
      <!-- Header -->
      <div class="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
        <div class="flex items-center gap-5">
           <div class="w-14 h-14 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 ring-4 ring-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
           </div>
           <div>
              <h2 class="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Stock Browser</h2>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Inventory Management Hub</p>
           </div>
        </div>
        <button @click="$emit('update:modelValue', false)" class="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm group">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transform group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="px-8 pt-8 pb-4">
         <div class="relative group">
            <input 
              type="text" 
              v-model="search" 
              placeholder="Filter by Name, HSN, Part No or OEM..." 
              class="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-blue-600 focus:ring-8 focus:ring-blue-50 outline-none transition-all font-bold text-slate-800 placeholder-slate-300 shadow-inner"
              ref="searchInput"
            />
            <div class="absolute left-5 top-5 text-slate-300 group-focus-within:text-blue-600 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
            </div>
            <div class="absolute right-5 top-5 flex gap-2">
               <span class="px-2 py-1 bg-slate-200 text-slate-500 rounded font-mono text-[10px] font-bold">ESC to close</span>
            </div>
         </div>
      </div>

      <!-- Advanced Stock Grid -->
      <div class="flex-1 overflow-y-auto p-8 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 custom-scrollbar bg-slate-50/50">
         <div 
           v-for="stock in filteredStocks" 
           :key="stock._id" 
           class="bg-white border-2 border-transparent rounded-3xl p-5 hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-100 transition-all cursor-pointer group flex flex-col relative overflow-hidden active:scale-95"
           @click="selectStock(stock)"
         >
            <!-- Background Accent -->
            <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-600 transition-colors duration-500 opacity-20 group-hover:opacity-10"></div>
            
            <div class="flex items-start gap-4 mb-4 relative z-10">
               <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
               </div>
               <div class="min-w-0 flex-1">
                  <h3 class="font-black text-slate-900 text-base truncate leading-tight tracking-tight group-hover:text-blue-700 transition-colors">{{ stock.item }}</h3>
                  <div class="flex flex-wrap items-center gap-1.5 mt-2">
                     <span class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black rounded-lg uppercase tracking-widest border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100">{{ stock.hsn }}</span>
                     <span v-if="stock.pno" class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black rounded-lg uppercase tracking-widest border border-slate-200">{{ stock.pno }}</span>
                  </div>
               </div>
            </div>

            <div class="mt-auto grid grid-cols-2 gap-2 border-t border-slate-50 pt-4 relative z-10">
               <div class="bg-slate-50 group-hover:bg-blue-50/50 rounded-2xl p-3 transition-colors">
                  <span class="text-[8px] font-black uppercase text-slate-400 tracking-widest block mb-1">Available</span>
                  <div class="flex items-baseline gap-1">
                     <span class="text-xl font-black text-slate-900" :class="stock.qty <= 0 ? 'text-red-500 animate-pulse' : ''">{{ stock.qty.toLocaleString() }}</span>
                     <span class="text-[9px] font-black text-slate-400 uppercase">{{ stock.uom }}</span>
                  </div>
               </div>
               <div class="bg-slate-50 group-hover:bg-blue-50/50 rounded-2xl p-3 transition-colors text-right">
                  <span class="text-[8px] font-black uppercase text-slate-400 tracking-widest block mb-1">Avg. Rate</span>
                  <p class="font-mono font-black text-blue-600 text-sm mt-1">₹{{ stock.rate.toFixed(2) }}</p>
               </div>
            </div>

            <!-- Hover Action Overlay -->
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
               <div class="bg-blue-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                  + Add to Cart
               </div>
            </div>
         </div>
      </div>

      <!-- High-Fidelity Footer -->
      <div class="p-8 border-t border-slate-100 bg-white flex justify-between items-center">
         <button @click="$emit('create-stock')" class="group flex items-center gap-3 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white px-6 py-3 rounded-2xl transition-all duration-300">
            <div class="w-8 h-8 bg-white/50 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-sm">
               <span class="text-xl font-light">+</span>
            </div>
            <span class="text-xs font-black uppercase tracking-widest">Register New stock Item</span>
         </button>
         <div class="flex items-center gap-4 text-slate-400">
            <div class="text-right">
               <p class="text-[9px] font-black uppercase tracking-widest">Selected Warehouse</p>
               <p class="text-xs font-bold text-slate-600">Main Storage Unit — Mumbai</p>
            </div>
            <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
            </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  stocks: any[];
}>();

const emit = defineEmits(['update:modelValue', 'select', 'create-stock']);

const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    nextTick(() => searchInput.value?.focus());
  }
});

const filteredStocks = computed(() => {
  if (!search.value) return props.stocks;
  const q = search.value.toLowerCase();
  return props.stocks.filter(s => 
    s.item.toLowerCase().includes(q) || 
    s.hsn?.toLowerCase().includes(q) ||
    s.pno?.toLowerCase().includes(q) ||
    s.oem?.toLowerCase().includes(q)
  );
});

function selectStock(stock: any) {
  emit('select', stock);
}
</script>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
