<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useExpenses } from '@/composables/useExpenses'
import CashInModal from '@/components/expenses/CashInModal.vue'

const {
  registers,
  transactions,
  costCenters,
  fetchRegisters,
  fetchRegisterTransactions,
  fetchCostCenters,
  createRegister,
  updateRegister
} = useExpenses()

const activeRegisterId = ref<string | null>(null)
const showCashIn = ref(false)
const showAddRegister = ref(false)
const newRegisterName = ref('')
const selectedCostCenterId = ref('')

// State for linking an existing unlinked register to a cost center
const editingRegisterId = ref<string | null>(null)
const linkCostCenterId = ref('')

const loadData = async () => {
  await Promise.all([
    fetchRegisters(),
    fetchCostCenters()
  ])
  if (registers.value.length > 0 && !activeRegisterId.value) {
    selectRegister(registers.value[0]!.id)
  }
  if (costCenters.value.length > 0 && !selectedCostCenterId.value) {
    selectedCostCenterId.value = costCenters.value[0]!.id
  }
}

onMounted(() => {
  loadData()
})

const selectRegister = (id: string) => {
  activeRegisterId.value = id
  fetchRegisterTransactions(id)
}

const startLinking = (reg: any) => {
  editingRegisterId.value = reg.id
  // Pre-select current cost center if already linked, else first available
  linkCostCenterId.value = reg.cost_center_id || (costCenters.value[0]?.id ?? '')
}

const cancelLinking = () => {
  editingRegisterId.value = null
  linkCostCenterId.value = ''
}

const handleLinkCostCenter = async () => {
  if (!editingRegisterId.value || !linkCostCenterId.value) {
    alert('Please select a Cost Center')
    return
  }
  const res = await updateRegister(editingRegisterId.value, { costCenterId: linkCostCenterId.value })
  if (res?.success) {
    await fetchRegisters()
    cancelLinking()
  } else {
    alert(res?.message || 'Failed to link cost center')
  }
}

const activeRegister = computed(() =>
  registers.value.find(r => r.id === activeRegisterId.value) ?? null
)

const handleAddRegister = async () => {
  if (!newRegisterName.value.trim()) return
  if (!selectedCostCenterId.value) {
    alert('Please select a Cost Center first')
    return
  }
  const res = await createRegister(newRegisterName.value.trim(), selectedCostCenterId.value)
  if (res.success) {
    newRegisterName.value = ''
    showAddRegister.value = false
    await fetchRegisters()
    if (res.data) selectRegister(res.data.id)
  } else {
    alert(res.message || 'Failed to create register')
  }
}

const handleDepositComplete = () => {
  loadData()
  if (activeRegisterId.value) {
    fetchRegisterTransactions(activeRegisterId.value)
  }
}

const formatCurrency = (val: string | number) => {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(num) ? '₹0.00' : `₹${num.toFixed(2)}`
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <!-- Header Controls -->
    <div class="flex justify-between items-center px-1">
      <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        My Cash Registers
      </h3>
      <UButton
        size="xs"
        variant="ghost"
        color="primary"
        icon="i-heroicons-plus"
        label="Add Cash drawer"
        class="font-black uppercase tracking-wider text-[9px]"
        @click="showAddRegister = !showAddRegister"
      />
    </div>

    <!-- Create Cash Drawer inline input on mobile -->
    <div
      v-if="showAddRegister"
      class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-3xl flex flex-col gap-3 shadow-md"
    >
      <div class="text-[9px] font-black uppercase tracking-wider text-slate-400">New Cash Drawer</div>
      <div class="flex flex-col gap-2.5">
        <UInput
          v-model="newRegisterName"
          placeholder="Drawer name (e.g. Home Cash Drawer)"
          size="sm"
          class="w-full"
        />
        <USelect
          v-model="selectedCostCenterId"
          :items="costCenters.map(cc => ({ label: cc.name, value: cc.id }))"
          placeholder="Select Cost Center"
          size="sm"
          class="w-full"
        />
        <div class="flex gap-2 justify-end mt-1">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            label="Cancel"
            class="font-bold text-xs"
            @click="showAddRegister = false"
          />
          <UButton
            size="xs"
            color="success"
            label="Create Drawer"
            class="font-bold text-xs px-3"
            @click="handleAddRegister"
          />
        </div>
      </div>
    </div>

    <!-- Horizontal Swipeable Register Cards -->
    <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory px-1">
      <div
        v-for="reg in registers"
        :key="reg.id"
        class="flex-shrink-0 w-48 snap-center p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden"
        :class="[
          activeRegisterId === reg.id
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-100 dark:shadow-none'
            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
        ]"
        @click="selectRegister(reg.id)"
      >
        <div>
          <span class="text-xs font-black uppercase tracking-wide leading-tight line-clamp-1">
            {{ reg.name }}
          </span>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span 
              class="text-[8px] font-black uppercase tracking-widest block"
              :class="reg.cost_center_id 
                ? (activeRegisterId === reg.id ? 'text-indigo-200 opacity-75' : 'text-indigo-600 dark:text-indigo-400 opacity-75')
                : 'text-amber-400'"
            >
              {{ reg.cost_center_name || '⚠ Unlinked' }}
            </span>
            <!-- Link / Change button -->
            <button
              class="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full transition-all"
              :class="reg.cost_center_id
                ? (activeRegisterId === reg.id ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200')
                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-200'"
              @click.stop="startLinking(reg)"
            >
              {{ reg.cost_center_id ? 'Change' : 'Link' }}
            </button>
          </div>
        </div>
        
        <div>
          <span class="text-[9px] font-bold uppercase tracking-wider opacity-60">Balance</span>
          <p
            class="text-lg font-black leading-none mt-1"
            :class="[
              activeRegisterId === reg.id
                ? 'text-white'
                : parseFloat(reg.balance) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
            ]"
          >
            {{ formatCurrency(reg.balance) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Inline Link Cost Center Panel -->
    <div
      v-if="editingRegisterId"
      class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-3xl flex flex-col gap-3 shadow-sm"
    >
      <div class="flex items-center justify-between">
        <div>
          <div class="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Link to Cost Center</div>
          <div class="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5 font-semibold">
            {{ registers.find(r => r.id === editingRegisterId)?.name }}
          </div>
        </div>
        <button @click="cancelLinking" class="text-amber-500 hover:text-amber-700">
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
      <USelect
        v-model="linkCostCenterId"
        :items="costCenters.map(cc => ({ label: cc.name, value: cc.id }))"
        placeholder="Select Cost Center"
        size="sm"
        class="w-full"
      />
      <div class="flex gap-2 justify-end">
        <UButton
          size="xs" color="neutral" variant="ghost"
          label="Cancel" class="font-bold"
          @click="cancelLinking"
        />
        <UButton
          size="xs" color="warning"
          icon="i-heroicons-link"
          label="Save Link"
          class="font-bold px-3"
          @click="handleLinkCostCenter"
        />
      </div>
    </div>

    <!-- Register Details Panel -->
    <div v-if="activeRegisterId" class="flex-1 flex flex-col gap-3">
      <!-- Actions Bar -->
      <div class="flex justify-between items-center px-1">
        <div>
          <h4 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Transaction History
          </h4>
          <p v-if="activeRegister" class="text-[9px] text-slate-400 font-semibold mt-0.5">
            {{ activeRegister.name }}
            <span v-if="activeRegister.cost_center_name" class="text-indigo-500"> · {{ activeRegister.cost_center_name }}</span>
          </p>
        </div>
        <UButton
          size="xs"
          color="success"
          icon="i-heroicons-arrow-down-tray"
          label="Deposit Cash"
          class="font-bold text-[9px] uppercase tracking-wider"
          @click="showCashIn = true"
        />
      </div>

      <!-- Transaction Log List -->
      <div v-if="transactions.length === 0" class="py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
        <UIcon name="i-heroicons-banknotes" class="w-10 h-10 stroke-1 mb-2" />
        <span class="text-xs font-black uppercase tracking-wider">No ledger entries</span>
      </div>

      <div v-else class="space-y-2 pb-8">
        <div
          v-for="tx in transactions"
          :key="tx.id"
          class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-3 rounded-2xl shadow-sm flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <!-- Transaction Type Icon -->
            <div
              class="p-2 rounded-xl text-white flex items-center justify-center shadow-sm"
              :class="[
                tx.type === 'CASH_IN' ? 'bg-emerald-500' : 'bg-red-500'
              ]"
            >
              <UIcon :name="tx.type === 'CASH_IN' ? 'i-heroicons-plus' : 'i-heroicons-minus'" class="w-3.5 h-3.5" />
            </div>
            <div>
              <h5 class="font-bold text-xs text-slate-800 dark:text-slate-200 leading-tight">
                {{ tx.description }}
              </h5>
              <div class="flex items-center gap-1.5 mt-0.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                <span>{{ formatDate(tx.created_at) }}</span>
                <span>•</span>
                <span class="text-slate-500">Bal: {{ formatCurrency(tx.running_balance) }}</span>
              </div>
            </div>
          </div>
          
          <span
            class="font-black text-xs"
            :class="[
              tx.type === 'CASH_IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'
            ]"
          >
            {{ tx.type === 'CASH_IN' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CashInModal
      v-model="showCashIn"
      :registerId="activeRegisterId"
      @saved="handleDepositComplete"
    />
  </div>
</template>
