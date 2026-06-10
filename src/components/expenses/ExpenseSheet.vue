<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useExpenses } from '@/composables/useExpenses'

const props = defineProps<{
  modelValue: boolean
  expense?: any | null
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const {
  categories,
  costCenters,
  registers,
  projects,
  fetchCategories,
  fetchCostCenters,
  fetchRegisters,
  fetchRecentProjects,
  createExpense,
  updateExpense
} = useExpenses()

const isOpen = ref(false)
const saving = ref(false)

const blurActiveInput = () => {
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

const formState = reactive({
  amount: '',
  expenseDate: new Date().toISOString().split('T')[0],
  categoryName: '',
  costCenterName: '',
  project: '',
  paymentMode: 'CASH' as 'CASH' | 'BANK' | 'CARD' | 'OTHER',
  cashRegisterId: '',
  paidToReceivedFrom: '',
  description: ''
})

watch(() => props.modelValue, (val) => {
  isOpen.value = val
  if (val) {
    loadData()
    if (props.expense) {
      // Edit mode
      formState.amount = props.expense.amount
      formState.expenseDate = props.expense.expense_date.split('T')[0]
      formState.categoryName = props.expense.category_name
      formState.costCenterName = props.expense.cost_center_name
      formState.project = props.expense.project || ''
      formState.paymentMode = props.expense.payment_mode
      formState.cashRegisterId = props.expense.cash_register_id || ''
      formState.paidToReceivedFrom = props.expense.paid_to_received_from || ''
      formState.description = props.expense.description
    } else {
      // Create mode — do NOT pre-assign cashRegisterId; let filteredRegisters watcher do it
      formState.amount = ''
      formState.expenseDate = new Date().toISOString().split('T')[0]
      formState.categoryName = ''
      formState.costCenterName = ''
      formState.project = ''
      formState.paymentMode = 'CASH'
      formState.cashRegisterId = ''
      formState.paidToReceivedFrom = ''
      formState.description = ''
    }
  }
})

watch(isOpen, (val) => {
  emit('update:modelValue', val)
})

// Resolve whether the typed cost center matches a known one
const resolvedCostCenter = computed(() => {
  if (!formState.costCenterName.trim()) return null
  return costCenters.value.find(
    c => c.name.trim().toLowerCase() === formState.costCenterName.trim().toLowerCase()
  ) || null
})

// Show registers filtered by cost center when one is resolved,
// otherwise show ALL registers so the user can always pick from their accounts.
const filteredRegisters = computed(() => {
  if (formState.paymentMode !== 'CASH') return []
  if (registers.value.length === 0) return []

  // If cost center is resolved, restrict to matching drawers
  if (resolvedCostCenter.value) {
    return registers.value.filter(r => r.cost_center_id === resolvedCostCenter.value!.id)
  }

  // No cost center typed yet — show all so the user can see their accounts
  return registers.value
})

// When user picks a register and cost center is still blank,
// auto-fill the cost center name from the selected register.
const onRegisterChange = (registerId: string) => {
  const reg = registers.value.find(r => r.id === registerId)
  if (reg && !formState.costCenterName.trim() && reg.cost_center_name) {
    formState.costCenterName = reg.cost_center_name
  }
}

// If the cost center changes and the currently selected register no longer
// belongs to it, auto-switch to the first valid register.
watch(filteredRegisters, (newRegs) => {
  if (formState.paymentMode === 'CASH' && resolvedCostCenter.value) {
    // Only enforce when a cost center IS resolved
    const stillValid = newRegs.some(r => r.id === formState.cashRegisterId)
    if (!stillValid) {
      formState.cashRegisterId = newRegs[0]?.id || ''
    }
  }
})

const loadData = async () => {
  await Promise.all([
    fetchCategories(),
    fetchCostCenters(),
    fetchRegisters(),
    fetchRecentProjects()
  ])
  // Note: cashRegisterId is intentionally NOT pre-assigned here.
  // The filteredRegisters computed + watcher handles auto-selection
  // once the user picks a cost center.
}

const handleSave = async () => {
  if (!formState.categoryName.trim()) {
    alert('Please enter or select a Category')
    return
  }
  if (!formState.costCenterName.trim()) {
    alert('Please enter or select a Cost Center')
    return
  }
  const amt = parseFloat(formState.amount)
  if (isNaN(amt) || amt <= 0) {
    alert('Please enter a valid amount greater than 0')
    return
  }

  // If CASH mode, a specific drawer must be selected
  if (formState.paymentMode === 'CASH' && !formState.cashRegisterId) {
    alert('Please select a Cash Drawer for this CASH expense (or switch the payment mode)')
    return
  }

  saving.value = true
  try {
    const payload = {
      categoryName: formState.categoryName.trim(),
      costCenterName: formState.costCenterName.trim(),
      amount: amt,
      expenseDate: formState.expenseDate,
      description: formState.description,
      project: formState.project.trim() || null,
      paymentMode: formState.paymentMode,
      cashRegisterId: formState.paymentMode === 'CASH' ? formState.cashRegisterId : null,
      paidToReceivedFrom: formState.paidToReceivedFrom.trim() || null
    }

    let result
    if (props.expense?.id) {
      result = await updateExpense(props.expense.id, payload)
    } else {
      result = await createExpense(payload)
    }

    if (result.success) {
      emit('saved')
      isOpen.value = false
    } else {
      alert(result.message || 'Operation failed')
    }
  } catch (err: any) {
    alert(err.message || 'An error occurred')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <!-- Backdrop inside the relative phone container -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-xs rounded-3xl"
        @click="isOpen = false"
      ></div>
    </Transition>

    <!-- Bottom Sheet sliding up inside the relative phone container -->
    <Transition
      enter-active-class="transition duration-300 ease-out transform"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition duration-200 ease-in transform"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="isOpen"
        class="absolute inset-x-0 bottom-0 z-40 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200/50 dark:border-slate-800/50 shadow-2xl max-h-[80vh] overflow-y-auto pb-8 flex flex-col scrollbar-none"
      >
        <div class="px-5 py-4 flex flex-col gap-4">
          <!-- Drag Handle Indicator for Mobile feel -->
          <div class="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-1 flex-shrink-0"></div>

          <!-- Header -->
          <div class="flex justify-between items-center">
            <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {{ props.expense ? 'Edit Expense' : 'Log New Expense' }}
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              class="rounded-full"
              @click="isOpen = false"
            />
          </div>

          <!-- Form Inputs -->
          <div class="space-y-4">
            <!-- Amount Input (Large & Clear) -->
            <div class="flex flex-col gap-1 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Amount (₹)</label>
              <div class="flex items-center gap-1">
                <span class="text-xl font-black text-slate-400">₹</span>
                <input
                  type="number"
                  v-model="formState.amount"
                  placeholder="0.00"
                  class="w-32 text-center text-2xl font-black bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 focus:ring-0"
                  required
                  step="0.01"
                />
              </div>
            </div>

            <!-- Date Picker -->
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Expense Date</label>
              <UInput
                type="date"
                v-model="formState.expenseDate"
                size="md"
                icon="i-heroicons-calendar"
                class="w-full"
              />
            </div>

            <!-- Autocomplete Category Input -->
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Category</label>
              <UInput
                v-model="formState.categoryName"
                list="categories-datalist"
                placeholder="Type or select category"
                size="md"
                icon="i-heroicons-tag"
                class="w-full"
              />
              <datalist id="categories-datalist">
                <option v-for="cat in categories" :key="cat.id" :value="cat.name" />
              </datalist>
            </div>

            <!-- Autocomplete Cost Center Input -->
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Cost Center</label>
              <UInput
                v-model="formState.costCenterName"
                list="cost-centers-datalist"
                placeholder="Type or select cost center"
                size="md"
                icon="i-heroicons-building-office"
                class="w-full"
              />
              <datalist id="cost-centers-datalist">
                <option v-for="cc in costCenters" :key="cc.id" :value="cc.name" />
              </datalist>
            </div>

            <!-- Autocomplete Project Input -->
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Project (Optional)</label>
              <UInput
                v-model="formState.project"
                list="projects-datalist"
                placeholder="Type or select project site"
                size="md"
                icon="i-heroicons-folder-open"
                class="w-full"
              />
              <datalist id="projects-datalist">
                <option v-for="proj in projects" :key="proj" :value="proj" />
              </datalist>
            </div>

            <!-- Payment Mode Select -->
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Payment Mode</label>
              <div class="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                <button
                  v-for="mode in ['CASH', 'BANK', 'CARD', 'OTHER']"
                  :key="mode"
                  type="button"
                  class="py-2 text-[9px] font-bold rounded-lg uppercase tracking-wide transition-all"
                  :class="[
                    formState.paymentMode === mode
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  ]"
                  @click="formState.paymentMode = mode as any"
                >
                  {{ mode }}
                </button>
              </div>
            </div>

            <!-- Cash Account/Register Selection -->
            <div v-if="formState.paymentMode === 'CASH'" class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Deduct From Cash Account</label>
              <USelect
                v-model="formState.cashRegisterId"
                :items="filteredRegisters.map(r => ({ label: `${r.name}  (${r.cost_center_name || 'No Center'})  ₹${parseFloat(r.balance).toFixed(2)}`, value: r.id }))"
                placeholder="Select cash drawer"
                class="w-full"
                size="md"
                @click="blurActiveInput"
                @change="onRegisterChange(formState.cashRegisterId)"
                :disabled="filteredRegisters.length === 0"
              />
              <!-- State-aware helper texts -->
              <span v-if="registers.length === 0" class="text-[8px] font-bold text-amber-500 px-1 mt-0.5">
                No cash drawers yet — create one in the Cash tab first
              </span>
              <span
                v-else-if="resolvedCostCenter && filteredRegisters.length === 0"
                class="text-[8px] font-bold text-red-500 px-1 mt-0.5"
              >
                No drawers linked to "{{ formState.costCenterName }}" — add one in the Cash tab
              </span>
              <span
                v-else-if="resolvedCostCenter && filteredRegisters.length > 0"
                class="text-[8px] font-semibold text-emerald-600 dark:text-emerald-400 px-1 mt-0.5"
              >
                Showing {{ filteredRegisters.length }} drawer(s) for {{ formState.costCenterName }}
              </span>
              <span v-else class="text-[8px] text-slate-400 px-1 mt-0.5">
                Tip: enter a Cost Center above to filter to its drawers only
              </span>
            </div>

            <!-- Paid To / Received From -->
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Paid To / Received From</label>
              <UInput
                v-model="formState.paidToReceivedFrom"
                placeholder="Enter recipient, vendor, source..."
                size="md"
                icon="i-heroicons-user"
                class="w-full"
              />
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Description / Notes</label>
              <UTextarea
                v-model="formState.description"
                placeholder="Enter purpose, merchant..."
                :rows="2"
                size="md"
                class="w-full"
              />
            </div>

            <!-- Action Button -->
            <div class="pt-2">
              <UButton
                block
                color="primary"
                size="md"
                :loading="saving"
                label="Save Record"
                class="rounded-xl font-bold uppercase tracking-wider h-11"
                @click="handleSave"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
