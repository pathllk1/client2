<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/utils/api'
import { useToast } from '@nuxt/ui/composables'

const { selectedFirmId } = useAuth()
const api = useApi()
const toast = useToast()

interface DocumentItem {
  id: string;
  firm_id: string;
  user_id: string;
  name: string;
  reference_number: string;
  description: string | null;
  start_date: string | null;
  original_expiry_date: string;
  closed_date: string | null;
  extended_expiry_date: string | null;
  value: number | string;
  status: string;
  computed_status?: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

// State
const documents = ref<DocumentItem[]>([])
const loading = ref(false)
const searchQuery = ref('')
const sortBy = ref('expiry_date')
const sortOrder = ref('asc')
const showNotificationSuccess = ref(false)
const notificationSummary = ref({ total: 0, expired: 0, expiringSoon: 0 })

// Modal Controls
const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)

// Form Fields
const form = ref({
  name: '',
  referenceNumber: '',
  description: '',
  startDate: '',
  originalExpiryDate: '',
  closedDate: '',
  extendedExpiryDate: '',
  value: 0,
  status: 'Active'
})
const fileToUpload = ref<File | null>(null)
const uploadInputKey = ref(0) // Used to force-reset file input

// Formatting Utilities
const formatCurrency = (val: number | string) => {
  const num = parseFloat(String(val)) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  // Avoid time-zone offset issue by taking date parts directly
  const firstPart = dateStr.split('T')[0];
  if (!firstPart) return dateStr;
  const parts = firstPart.split('-');
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  if (!year || !month || !day) return dateStr;
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Fetch list of documents
const fetchDocuments = async () => {
  if (!selectedFirmId.value) return;
  loading.value = true;
  try {
    const res = await api.get('/documents', {
      params: {
        search: searchQuery.value,
        sort: sortBy.value,
        order: sortOrder.value
      }
    });
    if (res.success) {
      documents.value = res.data;
    }
  } catch (err: any) {
    toast.add({ title: 'Error fetching documents', description: err.message, color: 'error' });
  } finally {
    loading.value = false;
  }
}

// Trigger Notifications
const sendNotifications = async () => {
  try {
    const res = await api.post('/documents/send-notifications', {});
    if (res.success) {
      notificationSummary.value = {
        total: res.summary.total_alerts,
        expired: res.summary.expired,
        expiringSoon: res.summary.expiring_soon
      };
      showNotificationSuccess.value = true;
      setTimeout(() => {
        showNotificationSuccess.value = false;
      }, 7000);
      toast.add({ title: 'Success', description: 'Alert notifications sent successfully', color: 'success' });
    }
  } catch (err: any) {
    toast.add({ title: 'Error sending notifications', description: err.message, color: 'error' });
  }
}

// Export list as CSV
const downloadCSV = () => {
  if (documents.value.length === 0) {
    toast.add({ title: 'No documents', description: 'Nothing to download', color: 'warning' });
    return;
  }
  const headers = ['Document Name', 'Reference Number', 'Description', 'Start Date', 'Original Expiry Date', 'Closed Date', 'Extended Expiry Date', 'Value', 'Status', 'File URL'];
  const rows = documents.value.map(doc => [
    doc.name,
    doc.reference_number,
    doc.description || '',
    doc.start_date ? doc.start_date.split('T')[0] : '',
    doc.original_expiry_date ? doc.original_expiry_date.split('T')[0] : '',
    doc.closed_date ? doc.closed_date.split('T')[0] : '',
    doc.extended_expiry_date ? doc.extended_expiry_date.split('T')[0] : '',
    doc.value,
    doc.computed_status || doc.status,
    doc.file_url || ''
  ]);
  
  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Documents_List_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// File Selection Handler
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files.item(0);
    if (!file) return;
    // Strict 500 KB limit validation
    if (file.size > 500 * 1024) {
      toast.add({ title: 'File Rejected', description: 'Maximum file size permitted is 500 KB', color: 'error' });
      fileToUpload.value = null;
      uploadInputKey.value++; // Reset input selection
    } else {
      fileToUpload.value = file;
    }
  }
}

// Open modal to add a document
const openAddModal = () => {
  isEditMode.value = false;
  editingId.value = null;
  form.value = {
    name: '',
    referenceNumber: '',
    description: '',
    startDate: '',
    originalExpiryDate: '',
    closedDate: '',
    extendedExpiryDate: '',
    value: 0,
    status: 'Active'
  };
  fileToUpload.value = null;
  uploadInputKey.value++;
  isModalOpen.value = true;
}

// Open modal to edit a document
const openEditModal = (doc: DocumentItem) => {
  isEditMode.value = true;
  editingId.value = doc.id;
  form.value = {
    name: doc.name,
    referenceNumber: doc.reference_number,
    description: doc.description || '',
    startDate: doc.start_date ? (doc.start_date.split('T')[0] || '') : '',
    originalExpiryDate: doc.original_expiry_date ? (doc.original_expiry_date.split('T')[0] || '') : '',
    closedDate: doc.closed_date ? (doc.closed_date.split('T')[0] || '') : '',
    extendedExpiryDate: doc.extended_expiry_date ? (doc.extended_expiry_date.split('T')[0] || '') : '',
    value: parseFloat(String(doc.value)) || 0,
    status: doc.status
  };
  fileToUpload.value = null;
  uploadInputKey.value++;
  isModalOpen.value = true;
}

// Submit Add / Edit Form
const submitForm = async () => {
  if (!form.value.name || !form.value.referenceNumber || !form.value.originalExpiryDate) {
    toast.add({ title: 'Validation Error', description: 'Please complete all required fields.', color: 'warning' });
    return;
  }

  const formData = new FormData();
  formData.append('name', form.value.name);
  formData.append('referenceNumber', form.value.referenceNumber);
  formData.append('description', form.value.description);
  formData.append('startDate', form.value.startDate);
  formData.append('originalExpiryDate', form.value.originalExpiryDate);
  formData.append('closedDate', form.value.closedDate);
  formData.append('extendedExpiryDate', form.value.extendedExpiryDate);
  formData.append('value', String(form.value.value));
  formData.append('status', form.value.status);

  if (fileToUpload.value) {
    formData.append('file', fileToUpload.value);
  }

  try {
    loading.value = true;
    let res;
    if (isEditMode.value && editingId.value) {
      res = await api.uploadPut(`/documents/${editingId.value}`, formData);
    } else {
      res = await api.upload('/documents', formData);
    }

    if (res.success) {
      toast.add({ 
        title: 'Success', 
        description: isEditMode.value ? 'Document updated successfully' : 'Document added successfully', 
        color: 'success' 
      });
      isModalOpen.value = false;
      fetchDocuments();
    }
  } catch (err: any) {
    toast.add({ title: 'Upload Failed', description: err.message, color: 'error' });
  } finally {
    loading.value = false;
  }
}

// Delete Document
const deleteDoc = async (id: string) => {
  if (!confirm('Are you sure you want to permanently delete this document?')) return;
  try {
    const res = await api.delete(`/documents/${id}`);
    if (res.success) {
      toast.add({ title: 'Deleted', description: 'Document removed successfully', color: 'success' });
      fetchDocuments();
    }
  } catch (err: any) {
    toast.add({ title: 'Error deleting', description: err.message, color: 'error' });
  }
}

// Query listeners
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchDocuments();
  }, 400);
});

watch([sortBy, sortOrder], () => {
  fetchDocuments();
});

watch(selectedFirmId, () => {
  fetchDocuments();
});

onMounted(() => {
  fetchDocuments();
});
</script>

<template>
  <div class="p-6 w-full space-y-6">
    <!-- Gradient Main Header Panel -->
    <div class="rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-8 text-white shadow-lg relative overflow-hidden">
      <div class="relative z-10 space-y-2">
        <h1 class="text-4xl font-extrabold tracking-tight">Document Management</h1>
        <p class="text-teal-50 font-medium">Manage your important documents and track their validity</p>
      </div>
      <!-- Accent Circles -->
      <div class="absolute right-0 bottom-0 w-64 h-64 bg-white/10 rounded-full blur-2xl transform translate-x-12 translate-y-12"></div>
      <div class="absolute left-1/3 top-0 w-32 h-32 bg-teal-300/20 rounded-full blur-xl"></div>
    </div>

    <!-- Success Toast Alert Bar -->
    <div v-if="showNotificationSuccess" class="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-sm transition-all duration-300 animate-in slide-in-from-top-4">
      <span class="text-xl">✅</span>
      <div>
        <p class="font-bold">Notifications sent successfully</p>
        <p class="text-xs text-emerald-600">Processed alerts for {{ notificationSummary.total }} documents ({{ notificationSummary.expired }} expired, {{ notificationSummary.expiringSoon }} expiring soon).</p>
      </div>
    </div>

    <!-- Filter and Utility Controls -->
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <!-- Search Input -->
      <div class="relative flex-1 max-w-md">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search documents..." 
          class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
        />
      </div>

      <!-- Action Buttons and Sorting -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Sort Control -->
        <div class="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 gap-2">
          <span class="text-xs font-semibold text-gray-500">Sort by:</span>
          <select v-model="sortBy" class="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer border-0 p-1">
            <option value="expiry_date">Expiry Date</option>
            <option value="name">Document Name</option>
            <option value="value">Value</option>
            <option value="reference_number">Reference Number</option>
          </select>
          <button 
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'" 
            class="text-gray-400 hover:text-gray-700 transition"
            title="Toggle Sort Order"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" :class="[sortOrder === 'desc' ? 'rotate-180' : '']">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>
        </div>

        <!-- Notify Button -->
        <button 
          @click="sendNotifications" 
          class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 hover:shadow-lg transition cursor-pointer"
        >
          <span>🔔</span> Send Notifications
        </button>

        <!-- Add Button -->
        <button 
          @click="openAddModal" 
          class="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-200 hover:shadow-lg transition cursor-pointer"
        >
          <span>➕</span> Add Document
        </button>

        <!-- Download Button -->
        <button 
          @click="downloadCSV" 
          class="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-200 hover:shadow-lg transition cursor-pointer"
        >
          <span>📥</span> Download Report
        </button>
      </div>
    </div>

    <!-- Main Documents Table List -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading" class="flex flex-col items-center justify-center p-20 space-y-4">
        <div class="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm font-semibold text-gray-500">Loading documents...</p>
      </div>

      <div v-else-if="documents.length === 0" class="flex flex-col items-center justify-center p-20 text-center space-y-3">
        <span class="text-4xl">📂</span>
        <h3 class="text-lg font-bold text-gray-800">No documents found</h3>
        <p class="text-sm text-gray-500 max-w-sm">No records belong to this firm or match your search criteria. Add one above to get started!</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <th class="px-6 py-4">Document Name</th>
              <th class="px-6 py-4">Reference Number</th>
              <th class="px-6 py-4">Description</th>
              <th class="px-6 py-4">Start Date</th>
              <th class="px-6 py-4">Expiry Date</th>
              <th class="px-6 py-4">Value</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm font-medium text-gray-700">
            <tr v-for="doc in documents" :key="doc.id" class="hover:bg-gray-50/40 transition">
              <!-- Name & File Indicator -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <span class="text-xl">📄</span>
                  <div>
                    <p class="font-bold text-gray-900">{{ doc.name }}</p>
                    <p v-if="doc.file_name" class="text-xs text-gray-400 font-semibold max-w-xs truncate" :title="doc.file_name">
                      📎 {{ doc.file_name }}
                    </p>
                  </div>
                </div>
              </td>
              <!-- Ref No -->
              <td class="px-6 py-4 text-xs font-mono font-bold text-gray-500 max-w-xs truncate" :title="doc.reference_number">
                {{ doc.reference_number }}
              </td>
              <!-- Description -->
              <td class="px-6 py-4 text-gray-500 font-normal max-w-xs truncate" :title="doc.description || ''">
                {{ doc.description || 'No description provided' }}
              </td>
              <!-- Start Date -->
              <td class="px-6 py-4 text-gray-500">
                {{ formatDate(doc.start_date) }}
              </td>
              <!-- Expiry Date -->
              <td class="px-6 py-4">
                <div class="space-y-0.5">
                  <p :class="[doc.extended_expiry_date ? 'text-gray-300 line-through text-xs font-normal' : 'font-semibold text-gray-800']">
                    {{ formatDate(doc.original_expiry_date) }}
                  </p>
                  <p v-if="doc.extended_expiry_date" class="font-bold text-teal-600 flex items-center gap-1">
                    {{ formatDate(doc.extended_expiry_date) }}
                    <span class="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-black uppercase">Ext</span>
                  </p>
                </div>
              </td>
              <!-- Value -->
              <td class="px-6 py-4 font-bold text-gray-900">
                {{ formatCurrency(doc.value) }}
              </td>
              <!-- Status Pill -->
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  :class="{
                    'bg-emerald-50 text-emerald-700 border border-emerald-100': doc.computed_status === 'Active',
                    'bg-rose-50 text-rose-700 border border-rose-100': doc.computed_status === 'Expired',
                    'bg-amber-50 text-amber-700 border border-amber-100': doc.computed_status === 'Pending',
                    'bg-gray-50 text-gray-600 border border-gray-100': doc.computed_status === 'Closed'
                  }"
                >
                  {{ doc.computed_status || doc.status }}
                </span>
              </td>
              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2.5">
                  <!-- View/Download B2 File -->
                  <a 
                    v-if="doc.file_url"
                    :href="doc.file_url" 
                    target="_blank"
                    class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="View uploaded file"
                  >
                    <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <!-- Edit Button -->
                  <button 
                    @click="openEditModal(doc)"
                    class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer border-0 bg-transparent"
                    title="Edit Document"
                  >
                    <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <!-- Delete Button -->
                  <button 
                    @click="deleteDoc(doc.id)"
                    class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border-0 bg-transparent"
                    title="Delete Document"
                  >
                    <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form (Add / Edit) -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white flex justify-between items-center">
          <h2 class="text-xl font-bold">{{ isEditMode ? 'Edit Document' : 'Add New Document' }}</h2>
          <button @click="isModalOpen = false" class="text-white/80 hover:text-white transition cursor-pointer bg-transparent border-0 text-xl font-bold">✕</button>
        </div>

        <!-- Modal Body (Form Fields) -->
        <div class="p-6 space-y-4 overflow-y-auto flex-1">
          <!-- Document Name & Ref No -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Document Name*</label>
              <input 
                v-model="form.name"
                type="text" 
                placeholder="Enter document name"
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Reference Number*</label>
              <input 
                v-model="form.referenceNumber"
                type="text" 
                placeholder="Enter reference code/ID"
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
          </div>

          <!-- Description -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Description*</label>
            <textarea 
              v-model="form.description"
              rows="3"
              placeholder="Provide a detailed summary of the document contents"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
            ></textarea>
          </div>

          <!-- Dates Row 1: Start Date & Original Expiry Date -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Start Date</label>
              <input 
                v-model="form.startDate"
                type="date" 
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Original Expiry Date*</label>
              <input 
                v-model="form.originalExpiryDate"
                type="date" 
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
          </div>

          <!-- Dates Row 2: Closed Date & Extended Expiry Date -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Closed Date</label>
              <input 
                v-model="form.closedDate"
                type="date" 
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Extended Expiry Date</label>
              <input 
                v-model="form.extendedExpiryDate"
                type="date" 
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
          </div>

          <!-- Value & Status -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Value (INR)*</label>
              <input 
                v-model.number="form.value"
                type="number" 
                min="0"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Status</label>
              <select 
                v-model="form.status"
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <!-- File Upload Section -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-gray-500 uppercase">File Upload (Max size: 500 KB)</label>
            <div class="border-2 border-dashed border-gray-200 hover:border-teal-400 p-4 rounded-xl flex flex-col items-center justify-center transition bg-gray-50/50">
              <input 
                :key="uploadInputKey"
                type="file" 
                @change="handleFileChange"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                class="text-sm text-gray-500 focus:outline-none w-full file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />
              <p class="text-xs text-gray-400 mt-2">Permitted formats: PDF, Images, Word, Excel (Max: 500 KB)</p>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            @click="isModalOpen = false" 
            class="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm transition cursor-pointer border-0"
          >
            Cancel
          </button>
          <button 
            @click="submitForm" 
            :disabled="loading"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 cursor-pointer border-0"
          >
            {{ isEditMode ? 'Save Changes' : 'Add Document' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
