<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useApi } from '@/utils/api'
import FirmForm from '@/components/admin/FirmForm.vue'

const api = useApi()
const toast = useToast()

const firms = ref<any[]>([])
const users = ref<any[]>([])
const loading = ref(false)

const items = [
  { label: 'Firms Management', icon: 'i-heroicons-building-office-2', slot: 'firms' },
  { label: 'User Directory', icon: 'i-heroicons-user-group', slot: 'users' }
]

const stats = ref([
  { label: 'Total Firms', value: '0', icon: 'i-heroicons-building-office-2' },
  { label: 'Total Users', value: '0', icon: 'i-heroicons-user-group' },
  { label: 'System Health', value: 'Healthy', icon: 'i-heroicons-heart', color: 'success' },
])

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
  { accessorKey: 'createdAt', header: 'Joined' },
  { id: 'actions', header: 'Actions' }
]
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
                  {{ row.original.role }}
                </UBadge>
              </template>

              <template #createdAt-cell="{ row }">
                <span class="text-xs text-gray-500">{{ formatDate(row.original.createdAt) }}</span>
              </template>

              <template #actions-cell="{ row }">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-eye" />
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
