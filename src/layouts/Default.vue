<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1 p-4 md:p-6 lg:p-8">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
