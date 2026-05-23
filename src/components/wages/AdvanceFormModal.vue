<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
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
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase tracking-wider text-gray-500">Employee</label>
          <select v-model="form.master_roll_id" class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" :disabled="!!props.employee">
            <option value="">Select Employee</option>
            <option v-for="emp in employees" :key="emp._id" :value="emp._id">{{ emp.employee_name }} ({{ emp.project }})</option>
          </select>
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
