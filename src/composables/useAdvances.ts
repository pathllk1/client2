import { ref } from 'vue'
import { useApi } from '@/utils/api'

export const useAdvances = () => {
  const api = useApi()
  const loading = ref(false)

  const fetchAllEmployeeBalances = async () => {
    loading.value = true
    try {
      return await api.get('/advances/balances')
    } finally {
      loading.value = false
    }
  }

  const fetchEmployeeAdvanceHistory = async (masterRollId: string) => {
    loading.value = true
    try {
      return await api.get(`/advances/history/${masterRollId}`)
    } finally {
      loading.value = false
    }
  }

  const recordAdvance = async (data: {
    master_roll_id: string;
    amount: number;
    type: 'ADVANCE' | 'RECOVERY';
    date: string;
    payment_mode: string;
    bank_account_id?: string;
    cheque_no?: string;
    remarks?: string;
  }) => {
    loading.value = true
    try {
      const payload = {
        masterRollId: data.master_roll_id,
        amount: data.amount,
        type: data.type === 'RECOVERY' ? 'REPAYMENT' : 'ADVANCE',
        date: data.date,
        paymentMode: data.payment_mode === 'CASH' ? 'CASH' : 'BANK',
        bankAccountId: data.bank_account_id || undefined,
        chequeNo: data.cheque_no || undefined,
        remarks: data.remarks
      }
      return await api.post('/advances', payload)
    } finally {
      loading.value = false
    }
  }

  const deleteAdvance = async (id: string) => {
    loading.value = true
    try {
      return await api.delete(`/advances/${id}`)
    } finally {
      loading.value = false
    }
  }

  const fetchBankAccounts = async () => {
    return await api.get('/banking')
  }

  const fetchEligibleEmployees = async () => {
    // We can use master-roll endpoint or a specialized one
    return await api.get('/master-rolls')
  }

  return {
    loading,
    fetchAllEmployeeBalances,
    fetchEmployeeAdvanceHistory,
    recordAdvance,
    deleteAdvance,
    fetchBankAccounts,
    fetchEligibleEmployees
  }
}
