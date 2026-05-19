<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApi } from '@/utils/api'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'saved'])

const api = useApi()
const total = ref(0)
const employees = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const updates = ref<Record<string, any>>({})

const filters = ref({
  project: '',
  site: '',
  category: '',
  bank: '',
  page: 1,
  limit: 50
})

const options = ref({
  projects: [] as string[],
  sites: [] as string[],
  categories: [] as string[],
  banks: [] as string[]
})

const fetchData = async () => {
  loading.value = true
  try {
    const skip = (filters.value.page - 1) * filters.value.limit
    const params = new URLSearchParams({
      limit: filters.value.limit.toString(),
      skip: skip.toString()
    })
    
    // Add active filters to params
    if (filters.value.project) params.append('project', filters.value.project)
    if (filters.value.site) params.append('site', filters.value.site)
    if (filters.value.category) params.append('category', filters.value.category)
    if (filters.value.bank) params.append('bank', filters.value.bank)

    const response = await api.get(`/master-rolls?${params.toString()}`)
    if (response.success) {
      employees.value = response.data
      total.value = response.total || response.data.length
      extractOptions()
    }
  } catch (error) {
    console.error('Error fetching employees:', error)
  } finally {
    loading.value = false
  }
}

// Watch filters to refetch
watch([() => filters.value.project, () => filters.value.site, () => filters.value.category, () => filters.value.bank], () => {
  filters.value.page = 1
  fetchData()
})

watch(() => filters.value.page, () => {
  fetchData()
})

const extractOptions = () => {
  options.value.projects = [...new Set(employees.value.map(e => e.project).filter(Boolean))].sort()
  options.value.sites = [...new Set(employees.value.map(e => e.site).filter(Boolean))].sort()
  options.value.categories = [...new Set(employees.value.map(e => e.category).filter(Boolean))].sort()
  options.value.banks = [...new Set(employees.value.map(e => e.bank).filter(Boolean))].sort()
}

const filteredEmployees = computed(() => {
  return employees.value.filter(e => {
    return (!filters.value.project || e.project === filters.value.project) &&
           (!filters.value.site || e.site === filters.value.site) &&
           (!filters.value.category || e.category === filters.value.category) &&
           (!filters.value.bank || e.bank === filters.value.bank)
  })
})

const handleCellEdit = (id: string, field: string, value: any) => {
  if (!updates.value[id]) updates.value[id] = {}
  updates.value[id][field] = value
  
  // Update local state to reflect change immediately in the table
  const emp = employees.value.find(e => (e._id || e.id) === id)
  if (emp) emp[field] = value
}

const handleSave = async () => {
  const updateArray = Object.entries(updates.value).map(([id, data]) => ({
    id,
    data
  }))

  if (updateArray.length === 0) {
    alert('No changes to save')
    return
  }

  saving.value = true
  try {
    const result = await api.put('/master-rolls/bulk-update', { updates: updateArray })
    if (result.success) {
      alert(`Successfully updated ${result.updated} employees`)
      emit('saved')
      emit('close')
    }
  } catch (error: any) {
    alert('Error: ' + (error.message || 'Failed to update'))
  } finally {
    saving.value = false
  }
}

const close = () => {
  if (Object.keys(updates.value).length > 0) {
    if (confirm('Discard all unsaved changes?')) {
      emit('close')
    }
  } else {
    emit('close')
  }
}

const isDirty = (id: string, field: string) => {
  return updates.value[id] && updates.value[id][field] !== undefined
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    updates.value = {}
    fetchData()
  }
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10">
    <div class="bg-white w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
      
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-600 via-purple-600 to-red-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
        <div class="flex items-center gap-3">
          <div class="bg-white/20 p-2 rounded-lg">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold">Bulk Edit Employees</h2>
            <p class="text-indigo-100 text-xs">Directly edit employee details in the grid below</p>
          </div>
        </div>
        <button @click="close" class="text-white/80 hover:text-white transition-colors">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Toolbar / Filters -->
      <div class="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-4 shrink-0">
        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Project:</label>
          <select v-model="filters.project" class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[140px]">
            <option value="">All Projects</option>
            <option v-for="p in options.projects" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Site:</label>
          <select v-model="filters.site" class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[140px]">
            <option value="">All Sites</option>
            <option v-for="s in options.sites" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Category:</label>
          <select v-model="filters.category" class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[140px]">
            <option value="">All Categories</option>
            <option v-for="c in options.categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank:</label>
          <select v-model="filters.bank" class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[140px]">
            <option value="">All Banks</option>
            <option v-for="b in options.banks" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
        <div class="ml-auto flex items-center gap-4">
          <div class="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 py-1">
            <button @click="filters.page--" :disabled="filters.page === 1" class="p-1 hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span class="text-xs font-bold text-slate-600 px-2 min-w-[60px] text-center">Page {{ filters.page }}</span>
            <button @click="filters.page++" :disabled="employees.length < filters.limit" class="p-1 hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <span class="text-xs font-medium text-slate-500 bg-slate-200 px-3 py-1 rounded-full whitespace-nowrap">
            Showing {{ (filters.page - 1) * filters.limit + 1 }}-{{ (filters.page - 1) * filters.limit + employees.length }} of {{ total }}
          </span>
        </div>
      </div>

      <!-- Table Container -->
      <div class="flex-1 overflow-hidden bg-slate-100 p-4">
        <div class="h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto">
          <table class="w-full text-sm border-collapse table-auto">
            <thead class="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
              <tr>
                <th class="px-4 py-3 text-left font-bold text-slate-700 w-16 bg-slate-50">#</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[200px] sticky left-0 z-30 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Employee Name</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[140px]">Phone No</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[120px]">PAN</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[140px]">UAN</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[140px]">ESIC</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[140px]">Project</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[140px]">Site</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[140px]">Category</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[140px]">Bank</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[160px]">A/C No</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[120px]">IFSC</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[100px]">Wage (₹)</th>
                <th class="px-4 py-3 text-left font-bold text-slate-700 min-w-[120px]">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="loading" class="animate-pulse">
                <td colspan="14" class="px-4 py-10 text-center text-slate-400">Loading employees...</td>
              </tr>
              <tr v-else-if="filteredEmployees.length === 0">
                <td colspan="14" class="px-4 py-20 text-center text-slate-400">
                  <p class="text-base font-medium">No employees match the selected filters</p>
                  <p class="text-xs">Adjust your filters to see more records</p>
                </td>
              </tr>
              <tr v-for="(e, idx) in filteredEmployees" :key="e._id || e.id" class="hover:bg-indigo-50/30 transition-colors group">
                <td class="px-4 py-2.5 text-slate-400 font-mono text-xs bg-white">{{ idx + 1 }}</td>
                <td class="px-4 py-2.5 font-bold text-slate-800 sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{{ e.employee_name }}</td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.phone_no" @change="(evt) => handleCellEdit(e._id || e.id, 'phone_no', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'phone_no') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.pan" @change="(evt) => handleCellEdit(e._id || e.id, 'pan', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all uppercase"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'pan') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.uan" @change="(evt) => handleCellEdit(e._id || e.id, 'uan', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'uan') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.esic_no" @change="(evt) => handleCellEdit(e._id || e.id, 'esic_no', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'esic_no') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.project" @change="(evt) => handleCellEdit(e._id || e.id, 'project', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'project') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.site" @change="(evt) => handleCellEdit(e._id || e.id, 'site', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'site') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.category" @change="(evt) => handleCellEdit(e._id || e.id, 'category', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'category') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.bank" @change="(evt) => handleCellEdit(e._id || e.id, 'bank', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'bank') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.account_no" @change="(evt) => handleCellEdit(e._id || e.id, 'account_no', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'account_no') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="text" :value="e.ifsc" @change="(evt) => handleCellEdit(e._id || e.id, 'ifsc', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all uppercase"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'ifsc') }" />
                </td>
                <td class="px-4 py-2.5">
                  <input type="number" :value="e.p_day_wage" @change="(evt) => handleCellEdit(e._id || e.id, 'p_day_wage', (evt.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'p_day_wage') }" />
                </td>
                <td class="px-4 py-2.5">
                  <select :value="e.status" @change="(evt) => handleCellEdit(e._id || e.id, 'status', (evt.target as HTMLSelectElement).value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    :class="{ 'border-amber-400 bg-amber-50/30': isDirty(e._id || e.id, 'status') }">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Left">Left</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
        <button @click="close" class="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
          Discard Changes
        </button>
        <button @click="handleSave" :disabled="saving" class="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50">
          <svg v-if="!saving" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <svg v-else class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ saving ? 'Saving...' : 'Save All Changes' }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-in {
  animation: animate-in 0.2s ease-out;
}

@keyframes animate-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
