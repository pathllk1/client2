<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/utils/api'
import { useToast } from '@nuxt/ui/composables'

const { user, selectedFirmId } = useAuth()
const api = useApi()
const toast = useToast()

const stats = ref([
  { label: 'Inventory Value', value: '₹0', icon: 'i-heroicons-cube', color: 'primary' },
  { label: 'Active Bills', value: '0', icon: 'i-heroicons-document-text', color: 'success' },
  { label: 'Security Logs', value: '0', icon: 'i-heroicons-shield-check', color: 'warning' },
])

const activity = ref<any[]>([])
const loading = ref(false)

const fetchData = async () => {
  if (!selectedFirmId.value) return
  
  loading.value = true
  try {
    const [stockRes, billsRes, logsRes] = await Promise.all([
      api.get('/inventory/stock'),
      api.get('/accounting/bills?limit=1'),
      api.get('/auth/security-logs?limit=5')
    ])

    const totalStockValue = stockRes.data?.reduce((sum: number, s: any) => sum + (s.total || 0), 0) || 0;
    stats.value[0]!.value = `₹${totalStockValue.toLocaleString()}`
    stats.value[1]!.value = billsRes.data?.length.toString() || '0'
    stats.value[2]!.value = logsRes.logs?.length.toString() || '0'

    activity.value = logsRes.logs || []
  } catch (err: any) {
    toast.add({ title: 'Error fetching dashboard data', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch(selectedFirmId, fetchData)

const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p class="text-gray-500 mt-1">Welcome back, {{ user?.name }}</p>
      </div>
      <div v-if="!selectedFirmId" class="text-warning-500 font-medium animate-pulse">
        Please select a firm to view data
      </div>
      <UButton v-else icon="i-heroicons-plus" label="New Contact" to="/contacts/new" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="flex items-center gap-4">
          <div :class="`p-3 rounded-lg bg-${stat.color}-500/10`">
            <UIcon :name="stat.icon" :class="`w-6 h-6 text-${stat.color}`" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
            <p class="text-2xl font-bold">{{ stat.value }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Security Logs</h3>
            <UButton variant="ghost" color="neutral" size="sm" label="View all" />
          </div>
        </template>
        
        <div v-if="activity.length > 0" class="space-y-4">
          <div v-for="log in activity" :key="log._id" class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <UIcon :name="log.severity === 'high' ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-information-circle'" 
                     :class="log.severity === 'high' ? 'text-error' : 'text-primary'" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ log.action.replace('_', ' ') }}</p>
              <p class="text-xs text-gray-500">{{ formatDate(log.timestamp) }}</p>
            </div>
            <UBadge variant="subtle" size="sm" :color="log.severity === 'high' ? 'error' : 'primary'">
              {{ log.severity }}
            </UBadge>
          </div>
        </div>
        <div v-else class="py-12 text-center text-gray-500">
          No security logs found.
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Your Firms</h3>
          </div>
        </template>
        <div class="space-y-4">
          <div v-for="f in user?.firms" :key="f.firm.id" 
               class="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800"
               :class="{ 'ring-2 ring-primary': f.firm.id === selectedFirmId }">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded bg-primary-500/10 flex items-center justify-center">
                <UIcon name="i-heroicons-building-office-2" class="w-5 h-5 text-primary" />
              </div>
              <span class="font-medium">{{ f.firm.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UBadge variant="outline" color="primary">{{ f.grade }}</UBadge>
              <UButton v-if="f.firm.id !== selectedFirmId" size="xs" variant="ghost" label="Switch" @click="useAuth().selectFirm(f.firm.id)" />
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
