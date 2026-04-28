<script setup lang="ts">
import { ref } from 'vue';

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
  uom: string;
  batches: Batch[];
}

const emit = defineEmits(['select']);

const isOpen = ref(false);
const selectedStock = ref<StockItem | null>(null);

const open = (stock: StockItem) => {
  selectedStock.value = stock;
  isOpen.value = true;
};

const selectBatch = (batch: Batch) => {
  if (selectedStock.value) {
    emit('select', { 
        ...selectedStock.value, 
        batch: batch.batch, 
        qty: batch.qty, 
        rate: batch.rate,
        mrp: batch.mrp,
        expiry: batch.expiry
    });
    isOpen.value = false;
  }
};

defineExpose({ open });
</script>

<template>
  <UModal v-model:open="isOpen" title="Select Batch" :description="selectedStock?.item">
    <template #body>
      <div class="space-y-2.5 max-h-96 overflow-y-auto">
        <div 
          v-for="(batch, idx) in selectedStock?.batches" 
          :key="idx"
          class="p-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-primary-400 hover:bg-primary-50/60 dark:hover:bg-primary-950/20 cursor-pointer transition-all bg-white dark:bg-gray-900 group"
          @click="selectBatch(batch)"
        >
          <div class="flex justify-between items-start gap-3">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-800 dark:group-hover:text-primary-400">
                {{ batch.batch || 'No Batch' }}
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-gray-500 mt-1.5">
                <span>Qty: <strong class="text-gray-700 dark:text-gray-300">{{ batch.qty }} {{ selectedStock?.uom }}</strong></span>
                <span>Rate: <strong class="text-gray-700 dark:text-gray-300">₹{{ batch.rate }}</strong></span>
                <span v-if="batch.expiry">Expiry: <strong class="text-gray-700 dark:text-gray-300">{{ batch.expiry }}</strong></span>
                <span v-if="batch.mrp">MRP: <strong class="text-gray-700 dark:text-gray-300">₹{{ batch.mrp }}</strong></span>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-[10px] text-gray-400 uppercase tracking-wide">Available</div>
              <div :class="['font-bold text-lg', batch.qty > 0 ? 'text-success' : 'text-error']">{{ batch.qty }}</div>
            </div>
          </div>
        </div>
        <div v-if="!selectedStock?.batches || selectedStock.batches.length === 0" class="text-center text-gray-400 py-8 italic text-sm">
          No batch information available.
        </div>
      </div>
    </template>
  </UModal>
</template>
