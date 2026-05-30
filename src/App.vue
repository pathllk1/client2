<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from './composables/useAuth'
import DefaultLayout from './layouts/Default.vue'
import GlobalToolsHost from './components/tools/GlobalToolsHost.vue'
import { isGlobalLoading, scheduleTokenRefresh } from '@/utils/api'

const { fetchMe, state, selectFirm } = useAuth()

onMounted(async () => {
  const user = await fetchMe()
  if (user && !state.selectedFirmId && user.firms.length > 0) {
    selectFirm(user.firms[0].firm.id)
  }
  // Schedule proactive refresh for returning users with a persisted token
  if (state.accessToken) {
    scheduleTokenRefresh(state.accessToken)
  }
})
</script>

<template>
  <UApp>
    <!-- Global Loading Top Progress Bar -->
    <div
      v-if="isGlobalLoading"
      class="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 z-[9999] overflow-hidden"
    >
      <div class="h-full bg-white/40 animate-progress w-full"></div>
    </div>

    <!-- Global Loading Floating Glassmorphic Spinner -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div
        v-if="isGlobalLoading"
        class="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-xl shadow-slate-100/50 dark:shadow-none"
      >
        <div class="relative w-5 h-5 flex items-center justify-center">
          <svg class="animate-spin h-5 w-5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <span class="text-xs font-black text-slate-700 dark:text-slate-200 tracking-wide uppercase">Syncing...</span>
      </div>
    </Transition>

    <DefaultLayout>
      <RouterView />
    </DefaultLayout>
    <GlobalToolsHost />
    <UToaster />
  </UApp>
</template>

<style>
@keyframes progress-loading {
  0% {
    transform: scaleX(0);
    transform-origin: left;
  }
  50% {
    transform: scaleX(0.6);
    transform-origin: left;
  }
  100% {
    transform: scaleX(1);
    transform-origin: right;
  }
}
.animate-progress {
  animation: progress-loading 1.5s infinite ease-in-out;
}
</style>
