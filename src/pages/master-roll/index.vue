<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue'
import { useMasterRoll } from '@/composables/useMasterRoll'
import { useAuth } from '@/composables/useAuth'
import MasterRollForm from '@/components/master-roll/MasterRollForm.vue'
import MasterRollImport from '@/components/master-roll/MasterRollImport.vue'
import BulkEditModal from '@/components/master-roll/BulkEditModal.vue'
import ActivityLog from '@/components/master-roll/ActivityLog.vue'
import ICardFilterModal from '@/components/master-roll/ICardFilterModal.vue'
import DataQualityAuditModal from '@/components/master-roll/DataQualityAuditModal.vue'

const { 
  loading, employees, stats, total, 
  fetchEmployees, fetchStats, deleteEmployee,
  exportExcel, exportICards, downloadTemplate,
  exportQualityReport, downloadAppointmentLetter,
  bulkDeleteEmployees
} = useMasterRoll()

const { selectedFirmId } = useAuth()
const toast = useToast()

const filters = reactive({
  q: '',
  status: '',
  limit: 25, // Optimized for vertical space
  skip: 0
})

const page = ref(1)
const selectedRows = ref<any[]>([])

watch(page, (val) => {
  filters.skip = (val - 1) * filters.limit
})

watch([filters, selectedFirmId], () => {
  if (selectedFirmId.value) fetchData()
}, { deep: true })

const fetchData = async () => {
  await Promise.all([
    fetchEmployees(filters),
    fetchStats()
  ])
  selectedRows.value = []
}

onMounted(() => {
  if (selectedFirmId.value) fetchData()
})

const columns = [
  { id: 'select' },
  { accessorKey: 'employee_name', header: 'Employee' },
  { accessorKey: 'aadhar', header: 'Aadhar' },
  { accessorKey: 'phone_no', header: 'Phone' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'project', header: 'Project' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

const isOpen = ref(false)
const isImportOpen = ref(false)
const isActivityOpen = ref(false)
const isICardModalOpen = ref(false)
const isQualityModalOpen = ref(false)
const isBulkEditOpen = ref(false)
const selectedEmployee = ref<any>(null)

const openModal = (emp: any = null) => {
  selectedEmployee.value = emp
  isOpen.value = true
}

const openActivity = (emp: any) => {
  selectedEmployee.value = emp
  isActivityOpen.value = true
}

const onDownloadLetter = async (emp: any) => {
  try {
    await downloadAppointmentLetter(emp._id, emp.employee_name)
    toast.add({ title: 'Success', description: 'Appointment letter downloaded', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const onDelete = async (id: string) => {
  if (confirm('Are you sure you want to delete this employee?')) {
    await deleteEmployee(id)
    fetchData()
  }
}

const onBulkDelete = async () => {
  const ids = selectedRows.value.map(row => row._id)
  if (confirm(`Are you sure you want to delete ${ids.length} employees?`)) {
    try {
      const res = await bulkDeleteEmployees(ids)
      if (res.success) {
        toast.add({ title: 'Success', description: res.message, color: 'success' })
        fetchData()
      }
    } catch (err: any) {
      toast.add({ title: 'Error', description: err.message, color: 'error' })
    }
  }
}
</script>

<template>
  <div class="h-full flex flex-col space-y-4 overflow-hidden p-2">
    <div class="flex items-center justify-between gap-4 shrink-0 px-1">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-primary/10 rounded-xl">
          <UIcon name="i-heroicons-users" class="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 class="text-xl font-black tracking-tight uppercase text-gray-900 dark:text-white leading-none">Master Roll</h1>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Enterprise Employee Management</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UTooltip text="Download Import Template">
          <UButton color="neutral" variant="outline" size="xs" icon="i-heroicons-arrow-down-tray" label="Template" @click="downloadTemplate" />
        </UTooltip>
        <UTooltip text="Bulk Import from Excel">
          <UButton color="neutral" variant="outline" size="xs" icon="i-heroicons-cloud-arrow-up" label="Import" @click="isImportOpen = true" />
        </UTooltip>
        <UTooltip text="Bulk Edit Spreadsheet View">
          <UButton color="neutral" variant="outline" size="xs" icon="i-heroicons-pencil-square" label="Bulk Edit" @click="isBulkEditOpen = true" />
        </UTooltip>
        <UButton icon="i-heroicons-plus" size="sm" label="Add New Employee" @click="openModal()" />
      </div>
    </div>

    <!-- Stats Summary - Enterprise Styled -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0 px-1">
      <div v-for="(val, key) in stats" :key="key" 
           class="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center shadow-sm hover:border-primary/30 transition-colors group">
        <p class="text-[9px] text-gray-400 uppercase font-black tracking-widest truncate w-full text-center group-hover:text-primary transition-colors">
          {{ String(key).replace(/_/g, ' ') }}
        </p>
        <p class="text-xl font-black text-gray-900 dark:text-white truncate leading-none mt-1">{{ val }}</p>
      </div>
    </div>

    <!-- Main Content Area -->
    <UCard class="flex-1 min-h-0 flex flex-col" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col', base: 'overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl' }">
      <!-- Toolbar -->
      <div class="p-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 shrink-0">
        <div class="flex items-center gap-3">
          <UInput v-model="filters.q" size="sm" icon="i-heroicons-magnifying-glass" placeholder="Search employee, aadhar, phone..." class="w-64" variant="outline" />
          <USelect v-model="filters.status" size="sm" :items="['Active', 'Inactive', 'Left']" placeholder="All Status" class="w-32" />
          <div v-if="selectedRows.length > 0" class="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
          <UButton v-if="selectedRows.length > 0" color="error" variant="soft" size="sm" icon="i-heroicons-trash" :label="`Delete ${selectedRows.length}`" @click="onBulkDelete" />
        </div>
        <div class="flex items-center gap-1.5">
          <UTooltip text="Smart Data Quality Audit">
            <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-shield-check" @click="isQualityModalOpen = true" />
          </UTooltip>
          <UTooltip text="Export to Excel">
            <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-table-cells" @click="exportExcel" />
          </UTooltip>
          <UTooltip text="Generate Filtered I-Cards">
            <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-identification" @click="isICardModalOpen = true" />
          </UTooltip>
        </div>
      </div>

      <!-- Table Container -->
      <div class="flex-1 overflow-auto custom-scrollbar">
        <UTable 
          v-model:selection="selectedRows"
          :data="employees" 
          :columns="columns" 
          :loading="loading" 
          class="w-full text-xs sticky-header-enterprise"
          :ui="{ 
            td: 'py-2 px-4',
            th: 'py-3 px-4 text-gray-500 font-bold uppercase tracking-wider bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-100 dark:border-gray-800',
            tr: 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors'
          }"
        >
          <template #loading-state>
            <div class="flex flex-col items-center justify-center py-24 gap-4">
              <div class="relative">
                <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 animate-spin text-primary" />
                <div class="absolute inset-0 flex items-center justify-center">
                  <UIcon name="i-heroicons-users" class="w-5 h-5 text-primary/50" />
                </div>
              </div>
              <p class="text-sm text-gray-500 font-bold uppercase tracking-widest">Synchronizing Master Roll...</p>
            </div>
          </template>

          <template #empty-state>
            <div class="flex flex-col items-center justify-center py-24 gap-4 opacity-40">
              <UIcon name="i-heroicons-circle-stack" class="w-16 h-16" />
              <p class="text-sm font-bold uppercase tracking-widest">No Employee Records Found</p>
            </div>
          </template>

          <template #employee_name-cell="{ row }">
            <div class="flex items-center gap-3 py-1">
              <UAvatar :alt="row.original.employee_name" size="sm" class="ring-2 ring-gray-100 dark:ring-gray-800" />
              <div class="min-w-0">
                <p class="font-black text-gray-900 dark:text-white truncate leading-tight">{{ row.original.employee_name }}</p>
                <p class="text-[10px] text-gray-500 font-medium truncate uppercase tracking-tighter">{{ row.original.father_husband_name }}</p>
              </div>
            </div>
          </template>

          <template #category-cell="{ row }">
            <span class="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full uppercase tracking-tighter">
              {{ row.original.category }}
            </span>
          </template>

          <template #status-cell="{ row }">
            <UBadge 
              :color="row.original.status === 'Active' ? 'success' : 'error'" 
              size="sm" 
              variant="subtle" 
              class="px-2 py-0.5 font-black uppercase tracking-widest text-[9px] rounded-md"
            >
              {{ row.original.status }}
            </UBadge>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1 justify-end">
              <UTooltip text="Quick Edit">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openModal(row.original)" />
              </UTooltip>
              <UDropdownMenu 
                :items="[[
                  { label: 'View Activity Log', icon: 'i-heroicons-clock', onSelect: () => openActivity(row.original) },
                  { label: 'Download Letter', icon: 'i-heroicons-document-text', onSelect: () => onDownloadLetter(row.original) }
                ], [
                  { label: 'Delete Record', icon: 'i-heroicons-trash', color: 'error', onSelect: () => onDelete(row.original._id) }
                ]]"
              >
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-ellipsis-vertical" />
              </UDropdownMenu>
            </div>
          </template>
        </UTable>
      </div>

      <!-- Pagination Container -->
      <div class="p-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-950">
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Showing {{ employees.length }} of {{ total }} entries
        </p>
        <UPagination v-model="page" :total="total" :page-count="filters.limit" size="sm" />
      </div>
    </UCard>

    <!-- Enterprise Modals -->
    <UModal v-model:open="isOpen" :title="selectedEmployee ? 'Employee File: ' + selectedEmployee.employee_name : 'New Employee Onboarding'" 
            :ui="{ content: 'sm:max-w-7xl' }">
      <template #body>
        <div class="max-h-[85vh] overflow-y-auto custom-scrollbar px-2 py-4">
          <MasterRollForm :employee="selectedEmployee" @success="fetchData" @close="isOpen = false" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isImportOpen" title="Enterprise Bulk Import Engine" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div class="p-2">
          <MasterRollImport @success="fetchData" @close="isImportOpen = false" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isActivityOpen" :title="'System Audit Log: ' + selectedEmployee?.employee_name" :ui="{ content: 'sm:max-w-md' }">
      <template #body>
        <ActivityLog v-if="selectedEmployee" :employee-id="selectedEmployee._id" />
      </template>
    </UModal>

    <UModal v-model:open="isICardModalOpen" :ui="{ content: 'sm:max-w-md' }">
      <template #body>
        <ICardFilterModal @close="isICardModalOpen = false" />
      </template>
    </UModal>

    <UModal v-model:open="isQualityModalOpen" fullscreen>
      <template #body>
        <DataQualityAuditModal 
          :employees="employees" 
          @close="isQualityModalOpen = false" 
          @edit="(emp) => {
            isQualityModalOpen = false;
            openModal(emp);
          }"
        />
      </template>
    </UModal>

    <BulkEditModal :is-open="isBulkEditOpen" @close="isBulkEditOpen = false" @saved="fetchData" />
  </div>
</template>

<style scoped>
.sticky-header-enterprise :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 20;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
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
