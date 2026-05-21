<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Stock Movements</h1>
        <p class="text-gray-600 mt-1">Full audit trail of inventory ins and outs</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="fetchMovements({})"
          class="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          @click="exportExcel"
          class="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Excel
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
       <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Filter by Type</label>
          <select v-model="filters.type" @change="fetchMovements(filters)" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
             <option value="">All Movements</option>
             <option value="SALE">Sales</option>
             <option value="PURCHASE">Purchases</option>
             <option value="CREDIT_NOTE">Sales Returns</option>
             <option value="DEBIT_NOTE">Purchase Returns</option>
             <option value="ADJUSTMENT">Manual Adjustments</option>
          </select>
       </div>
       <div class="w-64">
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Item Search</label>
          <input type="text" v-model="itemSearch" placeholder="Filter by item name..." class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
       </div>
    </div>

    <!-- Movements Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <th class="px-6 py-4 font-semibold">Date</th>
              <th class="px-6 py-4 font-semibold">Type</th>
              <th class="px-6 py-4 font-semibold">Reference</th>
              <th class="px-6 py-4 font-semibold">Item</th>
              <th class="px-6 py-4 font-semibold">Batch</th>
              <th class="px-6 py-4 font-semibold text-right">Qty Change</th>
              <th class="px-6 py-4 font-semibold text-right">Balance After</th>
              <th class="px-6 py-4 font-semibold text-right">Cost Rate</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm">
            <tr v-for="m in filteredMovements" :key="m.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 text-gray-600 whitespace-nowrap">{{ formatDate(m.createdAt) }}</td>
              <td class="px-6 py-4">
                <span :class="getTypeClass(m.type)" class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                  {{ m.type }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900">{{ m.bno || 'MANUAL' }}</div>
                <div class="text-[10px] text-gray-400 truncate max-w-[150px]">{{ m.supply || 'INTERNAL' }}</div>
              </td>
              <td class="px-6 py-4 font-medium text-gray-800">{{ m.item }}</td>
              <td class="px-6 py-4">
                <span v-if="m.batch" class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">{{ m.batch }}</span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-6 py-4 text-right font-bold" :class="m.qty > 0 ? 'text-green-600' : 'text-red-600'">
                {{ m.qty > 0 ? '+' : '' }}{{ m.qty.toLocaleString() }}
              </td>
              <td class="px-6 py-4 text-right font-medium text-gray-900 bg-gray-50/50">{{ m.qtyh.toLocaleString() }}</td>
              <td class="px-6 py-4 text-right text-gray-500 italic">₹{{ (m.rate || 0).toFixed(2) }}</td>
            </tr>
            <tr v-if="filteredMovements.length === 0">
              <td colspan="7" class="px-6 py-20 text-center text-gray-400 italic">No movements match your filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useInventory } from '@/composables/useInventory';
import { api } from '@/utils/api';

const { movements, fetchMovements } = useInventory();

const filters = reactive({
  type: '',
  stockId: ''
});
const itemSearch = ref('');

onMounted(() => {
  fetchMovements(filters);
});

const filteredMovements = computed(() => {
  if (!itemSearch.value) return movements.value;
  const q = itemSearch.value.toLowerCase();
  return movements.value.filter(m => m.item.toLowerCase().includes(q));
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getTypeClass(type: string) {
  const map: any = {
    'SALE': 'bg-red-100 text-red-700',
    'PURCHASE': 'bg-green-100 text-green-700',
    'CREDIT_NOTE': 'bg-blue-100 text-blue-700',
    'DEBIT_NOTE': 'bg-orange-100 text-orange-700',
    'ADJUSTMENT': 'bg-gray-100 text-gray-700'
  };
  return map[type] || 'bg-gray-100 text-gray-600';
}

async function exportExcel() {
  try {
    const response = await api.get('/inventory/movements/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'stock-movements.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    alert('Export failed');
  }
}
</script>
