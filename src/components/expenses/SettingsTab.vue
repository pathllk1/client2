<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useExpenses } from '@/composables/useExpenses'
import { api } from '@/utils/api'

const {
  categories,
  costCenters,
  fetchCategories,
  fetchCostCenters
} = useExpenses()

const newCategoryName = ref('')
const newCostCenterName = ref('')
const loadingCat = ref(false)
const loadingCC = ref(false)

const loadData = async () => {
  await Promise.all([
    fetchCategories(),
    fetchCostCenters()
  ])
}

onMounted(() => {
  loadData()
})

const handleAddCategory = async () => {
  if (!newCategoryName.value.trim()) return
  loadingCat.value = true
  try {
    const res = await api.post('/expenses/categories', { name: newCategoryName.value.trim() })
    if (res.success) {
      newCategoryName.value = ''
      await fetchCategories()
    } else {
      alert(res.message || 'Failed to add category')
    }
  } catch (err: any) {
    alert(err.message || 'An error occurred')
  } finally {
    loadingCat.value = false
  }
}

const handleDeleteCategory = async (id: string) => {
  if (!confirm('Are you sure you want to delete this category?')) return
  try {
    const res = await api.delete(`/expenses/categories/${id}`)
    if (res.success) {
      await fetchCategories()
    } else {
      alert(res.message || 'Deletion failed')
    }
  } catch (err: any) {
    alert(err.message || 'An error occurred')
  }
}

const handleAddCostCenter = async () => {
  if (!newCostCenterName.value.trim()) return
  loadingCC.value = true
  try {
    const res = await api.post('/expenses/cost-centers', { name: newCostCenterName.value.trim() })
    if (res.success) {
      newCostCenterName.value = ''
      await fetchCostCenters()
    } else {
      alert(res.message || 'Failed to add cost center')
    }
  } catch (err: any) {
    alert(err.message || 'An error occurred')
  } finally {
    loadingCC.value = false
  }
}

const handleDeleteCostCenter = async (id: string) => {
  if (!confirm('Are you sure you want to delete this cost center?')) return
  try {
    const res = await api.delete(`/expenses/cost-centers/${id}`)
    if (res.success) {
      await fetchCostCenters()
    } else {
      alert(res.message || 'Deletion failed')
    }
  } catch (err: any) {
    alert(err.message || 'An error occurred')
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-5 pb-8">
    <!-- Categories Settings -->
    <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
      <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-50 dark:border-slate-800">
        Custom Categories
      </h3>

      <!-- Add Input -->
      <div class="flex gap-2">
        <UInput
          v-model="newCategoryName"
          placeholder="New Category (e.g. Travel, Utilities)"
          size="sm"
          class="flex-1"
          @keyup.enter="handleAddCategory"
        />
        <UButton
          size="sm"
          color="primary"
          icon="i-heroicons-plus"
          :loading="loadingCat"
          @click="handleAddCategory"
        />
      </div>

      <!-- Categories List -->
      <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-950 rounded-xl"
        >
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ cat.name }}</span>
          <UButton
            size="xs"
            variant="ghost"
            color="error"
            icon="i-heroicons-trash"
            class="rounded-full"
            @click="handleDeleteCategory(cat.id)"
          />
        </div>
      </div>
    </div>

    <!-- Cost Center Settings -->
    <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
      <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-50 dark:border-slate-800">
        My Cost Centers
      </h3>

      <!-- Add Input -->
      <div class="flex gap-2">
        <UInput
          v-model="newCostCenterName"
          placeholder="New Cost Center (e.g. Home, Office, Project B)"
          size="sm"
          class="flex-1"
          @keyup.enter="handleAddCostCenter"
        />
        <UButton
          size="sm"
          color="primary"
          icon="i-heroicons-plus"
          :loading="loadingCC"
          @click="handleAddCostCenter"
        />
      </div>

      <!-- Cost Center List -->
      <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        <div
          v-for="cc in costCenters"
          :key="cc.id"
          class="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-950 rounded-xl"
        >
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ cc.name }}</span>
          <UButton
            size="xs"
            variant="ghost"
            color="error"
            icon="i-heroicons-trash"
            class="rounded-full"
            @click="handleDeleteCostCenter(cc.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
