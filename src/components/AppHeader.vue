<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'

const { isAuthenticated, user, logout, selectedFirmId, selectFirm } = useAuth()
const router = useRouter()
const toast = useToast()

const firms = computed(() => {
  return user.value?.firms.map(f => ({
    label: f.firm.name,
    onSelect: () => selectFirm(f.firm.id),
    icon: f.firm.id === selectedFirmId.value ? 'i-heroicons-check' : undefined
  })) || []
})

const currentFirmName = computed(() => {
  return user.value?.firms.find(f => f.firm.id === selectedFirmId.value)?.firm.name || 'Select Firm'
})

const onLogout = async () => {
  await logout()
  toast.add({ title: 'Logged out successfully', color: 'success' })
  router.push('/auth/login')
}
</script>

<template>
  <header class="border-b border-gray-200 dark:border-gray-800 bg-white/75 dark:bg-black/75 backdrop-blur sticky top-0 z-50">
    <div class="px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <ULink to="/" class="font-bold text-xl flex items-center gap-2">
          <UIcon name="i-heroicons-rocket-launch" class="w-6 h-6 text-primary" />
          <span>FastifyApp</span>
        </ULink>

        <template v-if="isAuthenticated && firms.length > 0">
          <div class="h-6 w-px bg-gray-200 dark:bg-gray-800" />
          <UDropdownMenu :items="[firms]">
            <UButton color="neutral" variant="ghost" :label="currentFirmName" icon="i-heroicons-chevron-down" trailing />
          </UDropdownMenu>
        </template>
      </div>

      <nav class="hidden md:flex items-center gap-6">
        <ULink to="/" active-class="text-primary" class="text-sm font-medium hover:text-primary transition-colors">Home</ULink>
        <ULink to="/about" active-class="text-primary" class="text-sm font-medium hover:text-primary transition-colors">About</ULink>
        <ULink v-if="isAuthenticated" to="/dashboard" active-class="text-primary" class="text-sm font-medium hover:text-primary transition-colors">Dashboard</ULink>
        <ULink v-if="isAuthenticated" to="/master-roll" active-class="text-primary" class="text-sm font-medium hover:text-primary transition-colors">Master Roll</ULink>
        <ULink v-if="isAuthenticated && user?.role === 'superadmin'" to="/superadmin" active-class="text-primary" class="text-sm font-medium hover:text-primary transition-colors">SuperAdmin</ULink>
      </nav>

      <div class="flex items-center gap-2">
        <template v-if="isAuthenticated">
          <UDropdownMenu :items="[[{ label: user?.name, disabled: true }, { label: 'Logout', icon: 'i-heroicons-arrow-left-on-rectangle', onSelect: onLogout }]]">
            <UButton color="neutral" variant="ghost" icon="i-heroicons-user-circle" />
          </UDropdownMenu>
        </template>
        <template v-else>
          <UButton to="/auth/login" variant="ghost" color="neutral">Login</UButton>
          <UButton to="/auth/signup">Sign Up</UButton>
        </template>
        
        <UButton
          color="neutral"
          variant="ghost"
          to="https://github.com"
          icon="i-simple-icons-github"
          target="_blank"
        />
        <UColorModeButton />
      </div>
    </div>
  </header>
</template>
