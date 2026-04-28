<script setup lang="ts">
import { computed } from 'vue';

interface OtherCharge {
  name: string;
  hsnSac?: string;
  type: 'Add' | 'Subtract';
  amount: number;
  gstRate: number;
}

const props = defineProps<{
  charges: OtherCharge[];
  isInterState: boolean;
}>();

const emit = defineEmits(['remove']);

const calculateGst = (charge: OtherCharge) => {
  return (charge.amount * (charge.gstRate || 0)) / 100;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(val);
};
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm text-left border-collapse">
      <thead class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th class="px-4 py-2 font-semibold">Charge Name</th>
          <th class="px-4 py-2 font-semibold">HSN/SAC</th>
          <th class="px-4 py-2 font-semibold text-right">Amount</th>
          <th class="px-4 py-2 font-semibold text-right">GST %</th>
          <th class="px-4 py-2 font-semibold text-right">GST Amt</th>
          <th class="px-4 py-2 font-semibold text-right">Total</th>
          <th class="px-4 py-2 w-10"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr v-for="(charge, index) in charges" :key="index" class="group hover:bg-gray-50 dark:hover:bg-gray-800/30">
          <td class="px-4 py-2">
            <div class="font-medium">{{ charge.name }}</div>
            <div class="text-[10px] text-gray-400 uppercase">{{ charge.type }}ITION</div>
          </td>
          <td class="px-4 py-2 text-gray-500">{{ charge.hsnSac || '-' }}</td>
          <td class="px-4 py-2 text-right font-mono">{{ charge.amount.toFixed(2) }}</td>
          <td class="px-4 py-2 text-right text-gray-500">{{ charge.gstRate }}%</td>
          <td class="px-4 py-2 text-right text-gray-500 font-mono">{{ calculateGst(charge).toFixed(2) }}</td>
          <td class="px-4 py-2 text-right font-bold text-primary">
            {{ (charge.type === 'Add' ? (charge.amount + calculateGst(charge)) : -(charge.amount + calculateGst(charge))).toFixed(2) }}
          </td>
          <td class="px-4 py-2">
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="emit('remove', index)" />
          </td>
        </tr>
        <tr v-if="charges.length === 0">
          <td colspan="7" class="px-4 py-4 text-center text-gray-400 italic">
            No other charges added.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
