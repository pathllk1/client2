<template>
  <div class="min-h-screen bg-slate-50 dark:bg-zinc-950 p-6 w-full mx-auto space-y-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-zinc-800 pb-6 shrink-0">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Labor Management</h1>
        <p class="text-slate-500 dark:text-zinc-400 font-medium text-sm mt-1">Track work batches, worker attendance, and centralised ledger payouts.</p>
      </div>
      <div class="flex gap-3 w-full md:w-auto">
        <UButton 
          icon="i-heroicons-user-plus" 
          label="New Leader" 
          color="neutral" 
          variant="outline" 
          size="lg" 
          @click="openLeaderModal()" 
        />
        <UButton 
          icon="i-heroicons-calendar-days" 
          label="Start Work Period" 
          color="primary" 
          size="lg" 
          @click="openPeriodModal()" 
        />
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
      <div class="p-5 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/10 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-wider opacity-85">Total Labor Leaders</p>
          <p class="text-3xl font-black mt-1">{{ leaders.length }}</p>
        </div>
        <div class="p-3 bg-white/10 rounded-xl">
          <UIcon name="i-heroicons-user-group" class="w-8 h-8" />
        </div>
      </div>
      <div class="p-5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/10 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-wider opacity-85">Active Open Periods</p>
          <p class="text-3xl font-black mt-1">{{ openPeriodsCount }}</p>
        </div>
        <div class="p-3 bg-white/10 rounded-xl">
          <UIcon name="i-heroicons-clock" class="w-8 h-8" />
        </div>
      </div>
      <div class="p-5 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl text-white shadow-lg shadow-slate-900/10 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-wider opacity-85">Total Batches</p>
          <p class="text-3xl font-black mt-1">{{ periods.length }}</p>
        </div>
        <div class="p-3 bg-white/10 rounded-xl">
          <UIcon name="i-heroicons-archive-box" class="w-8 h-8" />
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Recent Work Periods -->
      <div class="lg:col-span-2 space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <UIcon name="i-heroicons-queue-list" class="w-6 h-6 text-indigo-500" />
            Recent Work Periods
          </h2>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-widest">Filter:</span>
            <USelect 
              :model-value="leaderFilter || 'All Leaders'" 
              @update:model-value="(val: any) => handleLeaderFilterUpdate(val)"
              :items="leaderFilterOptions" 
              class="w-40 bg-white" 
            />
          </div>
        </div>

        <div v-if="loading && periods.length === 0" class="flex justify-center py-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-indigo-500" />
        </div>

        <div v-else-if="filteredPeriods.length === 0" class="bg-white dark:bg-zinc-900 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-16 text-center">
          <div class="w-16 h-16 bg-slate-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-calendar" class="w-8 h-8 text-slate-300 dark:text-zinc-600" />
          </div>
          <h3 class="text-slate-900 dark:text-white font-bold mb-1">No work periods found</h3>
          <p class="text-slate-500 dark:text-zinc-400 text-sm max-w-xs mx-auto">Start a new work period to track worker attendance and settle payments.</p>
        </div>

        <div v-else class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Leader / Batch ID</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Date Range</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Status</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800">
                <tr 
                  v-for="p in filteredPeriods" 
                  :key="p.id" 
                  class="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition cursor-pointer group"
                  @click="goToPeriod(p.id)"
                >
                  <td class="px-6 py-4">
                    <div class="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">{{ p.leader_name }}</div>
                    <div class="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">ID: {{ p.id.substring(0, 8) }}</div>
                  </td>
                  <td class="px-6 py-4 text-sm font-medium text-slate-600 dark:text-zinc-300">
                    {{ formatDate(p.start_date) }} - {{ formatDate(p.end_date) }}
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <UBadge 
                      :color="p.status === 'Open' ? 'success' : 'neutral'" 
                      variant="subtle" 
                      size="sm"
                      class="uppercase font-black text-[9px]"
                    >
                      {{ p.status }}
                    </UBadge>
                  </td>
                  <td class="px-6 py-4 text-right" @click.stop>
                    <div class="flex items-center justify-end gap-2">
                      <UButton 
                        v-if="p.status === 'Open'"
                        icon="i-heroicons-pencil-square" 
                        variant="ghost" 
                        color="neutral" 
                        size="xs" 
                        @click="openPeriodModal(p)"
                      />
                      <UButton 
                        v-if="p.status === 'Open'"
                        icon="i-heroicons-trash" 
                        variant="ghost" 
                        color="error" 
                        size="xs" 
                        @click="handleDeletePeriod(p.id)"
                      />
                      <UButton 
                        label="View Details" 
                        size="xs" 
                        color="primary" 
                        variant="soft" 
                        :to="`/labor/periods/${p.id}`" 
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Leaders Sidebar -->
      <div class="space-y-4">
        <h2 class="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
          <UIcon name="i-heroicons-user-group" class="w-6 h-6 text-indigo-500" />
          Labor Leaders
        </h2>
        <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 p-2 divide-y divide-slate-100 dark:divide-zinc-800">
          <div v-if="leaders.length === 0" class="text-slate-400 dark:text-zinc-500 text-sm text-center py-12 italic font-medium">
            No leaders registered yet.
          </div>
          <div 
            v-else 
            v-for="l in leaders" 
            :key="l.id" 
            class="p-4 flex flex-col group hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition rounded-xl"
          >
            <div class="flex justify-between items-center mb-1">
              <div class="font-bold text-slate-900 dark:text-white">{{ l.name }}</div>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <UButton 
                  icon="i-heroicons-pencil-square" 
                  variant="ghost" 
                  color="neutral" 
                  size="xs" 
                  @click="openLeaderModal(l)" 
                />
                <UButton 
                  icon="i-heroicons-trash" 
                  variant="ghost" 
                  color="error" 
                  size="xs" 
                  @click="handleDeleteLeader(l.id, l.name)" 
                />
              </div>
            </div>
            
            <div class="flex justify-between items-center mb-2">
              <div class="text-xs text-slate-400 dark:text-zinc-500 font-medium">{{ l.phone || 'No phone recorded' }}</div>
              <UBadge 
                :color="l.status === 'Active' ? 'primary' : 'neutral'" 
                variant="subtle" 
                size="sm"
                class="uppercase font-black text-[9px] scale-90"
              >
                {{ l.status }}
              </UBadge>
            </div>

            <div v-if="l.bank_name" class="bg-slate-50 dark:bg-zinc-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800 space-y-1">
              <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5 text-indigo-400" />
                {{ l.bank_name }}
              </div>
              <div class="text-[9px] font-mono text-slate-400 pl-5">
                {{ l.account_number || 'No A/C' }} • {{ l.ifsc_code || 'No IFSC' }}
              </div>
            </div>
            <div v-else class="text-[9px] text-slate-300 dark:text-zinc-600 italic">No bank details added</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Leader Modal -->
    <UModal v-model:open="isLeaderModalOpen" :title="editingLeader ? 'Edit Labor Leader' : 'Register Labor Leader'">
      <template #body>
        <form @submit.prevent="submitLeader" class="p-6 space-y-4">
          <UFormField label="Leader Name" required>
            <UInput v-model="leaderForm.name" placeholder="Enter name..." required class="w-full" />
          </UFormField>
          <UFormField label="Phone Number">
            <UInput v-model="leaderForm.phone" placeholder="Enter phone..." class="w-full" />
          </UFormField>
          <UFormField v-if="editingLeader" label="Status">
            <USelect v-model="leaderForm.status" :items="['Active', 'Inactive']" class="w-full" />
          </UFormField>

          <div class="bg-slate-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-3">
            <h4 class="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Bank Details (Optional)</h4>
            <UFormField label="Bank Name">
              <UInput v-model="leaderForm.bank_name" placeholder="e.g. HDFC Bank" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Account Number">
                <UInput v-model="leaderForm.account_number" placeholder="000000000" class="w-full" />
              </UFormField>
              <UFormField label="IFSC Code">
                <UInput v-model="leaderForm.ifsc_code" placeholder="IFSC0001" class="w-full" />
              </UFormField>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <UButton label="Cancel" variant="ghost" color="neutral" @click="isLeaderModalOpen = false" />
            <UButton type="submit" label="Save Leader" color="primary" :loading="savingLeader" />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Period Modal -->
    <UModal v-model:open="isPeriodModalOpen" :title="editingPeriod ? 'Edit Work Period' : 'Start Work Period'">
      <template #body>
        <form @submit.prevent="submitPeriod" class="p-6 space-y-4">
          <UFormField label="Select Labor Leader" required>
            <USelect 
              v-model="periodForm.leader_id" 
              :items="leaderSelectOptions" 
              required 
              class="w-full" 
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Start Date" required>
              <UInput v-model="periodForm.start_date" type="date" required class="w-full" />
            </UFormField>
            <UFormField label="End Date" required>
              <UInput v-model="periodForm.end_date" type="date" required class="w-full" />
            </UFormField>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <UButton label="Cancel" variant="ghost" color="neutral" @click="isPeriodModalOpen = false" />
            <UButton type="submit" label="Initialize Period" color="primary" :loading="savingPeriod" />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLabor } from '@/composables/useLabor'
import { useToast } from '@nuxt/ui/composables'

const router = useRouter()
const toast = useToast()
const { selectedFirmId } = useAuth()
const { 
  loading, leaders, periods, fetchLeaders, createLeader, updateLeader, deleteLeader,
  fetchPeriods, createPeriod, updatePeriod, deletePeriod 
} = useLabor()

// Filter
const leaderFilter = ref('')
const leaderFilterOptions = computed(() => {
  const list = leaders.value.map(l => ({ label: l.name, value: l.name }))
  list.unshift({ label: 'All Leaders', value: 'All Leaders' })
  return list
})

const handleLeaderFilterUpdate = (val: string) => {
  if (val === 'All Leaders') {
    leaderFilter.value = ''
  } else {
    leaderFilter.value = val
  }
}

const filteredPeriods = computed(() => {
  if (!leaderFilter.value) return periods.value
  return periods.value.filter(p => p.leader_name === leaderFilter.value)
})

const openPeriodsCount = computed(() => {
  return periods.value.filter(p => p.status === 'Open').length
})

// Load Data
const loadData = async () => {
  if (!selectedFirmId.value) return
  try {
    await Promise.all([
      fetchLeaders(selectedFirmId.value),
      fetchPeriods(selectedFirmId.value)
    ])
  } catch (err: any) {
    toast.add({ title: 'Failed to load data', description: err.message, color: 'error' })
  }
}

onMounted(loadData)

// Navigation
const goToPeriod = (id: string) => {
  router.push(`/labor/periods/${id}`)
}

const formatDate = (d: string) => {
  if (!d) return ''
  const dateObj = new Date(d)
  return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Modals State
const isLeaderModalOpen = ref(false)
const editingLeader = ref<any>(null)
const savingLeader = ref(false)

const leaderForm = reactive({
  name: '',
  phone: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  status: 'Active'
})

const openLeaderModal = (leader: any = null) => {
  editingLeader.value = leader
  if (leader) {
    leaderForm.name = leader.name
    leaderForm.phone = leader.phone || ''
    leaderForm.bank_name = leader.bank_name || ''
    leaderForm.account_number = leader.account_number || ''
    leaderForm.ifsc_code = leader.ifsc_code || ''
    leaderForm.status = leader.status || 'Active'
  } else {
    leaderForm.name = ''
    leaderForm.phone = ''
    leaderForm.bank_name = ''
    leaderForm.account_number = ''
    leaderForm.ifsc_code = ''
    leaderForm.status = 'Active'
  }
  isLeaderModalOpen.value = true
}

const submitLeader = async () => {
  if (!selectedFirmId.value) return
  savingLeader.value = true
  try {
    if (editingLeader.value) {
      const res = await updateLeader(editingLeader.value.id, leaderForm)
      if (res.success) {
        toast.add({ title: 'Leader Updated', description: 'Leader data has been updated', color: 'success' })
        isLeaderModalOpen.value = false
        loadData()
      }
    } else {
      const res = await createLeader({ firm_id: selectedFirmId.value, ...leaderForm })
      if (res.success) {
        toast.add({ title: 'Leader Registered', description: 'New leader added successfully', color: 'success' })
        isLeaderModalOpen.value = false
        loadData()
      }
    }
  } catch (err: any) {
    toast.add({ title: 'Operation Failed', description: err.message, color: 'error' })
  } finally {
    savingLeader.value = false
  }
}

const handleDeleteLeader = async (id: string, name: string) => {
  if (confirm(`Are you sure you want to delete labor leader "${name}"? This will only work if there are no work periods associated with them.`)) {
    try {
      const res = await deleteLeader(id)
      if (res.success) {
        toast.add({ title: 'Deleted', description: res.message || 'Leader removed', color: 'success' })
        loadData()
      }
    } catch (err: any) {
      toast.add({ title: 'Delete Failed', description: err.message, color: 'error' })
    }
  }
}

// Periods Modals State
const isPeriodModalOpen = ref(false)
const editingPeriod = ref<any>(null)
const savingPeriod = ref(false)

const periodForm = reactive({
  leader_id: '',
  start_date: '',
  end_date: ''
})

const leaderSelectOptions = computed(() => {
  return leaders.value
    .filter(l => l.status === 'Active')
    .map(l => ({ label: l.name, value: l.id }))
})

const openPeriodModal = (period: any = null) => {
  editingPeriod.value = period
  if (period) {
    periodForm.leader_id = period.leader_id
    periodForm.start_date = (period.start_date || '').split('T')[0] || ''
    periodForm.end_date = (period.end_date || '').split('T')[0] || ''
  } else {
    periodForm.leader_id = leaders.value[0]?.id || ''
    periodForm.start_date = new Date().toISOString().split('T')[0] || ''
    periodForm.end_date = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0] || ''
  }
  isPeriodModalOpen.value = true
}

const submitPeriod = async () => {
  if (!selectedFirmId.value) return
  savingPeriod.value = true
  try {
    if (editingPeriod.value) {
      const res = await updatePeriod(editingPeriod.value.id, periodForm)
      if (res.success) {
        toast.add({ title: 'Period Updated', description: 'Work period parameters updated', color: 'success' })
        isPeriodModalOpen.value = false
        loadData()
      }
    } else {
      const res = await createPeriod({ firm_id: selectedFirmId.value, ...periodForm })
      if (res.success) {
        toast.add({ title: 'Period Initialized', description: 'New work period created successfully', color: 'success' })
        isPeriodModalOpen.value = false
        loadData()
      }
    }
  } catch (err: any) {
    toast.add({ title: 'Operation Failed', description: err.message, color: 'error' })
  } finally {
    savingPeriod.value = false
  }
}

const handleDeletePeriod = async (id: string) => {
  if (confirm('Are you sure you want to delete this work period? This will permanently remove all attendance and worker data for this batch.')) {
    try {
      const res = await deletePeriod(id)
      if (res.success) {
        toast.add({ title: 'Deleted', description: 'Work period removed', color: 'success' })
        loadData()
      }
    } catch (err: any) {
      toast.add({ title: 'Delete Failed', description: err.message, color: 'error' })
    }
  }
}
</script>
