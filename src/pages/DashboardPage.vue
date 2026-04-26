<script setup lang="ts">
import { useAuth } from '../composables/useAuth';

const auth = useAuth();
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Dashboard</h1>
      <UBadge color="primary" variant="subtle">Welcome back, {{ auth.user.value?.fullname }}</UBadge>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2 font-semibold">
            <UIcon name="i-lucide-user" class="text-primary" />
            User Info
          </div>
        </template>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Username:</span>
            <span class="font-medium">{{ auth.user.value?.username }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Email:</span>
            <span class="font-medium">{{ auth.user.value?.email }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Role:</span>
            <UBadge size="sm" color="neutral">{{ auth.user.value?.role }}</UBadge>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2 font-semibold">
            <UIcon name="i-lucide-building" class="text-primary" />
            Firm Details
          </div>
        </template>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Name:</span>
            <span class="font-medium">{{ auth.user.value?.firm_name || 'N/A' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Code:</span>
            <span class="font-medium">{{ auth.user.value?.firm_code || 'N/A' }}</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2 font-semibold">
            <UIcon name="i-lucide-activity" class="text-primary" />
            System Status
          </div>
        </template>
        <div class="flex flex-col items-center justify-center py-4">
          <UIcon name="i-lucide-check-circle" class="text-4xl text-success mb-2" />
          <p class="text-sm font-medium">All systems operational</p>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h2 class="text-xl font-bold">Recent Activity</h2>
      </template>
      <div class="flex flex-col items-center justify-center py-12 text-gray-500">
        <UIcon name="i-lucide-history" class="text-4xl mb-2 opacity-20" />
        <p>No recent activity to show.</p>
      </div>
    </UCard>
  </div>
</template>
