<script setup lang="ts">
import AppNavbar from '../components/AppNavbar.vue';
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col">
    <AppNavbar />
    
    <main class="flex-grow px-4 sm:px-6 lg:px-8 py-8 w-full">
      <slot />
    </main>

    <footer class="border-t border-gray-200 dark:border-gray-800 py-6">
      <div class="px-4 text-center text-sm text-gray-500">
        &copy; 2026 Nuxt UI Project. Built with Vue 3 and Nuxt UI.
      </div>
    </footer>
  </div>
</template>
