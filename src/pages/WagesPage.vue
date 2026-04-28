<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { apiFetch } from '../utils/api';
import { useAuth } from '../composables/useAuth';

const auth = useAuth();

interface WageEntry {
  master_roll_id: string;
  employee_name: string;
  aadhar: string;
  bank: string;
  account_no: string;
  p_day_wage: number;
  wage_days: number;
  gross_salary: number;
  epf_deduction: number;
  esic_deduction: number;
  other_deduction: number;
  other_benefit: number;
  advance_deduction: number;
  net_salary: number;
  remarks?: string;
  project?: string;
  site?: string;
}

const activeTab = ref('process');
const selectedMonth = ref(new Date().toISOString().substring(0, 7)); // YYYY-MM
const eligibleEmployees = ref<WageEntry[]>([]);
const existingWages = ref<any[]>([]);
const loading = ref(false);
const bankAccounts = ref<any[]>([]);

// Payment Batch Details
const paymentDetails = ref({
  paid_date: new Date().toISOString().split('T')[0],
  paid_from_bank_ac: '',
  cheque_no: '',
  payment_method: 'Bank Transfer'
});

const paymentMethods = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Other'];

// Selection State
const rowSelection = ref<Record<string, boolean>>({});

// Filter State
const filters = ref({
  project: 'All',
  site: 'All',
  bank: 'All'
});

const columns = [
  { id: 'select', header: 'Select' },
  { id: 'employee_name', accessorKey: 'employee_name', header: 'Employee' },
  { id: 'p_day_wage', accessorKey: 'p_day_wage', header: 'Daily Wage' },
  { id: 'wage_days', accessorKey: 'wage_days', header: 'Days' },
  { id: 'gross_salary', accessorKey: 'gross_salary', header: 'Gross' },
  { id: 'epf_deduction', accessorKey: 'epf_deduction', header: 'EPF (12%)' },
  { id: 'esic_deduction', accessorKey: 'esic_deduction', header: 'ESIC (0.75%)' },
  { id: 'other_deduction', accessorKey: 'other_deduction', header: 'Other Ded.' },
  { id: 'advance_deduction', accessorKey: 'advance_deduction', header: 'Adv. Ded.' },
  { id: 'other_benefit', accessorKey: 'other_benefit', header: 'Benefits' },
  { id: 'net_salary', accessorKey: 'net_salary', header: 'Net Salary' },
  { id: 'remarks', accessorKey: 'remarks', header: 'Remarks' }
];

const historyColumns = [
  { id: 'employee_name', accessorKey: 'master_roll_id.employee_name', header: 'Employee' },
  { id: 'wage_days', accessorKey: 'wage_days', header: 'Days' },
  { id: 'gross_salary', accessorKey: 'gross_salary', header: 'Gross' },
  { id: 'epf_deduction', accessorKey: 'epf_deduction', header: 'EPF' },
  { id: 'esic_deduction', accessorKey: 'esic_deduction', header: 'ESIC' },
  { id: 'advance_deduction', accessorKey: 'advance_deduction', header: 'Adv.' },
  { id: 'net_salary', accessorKey: 'net_salary', header: 'Net' },
  { id: 'payment_method', accessorKey: 'payment_method', header: 'Method' },
  { id: 'bank_account', header: 'Firm Bank' },
  { id: 'cheque_no', accessorKey: 'cheque_no', header: 'Ref/Cheque' },
  { id: 'paid_date', accessorKey: 'paid_date', header: 'Paid Date' }
];

// Computed Filter Options
const projectOptions = computed(() => ['All', ...new Set(eligibleEmployees.value.map(e => e.project).filter((p): p is string => !!p))]);
const siteOptions = computed(() => ['All', ...new Set(eligibleEmployees.value.map(e => e.site).filter((s): s is string => !!s))]);
const bankOptions = computed(() => ['All', ...new Set(eligibleEmployees.value.map(e => e.bank).filter((b): b is string => !!b))]);

// Filtered Data
const filteredEmployees = computed(() => {
  return eligibleEmployees.value.filter(emp => {
    const matchProject = filters.value.project === 'All' || emp.project === filters.value.project;
    const matchSite = filters.value.site === 'All' || emp.site === filters.value.site;
    const matchBank = filters.value.bank === 'All' || emp.bank === filters.value.bank;
    return matchProject && matchSite && matchBank;
  });
});

// Computed counts
const selectedCount = computed(() => Object.keys(rowSelection.value).filter(k => rowSelection.value[k]).length);
const totalFilteredCount = computed(() => filteredEmployees.value.length);

const calculateNet = (row: WageEntry) => {
  row.net_salary = Math.round(
    Number(row.gross_salary || 0) - 
    (Number(row.epf_deduction || 0) + Number(row.esic_deduction || 0) + Number(row.other_deduction || 0) + Number(row.advance_deduction || 0)) + 
    Number(row.other_benefit || 0)
  );
};

const updateCalculations = (row: WageEntry) => {
  row.gross_salary = Math.round(row.p_day_wage * row.wage_days);
  const epfCalc = Math.round(row.gross_salary * 0.12);
  row.epf_deduction = Math.min(epfCalc, 1800);
  row.esic_deduction = Math.ceil(row.gross_salary * 0.0075);
  calculateNet(row);
};

const fetchEligible = async () => {
  if (!selectedMonth.value) return;
  loading.value = true;
  rowSelection.value = {};
  try {
    const response = await apiFetch('/wages/employees', {
      method: 'POST',
      body: JSON.stringify({ month: selectedMonth.value })
    });
    const result = await response.json();
    if (result.success) {
      eligibleEmployees.value = result.data.map((emp: any) => {
        const entry = {
          ...emp,
          wage_days: 26,
          gross_salary: 0,
          epf_deduction: 0,
          esic_deduction: 0,
          other_deduction: 0,
          advance_deduction: 0,
          other_benefit: 0,
          net_salary: 0,
          remarks: ''
        };
        updateCalculations(entry);
        return entry;
      });
    }
  } catch (error) {
    console.error('Error fetching eligible employees:', error);
  } finally {
    loading.value = false;
  }
};

const fetchExisting = async () => {
  if (!selectedMonth.value) return;
  loading.value = true;
  try {
    const response = await apiFetch(`/wages/manage?month=${selectedMonth.value}`);
    const result = await response.json();
    if (result.success) {
      existingWages.value = result.data;
    }
  } catch (error) {
    console.error('Error fetching existing wages:', error);
  } finally {
    loading.value = false;
  }
};

const getSelectedWages = () => {
  // Convert TanStack row indices back to our data
  return filteredEmployees.value.filter((_, index) => rowSelection.value[index]);
};

const submitWages = async () => {
  const selectedWages = getSelectedWages();
  if (selectedWages.length === 0) {
    alert('Please select at least one employee');
    return;
  }
  
  loading.value = true;
  try {
    const wagesWithPayment = selectedWages.map(w => ({
      ...w,
      ...paymentDetails.value
    }));

    const response = await apiFetch('/wages/create', {
      method: 'POST',
      body: JSON.stringify({
        month: selectedMonth.value,
        wages: wagesWithPayment
      })
    });
    const result = await response.json();
    if (result.success) {
      alert(`${selectedWages.length} Wages processed successfully`);
      fetchEligible();
    } else {
      alert(result.message || 'Failed to process wages');
    }
  } catch (error) {
    console.error('Error submitting wages:', error);
  } finally {
    loading.value = false;
  }
};

const exportToExcel = async () => {
  const selectedWages = getSelectedWages();
  if (selectedWages.length === 0) {
    alert('Please select records to export');
    return;
  }

  loading.value = true;
  try {
    const response = await apiFetch('/wages/export', {
      method: 'POST',
      body: JSON.stringify({
        month: selectedMonth.value,
        data: selectedWages
      })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Wages_${selectedMonth.value}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      alert('Failed to generate export');
    }
  } catch (error) {
    console.error('Export error:', error);
  } finally {
    loading.value = false;
  }
};

watch(selectedMonth, () => {
  if (activeTab.value === 'process') fetchEligible();
  else fetchExisting();
});

watch(activeTab, (newTab) => {
  if (newTab === 'process') fetchEligible();
  else fetchExisting();
});

const fetchBankAccounts = async () => {
  try {
    const response = await apiFetch('/ledger/bank-accounts?activeOnly=true');
    const result = await response.json();
    if (result.success) {
      bankAccounts.value = result.data.map((ac: any) => ({
        ...ac,
        display_label: `${ac.account_number} (${ac.bank_name})`
      }));
      const defaultAc = result.data.find((ac: any) => ac.is_default);
      if (defaultAc) {
        paymentDetails.value.paid_from_bank_ac = defaultAc._id;
      }
    }
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
  }
};

onMounted(() => {
  fetchEligible();
  fetchBankAccounts();
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold">Wages</h1>
        <UBadge color="neutral" variant="subtle" size="sm">Payroll Processing</UBadge>
        <UInput v-model="selectedMonth" type="month" size="sm" class="ml-4" />
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="activeTab === 'process' && filteredEmployees.length > 0"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-download"
          label="Export"
          :loading="loading"
          @click="exportToExcel"
        />
        <UButton
          v-if="activeTab === 'process' && filteredEmployees.length > 0"
          color="primary"
          size="sm"
          icon="i-lucide-save"
          label="Process Selected"
          :loading="loading"
          @click="submitWages"
        />
      </div>
    </div>

    <div class="flex items-center justify-between gap-4">
      <UTabs v-model="activeTab" :items="[{ label: 'Process Wages', value: 'process' }, { label: 'Wage History', value: 'history' }]" class="w-64" />
      
      <!-- Compact Filters (Inline) -->
      <div v-if="activeTab === 'process'" class="flex items-center gap-2 flex-grow justify-end bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
        <USelect v-model="filters.project" :items="projectOptions" size="sm" icon="i-lucide-folder" placeholder="Project" class="w-32" />
        <USelect v-model="filters.site" :items="siteOptions" size="sm" icon="i-lucide-map-pin" placeholder="Site" class="w-32" />
        <USelect v-model="filters.bank" :items="bankOptions" size="sm" icon="i-lucide-building-2" placeholder="Bank" class="w-32" />
        <UButton
          icon="i-lucide-filter-x"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="filters = { project: 'All', site: 'All', bank: 'All' }"
        />
      </div>
    </div>

    <div v-if="activeTab === 'process'" class="space-y-4">
      <!-- Compact Payment Details Section -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 bg-primary-50/50 dark:bg-primary-950/10 p-3 rounded-xl border border-primary-100 dark:border-primary-900/30">
        <div class="flex items-center gap-2 md:col-span-4 mb-1 text-xs font-bold text-primary uppercase tracking-wider">
          <UIcon name="i-lucide-credit-card" /> Batch Payment Details
        </div>
        <UFormField label="Date" size="sm">
          <UInput v-model="paymentDetails.paid_date" type="date" size="sm" class="w-full" />
        </UFormField>
        <UFormField label="Method" size="sm">
          <USelect v-model="paymentDetails.payment_method" :items="paymentMethods" size="sm" class="w-full" />
        </UFormField>
        <UFormField label="Firm Bank" size="sm">
          <USelect
            v-model="paymentDetails.paid_from_bank_ac"
            :items="bankAccounts"
            value-key="_id"
            label-key="display_label"
            placeholder="Select Account"
            size="sm"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Ref / Cheque" size="sm">
          <UInput v-model="paymentDetails.cheque_no" placeholder="Ref No." size="sm" class="w-full" />
        </UFormField>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <div class="flex items-center justify-between py-1">
            <div class="flex items-center gap-3">
              <h2 class="font-semibold text-sm uppercase tracking-wider text-gray-500">Eligible Employees</h2>
              <UBadge v-if="selectedCount > 0" color="primary" variant="subtle" size="sm">
                {{ selectedCount }} selected
              </UBadge>
            </div>
          </div>
        </template>

        <UTable
          v-model:row-selection="rowSelection"
          :columns="columns"
          :data="filteredEmployees"
          :loading="loading"
        >
          <template #select-header="{ table }">
            <UCheckbox
              :model-value="table.getIsAllPageRowsSelected()"
              :indeterminate="table.getIsSomePageRowsSelected()"
              @update:model-value="(val: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!val)"
            />
          </template>

          <template #select-cell="{ row }">
            <UCheckbox
              :model-value="row.getIsSelected()"
              :disabled="!row.getCanSelect()"
              @update:model-value="(val: boolean | 'indeterminate') => row.toggleSelected(!!val)"
            />
          </template>

          <template #employee_name-cell="{ row }">
            <div class="font-medium text-gray-900 dark:text-white">{{ row.original.employee_name }}</div>
            <div class="text-[10px] text-gray-400">{{ row.original.project }} | {{ row.original.site }}</div>
          </template>

          <template #p_day_wage-cell="{ row }">
            <UInput v-model="row.original.p_day_wage" type="number" class="w-24" @update:model-value="updateCalculations(row.original)" />
          </template>

          <template #wage_days-cell="{ row }">
            <UInput v-model="row.original.wage_days" type="number" step="0.5" class="w-20" @update:model-value="updateCalculations(row.original)" />
          </template>
          
          <template #gross_salary-cell="{ row }">
            <span class="font-semibold">₹{{ row.original.gross_salary }}</span>
          </template>

          <template #epf_deduction-cell="{ row }">
            <UInput v-model="row.original.epf_deduction" type="number" class="w-24" @update:model-value="calculateNet(row.original)" />
          </template>

          <template #esic_deduction-cell="{ row }">
            <UInput v-model="row.original.esic_deduction" type="number" class="w-24" @update:model-value="calculateNet(row.original)" />
          </template>

          <template #other_deduction-cell="{ row }">
            <UInput v-model="row.original.other_deduction" type="number" class="w-24" @update:model-value="calculateNet(row.original)" />
          </template>

          <template #advance_deduction-cell="{ row }">
            <UInput v-model="row.original.advance_deduction" type="number" class="w-24" @update:model-value="calculateNet(row.original)" />
          </template>

          <template #other_benefit-cell="{ row }">
            <UInput v-model="row.original.other_benefit" type="number" class="w-24" @update:model-value="calculateNet(row.original)" />
          </template>

          <template #net_salary-cell="{ row }">
            <span class="font-bold text-primary">₹{{ row.original.net_salary }}</span>
          </template>

          <template #remarks-cell="{ row }">
            <UInput v-model="row.original.remarks" placeholder="Optional" class="w-32" />
          </template>

          <template #loading>
            <div class="flex flex-col items-center justify-center py-10 gap-3">
              <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
              <p class="text-sm text-gray-400">Loading payroll data...</p>
            </div>
          </template>
        </UTable>

        <div v-if="filteredEmployees.length === 0 && !loading" class="flex flex-col items-center justify-center py-12 text-gray-500">
          <UIcon name="i-lucide-users" class="text-4xl mb-2 opacity-20" />
          <p>No eligible employees matching the filters.</p>
        </div>
      </UCard>
    </div>

    <div v-else class="space-y-4">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <h2 class="font-semibold text-sm uppercase tracking-wider text-gray-500">Wage History</h2>
        </template>

        <UTable
          :columns="historyColumns"
          :data="existingWages"
          :loading="loading"
        >
          <template #paid_date-cell="{ row }">
            {{ row.original.paid_date || 'N/A' }}
          </template>
          <template #net_salary-cell="{ row }">
            <span class="font-bold text-success">₹{{ row.original.net_salary }}</span>
          </template>
          <template #payment_method-cell="{ row }">
            <UBadge variant="soft" color="neutral" size="sm">{{ row.original.payment_method || 'N/A' }}</UBadge>
          </template>
          <template #bank_account-cell="{ row }">
            <div v-if="row.original.bank_account_details" class="text-xs">
              <div class="font-medium">{{ row.original.bank_account_details.account_number }}</div>
              <div class="text-gray-400 text-[10px]">{{ row.original.bank_account_details.bank_name }}</div>
            </div>
            <span v-else class="text-gray-400">N/A</span>
          </template>

          <template #loading>
            <div class="flex flex-col items-center justify-center py-10 gap-3">
              <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
              <p class="text-sm text-gray-400">Loading wage history...</p>
            </div>
          </template>
        </UTable>

        <div v-if="existingWages.length === 0 && !loading" class="flex flex-col items-center justify-center py-12 text-gray-500">
          <UIcon name="i-lucide-history" class="text-4xl mb-2 opacity-20" />
          <p>No wages found for this month.</p>
        </div>
      </UCard>
    </div>
  </div>
</template>
