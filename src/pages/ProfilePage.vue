<script setup lang="ts">
import { useAuth } from '../composables/useAuth';

const auth = useAuth();
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center gap-4">
      <UAvatar :alt="auth.user.value?.fullname" size="xl" />
      <div>
        <h1 class="text-3xl font-bold">{{ auth.user.value?.fullname }}</h1>
        <p class="text-gray-500">{{ auth.user.value?.role }}</p>
      </div>
    </div>

    <UCard>
      <template #header>
        <h2 class="text-xl font-bold">Account Settings</h2>
      </template>
      
      <div class="space-y-4">
        <UFormField label="Full Name">
          <UInput :model-value="auth.user.value?.fullname" disabled block />
        </UFormField>
        
        <UFormField label="Email Address">
          <UInput :model-value="auth.user.value?.email" disabled block />
        </UFormField>

        <UFormField label="Username">
          <UInput :model-value="auth.user.value?.username" disabled block />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton color="neutral" variant="outline" label="Edit Profile (Locked)" disabled />
        </div>
      </template>
    </UCard>

    <UCard color="error" variant="subtle">
      <template #header>
        <h2 class="text-xl font-bold text-error">Danger Zone</h2>
      </template>
      <p class="text-sm mb-4 text-error-700 dark:text-error-300">
        Deleting your account is permanent and cannot be undone.
      </p>
      <UButton color="error" label="Delete Account" disabled />
    </UCard>
  </div>
</template>
