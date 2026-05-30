<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/utils/api'
import { useToast } from '@nuxt/ui/composables'

const api = useApi()
const toast = useToast()

interface COAEntry {
  _id: string
  account_name: string
  account_type: string
  account_code?: string
  is_system: boolean
  is_active: boolean
  opening_balance?: number
  balance_type?: 'DR' | 'CR'
  current_balance?: number
  current_balance_type?: 'DR' | 'CR'
}

const coaData = ref<COAEntry[]>([])
const loading = ref(true)
const search = ref('')
const typeFilter = ref('')
const isModalOpen = ref(false)
const saving = ref(false)

const accountTypes = [
  { label: 'Income', value: 'INCOME' },
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Asset', value: 'ASSET' },
  { label: 'Liability', value: 'LIABILITY' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank', value: 'BANK' },
  { label: 'Debtor', value: 'DEBTOR' },
  { label: 'Creditor', value: 'CREDITOR' },
  { label: 'Labor Leader', value: 'LABOR_LEADER' },
  { label: 'Capital', value: 'CAPITAL' },
  { label: 'General', value: 'GENERAL' },
  { label: 'Payable', value: 'PAYABLE' }
]

const filterOptions = computed(() => [
  { label: 'All Types', value: '' },
  ...accountTypes
])

const form = ref({
  _id: '',
  account_name: '',
  account_type: 'GENERAL',
  opening_balance: 0,
  balance_type: 'DR'
})

const fetchCOA = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (search.value) params.append('search', search.value)
    if (typeFilter.value) params.append('type', typeFilter.value)
    
    const response = await api.get(`/accounting/coa?${params.toString()}`)
    coaData.value = response.data
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const openModal = (entry?: any) => {
  if (entry) {
    form.value = {
      _id: entry._id,
      account_name: entry.account_name,
      account_type: entry.account_type,
      opening_balance: entry.opening_balance || 0,
      balance_type: entry.balance_type || 'DR'
    }
  } else {
    form.value = {
      _id: '',
      account_name: '',
      account_type: 'GENERAL',
      opening_balance: 0,
      balance_type: 'DR'
    }
  }
  isModalOpen.value = true
}

const saveAccount = async () => {
  saving.value = true
  try {
    if (form.value._id) {
      await api.put(`/accounting/coa/${form.value._id}`, form.value)
      toast.add({ title: 'Success', description: 'Account updated successfully', color: 'success' })
    } else {
      await api.post('/accounting/coa', form.value)
      toast.add({ title: 'Success', description: 'Account created successfully', color: 'success' })
    }
    isModalOpen.value = false
    fetchCOA()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const deleteAccount = async (id: string) => {
  if (!confirm('Are you sure you want to delete this account head?')) return
  try {
    await api.delete(`/accounting/coa/${id}`)
    toast.add({ title: 'Success', description: 'Account deleted successfully', color: 'success' })
    fetchCOA()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.message, color: 'error' })
  }
}

// Client-side Sorting
const sortKey = ref('account_name')
const sortDesc = ref(false)

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value
  } else {
    sortKey.value = key
    sortDesc.value = false
  }
}

const sortedCOAData = computed(() => {
  const data = [...coaData.value]
  if (!sortKey.value) return data

  return data.sort((a, b) => {
    let valA: any = a[sortKey.value as keyof COAEntry]
    let valB: any = b[sortKey.value as keyof COAEntry]

    // Handle number comparisons
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDesc.value ? valB - valA : valA - valB
    }

    // Handle string comparisons case-insensitively
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()

    if (valA === undefined || valA === null) valA = ''
    if (valB === undefined || valB === null) valB = ''

    if (valA < valB) return sortDesc.value ? 1 : -1
    if (valA > valB) return sortDesc.value ? -1 : 1
    return 0
  })
})

onMounted(fetchCOA)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.25em] text-emerald-600">Accounting Master</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-900">Chart of Accounts</h1>
        <p class="text-xs text-slate-500 font-bold mt-1">Manage and configure your firm's financial heads</p>
      </div>
      <div class="flex gap-2">
        <UButton
          color="primary"
          icon="i-heroicons-plus-16-solid"
          label="New Account"
          @click="openModal()"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <div class="flex-1 min-w-[280px]">
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search account heads..."
          @input="fetchCOA"
        />
      </div>
      <USelect
        v-model="typeFilter"
        :options="filterOptions"
        class="min-w-[150px]"
        @change="fetchCOA"
      />
    </div>

    <!-- Table -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
      <div v-else-if="coaData.length === 0" class="p-20 text-center space-y-4">
        <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-slate-200 mx-auto" />
        <p class="text-sm font-bold text-slate-500">No account heads found.</p>
      </div>
      <div v-else class="overflow-auto max-h-[600px] relative custom-scrollbar">
        <table class="w-full text-left border-collapse sticky-table">
          <thead class="sticky top-0 z-10 shadow-sm">
            <tr class="bg-slate-50 border-b border-slate-200">
              <th 
                class="px-6 py-4 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none group"
                @click="toggleSort('account_name')"
              >
                <div class="flex items-center gap-1.5">
                  <span>Account Master</span>
                  <UIcon 
                    v-if="sortKey === 'account_name'" 
                    :name="sortDesc ? 'i-heroicons-bars-arrow-down' : 'i-heroicons-bars-arrow-up'" 
                    class="w-3.5 h-3.5" 
                  />
                  <UIcon 
                    v-else 
                    name="i-heroicons-arrows-up-down" 
                    class="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" 
                  />
                </div>
              </th>
              <th 
                class="px-6 py-4 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none group"
                @click="toggleSort('account_type')"
              >
                <div class="flex items-center gap-1.5">
                  <span>Type</span>
                  <UIcon 
                    v-if="sortKey === 'account_type'" 
                    :name="sortDesc ? 'i-heroicons-bars-arrow-down' : 'i-heroicons-bars-arrow-up'" 
                    class="w-3.5 h-3.5" 
                  />
                  <UIcon 
                    v-else 
                    name="i-heroicons-arrows-up-down" 
                    class="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" 
                  />
                </div>
              </th>
              <th 
                class="px-6 py-4 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none group text-right"
                @click="toggleSort('opening_balance')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>Opening Balance</span>
                  <UIcon 
                    v-if="sortKey === 'opening_balance'" 
                    :name="sortDesc ? 'i-heroicons-bars-arrow-down' : 'i-heroicons-bars-arrow-up'" 
                    class="w-3.5 h-3.5" 
                  />
                  <UIcon 
                    v-else 
                    name="i-heroicons-arrows-up-down" 
                    class="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" 
                  />
                </div>
              </th>
              <th 
                class="px-6 py-4 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none group text-right"
                @click="toggleSort('current_balance')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>Current Balance</span>
                  <UIcon 
                    v-if="sortKey === 'current_balance'" 
                    :name="sortDesc ? 'i-heroicons-bars-arrow-down' : 'i-heroicons-bars-arrow-up'" 
                    class="w-3.5 h-3.5" 
                  />
                  <UIcon 
                    v-else 
                    name="i-heroicons-arrows-up-down" 
                    class="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" 
                  />
                </div>
              </th>
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="acc in sortedCOAData" :key="acc._id" class="hover:bg-green-100/80 dark:hover:bg-green-900/30 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div :class="['w-2 h-10 rounded-full', acc.is_system ? 'bg-indigo-500' : 'bg-emerald-500']"></div>
                  <div>
                    <p class="text-sm font-black text-slate-900 leading-tight">{{ acc.account_name }}</p>
                    <span v-if="acc.is_system" class="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-1 rounded">System</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-[10px] font-black uppercase text-slate-500 tracking-tight">{{ acc.account_type }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex flex-col items-end">
                  <span class="text-xs font-bold text-slate-700 font-mono">₹ {{ acc.opening_balance?.toLocaleString() || '0' }}</span>
                  <span class="text-[8px] font-black" :class="[acc.balance_type === 'DR' ? 'text-blue-600' : 'text-red-600']">{{ acc.balance_type }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex flex-col items-end">
                  <span class="text-xs font-black text-emerald-600 font-mono">₹ {{ acc.current_balance?.toLocaleString() || '0' }}</span>
                  <span class="text-[8px] font-black" :class="[acc.current_balance_type === 'DR' ? 'text-blue-600' : 'text-red-600']">{{ acc.current_balance_type }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-center gap-2">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    icon="i-heroicons-pencil-square"
                    size="xs"
                    @click="openModal(acc)"
                  />
                  <UButton
                    v-if="!acc.is_system"
                    variant="ghost"
                    color="error"
                    icon="i-heroicons-trash"
                    size="xs"
                    @click="deleteAccount(acc._id)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <UModal v-model:open="isModalOpen" :title="form._id ? 'Edit Account' : 'New Account'">
      <template #body>
        <form @submit.prevent="saveAccount" class="space-y-4 p-4">
          <UFormField label="Account Name" required>
            <UInput v-model="form.account_name" placeholder="e.g. Office Rent" required />
          </UFormField>
          
          <UFormField label="Account Type" required>
            <USelect
              v-model="form.account_type"
              :items="accountTypes"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Opening Balance (₹)">
            <div class="flex gap-2">
              <UInput v-model.number="form.opening_balance" type="number" step="0.01" class="flex-1" />
              <USelect
                v-model="form.balance_type"
                :options="[{ label: 'Debit (DR)', value: 'DR' }, { label: 'Credit (CR)', value: 'CR' }]"
                class="w-32"
              />
            </div>
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton variant="ghost" label="Cancel" @click="isModalOpen = false" />
            <UButton type="submit" color="primary" :label="form._id ? 'Update' : 'Create'" :loading="saving" />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
