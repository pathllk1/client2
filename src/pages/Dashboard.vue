<script setup lang="ts">
import { ref, onMounted, watch, computed, reactive } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/utils/api'
import { useToast } from '@nuxt/ui/composables'

const { user, selectedFirmId } = useAuth()
const api = useApi()
const toast = useToast()

const stats = ref([
  { label: 'Inventory Value', value: '₹0', icon: 'i-heroicons-cube', color: 'primary' },
  { label: 'Active Bills', value: '0', icon: 'i-heroicons-document-text', color: 'success' },
  { label: 'Security Logs', value: '0', icon: 'i-heroicons-shield-check', color: 'warning' },
])

const activity = ref<any[]>([])
const loading = ref(false)

// Member CRUD state
const members = ref<any[]>([])
const membersLoading = ref(false)
const isMemberModalOpen = ref(false)
const savingMember = ref(false)
const selectedMember = ref<any>(null)

const memberForm = reactive({
  name: '',
  email: '',
  password: '',
  grade: 'Staff',
  status: 'active',
  role: 'standard'
})

const activeFirmGrade = computed(() => {
  if (!selectedFirmId.value || !user.value) return null
  const f = user.value.firms.find((x: any) => (x.firm.id || x.firm._id) === selectedFirmId.value)
  return f?.grade || null
})

const isOwnerOrAdmin = computed(() => {
  return ['Owner', 'Admin'].includes(activeFirmGrade.value || '')
})

const gradeOptions = computed(() => {
  const options = [
    { label: 'Admin', value: 'Admin' },
    { label: 'Manager', value: 'Manager' },
    { label: 'Staff', value: 'Staff' }
  ]
  if (activeFirmGrade.value === 'Owner') {
    options.unshift({ label: 'Owner', value: 'Owner' })
  }
  return options
})

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Pending Approval', value: 'pending' },
  { label: 'Suspended', value: 'suspended' }
]

const roleOptions = [
  { label: 'Standard User', value: 'standard' },
  { label: 'SuperAdmin', value: 'superadmin' }
]

const memberColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'grade', header: 'Grade' },
  { accessorKey: 'role', header: 'System Role' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

const fetchMembers = async () => {
  if (!selectedFirmId.value || !isOwnerOrAdmin.value) return
  membersLoading.value = true
  try {
    const res = await api.get(`/firms/${selectedFirmId.value}/members`)
    members.value = res.members || []
  } catch (err: any) {
    toast.add({ title: 'Error fetching members', description: err.message, color: 'error' })
  } finally {
    membersLoading.value = false
  }
}

const fetchData = async () => {
  if (!selectedFirmId.value) return
  
  loading.value = true
  try {
    const [stockRes, billsRes, logsRes] = await Promise.all([
      api.get('/inventory/stock'),
      api.get('/accounting/bills?limit=1'),
      api.get('/auth/security-logs?limit=5')
    ])

    const totalStockValue = stockRes.data?.reduce((sum: number, s: any) => sum + (s.total || 0), 0) || 0;
    stats.value[0]!.value = `₹${totalStockValue.toLocaleString()}`
    stats.value[1]!.value = billsRes.data?.length.toString() || '0'
    stats.value[2]!.value = logsRes.logs?.length.toString() || '0'

    activity.value = logsRes.logs || []

    if (isOwnerOrAdmin.value) {
      await fetchMembers()
    }
  } catch (err: any) {
    toast.add({ title: 'Error fetching dashboard data', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

watch([selectedFirmId, isOwnerOrAdmin], () => {
  if (selectedFirmId.value) {
    fetchData()
  } else {
    members.value = []
  }
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

const openMemberModal = (member: any = null) => {
  selectedMember.value = member
  if (member) {
    memberForm.name = member.name
    memberForm.email = member.email
    memberForm.password = ''
    memberForm.grade = member.grade
    memberForm.status = member.status || 'active'
    memberForm.role = member.role || 'standard'
  } else {
    memberForm.name = ''
    memberForm.email = ''
    memberForm.password = ''
    memberForm.grade = 'Staff'
    memberForm.status = 'active'
    memberForm.role = 'standard'
  }
  isMemberModalOpen.value = true
}

const onMemberSubmit = async () => {
  savingMember.value = true
  try {
    if (selectedMember.value) {
      const payload = {
        name: memberForm.name,
        email: memberForm.email,
        grade: memberForm.grade,
        status: memberForm.status,
        role: memberForm.role
      }
      const res = await api.put(`/firms/${selectedFirmId.value}/members/${selectedMember.value.userId}`, payload)
      toast.add({ title: 'Success', description: res.message || 'Member updated successfully', color: 'success' })
    } else {
      const payload = {
        email: memberForm.email,
        grade: memberForm.grade,
        name: memberForm.name,
        password: memberForm.password || undefined,
        status: memberForm.status,
        role: memberForm.role
      }
      const res = await api.post(`/firms/${selectedFirmId.value}/members`, payload)
      toast.add({ title: 'Success', description: res.message || 'Member added successfully', color: 'success' })
    }
    isMemberModalOpen.value = false
    fetchMembers()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  } finally {
    savingMember.value = false
  }
}

const deleteMember = async (userId: string) => {
  if (userId === user.value?.id) {
    toast.add({ title: 'Invalid action', description: 'You cannot remove yourself from the firm', color: 'error' })
    return
  }
  if (confirm('Are you sure you want to remove this member from the firm?')) {
    try {
      const res = await api.delete(`/firms/${selectedFirmId.value}/members/${userId}`)
      toast.add({ title: 'Success', description: res.message || 'Member removed', color: 'success' })
      fetchMembers()
    } catch (err: any) {
      toast.add({ title: 'Error', description: err.message, color: 'error' })
    }
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p class="text-gray-500 mt-1">Welcome back, {{ user?.name }}</p>
      </div>
      <div v-if="!selectedFirmId" class="text-warning-500 font-medium animate-pulse">
        Please select a firm to view data
      </div>
      <UButton v-else icon="i-heroicons-plus" label="New Contact" to="/contacts/new" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="flex items-center gap-4">
          <div :class="`p-3 rounded-lg bg-${stat.color}-500/10`">
            <UIcon :name="stat.icon" :class="`w-6 h-6 text-${stat.color}`" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
            <p class="text-2xl font-bold">{{ stat.value }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Security Logs</h3>
            <UButton variant="ghost" color="neutral" size="sm" label="View all" />
          </div>
        </template>
        
        <div v-if="activity.length > 0" class="space-y-4">
          <div v-for="log in activity" :key="log._id" class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <UIcon :name="log.severity === 'high' ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-information-circle'" 
                     :class="log.severity === 'high' ? 'text-error' : 'text-primary'" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ log.action.replace('_', ' ') }}</p>
              <p class="text-xs text-gray-500">{{ formatDate(log.timestamp) }}</p>
            </div>
            <UBadge variant="subtle" size="sm" :color="log.severity === 'high' ? 'error' : 'primary'">
              {{ log.severity }}
            </UBadge>
          </div>
        </div>
        <div v-else class="py-12 text-center text-gray-500">
          No security logs found.
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Your Firms</h3>
          </div>
        </template>
        <div class="space-y-4">
          <div v-for="f in user?.firms" :key="f.firm.id || f.firm._id" 
               class="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800"
               :class="{ 'ring-2 ring-primary': (f.firm.id || f.firm._id) === selectedFirmId }">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded bg-primary-500/10 flex items-center justify-center">
                <UIcon name="i-heroicons-building-office-2" class="w-5 h-5 text-primary" />
              </div>
              <span class="font-medium">{{ f.firm.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UBadge variant="outline" color="primary">{{ f.grade }}</UBadge>
              <UButton v-if="(f.firm.id || f.firm._id) !== selectedFirmId" size="xs" variant="ghost" label="Switch" @click="useAuth().selectFirm(f.firm.id || f.firm._id)" />
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Firm Member Management CRUD (Owners/Admins only) -->
    <UCard v-if="isOwnerOrAdmin" class="mt-8">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-lg">Firm Team Members</h3>
            <p class="text-xs text-gray-500">Manage users, roles, and status for your firm</p>
          </div>
          <UButton icon="i-heroicons-plus" label="Add Member" size="sm" @click="openMemberModal()" />
        </div>
      </template>

      <UTable :data="members" :columns="memberColumns" :loading="membersLoading">
        <template #grade-cell="{ row }">
          <UBadge variant="subtle" color="primary">{{ row.original.grade }}</UBadge>
        </template>
        <template #role-cell="{ row }">
          <UBadge :color="row.original.role === 'superadmin' ? 'primary' : 'neutral'" variant="subtle" size="sm" class="uppercase font-black text-[10px]">
            {{ row.original.role }}
          </UBadge>
        </template>
        <template #status-cell="{ row }">
          <UBadge :color="row.original.status === 'active' ? 'success' : row.original.status === 'pending' ? 'warning' : 'error'" variant="subtle">
            {{ row.original.status }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UButton v-if="row.original.userId !== user?.id && !(row.original.grade === 'Owner' && activeFirmGrade !== 'Owner')" 
                     size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openMemberModal(row.original)" />
            <UButton v-if="row.original.userId !== user?.id && !(row.original.grade === 'Owner' && activeFirmGrade !== 'Owner')" 
                     size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="deleteMember(row.original.userId)" />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Member Add/Edit Modal -->
    <UModal v-model:open="isMemberModalOpen" 
            :title="selectedMember ? 'Edit Firm Member' : 'Add New Member to Firm'"
            :ui="{ content: 'sm:max-w-md' }">
      <template #body>
        <form @submit.prevent="onMemberSubmit" class="space-y-4 px-4 py-2">
          <UFormField v-if="!selectedMember" label="Full Name" class="w-full">
            <UInput v-model="memberForm.name" placeholder="John Doe" class="w-full" />
          </UFormField>
          <UFormField label="Email Address" class="w-full">
            <UInput v-model="memberForm.email" type="email" placeholder="name@company.com" required :disabled="!!selectedMember" class="w-full" />
          </UFormField>
          <UFormField v-if="!selectedMember" label="Password (for new users)" class="w-full">
            <UInput v-model="memberForm.password" type="password" placeholder="Minimum 8 characters" class="w-full" />
          </UFormField>
          <UFormField label="Firm Grade" class="w-full">
            <USelect v-model="memberForm.grade" :items="gradeOptions" class="w-full" />
          </UFormField>
          <UFormField v-if="user?.role === 'superadmin'" label="System Role" class="w-full">
            <USelect v-model="memberForm.role" :items="roleOptions" class="w-full" />
          </UFormField>
          <UFormField label="Account Status" class="w-full">
            <USelect v-model="memberForm.status" :items="statusOptions" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" label="Cancel" @click="isMemberModalOpen = false" />
            <UButton type="submit" label="Save" :loading="savingMember" />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
