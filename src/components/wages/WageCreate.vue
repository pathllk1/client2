<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useWages } from '@/composables/useWages'
import { useToast } from '@nuxt/ui/composables'
import { wagePersistence } from '@/utils/wagePersistence'

const { loading, fetchEligibleEmployees, createWagesBulk, fetchBankAccounts, downloadBankReport, downloadEPFESICReport, exportWages } = useWages()
const toast = useToast()

const month = ref(new Date().toISOString().slice(0, 7))
const employees = ref<any[]>([])
const bankAccounts = ref<any[]>([])
const selectedEmployeeIds = ref<Set<string>>(new Set())
const wageData = ref<Record<string, any>>({})
const sessionMetadata = ref<any>(null)

const commonPaymentData = ref({
  paid_date: '',
  cheque_no: '',
  payment_mode: '',
  bank_account_id: '',
  remarks: ''
})

const searchTerm = ref('')
const filters = ref({
  project: 'all',
  site: 'all',
  bank: 'all'
})

// Persistence logic
const persistState = () => {
  wagePersistence.save('CREATE', {
    month: month.value,
    employees: employees.value,
    selectedEmployeeIds: Array.from(selectedEmployeeIds.value),
    wageData: wageData.value,
    commonPaymentData: commonPaymentData.value,
    filters: filters.value
  })
  updateMetadata()
}

watch([month, employees, selectedEmployeeIds, wageData, commonPaymentData, filters], () => {
  persistState()
}, { deep: true })

const updateMetadata = () => {
  sessionMetadata.value = wagePersistence.getMetadata('CREATE')
}

const restoreState = () => {
  const saved = wagePersistence.load('CREATE')
  if (saved) {
    month.value = saved.month || month.value
    employees.value = saved.employees || []
    selectedEmployeeIds.value = new Set(saved.selectedEmployeeIds || [])
    wageData.value = saved.wageData || {}
    commonPaymentData.value = saved.commonPaymentData || commonPaymentData.value
    filters.value = saved.filters || filters.value
    updateMetadata()
    return true
  }
  return false
}

const uniqueProjects = computed(() => ['all', ...new Set(employees.value.map(e => e.project).filter(Boolean))].sort())
const uniqueSites = computed(() => ['all', ...new Set(employees.value.map(e => e.site).filter(Boolean))].sort())
const uniqueBanks = computed(() => ['all', ...new Set(employees.value.map(e => e.bank).filter(Boolean))].sort())

const filteredEmployees = computed(() => {
  return employees.value.filter(emp => {
    const term = searchTerm.value.toLowerCase()
    const matchesSearch = !term || 
      emp.employee_name.toLowerCase().includes(term) || 
      emp.project?.toLowerCase().includes(term) ||
      emp.site?.toLowerCase().includes(term)
    
    const matchesProject = filters.value.project === 'all' || emp.project === filters.value.project
    const matchesSite = filters.value.site === 'all' || emp.site === filters.value.site
    const matchesBank = filters.value.bank === 'all' || emp.bank === filters.value.bank
    
    return matchesSearch && matchesProject && matchesSite && matchesBank
  })
})

const loadData = async () => {
  try {
    const bankRes = await fetchBankAccounts()
    if (bankRes.success) {
      bankAccounts.value = bankRes.data
    }
    
    if (!restoreState()) {
      await loadEmployees()
    }
  } catch (err: any) {
    toast.add({ title: 'Error loading initial data', description: err.message, color: 'error' })
  }
}

const loadEmployees = async () => {
  if (!month.value) return
  try {
    const response = await fetchEligibleEmployees(month.value)
    if (response.success) {
      employees.value = response.data
      // Initialize wage data
      const data: Record<string, any> = {}
      response.data.forEach((emp: any) => {
        data[emp.master_roll_id] = {
          master_roll_id: emp.master_roll_id,
          p_day_wage: emp.last_p_day_wage || emp.p_day_wage || 0,
          wage_days: emp.last_wage_days || 26,
          gross_salary: 0,
          epf_deduction: 0,
          esic_deduction: 0,
          other_deduction: 0,
          other_benefit: 0,
          advance_deduction: 0,
          net_salary: 0
        }
        calculateEmployeeWages(emp.master_roll_id, data[emp.master_roll_id])
      })
      wageData.value = data
      selectedEmployeeIds.value.clear()
    }
  } catch (err: any) {
    toast.add({ title: 'Error loading employees', description: err.message, color: 'error' })
  }
}

const calculateEmployeeWages = (empId: string, data?: any) => {
  const wage = data || wageData.value[empId]
  if (!wage) return

  const gross = parseFloat((wage.p_day_wage * wage.wage_days).toFixed(2))
  wage.gross_salary = gross
  
  // EPF: 12% of gross, max 1800
  wage.epf_deduction = Math.min(Math.round(gross * 0.12), 1800)
  
  // ESIC: 0.75% of gross, rounded up
  wage.esic_deduction = Math.ceil(gross * 0.0075)
  
  updateNetSalary(empId, data)
}

const updateNetSalary = (empId: string, data?: any) => {
  const wage = data || wageData.value[empId]
  if (!wage) return

  const totalDeductions = (wage.epf_deduction || 0) + 
                         (wage.esic_deduction || 0) + 
                         (wage.other_deduction || 0) + 
                         (wage.advance_deduction || 0)
  
  wage.net_salary = parseFloat((wage.gross_salary - totalDeductions + (wage.other_benefit || 0)).toFixed(2))
}

const toggleSelectAll = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    filteredEmployees.value.forEach(emp => selectedEmployeeIds.value.add(emp.master_roll_id))
  } else {
    filteredEmployees.value.forEach(emp => selectedEmployeeIds.value.delete(emp.master_roll_id))
  }
}

const toggleEmployeeSelection = (id: string, event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    selectedEmployeeIds.value.add(id)
  } else {
    selectedEmployeeIds.value.delete(id)
  }
}

const isAllSelected = computed(() => {
  return filteredEmployees.value.length > 0 && 
         filteredEmployees.value.every(emp => selectedEmployeeIds.value.has(emp.master_roll_id))
})

const totals = computed(() => {
  let gross = 0, epf = 0, esic = 0, adv = 0, net = 0
  selectedEmployeeIds.value.forEach(id => {
    const w = wageData.value[id]
    if (w) {
      gross += w.gross_salary
      epf += w.epf_deduction
      esic += w.esic_deduction
      adv += w.advance_deduction
      net += w.net_salary
    }
  })
  return { gross, epf, esic, adv, net }
})

const saveWages = async () => {
  if (selectedEmployeeIds.value.size === 0) return
  
  const wagesToSave = Array.from(selectedEmployeeIds.value).map(id => {
    const w = { ...wageData.value[id] }
    return {
      ...w,
      month: month.value,
      paid_date: commonPaymentData.value.paid_date,
      cheque_no: commonPaymentData.value.cheque_no,
      payment_mode: commonPaymentData.value.payment_mode,
      bank_account_id: commonPaymentData.value.bank_account_id,
      remarks: commonPaymentData.value.remarks
    }
  })

  try {
    const response = await createWagesBulk(wagesToSave)
    if (response.success) {
      toast.add({ title: 'Success', description: `Wages saved for ${wagesToSave.length} employees`, color: 'success' })
      wagePersistence.clear('CREATE')
      loadEmployees()
    }
  } catch (err: any) {
    toast.add({ title: 'Error saving wages', description: err.message, color: 'error' })
  }
}

const resetSession = () => {
  if (confirm('Are you sure you want to clear all unsaved work and reset?')) {
    wagePersistence.clear('CREATE')
    sessionMetadata.value = null
    loadEmployees()
    toast.add({ title: 'Session Cleared', color: 'neutral' })
  }
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}

const onExportExcel = async () => {
  if (!month.value) return
  
  const employeesToExport = filteredEmployees.value.filter(emp => 
    selectedEmployeeIds.value.size > 0 ? selectedEmployeeIds.value.has(emp.master_roll_id) : true
  )

  if (employeesToExport.length === 0) {
    toast.add({ title: 'No employees to export', color: 'warning' })
    return
  }

  const exportData = employeesToExport.map(emp => {
    const wage = wageData.value[emp.master_roll_id] || {}
    return {
      employee_name: emp.employee_name,
      project: emp.project || 'General',
      site: emp.site || 'N/A',
      bank: emp.bank || 'N/A',
      account_no: emp.account_no || 'N/A',
      p_day_wage: wage.p_day_wage || emp.p_day_wage || 0,
      wage_days: wage.wage_days || 0,
      gross_salary: wage.gross_salary || 0,
      epf_deduction: wage.epf_deduction || 0,
      esic_deduction: wage.esic_deduction || 0,
      other_deduction: wage.other_deduction || 0,
      other_benefit: wage.other_benefit || 0,
      advance_deduction: wage.advance_deduction || 0,
      net_salary: wage.net_salary || 0,
      date_of_joining: emp.date_of_joining,
      date_of_exit: emp.date_of_exit
    }
  })

  try {
    await exportWages(month.value, exportData)
    toast.add({ title: 'Success', description: 'Export started', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Export failed', description: err.message, color: 'error' })
  }
}

const onExportBank = () => {
  if (!month.value) return
  downloadBankReport(month.value)
}

const onExportEPF = () => {
  if (!month.value) return
  downloadEPFESICReport(month.value)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="flex flex-col h-full gap-2">
    <!-- Session Indicator -->
    <div v-if="sessionMetadata" class="bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900 px-4 py-2 rounded-lg flex items-center justify-between animate-in slide-in-from-top duration-300">
      <div class="flex items-center gap-3">
        <div class="p-1.5 bg-primary-100 dark:bg-primary-900/50 rounded-md">
          <UIcon name="i-heroicons-circle-stack" class="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div class="flex flex-col">
          <span class="text-[10px] font-black text-primary-700 dark:text-primary-300 uppercase tracking-wider">Active Session Restored</span>
          <span class="text-[9px] text-primary-600/70 dark:text-primary-400/70 font-bold">
            {{ sessionMetadata.selectedCount }} selected • {{ sessionMetadata.employeeCount }} staff • Saved {{ sessionMetadata.ageMinutes }}m ago for {{ sessionMetadata.month }}
          </span>
        </div>
      </div>
      <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-x-mark" @click="resetSession" />
    </div>

    <!-- Toolbar -->
    <div class="bg-white dark:bg-gray-900 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-[10px] font-bold text-gray-500 uppercase">Month</label>
          <input type="month" v-model="month" class="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-bold" />
        </div>
        <UButton size="xs" icon="i-heroicons-arrow-path" :loading="loading" @click="loadEmployees">Load Staff</UButton>
        
        <div class="flex items-center gap-3 px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-100 dark:border-gray-700">
          <div class="flex flex-col items-center">
            <span class="text-[8px] text-gray-400 uppercase font-black">Loaded</span>
            <span class="text-xs font-black text-gray-700 dark:text-gray-200">{{ employees.length }}</span>
          </div>
          <div class="w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
          <div class="flex flex-col items-center">
            <span class="text-[8px] text-primary-400 uppercase font-black">Selected</span>
            <span class="text-xs font-black text-primary-600 dark:text-primary-400">{{ selectedEmployeeIds.size }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UDropdownMenu :items="[[
          { label: 'Export Excel', icon: 'i-heroicons-table-cells', onSelect: onExportExcel },
          { label: 'Bank Report', icon: 'i-heroicons-building-library', onSelect: onExportBank },
          { label: 'EPF/ESIC Report', icon: 'i-heroicons-document-text', onSelect: onExportEPF }
        ]]">
          <UButton size="xs" color="neutral" variant="outline" icon="i-heroicons-document-arrow-down">Export Reports</UButton>
        </UDropdownMenu>

        <UButton v-if="employees.length > 0" size="xs" color="neutral" variant="ghost" icon="i-heroicons-trash" @click="resetSession">
          Clear Session
        </UButton>
        <input type="text" v-model="searchTerm" placeholder="Search staff..." class="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs w-40" />
        <UButton size="xs" color="success" icon="i-heroicons-check-circle" :disabled="selectedEmployeeIds.size === 0" @click="saveWages">
          Save Payroll ({{ selectedEmployeeIds.size }})
        </UButton>
      </div>
    </div>

    <!-- Filter & Bulk Pay Bar -->
    <div class="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-2 rounded-lg flex items-center gap-4 shrink-0 overflow-x-auto">
      <div class="flex items-center gap-3 border-r border-indigo-100 dark:border-indigo-900 pr-3">
        <div class="flex flex-col gap-0.5">
          <label class="text-[8px] font-bold text-gray-500 uppercase ml-1">Project</label>
          <select v-model="filters.project" class="px-2 py-0.5 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none min-w-[100px]">
            <option v-for="p in uniqueProjects" :key="p" :value="p">{{ p === 'all' ? 'All Projects' : p }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-0.5">
          <label class="text-[8px] font-bold text-gray-500 uppercase ml-1">Site</label>
          <select v-model="filters.site" class="px-2 py-0.5 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none min-w-[100px]">
            <option v-for="s in uniqueSites" :key="s" :value="s">{{ s === 'all' ? 'All Sites' : s }}</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5">
          <label class="text-[9px] font-bold text-indigo-400 uppercase">Date</label>
          <input type="date" v-model="commonPaymentData.paid_date" class="px-1 py-0.5 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none" />
        </div>
        <div class="flex items-center gap-1.5">
          <label class="text-[9px] font-bold text-indigo-400 uppercase">Bank</label>
          <select v-model="commonPaymentData.bank_account_id" class="px-1 py-0.5 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none max-w-[150px]">
            <option value="">Choose Bank</option>
            <option v-for="bank in bankAccounts" :key="bank._id" :value="bank._id">{{ bank.bank_name }} - {{ bank.account_number }}</option>
          </select>
        </div>
        <div class="flex items-center gap-1.5">
          <label class="text-[9px] font-bold text-indigo-400 uppercase">Mode</label>
          <select v-model="commonPaymentData.payment_mode" class="px-1 py-0.5 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none">
            <option value="">Select</option>
            <option value="CASH">CASH</option>
            <option value="CHEQUE">CHEQUE</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="IMPS">IMPS</option>
            <option value="UPI">UPI</option>
          </select>
        </div>
        <div class="flex items-center gap-1.5">
          <label class="text-[9px] font-bold text-indigo-400 uppercase">Ref</label>
          <input type="text" v-model="commonPaymentData.cheque_no" placeholder="Cheque/Ref" class="px-1 py-0.5 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded text-[10px] font-bold outline-none w-24" />
        </div>
      </div>

      <div class="ml-auto flex items-center gap-4 bg-gray-900 dark:bg-black px-4 py-1 rounded-md text-white border border-gray-800">
        <div class="flex flex-col"><span class="text-[8px] text-gray-400 uppercase">Gross</span><span class="text-xs font-mono font-bold">{{ formatCurrency(totals.gross) }}</span></div>
        <div class="flex flex-col"><span class="text-[8px] text-amber-500 uppercase">EPF</span><span class="text-xs font-mono font-bold text-amber-500">{{ formatCurrency(totals.epf) }}</span></div>
        <div class="flex flex-col"><span class="text-[8px] text-amber-500 uppercase">ESIC</span><span class="text-xs font-mono font-bold text-amber-500">{{ formatCurrency(totals.esic) }}</span></div>
        <div class="flex flex-col"><span class="text-[8px] text-rose-500 uppercase">Adv</span><span class="text-xs font-mono font-bold text-rose-500">{{ formatCurrency(totals.adv) }}</span></div>
        <div class="w-px h-4 bg-gray-700"></div>
        <div class="flex flex-col"><span class="text-[8px] text-emerald-500 uppercase">Net</span><span class="text-sm font-mono font-black text-emerald-400 italic">{{ formatCurrency(totals.net) }}</span></div>
      </div>
    </div>

    <!-- Table -->
    <div class="flex-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden min-h-0 relative">
      <div v-if="loading" class="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-gray-950/60 backdrop-blur-[2px] transition-all duration-300">
        <div class="flex flex-col items-center gap-4 bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
          <div class="relative">
            <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 animate-spin text-primary" />
            <div class="absolute inset-0 flex items-center justify-center">
              <UIcon name="i-heroicons-currency-dollar" class="w-5 h-5 text-primary/40" />
            </div>
          </div>
          <div class="flex flex-col items-center gap-1">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Calculating</p>
            <p class="text-[9px] font-bold uppercase tracking-widest text-primary animate-pulse">Payroll Engine</p>
          </div>
        </div>
      </div>

      <div class="overflow-auto h-full scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
        <table class="w-full text-left border-collapse table-fixed">
          <thead class="sticky top-0 z-10">
            <tr class="bg-gray-900 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-800">
              <th class="p-2 w-8 text-center"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="rounded accent-primary" /></th>
              <th class="p-2 w-48">Employee</th>
              <th class="p-2 w-40">Bank / Account</th>
              <th class="p-2 w-16 text-center">Rate</th>
              <th class="p-2 w-12 text-center">Days</th>
              <th class="p-2 w-20 text-right">Gross</th>
              <th class="p-2 w-16 text-center">EPF</th>
              <th class="p-2 w-16 text-center">ESIC</th>
              <th class="p-2 w-16 text-center">Other Ded</th>
              <th class="p-2 w-16 text-center">Benefit</th>
              <th class="p-2 w-16 text-center text-rose-400">Advance</th>
              <th class="p-2 w-24 text-right bg-primary/10 text-primary-400 italic">Net Salary</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="emp in filteredEmployees" :key="emp.master_roll_id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 group" :class="{'bg-primary/5': selectedEmployeeIds.has(emp.master_roll_id)}">
              <td class="p-2 text-center border-r border-gray-50 dark:border-gray-800">
                <input type="checkbox" :value="emp.master_roll_id" :checked="selectedEmployeeIds.has(emp.master_roll_id)" @change="toggleEmployeeSelection(emp.master_roll_id, $event)" class="rounded accent-primary" />
              </td>
              <td class="p-2 border-r border-gray-50 dark:border-gray-800">
                <div class="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">{{ emp.employee_name }}</div>
                <div class="text-[9px] text-gray-500 uppercase font-medium truncate">{{ emp.project }} • {{ emp.site }}</div>
              </td>
              <td class="p-2 border-r border-gray-50 dark:border-gray-800">
                <div class="text-[10px] text-gray-600 dark:text-gray-400 truncate">{{ emp.bank }}</div>
                <div class="text-[10px] font-mono text-gray-400 truncate">{{ emp.account_no }}</div>
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" v-model.number="wageData[emp.master_roll_id].p_day_wage" @input="calculateEmployeeWages(emp.master_roll_id)" class="w-full bg-transparent border-none text-center text-[11px] font-bold focus:ring-0" />
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" v-model.number="wageData[emp.master_roll_id].wage_days" @input="calculateEmployeeWages(emp.master_roll_id)" class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded text-center text-[12px] font-black text-indigo-600 focus:ring-0" />
              </td>
              <td class="p-2 text-right border-r border-gray-50 dark:border-gray-800 text-[11px] font-bold font-mono">
                {{ Math.round(wageData[emp.master_roll_id].gross_salary) }}
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" v-model.number="wageData[emp.master_roll_id].epf_deduction" @input="updateNetSalary(emp.master_roll_id)" class="w-full bg-transparent border-none text-center text-[11px] font-bold text-amber-600 focus:ring-0" />
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" v-model.number="wageData[emp.master_roll_id].esic_deduction" @input="updateNetSalary(emp.master_roll_id)" class="w-full bg-transparent border-none text-center text-[11px] font-bold text-amber-600 focus:ring-0" />
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" v-model.number="wageData[emp.master_roll_id].other_deduction" @input="updateNetSalary(emp.master_roll_id)" class="w-full bg-transparent border-none text-center text-[11px] font-bold text-orange-600 focus:ring-0" />
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" v-model.number="wageData[emp.master_roll_id].other_benefit" @input="updateNetSalary(emp.master_roll_id)" class="w-full bg-transparent border-none text-center text-[11px] font-bold text-emerald-600 focus:ring-0" />
              </td>
              <td class="p-1 border-r border-gray-50 dark:border-gray-800">
                <input type="number" v-model.number="wageData[emp.master_roll_id].advance_deduction" @input="updateNetSalary(emp.master_roll_id)" class="w-full bg-transparent border-none text-center text-[11px] font-bold text-rose-600 focus:ring-0" />
              </td>
              <td class="p-2 text-right bg-primary/5 font-black text-primary-600 dark:text-primary-400 font-mono text-[12px] italic">
                {{ wageData[emp.master_roll_id].net_salary.toFixed(0) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredEmployees.length === 0" class="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
          No employees found. Please load staff for the selected month.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hide spin buttons for number inputs */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>
