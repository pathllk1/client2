<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive, onUnmounted } from 'vue'
import { useApi } from '@/utils/api'
import { useToast } from '@nuxt/ui/composables'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const api = useApi()
const toast = useToast()

// Page State
const activeTab = ref<'overview' | 'transactions' | 'sips'>('overview')
const portfolioData = ref<any>(null)
const transactionsList = ref<any[]>([])
const sipsList = ref<any[]>([])
const loading = ref(false)

// Chart Instances
let doughnutChart: Chart | null = null
let barChart: Chart | null = null

// Modals state
const isTransactionModalOpen = ref(false)
const isSipModalOpen = ref(false)
const editingSipId = ref<string | null>(null)
const saving = ref(false)

// Transaction Form State
const txForm = reactive({
  scheme_code: null as number | null,
  scheme_name: '',
  transaction_type: 'BUY' as 'BUY' | 'REDEEM',
  transaction_date: (new Date().toISOString().split('T')[0]) || '',
  amount: null as number | null,
  nav: null as number | null,
  units: null as number | null,
  sip_id: null as string | null,
  notes: ''
})

// SIP Form State
const sipForm = reactive({
  scheme_code: null as number | null,
  scheme_name: '',
  amount: null as number | null,
  frequency: 'MONTHLY' as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY',
  sip_day: 5,
  start_date: (new Date().toISOString().split('T')[0]) || '',
  end_date: ''
})

// Fund Search State
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
let searchTimeout: any = null

// Explorer Search State
const explorerQuery = ref('')
const explorerResults = ref<any[]>([])
const explorerLoading = ref(false)
let explorerTimeout: any = null
const explorerContainer = ref<HTMLElement | null>(null)

// Scheme Explorer Modal State
const isExplorerModalOpen = ref(false)
const explorerSchemeCode = ref<number | null>(null)
const explorerSchemeData = ref<any>(null)
const explorerDetailsLoading = ref(false)
let explorerHistoryChart: Chart | null = null

// Overdue SIP Trigger/Skip Processing State
const processingSipId = ref<string | null>(null)

// Watch SIP frequency to auto-reset/normalize preferred day values
watch(() => sipForm.frequency, (newFreq) => {
  if (newFreq === 'WEEKLY') {
    const day = parseInt(String(sipForm.sip_day))
    if (isNaN(day) || day < 1 || day > 7) {
      sipForm.sip_day = 1 // Default to Monday
    }
  } else if (newFreq === 'DAILY') {
    sipForm.sip_day = 1
  } else {
    const day = parseInt(String(sipForm.sip_day))
    if (isNaN(day) || day < 1 || day > 28) {
      sipForm.sip_day = 5
    }
  }
})

// Computed holdings map for selling restrictions
const holdingsMap = computed(() => {
  if (!portfolioData.value?.holdings) return {}
  const map: Record<number, number> = {}
  portfolioData.value.holdings.forEach((h: any) => {
    map[h.scheme_code] = h.total_units
  });
  return map
})

// ─── Data Fetching ──────────────────────────────────────────────────────────

const fetchData = async () => {
  loading.value = true
  try {
    const [portfolioRes, txsRes, sipsRes] = await Promise.all([
      api.get('/mutual-funds/portfolio'),
      api.get('/mutual-funds/transactions'),
      api.get('/mutual-funds/sips')
    ])
    
    portfolioData.value = portfolioRes.data
    transactionsList.value = txsRes.data || []
    sipsList.value = sipsRes.data || []

    if (activeTab.value === 'overview') {
      setTimeout(renderCharts, 100)
    }
  } catch (err: any) {
    toast.add({ title: 'Error loading portfolio', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (explorerContainer.value && !explorerContainer.value.contains(event.target as Node)) {
    explorerResults.value = []
  }
}

onMounted(() => {
  fetchData()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  destroyCharts()
  if (explorerHistoryChart) {
    explorerHistoryChart.destroy()
    explorerHistoryChart = null
  }
  document.removeEventListener('click', handleClickOutside)
})

// Watch tab change to re-render charts if going to overview
watch(activeTab, (newTab) => {
  if (newTab === 'overview') {
    setTimeout(renderCharts, 100)
  } else {
    destroyCharts()
  }
})

// ─── Autocomplete Fund Search ───────────────────────────────────────────────

const handleFundSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (searchQuery.value.trim().length < 2) {
    searchResults.value = []
    return
  }
  searchLoading.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const res = await api.get('/mutual-funds/schemes/search', { params: { q: searchQuery.value } })
      searchResults.value = res.data || []
    } catch (err: any) {
      console.error('Search error:', err.message)
    } finally {
      searchLoading.value = false
    }
  }, 400)
}

const selectFund = async (fund: { schemeCode: number; schemeName: string }, isSip = false) => {
  if (isSip) {
    sipForm.scheme_code = fund.schemeCode
    sipForm.scheme_name = fund.schemeName
  } else {
    txForm.scheme_code = fund.schemeCode
    txForm.scheme_name = fund.schemeName
    // Trigger NAV retrieval for selected date
    await fetchNavForSelectedDate()
  }
  searchQuery.value = ''
  searchResults.value = []
}

const handleExplorerSearch = () => {
  if (explorerTimeout) clearTimeout(explorerTimeout)
  if (explorerQuery.value.trim().length < 2) {
    explorerResults.value = []
    return
  }
  explorerLoading.value = true
  explorerTimeout = setTimeout(async () => {
    try {
      const res = await api.get('/mutual-funds/schemes/search', { params: { q: explorerQuery.value } })
      explorerResults.value = res.data || []
    } catch (err: any) {
      console.error('Explorer search error:', err.message)
    } finally {
      explorerLoading.value = false
    }
  }, 400)
}

const openSchemeExplorer = async (schemeCode: number) => {
  isExplorerModalOpen.value = true
  explorerSchemeCode.value = schemeCode
  explorerSchemeData.value = null
  explorerDetailsLoading.value = true
  
  // Clear search state
  explorerQuery.value = ''
  explorerResults.value = []
  
  if (explorerHistoryChart) {
    explorerHistoryChart.destroy()
    explorerHistoryChart = null
  }

  try {
    const res = await api.get(`/mutual-funds/schemes/${schemeCode}`)
    if (res.success && res.data) {
      explorerSchemeData.value = res.data
      
      // Render chart
      setTimeout(renderExplorerChart, 100)
    }
  } catch (err: any) {
    toast.add({ title: 'Error fetching details', description: err.message, color: 'error' })
  } finally {
    explorerDetailsLoading.value = false
  }
}

const renderExplorerChart = () => {
  if (explorerHistoryChart) {
    explorerHistoryChart.destroy()
    explorerHistoryChart = null
  }
  
  if (!explorerSchemeData.value || !explorerSchemeData.value.data) return

  const ctx = document.getElementById('explorerChart') as HTMLCanvasElement
  if (!ctx) return

  const parsedData = explorerSchemeData.value.data.map((item: any) => {
    const parts = item.date.split('-')
    const dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    return {
      date: dateObj,
      nav: parseFloat(item.nav)
    }
  })

  parsedData.sort((a: any, b: any) => a.date.getTime() - b.date.getTime())

  const latestDate = parsedData[parsedData.length - 1]?.date || new Date()
  const oneYearAgo = new Date(latestDate)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const chartData = parsedData.filter((item: any) => item.date >= oneYearAgo)

  explorerHistoryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.map((item: any) => {
        return item.date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', day: '2-digit' })
      }),
      datasets: [{
        label: 'NAV (₹)',
        data: chartData.map((item: any) => item.nav),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 8,
            font: { size: 10 }
          }
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: {
            font: { size: 10 }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: any) => ` NAV: ₹${context.raw.toFixed(4)}`
          }
        }
      }
    }
  })
}

const explorerInvestLumpsum = () => {
  if (!explorerSchemeData.value || !explorerSchemeData.value.meta) return
  const meta = explorerSchemeData.value.meta
  isExplorerModalOpen.value = false
  openNewTransaction('BUY', meta.scheme_code, meta.scheme_name)
}

const explorerSetupSip = () => {
  if (!explorerSchemeData.value || !explorerSchemeData.value.meta) return
  const meta = explorerSchemeData.value.meta
  isExplorerModalOpen.value = false
  editingSipId.value = null
  sipForm.scheme_code = meta.scheme_code
  sipForm.scheme_name = meta.scheme_name
  sipForm.amount = null
  sipForm.frequency = 'MONTHLY'
  sipForm.sip_day = 5
  sipForm.start_date = (new Date().toISOString().split('T')[0]) || ''
  sipForm.end_date = ''
  searchQuery.value = ''
  searchResults.value = []
  isSipModalOpen.value = true
}

function parseMfapiDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
  }
  return dateStr;
}

const fetchNavForSelectedDate = async () => {
  const code = txForm.scheme_code
  const date = txForm.transaction_date
  if (!code || !date) return
  
  try {
    const res = await api.get(`/mutual-funds/schemes/${code}/nav`, { params: { date } })
    if (res.success && res.data) {
      txForm.nav = res.data.nav
      if (res.data.requestedDate !== res.data.actualDate) {
        toast.add({ 
          title: 'NAV Date Adjusted', 
          description: `Market was closed on ${date}. Using closest NAV from ${res.data.actualDate} (NAV: ₹${res.data.nav}).`, 
          color: 'warning' 
        })
      }
      calculateUnits()
    }
  } catch (err: any) {
    toast.add({ title: 'Error fetching NAV', description: 'Could not fetch NAV for chosen date. Please enter manually.', color: 'warning' })
  }
}

watch(() => txForm.transaction_date, () => {
  if (txForm.scheme_code) {
    fetchNavForSelectedDate()
  }
})

// ─── Dynamic Input Calculations ─────────────────────────────────────────────

const calculateUnits = () => {
  if (txForm.amount && txForm.nav) {
    txForm.units = parseFloat((txForm.amount / txForm.nav).toFixed(4))
  } else {
    txForm.units = null
  }
}

const calculateAmount = () => {
  if (txForm.units && txForm.nav) {
    txForm.amount = parseFloat((txForm.units * txForm.nav).toFixed(2))
  } else {
    txForm.amount = null
  }
}

// ─── CRUD Actions ───────────────────────────────────────────────────────────

const openNewTransaction = (type: 'BUY' | 'REDEEM' = 'BUY', code: number | null = null, name = '') => {
  txForm.transaction_type = type
  txForm.scheme_code = code
  txForm.scheme_name = name
  txForm.amount = null
  txForm.nav = null
  txForm.units = null
  txForm.transaction_date = (new Date().toISOString().split('T')[0]) || ''
  txForm.sip_id = null
  txForm.notes = ''
  searchQuery.value = ''
  searchResults.value = []
  
  if (code) {
    fetchNavForSelectedDate()
  }
  isTransactionModalOpen.value = true
}

const openNewSip = () => {
  editingSipId.value = null
  sipForm.scheme_code = null
  sipForm.scheme_name = ''
  sipForm.amount = null
  sipForm.frequency = 'MONTHLY'
  sipForm.sip_day = 5
  sipForm.start_date = (new Date().toISOString().split('T')[0]) || ''
  sipForm.end_date = ''
  searchQuery.value = ''
  searchResults.value = []
  isSipModalOpen.value = true
}

const openEditSip = (sip: any) => {
  editingSipId.value = sip.id
  sipForm.scheme_code = sip.scheme_code
  sipForm.scheme_name = sip.scheme_name
  sipForm.amount = parseFloat(sip.amount)
  sipForm.frequency = sip.frequency
  sipForm.sip_day = parseInt(sip.sip_day)
  // Format start_date to YYYY-MM-DD
  sipForm.start_date = (new Date(sip.start_date).toISOString().split('T')[0]) || ''
  sipForm.end_date = sip.end_date ? ((new Date(sip.end_date).toISOString().split('T')[0]) || '') : ''
  searchQuery.value = ''
  searchResults.value = []
  isSipModalOpen.value = true
}

const submitTransaction = async () => {
  if (!txForm.scheme_code || !txForm.amount || !txForm.nav) {
    toast.add({ title: 'Validation Error', description: 'Please fill in all required fields.', color: 'error' })
    return
  }

  if (txForm.transaction_type === 'REDEEM') {
    const heldUnits = holdingsMap.value[txForm.scheme_code] || 0
    const redeemUnits = txForm.units || 0
    if (redeemUnits > heldUnits) {
      toast.add({ 
        title: 'Insufficient Units', 
        description: `Cannot redeem ${redeemUnits} units. You only hold ${heldUnits} units.`, 
        color: 'error' 
      })
      return
    }
  }

  saving.value = true
  try {
    const res = await api.post('/mutual-funds/transactions', {
      scheme_code: txForm.scheme_code,
      transaction_type: txForm.transaction_type,
      transaction_date: txForm.transaction_date,
      amount: txForm.amount,
      nav: txForm.nav,
      sip_id: txForm.sip_id,
      notes: txForm.notes
    })
    if (res.success) {
      toast.add({ title: 'Success', description: 'Transaction recorded successfully', color: 'success' })
      isTransactionModalOpen.value = false
      await fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const deleteTransaction = async (id: string) => {
  if (!confirm('Are you sure you want to delete this transaction? This will alter your portfolio valuation.')) return
  try {
    const res = await api.delete(`/mutual-funds/transactions/${id}`)
    if (res.success) {
      toast.add({ title: 'Success', description: 'Transaction deleted', color: 'success' })
      await fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const submitSip = async () => {
  if (!sipForm.scheme_code || !sipForm.amount || !sipForm.start_date) {
    toast.add({ title: 'Validation Error', description: 'Please fill in all required fields.', color: 'error' })
    return
  }

  saving.value = true
  try {
    const payload = {
      scheme_code: sipForm.scheme_code,
      amount: sipForm.amount,
      frequency: sipForm.frequency,
      sip_day: parseInt(String(sipForm.sip_day)) || 1,
      start_date: sipForm.start_date,
      end_date: sipForm.end_date || null
    }

    let res
    if (editingSipId.value) {
      res = await api.put(`/mutual-funds/sips/${editingSipId.value}`, payload)
    } else {
      res = await api.post('/mutual-funds/sips', payload)
    }

    if (res.success) {
      toast.add({ 
        title: 'Success', 
        description: editingSipId.value ? 'SIP instructions updated' : 'SIP Setup complete', 
        color: 'success' 
      })
      isSipModalOpen.value = false
      await fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const toggleSipStatus = async (id: string, currentStatus: string) => {
  const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
  try {
    const res = await api.put(`/mutual-funds/sips/${id}/status`, { status: nextStatus })
    if (res.success) {
      toast.add({ title: 'SIP Updated', description: `SIP is now ${nextStatus.toLowerCase()}`, color: 'success' })
      await fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const cancelSip = async (id: string) => {
  if (!confirm('Are you sure you want to cancel this SIP? Future installments will not be generated.')) return
  try {
    const res = await api.put(`/mutual-funds/sips/${id}/status`, { status: 'CANCELLED' })
    if (res.success) {
      toast.add({ title: 'SIP Cancelled', description: 'SIP cancelled successfully', color: 'success' })
      await fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const deleteSip = async (id: string) => {
  if (!confirm('Delete this SIP record entirely? Existing logged transactions will not be deleted.')) return
  try {
    const res = await api.delete(`/mutual-funds/sips/${id}`)
    if (res.success) {
      toast.add({ title: 'SIP Deleted', description: 'SIP record deleted', color: 'success' })
      await fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

// ─── Missed SIP Action Triggers ─────────────────────────────────────────────

const handleTriggerSip = async (sipId: string, dateLabel: string) => {
  processingSipId.value = sipId
  try {
    const res = await api.post(`/mutual-funds/sips/${sipId}/trigger`, {})
    if (res.success) {
      toast.add({ 
        title: 'Installment Recorded', 
        description: `Successfully logged BUY transaction for installment due on ${dateLabel}.`, 
        color: 'success' 
      })
      await fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Failed to trigger SIP', description: err.message, color: 'error' })
  } finally {
    processingSipId.value = null
  }
}

const handleSkipSip = async (sipId: string, dateLabel: string) => {
  processingSipId.value = sipId
  try {
    const res = await api.post(`/mutual-funds/sips/${sipId}/skip`, {})
    if (res.success) {
      toast.add({ 
        title: 'Installment Skipped', 
        description: `Installment due on ${dateLabel} was skipped. Next run updated.`, 
        color: 'success' 
      })
      await fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Failed to skip SIP', description: err.message, color: 'error' })
  } finally {
    processingSipId.value = null
  }
}

// ─── Charts Drawing ─────────────────────────────────────────────────────────

const destroyCharts = () => {
  if (doughnutChart) {
    doughnutChart.destroy()
    doughnutChart = null
  }
  if (barChart) {
    barChart.destroy()
    barChart = null
  }
}

const renderCharts = () => {
  destroyCharts()
  if (!portfolioData.value) return

  // 1. Doughnut Allocation Chart
  const allocData = portfolioData.value.allocationChart || []
  const doughnutCtx = document.getElementById('allocationChart') as HTMLCanvasElement
  if (doughnutCtx && allocData.length > 0) {
    doughnutChart = new Chart(doughnutCtx, {
      type: 'doughnut',
      data: {
        labels: allocData.map((d: any) => d.name),
        datasets: [{
          data: allocData.map((d: any) => d.value),
          backgroundColor: [
            '#4f46e5', // Indigo 600
            '#8b5cf6', // Violet 500
            '#06b6d4', // Cyan 500
            '#10b981', // Emerald 500
            '#f59e0b', // Amber 500
            '#ef4444'  // Red 500
          ],
          borderWidth: 1,
          borderColor: 'transparent'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { weight: 'bold', size: 11 },
              color: '#475569'
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const val = context.raw as number
                return ` ₹${val.toLocaleString()}`
              }
            }
          }
        }
      }
    })
  }

  // 2. Bar Chart Cost vs Value
  const holdings = portfolioData.value.holdings || []
  const barCtx = document.getElementById('growthChart') as HTMLCanvasElement
  if (barCtx && holdings.length > 0) {
    barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: holdings.map((h: any) => h.scheme_name.length > 20 ? h.scheme_name.substring(0, 18) + '...' : h.scheme_name),
        datasets: [
          {
            label: 'Invested Cost',
            data: holdings.map((h: any) => h.invested_amount),
            backgroundColor: '#818cf8', // Indigo 400
            borderRadius: 6
          },
          {
            label: 'Current Value',
            data: holdings.map((h: any) => h.current_value),
            backgroundColor: '#34d399', // Emerald 400
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { weight: 'bold' } }
          }
        }
      }
    })
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const overdueSips = computed(() => {
  return sipsList.value.filter(s => s.is_overdue)
})

const formatCurrency = (val: number) => {
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getSipDayLabel = (sip: any) => {
  if (sip.frequency === 'DAILY') return 'Every day'
  if (sip.frequency === 'WEEKLY') {
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[parseInt(sip.sip_day)] || `Day ${sip.sip_day}`
  }
  return `Day ${sip.sip_day} of month`
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header banner with premium gradients -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent_40%)]"></div>
      <div class="relative z-10">
        <h1 class="text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <UIcon name="i-heroicons-chart-bar-solid" class="w-8 h-8 text-indigo-400" />
          Mutual Fund Portfolio
        </h1>
        <p class="text-slate-400 text-sm mt-1">Manage, analyze, and automate your personal mutual fund investments.</p>
      </div>
      <div class="relative z-10 flex gap-2">
        <UButton icon="i-heroicons-plus-circle" label="Log Transaction" @click="openNewTransaction('BUY')" color="primary" />
        <UButton icon="i-heroicons-arrow-path" label="Setup SIP" @click="openNewSip" variant="outline" color="neutral" class="bg-slate-900 text-slate-100 hover:bg-slate-800" />
      </div>
    </div>

    <!-- Tab Navigation bar (glassmorphic theme) -->
    <div class="flex border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-1.5 rounded-2xl max-w-md shadow-sm">
      <button 
        @click="activeTab = 'overview'" 
        class="flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-200"
        :class="[activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']"
      >
        Overview
      </button>
      <button 
        @click="activeTab = 'transactions'" 
        class="flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-200"
        :class="[activeTab === 'transactions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']"
      >
        Transactions
      </button>
      <button 
        @click="activeTab = 'sips'" 
        class="flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-200"
        :class="[activeTab === 'sips' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']"
      >
        SIP Planner
      </button>
    </div>

    <!-- Alert Panel for Overdue / Missed SIPs -->
    <div v-if="overdueSips.length > 0" class="p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-3xl shadow-sm relative overflow-hidden animate-pulse">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
        </div>
        <div>
          <h3 class="font-black text-slate-800 dark:text-slate-200 text-base">Overdue SIP Installments</h3>
          <p class="text-xs text-slate-500 mt-0.5">We detected scheduled SIP payments that haven't been logged yet. Review and choose action:</p>
        </div>
      </div>
      <div class="space-y-3">
        <div v-for="sip in overdueSips" :key="sip.id" class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200/30 dark:border-slate-800/30 rounded-2xl">
          <div class="min-w-0">
            <p class="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{{ sip.scheme_name }}</p>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
              <span>SIP Amount: <strong class="text-indigo-600 dark:text-indigo-400">{{ formatCurrency(sip.amount) }}</strong></span>
              <span>•</span>
              <span>Due Date: <strong class="text-amber-600">{{ formatDate(sip.next_installment_date) }}</strong></span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton 
              size="xs" 
              color="success" 
              label="Log Transaction" 
              icon="i-heroicons-check-circle"
              :loading="processingSipId === sip.id" 
              @click="handleTriggerSip(sip.id, formatDate(sip.next_installment_date))" 
            />
            <UButton 
              size="xs" 
              variant="outline" 
              color="neutral" 
              label="Skip" 
              icon="i-heroicons-x-mark"
              :disabled="processingSipId === sip.id"
              @click="handleSkipSip(sip.id, formatDate(sip.next_installment_date))" 
            />
          </div>
        </div>
      </div>
    </div>

    <!-- LOADING INDICATOR -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-4">
      <svg class="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm text-slate-500 font-bold tracking-widest uppercase">Valuing Portfolio...</span>
    </div>

    <!-- OVERVIEW TAB CONTENT -->
    <div v-else-if="activeTab === 'overview'" class="space-y-8">
      <!-- Explore Schemes & NAVs Search Card -->
      <UCard 
        class="relative z-10 bg-gradient-to-br from-indigo-950/40 via-slate-900/40 to-indigo-950/20 border border-indigo-500/10 backdrop-blur-xl"
        :ui="{ root: 'overflow-visible', body: 'overflow-visible' }"
      >
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.08),transparent_50%)] rounded-[inherit]"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="max-w-md">
            <h3 class="text-lg font-black text-white flex items-center gap-2">
              <UIcon name="i-heroicons-magnifying-glass-circle-solid" class="w-6 h-6 text-indigo-400" />
              Explore Schemes & NAVs
            </h3>
            <p class="text-xs text-slate-400 mt-1">Search any mutual fund in India to inspect its historical performance, category info, and latest valuation.</p>
          </div>
          
          <!-- Search input with autocomplete -->
          <div class="w-full md:w-80 relative" ref="explorerContainer">
            <UInput 
              v-model="explorerQuery" 
              placeholder="Search schemes..." 
              @input="handleExplorerSearch"
              icon="i-heroicons-magnifying-glass"
              class="w-full"
            >
              <template #trailing>
                <UIcon v-if="explorerLoading" name="i-heroicons-arrow-path" class="animate-spin text-slate-400 w-4 h-4" />
              </template>
            </UInput>
            
            <!-- Explorer Search Results Dropdown -->
            <div 
              v-if="explorerResults.length > 0" 
              class="absolute left-0 right-0 top-full mt-2 border border-indigo-500/30 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-800 bg-[#0b0f19]"
              style="background-color: #0b0f19 !important;"
            >
              <button 
                v-for="res in explorerResults" 
                :key="res.schemeCode"
                type="button"
                @click="openSchemeExplorer(res.schemeCode)"
                class="w-full text-left py-3 px-4 hover:bg-indigo-950/50 text-xs font-bold text-slate-300 hover:text-white flex justify-between items-center transition-colors duration-150"
              >
                <span class="truncate pr-4 text-xs">{{ res.schemeName }}</span>
                <span class="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 flex-shrink-0">{{ res.schemeCode }}</span>
              </button>
            </div>
          </div>
        </div>
      </UCard>
      
      <!-- Metrics Summaries Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <UIcon name="i-heroicons-banknotes" class="w-6 h-6" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invested</p>
              <p class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                {{ formatCurrency(portfolioData?.summary.total_invested || 0) }}
              </p>
            </div>
          </div>
        </UCard>
        
        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <UIcon name="i-heroicons-presentation-chart-line" class="w-6 h-6" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Value</p>
              <p class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                {{ formatCurrency(portfolioData?.summary.total_current_value || 0) }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div 
              class="p-3 rounded-2xl" 
              :class="[(portfolioData?.summary.overall_gain >= 0) ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600']"
            >
              <UIcon :name="(portfolioData?.summary.overall_gain >= 0) ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'" class="w-6 h-6" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Returns</p>
              <p 
                class="text-2xl font-black mt-0.5 flex items-baseline gap-1.5"
                :class="[(portfolioData?.summary.overall_gain >= 0) ? 'text-emerald-600' : 'text-red-600']"
              >
                {{ formatCurrency(portfolioData?.summary.overall_gain || 0) }}
                <span class="text-xs font-black">
                  ({{ (portfolioData?.summary.overall_gain >= 0 ? '+' : '') + (portfolioData?.summary.overall_return_pct || 0) }}%)
                </span>
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <UIcon name="i-heroicons-bolt" class="w-6 h-6" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Annualized Return (XIRR)</p>
              <p 
                class="text-2xl font-black mt-0.5"
                :class="[(portfolioData?.summary.portfolio_xirr >= 0) ? 'text-emerald-600' : 'text-red-600']"
              >
                {{ (portfolioData?.summary.portfolio_xirr >= 0 ? '+' : '') + (portfolioData?.summary.portfolio_xirr || 0) }}%
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Charts Layout -->
      <div v-if="portfolioData?.holdings && portfolioData.holdings.length > 0" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Asset Allocation Doughnut -->
        <UCard class="lg:col-span-1">
          <template #header>
            <h3 class="font-black text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase">Asset Category Allocation</h3>
          </template>
          <div class="h-64 relative flex items-center justify-center">
            <canvas id="allocationChart"></canvas>
          </div>
        </UCard>

        <!-- Fund Growth Bar Chart -->
        <UCard class="lg:col-span-2">
          <template #header>
            <h3 class="font-black text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase">Invested Cost vs. Current Value</h3>
          </template>
          <div class="h-64 relative">
            <canvas id="growthChart"></canvas>
          </div>
        </UCard>
      </div>

      <!-- Holdings List -->
      <UCard>
        <template #header>
          <h3 class="font-black text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase">Holdings Breakdown</h3>
        </template>

        <div v-if="portfolioData?.holdings && portfolioData.holdings.length > 0" class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-900/50">
                <th class="py-3 px-4">Fund Name</th>
                <th class="py-3 px-4">Category</th>
                <th class="py-3 px-4 text-right">Units</th>
                <th class="py-3 px-4 text-right">Avg Purchase Price</th>
                <th class="py-3 px-4 text-right">Latest NAV</th>
                <th class="py-3 px-4 text-right">Invested Value</th>
                <th class="py-3 px-4 text-right">Current Value</th>
                <th class="py-3 px-4 text-right">P&L (Abs Return)</th>
                <th class="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="h in portfolioData.holdings" :key="h.scheme_code" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-sm transition-colors duration-150">
                <td class="py-4 px-4 font-bold text-slate-800 dark:text-slate-200 max-w-xs truncate" :title="h.scheme_name">
                  {{ h.scheme_name }}
                </td>
                <td class="py-4 px-4 text-slate-500">
                  <UBadge variant="subtle" color="primary">{{ h.scheme_category }}</UBadge>
                </td>
                <td class="py-4 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
                  {{ parseFloat(h.total_units).toFixed(4) }}
                </td>
                <td class="py-4 px-4 text-right text-slate-600 dark:text-slate-400">
                  {{ formatCurrency(h.avg_purchase_price) }}
                </td>
                <td class="py-4 px-4 text-right text-slate-800 dark:text-slate-200 font-medium">
                  {{ formatCurrency(h.last_nav) }}
                  <span class="block text-[10px] text-slate-400 font-normal mt-0.5">As of {{ formatDate(h.last_nav_date) }}</span>
                </td>
                <td class="py-4 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                  {{ formatCurrency(h.invested_amount) }}
                </td>
                <td class="py-4 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                  {{ formatCurrency(h.current_value) }}
                </td>
                <td class="py-4 px-4 text-right font-bold" :class="[h.total_gain >= 0 ? 'text-emerald-600' : 'text-red-600']">
                  {{ formatCurrency(h.total_gain) }}
                  <span class="block text-xs font-medium mt-0.5">({{ h.total_gain >= 0 ? '+' : '' }}{{ h.return_pct }}%)</span>
                </td>
                <td class="py-4 px-4 text-center">
                  <div class="flex justify-center gap-1.5">
                    <UButton size="xs" color="primary" variant="subtle" icon="i-heroicons-plus" title="Buy More" @click="openNewTransaction('BUY', h.scheme_code, h.scheme_name)" />
                    <UButton size="xs" color="error" variant="subtle" icon="i-heroicons-minus" title="Redeem" @click="openNewTransaction('REDEEM', h.scheme_code, h.scheme_name)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center py-16 text-slate-500">
          <UIcon name="i-heroicons-presentation-chart-line" class="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p class="font-bold">No assets found in portfolio</p>
          <p class="text-xs text-slate-400 mt-1">Log a transaction or start a SIP to visualize your holdings here.</p>
          <UButton label="Log First Transaction" color="primary" class="mt-4" @click="openNewTransaction('BUY')" />
        </div>
      </UCard>
    </div>

    <!-- TRANSACTIONS TAB CONTENT -->
    <div v-else-if="activeTab === 'transactions'" class="space-y-6">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-black text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase">Transaction Ledger</h3>
            <UButton icon="i-heroicons-plus" label="Log Transaction" size="sm" @click="openNewTransaction('BUY')" />
          </div>
        </template>

        <div v-if="transactionsList.length > 0" class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-900/50">
                <th class="py-3 px-4">Transaction Date</th>
                <th class="py-3 px-4">Fund Name</th>
                <th class="py-3 px-4">Type</th>
                <th class="py-3 px-4 text-right">Amount</th>
                <th class="py-3 px-4 text-right">NAV</th>
                <th class="py-3 px-4 text-right">Units</th>
                <th class="py-3 px-4">Notes</th>
                <th class="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="t in transactionsList" :key="t.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-sm transition-colors duration-150">
                <td class="py-4 px-4 text-slate-600 dark:text-slate-300">
                  {{ formatDate(t.transaction_date) }}
                </td>
                <td class="py-4 px-4 font-bold text-slate-800 dark:text-slate-200 max-w-xs truncate" :title="t.scheme_name">
                  {{ t.scheme_name }}
                </td>
                <td class="py-4 px-4">
                  <UBadge :color="t.transaction_type === 'BUY' ? 'success' : 'error'" variant="subtle" class="font-bold">
                    {{ t.transaction_type }}
                  </UBadge>
                </td>
                <td class="py-4 px-4 text-right font-bold text-slate-800 dark:text-slate-100">
                  {{ formatCurrency(t.amount) }}
                </td>
                <td class="py-4 px-4 text-right text-slate-600 dark:text-slate-400">
                  ₹{{ parseFloat(t.nav).toFixed(4) }}
                </td>
                <td class="py-4 px-4 text-right text-slate-600 dark:text-slate-300 font-medium">
                  {{ parseFloat(t.units).toFixed(4) }}
                </td>
                <td class="py-4 px-4 text-slate-500 text-xs italic max-w-xs truncate" :title="t.notes">
                  {{ t.notes || '-' }}
                </td>
                <td class="py-4 px-4 text-center">
                  <UButton size="xs" color="error" variant="ghost" icon="i-heroicons-trash" @click="deleteTransaction(t.id)" title="Delete transaction" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center py-20 text-slate-500">
          <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p class="font-bold">No transactions logged</p>
          <p class="text-xs text-slate-400 mt-1">Add transactions manually or trigger your active SIPs to fill your ledger.</p>
        </div>
      </UCard>
    </div>

    <!-- SIPS TAB CONTENT -->
    <div v-else-if="activeTab === 'sips'" class="space-y-6">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-black text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase">Systematic Investment Instructions</h3>
            <UButton icon="i-heroicons-plus" label="Setup SIP" size="sm" @click="openNewSip" />
          </div>
        </template>

        <div v-if="sipsList.length > 0" class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-900/50">
                <th class="py-3 px-4">Fund Name</th>
                <th class="py-3 px-4 text-right">Amount</th>
                <th class="py-3 px-4">Frequency</th>
                <th class="py-3 px-4">Preferred Day</th>
                <th class="py-3 px-4">Start Date</th>
                <th class="py-3 px-4">Next installment Date</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="s in sipsList" :key="s.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-sm transition-colors duration-150">
                <td class="py-4 px-4 font-bold text-slate-800 dark:text-slate-200 max-w-xs truncate" :title="s.scheme_name">
                  {{ s.scheme_name }}
                </td>
                <td class="py-4 px-4 text-right font-bold text-slate-800 dark:text-slate-100">
                  {{ formatCurrency(s.amount) }}
                </td>
                <td class="py-4 px-4">
                  <UBadge variant="subtle" color="neutral">{{ s.frequency }}</UBadge>
                </td>
                <td class="py-4 px-4 text-slate-600 dark:text-slate-400">
                  {{ getSipDayLabel(s) }}
                </td>
                <td class="py-4 px-4 text-slate-600 dark:text-slate-400">
                  {{ formatDate(s.start_date) }}
                </td>
                <td class="py-4 px-4 font-semibold" :class="[s.is_overdue ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200']">
                  {{ formatDate(s.next_installment_date) }}
                  <span v-if="s.is_overdue" class="block text-[10px] text-amber-500 font-bold uppercase mt-0.5">Overdue / Missed</span>
                </td>
                <td class="py-4 px-4">
                  <UBadge :color="s.status === 'ACTIVE' ? 'success' : s.status === 'PAUSED' ? 'warning' : 'neutral'" variant="subtle" class="font-bold">
                    {{ s.status }}
                  </UBadge>
                </td>
                <td class="py-4 px-4">
                  <div class="flex justify-center gap-1">
                    <UButton 
                      v-if="s.status === 'ACTIVE'" 
                      size="xs" 
                      variant="ghost" 
                      color="warning" 
                      icon="i-heroicons-pause" 
                      title="Pause SIP" 
                      @click="toggleSipStatus(s.id, s.status)" 
                    />
                    <UButton 
                      v-if="s.status === 'PAUSED'" 
                      size="xs" 
                      variant="ghost" 
                      color="success" 
                      icon="i-heroicons-play" 
                      title="Resume SIP" 
                      @click="toggleSipStatus(s.id, s.status)" 
                    />
                    <UButton 
                      v-if="s.status !== 'CANCELLED'" 
                      size="xs" 
                      variant="ghost" 
                      color="neutral" 
                      icon="i-heroicons-stop" 
                      title="Cancel SIP" 
                      @click="cancelSip(s.id)" 
                    />
                    <UButton 
                      size="xs" 
                      variant="ghost" 
                      color="neutral" 
                      icon="i-heroicons-pencil-square" 
                      title="Edit SIP" 
                      @click="openEditSip(s)" 
                    />
                    <UButton 
                      size="xs" 
                      variant="ghost" 
                      color="error" 
                      icon="i-heroicons-trash" 
                      title="Delete SIP" 
                      @click="deleteSip(s.id)" 
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center py-20 text-slate-500">
          <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p class="font-bold">No SIP setups configured</p>
          <p class="text-xs text-slate-400 mt-1">Automate your investments. Add systematic instructions to keep track of installments.</p>
        </div>
      </UCard>
    </div>

    <!-- TRANSACTION MODAL -->
    <UModal 
      v-model:open="isTransactionModalOpen" 
      :title="txForm.transaction_type === 'BUY' ? 'Log Purchase' : 'Log Redemption'"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <form @submit.prevent="submitTransaction" class="space-y-4 px-4 py-2">
          <!-- Fund Search & Selection -->
          <UFormField label="Search & Select Mutual Fund" required class="w-full">
            <div class="relative w-full">
              <UInput 
                v-model="searchQuery" 
                placeholder="e.g. HDFC Small Cap" 
                @input="handleFundSearch"
                :disabled="!!txForm.scheme_code"
                class="w-full"
              >
                <template #trailing>
                  <UIcon v-if="searchLoading" name="i-heroicons-arrow-path" class="animate-spin text-slate-400 w-4 h-4" />
                </template>
              </UInput>
              
              <!-- Search Autocomplete Dropdown -->
              <div v-if="searchResults.length > 0" class="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                <button 
                  v-for="res in searchResults" 
                  :key="res.schemeCode"
                  type="button"
                  @click="selectFund(res)"
                  class="w-full text-left py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between"
                >
                  <span class="truncate pr-2">{{ res.schemeName }}</span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ res.schemeCode }}</span>
                </button>
              </div>
            </div>
            
            <!-- Selection Box -->
            <div v-if="txForm.scheme_code" class="mt-2 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl">
              <div class="min-w-0">
                <p class="text-xs font-black truncate text-slate-800 dark:text-slate-200">{{ txForm.scheme_name }}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">Scheme Code: {{ txForm.scheme_code }}</p>
              </div>
              <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="txForm.scheme_code = null; txForm.scheme_name = ''; txForm.nav = null; txForm.units = null" />
            </div>
          </UFormField>

          <!-- Date Selector -->
          <UFormField label="Transaction Date" required class="w-full">
            <UInput v-model="txForm.transaction_date" type="date" required class="w-full" />
          </UFormField>

          <!-- NAV Input -->
          <UFormField label="Net Asset Value (NAV)" required class="w-full">
            <template #description>
              NAV auto-retrieves for the chosen date. Enter manually if offline.
            </template>
            <UInput 
              v-model="txForm.nav" 
              type="number" 
              step="0.0001" 
              required 
              placeholder="e.g. 154.20" 
              @input="calculateUnits"
              class="w-full"
            />
          </UFormField>

          <!-- Input Grid for Amount / Units -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Transaction Amount (₹)" required class="w-full">
              <UInput 
                v-model="txForm.amount" 
                type="number" 
                step="0.01" 
                required 
                placeholder="e.g. 5000" 
                @input="calculateUnits"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Calculated Units" required class="w-full">
              <UInput 
                v-model="txForm.units" 
                type="number" 
                step="0.0001" 
                required 
                placeholder="Units calculated" 
                @input="calculateAmount"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Notes -->
          <UFormField label="Transaction Notes" class="w-full">
            <UInput v-model="txForm.notes" placeholder="e.g. Lumpsum investment, Tax Saver" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" label="Cancel" @click="isTransactionModalOpen = false" />
            <UButton type="submit" label="Save Transaction" :loading="saving" />
          </div>
        </form>
      </template>
    </UModal>

    <!-- SIP MODAL -->
    <UModal 
      v-model:open="isSipModalOpen" 
      :title="editingSipId ? 'Edit Systematic Investment' : 'Setup Systematic Investment'"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <form @submit.prevent="submitSip" class="space-y-4 px-4 py-2">
          <!-- Fund Search & Selection -->
          <UFormField label="Search & Select Mutual Fund" required class="w-full">
            <div class="relative w-full">
              <UInput 
                v-model="searchQuery" 
                placeholder="e.g. Mirae Asset Large Cap" 
                @input="handleFundSearch"
                :disabled="!!sipForm.scheme_code"
                class="w-full"
              >
                <template #trailing>
                  <UIcon v-if="searchLoading" name="i-heroicons-arrow-path" class="animate-spin text-slate-400 w-4 h-4" />
                </template>
              </UInput>
              
              <!-- Autocomplete dropdown -->
              <div v-if="searchResults.length > 0" class="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                <button 
                  v-for="res in searchResults" 
                  :key="res.schemeCode"
                  type="button"
                  @click="selectFund(res, true)"
                  class="w-full text-left py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between"
                >
                  <span class="truncate pr-2">{{ res.schemeName }}</span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ res.schemeCode }}</span>
                </button>
              </div>
            </div>
            
            <!-- Selection Box -->
            <div v-if="sipForm.scheme_code" class="mt-2 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl">
              <div class="min-w-0">
                <p class="text-xs font-black truncate text-slate-800 dark:text-slate-200">{{ sipForm.scheme_name }}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">Scheme Code: {{ sipForm.scheme_code }}</p>
              </div>
              <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="sipForm.scheme_code = null; sipForm.scheme_name = ''" />
            </div>
          </UFormField>

          <!-- SIP Amount -->
          <UFormField label="SIP Installment Amount (₹)" required class="w-full">
            <UInput v-model="sipForm.amount" type="number" step="0.01" required placeholder="e.g. 5000" class="w-full" />
          </UFormField>

          <!-- Frequency Selector -->
          <UFormField label="SIP Installment Frequency" required class="w-full">
            <USelect 
              v-model="sipForm.frequency" 
              :items="[
                { label: 'Daily', value: 'DAILY' },
                { label: 'Weekly', value: 'WEEKLY' },
                { label: 'Monthly', value: 'MONTHLY' },
                { label: 'Quarterly', value: 'QUARTERLY' }
              ]"
              class="w-full"
            />
          </UFormField>

          <!-- Preferred Day Selector -->
          <UFormField 
            v-if="sipForm.frequency !== 'DAILY'"
            :label="sipForm.frequency === 'WEEKLY' ? 'Preferred Weekday' : 'Preferred Day of Month (1 - 28)'" 
            required 
            class="w-full"
          >
            <USelect 
              v-if="sipForm.frequency === 'WEEKLY'"
              v-model="sipForm.sip_day" 
              :items="[
                { label: 'Monday', value: 1 },
                { label: 'Tuesday', value: 2 },
                { label: 'Wednesday', value: 3 },
                { label: 'Thursday', value: 4 },
                { label: 'Friday', value: 5 },
                { label: 'Saturday', value: 6 },
                { label: 'Sunday', value: 7 }
              ]"
              class="w-full"
            />
            <UInput 
              v-else
              v-model="sipForm.sip_day" 
              type="number" 
              :min="1" 
              :max="28" 
              required 
              class="w-full" 
            />
          </UFormField>

          <!-- Dates Selection -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Start Date" required class="w-full">
              <UInput v-model="sipForm.start_date" type="date" required class="w-full" />
            </UFormField>

            <UFormField label="End Date (Optional)" class="w-full">
              <UInput v-model="sipForm.end_date" type="date" class="w-full" />
            </UFormField>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" label="Cancel" @click="isSipModalOpen = false" />
            <UButton type="submit" :label="editingSipId ? 'Save Changes' : 'Start SIP'" :loading="saving" />
          </div>
        </form>
      </template>
    </UModal>

    <!-- SCHEME EXPLORER MODAL -->
    <UModal 
      v-model:open="isExplorerModalOpen" 
      title="Scheme Explorer"
      :ui="{ content: 'sm:max-w-2xl' }"
    >
      <template #body>
        <div v-if="explorerDetailsLoading" class="flex flex-col items-center justify-center py-20 gap-4">
          <svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-xs text-slate-400 font-bold uppercase tracking-widest">Fetching Historical NAVs...</span>
        </div>
        
        <div v-else-if="explorerSchemeData" class="space-y-6 px-4 py-2">
          <!-- Scheme Title & Core Info -->
          <div>
            <div class="flex flex-wrap gap-2 items-center">
              <UBadge variant="subtle" color="primary">{{ explorerSchemeData.meta.scheme_category }}</UBadge>
              <UBadge variant="subtle" color="neutral">{{ explorerSchemeData.meta.scheme_type }}</UBadge>
            </div>
            <h2 class="text-xl font-black text-slate-800 dark:text-slate-100 mt-2 leading-snug animate-fade-in">
              {{ explorerSchemeData.meta.scheme_name }}
            </h2>
            <p class="text-xs text-slate-500 mt-1">Fund House: {{ explorerSchemeData.meta.fund_house }}</p>
          </div>

          <!-- Highlight Cards: Latest NAV, ISINs -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl shadow-sm">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Latest NAV</span>
              <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                ₹{{ parseFloat(explorerSchemeData.data[0]?.nav || '0').toFixed(4) }}
              </span>
              <span class="text-[10px] text-slate-400 block mt-0.5">As of {{ formatDate(parseMfapiDate(explorerSchemeData.data[0]?.date)) }}</span>
            </div>
            
            <div class="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ISIN (Growth)</span>
              <span class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 block font-mono truncate" :title="explorerSchemeData.meta.isin_growth || 'N/A'">
                {{ explorerSchemeData.meta.isin_growth || 'N/A' }}
              </span>
            </div>

            <div class="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ISIN (Div Reinv)</span>
              <span class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 block font-mono truncate" :title="explorerSchemeData.meta.isin_div_reinvestment || 'N/A'">
                {{ explorerSchemeData.meta.isin_div_reinvestment || 'N/A' }}
              </span>
            </div>
          </div>

          <!-- Historical NAV Chart -->
          <div class="space-y-2">
            <h3 class="text-xs font-black text-slate-500 uppercase tracking-wider">1-Year NAV History Performance</h3>
            <div class="h-64 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/50 relative">
              <canvas id="explorerChart"></canvas>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div class="text-[10px] text-slate-400 flex items-center">
              Scheme Code: {{ explorerSchemeData.meta.scheme_code }}
            </div>
            <div class="flex gap-2">
              <UButton variant="ghost" label="Close" @click="isExplorerModalOpen = false" />
              <UButton icon="i-heroicons-plus-circle" label="Invest Lumpsum" color="primary" @click="explorerInvestLumpsum" />
              <UButton icon="i-heroicons-arrow-path" label="Setup SIP" color="primary" variant="outline" class="bg-slate-900 text-slate-100 hover:bg-slate-800 border-none" @click="explorerSetupSip" />
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
