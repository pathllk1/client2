<script setup lang="ts">
import { useAuth } from '../composables/useAuth';

const auth = useAuth();
</script>

<template>
  <div class="space-y-20 pb-20">
    <!-- Hero Section -->
    <section class="text-center space-y-8 py-12">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
        <UBadge color="primary" variant="subtle" size="sm">New</UBadge>
        <span>Secure JWT-bound CSRF Protection Implemented</span>
      </div>
      
      <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight">
        Modern <span class="text-primary italic">Enterprise</span> <br />
        Management System
      </h1>
      
      <p class="text-xl text-gray-500 max-w-2xl mx-auto">
        A comprehensive solution for Accounting, Inventory, and HR Management. 
        Built with cutting-edge technology for maximum security and performance.
      </p>

      <div class="flex items-center justify-center gap-4">
        <UButton v-if="!auth.user.value" to="/login" size="xl" icon="i-lucide-rocket">
          Get Started
        </UButton>
        <UButton v-else to="/dashboard" size="xl" icon="i-lucide-layout-dashboard">
          Go to Dashboard
        </UButton>
        <UButton color="neutral" variant="ghost" size="xl">
          Learn More
        </UButton>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <UCard class="hover:border-primary/50 transition-colors">
        <template #header>
          <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-shield-check" class="text-2xl text-primary" />
          </div>
          <h3 class="text-xl font-bold">Tight Security</h3>
        </template>
        <p class="text-gray-500">
          State-of-the-art CSRF protection using JWT-bound tokens. No cookies, no vulnerabilities.
        </p>
      </UCard>

      <UCard class="hover:border-primary/50 transition-colors">
        <template #header>
          <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-zap" class="text-2xl text-primary" />
          </div>
          <h3 class="text-xl font-bold">High Performance</h3>
        </template>
        <p class="text-gray-500">
          Built with Vue 3 and Nuxt UI for a lightning-fast user experience and smooth interactions.
        </p>
      </UCard>

      <UCard class="hover:border-primary/50 transition-colors">
        <template #header>
          <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-database" class="text-2xl text-primary" />
          </div>
          <h3 class="text-xl font-bold">Reliable Data</h3>
        </template>
        <p class="text-gray-500">
          MongoDB backed persistence with robust audit logging and automated cleanup tasks.
        </p>
      </UCard>
    </section>

    <!-- Content Section -->
    <section class="bg-gray-100 dark:bg-gray-800/50 rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 border border-gray-200 dark:border-gray-800">
      <div class="flex-1 space-y-6">
        <h2 class="text-3xl md:text-4xl font-bold">Comprehensive Management</h2>
        <ul class="space-y-4">
          <li class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle-2" class="text-success mt-1" />
            <span><strong>Accounting:</strong> Full ledger support with GST calculation and reporting.</span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle-2" class="text-success mt-1" />
            <span><strong>Inventory:</strong> Real-time stock tracking, movement logs, and purchase/sales management.</span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle-2" class="text-success mt-1" />
            <span><strong>HR & Payroll:</strong> Master roll, wages, and advances tracking for your workforce.</span>
          </li>
        </ul>
        <UButton color="neutral" size="lg" block class="md:w-max">Explore All Features</UButton>
      </div>
      <div class="flex-1 bg-white dark:bg-black rounded-2xl shadow-2xl p-4 border border-gray-200 dark:border-gray-800 rotate-2">
         <div class="aspect-video bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700">
            <UIcon name="i-lucide-layout" class="text-6xl opacity-10" />
         </div>
      </div>
    </section>
  </div>
</template>
