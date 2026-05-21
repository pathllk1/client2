<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-scale-in">
       <header class="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6 text-white flex justify-between items-center">
          <div>
             <h2 class="text-2xl font-black uppercase tracking-tighter">Create New Stock Item</h2>
             <p class="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Add a new physical item to your inventory</p>
          </div>
          <button @click="$emit('update:modelValue', false)" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
       </header>

       <form @submit.prevent="saveStock" class="p-8 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div class="md:col-span-2">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Item Name *</label>
                <input type="text" v-model="form.item" required class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" placeholder="e.g. Engine Oil 5W-30" />
             </div>

             <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">HSN Code *</label>
                <input type="text" v-model="form.hsn" required class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono font-bold uppercase" />
             </div>

             <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Unit of Measure (UOM)</label>
                <input type="text" v-model="form.uom" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold uppercase" placeholder="PCS, BOX, LTR..." />
             </div>

             <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Default GST %</label>
                <input type="number" v-model="form.grate" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" />
             </div>

             <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Initial Rate (WAC)</label>
                <input type="number" v-model="form.rate" class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" />
             </div>
          </div>

          <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
             <button type="button" @click="$emit('update:modelValue', false)" class="px-6 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors">Discard</button>
             <button type="submit" :disabled="saving" class="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                <span v-if="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Add to Inventory
             </button>
          </div>
       </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { api } from '@/utils/api';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const form = reactive({
  item: '',
  hsn: '',
  uom: 'pcs',
  grate: 18,
  rate: 0,
  qty: 0,
  total: 0
});

const saving = ref(false);

async function saveStock() {
  saving.value = true;
  try {
    // In a real system, we'd call a POST /inventory/stock endpoint
    // For now, simulating success as the backend stock creation logic was implemented earlier
    const res = await api.post('/inventory/movements', {
       type: 'OPENING',
       item: form.item,
       hsn: form.hsn,
       qty: form.qty || 0,
       rate: form.rate,
       grate: form.grate,
       uom: form.uom
    });
    
    if (res.data.success) {
      emit('saved');
      emit('update:modelValue', false);
      Object.assign(form, { item: '', hsn: '', uom: 'pcs', grate: 18, rate: 0 });
    }
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to create stock item');
  } finally {
    saving.value = false;
  }
}
</script>
