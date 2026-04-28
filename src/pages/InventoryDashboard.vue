<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

interface Module {
  title: string;
  description: string;
  icon: string;
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral';
  to: string;
}

const modules: Module[] = [
  {
    title: 'Purchase',
    description: 'Manage incoming stock, supplier bills, and debit notes.',
    icon: 'i-lucide-shopping-cart',
    color: 'primary',
    to: '/inventory/purchase'
  },
  {
    title: 'Sales',
    description: 'Create invoices, manage customer orders, and credit notes.',
    icon: 'i-lucide-badge-dollar-sign',
    color: 'success',
    to: '/inventory/sales'
  },
  {
    title: 'Stocks',
    description: 'Monitor inventory levels, batches, and movements.',
    icon: 'i-lucide-package',
    color: 'warning',
    to: '/inventory/stocks'
  },
  {
    title: 'Parties',
    description: 'Manage customers, suppliers, and their GST details.',
    icon: 'i-lucide-users',
    color: 'info',
    to: '/inventory/parties'
  },
  {
    title: 'Reports',
    description: 'Detailed insights into stock ledger and tax filings.',
    icon: 'i-lucide-bar-chart-3',
    color: 'neutral',
    to: '/inventory/reports'
  }
];

const navigate = (path: string) => {
  router.push(path);
};
</script>

<template>
  <div class="space-y-8 py-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight">Inventory Dashboard</h1>
        <p class="text-gray-500 mt-1 text-lg">Central hub for supply chain and warehouse management.</p>
      </div>
      <UIcon name="i-lucide-boxes" class="text-5xl text-primary opacity-20" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard
        v-for="mod in modules"
        :key="mod.title"
        class="group cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all duration-300 transform hover:-translate-y-1"
        @click="navigate(mod.to)"
      >
        <div class="flex flex-col gap-4 p-2">
          <div :class="`w-14 h-14 rounded-2xl flex items-center justify-center bg-${mod.color}-50 dark:bg-${mod.color}-900/20 group-hover:scale-110 transition-transform`">
            <UIcon :name="mod.icon" :class="`text-3xl text-${mod.color}-600 dark:text-${mod.color}-400`" />
          </div>
          <div>
            <h3 class="text-xl font-bold mb-1">{{ mod.title }}</h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              {{ mod.description }}
            </p>
          </div>
          <div class="flex justify-end mt-2">
            <UButton
              variant="ghost"
              :color="mod.color"
              trailing-icon="i-lucide-arrow-right"
              class="group-hover:translate-x-1 transition-transform"
            >
              Enter Module
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Stats Section (Placeholders) -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
      <UCard v-for="i in 4" :key="i" class="bg-gray-50 dark:bg-gray-800/50 border-none">
        <div class="animate-pulse space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div class="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        </div>
      </UCard>
    </div>
  </div>
</template>
