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

      <!-- Advanced Stock Table (Compact) -->
      <div class="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar bg-slate-50/50">
         <div class="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <table class="w-full text-left border-collapse">
               <thead>
                  <tr class="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                     <th class="px-5 py-3.5">Item Description</th>
                     <th class="px-4 py-3.5">HSN</th>
                     <th class="px-4 py-3.5">Batch</th>
                     <th class="px-4 py-3.5">Expiry</th>
                     <th class="px-4 py-3.5 text-right">Available</th>
                     <th class="px-4 py-3.5 text-right">Rate</th>
                     <th class="px-4 py-3.5 text-right">GST %</th>
                     <th class="px-4 py-3.5 text-right">MRP</th>
                     <th class="px-5 py-3.5 text-center">Action</th>
                  </tr>
               </thead>
               <tbody class="divide-y divide-slate-100">
                  <template v-for="stock in filteredStocks" :key="stock._id">
                     <!-- Main Stock Item Row -->
                     <tr 
                       class="hover:bg-blue-50/20 transition-colors cursor-pointer group text-xs font-bold text-slate-700"
                       @click="toggleStock(stock)"
                     >
                        <td class="px-5 py-3.5">
                           <div class="font-black text-slate-900 text-sm leading-tight">{{ stock.item }}</div>
                           <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-semibold">
                              <span v-if="stock.pno">P/N: {{ stock.pno }}</span>
                              <span v-if="stock.pno && stock.oem" class="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span v-if="stock.oem">OEM: {{ stock.oem }}</span>
                           </div>
                        </td>
                        <td class="px-4 py-3.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">{{ stock.hsn }}</td>
                        <td class="px-4 py-3.5">
                           <div v-if="stock.batches && stock.batches.length > 1" class="flex items-center gap-1.5">
                              <span class="bg-indigo-50 text-indigo-700 border-indigo-100 px-2 py-0.5 border rounded-md text-[10px] font-black uppercase">
                                 {{ stock.batches.length }} Batches
                              </span>
                              <svg 
                                class="w-3.5 h-3.5 text-indigo-500 transition-transform duration-200"
                                :class="expandedStockId === stock._id ? 'rotate-180' : ''"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                              >
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                              </svg>
                           </div>
                           <span v-else-if="stock.batches && stock.batches.length === 1" class="bg-slate-50 text-slate-700 border-slate-100 px-2 py-0.5 border rounded-md text-[10px] font-black uppercase">
                              {{ stock.batches[0].batch || '-' }}
                           </span>
                           <span v-else class="text-slate-400">-</span>
                        </td>
                        <td class="px-4 py-3.5 text-slate-500 font-medium">
                           <span v-if="stock.batches && stock.batches.length > 1" class="text-slate-400 italic">Various</span>
                           <span v-else-if="stock.batches && stock.batches.length === 1">
                              {{ stock.batches[0].expiry ? formatDate(stock.batches[0].expiry) : '-' }}
                           </span>
                           <span v-else>-</span>
                        </td>
                        <td class="px-4 py-3.5 text-right">
                           <span class="text-sm font-black text-slate-900" :class="stock.qty <= 0 ? 'text-red-500 animate-pulse' : ''">{{ stock.qty.toLocaleString() }}</span>
                           <span class="text-[9px] font-black text-slate-400 uppercase ml-1">{{ stock.uom }}</span>
                        </td>
                        <td class="px-4 py-3.5 text-right font-mono text-slate-900">₹{{ stock.rate.toFixed(2) }}</td>
                        <td class="px-4 py-3.5 text-right text-slate-500 font-medium">{{ stock.grate }}%</td>
                        <td class="px-4 py-3.5 text-right font-mono text-slate-900">
                           <span v-if="stock.batches && stock.batches.length > 1" class="text-slate-400 italic">Various</span>
                           <span v-else-if="stock.batches && stock.batches.length === 1">
                              {{ stock.batches[0].mrp ? '₹' + stock.batches[0].mrp.toFixed(2) : '-' }}
                           </span>
                           <span v-else-if="stock.mrp">₹{{ stock.mrp.toFixed(2) }}</span>
                           <span v-else>-</span>
                        </td>
                        <td class="px-5 py-3.5 text-center">
                           <button 
                             class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                             :class="stock.batches && stock.batches.length > 1 
                               ? (expandedStockId === stock._id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white') 
                               : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white'"
                           >
                              {{ stock.batches && stock.batches.length > 1 ? (expandedStockId === stock._id ? 'Close' : 'Expand') : 'Select' }}
                           </button>
                        </td>
                     </tr>

                     <!-- Nested Batches Sub-Table Row -->
                     <tr v-if="expandedStockId === stock._id && stock.batches && stock.batches.length > 1" class="bg-slate-50/50">
                        <td colspan="9" class="px-8 py-4">
                           <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm max-w-4xl animate-scale-in">
                              <div class="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                                 <span class="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Select Batch for {{ stock.item }}</span>
                                 <span class="text-[9px] text-slate-400 font-bold uppercase">{{ stock.batches.length }} Batches Available</span>
                              </div>
                              <table class="w-full text-left text-xs border-collapse">
                                 <thead>
                                    <tr class="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                       <th class="px-4 py-2.5">Batch No</th>
                                       <th class="px-4 py-2.5">Expiry</th>
                                       <th class="px-4 py-2.5 text-right">Available Qty</th>
                                       <th class="px-4 py-2.5 text-right">Rate</th>
                                       <th class="px-4 py-2.5 text-right">GST %</th>
                                       <th class="px-4 py-2.5 text-right">MRP</th>
                                       <th class="px-4 py-2.5 text-center">Action</th>
                                    </tr>
                                 </thead>
                                 <tbody class="divide-y divide-slate-100 font-bold text-slate-600">
                                    <tr 
                                      v-for="batch in stock.batches" 
                                      :key="batch._id || batch.batch"
                                      class="hover:bg-blue-50/20 transition-colors cursor-pointer"
                                      @click.stop="selectRow(stock, batch)"
                                    >
                                       <td class="px-4 py-2">
                                          <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black uppercase">
                                             {{ batch.batch || '-' }}
                                          </span>
                                       </td>
                                       <td class="px-4 py-2 text-slate-500 font-medium">
                                          {{ batch.expiry ? formatDate(batch.expiry) : '-' }}
                                       </td>
                                       <td class="px-4 py-2 text-right text-slate-900">
                                          {{ batch.qty.toLocaleString() }} <span class="text-[9px] text-slate-400 uppercase ml-0.5">{{ batch.uom }}</span>
                                       </td>
                                       <td class="px-4 py-2 text-right text-slate-900 font-mono">₹{{ batch.rate.toFixed(2) }}</td>
                                       <td class="px-4 py-2 text-right text-slate-500 font-medium">{{ batch.grate }}%</td>
                                       <td class="px-4 py-2 text-right text-slate-900 font-mono">{{ batch.mrp ? '₹' + batch.mrp.toFixed(2) : '-' }}</td>
                                       <td class="px-4 py-2 text-center">
                                          <button class="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors">
                                             Select
                                          </button>
                                       </td>
                                    </tr>
                                 </tbody>
                              </table>
                           </div>
                        </td>
                     </tr>
                  </template>
                  <tr v-if="filteredStocks.length === 0">
                     <td colspan="9" class="px-5 py-12 text-center text-slate-400 font-black uppercase text-xs tracking-widest">
                        No stock items match your search
                     </td>
                  </tr>
               </tbody>
            </table>
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

const expandedStockId = ref<string | null>(null);

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    expandedStockId.value = null;
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

function toggleStock(stock: any) {
  if (stock.batches && stock.batches.length > 1) {
    expandedStockId.value = expandedStockId.value === stock._id ? null : stock._id;
  } else {
    // Select immediately with single batch or null
    selectRow(stock, stock.batches?.[0] || null);
  }
}

function selectRow(stock: any, batch: any) {
  const stockObj = {
    ...stock,
    selectedBatch: batch
  };
  emit('select', stockObj);
}

function formatDate(dateString: any) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
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
