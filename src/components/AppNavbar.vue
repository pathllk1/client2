<script setup lang="ts">
import { computed } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useRouter } from 'vue-router';

const auth = useAuth();
const router = useRouter();

const handleLogout = async () => {
  await auth.logout();
  router.push('/login');
};

const items = computed(() => {
  if (auth.user.value) {
    return [
      [{ label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' }],
      [{ label: 'Profile', icon: 'i-lucide-user', to: '/profile' }],
      [{ label: 'Logout', icon: 'i-lucide-log-out', click: handleLogout }]
    ];
  }
  return [[{ label: 'Login', icon: 'i-lucide-log-in', to: '/login' }]];
});
</script>

<template>
  <nav class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <div class="flex items-center gap-4">
          <RouterLink to="/" class="text-xl font-bold text-primary flex items-center gap-2">
            <UIcon name="i-lucide-zap" />
            <span>Nuxt UI App</span>
          </RouterLink>
          
          <div class="hidden md:flex items-center gap-1">
            <UButton
              v-if="auth.user.value"
              to="/"
              variant="ghost"
              color="neutral"
              label="Dashboard"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <template v-if="auth.user.value">
            <UDropdown :items="items" :popper="{ placement: 'bottom-end' }">
              <UButton
                color="neutral"
                variant="ghost"
                :label="auth.user.value.fullname"
                icon="i-lucide-chevron-down"
                trailing
              >
                <template #leading>
                  <UAvatar :alt="auth.user.value.fullname" size="xs" />
                </template>
              </UButton>
            </UDropdown>
          </template>
          <template v-else>
            <UButton to="/login" label="Login" color="primary" />
          </template>
          <UColorModeButton />
        </div>
      </div>
    </div>
  </nav>
</template>
