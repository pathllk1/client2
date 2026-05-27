<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useApi } from '@/utils/api'
import { useToast } from '@nuxt/ui/composables'
import FirmForm from '@/components/admin/FirmForm.vue'

const api = useApi()
const toast = useToast()

const firms = ref<any[]>([])
const users = ref<any[]>([])
const loading = ref(false)

const items = [
  { label: 'Firms Management', icon: 'i-heroicons-building-office-2', slot: 'firms' },
  { label: 'User Directory', icon: 'i-heroicons-user-group', slot: 'users' },
  { label: 'Postgres Console', icon: 'i-heroicons-circle-stack', slot: 'postgres' }
]

const stats = ref([
  { label: 'Total Firms', value: '0', icon: 'i-heroicons-building-office-2' },
  { label: 'Total Users', value: '0', icon: 'i-heroicons-user-group' },
  { label: 'System Health', value: 'Healthy', icon: 'i-heroicons-heart', color: 'success' },
])

const pgTables = ref<string[]>([])
const selectedTable = ref('')
const tableData = ref<any[]>([])
const tableTotal = ref(0)
const tableColumns = ref<any[]>([])
const pgLoading = ref(false)
const limit = ref(100)
const skip = ref(0)

const fetchPgTables = async () => {
  pgLoading.value = true
  try {
    const res = await api.get('/pg/database/tables')
    if (res.success) {
      pgTables.value = res.tables
      if (res.tables.length > 0) {
        selectedTable.value = res.tables[0]
        await fetchTableData(res.tables[0])
      }
    }
  } catch (err: any) {
    toast.add({ title: 'Postgres DB Connection Offline', description: err.message, color: 'error' })
  } finally {
    pgLoading.value = false
  }
}

const fetchTableData = async (table: string) => {
  if (!table) return
  pgLoading.value = true
  try {
    const res = await api.get(`/pg/database/${table}?limit=${limit.value}&skip=${skip.value}`)
    if (res.success) {
      tableData.value = res.data
      tableTotal.value = res.total
      if (res.data.length > 0) {
        tableColumns.value = Object.keys(res.data[0]).map(key => ({
          accessorKey: key,
          header: key
        }))
      } else {
        tableColumns.value = []
      }
    }
  } catch (err: any) {
    toast.add({ title: 'Failed to fetch table data', description: err.message, color: 'error' })
  } finally {
    pgLoading.value = false
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const [firmsRes, usersRes] = await Promise.all([
      api.get('/firms/admin'),
      api.get('/auth/users')
    ])

    if (firmsRes.success) {
      firms.value = firmsRes.data
      stats.value[0]!.value = firmsRes.data.length.toString()
    }
    
    if (usersRes.success) {
      users.value = usersRes.data
      stats.value[1]!.value = usersRes.data.length.toString()
    }

    await fetchPgTables()
  } catch (err: any) {
    toast.add({ title: 'System Error', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// Firm Modal Logic
const isFirmModalOpen = ref(false)
const selectedFirm = ref<any>(null)

const openFirmModal = (firm: any = null) => {
  selectedFirm.value = firm
  isFirmModalOpen.value = true
}

const deleteFirm = async (id: string) => {
  if (confirm('Are you sure you want to permanently delete this firm? This action cannot be undone and will fail if users are linked.')) {
    try {
      const res = await api.delete(`/firms/admin/${id}`)
      if (res.success) {
        toast.add({ title: 'Deleted', description: res.message, color: 'success' })
        fetchData()
      }
    } catch (err: any) {
      toast.add({ title: 'Delete Failed', description: err.message, color: 'error' })
    }
  }
}

const formatDate = (date: string) => new Date(date).toLocaleDateString()

const firmColumns = [
  { accessorKey: 'name', header: 'Firm Name' },
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'email', header: 'Official Email' },
  { accessorKey: 'phone_number', header: 'Contact' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

const userColumns = [
  { accessorKey: 'name', header: 'Full Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'System Role' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'createdAt', header: 'Joined' },
  { id: 'actions', header: 'Actions' }
]

// User Modal Logic
const isUserModalOpen = ref(false)
const selectedUser = ref<any>(null)
const savingUser = ref(false)

const userForm = reactive({
  name: '',
  email: '',
  role: 'standard',
  status: 'active'
})

const roleOptions = [
  { label: 'SuperAdmin', value: 'superadmin' },
  { label: 'Owner', value: 'Owner' },
  { label: 'Admin', value: 'Admin' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Staff', value: 'Staff' }
]

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Pending Approval', value: 'pending' },
  { label: 'Suspended', value: 'suspended' }
]

const getUserRoleDisplay = (user: any) => {
  if (user.role === 'superadmin') return 'SuperAdmin'
  if (user.firms && user.firms.length > 0) {
    return user.firms[0].grade
  }
  return 'Staff'
}

const openUserModal = (user: any) => {
  selectedUser.value = user
  userForm.name = user.name
  userForm.email = user.email
  userForm.role = user.role === 'superadmin' ? 'superadmin' : (user.firms && user.firms.length > 0 ? user.firms[0].grade : 'Staff')
  userForm.status = user.status || 'active'
  isUserModalOpen.value = true
}

const onUserSubmit = async () => {
  savingUser.value = true
  try {
    const res = await api.put(`/auth/users/${selectedUser.value._id}/status`, userForm)
    if (res.success) {
      toast.add({ title: 'User Updated', description: 'User role/status updated successfully', color: 'success' })
      isUserModalOpen.value = false
      fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Update Failed', description: err.message, color: 'error' })
  } finally {
    savingUser.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col space-y-6 overflow-hidden p-1">
    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase italic">SuperAdmin Console</h1>
        <p class="text-xs text-gray-500 font-medium tracking-widest mt-1">Enterprise Infrastructure Management</p>
      </div>
      <UButton icon="i-heroicons-plus" label="Register New Firm" size="lg" @click="openFirmModal()" />
    </div>

    <!-- System Stats -->
    <div class="grid grid-cols-3 gap-4 shrink-0">
      <div v-for="stat in stats" :key="stat.label" 
           class="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm flex items-center gap-4">
        <div class="p-3 rounded-lg bg-primary-500/10">
          <UIcon :name="stat.icon" class="w-6 h-6 text-primary" />
        </div>
        <div>
          <p class="text-[10px] text-gray-400 uppercase font-black tracking-widest">{{ stat.label }}</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white leading-none mt-1">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <UTabs :items="items" class="flex-1 min-h-0 flex flex-col" :ui="{ list: 'shrink-0' }">
      <template #firms>
        <UCard class="flex-1 min-h-0 flex flex-col border-none shadow-none" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col' }">
          <div class="flex-1 overflow-auto">
            <UTable :data="firms" :columns="firmColumns" :loading="loading" class="w-full text-sm">
              <template #name-cell="{ row }">
                <div class="font-bold text-gray-900 dark:text-white">{{ row.original.name }}</div>
              </template>

              <template #status-cell="{ row }">
                <UBadge :color="row.original.status === 'approved' ? 'success' : 'warning'" variant="subtle" size="sm" class="uppercase font-black text-[10px]">
                  {{ row.original.status }}
                </UBadge>
              </template>

              <template #actions-cell="{ row }">
                <div class="flex items-center gap-1">
                  <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openFirmModal(row.original)" />
                  <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="deleteFirm(row.original._id)" />
                </div>
              </template>
            </UTable>
          </div>
        </UCard>
      </template>

      <template #users>
        <UCard class="flex-1 min-h-0 flex flex-col border-none shadow-none" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col' }">
          <div class="flex-1 overflow-auto">
            <UTable :data="users" :columns="userColumns" :loading="loading" class="w-full text-sm">
              <template #role-cell="{ row }">
                <UBadge :color="row.original.role === 'superadmin' ? 'primary' : 'neutral'" variant="subtle" size="sm" class="uppercase font-black text-[10px]">
                  {{ getUserRoleDisplay(row.original) }}
                </UBadge>
              </template>

              <template #status-cell="{ row }">
                <UBadge :color="row.original.status === 'active' ? 'success' : row.original.status === 'pending' ? 'warning' : 'error'" variant="subtle" size="sm" class="uppercase font-black text-[10px]">
                  {{ row.original.status || 'active' }}
                </UBadge>
              </template>

              <template #createdAt-cell="{ row }">
                <span class="text-xs text-gray-500">{{ formatDate(row.original.createdAt) }}</span>
              </template>

              <template #actions-cell="{ row }">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openUserModal(row.original)" />
              </template>
            </UTable>
          </div>
        </UCard>
      </template>

      <template #postgres>
        <UCard class="flex-1 min-h-0 flex flex-col border-none shadow-none" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col gap-4' }">
          <div class="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl shrink-0">
            <span class="text-xs font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Select Database Table:</span>
            <USelect 
              v-model="selectedTable" 
              :items="pgTables" 
              class="w-64 bg-white dark:bg-zinc-800" 
              @change="fetchTableData(selectedTable)"
            />
            <UButton 
              icon="i-heroicons-arrow-path" 
              color="neutral" 
              variant="outline" 
              size="sm" 
              @click="fetchTableData(selectedTable)" 
              :loading="pgLoading"
            />
            <UBadge color="primary" variant="subtle" size="sm" class="ml-auto uppercase font-black text-[10px]">
              {{ tableTotal }} Records
            </UBadge>
          </div>
          <div class="flex-1 overflow-auto">
            <UTable :data="tableData" :columns="tableColumns" :loading="pgLoading" class="w-full text-xs font-mono">
              <template #empty-state>
                <div class="py-12 text-center text-gray-500 italic">No records found inside PostgreSQL table.</div>
              </template>
            </UTable>
          </div>
        </UCard>
      </template>
    </UTabs>

    <!-- Firm Registration Modal -->
    <UModal v-model:open="isFirmModalOpen" 
            :title="selectedFirm ? 'Update Firm Details' : 'Register New Enterprise Firm'"
            :ui="{ content: 'sm:max-w-7xl' }">
      <template #body>
        <div class="max-h-[85vh] overflow-y-auto custom-scrollbar px-4">
          <FirmForm :firm="selectedFirm" @success="fetchData" @close="isFirmModalOpen = false" />
        </div>
      </template>
    </UModal>

    <!-- User Management Modal -->
    <UModal v-model:open="isUserModalOpen" 
            title="Edit User Status & Role"
            :ui="{ content: 'sm:max-w-md' }">
      <template #body>
        <form @submit.prevent="onUserSubmit" class="space-y-4 px-4 py-2">
          <UFormField label="Name" class="w-full">
            <UInput v-model="userForm.name" required class="w-full" />
          </UFormField>
          <UFormField label="Email" class="w-full">
            <UInput v-model="userForm.email" type="email" required class="w-full" />
          </UFormField>
          <UFormField label="System Role" class="w-full">
            <USelect v-model="userForm.role" :items="roleOptions" class="w-full" />
          </UFormField>
          <UFormField label="Account Status" class="w-full">
            <USelect v-model="userForm.status" :items="statusOptions" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" label="Cancel" @click="isUserModalOpen = false" />
            <UButton type="submit" label="Save Changes" :loading="savingUser" />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
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
