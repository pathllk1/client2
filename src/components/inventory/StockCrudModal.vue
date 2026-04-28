<script setup lang="ts">
import { ref, computed } from 'vue';
import { apiFetch } from '../../utils/api';

interface Batch {
  batch: string;
  qty: number;
  rate: number;
  mrp?: number;
  expiry?: string;
}

interface StockItem {
  _id?: string;
  item: string;
  pno?: string;
  oem?: string;
  hsn: string;
  uom: string;
  qty: number;
  rate: number;
  grate: number;
  mrp?: number;
  batch?: string;
  expiryDate?: string;
  batches?: Batch[];
}

const props = defineProps<{
  mode: 'create' | 'edit';
  stock?: StockItem | null;
}>();

const emit = defineEmits(['saved', 'close']);

const isOpen = ref(false);
const loading = ref(false);
const form = ref<StockItem>({
  item: '',
  pno: '',
  oem: '',
  hsn: '',
  uom: 'PCS',
  qty: 0,
  rate: 0,
  grate: 18,
  mrp: undefined,
  batch: '',
  expiryDate: ''
});

const selectedBatchIndex = ref<number | null>(null);

const uomOptions = ['NOS', 'PCS', 'SET', 'BOX', 'MTR', 'KGS'];
const gstOptions = [0, 5, 12, 18, 28];

const open = (stockToEdit?: StockItem) => {
  if (stockToEdit) {
    form.value = { ...stockToEdit };
    if (form.value.batches && form.value.batches.length > 0) {
      // Default to first batch if exists
      const b = form.value.batches[0];
      form.value.batch = b.batch;
      form.value.qty = b.qty;
      form.value.rate = b.rate;
      form.value.mrp = b.mrp;
      form.value.expiryDate = b.expiry ? b.expiry.split('T')[0] : '';
      selectedBatchIndex.value = 0;
    }
  } else {
    form.value = {
      item: '',
      pno: '',
      oem: '',
      hsn: '',
      uom: 'PCS',
      qty: 0,
      rate: 0,
      grate: 18,
      mrp: undefined,
      batch: '',
      expiryDate: ''
    };
    selectedBatchIndex.value = null;
  }
  isOpen.value = true;
};

const onBatchChange = (index: number) => {
  if (form.value.batches && form.value.batches[index]) {
    const b = form.value.batches[index];
    form.value.batch = b.batch;
    form.value.qty = b.qty;
    form.value.rate = b.rate;
    form.value.mrp = b.mrp;
    form.value.expiryDate = b.expiry ? b.expiry.split('T')[0] : '';
    selectedBatchIndex.value = index;
  }
};

const save = async () => {
  if (!form.value.item || !form.value.hsn) {
    alert('Item name and HSN are required');
    return;
  }

  loading.value = true;
  try {
    const payload: any = { ...form.value };
    
    // Prepare batches for server if needed
    if (payload.batch || payload.expiryDate || payload.mrp) {
        const batchData = {
            batch: payload.batch || null,
            qty: parseFloat(payload.qty as any) || 0,
            rate: parseFloat(payload.rate as any) || 0,
            expiry: payload.expiryDate || null,
            mrp: payload.mrp ? parseFloat(payload.mrp as any) : null,
        };

        if (props.mode === 'edit' && payload.batches && selectedBatchIndex.value !== null) {
            payload.batches[selectedBatchIndex.value] = batchData;
        } else if (props.mode === 'create') {
            payload.batches = [batchData];
        }
    } else {
        if (props.mode === 'create') {
            payload.batches = [];
        }
    }

    const url = props.mode === 'create' 
        ? '/inventory/purchase/stocks' 
        : `/inventory/purchase/stocks/${form.value._id}`;
    
    const method = props.mode === 'create' ? 'POST' : 'PUT';

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    
    if (result.success) {
      emit('saved', result.data);
      isOpen.value = false;
    } else {
      alert(result.error || 'Failed to save item');
    }
  } catch (err) {
    console.error(err);
    alert('Error saving item');
  } finally {
    loading.value = false;
  }
};

const gstImpact = computed(() => {
    const rate = parseFloat(form.value.rate as any) || 0;
    const gst = parseFloat(form.value.grate as any) || 0;
    const tax = rate * (gst / 100);
    return {
        tax: tax.toFixed(2),
        total: (rate + tax).toFixed(2)
    };
});

defineExpose({ open });
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ width: 'sm:max-w-2xl' }">
    <template #content>
      <div class="overflow-hidden rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <!-- Enterprise Header -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 flex justify-between items-center text-white">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-white/10 rounded-lg">
                <UIcon :name="mode === 'create' ? 'i-lucide-package-plus' : 'i-lucide-package-check'" class="text-2xl text-primary-400" />
            </div>
            <div>
              <h3 class="font-bold text-lg tracking-tight uppercase">{{ mode === 'create' ? 'Create' : 'Edit' }} Stock Item</h3>
              <p class="text-slate-400 text-[11px] font-medium tracking-wider uppercase opacity-80">
                {{ mode === 'create' ? 'Register new inventory asset' : `Editing: ${form.item}` }}
              </p>
            </div>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            class="text-slate-400 hover:text-white"
            @click="isOpen = false"
          />
        </div>

        <div class="p-6 overflow-y-auto max-h-[75vh]">
          <div class="space-y-8">
            <!-- Section 1: Core Identity -->
            <section class="space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                <UIcon name="i-lucide-tag" class="text-primary-500" />
                <h4 class="text-xs font-bold uppercase tracking-widest text-gray-500">Core Identity</h4>
              </div>
              
              <UFormField label="Item Description" required help="Full commercial name of the product">
                <UInput v-model="form.item" placeholder="e.g. Dell UltraSharp 24 Monitor - U2422H" block icon="i-lucide-package" />
              </UFormField>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField label="HSN/SAC Code" required>
                  <UInput v-model="form.hsn" placeholder="8-digit code" block icon="i-lucide-hash" />
                </UFormField>
                <UFormField label="Part Number (P/No)">
                  <UInput v-model="form.pno" placeholder="Manufacturer Part #" block icon="i-lucide-component" />
                </UFormField>
              </div>

              <UFormField label="OEM / Brand">
                <UInput v-model="form.oem" placeholder="e.g. Dell, HP, Logitech" block icon="i-lucide-factory" />
              </UFormField>
            </section>

            <!-- Section 2: Commercials & Taxation -->
            <section class="space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                <UIcon name="i-lucide-indian-rupee" class="text-primary-500" />
                <h4 class="text-xs font-bold uppercase tracking-widest text-gray-500">Commercials & Taxation</h4>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <UFormField label="Unit Price (Excl. Tax)" required>
                  <UInput v-model="form.rate" type="number" step="0.01" block icon="i-lucide-banknote" />
                </UFormField>
                <UFormField label="GST Rate (%)" required>
                  <USelect v-model="form.grate" :items="gstOptions.map(g => ({ label: `${g}%`, value: g }))" block icon="i-lucide-percent" />
                </UFormField>
                <UFormField label="MRP (Max Retail)">
                  <UInput v-model="form.mrp" type="number" step="0.01" block icon="i-lucide-circle-dollar-sign" />
                </UFormField>
              </div>

              <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg flex justify-between items-center text-xs">
                <div class="flex gap-4">
                    <span class="text-gray-500 uppercase font-bold tracking-tighter">Tax Impact: <span class="text-gray-900 dark:text-white font-mono ml-1">₹{{ gstImpact.tax }}</span></span>
                    <span class="text-gray-500 uppercase font-bold tracking-tighter">Gross Price: <span class="text-primary-600 dark:text-primary-400 font-mono ml-1 font-extrabold">₹{{ gstImpact.total }}</span></span>
                </div>
                <UIcon name="i-lucide-info" class="text-gray-400 cursor-help" />
              </div>
            </section>

            <!-- Section 3: Inventory & Logistics -->
            <section class="space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                <UIcon name="i-lucide-truck" class="text-primary-500" />
                <h4 class="text-xs font-bold uppercase tracking-widest text-gray-500">Inventory & Logistics</h4>
              </div>

              <div v-if="mode === 'edit' && form.batches && form.batches.length > 1" class="p-4 bg-primary-50 dark:bg-primary-950/20 rounded-xl border border-primary-100 dark:border-primary-900/30 ring-1 ring-primary-200 dark:ring-primary-800">
                <UFormField label="Active Batch Context" help="Editing one of multiple available batches">
                  <USelect 
                    v-model="selectedBatchIndex" 
                    :items="form.batches.map((b, i) => ({ label: `BATCH: ${b.batch || 'DEFAULT'} (Qty: ${b.qty} ${form.uom})`, value: i }))" 
                    @update:model-value="(val: any) => onBatchChange(val)"
                    block
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField label="Current Batch No">
                  <UInput v-model="form.batch" placeholder="Lot / Batch ID" block icon="i-lucide-layers" />
                </UFormField>
                <UFormField label="Expiry Date">
                  <UInput v-model="form.expiryDate" type="date" block icon="i-lucide-calendar-off" />
                </UFormField>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField label="Stock Quantity" required>
                  <UInput v-model="form.qty" type="number" step="0.01" block icon="i-lucide-box" />
                </UFormField>
                <UFormField label="Unit of Measure (UOM)" required>
                  <USelect v-model="form.uom" :items="uomOptions" block icon="i-lucide-ruler" />
                </UFormField>
              </div>
            </section>
          </div>
        </div>

        <!-- Enterprise Footer -->
        <div class="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div class="text-[10px] text-gray-400 font-mono uppercase">
            ID: {{ form._id || 'NEW_RECORD' }}
          </div>
          <div class="flex gap-3">
            <UButton
              color="neutral"
              variant="outline"
              label="Cancel"
              class="px-6"
              @click="isOpen = false"
            />
            <UButton
              color="primary"
              :label="mode === 'create' ? 'Register Stock Item' : 'Synchronize Changes'"
              :loading="loading"
              class="px-8 font-bold shadow-lg shadow-primary-500/20"
              @click="save"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
