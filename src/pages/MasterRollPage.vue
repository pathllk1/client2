<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getPaginationRowModel } from '@tanstack/vue-table';
import { apiFetch } from '../utils/api';
import { useAuth } from '../composables/useAuth';

const auth = useAuth();

interface MasterRoll {
  id: string;
  employee_name: string;
  father_husband_name: string;
  date_of_birth: string;
  aadhar: string;
  pan: string;
  phone_no: string;
  address: string;
  bank: string;
  account_no: string;
  ifsc: string;
  branch: string;
  uan: string;
  esic_no: string;
  s_kalyan_no: string;
  category: string;
  p_day_wage: number;
  project: string;
  site: string;
  date_of_joining: string;
  date_of_exit: string;
  doe_rem: string;
  status: string;
}

const employees = ref<MasterRoll[]>([]);
const loading = ref(false);
const search = ref('');
const isModalOpen = ref(false);
const isDetailModalOpen = ref(false);
const selectedEmployee = ref<Partial<MasterRoll>>({});
const modalLoading = ref(false);

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
});

const columns = [
  { id: 'employee_name', accessorKey: 'employee_name', header: 'Name', sortable: true },
  { id: 'aadhar', accessorKey: 'aadhar', header: 'Aadhar' },
  { id: 'phone_no', accessorKey: 'phone_no', header: 'Phone' },
  { id: 'category', accessorKey: 'category', header: 'Category' },
  { id: 'project', accessorKey: 'project', header: 'Project' },
  { id: 'p_day_wage', accessorKey: 'p_day_wage', header: 'Daily Wage' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'actions', accessorKey: 'actions', header: 'Actions' }
];

const fetchEmployees = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/master-rolls');
    const result = await response.json();
    if (result.success) {
      employees.value = result.data;
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
  } finally {
    loading.value = false;
  }
};

const filteredEmployees = computed(() => {
  if (!search.value) return employees.value;
  const q = search.value.toLowerCase();
  return employees.value.filter(emp => 
    emp.employee_name.toLowerCase().includes(q) || 
    emp.aadhar.includes(q) || 
    emp.phone_no.includes(q) ||
    emp.project?.toLowerCase().includes(q)
  );
});

const openModal = (employee?: MasterRoll) => {
  if (employee) {
    selectedEmployee.value = { ...employee };
  } else {
    selectedEmployee.value = {
      status: 'Active',
      category: 'UNSKILLED',
      date_of_joining: new Date().toISOString().split('T')[0]
    };
  }
  isModalOpen.value = true;
};

const openDetails = (employee: MasterRoll) => {
  selectedEmployee.value = { ...employee };
  isDetailModalOpen.value = true;
};

const saveEmployee = async () => {
  modalLoading.value = true;
  try {
    const isEdit = !!selectedEmployee.value.id;
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `/master-rolls/${selectedEmployee.value.id}` : '/master-rolls';
    
    const response = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(selectedEmployee.value)
    });
    
    const result = await response.json();
    if (result.success) {
      await fetchEmployees();
      isModalOpen.value = false;
    } else {
      alert(result.error || 'Failed to save employee');
    }
  } catch (error) {
    console.error('Error saving employee:', error);
  } finally {
    modalLoading.value = false;
  }
};

const deleteEmployee = async (id: string) => {
  if (!confirm('Are you sure you want to delete this employee?')) return;
  
  try {
    const response = await apiFetch(`/master-rolls/${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (result.success) {
      await fetchEmployees();
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
  }
};

onMounted(fetchEmployees);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Master Roll</h1>
        <p class="text-gray-500">Manage comprehensive employee records and compliance data</p>
      </div>
      <UButton
        icon="i-lucide-plus"
        label="Add Employee"
        color="primary"
        @click="openModal()"
      />
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search by name, aadhar, phone or project..."
            class="max-w-md w-full"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            variant="ghost"
            color="neutral"
            :loading="loading"
            @click="fetchEmployees"
          />
        </div>
      </template>

      <UTable
        v-model:pagination="pagination"
        :columns="columns"
        :data="filteredEmployees"
        :loading="loading"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        class="w-full"
      >
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'Active' ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ row.original.status }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-2">
            <UTooltip text="View Details">
              <UButton
                icon="i-lucide-eye"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="openDetails(row.original)"
              />
            </UTooltip>
            <UTooltip text="Edit">
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="openModal(row.original)"
              />
            </UTooltip>
            <UTooltip text="Delete">
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="sm"
                @click="deleteEmployee(row.original.id)"
              />
            </UTooltip>
          </div>
        </template>

        <template #loading>
          <div class="flex flex-col items-center justify-center py-10 gap-3">
            <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
            <p class="text-sm text-gray-400">Loading master roll...</p>
          </div>
        </template>
      </UTable>

      <template #footer>
        <div v-if="filteredEmployees.length > 0" class="flex items-center justify-between">
          <p class="text-sm text-gray-500">
            Showing {{ (pagination.pageIndex * pagination.pageSize) + 1 }} to {{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredEmployees.length) }} of {{ filteredEmployees.length }} records
          </p>
          <UPagination
            :model-value="pagination.pageIndex + 1"
            :total="filteredEmployees.length"
            :items-per-page="pagination.pageSize"
            @update:model-value="(val: number) => pagination.pageIndex = val - 1"
          />
        </div>
      </template>
    </UCard>

    <!-- Unified Form Modal (Wide for all fields) -->
    <UModal v-model:open="isModalOpen" :title="selectedEmployee.id ? 'Edit Employee' : 'Add New Employee'" :description="selectedEmployee.id ? 'Update existing employee details and compliance information.' : 'Enter complete employee information including statutory details.'" :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <div class="space-y-6 py-2 overflow-y-auto max-h-[70vh] px-1">
          <!-- Section: Personal Information -->
          <div class="space-y-4">
            <h3 class="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <UIcon name="i-lucide-user" /> Personal Details
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <UFormField label="Employee Name" required>
                <UInput v-model="selectedEmployee.employee_name" placeholder="Full Name" block />
              </UFormField>
              <UFormField label="Father/Husband Name" required>
                <UInput v-model="selectedEmployee.father_husband_name" placeholder="Name" block />
              </UFormField>
              <UFormField label="Date of Birth" required>
                <UInput v-model="selectedEmployee.date_of_birth" type="date" block />
              </UFormField>
              <UFormField label="Aadhar Number" required>
                <UInput v-model="selectedEmployee.aadhar" placeholder="12 digit number" block />
              </UFormField>
              <UFormField label="PAN Number">
                <UInput v-model="selectedEmployee.pan" placeholder="PAN" block />
              </UFormField>
              <UFormField label="Phone Number" required>
                <UInput v-model="selectedEmployee.phone_no" placeholder="Phone" block />
              </UFormField>
            </div>
            <UFormField label="Full Address" required>
              <UTextarea v-model="selectedEmployee.address" placeholder="Address as per Aadhar" block :rows="2" />
            </UFormField>
          </div>

          <!-- Section: Employment & Project -->
          <div class="space-y-4 border-t pt-4">
            <h3 class="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <UIcon name="i-lucide-briefcase" /> Employment Details
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <UFormField label="Date of Joining" required>
                <UInput v-model="selectedEmployee.date_of_joining" type="date" block />
              </UFormField>
              <UFormField label="Project">
                <UInput v-model="selectedEmployee.project" placeholder="Project Name" block />
              </UFormField>
              <UFormField label="Site">
                <UInput v-model="selectedEmployee.site" placeholder="Site Location" block />
              </UFormField>
              <UFormField label="Category">
                <UInput v-model="selectedEmployee.category" placeholder="e.g. UNSKILLED, SEMI-SKILLED" block />
              </UFormField>
              <UFormField label="Daily Wage">
                <UInput v-model="selectedEmployee.p_day_wage" type="number" placeholder="0.00" block />
              </UFormField>
              <UFormField label="Status">
                <USelect v-model="selectedEmployee.status" :items="['Active', 'Inactive', 'Exited']" block />
              </UFormField>
            </div>
            <div v-if="selectedEmployee.status === 'Exited'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <UFormField label="Date of Exit">
                <UInput v-model="selectedEmployee.date_of_exit" type="date" block />
              </UFormField>
              <UFormField label="Exit Reason">
                <UInput v-model="selectedEmployee.doe_rem" placeholder="Remarks" block />
              </UFormField>
            </div>
          </div>

          <!-- Section: Bank & Financial -->
          <div class="space-y-4 border-t pt-4">
            <h3 class="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <UIcon name="i-lucide-banknote" /> Bank Information
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <UFormField label="Bank Name" required>
                <UInput v-model="selectedEmployee.bank" placeholder="Bank Name" block />
              </UFormField>
              <UFormField label="Account Number" required>
                <UInput v-model="selectedEmployee.account_no" placeholder="Account No" block />
              </UFormField>
              <UFormField label="IFSC Code" required>
                <UInput v-model="selectedEmployee.ifsc" placeholder="IFSC" block />
              </UFormField>
              <UFormField label="Branch Name">
                <UInput v-model="selectedEmployee.branch" placeholder="Branch" block />
              </UFormField>
            </div>
          </div>

          <!-- Section: Statutory & Compliance -->
          <div class="space-y-4 border-t pt-4">
            <h3 class="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <UIcon name="i-lucide-shield-check" /> Statutory / Compliance
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <UFormField label="UAN Number">
                <UInput v-model="selectedEmployee.uan" placeholder="Universal Account No" block />
              </UFormField>
              <UFormField label="ESIC Number">
                <UInput v-model="selectedEmployee.esic_no" placeholder="ESIC ID" block />
              </UFormField>
              <UFormField label="S-Kalyan Number">
                <UInput v-model="selectedEmployee.s_kalyan_no" placeholder="Kalyan No" block />
              </UFormField>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="isModalOpen = false" />
          <UButton color="primary" :label="selectedEmployee.id ? 'Update Employee Record' : 'Create Employee Record'" :loading="modalLoading" @click="saveEmployee" />
        </div>
      </template>
    </UModal>

    <!-- Professional Detail View Modal (Wider) -->
    <UModal v-model:open="isDetailModalOpen" title="Comprehensive Employee Profile" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div v-if="selectedEmployee" class="space-y-8 py-2">
          <!-- Header Card -->
          <div class="flex flex-col md:flex-row items-center gap-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
            <UAvatar :alt="selectedEmployee.employee_name" size="2xl" class="shadow-lg ring-2 ring-primary/20" />
            <div class="text-center md:text-left space-y-2">
              <h3 class="text-2xl font-black">{{ selectedEmployee.employee_name }}</h3>
              <div class="flex flex-wrap justify-center md:justify-start gap-2">
                <UBadge :color="selectedEmployee.status === 'Active' ? 'success' : 'neutral'" variant="solid">
                  {{ selectedEmployee.status }}
                </UBadge>
                <UBadge color="info" variant="subtle">
                  {{ selectedEmployee.category || 'N/A' }}
                </UBadge>
                <UBadge v-if="selectedEmployee.project" color="neutral" variant="outline">
                  {{ selectedEmployee.project }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-500 font-medium">S/O, W/O: {{ selectedEmployee.father_husband_name }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Left Column: Personal -->
            <div class="space-y-6">
              <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Personal</h4>
              <div class="space-y-4">
                <div>
                  <p class="text-xs text-gray-500 mb-1">Aadhar / PAN</p>
                  <p class="text-sm font-semibold">{{ selectedEmployee.aadhar }} / {{ selectedEmployee.pan || 'N/A' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">Phone</p>
                  <p class="text-sm font-semibold">{{ selectedEmployee.phone_no }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">DOB / Age</p>
                  <p class="text-sm font-semibold">{{ selectedEmployee.date_of_birth }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">Address</p>
                  <p class="text-sm font-medium leading-relaxed">{{ selectedEmployee.address }}</p>
                </div>
              </div>
            </div>

            <!-- Middle Column: Employment -->
            <div class="space-y-6">
              <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Employment</h4>
              <div class="space-y-4">
                <div>
                  <p class="text-xs text-gray-500 mb-1">Joining Date</p>
                  <p class="text-sm font-semibold text-success">{{ selectedEmployee.date_of_joining }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">Project & Site</p>
                  <p class="text-sm font-semibold">{{ selectedEmployee.project || 'N/A' }} @ {{ selectedEmployee.site || 'N/A' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">Daily Wage</p>
                  <p class="text-lg font-bold text-primary">₹{{ selectedEmployee.p_day_wage }}</p>
                </div>
                <div v-if="selectedEmployee.status === 'Exited'">
                  <p class="text-xs text-gray-500 mb-1">Exit Info</p>
                  <p class="text-sm font-semibold text-error">{{ selectedEmployee.date_of_exit }} ({{ selectedEmployee.doe_rem }})</p>
                </div>
              </div>
            </div>

            <!-- Right Column: Financial & Statutory -->
            <div class="space-y-6">
              <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Compliance</h4>
              <div class="space-y-4">
                <div>
                  <p class="text-xs text-gray-500 mb-1">Bank Detail</p>
                  <p class="text-sm font-semibold">{{ selectedEmployee.bank }}</p>
                  <p class="text-xs font-mono text-gray-400 mt-1">AC: {{ selectedEmployee.account_no }}</p>
                  <p class="text-xs font-mono text-gray-400">IFSC: {{ selectedEmployee.ifsc }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">Statutory IDs</p>
                  <div class="space-y-1">
                    <p class="text-xs"><span class="text-gray-400">UAN:</span> <span class="font-semibold">{{ selectedEmployee.uan || 'N/A' }}</span></p>
                    <p class="text-xs"><span class="text-gray-400">ESIC:</span> <span class="font-semibold">{{ selectedEmployee.esic_no || 'N/A' }}</span></p>
                    <p class="text-xs"><span class="text-gray-400">Kalyan:</span> <span class="font-semibold">{{ selectedEmployee.s_kalyan_no || 'N/A' }}</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton color="neutral" variant="outline" label="Close Profile" block @click="isDetailModalOpen = false" />
      </template>
    </UModal>
  </div>
</template>
