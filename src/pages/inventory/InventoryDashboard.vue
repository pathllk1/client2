<template>
  <div class="p-6 max-w-[1600px] mx-auto space-y-8">
    <!-- Header Section -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
           <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
           <span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Live</span>
        </div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Inventory Intelligence</h1>
        <p class="text-sm text-slate-500 font-medium">Monitoring {{ stocks.length }} SKUs across your warehouses</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="refreshAll" class="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all border border-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button @click="$router.push('/accounting/sales/new')" class="px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          New Sale
        </button>
        <button @click="$router.push('/accounting/purchases/new')" class="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          New Purchase
        </button>
        <button @click="showCreateModal = true" class="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          New Stock
        </button>
      </div>
    </header>

    <!-- KPI Section -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <div v-for="kpi in kpis" :key="kpi.label" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
         <div class="flex items-center justify-between mb-4">
            <div :class="kpi.color" class="w-10 h-10 rounded-2xl flex items-center justify-center bg-opacity-10">
               <component :is="kpi.icon" class="w-5 h-5" />
            </div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ kpi.meta }}</span>
         </div>
         <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{{ kpi.label }}</p>
         <h3 class="text-2xl font-black text-slate-900 tracking-tight">{{ kpi.value }}</h3>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-8">
      <!-- Left Column: Stocks & Movements -->
      <div class="space-y-8">
        <!-- Stock Table -->
        <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div class="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-black text-slate-900 tracking-tight">Inventory Register</h2>
              <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time stock availability</p>
            </div>
            <div class="relative group">
              <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" v-model="stockSearch" placeholder="Filter items..." class="pl-12 pr-6 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-sm w-full sm:w-64" />
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th class="px-8 py-5">Item Details</th>
                  <th class="px-6 py-5">Part No</th>
                  <th class="px-6 py-5 text-right">Quantity</th>
                  <th class="px-6 py-5 text-right">Avg Rate</th>
                  <th class="px-6 py-5 text-right">Total Value</th>
                  <th class="px-8 py-5 text-center">Health</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="stock in filteredStocks.slice(0, 10)" :key="stock.id" class="hover:bg-slate-50/80 transition-all cursor-pointer group" @click="viewHistory(stock)">
                  <td class="px-8 py-5">
                    <div class="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{{ stock.item }}</div>
                    <div class="text-[10px] text-slate-400 font-bold tracking-widest mt-0.5">HSN: {{ stock.hsn }}</div>
                  </td>
                  <td class="px-6 py-5">
                    <div class="font-bold text-slate-700">{{ stock.pno || '—' }}</div>
                    <div v-if="stock.oem" class="text-[9px] text-slate-400 font-bold uppercase">{{ stock.oem }}</div>
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
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="filteredStocks.length > 10" class="p-4 bg-slate-50/50 text-center border-t border-slate-50">
             <button @click="$router.push('/inventory/stocks')" class="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700">View All {{ filteredStocks.length }} Items →</button>
          </div>
        </div>

        <!-- Recent Movements -->
        <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
           <div class="flex items-center justify-between mb-8">
              <div>
                <h2 class="text-xl font-black text-slate-900 tracking-tight">Stock Movement Feed</h2>
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Trace inward and outward transactions</p>
              </div>
              <button @click="$router.push('/inventory/movements')" class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Full Ledger</button>
           </div>
           <div class="space-y-4">
              <div v-for="move in movements.slice(0, 6)" :key="move.id" class="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100/50">
                 <div :class="move.type === 'SALE' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'" class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                    <svg v-if="move.type === 'SALE'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 17H17M17 17V7M17 17L7 7"/></svg>
                 </div>
                 <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                       <h4 class="font-black text-slate-900 truncate">{{ move.item }}</h4>
                       <span class="text-[10px] font-black text-slate-400 uppercase">{{ formatDate(move.createdAt) }}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                       <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ move.supply || 'INTERNAL' }}</span>
                       <span class="text-[10px] font-black" :class="move.type === 'SALE' ? 'text-rose-500' : 'text-emerald-500'">{{ move.type }}</span>
                    </div>
                 </div>
                 <div class="text-right">
                    <div class="font-black text-slate-900">{{ move.type === 'SALE' ? '-' : '+' }}{{ move.qty }}</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase">Balance: {{ move.qtyh }}</div>
                 </div>
              </div>
              <div v-if="movements.length === 0" class="py-12 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">No recent movements recorded</div>
           </div>
        </div>
      </div>

      <!-- Right Column: Recent Bills & Quick Links -->
      <div class="space-y-8">
        <!-- Quick Access -->
        <div class="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl">
           <h2 class="text-white font-black tracking-tight mb-6">Quick Actions</h2>
           <div class="grid grid-cols-2 gap-4">
              <button @click="$router.push('/accounting/parties')" class="p-4 rounded-3xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                 <div class="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                 </div>
                 <h4 class="text-white text-sm font-black tracking-tight">Parties Hub</h4>
                 <p class="text-[10px] text-slate-500 font-bold mt-1 uppercase">Manage Clients</p>
              </button>
              <button @click="$router.push('/inventory/stocks')" class="p-4 rounded-3xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                 <div class="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ClipboardDocumentListIcon class="w-5 h-5" />
                 </div>
                 <h4 class="text-white text-sm font-black tracking-tight">Stock Register</h4>
                 <p class="text-[10px] text-slate-500 font-bold mt-1 uppercase">Inventory List</p>
              </button>
              <button @click="$router.push('/inventory/reports')" class="p-4 rounded-3xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                 <div class="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                 </div>
                 <h4 class="text-white text-sm font-black tracking-tight">Reports</h4>
                 <p class="text-[10px] text-slate-500 font-bold mt-1 uppercase">Analysis</p>
              </button>
              <button @click="$router.push('/accounting/ledger')" class="p-4 rounded-3xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                 <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h18M7 15h1m4 0h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                 </div>
                 <h4 class="text-white text-sm font-black tracking-tight">General Ledger</h4>
                 <p class="text-[10px] text-slate-500 font-bold mt-1 uppercase">Accounting</p>
              </button>
              <button @click="showAdjustmentModal = true" class="p-4 rounded-3xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                 <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                 </div>
                 <h4 class="text-white text-sm font-black tracking-tight">Adjustment</h4>
                 <p class="text-[10px] text-slate-500 font-bold mt-1 uppercase">Stock Fix</p>
              </button>
              <button @click="$router.push('/accounting/bills')" class="p-4 rounded-3xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                 <div class="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <DocumentTextIcon class="w-5 h-5" />
                 </div>
                 <h4 class="text-white text-sm font-black tracking-tight">Invoices & Notes</h4>
                 <p class="text-[10px] text-slate-500 font-bold mt-1 uppercase">Billing Hub</p>
              </button>
           </div>
        </div>

        <!-- Recent Bills -->
        <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
           <div class="flex items-center justify-between mb-8">
              <div>
                <h2 class="text-xl font-black text-slate-900 tracking-tight">Recent Invoices</h2>
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Latest billing activity</p>
              </div>
              <button @click="$router.push('/accounting/bills')" class="text-[10px] font-black text-blue-600 uppercase tracking-widest">View All</button>
           </div>
           <div class="space-y-3">
              <div v-for="bill in bills.slice(0, 6)" :key="bill._id" class="flex items-center gap-4 p-4 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-all cursor-pointer" @click="$router.push('/accounting/bills')">
                 <div :class="bill.btype === 'SALES' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'" class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0">
                    {{ bill.btype === 'SALES' ? 'SLS' : 'PUR' }}
                 </div>
                 <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-black text-slate-900 truncate">{{ bill.partyName }}</h4>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{{ bill.bno }}</p>
                 </div>
                 <div class="text-right">
                    <div class="text-sm font-black text-slate-900">₹{{ bill.netTotal.toLocaleString() }}</div>
                    <div class="text-[10px] text-slate-400 font-bold uppercase">{{ formatDate(bill.bdate) }}</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>

    <StockHistoryModal v-model="showHistoryModal" :stock="selectedStock" />
    <CreateStockModal v-model="showCreateModal" @saved="fetchStocks" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useInventory } from '@/composables/useInventory';
import { useBilling } from '@/composables/useBilling';
import StockHistoryModal from '@/components/inventory/StockHistoryModal.vue';
import CreateStockModal from '@/components/inventory/CreateStockModal.vue';
import { 
  CubeIcon, 
  ExclamationTriangleIcon, 
  CurrencyRupeeIcon, 
  ArrowPathIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon
} from '@heroicons/vue/24/outline';

const { stocks, movements, fetchStocks, fetchMovements } = useInventory();
const { bills, fetchBills, fetchParties, parties } = useBilling();

const stockSearch = ref('');
const showAdjustmentModal = ref(false);
const showCreateModal = ref(false);
const showHistoryModal = ref(false);
const selectedStock = ref<any>(null);

const refreshAll = async () => {
  await Promise.all([
    fetchStocks(),
    fetchMovements({ limit: 50 }),
    fetchBills({ limit: 50 }),
    fetchParties()
  ]);
};

onMounted(refreshAll);

const filteredStocks = computed(() => {
  if (!stockSearch.value) return stocks.value;
  const query = stockSearch.value.toLowerCase();
  return stocks.value.filter(s => 
    s.item.toLowerCase().includes(query) || 
    s.hsn.toLowerCase().includes(query)
  );
});

const totalValue = computed(() => stocks.value.reduce((sum, s) => sum + s.total, 0));
const lowStockCount = computed(() => stocks.value.filter(s => s.qty > 0 && s.qty <= 5).length);
const outOfStockCount = computed(() => stocks.value.filter(s => s.qty <= 0).length);

const kpis = computed(() => [
  { label: 'Total Value', value: `₹${totalValue.value.toLocaleString()}`, icon: CurrencyRupeeIcon, color: 'text-emerald-500', meta: 'Asset' },
  { label: 'Live SKUs', value: stocks.value.length, icon: CubeIcon, color: 'text-blue-500', meta: 'Items' },
  { label: 'Low Stock', value: lowStockCount.value, icon: ExclamationTriangleIcon, color: 'text-amber-500', meta: 'Alerts' },
  { label: 'Out of Stock', value: outOfStockCount.value, icon: ExclamationTriangleIcon, color: 'text-rose-500', meta: 'Critical' },
  { label: 'Total Parties', value: parties.value.length, icon: UserGroupIcon, color: 'text-indigo-500', meta: 'Network' },
  { label: 'Active Bills', value: bills.value.length, icon: DocumentTextIcon, color: 'text-sky-500', meta: 'Registry' }
]);

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

function formatDate(date: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function viewHistory(stock: any) {
  selectedStock.value = stock;
  showHistoryModal.value = true;
}
</script>
