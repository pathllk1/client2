<template>
  <div class="p-6 w-full mx-auto">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Invoices & Notes</h1>
        <p class="text-gray-600 mt-1">Manage sales, purchases, and returns</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="$router.push('/accounting/purchases/new')"
          class="px-4 py-2 bg-white border border-green-600 text-green-700 rounded-lg shadow-sm hover:bg-green-50 flex items-center font-semibold"
        >
          + Purchase
        </button>
        <button
          @click="$router.push('/accounting/sales/new')"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 flex items-center font-semibold"
        >
          + Sales Invoice
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
       <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Type</label>
          <select v-model="filters.btype" @change="fetchBills(filters)" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
             <option value="">All Transactions</option>
             <option value="SALES">Sales Invoices</option>
             <option value="PURCHASE">Purchase Bills</option>
             <option value="CREDIT_NOTE">Credit Notes (Returns)</option>
             <option value="DEBIT_NOTE">Debit Notes (Returns)</option>
          </select>
       </div>
       <div class="w-64">
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Search Party</label>
          <input type="text" v-model="partySearch" placeholder="Search by name..." class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
       </div>
       <div class="flex space-x-2">
         <button
           @click="exportExcel"
           class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 flex items-center font-semibold text-sm h-10 transition-colors"
           title="Export Filtered Bills to Excel"
         >
           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
           </svg>
           Export Excel
         </button>
         <button
           @click="exportPDF"
           class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 flex items-center font-semibold text-sm h-10 transition-colors"
           title="Export Filtered Bills to PDF Report"
         >
           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
           </svg>
           Export PDF
         </button>
       </div>
    </div>

    <!-- Bills Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <th class="px-6 py-4 font-semibold">Bill Info</th>
              <th class="px-6 py-4 font-semibold">Party Name</th>
              <th class="px-6 py-4 font-semibold">Status</th>
              <th class="px-6 py-4 font-semibold text-right">Taxable</th>
              <th class="px-6 py-4 font-semibold text-right">Total Tax</th>
              <th class="px-6 py-4 font-semibold text-right">Net Amount</th>
              <th class="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="bill in filteredBills" :key="bill._id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <div class="font-bold text-gray-900">{{ bill.bno }}</div>
                <div class="text-[10px] uppercase font-bold tracking-widest mt-0.5" :class="getTypeColor(bill.btype)">{{ bill.btype }}</div>
                <div class="text-xs text-gray-400 mt-1">{{ formatDate(bill.bdate) }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-gray-800">{{ bill.partyName }}</div>
                <div class="text-[10px] text-gray-400 mt-0.5">{{ bill.partyGstin || 'UNREGISTERED' }}</div>
              </td>
              <td class="px-6 py-4">
                 <span :class="bill.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" class="px-2 py-1 rounded text-[10px] font-bold">
                    {{ bill.status }}
                 </span>
              </td>
              <td class="px-6 py-4 text-right text-gray-600">₹{{ (bill.grossTotal || 0).toLocaleString() }}</td>
              <td class="px-6 py-4 text-right text-gray-600">₹{{ ((bill.cgst || 0) + (bill.sgst || 0) + (bill.igst || 0)).toLocaleString() }}</td>
              <td class="px-6 py-4 text-right font-bold text-gray-900">₹{{ (bill.netTotal || 0).toLocaleString() }}</td>
              <td class="px-6 py-4 text-center">
                 <div class="flex justify-center space-x-2">
                    <button @click="viewBillDetails(bill._id)" class="p-1 text-gray-400 hover:text-indigo-600" title="View Details">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                       </svg>
                    </button>
                    <button @click="downloadPDF(bill)" class="p-1 text-gray-400 hover:text-blue-600" title="View PDF">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 2.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                    </button>
                    <button v-if="bill.status === 'ACTIVE' && (bill.btype === 'SALES' || bill.btype === 'PURCHASE')" @click="handleReturn(bill)" class="p-1 text-gray-400 hover:text-amber-600" title="Return / Credit Note">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                       </svg>
                    </button>
                    <button v-if="bill.status === 'ACTIVE'" @click="handleCancel(bill._id)" class="p-1 text-gray-400 hover:text-red-600" title="Cancel Bill">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                    </button>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BillDetailsModal
      v-model="showDetailsModal"
      :billId="selectedBillId"
      @cancelled="fetchBills(filters)"
      @view-bill="viewBillDetails"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useBilling } from '@/composables/useBilling';
import { api } from '@/utils/api';
import BillDetailsModal from '@/components/accounting/BillDetailsModal.vue';

const router = useRouter();
const { bills, fetchBills } = useBilling();

const selectedBillId = ref<string | null>(null);
const showDetailsModal = ref(false);

function viewBillDetails(id: string) {
  selectedBillId.value = id;
  showDetailsModal.value = true;
}

const filters = reactive({
  btype: ''
});
const partySearch = ref('');

onMounted(() => {
  fetchBills(filters);
});

const filteredBills = computed(() => {
  if (!partySearch.value) return bills.value;
  const q = partySearch.value.toLowerCase();
  return bills.value.filter(b => b.partyName.toLowerCase().includes(q));
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTypeColor(type: string) {
  const map: any = {
    'SALES': 'text-blue-600',
    'PURCHASE': 'text-green-600',
    'CREDIT_NOTE': 'text-purple-600',
    'DEBIT_NOTE': 'text-orange-600'
  };
  return map[type] || 'text-gray-600';
}

function handleReturn(bill: any) {
  const path = bill.btype === 'SALES' ? '/accounting/sales/new' : '/accounting/purchases/new';
  router.push({ path, query: { returnFrom: bill._id } });
}

async function handleCancel(id: string) {
  if (!confirm('Are you sure you want to cancel this bill? This will reverse all stock and ledger effects.')) return;
  try {
    await api.post(`/accounting/bills/${id}/cancel`, { reason: 'User requested cancellation' });
    fetchBills(filters);
  } catch (err) {
    alert('Cancellation failed');
  }
}

async function downloadPDF(bill: any) {
  try {
    const blob = await api.get(`/accounting/bills/${bill._id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_${bill.bno}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('PDF download failed.');
  }
}

async function exportPDF() {
  try {
    const params: any = {};
    if (filters.btype) params.btype = filters.btype;
    if (partySearch.value) params.searchTerm = partySearch.value;

    const blob = await api.get('/accounting/bills/export/pdf', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bills_Report.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('PDF export failed.');
  }
}

async function exportExcel() {
  try {
    const params: any = {};
    if (filters.btype) params.btype = filters.btype;

    const blob = await api.get('/accounting/bills/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bills_Export.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Excel export failed.');
  }
}
</script>
