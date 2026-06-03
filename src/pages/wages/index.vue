<script setup lang="ts">
import { ref } from 'vue'
import WageDashboard from '@/components/wages/WageDashboard.vue'
import WageCreate from '@/components/wages/WageCreate.vue'
import WageEdit from '@/components/wages/WageEdit.vue'
import WageReport from '@/components/wages/WageReport.vue'
import AdvanceManagement from '@/components/wages/AdvanceManagement.vue'

const activeTab = ref('dashboard')

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'i-heroicons-chart-bar' },
  { id: 'create', label: 'Create New Wages', icon: 'i-heroicons-plus-circle' },
  { id: 'edit', label: 'Manage & Edit', icon: 'i-heroicons-pencil-square' },
  { id: 'advance', label: 'Advances', icon: 'i-heroicons-banknotes' },
  { id: 'report', label: 'Wages Report', icon: 'i-heroicons-document-chart-bar' }
]
</script>

<template>
  <div class="h-[calc(100vh-64px)] flex flex-col p-4 bg-gray-50 dark:bg-black gap-4">
    <!-- Tab Navigation -->
    <div class="flex items-center gap-1 bg-gray-200 dark:bg-gray-900 p-1 rounded-xl w-fit self-center shadow-inner">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all"
        :class="activeTab === tab.id 
          ? 'bg-white dark:bg-gray-800 text-primary shadow-sm scale-105' 
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
      >
        <UIcon :name="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 min-h-0">
      <Transition 
        mode="out-in" 
        enter-active-class="transition duration-200 ease-out" 
        enter-from-class="opacity-0 translate-y-1" 
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div :key="activeTab" class="h-full">
          <WageDashboard v-if="activeTab === 'dashboard'" />
          <WageCreate v-if="activeTab === 'create'" />
          <WageEdit v-if="activeTab === 'edit'" />
          <AdvanceManagement v-if="activeTab === 'advance'" />
          <WageReport v-if="activeTab === 'report'" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* Ensure the container takes full height minus header */
</style>

