<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue'
import { useMasterRoll } from '@/composables/useMasterRoll'
import { useAuth } from '@/composables/useAuth'
import MasterRollForm from '@/components/master-roll/MasterRollForm.vue'
import MasterRollImport from '@/components/master-roll/MasterRollImport.vue'

const { 
  loading, employees, stats, total, 
  fetchEmployees, fetchStats, deleteEmployee,
  exportExcel, exportICards, downloadTemplate
} = useMasterRoll()

const { selectedFirmId } = useAuth()

const filters = reactive({
  q: '',
  status: '',
  limit: 25, // Optimized for vertical space
  skip: 0
})

const page = ref(1)

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
}

onMounted(() => {
  if (selectedFirmId.value) fetchData()
})

const columns = [
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
const selectedEmployee = ref<any>(null)

const openModal = (emp: any = null) => {
  selectedEmployee.value = emp
  isOpen.value = true
}

const onDelete = async (id: string) => {
  if (confirm('Are you sure you want to delete this employee?')) {
    await deleteEmployee(id)
    fetchData()
  }
}

const formatDate = (date: string) => new Date(date).toLocaleDateString()
</script>

<template>
  <div class="h-full flex flex-col space-y-3 overflow-hidden">
    <div class="flex items-center justify-between gap-4 shrink-0 px-1">
      <h1 class="text-xl font-black tracking-tight uppercase text-gray-900 dark:text-white">Master Roll</h1>
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="outline" size="xs" icon="i-heroicons-arrow-down-tray" label="Template" @click="downloadTemplate" />
        <UButton color="neutral" variant="outline" size="xs" icon="i-heroicons-cloud-arrow-up" label="Import" @click="isImportOpen = true" />
        <UButton icon="i-heroicons-plus" size="xs" label="Add Employee" @click="openModal()" />
      </div>
    </div>

    <!-- Stats Summary - Strict Single Row with 5 items -->
    <div class="flex gap-2 shrink-0 overflow-x-auto no-scrollbar px-1">
      <div v-for="(val, key) in stats" :key="key" 
           class="flex-1 min-w-[120px] p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded flex flex-col items-center justify-center shadow-sm">
        <p class="text-[8px] text-gray-400 uppercase font-black tracking-tighter truncate w-full text-center">
          {{ String(key).replace(/_/g, ' ') }}
        </p>
        <p class="text-base font-black text-primary truncate leading-none mt-1">{{ val }}</p>
      </div>
    </div>

    <!-- Filters & Main Table Card -->
    <UCard class="flex-1 min-h-0 flex flex-col" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col', base: 'overflow-hidden border-none shadow-none' }">
      <div class="p-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 shrink-0">
        <div class="flex items-center gap-2">
          <UInput v-model="filters.q" size="xs" icon="i-heroicons-magnifying-glass" placeholder="Search..." class="w-48" />
          <USelect v-model="filters.status" size="xs" :items="['Active', 'Inactive', 'Left']" placeholder="Status" class="w-24" />
        </div>
        <div class="flex items-center gap-2">
          <UButton color="neutral" variant="ghost" size="xs" icon="i-heroicons-table-cells" @click="exportExcel" />
          <UButton color="neutral" variant="ghost" size="xs" icon="i-heroicons-identification" @click="exportICards" />
        </div>
      </div>

      <div class="flex-1 overflow-auto">
        <UTable :data="employees" :columns="columns" :loading="loading" class="w-full text-xs sticky-header">
          <template #employee_name-cell="{ row }">
            <div class="flex items-center gap-2 py-0.5">
              <UAvatar :alt="row.original.employee_name" size="xs" />
              <div class="min-w-0">
                <p class="font-bold text-gray-900 dark:text-white truncate">{{ row.original.employee_name }}</p>
                <p class="text-[9px] text-gray-500 truncate">{{ row.original.father_husband_name }}</p>
              </div>
            </div>
          </template>

          <template #status-cell="{ row }">
            <UBadge :color="row.original.status === 'Active' ? 'success' : 'error'" size="sm" variant="subtle" class="px-1.5 py-0">
              {{ row.original.status }}
            </UBadge>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1">
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openModal(row.original)" />
              <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="onDelete(row.original._id)" />
            </div>
          </template>
        </UTable>
      </div>

      <div class="p-2 border-t border-gray-100 dark:border-gray-800 flex justify-center shrink-0">
        <UPagination v-model="page" :total="total" :page-count="filters.limit" size="xs" />
      </div>
    </UCard>

    <!-- Modals - Correct Nuxt UI v4 Width Syntax -->
    <UModal v-model:open="isOpen" :title="selectedEmployee ? 'Edit Employee' : 'Add New Employee'" 
            :ui="{ content: 'sm:max-w-7xl' }">
      <template #body>
        <div class="max-h-[85vh] overflow-y-auto custom-scrollbar px-2">
          <MasterRollForm :employee="selectedEmployee" @success="fetchData" @close="isOpen = false" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isImportOpen" title="Bulk Import Employees" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <MasterRollImport @success="fetchData" @close="isImportOpen = false" />
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.sticky-header :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
}
.dark .sticky-header :deep(thead) {
  background: #111;
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
