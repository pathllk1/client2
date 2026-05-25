import { ref, computed } from 'vue'
import { useApi } from '@/utils/api'

export const useMasterRoll = () => {
  const api = useApi()
  const loading = ref(false)
  const employees = ref<any[]>([])
  const stats = ref<any>(null)
  const total = ref(0)

  const fetchEmployees = async (params: any = {}) => {
    loading.value = true
    try {
      const query = new URLSearchParams(params).toString()
      const response = await api.get(`/master-rolls?${query}`)
      if (response.success) {
        employees.value = response.data
        total.value = response.pagination?.total || 0
      }
      return response
    } finally {
      loading.value = false
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/master-rolls/stats')
      if (response.success) {
        stats.value = response.data
      }
      return response
    } catch (err) {
      console.error('Stats fetch error', err)
    }
  }

  const fetchUniqueFields = async () => {
    try {
      return await api.get('/master-rolls/unique-fields')
    } catch (err) {
      console.error('Unique fields fetch error', err)
    }
  }

  const createEmployee = async (data: any) => {
    loading.value = true
    try {
      return await api.post('/master-rolls', data)
    } finally {
      loading.value = false
    }
  }

  const updateEmployee = async (id: string, data: any) => {
    loading.value = true
    try {
      return await api.put(`/master-rolls/${id}`, data)
    } finally {
      loading.value = false
    }
  }

  const deleteEmployee = async (id: string) => {
    loading.value = true
    try {
      return await api.delete(`/master-rolls/${id}`)
    } finally {
      loading.value = false
    }
  }

  const bulkImport = async (employees: any[]) => {
    loading.value = true
    try {
      return await api.post('/master-rolls/import', { employees })
    } finally {
      loading.value = false
    }
  }

  const bulkDeleteEmployees = async (ids: string[]) => {
    loading.value = true
    try {
      return await api.delete('/master-rolls/bulk', { ids })
    } finally {
      loading.value = false
    }
  }

  const bulkUpdateEmployees = async (updates: { id: string, data: any }[]) => {
    loading.value = true
    try {
      return await api.put('/master-rolls/bulk', { updates })
    } finally {
      loading.value = false
    }
  }

  const getActivityLog = async (id: string) => {
    return await api.get(`/master-rolls/${id}/activity`)
  }

  const downloadAppointmentLetter = async (id: string, name: string) => {
    await api.download(`/master-rolls/${id}/appointment-letter`, `Appointment_Letter_${name}.docx`)
  }

  const exportQualityReport = async () => {
    await api.download('/master-rolls/export/quality-report', 'Data_Quality_Report.xlsx')
  }

  const downloadTemplate = async () => {
    await api.download('/master-rolls/export/template', 'MasterRoll_Template.xlsx')
  }

  const exportExcel = async (selectedIds?: string[]) => {
    let url = '/master-rolls/export?format=xlsx'
    if (selectedIds && selectedIds.length > 0) {
      url += `&selectedIds=${selectedIds.join(',')}`
    }
    await api.download(url, 'MasterRoll_Export.xlsx')
  }

  const exportICards = async (params: any = {}, format: 'pdf' | 'xlsx' = 'pdf') => {
    const searchParams = new URLSearchParams()
    
    // Add all params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    
    // Add format
    searchParams.append('format', format)
    
    const query = searchParams.toString()
    const extension = format === 'xlsx' ? 'xlsx' : 'pdf'
    const endpoint = `/master-rolls/export/icards?${query}`
    
    console.log(`[DEBUG] Exporting I-Cards (${format}) with endpoint:`, endpoint)
    await api.download(endpoint, `Employee_ICards.${extension}`)
  }

  return {
    loading,
    employees,
    stats,
    total,
    fetchEmployees,
    fetchStats,
    fetchUniqueFields,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    bulkImport,
    bulkDeleteEmployees,
    bulkUpdateEmployees,
    getActivityLog,
    downloadAppointmentLetter,
    exportQualityReport,
    downloadTemplate,
    exportExcel,
    exportICards
  }
}
