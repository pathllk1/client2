<template>
  <div class="p-6 max-w-[1600px] mx-auto space-y-8">
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
           <span class="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
           <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Master Data</span>
        </div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Stock Register</h1>
        <p class="text-sm text-slate-500 font-medium">Complete listing of all items and current balances</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="$router.back()" class="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
          Back
        </button>
        <button @click="showCreateModal = true" class="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Add New Stock
        </button>
      </div>
    </header>

    <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div class="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="relative group w-full sm:w-96">
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" v-model="searchQuery" placeholder="Search by name, HSN, or Part No..." class="pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-sm w-full" />
        </div>
        <div class="flex items-center gap-2">
           <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {{ filteredStocks.length }} SKUs</span>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <th class="px-8 py-5">Item Details</th>
              <th class="px-6 py-5">Part No / OEM</th>
              <th class="px-6 py-5 text-right">Quantity</th>
              <th class="px-6 py-5 text-right">Avg Rate</th>
              <th class="px-6 py-5 text-right">Total Value</th>
              <th class="px-8 py-5 text-center">Status</th>
              <th class="px-6 py-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <template v-for="stock in filteredStocks" :key="stock.id">
              <tr class="hover:bg-slate-50 transition-all cursor-pointer group" @click="toggleExpand(stock.id)">
                <td class="px-8 py-5">
                  <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <svg :class="{'rotate-180': expandedRows.has(stock.id)}" class="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                    </div>
                    <div>
                      <div class="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{{ stock.item }}</div>
                      <div class="text-[10px] text-slate-400 font-bold tracking-widest mt-0.5">HSN: {{ stock.hsn }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-5">
                  <div class="font-bold text-slate-700">{{ stock.pno || '—' }}</div>
                  <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{{ stock.oem || '—' }}</div>
                </td>
                <td class="px-6 py-5 text-right">
                  <div class="font-black text-slate-900">{{ stock.qty.toLocaleString() }} <span class="text-[10px] text-slate-400 ml-1">{{ stock.uom }}</span></div>
                  <div v-if="stock.batches?.length > 1" class="text-[9px] text-blue-500 font-black uppercase tracking-widest">{{ stock.batches.length }} Batches</div>
                </td>
                <td class="px-6 py-5 text-right">
                  <div class="font-bold text-slate-600">₹{{ stock.rate.toLocaleString() }}</div>
                </td>
                <td class="px-6 py-5 text-right">
                  <div class="font-black text-slate-900">₹{{ stock.total.toLocaleString() }}</div>
                </td>
                <td class="px-8 py-5 text-center">
                  <span :class="getStockHealthClass(stock.qty)" class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {{ getStockHealthLabel(stock.qty) }}
                  </span>
                </td>
                <td class="px-6 py-5 text-center" @click.stop>
                  <button @click="editStock(stock)" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Item">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                </td>
              </tr>
              <!-- Expanded Batch Details -->
              <tr v-if="expandedRows.has(stock.id)" class="bg-slate-50/50">
                <td colspan="7" class="px-12 py-6">
                  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Batch Inventory Breakdown</h4>
                      <button @click="viewHistory(stock)" class="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Full History →</button>
                    </div>
                    <table class="w-full text-left text-xs">
                      <thead>
                        <tr class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <th class="px-6 py-3">Batch Number</th>
                          <th class="px-6 py-3 text-right">Quantity</th>
                          <th class="px-6 py-3 text-right">Rate</th>
                          <th class="px-6 py-3 text-right">GST %</th>
                          <th class="px-6 py-3 text-right">MRP</th>
                          <th class="px-6 py-3">Expiry</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-50">
                        <tr v-for="batch in stock.batches" :key="batch._id" class="text-slate-600">
                          <td class="px-6 py-3 font-bold">{{ batch.batch || 'DEFAULT' }}</td>
                          <td class="px-6 py-3 text-right font-black text-slate-900">{{ batch.qty }} {{ batch.uom }}</td>
                          <td class="px-6 py-3 text-right">₹{{ batch.rate.toLocaleString() }}</td>
                          <td class="px-6 py-3 text-right">{{ batch.grate }}%</td>
                          <td class="px-6 py-3 text-right font-bold text-slate-700">{{ batch.mrp ? '₹' + batch.mrp.toLocaleString() : '—' }}</td>
                          <td class="px-6 py-3">{{ batch.expiry ? new Date(batch.expiry).toLocaleDateString('en-IN') : '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        
        <div v-if="filteredStocks.length === 0" class="p-20 text-center">
           <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
           </div>
           <h3 class="text-slate-400 font-black uppercase tracking-[0.2em]">No Items Found</h3>
        </div>
      </div>
    </div>

    <CreateStockModal v-model="showCreateModal" @saved="fetchStocks" />
    <EditStockModal v-model="showEditModal" :stock="selectedStock" @saved="fetchStocks" />
    <StockHistoryModal v-model="showHistoryModal" :stock="selectedStock" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useInventory } from '@/composables/useInventory';
import CreateStockModal from '@/components/inventory/CreateStockModal.vue';
import EditStockModal from '@/components/inventory/EditStockModal.vue';
import StockHistoryModal from '@/components/inventory/StockHistoryModal.vue';

const { stocks, fetchStocks } = useInventory();
const searchQuery = ref('');
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showHistoryModal = ref(false);
const selectedStock = ref<any>(null);
const expandedRows = ref(new Set<string>());

onMounted(fetchStocks);

const filteredStocks = computed(() => {
  if (!searchQuery.value) return stocks.value;
  const q = searchQuery.value.toLowerCase();
  return stocks.value.filter(s => 
    s.item.toLowerCase().includes(q) || 
    s.hsn.toLowerCase().includes(q) ||
    (s.pno && s.pno.toLowerCase().includes(q)) ||
    (s.oem && s.oem.toLowerCase().includes(q))
  );
});

function toggleExpand(id: string) {
  if (expandedRows.value.has(id)) {
    expandedRows.value.delete(id);
  } else {
    expandedRows.value.add(id);
  }
}

function getStockHealthClass(qty: number) {
  if (qty <= 0) return 'bg-rose-100 text-rose-600';
  if (qty <= 5) return 'bg-amber-100 text-amber-600';
  if (qty <= 20) return 'bg-blue-100 text-blue-600';
  return 'bg-emerald-100 text-emerald-600';
}

function getStockHealthLabel(qty: number) {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= 5) return 'Low Stock';
  if (qty <= 20) return 'Watchlist';
  return 'Healthy';
}

function viewHistory(stock: any) {
  selectedStock.value = stock;
  showHistoryModal.value = true;
}

function editStock(stock: any) {
  selectedStock.value = stock;
  showEditModal.value = true;
}
</script>
