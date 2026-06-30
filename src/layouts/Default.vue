<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated } = useAuth()
const isSidebarCollapsed = ref(true)

const handleSidebarToggle = (collapsed: boolean) => {
  isSidebarCollapsed.value = collapsed
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader 
      class="transition-all duration-300"
      :class="[
        isAuthenticated 
          ? (isSidebarCollapsed ? 'ml-16' : 'ml-48') 
          : ''
      ]"
    />
    
    <div class="flex-1 relative">
      <AppSidebar 
        v-if="isAuthenticated" 
        @toggle="handleSidebarToggle"
      />
      
      <main 
        class="flex-1 p-4 md:p-6 lg:p-8 pb-16 transition-all duration-300"
        :class="[
          isAuthenticated 
            ? (isSidebarCollapsed ? 'ml-16' : 'ml-48') 
            : ''
        ]"
      >
        <slot />
      </main>
    </div>

    <AppFooter 
      :left-class="isAuthenticated ? (isSidebarCollapsed ? 'left-16' : 'left-48') : 'left-0'"
    />
  </div>
</template>
