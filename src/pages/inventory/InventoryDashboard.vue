<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
        <p class="text-gray-600 mt-1">Monitor stock levels and manage movements</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="fetchStocks"
          class="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center"
          @click="showAdjustmentModal = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Adjustment
        </button>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Items</p>
        <p class="text-2xl font-bold text-gray-900 mt-2">{{ stocks.length }}</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">Low Stock Items</p>
        <p class="text-2xl font-bold text-red-600 mt-2">{{ lowStockCount }}</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">Inventory Value</p>
        <p class="text-2xl font-bold text-green-600 mt-2">₹{{ totalInventoryValue.toLocaleString() }}</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">Recent Movements</p>
        <p class="text-2xl font-bold text-blue-600 mt-2">12</p>
      </div>
    </div>

    <!-- Stock Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h2 class="font-semibold text-gray-800">Stock Levels</h2>
        <div class="relative w-64">
          <input
            type="text"
            v-model="stockSearch"
            placeholder="Search items..."
            class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold border-b">Item Details</th>
              <th class="px-6 py-4 font-semibold border-b text-right">Quantity</th>
              <th class="px-6 py-4 font-semibold border-b text-right">UOM</th>
              <th class="px-6 py-4 font-semibold border-b text-right">Avg Rate (WAC)</th>
              <th class="px-6 py-4 font-semibold border-b text-right">Total Value</th>
              <th class="px-6 py-4 font-semibold border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="stock in filteredStocks" :key="stock.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900">{{ stock.item }}</div>
                <div class="text-xs text-gray-500 mt-0.5">HSN: {{ stock.hsn }}</div>
              </td>
              <td class="px-6 py-4 text-right">
                <span :class="stock.qty < 5 ? 'text-red-600 font-bold' : 'text-gray-900 font-medium'">
                  {{ stock.qty.toLocaleString() }}
                </span>
              </td>
              <td class="px-6 py-4 text-right text-gray-600 uppercase">{{ stock.uom }}</td>
              <td class="px-6 py-4 text-right text-gray-600">₹{{ stock.rate.toFixed(2) }}</td>
              <td class="px-6 py-4 text-right font-medium text-gray-900">₹{{ stock.total.toLocaleString() }}</td>
              <td class="px-6 py-4 text-center">
                <div class="flex justify-center space-x-2">
                  <button class="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View History" @click="viewHistory(stock)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button class="p-1 text-green-600 hover:bg-green-50 rounded" title="Adjust Stock" @click="openAdjustment(stock)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredStocks.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <div class="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p class="text-lg font-medium text-gray-400">No stock records found</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <StockHistoryModal 
      v-model="showHistoryModal" 
      :stock="selectedStock" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useInventory } from '@/composables/useInventory';
import StockHistoryModal from '@/components/inventory/StockHistoryModal.vue';

const { loading, error, stocks, fetchStocks } = useInventory();

const stockSearch = ref('');
const showAdjustmentModal = ref(false);
const showHistoryModal = ref(false);
const selectedStock = ref<any>(null);

onMounted(() => {
  fetchStocks();
});

const filteredStocks = computed(() => {
  if (!stockSearch.value) return stocks.value;
  const query = stockSearch.value.toLowerCase();
  return stocks.value.filter(s => 
    s.item.toLowerCase().includes(query) || 
    s.hsn.toLowerCase().includes(query)
  );
});

const lowStockCount = computed(() => {
  return stocks.value.filter(s => s.qty < 5).length;
});

const totalInventoryValue = computed(() => {
  return stocks.value.reduce((sum, s) => sum + s.total, 0);
});

function viewHistory(stock: any) {
  selectedStock.value = stock;
  showHistoryModal.value = true;
}

function openAdjustment(stock: any) {
  // TODO: Open adjustment modal
  console.log('Open adjustment for', stock);
}
</script>
