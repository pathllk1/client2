<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
    <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-scale-in flex flex-col">
       <header class="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white flex justify-between items-center shrink-0">
          <div>
             <h2 class="text-2xl font-black uppercase tracking-tighter">{{ editData ? 'Edit Bank Account' : 'Register New Bank Account' }}</h2>
             <p class="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Configure physical banking channel for firm transactions</p>
          </div>
          <button @click="$emit('update:modelValue', false)" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
       </header>

       <div class="overflow-y-auto p-8 flex-1">
         <form @submit.prevent="saveAccount" id="bank-form" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div class="md:col-span-2">
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Internal Account Name *</label>
                  <input type="text" v-model="form.account_name" required placeholder="e.g. Main Current Account" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold" />
               </div>

               <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">IFSC Code *</label>
                  <div class="relative">
                    <input type="text" v-model="form.ifsc_code" required maxlength="11" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-mono font-bold uppercase" placeholder="SBIN0001234" />
                    <div v-if="fetchingIfsc" class="absolute right-3 top-1/2 -translate-y-1/2">
                       <span class="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin inline-block"></span>
                    </div>
                  </div>
               </div>

               <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Bank Name *</label>
                  <input type="text" v-model="form.bank_name" required placeholder="Fetched from IFSC" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold" />
               </div>

               <div class="md:col-span-2">
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Branch Name</label>
                  <input type="text" v-model="form.branch_name" placeholder="Branch location" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold" />
               </div>

               <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Number *</label>
                  <input type="text" v-model="form.account_number" required class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-mono font-bold" />
               </div>

               <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Type</label>
                  <select v-model="form.account_type" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold appearance-none">
                     <option value="CURRENT">Current Account</option>
                     <option value="SAVINGS">Savings Account</option>
                     <option value="OD">Overdraft (OD)</option>
                     <option value="CC">Cash Credit (CC)</option>
                     <option value="OTHER">Other</option>
                  </select>
               </div>

               <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status</label>
                  <select v-model="form.status" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold appearance-none">
                     <option value="ACTIVE">Active</option>
                     <option value="INACTIVE">Inactive</option>
                  </select>
               </div>

               <div class="md:col-span-1">
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Holder Name</label>
                  <input type="text" v-model="form.account_holder_name" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold" />
               </div>

               <div class="md:col-span-2">
                  <label class="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border-2 border-blue-100 cursor-pointer group transition-all hover:bg-blue-100">
                     <input type="checkbox" v-model="form.is_default" class="w-5 h-5 text-blue-600 rounded-lg border-blue-300 focus:ring-blue-500" />
                     <div>
                        <p class="text-sm font-black text-blue-900 uppercase tracking-tight">Set as Primary Account</p>
                        <p class="text-[10px] font-bold text-blue-600 uppercase">Used by default for all new payments and receipts</p>
                     </div>
                  </label>
               </div>
            </div>
         </form>
       </div>

       <footer class="p-8 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button type="button" @click="$emit('update:modelValue', false)" class="px-6 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors">Discard</button>
          <button type="submit" form="bank-form" :disabled="saving" class="px-10 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3">
             <span v-if="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
             {{ editData ? 'Update Account' : 'Register Account' }}
          </button>
       </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { api } from '@/utils/api';

const props = defineProps<{
  modelValue: boolean;
  editData?: any;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const saving = ref(false);
const fetchingIfsc = ref(false);

const form = reactive({
  account_name: '',
  account_holder_name: '',
  bank_name: '',
  branch_name: '',
  account_number: '',
  ifsc_code: '',
  account_type: 'CURRENT',
  upi_id: '',
  notes: '',
  is_default: false,
  status: 'ACTIVE',
});

// IFSC Lookup logic reused from Master Roll
watch(() => form.ifsc_code, async (newVal) => {
  if (newVal && newVal.length === 11) {
    fetchingIfsc.value = true;
    try {
      // Reusing the same endpoint used in MasterRollForm.vue
      const res = await api.get(`/master-rolls/lookup/ifsc/${newVal}`);
      if (res.success) {
        form.bank_name = res.data.BANK;
        form.branch_name = res.data.BRANCH;
        
        // Auto-generate account name if empty
        if (!form.account_name) {
          form.account_name = `${res.data.BANK} - ${form.account_type}`;
        }
      }
    } catch (err) {
      console.warn('IFSC lookup failed', err);
    } finally {
      fetchingIfsc.value = false;
    }
  }
});

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.editData) {
      Object.assign(form, props.editData);
    } else {
      resetForm();
    }
  }
});

async function saveAccount() {
  saving.value = true;
  try {
    const url = props.editData ? `/banking/${props.editData._id}` : '/banking';
    const method = props.editData ? 'PUT' : 'POST';
    
    const res = await (method === 'PUT' ? api.put(url, form) : api.post(url, form));
    
    if (res.success) {
      emit('saved');
      emit('update:modelValue', false);
    }
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to save bank account');
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    account_name: '',
    account_holder_name: '',
    bank_name: '',
    branch_name: '',
    account_number: '',
    ifsc_code: '',
    account_type: 'CURRENT',
    upi_id: '',
    notes: '',
    is_default: false,
    status: 'ACTIVE',
  });
}
</script>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
