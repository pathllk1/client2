<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'

const { isAuthenticated, user, logout, selectedFirmId, selectFirm } = useAuth()
const router = useRouter()
const toast = useToast()

const isMobileMenuOpen = ref(false)

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

const navLinks = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  ...(isAuthenticated.value ? [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Inventory', to: '/inventory' },
    { label: 'Accounting', to: '/accounting/ledger' },
    { label: 'Master Roll', to: '/master-roll' },
    { label: 'Wages', to: '/wages' }
  ] : []),
  ...(isAuthenticated.value && user.value?.role === 'superadmin' ? [
    { label: 'Admin Panel', to: '/superadmin' }
  ] : [])
])

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
        <ULink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          active-class="text-primary"
          class="text-sm font-medium hover:text-primary transition-colors"
        >
          {{ link.label }}
        </ULink>
      </nav>

      <div class="flex items-center gap-2">
        <template v-if="isAuthenticated">
          <UDropdownMenu :items="[[{ label: user?.name, disabled: true }, { label: 'Logout', icon: 'i-heroicons-arrow-left-on-rectangle', onSelect: onLogout }]]">
            <UButton color="neutral" variant="ghost" icon="i-heroicons-user-circle" />
          </UDropdownMenu>
        </template>
        <template v-else>
          <div class="hidden md:flex items-center gap-2">
            <UButton to="/auth/login" variant="ghost" color="neutral">Login</UButton>
            <UButton to="/auth/signup">Sign Up</UButton>
          </div>
        </template>
        
        <UButton
          color="neutral"
          variant="ghost"
          to="https://github.com"
          icon="i-simple-icons-github"
          target="_blank"
          class="hidden sm:flex"
        />
        <UColorModeButton />

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-bars-3"
          class="md:hidden"
          @click="isMobileMenuOpen = true"
        />
      </div>
    </div>

    <!-- Mobile Menu -->
    <USlideover v-model:open="isMobileMenuOpen" title="Menu">
      <template #body>
        <div class="flex flex-col gap-4 p-4">
          <ULink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="text-lg font-medium hover:text-primary transition-colors"
            active-class="text-primary"
            @click="isMobileMenuOpen = false"
          >
            {{ link.label }}
          </ULink>
          
          <div class="h-px bg-gray-200 dark:bg-gray-800 my-2" />
          
          <template v-if="!isAuthenticated">
            <UButton to="/auth/login" variant="outline" color="neutral" block @click="isMobileMenuOpen = false">Login</UButton>
            <UButton to="/auth/signup" block @click="isMobileMenuOpen = false">Sign Up</UButton>
          </template>
          <template v-else>
            <div class="flex items-center gap-3 px-2 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-2">
              <UIcon name="i-heroicons-user-circle" class="w-8 h-8 text-gray-400" />
              <div class="flex flex-col">
                <span class="text-sm font-semibold">{{ user?.name }}</span>
                <span class="text-xs text-gray-500">{{ user?.email }}</span>
              </div>
            </div>
            <UButton
              color="error"
              variant="ghost"
              icon="i-heroicons-arrow-left-on-rectangle"
              label="Logout"
              block
              @click="onLogout(); isMobileMenuOpen = false"
            />
          </template>

          <div class="mt-auto pt-6 border-t border-gray-200 dark:border-gray-800">
            <UButton
              color="neutral"
              variant="ghost"
              to="https://github.com"
              icon="i-simple-icons-github"
              label="GitHub"
              target="_blank"
              block
            />
          </div>
        </div>
      </template>
    </USlideover>
  </header>
</template>
