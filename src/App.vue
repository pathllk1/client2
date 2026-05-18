<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from './composables/useAuth'
import DefaultLayout from './layouts/Default.vue'

const { fetchMe, state, selectFirm } = useAuth()

onMounted(async () => {
  const user = await fetchMe()
  if (user && !state.selectedFirmId && user.firms.length > 0) {
    selectFirm(user.firms[0].firm.id)
  }
})
</script>

<template>
  <UApp>
    <DefaultLayout>
      <RouterView />
    </DefaultLayout>
    <UToaster />
  </UApp>
</template>

<style>
/* Global styles can be added here if needed */
</style>
