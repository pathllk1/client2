<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-scale-in">
       <header class="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 text-white flex justify-between items-center">
          <div>
             <h2 class="text-2xl font-black uppercase tracking-tighter">Create New Party</h2>
             <p class="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Register a new customer or supplier</p>
          </div>
          <button @click="$emit('update:modelValue', false)" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
       </header>

       <form @submit.prevent="saveParty" class="p-8 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div class="md:col-span-2">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Party / Firm Name *</label>
                <input type="text" v-model="form.name" required class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold" />
             </div>

             <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">GSTIN Number</label>
                <div class="flex gap-2">
                   <input type="text" v-model="form.gstin" maxlength="15" class="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-mono font-bold uppercase" placeholder="27ABCDE1234F1Z5" />
                   <button type="button" @click="fetchGstDetails" :disabled="form.gstin.length !== 15 || fetchingGst" class="px-4 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 disabled:opacity-50 transition-all">
                      <span v-if="fetchingGst" class="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin inline-block"></span>
                      <span v-else>Fetch</span>
                   </button>
                </div>
             </div>

             <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Contact Number</label>
                <input type="text" v-model="form.contact" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold" />
             </div>

             <div class="md:col-span-2">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Address</label>
                <textarea v-model="form.address" rows="2" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm resize-none"></textarea>
             </div>

             <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">State *</label>
                <input type="text" v-model="form.state" required class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold" />
             </div>

             <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Party Type</label>
                <select v-model="form.partyType" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold appearance-none">
                   <option value="CUSTOMER">Customer</option>
                   <option value="SUPPLIER">Supplier</option>
                   <option value="BOTH">Both (Customer & Supplier)</option>
                </select>
             </div>
          </div>

          <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
             <button type="button" @click="$emit('update:modelValue', false)" class="px-6 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors">Discard</button>
             <button type="submit" :disabled="saving" class="px-10 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2">
                <span v-if="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Register Party
             </button>
          </div>
       </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { api } from '@/utils/api';
import { INDIA_STATE_CODES } from '@/composables/useBillingState';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const form = reactive({
  name: '',
  gstin: '',
  contact: '',
  state: '',
  stateCode: '',
  address: '',
  pin: '',
  pan: '',
  partyType: 'CUSTOMER',
  openingBalance: 0,
  balanceType: 'DR'
});

const fetchingGst = ref(false);
const saving = ref(false);

watch(() => form.gstin, (val) => {
  if (val.length >= 2 && /^\d{2}/.test(val)) {
    form.stateCode = val.substring(0, 2);
  }
  if (val.length >= 12) {
    form.pan = val.substring(2, 12);
  }
});

async function fetchGstDetails() {
  fetchingGst.value = true;
  try {
    const res = await api.get(`/accounting/gst/lookup?gstin=${form.gstin}`);
    if (res.data.success) {
      const data = res.data.data;
      form.name = data.trade_name || data.legal_name || form.name;
      form.state = data.place_of_business_principal?.address?.state || data.state_jurisdiction || form.state;
      const stateParts = form.state.split(' - ');
      if (stateParts[0]) form.state = stateParts[0].trim();
      
      const addr = data.place_of_business_principal?.address;
      if (addr) {
        form.address = [addr.door_num, addr.building_name, addr.street, addr.location, addr.city, addr.district].filter(Boolean).join(', ');
        form.pin = addr.pin_code || '';
      }
    }
  } catch (err) {
    console.error('GST lookup failed', err);
  } finally {
    fetchingGst.value = false;
  }
}

async function saveParty() {
  saving.value = true;
  try {
    const res = await api.post('/accounting/parties', form);
    if (res.data.success) {
      emit('saved', res.data.data);
      emit('update:modelValue', false);
      Object.assign(form, { name: '', gstin: '', contact: '', state: '', stateCode: '', address: '', pin: '', pan: '', partyType: 'CUSTOMER' });
    }
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to save party');
  } finally {
    saving.value = false;
  }
}
</script>
