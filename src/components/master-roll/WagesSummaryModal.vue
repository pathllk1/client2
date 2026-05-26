<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWages } from '@/composables/useWages'
import { useToast } from '@nuxt/ui/composables'

const props = defineProps<{
  employee: {
    _id: string
    employee_name: string
    category: string
    p_day_wage?: number
  }
}>()

const emit = defineEmits(['close'])

const { fetchEmployeeWageHistory, downloadWageSlip, exportEmployeeWageHistory } = useWages()
const toast = useToast()

const wageHistory = ref<any[]>([])
const loading = ref(false)
const exportLoading = ref(false)

const onExport = async () => {
  exportLoading.value = true
  try {
    await exportEmployeeWageHistory(props.employee._id, props.employee.employee_name)
    toast.add({ title: 'Success', description: 'Wages statement exported to Excel', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message || 'Export failed', color: 'error' })
  } finally {
    exportLoading.value = false
  }
}

const fetchHistory = async () => {
  loading.value = true
  try {
    const res = await fetchEmployeeWageHistory(props.employee._id)
    if (res.success) {
      wageHistory.value = res.data
    } else {
      toast.add({ title: 'Error', description: res.message || 'Failed to fetch wage history', color: 'error' })
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message || 'Failed to fetch wage history', color: 'error' })
  } finally {
    loading.value = false
  }
}

const onDownloadSlip = async (wage: any) => {
  try {
    await downloadWageSlip(wage._id, props.employee.employee_name)
    toast.add({ title: 'Success', description: 'Wage slip downloaded', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message || 'Download failed', color: 'error' })
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount || 0)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

onMounted(() => {
  fetchHistory()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Summary Header info -->
    <div class="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h4 class="text-base font-black text-gray-900 dark:text-white leading-none">{{ employee.employee_name }}</h4>
        <p class="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1.5">{{ employee.category }}</p>
      </div>
      <div v-if="employee.p_day_wage" class="flex flex-col sm:items-end">
        <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Base Daily Wage</span>
        <span class="text-sm font-black text-gray-900 dark:text-white font-mono mt-1 leading-none">{{ formatCurrency(employee.p_day_wage) }}</span>
      </div>
    </div>

    <!-- History list -->
    <div class="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-xs text-gray-700 dark:text-gray-300">
          <thead class="bg-gray-50/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th class="px-4 py-3 text-left">Month</th>
              <th class="px-4 py-3 text-right">Days</th>
              <th class="px-4 py-3 text-right">Gross</th>
              <th class="px-4 py-3 text-right">EPF</th>
              <th class="px-4 py-3 text-right">ESIC</th>
              <th class="px-4 py-3 text-right">Adv. Ded.</th>
              <th class="px-4 py-3 text-right font-black text-gray-900 dark:text-white">Net Salary</th>
              <th class="px-4 py-3 text-left">Pay Mode</th>
              <th class="px-4 py-3 text-left">Pay Date</th>
              <th class="px-4 py-3 text-center">Slip</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-850 font-mono">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="10" class="px-4 py-8 text-center text-gray-400">
                Loading wages statement...
              </td>
            </tr>
            <tr v-else-if="wageHistory.length === 0">
              <td colspan="10" class="px-4 py-8 text-center text-gray-500 font-bold uppercase tracking-widest">
                No historical wages posted for this employee
              </td>
            </tr>
            <tr v-else v-for="wage in wageHistory" :key="wage._id" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
              <td class="px-4 py-2.5 font-sans font-bold text-gray-900 dark:text-white">{{ wage.salary_month }}</td>
              <td class="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{{ wage.wage_days }}</td>
              <td class="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{{ formatCurrency(wage.gross_salary) }}</td>
              <td class="px-4 py-2.5 text-right text-red-500/80 dark:text-red-400/80">{{ formatCurrency(wage.epf_deduction) }}</td>
              <td class="px-4 py-2.5 text-right text-red-500/80 dark:text-red-400/80">{{ formatCurrency(wage.esic_deduction) }}</td>
              <td class="px-4 py-2.5 text-right text-red-500/80 dark:text-red-400/80">{{ formatCurrency(wage.advance_deduction) }}</td>
              <td class="px-4 py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{{ formatCurrency(wage.net_salary) }}</td>
              <td class="px-4 py-2.5 font-sans uppercase text-[10px] font-black tracking-wider text-gray-600 dark:text-gray-300">{{ wage.payment_mode || '-' }}</td>
              <td class="px-4 py-2.5 font-sans text-gray-600 dark:text-gray-300">{{ formatDate(wage.paid_date) }}</td>
              <td class="px-4 py-2.5 text-center">
                <UButton
                  v-if="wage.status === 'POSTED' || wage.status === 'LOCKED'"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-arrow-down-tray"
                  @click="onDownloadSlip(wage)"
                />
                <span v-else class="text-[9px] text-amber-500 dark:text-amber-400 font-sans font-black uppercase tracking-wider">Draft</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Actions footer -->
    <div class="flex justify-end gap-2">
      <UButton
        v-if="wageHistory.length > 0"
        color="primary"
        variant="solid"
        icon="i-heroicons-arrow-up-tray"
        label="Export Excel"
        :loading="exportLoading"
        @click="onExport"
      />
      <UButton color="neutral" variant="outline" label="Close" @click="emit('close')" />
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
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
