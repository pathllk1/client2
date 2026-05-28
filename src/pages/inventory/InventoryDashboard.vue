<template>
  <div class="p-4 py-3 w-full mx-auto space-y-3">
    <!-- Header Section -->
    <div class="flex justify-between items-center mb-2">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-primary/10 rounded-xl">
          <UIcon name="i-heroicons-chart-bar-square" class="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 class="text-xl font-black tracking-tight uppercase text-gray-900 dark:text-white leading-none">Inventory Intelligence</h1>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Monitoring {{ stocks.length }} SKUs across your warehouses</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-path"
          size="sm"
          class="h-8 w-8 flex items-center justify-center p-0"
          @click="refreshAll"
          title="Refresh Dashboard"
        />
        <UButton
          color="error"
          icon="i-heroicons-plus"
          size="sm"
          label="New Sale"
          class="font-semibold text-xs h-8"
          @click="$router.push('/accounting/sales/new')"
        />
        <UButton
          color="success"
          icon="i-heroicons-plus"
          size="sm"
          label="New Purchase"
          class="font-semibold text-xs h-8"
          @click="$router.push('/accounting/purchases/new')"
        />
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          size="sm"
          label="New Stock"
          class="font-semibold text-xs h-8"
          @click="showCreateModal = true"
        />
      </div>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
      <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-primary" />
      <p class="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Loading dashboard...</p>
    </div>

    <template v-else>
      <!-- KPI Section -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <div v-for="kpi in kpis" :key="kpi.label" class="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group">
           <div class="flex items-center justify-between mb-2">
              <div :class="kpi.color" class="w-8 h-8 rounded-lg flex items-center justify-center">
                 <UIcon :name="kpi.icon" class="w-4.5 h-4.5" />
              </div>
              <span class="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{{ kpi.meta }}</span>
           </div>
           <p class="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-0.5">{{ kpi.label }}</p>
           <h3 class="text-xl font-black text-gray-900 dark:text-white tracking-tight">{{ kpi.value }}</h3>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 xl:grid-cols-[1.50fr_1fr] gap-3">
        <!-- Left Column: Stocks & Movements -->
        <div class="space-y-3">
          <!-- Stock Table Card -->
          <UCard class="w-full shadow-sm rounded-2xl border border-gray-100 dark:border-zinc-800" :ui="{ body: 'p-0 overflow-hidden' }">
            <div class="p-4 py-3 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between gap-4">
              <div>
                <h2 class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">Inventory Register</h2>
                <p class="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1">Real-time stock availability</p>
              </div>
              <div class="w-64">
                <UInput 
                  v-model="stockSearch" 
                  placeholder="Filter items..." 
                  icon="i-heroicons-magnifying-glass"
                  size="sm"
                  class="w-full" 
                />
              </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs divide-y divide-gray-100 dark:divide-zinc-800">
                <thead>
                  <tr class="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider bg-gray-50/80 dark:bg-zinc-800/80">
                    <th class="py-2 px-3">Item Details</th>
                    <th class="py-2 px-3">Part No</th>
                    <th class="py-2 px-3 text-right">Quantity</th>
                    <th class="py-2 px-3 text-right">Avg Rate</th>
                    <th class="py-2 px-3 text-right">Total Value</th>
                    <th class="py-2 px-3 text-center">Health</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-zinc-800">
                  <tr v-for="stock in filteredStocks.slice(0, 10)" :key="stock.id" class="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group" @click="viewHistory(stock)">
                    <td class="py-2 px-3">
                      <div class="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{{ stock.item }}</div>
                      <div class="text-[9px] text-gray-400 dark:text-zinc-500 font-bold tracking-widest mt-0.5">HSN: {{ stock.hsn }}</div>
                    </td>
                    <td class="py-2 px-3">
                      <div class="font-semibold text-gray-700 dark:text-zinc-300">{{ stock.pno || '—' }}</div>
                      <div v-if="stock.oem" class="text-[9px] text-gray-450 dark:text-zinc-500 font-bold uppercase tracking-wider">{{ stock.oem }}</div>
                    </td>
                    <td class="py-2 px-3 text-right">
                      <div class="font-bold text-gray-900 dark:text-white">{{ stock.qty.toLocaleString() }} <span class="text-[9px] text-gray-450 dark:text-zinc-550 ml-0.5">{{ stock.uom }}</span></div>
                      <div v-if="stock.batches?.length > 1" class="text-[8px] text-blue-500 font-black uppercase tracking-widest">{{ stock.batches.length }} Batches</div>
                    </td>
                    <td class="py-2 px-3 text-right">
                      <div class="text-gray-650 dark:text-zinc-400 font-medium">₹{{ stock.rate.toLocaleString() }}</div>
                    </td>
                    <td class="py-2 px-3 text-right">
                      <div class="font-bold text-gray-900 dark:text-white">₹{{ stock.total.toLocaleString() }}</div>
                    </td>
                    <td class="py-2 px-3 text-center">
                      <UBadge 
                        :color="getStockHealthColor(stock.qty)" 
                        size="sm" 
                        variant="subtle" 
                        class="px-2 py-0.5 font-black uppercase tracking-widest text-[9px] rounded-md"
                      >
                        {{ getStockHealthLabel(stock.qty) }}
                      </UBadge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div v-if="filteredStocks.length > 10" class="p-2 bg-gray-50/50 dark:bg-zinc-800/20 text-center border-t border-gray-100 dark:border-zinc-800">
               <UButton
                 color="primary"
                 variant="link"
                 size="xs"
                 class="font-black text-[10px] uppercase tracking-widest"
                 @click="$router.push('/inventory/stocks')"
               >
                 View All {{ filteredStocks.length }} Items →
               </UButton>
            </div>
          </UCard>

          <!-- Recent Movements Card -->
          <UCard class="w-full shadow-sm rounded-2xl border border-gray-100 dark:border-zinc-800" :ui="{ body: 'p-4 py-3' }">
             <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">Stock Movement Feed</h2>
                  <p class="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1">Trace inward and outward transactions</p>
                </div>
                <UButton
                  color="primary"
                  variant="link"
                  size="xs"
                  label="Full Ledger"
                  class="font-black text-[10px] uppercase tracking-widest p-0"
                  @click="$router.push('/inventory/movements')"
                />
             </div>
             <div class="space-y-2">
                <div v-for="move in movements.slice(0, 6)" :key="move.id" class="flex items-center gap-3 p-2 px-3 rounded-2xl bg-gray-50/60 dark:bg-zinc-800/40 hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-all border border-gray-100/50 dark:border-zinc-800/50">
                   <div :class="move.type === 'SALE' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'" class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                      <UIcon v-if="move.type === 'SALE'" name="i-heroicons-arrow-trending-down" class="w-5 h-5" />
                      <UIcon v-else name="i-heroicons-arrow-trending-up" class="w-5 h-5" />
                   </div>
                   <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                         <h4 class="font-bold text-xs text-gray-900 dark:text-white truncate leading-none">{{ move.item }}</h4>
                         <span class="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase">{{ formatDate(move.createdAt) }}</span>
                      </div>
                      <div class="flex items-center gap-2 mt-1">
                         <span class="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider leading-none">{{ move.supply || 'INTERNAL' }}</span>
                         <span class="text-[9px] font-black leading-none" :class="move.type === 'SALE' ? 'text-rose-500' : 'text-emerald-500'">{{ move.type }}</span>
                      </div>
                   </div>
                   <div class="text-right">
                      <div class="font-bold text-sm text-gray-900 dark:text-white leading-none">{{ move.type === 'SALE' ? '-' : '+' }}{{ move.qty }}</div>
                      <div class="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase mt-0.5 leading-none">Bal: {{ move.qtyh }}</div>
                   </div>
                </div>
                <div v-if="movements.length === 0" class="py-8 text-center text-gray-400 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-widest">No recent movements recorded</div>
             </div>
          </UCard>
        </div>

        <!-- Right Column: Quick Links & Recent Bills -->
        <div class="space-y-3">
          <!-- Quick Access -->
          <UCard class="w-full shadow-sm rounded-2xl border border-gray-100 dark:border-zinc-800 bg-zinc-900 dark:bg-zinc-950" :ui="{ body: 'p-4 py-3.5' }">
             <h2 class="text-white font-black text-sm uppercase tracking-wider mb-4 leading-none">Quick Actions</h2>
             <div class="grid grid-cols-2 gap-2.5">
                <button @click="$router.push('/accounting/parties')" class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                   <div class="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <UIcon name="i-heroicons-user-group" class="w-4.5 h-4.5" />
                   </div>
                   <h4 class="text-white text-xs font-bold truncate">Parties Hub</h4>
                   <p class="text-[9px] text-slate-500 font-bold uppercase leading-none mt-0.5">Clients</p>
                </button>
                <button @click="$router.push('/inventory/stocks')" class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                   <div class="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <UIcon name="i-heroicons-clipboard-document-list" class="w-4.5 h-4.5" />
                   </div>
                   <h4 class="text-white text-xs font-bold truncate">Stock Register</h4>
                   <p class="text-[9px] text-slate-500 font-bold uppercase leading-none mt-0.5">Inventory</p>
                </button>
                <button @click="$router.push('/inventory/reports')" class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                   <div class="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <UIcon name="i-heroicons-document-chart-bar" class="w-4.5 h-4.5" />
                   </div>
                   <h4 class="text-white text-xs font-bold truncate">Reports</h4>
                   <p class="text-[9px] text-slate-500 font-bold uppercase leading-none mt-0.5">Analysis</p>
                </button>
                <button @click="$router.push('/accounting/ledger')" class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                   <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <UIcon name="i-heroicons-credit-card" class="w-4.5 h-4.5" />
                   </div>
                   <h4 class="text-white text-xs font-bold truncate">General Ledger</h4>
                   <p class="text-[9px] text-slate-500 font-bold uppercase leading-none mt-0.5">Accounting</p>
                </button>
                <button @click="showAdjustmentModal = true" class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                   <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <UIcon name="i-heroicons-exclamation-triangle" class="w-4.5 h-4.5" />
                   </div>
                   <h4 class="text-white text-xs font-bold truncate">Adjustment</h4>
                   <p class="text-[9px] text-slate-500 font-bold uppercase leading-none mt-0.5">Stock Fix</p>
                </button>
                <button @click="$router.push('/accounting/bills')" class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all group">
                   <div class="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <UIcon name="i-heroicons-document-text" class="w-4.5 h-4.5" />
                   </div>
                   <h4 class="text-white text-xs font-bold truncate">Invoices & Notes</h4>
                   <p class="text-[9px] text-slate-500 font-bold uppercase leading-none mt-0.5">Billing Hub</p>
                </button>
             </div>
          </UCard>

          <!-- Recent Invoices -->
          <UCard class="w-full shadow-sm rounded-2xl border border-gray-100 dark:border-zinc-800" :ui="{ body: 'p-4 py-3' }">
             <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">Recent Invoices</h2>
                  <p class="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1">Latest billing activity</p>
                </div>
                <UButton
                  color="primary"
                  variant="link"
                  size="xs"
                  label="View All"
                  class="font-black text-[10px] uppercase tracking-widest p-0"
                  @click="$router.push('/accounting/bills')"
                />
             </div>
             <div class="space-y-2">
                <div v-for="bill in bills.slice(0, 6)" :key="bill._id" class="flex items-center gap-3 p-2 px-3 rounded-2xl border border-gray-100/60 dark:border-zinc-800/60 hover:bg-gray-50/50 dark:hover:bg-zinc-850/50 transition-all cursor-pointer" @click="$router.push('/accounting/bills')">
                   <div :class="bill.btype === 'SALES' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'" class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[9px] shrink-0 leading-none">
                      {{ bill.btype === 'SALES' ? 'SLS' : 'PUR' }}
                   </div>
                   <div class="flex-1 min-w-0">
                      <h4 class="text-xs font-bold text-gray-900 dark:text-white truncate leading-none">{{ bill.partyName }}</h4>
                      <p class="text-[9px] text-gray-450 dark:text-zinc-500 font-bold uppercase mt-0.5 leading-none">{{ bill.bno }}</p>
                   </div>
                   <div class="text-right">
                      <div class="text-xs font-bold text-gray-900 dark:text-white leading-none">₹{{ bill.netTotal.toLocaleString() }}</div>
                      <div class="text-[9px] text-gray-450 dark:text-zinc-500 font-bold uppercase mt-0.5 leading-none">{{ formatDate(bill.bdate) }}</div>
                   </div>
                </div>
             </div>
          </UCard>
        </div>
      </div>
    </template>

    <StockHistoryModal v-model="showHistoryModal" :stock="selectedStock" />
    <CreateStockModal v-model="showCreateModal" @saved="fetchStocks" />
    <StockAdjustmentModal v-model="showAdjustmentModal" @saved="refreshAll" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useInventory } from '@/composables/useInventory';
import { useBilling } from '@/composables/useBilling';
import StockHistoryModal from '@/components/inventory/StockHistoryModal.vue';
import CreateStockModal from '@/components/inventory/CreateStockModal.vue';
import StockAdjustmentModal from '@/components/inventory/StockAdjustmentModal.vue';

const { stocks, movements, fetchStocks, fetchMovements, loading: inventoryLoading } = useInventory();
const { bills, fetchBills, fetchParties, parties, loading: billingLoading } = useBilling();

const loading = computed(() => inventoryLoading.value || billingLoading.value);

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
  { label: 'Total Value', value: `₹${totalValue.value.toLocaleString()}`, icon: 'i-heroicons-currency-rupee', color: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/25', meta: 'Asset' },
  { label: 'Live SKUs', value: stocks.value.length, icon: 'i-heroicons-cube', color: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/25', meta: 'Items' },
  { label: 'Low Stock', value: lowStockCount.value, icon: 'i-heroicons-exclamation-triangle', color: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/25', meta: 'Alerts' },
  { label: 'Out of Stock', value: outOfStockCount.value, icon: 'i-heroicons-exclamation-triangle', color: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/25', meta: 'Critical' },
  { label: 'Total Parties', value: parties.value.length, icon: 'i-heroicons-user-group', color: 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/25', meta: 'Network' },
  { label: 'Active Bills', value: bills.value.length, icon: 'i-heroicons-document-text', color: 'text-sky-500 bg-sky-500/10 dark:bg-sky-500/25', meta: 'Registry' }
]);

function getStockHealthColor(qty: number) {
  if (qty <= 0) return 'error';
  if (qty <= 5) return 'warning';
  if (qty <= 20) return 'primary';
  return 'success';
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
