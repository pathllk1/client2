<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch, onUnmounted } from 'vue'
import { useApi } from '@/utils/api'
import { useToast } from '@nuxt/ui/composables'
import FirmForm from '@/components/admin/FirmForm.vue'
import * as XLSX from 'xlsx'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const api = useApi()
const toast = useToast()

const getCellValue = (rowOriginal: any, key: string): any => {
  return rowOriginal?.[key];
}

const getRowOriginal = (row: any): any => {
  return row?.original || {};
}

const activeTab = ref(0)
const firms = ref<any[]>([])
const users = ref<any[]>([])
const loading = ref(false)

const items = [
  { label: 'Firms Management', icon: 'i-heroicons-building-office-2', slot: 'firms' },
  { label: 'User Directory', icon: 'i-heroicons-user-group', slot: 'users' },
  { label: 'Security Logs', icon: 'i-heroicons-shield-check', slot: 'logs' },
  { label: 'System Metrics', icon: 'i-heroicons-cpu-chip', slot: 'metrics' },
  { label: 'Postgres Console', icon: 'i-heroicons-circle-stack', slot: 'postgres' },
  { label: 'MongoDB Console', icon: 'i-heroicons-server', slot: 'mongodb' },
  { label: 'System Settings', icon: 'i-heroicons-cog-6-tooth', slot: 'settings' }
]

const stats = ref([
  { label: 'Total Firms', value: '0', icon: 'i-heroicons-building-office-2' },
  { label: 'Total Users', value: '0', icon: 'i-heroicons-user-group' },
  { label: 'System Health', value: 'Healthy', icon: 'i-heroicons-heart', color: 'success' },
])

// PostgreSQL Console State
const pgTables = ref<string[]>([])
const selectedTable = ref('')
const tableData = ref<any[]>([])
const tableTotal = ref(0)
const tableColumns = ref<any[]>([])
const pgLoading = ref(false)
const limit = ref(25)
const skip = ref(0)
const pgSearchQuery = ref('')

const pgQueryMode = ref(false)
const pgCustomQuery = ref('SELECT * FROM "User" LIMIT 10;')
const pgQueryResult = ref<any[]>([])
const pgQueryColumns = ref<any[]>([])
const pgQueryLoading = ref(false)
const pgQueryTime = ref('')
const pgQueryError = ref('')
const selectedPgTemplate = ref('')

const pgTemplates = [
  { label: 'Select SQL Template...', value: 'all' },
  { label: 'Get All Users', value: 'SELECT * FROM "User" LIMIT 10;' },
  { label: 'Count Users by Role', value: 'SELECT COUNT(*), role FROM "User" GROUP BY role;' },
  { label: 'Get All Firms', value: 'SELECT * FROM "Firm" LIMIT 10;' },
  { label: 'Get Cash Registers', value: 'SELECT * FROM cash_registers LIMIT 10;' },
  { label: 'Count Expenses by Category', value: 'SELECT category_id, COUNT(*), SUM(amount) FROM user_expenses GROUP BY category_id;' }
]

// MongoDB Console State
const mongoCollections = ref<string[]>([])
const selectedCollection = ref('')
const collectionData = ref<any[]>([])
const collectionTotal = ref(0)
const collectionColumns = ref<any[]>([])
const mongoLoading = ref(false)
const mongoLimit = ref(25)
const mongoSkip = ref(0)
const mongoSearchQuery = ref('')

const mongoQueryMode = ref(false)
const mongoCustomQuery = ref('{\n  "action": "find",\n  "filter": {}\n}')
const mongoQueryResult = ref<any[]>([])
const mongoQueryColumns = ref<any[]>([])
const mongoQueryLoading = ref(false)
const mongoQueryTime = ref('')
const mongoQueryError = ref('')
const selectedMongoTemplate = ref('')

const mongoTemplates = [
  { label: 'Select JSON Template...', value: 'all' },
  { label: 'Find All Documents', value: '{\n  "action": "find",\n  "filter": {}\n}' },
  { label: 'Count Documents', value: '{\n  "action": "countDocuments",\n  "filter": {}\n}' },
  { label: 'Find Active Sessions', value: '{\n  "action": "find",\n  "filter": { "isActive": true },\n  "options": { "limit": 10 }\n}' },
  { label: 'Get Collection Stats', value: '{\n  "action": "stats"\n}' }
]

// Security Logs State
const securityLogs = ref<any[]>([])
const logsTotal = ref(0)
const logsLoading = ref(false)
const logsLimit = ref(25)
const logsSkip = ref(0)
const selectedSeverity = ref('all')
const selectedAction = ref('all')
const logsSearchQuery = ref('')

// System Metrics State
const systemMetrics = ref<any>(null)
const metricsLoading = ref(false)
const autoRefreshMetrics = ref(false)
let metricsInterval: any = null

const severityOptions = [
  { label: 'All Severities', value: 'all' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' }
]

const actionOptions = [
  { label: 'All Actions', value: 'all' },
  { label: 'Login Success', value: 'login_success' },
  { label: 'Login Failed', value: 'login_failed' },
  { label: 'Logout', value: 'logout' },
  { label: 'Password Change', value: 'password_change' },
  { label: 'Suspicious Activity', value: 'suspicious_activity' },
  { label: 'Anomaly Detected', value: 'anomaly_detected' }
]

// System Settings / Configurations
const systemConfig = reactive({
  maintenanceMode: false,
  allowNewSignups: true,
  rateLimitStrictness: 'normal',
  systemAlertMessage: ''
})
const configLoading = ref(false)
const configSaving = ref(false)
const processContext = ref<any>(null)
const envSearchQuery = ref('')

// Charts references
const memoryHistory = ref<any[]>([])
let chartInstance: any = null
let logsChartInstance: any = null

const updateChart = () => {
  const ctx = document.getElementById('memoryChart') as HTMLCanvasElement
  if (!ctx || !systemMetrics.value) return

  const timeLabel = new Date().toLocaleTimeString(undefined, { hour12: false })
  const heapUsed = systemMetrics.value.memory.process.heapUsed / (1024 * 1024)
  const rss = systemMetrics.value.memory.process.rss / (1024 * 1024)

  if (memoryHistory.value.length === 0 || memoryHistory.value[memoryHistory.value.length - 1].timeLabel !== timeLabel) {
    memoryHistory.value.push({ timeLabel, heapUsed, rss })
    if (memoryHistory.value.length > 15) {
      memoryHistory.value.shift()
    }
  }

  if (chartInstance) {
    chartInstance.data.labels = memoryHistory.value.map(h => h.timeLabel)
    chartInstance.data.datasets[0].data = memoryHistory.value.map(h => h.heapUsed)
    chartInstance.data.datasets[1].data = memoryHistory.value.map(h => h.rss)
    chartInstance.update('none')
  } else {
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: memoryHistory.value.map(h => h.timeLabel),
        datasets: [
          {
            label: 'V8 Heap Used (MB)',
            data: memoryHistory.value.map(h => h.heapUsed),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            tension: 0.25,
            fill: true
          },
          {
            label: 'Process RSS (MB)',
            data: memoryHistory.value.map(h => h.rss),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.05)',
            tension: 0.25,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          y: { ticks: { font: { size: 9 } } }
        }
      }
    })
  }
}

const updateLogsChart = () => {
  const ctx = document.getElementById('logsChart') as HTMLCanvasElement
  if (!ctx) return

  const counts = { low: 0, medium: 0, high: 0, critical: 0 }
  securityLogs.value.forEach(log => {
    const sev = (log.severity || 'low').toLowerCase()
    if (sev in counts) {
      counts[sev as keyof typeof counts]++
    }
  })

  const data = [counts.low, counts.medium, counts.high, counts.critical]

  if (logsChartInstance) {
    logsChartInstance.data.datasets[0].data = data
    logsChartInstance.update()
  } else {
    logsChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Low', 'Medium', 'High', 'Critical'],
        datasets: [{
          data,
          backgroundColor: ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
        }
      }
    })
  }
}

// Watch tab switching to trigger chart layouts
watch(activeTab, (val) => {
  if (val === 3) {
    setTimeout(updateChart, 80)
  } else if (val === 2) {
    setTimeout(updateLogsChart, 80)
  }
})

// Fetch PostgreSQL list & content
const fetchPgTables = async () => {
  pgLoading.value = true
  try {
    const res = await api.get('/pg/database/tables')
    if (res.success) {
      pgTables.value = res.tables
      if (res.tables.length > 0 && !selectedTable.value) {
        selectedTable.value = res.tables[0]
      }
      if (selectedTable.value) {
        await fetchTableData(selectedTable.value)
      }
    }
  } catch (err: any) {
    toast.add({ title: 'Postgres DB Connection Offline', description: err.message, color: 'error' })
  } finally {
    pgLoading.value = false
  }
}

const fetchTableData = async (table: string) => {
  if (!table) return
  pgLoading.value = true
  try {
    const res = await api.get(`/pg/database/${table}?limit=${limit.value}&skip=${skip.value}`)
    if (res.success) {
      tableData.value = res.data
      tableTotal.value = res.total
      if (res.data.length > 0) {
        tableColumns.value = Object.keys(res.data[0]).map(key => ({
          accessorKey: key,
          header: key
        }))
      } else {
        tableColumns.value = []
      }
    }
  } catch (err: any) {
    toast.add({ title: 'Failed to fetch table data', description: err.message, color: 'error' })
  } finally {
    pgLoading.value = false
  }
}

// Run custom PG query
const runPgCustomQuery = async () => {
  pgQueryLoading.value = true
  pgQueryError.value = ''
  try {
    const res = await api.post('/pg/database/query', { query: pgCustomQuery.value })
    if (res.success) {
      pgQueryResult.value = res.data
      pgQueryTime.value = res.executionTimeMs
      if (res.data.length > 0) {
        pgQueryColumns.value = Object.keys(res.data[0]).map(key => ({
          accessorKey: key,
          header: key
        }))
      } else {
        pgQueryColumns.value = []
      }
      toast.add({ title: 'Success', description: `Executed SQL query in ${res.executionTimeMs}ms`, color: 'success' })
    }
  } catch (err: any) {
    pgQueryError.value = err.message
    pgQueryResult.value = []
    pgQueryColumns.value = []
  } finally {
    pgQueryLoading.value = false
  }
}

// Fetch MongoDB list & content
const fetchMongoCollections = async () => {
  mongoLoading.value = true
  try {
    const res = await api.get('/mongo/database/collections')
    if (res.success) {
      mongoCollections.value = res.collections
      if (res.collections.length > 0 && !selectedCollection.value) {
        selectedCollection.value = res.collections[0]
      }
      if (selectedCollection.value) {
        await fetchCollectionData(selectedCollection.value)
      }
    }
  } catch (err: any) {
    toast.add({ title: 'MongoDB Connection Offline', description: err.message, color: 'error' })
  } finally {
    mongoLoading.value = false
  }
}

const fetchCollectionData = async (coll: string) => {
  if (!coll) return
  mongoLoading.value = true
  try {
    const res = await api.get(`/mongo/database/${coll}?limit=${mongoLimit.value}&skip=${mongoSkip.value}`)
    if (res.success) {
      collectionData.value = res.data
      collectionTotal.value = res.total
      if (res.data.length > 0) {
        collectionColumns.value = Object.keys(res.data[0]).map(key => ({
          accessorKey: key,
          header: key
        }))
      } else {
        collectionColumns.value = []
      }
    }
  } catch (err: any) {
    toast.add({ title: 'Failed to fetch collection data', description: err.message, color: 'error' })
  } finally {
    mongoLoading.value = false
  }
}

// Run custom Mongo query
const runMongoCustomQuery = async () => {
  mongoQueryLoading.value = true
  mongoQueryError.value = ''
  try {
    let parsedBody: any
    try {
      parsedBody = JSON.parse(mongoCustomQuery.value)
    } catch (e: any) {
      throw new Error('Invalid JSON format: ' + e.message)
    }

    const res = await api.post('/mongo/database/query', {
      collection: selectedCollection.value,
      ...parsedBody
    })

    if (res.success) {
      const data = Array.isArray(res.data) ? res.data : [res.data]
      mongoQueryResult.value = data
      mongoQueryTime.value = res.executionTimeMs
      if (data.length > 0 && data[0]) {
        mongoQueryColumns.value = Object.keys(data[0]).map(key => ({
          accessorKey: key,
          header: key
        }))
      } else {
        mongoQueryColumns.value = []
      }
      toast.add({ title: 'Success', description: `Executed MongoDB command in ${res.executionTimeMs}ms`, color: 'success' })
    }
  } catch (err: any) {
    mongoQueryError.value = err.message
    mongoQueryResult.value = []
    mongoQueryColumns.value = []
  } finally {
    mongoQueryLoading.value = false
  }
}

// Fetch Security Logs
const fetchSecurityLogs = async () => {
  logsLoading.value = true
  try {
    let url = `/auth/security-logs-admin?limit=${logsLimit.value}&skip=${logsSkip.value}`
    if (selectedSeverity.value && selectedSeverity.value !== 'all') url += `&severity=${selectedSeverity.value}`
    if (selectedAction.value && selectedAction.value !== 'all') url += `&action=${selectedAction.value}`
    
    const res = await api.get(url)
    if (res.success) {
      securityLogs.value = res.data
      logsTotal.value = res.total
      setTimeout(updateLogsChart, 80)
    }
  } catch (err: any) {
    toast.add({ title: 'Failed to fetch security logs', description: err.message, color: 'error' })
  } finally {
    logsLoading.value = false
  }
}

// Fetch System Metrics
const fetchSystemMetrics = async () => {
  metricsLoading.value = true
  try {
    const res = await api.get('/pg/database/metrics')
    if (res.success) {
      systemMetrics.value = res.metrics
      const hasError = res.metrics.databases.postgres.status === 'error' || res.metrics.databases.mongodb.status === 'error'
      stats.value[2]!.value = hasError ? 'Issue' : 'Healthy'
      stats.value[2]!.color = hasError ? 'error' : 'success'
      setTimeout(updateChart, 80)
    }
  } catch (err: any) {
    toast.add({ title: 'Failed to fetch metrics', description: err.message, color: 'error' })
  } finally {
    metricsLoading.value = false
  }
}

// Handle Auto-Refresh Toggle
const toggleAutoRefresh = () => {
  if (autoRefreshMetrics.value) {
    metricsInterval = setInterval(fetchSystemMetrics, 5000)
  } else if (metricsInterval) {
    clearInterval(metricsInterval)
    metricsInterval = null
  }
}

onUnmounted(() => {
  if (metricsInterval) clearInterval(metricsInterval)
})

// System Config Features
const fetchSystemConfig = async () => {
  configLoading.value = true
  try {
    const res = await api.get('/pg/database/system-config')
    if (res.success) {
      Object.assign(systemConfig, res.config)
    }
  } catch (err: any) {
    toast.add({ title: 'Failed to load system configs', description: err.message, color: 'error' })
  } finally {
    configLoading.value = false
  }
}

const saveConfigKey = async (key: string, value: any) => {
  configSaving.value = true
  try {
    const res = await api.post('/pg/database/system-config/update', { key, value })
    if (res.success) {
      toast.add({ title: 'Configuration Saved', description: `Parameter '${key}' updated successfully.`, color: 'success' })
    }
  } catch (err: any) {
    toast.add({ title: 'Save Failed', description: err.message, color: 'error' })
  } finally {
    configSaving.value = false
  }
}

const fetchEnvConfig = async () => {
  try {
    const res = await api.get('/pg/database/config')
    if (res.success) {
      processContext.value = res.process
    }
  } catch (err: any) {
    console.error('Failed to retrieve environment configs:', err)
  }
}

// Exports
const exportDatabaseData = async (type: 'pg' | 'mongo', format: string) => {
  const isQueryMode = type === 'pg' ? pgQueryMode.value : mongoQueryMode.value
  const filename = `${type}_export_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`
  const body: any = { format }
  
  if (type === 'pg') {
    if (isQueryMode) {
      body.query = pgCustomQuery.value
    } else {
      body.table = selectedTable.value
    }
  } else {
    body.collection = selectedCollection.value
    if (isQueryMode) {
      try {
        const parsed = JSON.parse(mongoCustomQuery.value)
        body.action = parsed.action || 'find'
        body.filter = parsed.filter || {}
        body.update = parsed.update || {}
        body.options = parsed.options || {}
        body.pipeline = parsed.pipeline || []
      } catch (e: any) {
        toast.add({ title: 'Invalid JSON', description: 'Could not parse Mongo query JSON: ' + e.message, color: 'error' })
        return
      }
    } else {
      body.action = 'find'
      body.filter = {}
    }
  }

  try {
    const endpoint = `/${type}/database/export`
    await api.download(endpoint, filename, 'POST', body)
    toast.add({ title: 'Export Successful', description: `Data exported as ${format.toUpperCase()}`, color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Export Failed', description: err.message, color: 'error' })
  }
}

const exportLogs = (format: string) => {
  const dataToExport = securityLogs.value.map(log => ({
    Timestamp: formatFullDateTime(log.timestamp),
    Action: log.action,
    Severity: log.severity,
    'User Name': log.userId?.name || 'System',
    'User Email': log.userId?.email || log.email || '-',
    'IP Address': log.ipAddress || '-',
    Location: log.location ? `${log.location.city || ''}, ${log.location.country || ''}` : '-',
    Details: log.metadata ? JSON.stringify(log.metadata) : ''
  }))

  if (format === 'json') {
    const jsonStr = JSON.stringify(dataToExport, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Security_Audit_Logs_${Date.now()}.json`
    link.click()
    window.URL.revokeObjectURL(url)
    toast.add({ title: 'Export Successful', description: 'Logs exported to JSON', color: 'success' })
  } else if (format === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Security Audit Logs')
    XLSX.writeFile(workbook, `Security_Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.add({ title: 'Export Successful', description: 'Logs exported to Excel', color: 'success' })
  }
}

const pgExportMenuItems = computed(() => [[
  { label: 'Export to Excel (.xlsx)', icon: 'i-heroicons-document-arrow-down', onSelect: () => exportDatabaseData('pg', 'excel') },
  { label: 'Export to JSON (.json)', icon: 'i-heroicons-document-arrow-down', onSelect: () => exportDatabaseData('pg', 'json') }
]])

const mongoExportMenuItems = computed(() => [[
  { label: 'Export to JSON (.json)', icon: 'i-heroicons-document-arrow-down', onSelect: () => exportDatabaseData('mongo', 'json') },
  { label: 'Export to Excel (.xlsx)', icon: 'i-heroicons-document-arrow-down', onSelect: () => exportDatabaseData('mongo', 'excel') },
  { label: 'Export to BSON (.bson)', icon: 'i-heroicons-document-arrow-down', onSelect: () => exportDatabaseData('mongo', 'bson') }
]])

const logsExportMenuItems = computed(() => [[
  { label: 'Export to Excel (.xlsx)', icon: 'i-heroicons-document-arrow-down', onSelect: () => exportLogs('excel') },
  { label: 'Export to JSON (.json)', icon: 'i-heroicons-document-arrow-down', onSelect: () => exportLogs('json') }
]])

// Client-side searches
const filteredTableData = computed(() => {
  if (!pgSearchQuery.value.trim()) return tableData.value
  const query = pgSearchQuery.value.trim().toLowerCase()
  return tableData.value.filter(row => {
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(query)
    )
  })
})

const filteredCollectionData = computed(() => {
  if (!mongoSearchQuery.value.trim()) return collectionData.value
  const query = mongoSearchQuery.value.trim().toLowerCase()
  return collectionData.value.filter(row => {
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(query)
    )
  })
})

const filteredSecurityLogs = computed(() => {
  if (!logsSearchQuery.value.trim()) return securityLogs.value
  const query = logsSearchQuery.value.trim().toLowerCase()
  return securityLogs.value.filter(log => {
    const userField = log.userId ? `${log.userId.name} ${log.userId.email}` : log.email || ''
    return (
      String(log.action).toLowerCase().includes(query) ||
      String(log.ipAddress).toLowerCase().includes(query) ||
      String(userField).toLowerCase().includes(query) ||
      String(log.severity).toLowerCase().includes(query)
    )
  })
})

const filteredEnv = computed(() => {
  if (!processContext.value?.env) return {}
  const query = envSearchQuery.value.trim().toLowerCase()
  if (!query) return processContext.value.env
  
  const res: Record<string, string> = {}
  for (const [key, val] of Object.entries(processContext.value.env)) {
    if (key.toLowerCase().includes(query) || String(val).toLowerCase().includes(query)) {
      res[key] = String(val)
    }
  }
  return res
})

// Pagination navigation
const handlePgPrev = () => {
  if (skip.value > 0) {
    skip.value = Math.max(0, skip.value - limit.value)
    fetchTableData(selectedTable.value)
  }
}

const handlePgNext = () => {
  if (skip.value + limit.value < tableTotal.value) {
    skip.value += limit.value
    fetchTableData(selectedTable.value)
  }
}

const handleMongoPrev = () => {
  if (mongoSkip.value > 0) {
    mongoSkip.value = Math.max(0, mongoSkip.value - mongoLimit.value)
    fetchCollectionData(selectedCollection.value)
  }
}

const handleMongoNext = () => {
  if (mongoSkip.value + mongoLimit.value < collectionTotal.value) {
    mongoSkip.value += mongoLimit.value
    fetchCollectionData(selectedCollection.value)
  }
}

const handleLogsPrev = () => {
  if (logsSkip.value > 0) {
    logsSkip.value = Math.max(0, logsSkip.value - logsLimit.value)
    fetchSecurityLogs()
  }
}

const handleLogsNext = () => {
  if (logsSkip.value + logsLimit.value < logsTotal.value) {
    logsSkip.value += logsLimit.value
    fetchSecurityLogs()
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const [firmsRes, usersRes] = await Promise.all([
      api.get('/firms/admin'),
      api.get('/auth/users')
    ])

    if (firmsRes.success) {
      firms.value = firmsRes.data
      stats.value[0]!.value = firmsRes.data.length.toString()
    }
    
    if (usersRes.success) {
      users.value = usersRes.data
      stats.value[1]!.value = usersRes.data.length.toString()
    }

    await Promise.all([
      fetchPgTables(),
      fetchMongoCollections(),
      fetchSecurityLogs(),
      fetchSystemMetrics(),
      fetchSystemConfig(),
      fetchEnvConfig()
    ])
  } catch (err: any) {
    toast.add({ title: 'System Error', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// Firm Modal Logic
const isFirmModalOpen = ref(false)
const selectedFirm = ref<any>(null)

const openFirmModal = (firm: any = null) => {
  selectedFirm.value = firm
  isFirmModalOpen.value = true
}

const deleteFirm = async (id: string) => {
  if (confirm('Are you sure you want to permanently delete this firm? This action cannot be undone and will fail if users are linked.')) {
    try {
      const res = await api.delete(`/firms/admin/${id}`)
      if (res.success) {
        toast.add({ title: 'Deleted', description: res.message, color: 'success' })
        fetchData()
      }
    } catch (err: any) {
      toast.add({ title: 'Delete Failed', description: err.message, color: 'error' })
    }
  }
}

const formatDate = (date: string) => new Date(date).toLocaleDateString()

const firmColumns = [
  { accessorKey: 'name', header: 'Firm Name' },
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'email', header: 'Official Email' },
  { accessorKey: 'phone_number', header: 'Contact' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

const userColumns = [
  { accessorKey: 'name', header: 'Full Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'System Role' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'createdAt', header: 'Joined' },
  { id: 'actions', header: 'Actions' }
]

const logColumns = [
  { accessorKey: 'timestamp', header: 'Timestamp' },
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'userId', header: 'User' },
  { accessorKey: 'ipAddress', header: 'IP Address' },
  { accessorKey: 'location', header: 'Location' },
  { accessorKey: 'severity', header: 'Severity' },
  { accessorKey: 'metadata', header: 'Details' }
]

const formatFullDateTime = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// User Modal Logic
const isUserModalOpen = ref(false)
const selectedUser = ref<any>(null)
const savingUser = ref(false)

const userForm = reactive({
  name: '',
  email: '',
  role: 'standard',
  status: 'active',
  password: ''
})

const roleOptions = [
  { label: 'SuperAdmin', value: 'superadmin' },
  { label: 'Owner', value: 'Owner' },
  { label: 'Admin', value: 'Admin' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Staff', value: 'Staff' }
]

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Pending Approval', value: 'pending' },
  { label: 'Suspended', value: 'suspended' }
]

const getUserRoleDisplay = (user: any) => {
  if (user.role === 'superadmin') return 'SuperAdmin'
  if (user.firms && user.firms.length > 0) {
    return user.firms[0].grade
  }
  return 'Staff'
}

const openUserModal = (user: any) => {
  selectedUser.value = user
  userForm.name = user.name
  userForm.email = user.email
  userForm.role = user.role === 'superadmin' ? 'superadmin' : (user.firms && user.firms.length > 0 ? user.firms[0].grade : 'Staff')
  userForm.status = user.status || 'active'
  userForm.password = ''
  isUserModalOpen.value = true
}

const onUserSubmit = async () => {
  savingUser.value = true
  try {
    const res = await api.put(`/auth/users/${selectedUser.value._id}/status`, userForm)
    if (res.success) {
      toast.add({ title: 'User Updated', description: 'User role/status/password updated successfully', color: 'success' })
      isUserModalOpen.value = false
      fetchData()
    }
  } catch (err: any) {
    toast.add({ title: 'Update Failed', description: err.message, color: 'error' })
  } finally {
    savingUser.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col space-y-6 overflow-hidden p-1">
    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase italic">SuperAdmin Console</h1>
        <p class="text-xs text-gray-500 font-medium tracking-widest mt-1">Enterprise Infrastructure Management</p>
      </div>
      <UButton icon="i-heroicons-plus" label="Register New Firm" size="lg" @click="openFirmModal()" />
    </div>

    <!-- System Stats -->
    <div class="grid grid-cols-3 gap-4 shrink-0">
      <div v-for="stat in stats" :key="stat.label" 
           class="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm flex items-center gap-4">
        <div class="p-3 rounded-lg bg-primary-500/10">
          <UIcon :name="stat.icon" class="w-6 h-6 text-primary" />
        </div>
        <div>
          <p class="text-[10px] text-gray-400 uppercase font-black tracking-widest">{{ stat.label }}</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white leading-none mt-1">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <UTabs v-model="activeTab" :items="items" class="flex-1 min-h-0 flex flex-col" :ui="{ list: 'shrink-0' }">
      <template #firms>
        <UCard class="flex-1 min-h-0 flex flex-col border-none shadow-none" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col' }">
          <div class="flex-1 overflow-auto">
            <UTable :data="firms" :columns="firmColumns" :loading="loading" class="w-full text-sm">
              <template #name-cell="{ row }">
                <div class="font-bold text-gray-900 dark:text-white">{{ row.original.name }}</div>
              </template>

              <template #status-cell="{ row }">
                <UBadge :color="row.original.status === 'approved' ? 'success' : 'warning'" variant="subtle" size="sm" class="uppercase font-black text-[10px]">
                  {{ row.original.status }}
                </UBadge>
              </template>

              <template #actions-cell="{ row }">
                <div class="flex items-center gap-1">
                  <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openFirmModal(row.original)" />
                  <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="deleteFirm(row.original._id)" />
                </div>
              </template>
            </UTable>
          </div>
        </UCard>
      </template>

      <template #users>
        <UCard class="flex-1 min-h-0 flex flex-col border-none shadow-none" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col' }">
          <div class="flex-1 overflow-auto">
            <UTable :data="users" :columns="userColumns" :loading="loading" class="w-full text-sm">
              <template #role-cell="{ row }">
                <UBadge :color="row.original.role === 'superadmin' ? 'primary' : 'neutral'" variant="subtle" size="sm" class="uppercase font-black text-[10px]">
                  {{ getUserRoleDisplay(row.original) }}
                </UBadge>
              </template>

              <template #status-cell="{ row }">
                <UBadge :color="row.original.status === 'active' ? 'success' : row.original.status === 'pending' ? 'warning' : 'error'" variant="subtle" size="sm" class="uppercase font-black text-[10px]">
                  {{ row.original.status || 'active' }}
                </UBadge>
              </template>

              <template #createdAt-cell="{ row }">
                <span class="text-xs text-gray-500">{{ formatDate(row.original.createdAt) }}</span>
              </template>

              <template #actions-cell="{ row }">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openUserModal(row.original)" />
              </template>
            </UTable>
          </div>
        </UCard>
      </template>

      <template #postgres>
        <UCard class="flex-1 min-h-0 flex flex-col border-none shadow-none" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col gap-4' }">
          <div class="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl shrink-0">
            <span class="text-xs font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Mode:</span>
            <UButton 
              :label="pgQueryMode ? 'Custom SQL console' : 'View Tables'"
              color="neutral" 
              variant="subtle" 
              size="xs" 
              icon="i-heroicons-arrows-right-left"
              @click="pgQueryMode = !pgQueryMode"
            />
            
            <template v-if="!pgQueryMode">
              <span class="text-xs font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Table:</span>
              <USelect 
                v-model="selectedTable" 
                :items="pgTables" 
                class="w-64 bg-white dark:bg-zinc-800" 
                @change="skip = 0; fetchTableData(selectedTable)"
              />
              <UInput 
                v-model="pgSearchQuery" 
                placeholder="Search table rows..." 
                icon="i-heroicons-magnifying-glass"
                size="sm" 
                class="w-64"
              />
            </template>
            <template v-else>
              <span class="text-xs font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Templates:</span>
              <USelect 
                v-model="selectedPgTemplate" 
                :items="pgTemplates" 
                class="w-80 bg-white dark:bg-zinc-800" 
                placeholder="Select SQL Template..."
                @change="pgCustomQuery = selectedPgTemplate; selectedPgTemplate = ''"
              />
            </template>
            
            <UButton 
              icon="i-heroicons-arrow-path" 
              color="neutral" 
              variant="outline" 
              size="sm" 
              @click="pgQueryMode ? runPgCustomQuery() : fetchTableData(selectedTable)" 
              :loading="pgLoading || pgQueryLoading"
            />

            <UDropdownMenu :items="pgExportMenuItems">
              <UButton label="Export" icon="i-heroicons-arrow-down-tray" color="success" size="sm" />
            </UDropdownMenu>
            
            <UBadge v-if="!pgQueryMode" color="primary" variant="subtle" size="sm" class="ml-auto uppercase font-black text-[10px]">
              {{ tableTotal }} Records
            </UBadge>
            <UBadge v-else color="primary" variant="subtle" size="sm" class="ml-auto uppercase font-black text-[10px] font-mono">
              {{ pgQueryResult.length }} Rows | {{ pgQueryTime || '0' }} ms
            </UBadge>
          </div>

          <!-- Raw Query Console View -->
          <div v-if="pgQueryMode" class="flex flex-col space-y-4 px-4 py-2 shrink-0">
            <textarea 
              v-model="pgCustomQuery" 
              class="w-full h-32 p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Write raw PostgreSQL SQL here..."
            ></textarea>
            <div class="flex items-center justify-between">
              <span v-if="pgQueryError" class="text-xs text-red-500 font-medium">Error: {{ pgQueryError }}</span>
              <span v-else class="text-xs text-slate-400">Press Refresh icon or Run button to execute.</span>
              <UButton label="Execute Query" icon="i-heroicons-play" color="primary" size="md" @click="runPgCustomQuery" :loading="pgQueryLoading" />
            </div>
          </div>

          <div class="flex-1 overflow-auto pg-console-table">
            <UTable 
              :data="pgQueryMode ? pgQueryResult : filteredTableData" 
              :columns="pgQueryMode ? pgQueryColumns : tableColumns" 
              :loading="pgLoading || pgQueryLoading" 
              class="w-full text-xs font-mono"
            >
              <template #empty-state>
                <div class="py-12 text-center text-gray-500 italic">No records found inside PostgreSQL console.</div>
              </template>
              <template v-for="col in (pgQueryMode ? pgQueryColumns : tableColumns)" :key="col.accessorKey" #[col.accessorKey+'-cell']="{ row }">
                <span class="block truncate max-w-[180px] text-slate-700 dark:text-slate-300" :title="String(getCellValue(getRowOriginal(row), col.accessorKey) ?? '')">
                  {{ getCellValue(getRowOriginal(row), col.accessorKey) }}
                </span>
              </template>
            </UTable>
          </div>

          <div v-if="!pgQueryMode" class="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 rounded-xl shrink-0">
            <span class="text-xs text-gray-500 font-semibold">
              Showing {{ skip + 1 }} to {{ Math.min(skip + limit, tableTotal) }} of {{ tableTotal }} entries
            </span>
            <div class="flex items-center gap-2">
              <UButton 
                label="Previous" 
                size="xs" 
                color="neutral" 
                variant="outline" 
                :disabled="skip === 0" 
                @click="handlePgPrev" 
              />
              <UButton 
                label="Next" 
                size="xs" 
                color="neutral" 
                variant="outline" 
                :disabled="skip + limit >= tableTotal" 
                @click="handlePgNext" 
              />
            </div>
          </div>
        </UCard>
      </template>

      <template #mongodb>
        <UCard class="flex-1 min-h-0 flex flex-col border-none shadow-none" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col gap-4' }">
          <div class="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl shrink-0">
            <span class="text-xs font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Mode:</span>
            <UButton 
              :label="mongoQueryMode ? 'Custom JSON Console' : 'View Collections'"
              color="neutral" 
              variant="subtle" 
              size="xs" 
              icon="i-heroicons-arrows-right-left"
              @click="mongoQueryMode = !mongoQueryMode"
            />

            <span class="text-xs font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Collection:</span>
            <USelect 
              v-model="selectedCollection" 
              :items="mongoCollections" 
              class="w-64 bg-white dark:bg-zinc-800" 
              @change="mongoSkip = 0; mongoQueryMode ? runMongoCustomQuery() : fetchCollectionData(selectedCollection)"
            />

            <template v-if="!mongoQueryMode">
              <UInput 
                v-model="mongoSearchQuery" 
                placeholder="Search documents..." 
                icon="i-heroicons-magnifying-glass"
                size="sm" 
                class="w-64"
              />
            </template>
            <template v-else>
              <span class="text-xs font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Templates:</span>
              <USelect 
                v-model="selectedMongoTemplate" 
                :items="mongoTemplates" 
                class="w-72 bg-white dark:bg-zinc-800" 
                placeholder="Select JSON Template..."
                @change="mongoCustomQuery = selectedMongoTemplate; selectedMongoTemplate = ''"
              />
            </template>
            
            <UButton 
              icon="i-heroicons-arrow-path" 
              color="neutral" 
              variant="outline" 
              size="sm" 
              @click="mongoQueryMode ? runMongoCustomQuery() : fetchCollectionData(selectedCollection)" 
              :loading="mongoLoading || mongoQueryLoading"
            />

            <UDropdownMenu :items="mongoExportMenuItems">
              <UButton label="Export" icon="i-heroicons-arrow-down-tray" color="success" size="sm" />
            </UDropdownMenu>
            
            <UBadge v-if="!mongoQueryMode" color="primary" variant="subtle" size="sm" class="ml-auto uppercase font-black text-[10px]">
              {{ collectionTotal }} Documents
            </UBadge>
            <UBadge v-else color="primary" variant="subtle" size="sm" class="ml-auto uppercase font-black text-[10px] font-mono">
              {{ mongoQueryResult.length }} Docs | {{ mongoQueryTime || '0' }} ms
            </UBadge>
          </div>

          <!-- Raw Query JSON Editor -->
          <div v-if="mongoQueryMode" class="flex flex-col space-y-4 px-4 py-2 shrink-0">
            <textarea 
              v-model="mongoCustomQuery" 
              class="w-full h-32 p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Write Mongo command JSON parameters here..."
            ></textarea>
            <div class="flex items-center justify-between">
              <span v-if="mongoQueryError" class="text-xs text-red-500 font-medium">Error: {{ mongoQueryError }}</span>
              <span v-else class="text-xs text-slate-400">Available actions: find, aggregate, countDocuments, stats, updateOne, insertOne.</span>
              <UButton label="Run Command" icon="i-heroicons-play" color="primary" size="md" @click="runMongoCustomQuery" :loading="mongoQueryLoading" />
            </div>
          </div>

          <div class="flex-1 overflow-auto mongo-console-table">
            <UTable 
              :data="mongoQueryMode ? mongoQueryResult : filteredCollectionData" 
              :columns="mongoQueryMode ? mongoQueryColumns : collectionColumns" 
              :loading="mongoLoading || mongoQueryLoading" 
              class="w-full text-xs font-mono"
            >
              <template #empty-state>
                <div class="py-12 text-center text-gray-500 italic">No records found inside MongoDB console.</div>
              </template>
              <template v-for="col in (mongoQueryMode ? mongoQueryColumns : collectionColumns)" :key="col.accessorKey" #[col.accessorKey+'-cell']="{ row }">
                <span class="block truncate max-w-[180px] text-slate-750 dark:text-slate-350" :title="JSON.stringify(getCellValue(getRowOriginal(row), col.accessorKey))">
                  {{ typeof getCellValue(getRowOriginal(row), col.accessorKey) === 'object' && getCellValue(getRowOriginal(row), col.accessorKey) !== null ? JSON.stringify(getCellValue(getRowOriginal(row), col.accessorKey)) : getCellValue(getRowOriginal(row), col.accessorKey) }}
                </span>
              </template>
            </UTable>
          </div>

          <div v-if="!mongoQueryMode" class="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 rounded-xl shrink-0">
            <span class="text-xs text-gray-500 font-semibold">
              Showing {{ mongoSkip + 1 }} to {{ Math.min(mongoSkip + mongoLimit, collectionTotal) }} of {{ collectionTotal }} entries
            </span>
            <div class="flex items-center gap-2">
              <UButton 
                label="Previous" 
                size="xs" 
                color="neutral" 
                variant="outline" 
                :disabled="mongoSkip === 0" 
                @click="handleMongoPrev" 
              />
              <UButton 
                label="Next" 
                size="xs" 
                color="neutral" 
                variant="outline" 
                :disabled="mongoSkip + mongoLimit >= collectionTotal" 
                @click="handleMongoNext" 
              />
            </div>
          </div>
        </UCard>
      </template>

      <template #logs>
        <UCard class="flex-1 min-h-0 flex flex-col border-none shadow-none" :ui="{ body: 'flex-1 overflow-hidden p-0 flex flex-col gap-4' }">
          <div class="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl shrink-0">
            <span class="text-xs font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Severity:</span>
            <USelect 
              v-model="selectedSeverity" 
              :items="severityOptions" 
              class="w-44 bg-white dark:bg-zinc-800" 
              @change="logsSkip = 0; fetchSecurityLogs()"
            />
            <span class="text-xs font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Action:</span>
            <USelect 
              v-model="selectedAction" 
              :items="actionOptions" 
              class="w-52 bg-white dark:bg-zinc-800" 
              @change="logsSkip = 0; fetchSecurityLogs()"
            />
            <UInput 
              v-model="logsSearchQuery" 
              placeholder="Search logs..." 
              icon="i-heroicons-magnifying-glass"
              size="sm" 
              class="w-60"
            />
            <UButton 
              icon="i-heroicons-arrow-path" 
              color="neutral" 
              variant="outline" 
              size="sm" 
              @click="fetchSecurityLogs" 
              :loading="logsLoading"
            />

            <UDropdownMenu :items="logsExportMenuItems">
              <UButton label="Export Logs" icon="i-heroicons-arrow-down-tray" color="success" size="sm" />
            </UDropdownMenu>
            
            <UBadge color="primary" variant="subtle" size="sm" class="ml-auto uppercase font-black text-[10px]">
              {{ logsTotal }} Event Logs
            </UBadge>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 px-4 shrink-0">
            <div class="lg:col-span-3 overflow-auto max-h-[30vh]">
              <UTable :data="filteredSecurityLogs" :columns="logColumns" :loading="logsLoading" class="w-full text-xs">
                <template #empty-state>
                  <div class="py-12 text-center text-gray-500 italic">No security logs recorded.</div>
                </template>
                
                <template #timestamp-cell="{ row }">
                  <span class="font-mono text-gray-500">{{ formatFullDateTime(getRowOriginal(row).timestamp) }}</span>
                </template>
                
                <template #action-cell="{ row }">
                  <span class="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight text-[10px]">{{ getRowOriginal(row).action }}</span>
                </template>
                
                <template #userId-cell="{ row }">
                  <div v-if="getRowOriginal(row).userId" class="flex flex-col">
                    <span class="font-bold text-gray-900 dark:text-white">{{ getRowOriginal(row).userId.name }}</span>
                    <span class="text-[10px] text-gray-500">{{ getRowOriginal(row).userId.email }}</span>
                  </div>
                  <span v-else class="text-gray-500 font-mono">{{ getRowOriginal(row).email || 'system' }}</span>
                </template>
                
                <template #location-cell="{ row }">
                  <span v-if="getRowOriginal(row).location?.country">
                    {{ getRowOriginal(row).location.city || '' }}, {{ getRowOriginal(row).location.country }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </template>

                <template #severity-cell="{ row }">
                  <UBadge 
                    :color="getRowOriginal(row).severity === 'critical' ? 'error' : getRowOriginal(row).severity === 'high' ? 'warning' : getRowOriginal(row).severity === 'medium' ? 'primary' : 'neutral'"
                    variant="solid" 
                    size="xs" 
                    class="uppercase font-black text-[9px]"
                  >
                    {{ getRowOriginal(row).severity }}
                  </UBadge>
                </template>

                <template #metadata-cell="{ row }">
                  <span class="line-clamp-2 text-slate-500 font-mono text-[10px] cursor-help" :title="JSON.stringify(getRowOriginal(row).metadata || {})">
                    {{ getRowOriginal(row).metadata ? JSON.stringify(getRowOriginal(row).metadata) : '-' }}
                  </span>
                </template>
              </UTable>
            </div>
            <!-- Severity doughnut monitor chart -->
            <div class="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl flex flex-col justify-center items-center h-[30vh]">
              <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Severity Distribution</span>
              <div class="w-full h-full relative">
                <canvas id="logsChart"></canvas>
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 rounded-xl shrink-0">
            <span class="text-xs text-gray-500 font-semibold">
              Showing {{ logsSkip + 1 }} to {{ Math.min(logsSkip + logsLimit, logsTotal) }} of {{ logsTotal }} entries
            </span>
            <div class="flex items-center gap-2">
              <UButton 
                label="Previous" 
                size="xs" 
                color="neutral" 
                variant="outline" 
                :disabled="logsSkip === 0" 
                @click="handleLogsPrev" 
              />
              <UButton 
                label="Next" 
                size="xs" 
                color="neutral" 
                variant="outline" 
                :disabled="logsSkip + logsLimit >= logsTotal" 
                @click="handleLogsNext" 
              />
            </div>
          </div>
        </UCard>
      </template>

      <template #metrics>
        <UCard class="flex-1 min-h-0 flex flex-col border-none shadow-none overflow-y-auto" :ui="{ body: 'p-6 flex flex-col gap-6' }">
          <div class="flex items-center justify-between bg-slate-50 dark:bg-zinc-900 px-4 py-3 border border-slate-100 dark:border-zinc-800 rounded-xl shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black uppercase text-slate-400 tracking-wider">Metrics Monitoring</span>
              <UBadge :color="systemMetrics ? 'success' : 'neutral'" size="sm" class="uppercase text-[9px] font-black">
                {{ systemMetrics ? 'Active' : 'Offline' }}
              </UBadge>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="auto-refresh" 
                  v-model="autoRefreshMetrics" 
                  @change="toggleAutoRefresh"
                  class="rounded text-primary border-slate-300 dark:border-zinc-700 bg-transparent focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label for="auto-refresh" class="text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer">Auto-Refresh (5s)</label>
              </div>
              <UButton 
                icon="i-heroicons-arrow-path" 
                label="Manual Refresh" 
                size="sm" 
                variant="outline" 
                @click="fetchSystemMetrics" 
                :loading="metricsLoading" 
              />
            </div>
          </div>

          <div v-if="!systemMetrics" class="py-12 text-center text-gray-500 italic">
            Metrics not loaded. Press refresh to fetch.
          </div>

          <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
            <!-- CPU details -->
            <div class="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                <UIcon name="i-heroicons-cpu-chip" class="w-4 h-4 text-primary" />
                Server & Node.js Engine
              </h4>
              
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div class="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50">
                  <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Node Version</span>
                  <span class="font-bold text-gray-800 dark:text-white mt-1 block font-mono">{{ systemMetrics.nodeVersion }}</span>
                </div>
                <div class="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50">
                  <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Platform</span>
                  <span class="font-bold text-gray-800 dark:text-white mt-1 block capitalize font-mono">{{ systemMetrics.platform }} ({{ systemMetrics.arch }})</span>
                </div>
                <div class="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50">
                  <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 block">CPU Cores</span>
                  <span class="font-bold text-gray-800 dark:text-white mt-1 block font-mono">{{ systemMetrics.cpuCores }} Cores</span>
                </div>
                <div class="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50">
                  <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 block">System Uptime</span>
                  <span class="font-bold text-gray-800 dark:text-white mt-1 block font-mono">{{ Math.floor(systemMetrics.uptime / 60) }} mins</span>
                </div>
              </div>
              
              <div class="p-3.5 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50 text-xs">
                <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 block">CPU Model</span>
                <span class="font-bold text-gray-800 dark:text-white mt-1.5 block leading-tight font-mono">{{ systemMetrics.cpuModel }}</span>
              </div>
            </div>

            <!-- Memory Monitor Line Chart -->
            <div class="lg:col-span-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between h-[32vh]">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 text-emerald-500" />
                Live Node Engine Memory Monitor (MB)
              </h4>
              <div class="w-full h-full relative mt-2">
                <canvas id="memoryChart"></canvas>
              </div>
            </div>

            <!-- Memory details -->
            <div class="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                <UIcon name="i-heroicons-circle-stack" class="w-4 h-4 text-emerald-500" />
                Memory Consumption
              </h4>
              
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div class="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50">
                  <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Process Memory (RSS)</span>
                  <span class="font-bold text-gray-800 dark:text-white mt-1 block font-mono">{{ (systemMetrics.memory.process.rss / (1024 * 1024)).toFixed(1) }} MB</span>
                </div>
                <div class="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50">
                  <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 block">V8 Heap Used</span>
                  <span class="font-bold text-gray-800 dark:text-white mt-1 block font-mono">{{ (systemMetrics.memory.process.heapUsed / (1024 * 1024)).toFixed(1) }} MB</span>
                </div>
                <div class="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50">
                  <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 block">System Total</span>
                  <span class="font-bold text-gray-800 dark:text-white mt-1 block font-mono">{{ (systemMetrics.memory.system.total / (1024 * 1024 * 1024)).toFixed(1) }} GB</span>
                </div>
                <div class="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50">
                  <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 block">System Free</span>
                  <span class="font-bold text-gray-800 dark:text-white mt-1 block font-mono">{{ (systemMetrics.memory.system.free / (1024 * 1024 * 1024)).toFixed(1) }} GB</span>
                </div>
              </div>
              
              <div class="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-100/50 dark:border-zinc-800/50 space-y-2">
                <div class="flex justify-between text-[10px]">
                  <span class="font-black uppercase tracking-widest text-slate-400">Total System Memory Load</span>
                  <span class="font-black text-gray-855 dark:text-white">{{ ((systemMetrics.memory.system.used / systemMetrics.memory.system.total) * 100).toFixed(0) }}%</span>
                </div>
                <div class="w-full h-2 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-indigo-600 rounded-full" 
                    :style="{ width: `${((systemMetrics.memory.system.used / systemMetrics.memory.system.total) * 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Database size & connectivity -->
            <div class="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 lg:col-span-2 space-y-4">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                <UIcon name="i-heroicons-square-3-stack-3d" class="w-4 h-4 text-violet-500" />
                Enterprise Database Connectivity
              </h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-white dark:bg-zinc-950 border border-slate-100/50 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div 
                      class="p-2.5 rounded-lg flex items-center justify-center text-white"
                      :class="systemMetrics.databases.postgres.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'"
                    >
                      <UIcon name="i-heroicons-circle-stack" class="w-5 h-5" />
                    </div>
                    <div>
                      <span class="font-bold text-xs text-gray-950 dark:text-white block uppercase tracking-tight">PostgreSQL Database</span>
                      <span class="text-[10px] text-gray-500 block font-mono">Size: {{ systemMetrics.databases.postgres.size }}</span>
                    </div>
                  </div>
                  <UBadge 
                    :color="systemMetrics.databases.postgres.status === 'connected' ? 'success' : 'error'" 
                    size="sm" 
                    class="uppercase text-[9px] font-black"
                  >
                    {{ systemMetrics.databases.postgres.status }}
                  </UBadge>
                </div>
                
                <div class="p-4 bg-white dark:bg-zinc-950 border border-slate-100/50 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div 
                      class="p-2.5 rounded-lg flex items-center justify-center text-white"
                      :class="systemMetrics.databases.mongodb.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'"
                    >
                      <UIcon name="i-heroicons-server" class="w-5 h-5" />
                    </div>
                    <div>
                      <span class="font-bold text-xs text-gray-950 dark:text-white block uppercase tracking-tight">MongoDB Database</span>
                      <span class="text-[10px] text-gray-500 block font-mono">{{ systemMetrics.databases.mongodb.collectionsCount }} Collections · Size: {{ systemMetrics.databases.mongodb.size }}</span>
                    </div>
                  </div>
                  <UBadge 
                    :color="systemMetrics.databases.mongodb.status === 'connected' ? 'success' : 'error'" 
                    size="sm" 
                    class="uppercase text-[9px] font-black"
                  >
                    {{ systemMetrics.databases.mongodb.status }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </template>

      <!-- System Settings tab view -->
      <template #settings>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto p-1 h-full max-h-[70vh]">
          <!-- Feature Flags / Controls -->
          <div class="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 class="text-sm font-black uppercase text-gray-900 dark:text-white tracking-wider">Dynamic System Toggles</h3>
              <p class="text-[11px] text-gray-500 font-medium">Control global behavior of the enterprise ERP system instantly at runtime.</p>
            </div>
            
            <div class="space-y-4">
              <!-- Maintenance Mode -->
              <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100/50 dark:border-zinc-800/80 rounded-xl">
                <div class="space-y-0.5">
                  <span class="text-xs font-black text-slate-800 dark:text-white uppercase block">System Maintenance Mode</span>
                  <span class="text-[10px] text-slate-400 block font-medium">Block non-admin users from accessing the system dashboard.</span>
                </div>
                <input 
                  type="checkbox" 
                  v-model="systemConfig.maintenanceMode"
                  @change="saveConfigKey('maintenanceMode', systemConfig.maintenanceMode)"
                  class="rounded text-primary border-slate-300 dark:border-zinc-700 bg-transparent focus:ring-primary w-4 h-4 cursor-pointer"
                />
              </div>

              <!-- Allow Signups -->
              <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100/50 dark:border-zinc-800/80 rounded-xl">
                <div class="space-y-0.5">
                  <span class="text-xs font-black text-slate-800 dark:text-white uppercase block">Allow New User Registration</span>
                  <span class="text-[10px] text-slate-400 block font-medium">Enable or disable the signup form on the login screen.</span>
                </div>
                <input 
                  type="checkbox" 
                  v-model="systemConfig.allowNewSignups"
                  @change="saveConfigKey('allowNewSignups', systemConfig.allowNewSignups)"
                  class="rounded text-primary border-slate-300 dark:border-zinc-700 bg-transparent focus:ring-primary w-4 h-4 cursor-pointer"
                />
              </div>

              <!-- Rate Limiter -->
              <div class="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100/50 dark:border-zinc-800/80 rounded-xl space-y-2">
                <div class="flex justify-between items-center">
                  <div>
                    <span class="text-xs font-black text-slate-800 dark:text-white uppercase block">API Rate Limiting Strictness</span>
                    <span class="text-[10px] text-slate-400 block font-medium">Control defense strictness against automated bot requests.</span>
                  </div>
                  <USelect 
                    v-model="systemConfig.rateLimitStrictness"
                    :items="['normal', 'strict', 'relaxed']"
                    class="w-36 bg-white dark:bg-zinc-850"
                    @change="saveConfigKey('rateLimitStrictness', systemConfig.rateLimitStrictness)"
                  />
                </div>
              </div>

              <!-- Announcement Banner -->
              <div class="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100/50 dark:border-zinc-800/80 rounded-xl space-y-3">
                <div>
                  <span class="text-xs font-black text-slate-800 dark:text-white uppercase block">Global Announcement Message</span>
                  <span class="text-[10px] text-slate-400 block font-medium">Broadcast a notification banner to all active dashboards.</span>
                </div>
                <div class="flex gap-2">
                  <UInput v-model="systemConfig.systemAlertMessage" placeholder="e.g. Server under scheduled upgrade tonight at 10 PM." class="flex-1" />
                  <UButton label="Broadcast" color="primary" @click="saveConfigKey('systemAlertMessage', systemConfig.systemAlertMessage)" :loading="configSaving" />
                </div>
              </div>
            </div>
          </div>

          <!-- Env Vars / Process context -->
          <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col h-full max-h-[70vh]">
            <div>
              <h3 class="text-sm font-black uppercase text-gray-900 dark:text-white tracking-wider">Environment & Config context</h3>
              <p class="text-[11px] text-gray-500 font-medium">Runtime environment arguments (sensitive values are masked).</p>
            </div>
            
            <div class="flex-1 overflow-y-auto space-y-3 pr-1">
              <UInput 
                v-model="envSearchQuery" 
                placeholder="Search variables..." 
                icon="i-heroicons-magnifying-glass"
                size="xs" 
                class="w-full"
              />
              
              <div v-if="processContext" class="space-y-2 text-[10px] font-mono">
                <div class="p-2 bg-slate-50 dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-900">
                  <span class="text-slate-400 uppercase block font-black text-[8px] tracking-wider">PID & Runtime</span>
                  <span class="text-slate-800 dark:text-white font-bold block mt-0.5">PID: {{ processContext.pid }} · Node: {{ processContext.version }}</span>
                </div>
                
                <div class="p-2 bg-slate-50 dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-900">
                  <span class="text-slate-400 uppercase block font-black text-[8px] tracking-wider">Working Directory</span>
                  <span class="text-slate-800 dark:text-white block mt-0.5 break-all">{{ processContext.cwd }}</span>
                </div>
                
                <div class="p-2 bg-slate-50 dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-900 space-y-1 max-h-[30vh] overflow-y-auto">
                  <span class="text-slate-400 uppercase block font-black text-[8px] tracking-wider">Environment Variables</span>
                  <div 
                    v-for="(val, key) in filteredEnv" 
                    :key="key" 
                    class="flex justify-between py-1 border-b border-slate-100/50 dark:border-zinc-900/50 break-all"
                  >
                    <span class="text-indigo-500 dark:text-indigo-400 font-bold mr-2">{{ key }}:</span>
                    <span class="text-slate-700 dark:text-slate-300 font-semibold">{{ val }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UTabs>

    <!-- Firm Registration Modal -->
    <UModal v-model:open="isFirmModalOpen" 
            :title="selectedFirm ? 'Update Firm Details' : 'Register New Enterprise Firm'"
            :ui="{ content: 'sm:max-w-7xl' }">
      <template #body>
        <div class="max-h-[85vh] overflow-y-auto custom-scrollbar px-4">
          <FirmForm :firm="selectedFirm" @success="fetchData" @close="isFirmModalOpen = false" />
        </div>
      </template>
    </UModal>

    <!-- User Management Modal -->
    <UModal v-model:open="isUserModalOpen" 
            title="Edit User Status & Role"
            :ui="{ content: 'sm:max-w-md' }">
      <template #body>
        <form @submit.prevent="onUserSubmit" class="space-y-4 px-4 py-2">
          <UFormField label="Name" class="w-full">
            <UInput v-model="userForm.name" required class="w-full" />
          </UFormField>
          <UFormField label="Email" class="w-full">
            <UInput v-model="userForm.email" type="email" required class="w-full" />
          </UFormField>
          <UFormField label="System Role" class="w-full">
            <USelect v-model="userForm.role" :items="roleOptions" class="w-full" />
          </UFormField>
          <UFormField label="Account Status" class="w-full">
            <USelect v-model="userForm.status" :items="statusOptions" class="w-full" />
          </UFormField>
          <UFormField label="Reset Password (Minimum 8 chars)" class="w-full">
            <UInput v-model="userForm.password" type="password" placeholder="Leave blank to keep current" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" label="Cancel" @click="isUserModalOpen = false" />
            <UButton type="submit" label="Save Changes" :loading="savingUser" />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
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

.pg-console-table :deep(td),
.pg-console-table :deep(th) {
  max-width: 180px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.mongo-console-table :deep(td),
.mongo-console-table :deep(th) {
  max-width: 180px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
</style>
