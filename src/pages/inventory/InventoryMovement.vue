<template>
  <div class="p-6 w-full mx-auto">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Stock Movements</h1>
        <p class="text-gray-600 mt-1">Full audit trail of inventory ins and outs</p>
      </div>
      <div class="flex space-x-3">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-path"
          label="Refresh"
          size="sm"
          class="font-bold text-xs h-8"
          @click="fetchMovements({})"
        />
        <UButton
          color="success"
          icon="i-heroicons-table-cells"
          label="Export Excel"
          size="sm"
          class="font-bold text-xs h-8"
          @click="exportExcel"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
       <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1.5">Filter by Type</label>
          <USelect
            v-model="filters.type"
            :items="[
              { label: 'All Movements', value: '' },
              { label: 'Sales', value: 'SALE' },
              { label: 'Purchases', value: 'PURCHASE' },
              { label: 'Sales Returns', value: 'CREDIT_NOTE' },
              { label: 'Purchase Returns', value: 'DEBIT_NOTE' },
              { label: 'Manual Adjustments', value: 'ADJUSTMENT' }
            ]"
            class="w-full"
            size="sm"
            @change="fetchMovements(filters)"
          />
       </div>
       <div class="w-64">
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1.5">Item Search</label>
          <UInput
            v-model="itemSearch"
            placeholder="Filter by item name..."
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-full"
          />
       </div>
    </div>

    <!-- Movements Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Loader -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-4">
        <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-blue-600" />
        <p class="text-xs font-black uppercase tracking-widest text-slate-400">Loading movements...</p>
      </div>

      <div v-else class="overflow-x-auto">
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
              <td colspan="8" class="px-6 py-20 text-center text-gray-400 italic">No movements match your filters.</td>
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

const { movements, fetchMovements, loading } = useInventory();

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
    const blob = await api.get('/inventory/movements/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
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
