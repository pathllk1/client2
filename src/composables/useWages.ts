import { ref } from 'vue'
import { useApi } from '@/utils/api'

export const useWages = () => {
  const api = useApi()
  const loading = ref(false)
  const wages = ref<any[]>([])

  const fetchEligibleEmployees = async (month: string) => {
    loading.value = true
    try {
      return await api.post('/wages/eligible-employees', { month })
    } finally {
      loading.value = false
    }
  }

  const fetchWagesByMonth = async (month: string) => {
    loading.value = true
    try {
      const response = await api.get(`/wages/month?month=${month}`)
      if (response.success) {
        wages.value = response.data
      }
      return response
    } finally {
      loading.value = false
    }
  }

  const createWagesBulk = async (wages: any[]) => {
    loading.value = true
    try {
      return await api.post('/wages/bulk', { wages })
    } finally {
      loading.value = false
    }
  }

  const updateWage = async (id: string, data: any) => {
    loading.value = true
    try {
      return await api.put(`/wages/${id}`, data)
    } finally {
      loading.value = false
    }
  }

  const deleteWage = async (id: string) => {
    loading.value = true
    try {
      return await api.delete(`/wages/${id}`)
    } finally {
      loading.value = false
    }
  }

  const getJobStatus = async (jobId: string) => {
    return await api.get(`/wages/job/${jobId}`)
  }

  const exportWages = async (month: string, data: any[]) => {
    await api.download('/wages/export', `Wages_${month}.xlsx`, 'POST', { month, data })
  }

  const downloadBankReport = async (month: string) => {
    await api.download(`/wages/bank-report?month=${month}`, `Bank_Report_${month}.xlsx`)
  }

  const downloadEPFESICReport = async (month: string) => {
    await api.download(`/wages/epf-esic-report?month=${month}`, `EPF_ESIC_Report_${month}.xlsx`)
  }

  const downloadWageSlip = async (id: string, name: string) => {
    await api.download(`/wages/slip/${id}`, `WageSlip_${name}.pdf`)
  }

  const downloadBulkWageSlips = async (month: string) => {
    await api.download(`/wages/bulk-slips?month=${month}`, `WageSlips_${month}.zip`)
  }

  const fetchBankAccounts = async () => {
    return await api.get('/banking')
  }

  return {
    loading,
    wages,
    fetchEligibleEmployees,
    fetchWagesByMonth,
    createWagesBulk,
    updateWage,
    deleteWage,
    getJobStatus,
    exportWages,
    downloadBankReport,
    downloadEPFESICReport,
    downloadWageSlip,
    downloadBulkWageSlips,
    fetchBankAccounts
  }
}
