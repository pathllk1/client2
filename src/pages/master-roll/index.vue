<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue'
import { useToast } from '@nuxt/ui/composables'
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
  fetchEmployees, fetchStats,
  exportExcel, exportICards, downloadTemplate,
  exportQualityReport, downloadAppointmentLetter,
  fetchUniqueFields
} = useMasterRoll()

const { selectedFirmId } = useAuth()
const toast = useToast()

const filters = reactive({
  q: '',
  status: '',
  project: '',
  site: '',
  category: '',
  bank: '',
  doj_start: '',
  doj_end: '',
  limit: 25,
  skip: 0
})

const page = ref(1)
const selectedRows = ref<any[]>([])

const showFilterPanel = ref(false)
const uniqueOptions = ref({
  projects: [] as string[],
  sites: [] as string[],
  categories: [] as string[],
  banks: [] as string[]
})

const fetchOptions = async () => {
  try {
    const res = await fetchUniqueFields()
    if (res.success) {
      uniqueOptions.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch filter options', err)
  }
}

const statusOptions = ['All Status', 'Active', 'Inactive', 'Left']
const projectOptions = computed(() => ['All Projects', ...uniqueOptions.value.projects])
const siteOptions = computed(() => ['All Sites', ...uniqueOptions.value.sites])
const categoryOptions = computed(() => ['All Categories', ...uniqueOptions.value.categories])
const bankOptions = computed(() => ['All Banks', ...uniqueOptions.value.banks])

const handleFilterUpdate = (key: string, value: string) => {
  if (value.startsWith('All ')) {
    (filters as any)[key] = ''
  } else {
    (filters as any)[key] = value
  }
}

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
  if (selectedFirmId.value) {
    fetchData()
    fetchOptions()
  }
})

const showColumnPanel = ref(false)
const allColumns = [
  { key: 'select', label: 'Select' },
  { key: 'employee_name', label: 'Employee' },
  { key: 'father_husband_name', label: 'Father/Husband' },
  { key: 'date_of_birth', label: 'DOB' },
  { key: 'aadhar', label: 'Aadhar' },
  { key: 'pan', label: 'PAN' },
  { key: 'phone_no', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'bank', label: 'Bank' },
  { key: 'account_no', label: 'Account No' },
  { key: 'ifsc', label: 'IFSC' },
  { key: 'branch', label: 'Branch' },
  { key: 'uan', label: 'UAN' },
  { key: 'esic_no', label: 'ESIC' },
  { key: 's_kalyan_no', label: 'S. Kalyan' },
  { key: 'category', label: 'Category' },
  { key: 'p_day_wage', label: 'Wage' },
  { key: 'project', label: 'Project' },
  { key: 'site', label: 'Site' },
  { key: 'date_of_joining', label: 'Joining' },
  { key: 'date_of_exit', label: 'Exit' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]

const visibleColumns = ref(['select', 'employee_name', 'aadhar', 'phone_no', 'category', 'project', 'status', 'actions'])

const toggleColumn = (key: string, val: boolean) => {
  if (val) {
    if (!visibleColumns.value.includes(key)) visibleColumns.value.push(key)
  } else {
    visibleColumns.value = visibleColumns.value.filter(k => k !== key)
  }
}

const columns = computed(() => {
  return allColumns
    .filter(col => visibleColumns.value.includes(col.key))
    .map(col => {
      if (col.key === 'select' || col.key === 'actions') {
        return { id: col.key, header: col.key === 'select' ? '' : col.label }
      }
      return { accessorKey: col.key, header: col.label }
    })
})

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

const onExportSelected = async () => {
  const ids = selectedRows.value.map(row => row._id)
  try {
    await exportExcel(ids)
    toast.add({ title: 'Success', description: `Exported ${ids.length} employees`, color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const isAllSelected = computed(() => {
  if (employees.value.length === 0) return false
  return employees.value.every(emp => selectedRows.value.some(r => r._id === emp._id))
})

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    employees.value.forEach(emp => {
      if (!selectedRows.value.some(r => r._id === emp._id)) {
        selectedRows.value.push(emp)
      }
    })
  } else {
    const pageIds = employees.value.map(emp => emp._id)
    selectedRows.value = selectedRows.value.filter(r => !pageIds.includes(r._id))
  }
}

const toggleRowSelection = (emp: any, checked: boolean) => {
  if (checked) {
    if (!selectedRows.value.some(r => r._id === emp._id)) {
      selectedRows.value.push(emp)
    }
  } else {
    selectedRows.value = selectedRows.value.filter(r => r._id !== emp._id)
  }
}



const headerActions = [
  [
    { label: 'Template', icon: 'i-heroicons-arrow-down-tray', onSelect: downloadTemplate },
    { label: 'Import', icon: 'i-heroicons-cloud-arrow-up', onSelect: () => isImportOpen.value = true },
    { label: 'Bulk Edit', icon: 'i-heroicons-pencil-square', onSelect: () => isBulkEditOpen.value = true }
  ]
]
</script>

<template>
  <div class="h-full flex flex-col space-y-4 overflow-hidden p-2 md:p-4">
    <!-- Header: Optimized for mobile -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 px-1">
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
        <!-- Desktop Actions -->
        <div class="hidden lg:flex items-center gap-2">
          <UTooltip text="Download Import Template">
            <UButton color="neutral" variant="outline" size="xs" icon="i-heroicons-arrow-down-tray" label="Template" @click="downloadTemplate" />
          </UTooltip>
          <UTooltip text="Bulk Import from Excel">
            <UButton color="neutral" variant="outline" size="xs" icon="i-heroicons-cloud-arrow-up" label="Import" @click="isImportOpen = true" />
          </UTooltip>
          <UTooltip text="Bulk Edit Spreadsheet View">
            <UButton color="neutral" variant="outline" size="xs" icon="i-heroicons-pencil-square" label="Bulk Edit" @click="isBulkEditOpen = true" />
          </UTooltip>
        </div>

        <!-- Mobile/Tablet Actions Dropdown -->
        <div class="lg:hidden">
          <UDropdownMenu :items="headerActions">
            <UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-ellipsis-horizontal" />
          </UDropdownMenu>
        </div>

        <UButton icon="i-heroicons-plus" size="sm" label="Add New" class="sm:hidden" @click="openModal()" />
        <UButton icon="i-heroicons-plus" size="sm" label="Add New Employee" class="hidden sm:flex" @click="openModal()" />
      </div>
    </div>

    <!-- Stats Summary - Scrollable on mobile -->
    <div class="flex overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-3 md:grid-cols-5 gap-3 shrink-0 px-1 no-scrollbar">
      <div v-for="(val, key) in stats" :key="key" 
           class="min-w-[140px] sm:min-w-0 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center shadow-sm hover:border-primary/30 transition-colors group">
        <p class="text-[9px] text-gray-400 uppercase font-black tracking-widest truncate w-full text-center group-hover:text-primary transition-colors">
          {{ String(key).replace(/_/g, ' ') }}
        </p>
        <p class="text-xl font-black text-gray-900 dark:text-white truncate leading-none mt-1">{{ val }}</p>
      </div>
    </div>

    <!-- Main Content Area -->
    <UCard class="flex-1 min-h-0 flex flex-col" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col', base: 'overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl' }">
      <!-- Toolbar -->
      <div class="p-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div class="flex flex-wrap items-center gap-3">
          <UInput v-model="filters.q" size="sm" icon="i-heroicons-magnifying-glass" placeholder="Search..." class="flex-1 lg:flex-none lg:w-64" variant="outline" />
          <USelect v-model="filters.status" size="sm" :items="['Active', 'Inactive', 'Left']" placeholder="All Status" class="w-full sm:w-32" />
          <div v-if="selectedRows.length > 0" class="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
          <UButton v-if="selectedRows.length > 0" color="primary" variant="soft" size="sm" icon="i-heroicons-arrow-up-tray" :label="`Export Selected (${selectedRows.length})`" @click="onExportSelected" />
        </div>
        <div class="flex items-center justify-between lg:justify-end gap-1.5 overflow-x-auto no-scrollbar py-1 lg:py-0">
          <UTooltip text="Quality Audit">
            <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-shield-check" @click="isQualityModalOpen = true" />
          </UTooltip>
          <UTooltip text="Export Excel">
            <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-table-cells" @click="() => exportExcel()" />
          </UTooltip>
          <UTooltip text="I-Cards">
            <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-identification" @click="isICardModalOpen = true" />
          </UTooltip>
          <UTooltip text="Filters">
            <UButton color="neutral" variant="ghost" size="sm" :icon="showFilterPanel ? 'i-heroicons-funnel-slash' : 'i-heroicons-funnel'" @click="showFilterPanel = !showFilterPanel" />
          </UTooltip>
          <UTooltip text="Columns" class="hidden sm:block">
            <UButton color="neutral" variant="ghost" size="sm" :icon="showColumnPanel ? 'i-heroicons-chevron-up' : 'i-heroicons-view-columns'" @click="showColumnPanel = !showColumnPanel" />
          </UTooltip>
        </div>
      </div>

      <!-- Advanced Filter Panel -->
      <div v-if="showFilterPanel" class="p-4 bg-primary/5 dark:bg-primary/10 border-b border-primary/10 animate-in fade-in slide-in-from-top-2 duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-funnel" class="w-4 h-4 text-primary" />
            <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">Advanced Filters</h3>
          </div>
          <div class="flex gap-2">
            <UButton size="xs" variant="soft" color="neutral" label="Clear" @click="Object.assign(filters, { status: '', project: '', site: '', category: '', bank: '', doj_start: '', doj_end: '' })" />
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-x-mark" @click="showFilterPanel = false" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Status</label>
            <USelect 
              :model-value="filters.status || 'All Status'" 
              @update:model-value="(val: any) => handleFilterUpdate('status', val)"
              size="sm" :items="statusOptions" variant="outline" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Project</label>
            <USelect 
              :model-value="filters.project || 'All Projects'" 
              @update:model-value="(val: any) => handleFilterUpdate('project', val)"
              size="sm" :items="projectOptions" variant="outline" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Site</label>
            <USelect 
              :model-value="filters.site || 'All Sites'" 
              @update:model-value="(val: any) => handleFilterUpdate('site', val)"
              size="sm" :items="siteOptions" variant="outline" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Category</label>
            <USelect 
              :model-value="filters.category || 'All Categories'" 
              @update:model-value="(val: any) => handleFilterUpdate('category', val)"
              size="sm" :items="categoryOptions" variant="outline" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Bank</label>
            <USelect 
              :model-value="filters.bank || 'All Banks'" 
              @update:model-value="(val: any) => handleFilterUpdate('bank', val)"
              size="sm" :items="bankOptions" variant="outline" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Joining Date Range</label>
            <div class="flex items-center gap-2">
              <UInput v-model="filters.doj_start" type="date" size="sm" class="flex-1" />
              <span class="text-gray-300">-</span>
              <UInput v-model="filters.doj_end" type="date" size="sm" class="flex-1" />
            </div>
          </div>
        </div>
      </div>

      <!-- Column Selection Panel -->
      <div v-if="showColumnPanel" class="p-4 bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-adjustments-horizontal" class="w-4 h-4 text-primary" />
            <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">Display Settings: Toggle Columns</h3>
          </div>
          <div class="flex gap-2">
            <UButton size="xs" variant="soft" color="neutral" label="Reset Defaults" @click="visibleColumns = ['select', 'employee_name', 'aadhar', 'phone_no', 'category', 'project', 'status', 'actions']" />
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-x-mark" @click="showColumnPanel = false" />
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div v-for="col in allColumns" :key="col.key" class="flex items-center gap-2">
            <UCheckbox 
              :model-value="visibleColumns.includes(col.key)" 
              @update:model-value="(val: any) => toggleColumn(col.key, !!val)"
              :label="col.label" 
              size="sm" 
              :disabled="col.key === 'employee_name' || col.key === 'actions' || col.key === 'select'"
              :ui="{ label: 'text-[11px] font-bold uppercase tracking-tighter text-gray-600 dark:text-gray-400 cursor-pointer' }" />
          </div>
        </div>
      </div>

      <!-- Table Container (Desktop) / Card View (Mobile) -->
      <div class="flex-1 overflow-auto custom-scrollbar relative">
        <div v-if="loading" class="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-gray-950/60 backdrop-blur-[2px] transition-all duration-300">
          <div class="flex flex-col items-center gap-4 bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <div class="relative">
              <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 animate-spin text-primary" />
              <div class="absolute inset-0 flex items-center justify-center">
                <UIcon name="i-heroicons-users" class="w-5 h-5 text-primary/40" />
              </div>
            </div>
            <div class="flex flex-col items-center gap-1">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Synchronizing</p>
              <p class="text-[9px] font-bold uppercase tracking-widest text-primary animate-pulse">Master Roll Engine</p>
            </div>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div class="hidden lg:block">
          <UTable 
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
            <!-- Select Header Slot -->
            <template #select-header>
              <UCheckbox 
                :model-value="isAllSelected" 
                @update:model-value="(val) => toggleSelectAll(!!val)" 
                class="flex items-center justify-center"
              />
            </template>

            <!-- Select Cell Slot -->
            <template #select-cell="{ row }">
              <UCheckbox 
                :model-value="selectedRows.some(r => r._id === row.original._id)" 
                @update:model-value="(val) => toggleRowSelection(row.original, !!val)" 
                class="flex items-center justify-center"
              />
            </template>

            <!-- Same cell templates as before -->
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
                  ]]"
                >
                  <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-ellipsis-vertical" />
                </UDropdownMenu>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Mobile/Tablet Card View -->
        <div class="lg:hidden flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
          <div v-if="employees.length === 0 && !loading" class="flex flex-col items-center justify-center py-24 gap-4 opacity-40">
            <UIcon name="i-heroicons-circle-stack" class="w-16 h-16" />
            <p class="text-sm font-bold uppercase tracking-widest">No Employee Records Found</p>
          </div>
          <div v-for="emp in employees" :key="emp._id" class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <UCheckbox 
                  :model-value="selectedRows.some(r => r._id === emp._id)" 
                  @update:model-value="(val) => toggleRowSelection(emp, !!val)" 
                />
                <UAvatar :alt="emp.employee_name" size="md" />
                <div>
                  <h4 class="font-black text-gray-900 dark:text-white leading-tight">{{ emp.employee_name }}</h4>
                  <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{{ emp.category }} • {{ emp.project || 'No Project' }}</p>
                </div>
              </div>
              <UBadge 
                :color="emp.status === 'Active' ? 'success' : 'error'" 
                size="sm" 
                variant="subtle" 
                class="px-2 py-0.5 font-black uppercase tracking-widest text-[8px] rounded-md"
              >
                {{ emp.status }}
              </UBadge>
            </div>
            
            <div class="mt-3 grid grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <p class="text-[9px] text-gray-400 font-black uppercase tracking-widest">Aadhar</p>
                <p class="text-xs font-bold text-gray-700 dark:text-gray-300">{{ emp.aadhar || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-[9px] text-gray-400 font-black uppercase tracking-widest">Phone</p>
                <p class="text-xs font-bold text-gray-700 dark:text-gray-300">{{ emp.phone_no || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-[9px] text-gray-400 font-black uppercase tracking-widest">Joining Date</p>
                <p class="text-xs font-bold text-gray-700 dark:text-gray-300">{{ emp.date_of_joining || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-[9px] text-gray-400 font-black uppercase tracking-widest">Site</p>
                <p class="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{{ emp.site || 'N/A' }}</p>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-end gap-2">
              <UButton size="xs" variant="soft" color="neutral" icon="i-heroicons-pencil-square" label="Edit" @click="openModal(emp)" />
              <UDropdownMenu 
                :items="[[
                  { label: 'View Activity Log', icon: 'i-heroicons-clock', onSelect: () => openActivity(emp) },
                  { label: 'Download Letter', icon: 'i-heroicons-document-text', onSelect: () => onDownloadLetter(emp) }
                ]]"
              >
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-ellipsis-horizontal" />
              </UDropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Container -->
      <div class="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-white dark:bg-gray-950">
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Showing {{ employees.length }} of {{ total }} entries
        </p>
        <UPagination v-model="page" :total="total" :page-count="filters.limit" size="sm" class="scale-90 sm:scale-100" />
      </div>
    </UCard>

    <!-- Enterprise Modals -->
    <UModal v-model:open="isOpen" :title="selectedEmployee ? 'Employee File: ' + selectedEmployee.employee_name : 'New Employee Onboarding'" 
            :ui="{ content: 'w-full sm:max-w-7xl h-full sm:h-auto' }">
      <template #body>
        <div class="max-h-full sm:max-h-[85vh] overflow-y-auto custom-scrollbar px-2 py-4">
          <MasterRollForm :employee="selectedEmployee" @success="fetchData" @close="isOpen = false" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isImportOpen" title="Enterprise Bulk Import Engine" :ui="{ content: 'w-full sm:max-w-2xl' }">
      <template #body>
        <div class="p-2">
          <MasterRollImport @success="fetchData" @close="isImportOpen = false" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isActivityOpen" :title="'System Audit Log: ' + selectedEmployee?.employee_name" :ui="{ content: 'w-full sm:max-w-md' }">
      <template #body>
        <ActivityLog v-if="selectedEmployee" :employee-id="selectedEmployee._id" />
      </template>
    </UModal>

    <UModal v-model:open="isICardModalOpen" :ui="{ content: 'w-full sm:max-w-md' }">
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
