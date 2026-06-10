<script setup lang="ts">
defineProps<{
  leftMarginClass?: string
}>()
</script>

<template>
  <footer 
    class="fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 py-3 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md z-10 transition-all duration-300"
    :class="[leftMarginClass || '']"
  >
    <div class="px-4 md:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-2">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        &copy; {{ new Date().getFullYear() }} FastifyApp. All rights reserved.
      </p>
      <div class="flex gap-4">
        <ULink to="/privacy" class="text-[10px] hover:text-primary transition-colors">Privacy Policy</ULink>
        <ULink to="/terms" class="text-[10px] hover:text-primary transition-colors">Terms of Service</ULink>
      </div>
      
    </div>
  </footer>
</template>
