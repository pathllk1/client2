import { ref } from 'vue'
import { api } from '@/utils/api'

export interface ExpenseCategory {
  id: string
  name: string
  description?: string
  is_active: boolean
}

export interface CostCenter {
  id: string
  name: string
  description?: string
}

export interface CashRegister {
  id: string
  name: string
  balance: string
  status: string
  cost_center_id?: string
  cost_center_name?: string
}

export interface CashTransaction {
  id: string
  cash_register_id: string
  type: 'CASH_IN' | 'CASH_OUT'
  amount: string
  transaction_date: string
  reference_type: string
  reference_id?: string
  description?: string
  running_balance: string
  created_at: string
}

export interface Expense {
  id: string
  category_id: string
  category_name: string
  cost_center_id: string
  cost_center_name: string
  cash_register_id?: string
  cash_register_name?: string
  amount: string
  expense_date: string
  description: string
  project?: string
  payment_mode: 'CASH' | 'BANK' | 'CARD' | 'OTHER'
  paid_to_received_from?: string
  created_at: string
}

export interface ExpenseStats {
  monthlyTotal: number
  categoryBreakdown: { name: string; total: number }[]
  costCenterBreakdown: { name: string; total: number }[]
}

export const useExpenses = () => {
  const categories = ref<ExpenseCategory[]>([])
  const costCenters = ref<CostCenter[]>([])
  const registers = ref<CashRegister[]>([])
  const expenses = ref<Expense[]>([])
  const projects = ref<string[]>([])
  const stats = ref<ExpenseStats | null>(null)
  const transactions = ref<CashTransaction[]>([])
  const loading = ref(false)

  const fetchCategories = async () => {
    loading.value = true
    try {
      const res = await api.get('/expenses/categories')
      if (res.success) categories.value = res.data
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchCostCenters = async () => {
    loading.value = true
    try {
      const res = await api.get('/expenses/cost-centers')
      if (res.success) costCenters.value = res.data
    } catch (err) {
      console.error('Failed to fetch cost centers:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchRegisters = async () => {
    loading.value = true
    try {
      const res = await api.get('/expenses/cash-registers')
      if (res.success) registers.value = res.data
    } catch (err) {
      console.error('Failed to fetch cash registers:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchExpenses = async (params: any = {}) => {
    loading.value = true
    try {
      const res = await api.get('/expenses', { params })
      if (res.success) expenses.value = res.data
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchRecentProjects = async () => {
    try {
      const res = await api.get('/expenses/projects')
      if (res.success) projects.value = res.data
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/expenses/stats')
      if (res.success) stats.value = res.data
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const createExpense = async (data: any) => {
    loading.value = true
    try {
      const res = await api.post('/expenses', data)
      return res
    } finally {
      loading.value = false
    }
  }

  const updateExpense = async (id: string, data: any) => {
    loading.value = true
    try {
      const res = await api.put(`/expenses/${id}`, data)
      return res
    } finally {
      loading.value = false
    }
  }

  const deleteExpense = async (id: string) => {
    loading.value = true
    try {
      const res = await api.delete(`/expenses/${id}`)
      return res
    } finally {
      loading.value = false
    }
  }

  const createRegister = async (name: string, costCenterId: string) => {
    loading.value = true
    try {
      const res = await api.post('/expenses/cash-registers', { name, costCenterId })
      return res
    } finally {
      loading.value = false
    }
  }

  const updateRegister = async (id: string, data: { name?: string; costCenterId?: string; status?: string }) => {
    loading.value = true
    try {
      const res = await api.put(`/expenses/cash-registers/${id}`, data)
      return res
    } finally {
      loading.value = false
    }
  }

  const depositCash = async (id: string, amount: number, description: string) => {
    loading.value = true
    try {
      const res = await api.post(`/expenses/cash-registers/${id}/deposit`, { amount, description })
      return res
    } finally {
      loading.value = false
    }
  }

  const fetchRegisterTransactions = async (id: string) => {
    loading.value = true
    try {
      const res = await api.get(`/expenses/cash-registers/${id}/transactions`)
      if (res.success) transactions.value = res.data
    } catch (err) {
      console.error('Failed to fetch register transactions:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    costCenters,
    registers,
    expenses,
    projects,
    stats,
    transactions,
    loading,
    fetchCategories,
    fetchCostCenters,
    fetchRegisters,
    fetchExpenses,
    fetchRecentProjects,
    fetchStats,
    createExpense,
    updateExpense,
    deleteExpense,
    createRegister,
    updateRegister,
    depositCash,
    fetchRegisterTransactions
  }
}
