<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWages } from '@/composables/useWages'
import { useToast } from '@nuxt/ui/composables'

const { loading, fetchWagesByMonth, updateWage, deleteWage, downloadWageSlip, fetchBankAccounts } = useWages()
const toast = useToast()

const month = ref(new Date().toISOString().slice(0, 7))
const existingWages = ref<any[]>([])
const bankAccounts = ref<any[]>([])
const selectedWageIds = ref<Set<string>>(new Set())
const editedWages = ref<Record<string, any>>({})
const searchTerm = ref('')

const isBulkEditMode = ref(false)
const bulkEditData = ref({
  wage_days: null,
  paid_date: '',
  payment_mode: '',
  bank_account_id: '',
  cheque_no: '',
  remarks: ''
})

const filteredWages = computed(() => {
  if (!searchTerm.value) return existingWages.value
  const term = searchTerm.value.toLowerCase()
  return existingWages.value.filter(w => 
    w.master_roll_id?.employee_name?.toLowerCase().includes(term) || 
    w.master_roll_id?.project?.toLowerCase().includes(term) ||
    w.master_roll_id?.site?.toLowerCase().includes(term)
  )
})

const loadData = async () => {
  try {
    const bankRes = await fetchBankAccounts()
    if (bankRes.success) {
      bankAccounts.value = bankRes.data
    }
    await loadWages()
  } catch (err: any) {
    toast.add({ title: 'Error loading data', description: err.message, color: 'error' })
  }
}

const loadWages = async () => {
  if (!month.value) return
  try {
    const response = await fetchWagesByMonth(month.value)
    if (response.success) {
      existingWages.value = response.data
      selectedWageIds.value.clear()
      editedWages.value = {}
    }
  } catch (err: any) {
    toast.add({ title: 'Error loading wages', description: err.message, color: 'error' })
  }
}

const onFieldEdit = (wage: any, field: string, value: any) => {
  if (!editedWages.value[wage._id]) {
    editedWages.value[wage._id] = { ...wage }
  }
  editedWages.value[wage._id][field] = value
  
  if (['p_day_wage', 'wage_days', 'epf_deduction', 'esic_deduction', 'other_deduction', 'other_benefit', 'advance_deduction'].includes(field)) {
    recalculateWage(wage._id)
  }
}

const recalculateWage = (wageId: string) => {
  const wage = editedWages.value[wageId]
  if (!wage) return

  const pDayWage = wage.p_day_wage || wage.master_roll_id?.p_day_wage || 0
  const gross = parseFloat((pDayWage * (wage.wage_days || 0)).toFixed(2))
  wage.gross_salary = gross
  
  const totalDeductions = (wage.epf_deduction || 0) + 
                         (wage.esic_deduction || 0) + 
                         (wage.other_deduction || 0) + 
                         (wage.advance_deduction || 0)
  
  wage.net_salary = parseFloat((gross - totalDeductions + (wage.other_benefit || 0)).toFixed(2))
}

const saveEditedWages = async () => {
  const ids = Object.keys(editedWages.value)
  if (ids.length === 0) return

  try {
    for (const id of ids) {
      await updateWage(id, editedWages.value[id])
    }
    toast.add({ title: 'Success', description: `${ids.length} wages updated`, color: 'success' })
    editedWages.value = {}
    loadWages()
  } catch (err: any) {
    toast.add({ title: 'Error updating wages', description: err.message, color: 'error' })
  }
}

const deleteSelected = async () => {
  if (selectedWageIds.value.size === 0) return
  if (!confirm(`Are you sure you want to delete ${selectedWageIds.value.size} records?`)) return

  try {
    for (const id of selectedWageIds.value) {
      await deleteWage(id)
    }
    toast.add({ title: 'Success', description: `${selectedWageIds.value.size} wages deleted`, color: 'success' })
    loadWages()
  } catch (err: any) {
    toast.add({ title: 'Error deleting wages', description: err.message, color: 'error' })
  }
}

const applyBulkEdit = () => {
  if (selectedWageIds.value.size === 0) return
  
  selectedWageIds.value.forEach(id => {
    const original = existingWages.value.find(w => w._id === id)
    if (!original) return
    
    if (!editedWages.value[id]) {
      editedWages.value[id] = { ...original }
    }
    
    if (bulkEditData.value.wage_days !== null) editedWages.value[id].wage_days = bulkEditData.value.wage_days
    if (bulkEditData.value.paid_date) editedWages.value[id].paid_date = bulkEditData.value.paid_date
    if (bulkEditData.value.payment_mode) editedWages.value[id].payment_mode = bulkEditData.value.payment_mode
    if (bulkEditData.value.bank_account_id) editedWages.value[id].bank_account_id = bulkEditData.value.bank_account_id
    if (bulkEditData.value.cheque_no) editedWages.value[id].cheque_no = bulkEditData.value.cheque_no
    
    recalculateWage(id)
  })
  
  isBulkEditMode.value = false
  toast.add({ title: 'Bulk Edit Applied', color: 'success' })
}

const toggleSelectAll = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    filteredWages.value.forEach(w => selectedWageIds.value.add(w._id))
  } else {
    filteredWages.value.forEach(w => selectedWageIds.value.delete(w._id))
  }
}

const toggleWageSelection = (id: string, event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    selectedWageIds.value.add(id)
  } else {
    selectedWageIds.value.delete(id)
  }
}

const handleInput = (wage: any, field: string, event: Event, type: 'int' | 'float' | 'string' = 'string') => {
  const target = event.target as HTMLInputElement | HTMLSelectElement
  let value: any = target.value
  if (type === 'int') value = parseInt(value) || 0
  if (type === 'float') value = parseFloat(value) || 0
  onFieldEdit(wage, field, value)
}

const isAllSelected = computed(() => {
  return filteredWages.value.length > 0 && 
         filteredWages.value.every(w => selectedWageIds.value.has(w._id))
})

const onDownloadSlip = (wage: any) => {
  downloadWageSlip(wage._id, wage.master_roll_id?.employee_name || 'Employee')
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="flex flex-col h-full gap-2">
    <!-- Toolbar -->
    <div class="bg-white dark:bg-gray-900 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-[10px] font-bold text-gray-500 uppercase">Month</label>
          <input type="month" v-model="month" class="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-bold" />
        </div>
        <UButton size="xs" icon="i-heroicons-arrow-path" :loading="loading" @click="loadWages">Fetch Records</UButton>
      </div>

      <div class="flex items-center gap-2">
        <input type="text" v-model="searchTerm" placeholder="Search..." class="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs w-40" />
        
        <UButton v-if="Object.keys(editedWages).length > 0" size="xs" color="emerald" @click="saveEditedWages">
          Save Changes ({{ Object.keys(editedWages).length }})
        </UButton>

        <UDropdownMenu v-if="selectedWageIds.size > 0" :items="[[
          { label: 'Bulk Edit', icon: 'i-heroicons-pencil-square', onSelect: () => isBulkEditMode = true },
          { label: 'Delete Selected', icon: 'i-heroicons-trash', color: 'error', onSelect: deleteSelected }
        ]]">
          <UButton size="xs" color="neutral" variant="outline" trailing-icon="i-heroicons-chevron-down">
            Selected ({{ selectedWageIds.size }})
          </UButton>
        </UDropdownMenu>
      </div>
    </div>

    <!-- Bulk Edit Modal/Panel -->
    <div v-if="isBulkEditMode" class="bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-100 dark:border-indigo-900 p-3 rounded-lg animate-in slide-in-from-top-2">
      <div class="flex items-center gap-4">
        <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-r border-indigo-100 dark:border-indigo-900 pr-3">Bulk Edit</span>
        <div class="grid grid-cols-5 gap-3 flex-1">
          <div class="flex flex-col gap-1">
            <label class="text-[8px] font-bold text-indigo-400 uppercase">Wage Days</label>
            <input type="number" v-model.number="bulkEditData.wage_days" class="px-2 py-1 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[8px] font-bold text-indigo-400 uppercase">Paid Date</label>
            <input type="date" v-model="bulkEditData.paid_date" class="px-2 py-1 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[8px] font-bold text-indigo-400 uppercase">Bank</label>
            <select v-model="bulkEditData.bank_account_id" class="px-2 py-1 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none">
              <option value="">Skip</option>
              <option v-for="bank in bankAccounts" :key="bank._id" :value="bank._id">{{ bank.bank_name }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[8px] font-bold text-indigo-400 uppercase">Mode</label>
            <select v-model="bulkEditData.payment_mode" class="px-2 py-1 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none">
              <option value="">Skip</option>
              <option value="CASH">CASH</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="IMPS">IMPS</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[8px] font-bold text-indigo-400 uppercase">Ref</label>
            <input type="text" v-model="bulkEditData.cheque_no" class="px-2 py-1 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none" />
          </div>
        </div>
        <div class="flex gap-2">
          <UButton size="xs" color="indigo" @click="applyBulkEdit">Apply</UButton>
          <UButton size="xs" color="neutral" variant="ghost" @click="isBulkEditMode = false">Cancel</UButton>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="flex-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden min-h-0">
      <div class="overflow-auto h-full scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
        <table class="w-full text-left border-collapse table-fixed">
          <thead class="sticky top-0 z-10">
            <tr class="bg-gray-900 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-800">
              <th class="p-2 w-8 text-center"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="rounded accent-primary" /></th>
              <th class="p-2 w-48">Employee</th>
              <th class="p-2 w-12 text-center">Days</th>
              <th class="p-2 w-20 text-right">Gross</th>
              <th class="p-2 w-16 text-center">EPF</th>
              <th class="p-2 w-16 text-center">ESIC</th>
              <th class="p-2 w-16 text-center">Other Ded</th>
              <th class="p-2 w-16 text-center">Advance</th>
              <th class="p-2 w-24 text-right bg-primary/10 text-primary-400 italic">Net</th>
              <th class="p-2 w-64">Settlement Details</th>
              <th class="p-2 w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="wage in filteredWages" :key="wage._id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 group" :class="{'bg-primary/5': selectedWageIds.has(wage._id)}">
              <td class="p-2 text-center border-r border-gray-50 dark:border-gray-800">
                <input type="checkbox" :value="wage._id" :checked="selectedWageIds.has(wage._id)" @change="toggleWageSelection(wage._id, $event)" class="rounded accent-primary" />
              </td>
              <td class="p-2 border-r border-gray-50 dark:border-gray-800">
                <div class="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">{{ wage.master_roll_id?.employee_name }}</div>
                <div class="text-[9px] text-gray-500 uppercase font-medium truncate">{{ wage.master_roll_id?.project }} • {{ wage.master_roll_id?.site }}</div>
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" :value="editedWages[wage._id]?.wage_days ?? wage.wage_days" @input="handleInput(wage, 'wage_days', $event, 'int')" class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded text-center text-[12px] font-black text-indigo-600 focus:ring-0" />
              </td>
              <td class="p-2 text-right border-r border-gray-50 dark:border-gray-800 text-[11px] font-bold font-mono">
                {{ Math.round(editedWages[wage._id]?.gross_salary ?? wage.gross_salary) }}
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" :value="editedWages[wage._id]?.epf_deduction ?? wage.epf_deduction" @input="handleInput(wage, 'epf_deduction', $event, 'float')" class="w-full bg-transparent border-none text-center text-[11px] font-bold text-amber-600 focus:ring-0" />
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" :value="editedWages[wage._id]?.esic_deduction ?? wage.esic_deduction" @input="handleInput(wage, 'esic_deduction', $event, 'float')" class="w-full bg-transparent border-none text-center text-[11px] font-bold text-amber-600 focus:ring-0" />
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" :value="editedWages[wage._id]?.other_deduction ?? wage.other_deduction" @input="handleInput(wage, 'other_deduction', $event, 'float')" class="w-full bg-transparent border-none text-center text-[11px] font-bold text-orange-600 focus:ring-0" />
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" :value="editedWages[wage._id]?.advance_deduction ?? wage.advance_deduction" @input="handleInput(wage, 'advance_deduction', $event, 'float')" class="w-full bg-transparent border-none text-center text-[11px] font-bold text-rose-600 focus:ring-0" />
              </td>
              <td class="p-2 text-right bg-primary/5 font-black text-primary-600 dark:text-primary-400 font-mono text-[12px] italic">
                {{ (editedWages[wage._id]?.net_salary ?? wage.net_salary).toFixed(0) }}
              </td>
              <td class="p-1 px-2 border-l border-gray-50 dark:border-gray-800">
                <div class="flex items-center gap-1.5">
                   <input type="date" :value="(editedWages[wage._id]?.paid_date ?? wage.paid_date)?.slice(0, 10)" @input="handleInput(wage, 'paid_date', $event)" class="px-1 py-0.5 bg-gray-50 dark:bg-gray-800 border-none rounded text-[10px] font-bold w-24" />
                   <select :value="editedWages[wage._id]?.payment_mode ?? wage.payment_mode" @change="handleInput(wage, 'payment_mode', $event)" class="px-1 py-0.5 bg-gray-50 dark:bg-gray-800 border-none rounded text-[10px] font-bold">
                      <option value="">Mode</option>
                      <option value="CASH">CASH</option>
                      <option value="CHEQUE">CHQ</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="IMPS">IMPS</option>
                      <option value="UPI">UPI</option>
                   </select>
                   <select :value="editedWages[wage._id]?.bank_account_id ?? wage.bank_account_id" @change="handleInput(wage, 'bank_account_id', $event)" class="px-1 py-0.5 bg-gray-50 dark:bg-gray-800 border-none rounded text-[10px] font-bold max-w-[100px]">
                      <option value="">Bank</option>
                      <option v-for="bank in bankAccounts" :key="bank._id" :value="bank._id">{{ bank.bank_name }}</option>
                   </select>
                   <input type="text" :value="editedWages[wage._id]?.cheque_no ?? wage.cheque_no" @input="handleInput(wage, 'cheque_no', $event)" placeholder="Ref" class="w-16 px-1 py-0.5 bg-gray-50 dark:bg-gray-800 border-none rounded text-[10px] font-bold" />
                </div>
              </td>
              <td class="p-2 text-center">
                <UButton size="xs" variant="ghost" icon="i-heroicons-document-text" @click="onDownloadSlip(wage)" />
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredWages.length === 0" class="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
          No records found for this month.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>
