<script setup lang="ts">
import { ref } from 'vue';

interface OtherCharge {
  name: string;
  hsnSac?: string;
  type: 'Add' | 'Subtract';
  amount: number;
  gstRate: number;
}

const emit = defineEmits(['add']);

const isOpen = ref(false);
const charge = ref<OtherCharge>({
  name: '',
  hsnSac: '',
  type: 'Add',
  amount: 0,
  gstRate: 0
});

const chargeTypes = [
  { label: 'Addition (+)', value: 'Add' },
  { label: 'Subtraction (-)', value: 'Subtract' }
];

const addCharge = () => {
  if (!charge.value.name || charge.value.amount <= 0) {
    alert('Please provide a name and amount');
    return;
  }
  emit('add', { ...charge.value });
  isOpen.value = false;
  // Reset
  charge.value = {
    name: '',
    hsnSac: '',
    type: 'Add',
    amount: 0,
    gstRate: 0
  };
};

const open = () => {
  isOpen.value = true;
};

defineExpose({ open });
</script>

<template>
  <UModal v-model:open="isOpen" title="Add Other Charge" description="Add additional costs like freight, insurance, or labor.">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Charge Name" required>
          <UInput v-model="charge.name" placeholder="e.g. Freight, Insurance, Labor" block />
        </UFormField>
        
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="HSN/SAC Code">
            <UInput v-model="charge.hsnSac" placeholder="Optional" block />
          </UFormField>
          <UFormField label="Type">
            <USelect v-model="charge.type" :items="chargeTypes" block />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Amount (Taxable)" required>
            <UInput v-model="charge.amount" type="number" block />
          </UFormField>
          <UFormField label="GST Rate (%)">
            <UInput v-model="charge.gstRate" type="number" block />
          </UFormField>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" label="Cancel" @click="isOpen = false" />
        <UButton color="primary" label="Add to Bill" @click="addCharge" />
      </div>
    </template>
  </UModal>
</template>
