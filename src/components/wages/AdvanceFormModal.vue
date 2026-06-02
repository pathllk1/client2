<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed, watch } from 'vue'
import { useAdvances } from '@/composables/useAdvances'
import { useToast } from '@nuxt/ui/composables'

const props = defineProps<{
  employee?: any
}>()

const emit = defineEmits(['close', 'saved'])

const { loading, recordAdvance, fetchBankAccounts, fetchEligibleEmployees } = useAdvances()
const toast = useToast()

const bankAccounts = ref<any[]>([])
const employees = ref<any[]>([])

const form = reactive({
  master_roll_id: props.employee?.master_roll_id || '',
  amount: 0,
  type: 'ADVANCE' as 'ADVANCE' | 'RECOVERY',
  date: new Date().toISOString().slice(0, 10),
  payment_mode: 'CASH',
  bank_account_id: '',
  cheque_no: '',
  remarks: ''
})

const isDropdownOpen = ref(false)
const searchTerm = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

const sortedEmployees = computed(() => {
  return [...employees.value].sort((a, b) => {
    return (a.employee_name || '').localeCompare(b.employee_name || '')
  })
})

const filteredEmployees = computed(() => {
  const query = searchTerm.value.toLowerCase().trim()
  if (!query) return sortedEmployees.value
  return sortedEmployees.value.filter(emp => {
    return (
      (emp.employee_name && emp.employee_name.toLowerCase().includes(query)) ||
      (emp.project && emp.project.toLowerCase().includes(query)) ||
      (emp.site && emp.site.toLowerCase().includes(query))
    )
  })
})

const selectedEmployeeName = computed(() => {
  if (props.employee) return props.employee.employee_name
  const emp = employees.value.find(e => e._id === form.master_roll_id)
  return emp ? `${emp.employee_name} (${emp.project || 'No Project'})` : ''
})

const selectEmployee = (emp: any) => {
  form.master_roll_id = emp._id
  isDropdownOpen.value = false
  searchTerm.value = ''
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false
  }
}

watch(isDropdownOpen, (val) => {
  if (val) {
    document.addEventListener('click', handleClickOutside)
    setTimeout(() => {
      searchInputRef.value?.focus()
    }, 50)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const loadInitialData = async () => {
  try {
    const [bankRes, empRes] = await Promise.all([
      fetchBankAccounts(),
      fetchEligibleEmployees()
    ])
    if (bankRes.success) bankAccounts.value = bankRes.data
    if (empRes.success) employees.value = empRes.data
  } catch (err: any) {
    toast.add({ title: 'Error loading form data', description: err.message, color: 'error' })
  }
}

const onSubmit = async () => {
  if (!form.master_roll_id || !form.amount || !form.date) {
    toast.add({ title: 'Validation Error', description: 'Please fill all required fields', color: 'error' })
    return
  }

  try {
    const response = await recordAdvance(form)
    if (response.success) {
      toast.add({ title: 'Success', description: 'Transaction recorded successfully', color: 'success' })
      emit('saved')
      emit('close')
    }
  } catch (err: any) {
    toast.add({ title: 'Error saving transaction', description: err.message, color: 'error' })
  }
}

onMounted(() => {
  loadInitialData()
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
        <h3 class="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Record Transaction</h3>
        <UButton variant="ghost" color="neutral" icon="i-heroicons-x-mark" @click="emit('close')" />
      </div>

      <form @submit.prevent="onSubmit" class="p-6 flex flex-col gap-4">
        <!-- Employee Selection -->
        <div class="flex flex-col gap-1.5 relative">
          <label class="text-[10px] font-black uppercase tracking-wider text-gray-500">Employee</label>
          
          <!-- Custom Select Trigger -->
          <div v-if="props.employee" class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed">
            {{ props.employee.employee_name }} ({{ props.employee.project || 'No Project' }})
          </div>
          
          <div v-else class="relative" ref="dropdownRef">
            <button 
              type="button"
              @click="isDropdownOpen = !isDropdownOpen"
              class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all flex items-center justify-between text-left"
            >
              <span v-if="selectedEmployeeName" class="text-gray-900 dark:text-white">{{ selectedEmployeeName }}</span>
              <span v-else class="text-gray-400">Select Employee</span>
              <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 text-gray-400 transition-transform duration-200" :class="{ 'transform rotate-180': isDropdownOpen }" />
            </button>

            <!-- Dropdown Menu -->
            <div 
              v-if="isDropdownOpen" 
              class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-100"
            >
              <!-- Search Box -->
              <div class="p-2 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-gray-400 shrink-0" />
                <input 
                  type="text" 
                  v-model="searchTerm" 
                  placeholder="Search name, project, site..." 
                  class="w-full bg-transparent border-0 outline-none text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400"
                  ref="searchInputRef"
                  @keydown.esc="isDropdownOpen = false"
                />
                <button v-if="searchTerm" type="button" @click="searchTerm = ''" class="text-gray-400 hover:text-gray-600">
                  <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Options List -->
              <div class="max-h-60 overflow-y-auto custom-scrollbar py-1">
                <div 
                  v-if="filteredEmployees.length === 0" 
                  class="px-4 py-3 text-xs text-center text-gray-400 italic"
                >
                  No employees found
                </div>
                <button
                  v-for="emp in filteredEmployees" 
                  :key="emp._id" 
                  type="button"
                  @click="selectEmployee(emp)"
                  class="w-full px-4 py-2 text-left text-xs font-bold transition-colors flex flex-col gap-0.5 border-b border-gray-100/50 dark:border-gray-700/30 last:border-0"
                  :class="form.master_roll_id === emp._id ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'"
                >
                  <span class="text-gray-900 dark:text-white">{{ emp.employee_name }}</span>
                  <span class="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                    Project: {{ emp.project || 'N/A' }} • Site: {{ emp.site || 'N/A' }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Type -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-wider text-gray-500">Type</label>
            <select v-model="form.type" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="ADVANCE">Advance (Debit)</option>
              <option value="RECOVERY">Recovery (Credit)</option>
            </select>
          </div>
          <!-- Amount -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-wider text-gray-500">Amount (₹)</label>
            <input type="number" step="any" v-model.number="form.amount" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0.00" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Date -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-wider text-gray-500">Date</label>
            <input type="date" v-model="form.date" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <!-- Mode -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-wider text-gray-500">Payment Mode</label>
            <select v-model="form.payment_mode" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="CASH">CASH</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
        </div>

        <!-- Bank Account -->
        <div v-if="form.payment_mode !== 'CASH'" class="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1">
          <label class="text-[10px] font-black uppercase tracking-wider text-gray-500">Bank Account</label>
          <select v-model="form.bank_account_id" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none">
            <option value="">Select Bank</option>
            <option v-for="bank in bankAccounts" :key="bank._id" :value="bank._id">{{ bank.bank_name }} - {{ bank.account_number }}</option>
          </select>
        </div>

        <!-- Remarks -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase tracking-wider text-gray-500">Remarks</label>
          <textarea v-model="form.remarks" rows="2" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none resize-none" placeholder="Optional notes..."></textarea>
        </div>

        <div class="mt-2 flex gap-3">
          <UButton type="submit" class="flex-1" :loading="loading" label="Save Transaction" />
          <UButton variant="ghost" color="neutral" class="flex-1" label="Cancel" @click="emit('close')" />
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #374151;
}
</style>
