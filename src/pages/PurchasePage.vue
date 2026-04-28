<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { apiFetch } from '../utils/api';
import { useRouter } from 'vue-router';
import PartySelectModal from '../components/inventory/PartySelectModal.vue';
import ItemSelectModal from '../components/inventory/ItemSelectModal.vue';
import OtherChargesModal from '../components/inventory/OtherChargesModal.vue';
import OtherChargesTable from '../components/inventory/OtherChargesTable.vue';
import StockCrudModal from '../components/inventory/StockCrudModal.vue';
import BatchSelectModal from '../components/inventory/BatchSelectModal.vue';

const router = useRouter();

// Modals
const partySelectModal = ref<any>(null);
const itemSelectModal = ref<any>(null);
const otherChargesModal = ref<any>(null);
const stockCrudModal = ref<any>(null);
const batchSelectModal = ref<any>(null);
const activeItemIndex = ref<number | null>(null);

interface OtherCharge {
  name: string;
  hsnSac?: string;
  type: 'Add' | 'Subtract';
  amount: number;
  gstRate: number;
}

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
  grate: number;
  qty: number;
  rate: number;
  batches: Batch[];
}

interface CartItem {
  stockId: string;
  item: string;
  hsn: string;
  uom: string;
  qty: number;
  rate: number;
  grate: number;
  disc: number;
  batch: string;
  mrp: number;
  expiry: string;
  total: number;
  narration: string;
}

interface Party {
  _id: string;
  firm: string;
  gstin: string;
  addr: string;
  state: string;
  state_code: string;
  pin: string;
  gstLocations?: any[];
}

const loading = ref(false);
const stocks = ref<StockItem[]>([]);
const parties = ref<Party[]>([]);
const nextBillNo = ref('');
const firmDetails = ref<any>(null);

const meta = ref({
  billNo: '',
  billDate: new Date().toISOString().split('T')[0],
  supplierBillNo: '',
  referenceNo: '',
  billType: 'intra-state', // default
  reverseCharge: false,
  vehicleNo: '',
  dispatchThrough: '',
  narration: '',
  firmGstin: '',
  partyGstin: ''
});

const selectedPartyId = ref<string | undefined>(undefined);
const selectedParty = computed(() => parties.value.find(p => p._id === selectedPartyId.value) || null);
const cart = ref<CartItem[]>([]);
const otherCharges = ref<OtherCharge[]>([]);

// New Party Modal
const isNewPartyModalOpen = ref(false);
const newParty = ref({
  firm: '',
  gstin: '',
  addr: '',
  state: 'Maharashtra',
  state_code: '27'
});

// Initialization
onMounted(async () => {
  await Promise.all([
    fetchStocks(),
    fetchParties(),
    fetchFirmDetails(),
    fetchNextBillNo()
  ]);
});

const fetchStocks = async () => {
  const res = await apiFetch('/inventory/purchase/stocks');
  const result = await res.json();
  if (result.success) stocks.value = result.data;
};

const fetchParties = async () => {
  const res = await apiFetch('/inventory/purchase/parties');
  const result = await res.json();
  if (result.success) parties.value = result.data;
};

const fetchFirmDetails = async () => {
  const res = await apiFetch('/inventory/purchase/current-firm');
  const result = await res.json();
  if (result.success) {
    firmDetails.value = result.data;
    if (firmDetails.value.locations?.length > 0) {
      const defaultLoc = firmDetails.value.locations.find((l: any) => l.is_default) || firmDetails.value.locations[0];
      meta.value.firmGstin = defaultLoc.gst_number;
    }
  }
};

const fetchNextBillNo = async () => {
  const res = await apiFetch('/inventory/purchase/next-bill-number');
  const result = await res.json();
  if (result.success) {
    nextBillNo.value = result.nextBillNumber;
    meta.value.billNo = result.nextBillNumber;
  }
};

// Calculations
const subTotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.total, 0);
});

const taxDetails = computed(() => {
  let cgst = 0, sgst = 0, igst = 0;
  const isInterState = meta.value.billType === 'inter-state' || meta.value.billType === 'INTER-STATE';

  cart.value.forEach(item => {
    const tax = item.total * (item.grate / 100);
    if (isInterState) {
      igst += tax;
    } else {
      cgst += tax / 2;
      sgst += tax / 2;
    }
  });

  // Apply taxes on other charges
  otherCharges.value.forEach(charge => {
    const tax = charge.amount * (charge.gstRate / 100);
    const sign = charge.type === 'Add' ? 1 : -1;
    if (isInterState) {
      igst += (tax * sign);
    } else {
      cgst += (tax * sign) / 2;
      sgst += (tax * sign) / 2;
    }
  });

  return { cgst, sgst, igst };
});

const otherChargesTotal = computed(() => {
  return otherCharges.value.reduce((sum, c) => {
    const amount = (parseFloat(c.amount as any) || 0);
    return sum + (c.type === 'Add' ? amount : -amount);
  }, 0);
});

const grossTotal = computed(() => subTotal.value + otherChargesTotal.value + taxDetails.value.cgst + taxDetails.value.sgst + taxDetails.value.igst);
const roundOff = computed(() => Math.round(grossTotal.value) - grossTotal.value);
const netTotal = computed(() => Math.round(grossTotal.value));


const openStockCreate = () => {
  stockCrudModal.value?.open();
};

const onStockSaved = async () => {
  await fetchStocks();
};

const createParty = async () => {
  if (!newParty.value.firm) {
    alert('Firm name is required');
    return;
  }
  try {
    const res = await apiFetch('/inventory/purchase/parties', {
      method: 'POST',
      body: JSON.stringify(newParty.value)
    });
    const result = await res.json();
    if (result.success) {
      await fetchParties();
      isNewPartyModalOpen.value = false;
      newParty.value = { firm: '', gstin: '', addr: '', state: 'Maharashtra', state_code: '27' };
    } else {
      alert(result.error || 'Failed to create party');
    }
  } catch (err) {
    console.error(err);
    alert('Error creating party');
  }
};

// Actions
const openPartySelect = () => {
  partySelectModal.value?.open();
};

const onPartySelect = (party: any) => {
  selectedPartyId.value = party._id;
};

const openItemSelect = (index: number) => {
  activeItemIndex.value = index;
  itemSelectModal.value?.open();
};

const onItemSelected = (stock: any) => {
  if (activeItemIndex.value !== null) {
    const row = cart.value[activeItemIndex.value];
    if (row) {
      row.stockId = stock._id;
      row.item = stock.item;
      row.hsn = stock.hsn;
      row.uom = stock.uom;
      row.grate = stock.grate || 18;
      row.rate = stock.rate;
      row.batch = stock.batch || '';
      row.mrp = stock.mrp || 0;
      row.expiry = stock.expiry || '';
      updateLineTotal(activeItemIndex.value);
    }
    activeItemIndex.value = null;
  }
};

const openBatchSelect = (stock: any) => {
  batchSelectModal.value?.open(stock);
};

const onBatchSelected = (stockWithBatch: any) => {
    onItemSelected(stockWithBatch);
};

const addOtherCharge = (charge: OtherCharge) => {
  otherCharges.value.push(charge);
};

const removeOtherCharge = (index: number) => {
  otherCharges.value.splice(index, 1);
};

const addItem = () => {
  cart.value.push({
    stockId: '',
    item: '',
    hsn: '',
    uom: 'PCS',
    qty: 0,
    rate: 0,
    grate: 18,
    disc: 0,
    batch: '',
    mrp: 0,
    expiry: '',
    total: 0,
    narration: ''
  });
};

const removeItem = (index: number) => {
  cart.value.splice(index, 1);
};

const onStockSelect = (index: number, stockId: string) => {
  const stock = stocks.value.find(s => s._id === stockId);
  const row = cart.value[index];
  if (stock && row) {
    row.stockId = stock._id;
    row.item = stock.item;
    row.hsn = stock.hsn;
    row.uom = stock.uom;
    row.grate = stock.grate || 18;
    row.rate = stock.rate;
    updateLineTotal(index);
  }
};

const updateLineTotal = (index: number) => {
  const item = cart.value[index];
  if (item) {
    item.total = item.qty * item.rate * (1 - (item.disc / 100));
  }
};

const saveBill = async () => {
  if (!selectedPartyId.value) {
    alert('Please select a party');
    return;
  }
  if (cart.value.length === 0) {
    alert('Cart is empty');
    return;
  }

  loading.value = true;
  try {
    const payload = {
      meta: meta.value,
      party: selectedPartyId.value,
      cart: cart.value,
      otherCharges: otherCharges.value,
      consignee: null // Optional for now
    };

    const res = await apiFetch('/inventory/purchase/bills', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      alert('Purchase recorded successfully');
      router.push('/inventory');
    } else {
      alert(result.error || 'Failed to save');
    }
  } catch (err) {
    console.error(err);
    alert('Error saving bill');
  } finally {
    loading.value = false;
  }
};

// Auto-detect Intra vs Inter state
watch([selectedParty, () => meta.value.firmGstin], () => {
  if (selectedParty.value && meta.value.firmGstin) {
    const firmStateCode = meta.value.firmGstin.substring(0, 2);
    const partyStateCode = selectedParty.value.gstin ? selectedParty.value.gstin.substring(0, 2) : selectedParty.value.state_code;
    
    if (firmStateCode === partyStateCode) {
      meta.value.billType = 'intra-state';
    } else {
      meta.value.billType = 'inter-state';
    }
  }
});
</script>

<template>
  <div class="space-y-6 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-arrow-left" variant="ghost" @click="router.push('/inventory')" />
        <h1 class="text-2xl font-bold">New Purchase Bill</h1>
      </div>
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" icon="i-lucide-x" label="Cancel" @click="router.push('/inventory')" />
        <UButton color="primary" icon="i-lucide-save" label="Save Purchase" :loading="loading" @click="saveBill" />
      </div>
    </div>

    <!-- Bill Header -->
    <UCard shadow="sm">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UFormField label="Supplier (Party)" required>
          <div class="flex gap-1">
            <UButton
              variant="outline"
              color="neutral"
              block
              class="justify-start font-normal overflow-hidden"
              @click="openPartySelect"
            >
              <span v-if="selectedParty" class="truncate">{{ selectedParty.firm }}</span>
              <span v-else class="text-gray-400">Select Supplier...</span>
            </UButton>
          </div>
        </UFormField>
        <UFormField label="Bill Date">
          <UInput v-model="meta.billDate" type="date" />
        </UFormField>
        <UFormField label="Supplier Bill No.">
          <UInput v-model="meta.supplierBillNo" placeholder="As per Invoice" />
        </UFormField>
        <UFormField label="Bill Number">
          <UInput v-model="meta.billNo" readonly variant="soft" />
        </UFormField>
      </div>

      <div v-if="selectedParty" class="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span class="text-gray-500 block">GSTIN</span>
          <span class="font-bold">{{ selectedParty.gstin || 'UNREGISTERED' }}</span>
        </div>
        <div>
          <span class="text-gray-500 block">Address</span>
          <span class="font-medium line-clamp-1">{{ selectedParty.addr }}</span>
        </div>
        <div>
          <span class="text-gray-500 block">State</span>
          <span class="font-medium">{{ selectedParty.state }} ({{ selectedParty.state_code }})</span>
        </div>
      </div>
    </UCard>

    <!-- Item Cart -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h3 class="font-bold uppercase tracking-wider text-xs text-gray-500">Purchase Items</h3>
            <UButton icon="i-lucide-package-plus" size="xs" variant="ghost" color="primary" label="Quick Add New Stock" @click="openStockCreate" />
          </div>
          <UButton icon="i-lucide-plus" size="xs" label="Add Item Row" @click="addItem" />
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left border-collapse">
          <thead class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="px-4 py-3 font-semibold w-64">Item Description</th>
              <th class="px-4 py-3 font-semibold w-32">Batch</th>
              <th class="px-4 py-3 font-semibold w-24">Qty</th>
              <th class="px-4 py-3 font-semibold w-24">UOM</th>
              <th class="px-4 py-3 font-semibold w-32">Rate</th>
              <th class="px-4 py-3 font-semibold w-24">Disc %</th>
              <th class="px-4 py-3 font-semibold w-24">GST %</th>
              <th class="px-4 py-3 font-semibold text-right">Total</th>
              <th class="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="(item, index) in cart" :key="index">
              <td class="px-2 py-2">
                <UButton
                  variant="ghost"
                  color="neutral"
                  block
                  size="sm"
                  class="justify-start font-normal"
                  @click="openItemSelect(index)"
                >
                  <span v-if="item.item" class="truncate">{{ item.item }}</span>
                  <span v-else class="text-gray-400">Select Item...</span>
                </UButton>
              </td>
              <td class="px-2 py-2">
                <UInput v-model="item.batch" size="sm" placeholder="Batch No" />
              </td>
              <td class="px-2 py-2">
                <UInput v-model="item.qty" type="number" size="sm" @update:model-value="updateLineTotal(index)" />
              </td>
              <td class="px-2 py-2">
                <UInput v-model="item.uom" size="sm" readonly variant="ghost" />
              </td>
              <td class="px-2 py-2">
                <UInput v-model="item.rate" type="number" size="sm" @update:model-value="updateLineTotal(index)" />
              </td>
              <td class="px-2 py-2">
                <UInput v-model="item.disc" type="number" size="sm" @update:model-value="updateLineTotal(index)" />
              </td>
              <td class="px-2 py-2">
                <UInput v-model="item.grate" type="number" size="sm" />
              </td>
              <td class="px-4 py-2 text-right font-medium">
                {{ item.total.toFixed(2) }}
              </td>
              <td class="px-2 py-2">
                <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="removeItem(index)" />
              </td>
            </tr>
            <tr v-if="cart.length === 0">
              <td colspan="9" class="px-4 py-8 text-center text-gray-400 italic">
                No items added to cart. Click "Add Item" to begin.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Totals and Summary -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold uppercase tracking-wider text-xs text-gray-500">Other Charges</h3>
              <UButton icon="i-lucide-plus" size="xs" color="neutral" variant="ghost" label="Add Charge" @click="otherChargesModal?.open()" />
            </div>
          </template>
          <OtherChargesTable :charges="otherCharges" :is-inter-state="meta.billType !== 'intra-state'" @remove="removeOtherCharge" />
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-bold uppercase tracking-wider text-xs text-gray-500">Dispatch Details</h3>
          </template>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Vehicle No.">
              <UInput v-model="meta.vehicleNo" placeholder="MH-XX-XX-XXXX" />
            </UFormField>
            <UFormField label="Dispatch Through">
              <UInput v-model="meta.dispatchThrough" placeholder="Transport Name" />
            </UFormField>
            <UFormField label="Narration" class="col-span-2">
              <UTextarea v-model="meta.narration" :rows="2" placeholder="Internal notes..." />
            </UFormField>
          </div>
        </UCard>
      </div>

      <UCard class="bg-gray-50 dark:bg-gray-800/50">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Sub-Total (Taxable)</span>
            <span class="font-medium">₹{{ subTotal.toFixed(2) }}</span>
          </div>
          <div v-if="taxDetails.cgst > 0" class="flex justify-between">
            <span class="text-gray-500">CGST</span>
            <span class="font-medium">₹{{ taxDetails.cgst.toFixed(2) }}</span>
          </div>
          <div v-if="taxDetails.sgst > 0" class="flex justify-between">
            <span class="text-gray-500">SGST</span>
            <span class="font-medium">₹{{ taxDetails.sgst.toFixed(2) }}</span>
          </div>
          <div v-if="taxDetails.igst > 0" class="flex justify-between">
            <span class="text-gray-500">IGST</span>
            <span class="font-medium">₹{{ taxDetails.igst.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span class="text-gray-500">Other Charges</span>
            <span class="font-medium">₹{{ otherChargesTotal.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Round Off</span>
            <span class="font-medium">{{ roundOff.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
            <span class="text-xl font-extrabold">Net Total</span>
            <span class="text-xl font-extrabold text-primary">₹{{ netTotal.toFixed(2) }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Modals -->
    <PartySelectModal
      ref="partySelectModal"
      :parties="parties"
      @select="onPartySelect"
      @create="isNewPartyModalOpen = true"
    />

    <ItemSelectModal
      ref="itemSelectModal"
      :stocks="stocks"
      @select="onItemSelected"
      @select-batch="openBatchSelect"
      @create="openStockCreate"
    />

    <BatchSelectModal
      ref="batchSelectModal"
      @select="onBatchSelected"
    />

    <OtherChargesModal
      ref="otherChargesModal"
      @add="addOtherCharge"
    />

    <StockCrudModal
      ref="stockCrudModal"
      mode="create"
      @saved="onStockSaved"
    />

    <!-- Quick Party Creation Modal -->
    <UModal v-model:open="isNewPartyModalOpen" title="Create New Party" description="Register a new supplier or customer.">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Firm Name" required>
            <UInput v-model="newParty.firm" placeholder="e.g. Acme Corp" block />
          </UFormField>
          <UFormField label="GSTIN">
            <UInput v-model="newParty.gstin" placeholder="15-digit GSTIN" block />
          </UFormField>
          <UFormField label="Address">
            <UTextarea v-model="newParty.addr" placeholder="Full address..." :rows="2" block />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="State">
              <UInput v-model="newParty.state" block />
            </UFormField>
            <UFormField label="State Code">
              <UInput v-model="newParty.state_code" block />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="isNewPartyModalOpen = false" />
          <UButton color="primary" label="Create Party" @click="createParty" />
        </div>
      </template>
    </UModal>
  </div>
</template>
