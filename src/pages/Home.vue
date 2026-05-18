<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const toast = useToast()

const showToast = () => {
  toast.add({
    title: 'Success!',
    description: 'Nuxt UI components are working.',
    color: 'success',
    icon: 'i-heroicons-check-circle'
  })
}

const { isAuthenticated } = useAuth()
</script>

<template>
  <div class="space-y-6">
    <section class="text-center py-12">
      <h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
        Modern Vue Development
      </h1>
      <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
        Built with Nuxt UI, Tailwind CSS, and Vite.
      </p>
      <div class="mt-10 flex items-center justify-center gap-x-6">
        <UButton size="xl" @click="showToast">
          Try a Toast
        </UButton>
        <UButton v-if="isAuthenticated" size="xl" variant="outline" to="/dashboard">
          Go to Dashboard
        </UButton>
        <UButton v-else size="xl" variant="outline" to="/auth/signup">
          Get Started
        </UButton>
      </div>
    </section>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-primary" />
            <h3 class="font-semibold">Secure Authentication</h3>
          </div>
        </template>
        JWT-based auth with session management and security logging.
      </UCard>
      
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-building-office-2" class="w-5 h-5 text-primary" />
            <h3 class="font-semibold">Multi-Tenancy</h3>
          </div>
        </template>
        Manage multiple firms with a single account and context switching.
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-swatch" class="w-5 h-5 text-primary" />
            <h3 class="font-semibold">Modern UI</h3>
          </div>
        </template>
        Clean, responsive design built with Nuxt UI and Tailwind CSS.
      </UCard>
    </div>
  </div>
</template>
