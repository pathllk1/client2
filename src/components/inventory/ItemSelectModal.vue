<script setup lang="ts">
import { ref, computed } from 'vue';

interface Batch {
  batch: string;
  qty: number;
  rate: number;
  mrp?: number;
  expiry?: string;
}

interface StockItem {
  _id: string;
  item: string;
  hsn: string;
  uom: string;
  qty: number;
  rate: number;
  grate: number;
  batches: Batch[];
}

const props = defineProps<{
  stocks: StockItem[];
}>();

const emit = defineEmits(['select', 'create', 'select-batch']);

const isOpen = ref(false);
const searchQuery = ref('');

const filteredStocks = computed(() => {
  if (!searchQuery.value) return props.stocks;
  const q = searchQuery.value.toLowerCase();
  return props.stocks.filter(s => 
    s.item.toLowerCase().includes(q) || 
    s.hsn?.toLowerCase().includes(q) ||
    (s.batches && s.batches.some(b => b.batch?.toLowerCase().includes(q)))
  );
});

const selectStock = (stock: StockItem) => {
  if (stock.batches && stock.batches.length > 1) {
    emit('select-batch', stock);
  } else if (stock.batches && stock.batches.length === 1) {
    const b = stock.batches[0];
    if (b) {
      emit('select', { ...stock, batch: b.batch, qty: b.qty, rate: b.rate, mrp: b.mrp, expiry: b.expiry });
      isOpen.value = false;
    }
  } else {
    emit('select', stock);
    isOpen.value = false;
  }
};

const open = () => {
  isOpen.value = true;
};

defineExpose({ open });
</script>

<template>
  <UModal v-model:open="isOpen" title="Select Item" description="Search and select a product from the master stock list.">
    <template #body>
      <div class="space-y-4">
        <div class="flex gap-2">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search by item name or HSN..."
            autofocus
            class="flex-1"
          />
          <UButton icon="i-lucide-plus" color="primary" @click="emit('create')" />
        </div>
        
        <div class="max-h-[50vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="stock in filteredStocks"
            :key="stock._id"
            class="p-3 hover:bg-warning-50 dark:hover:bg-warning-950/20 cursor-pointer transition-colors group rounded-lg"
            @click="selectStock(stock)"
          >
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-bold group-hover:text-warning-600 transition-colors">{{ stock.item }}</h4>
                <div class="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2 items-center">
                  <span class="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">HSN: {{ stock.hsn }}</span>
                  <span>•</span>
                  <span>{{ stock.uom }}</span>
                  <span>•</span>
                  <span>GST: {{ stock.grate }}%</span>
                  <template v-if="stock.batches && stock.batches.length > 0">
                    <span>•</span>
                    <span v-if="stock.batches.length === 1" class="font-mono text-primary-600 dark:text-primary-400">
                      {{ stock.batches[0]?.batch || 'No Batch' }}
                    </span>
                    <span v-else class="bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {{ stock.batches.length }} BATCHES
                    </span>
                  </template>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-bold text-gray-900 dark:text-white">₹{{ stock.rate?.toFixed(2) }}</div>
                <div :class="['text-[10px] uppercase font-bold', stock.qty > 0 ? 'text-success' : 'text-error']">
                  Stock: {{ stock.qty }}
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="filteredStocks.length === 0" class="py-12 text-center text-gray-500">
            <UIcon name="i-lucide-package-x" class="text-4xl opacity-20 mb-2" />
            <p>No products found matching your search.</p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
