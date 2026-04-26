<script setup lang="ts">
import DefaultLayout from './layouts/DefaultLayout.vue';
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
/* Global styles if needed */
</style>
