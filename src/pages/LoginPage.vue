<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useRouter } from 'vue-router';
// import type { FormSubmitEvent } from '@nuxt/ui/runtime/types/form';

const auth = useAuth();
const router = useRouter();

const state = reactive({
  username: '',
  password: ''
});

const validate = (state: any) => {
  const errors = [];
  if (!state.username) errors.push({ path: 'username', message: 'Required' });
  if (!state.password) errors.push({ path: 'password', message: 'Required' });
  return errors;
};

const loading = ref(false);

async function onSubmit(event: any) {
  loading.value = true;
  const result = await auth.login(event.data);
  loading.value = false;
  
  if (result.success) {
    router.push('/');
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold">Login</h1>
          <p class="text-gray-500 text-sm mt-1">Enter your credentials to access your account</p>
        </div>
      </template>

      <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Username or Email" name="username">
          <UInput v-model="state.username" placeholder="john.doe" icon="i-lucide-user" block />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput v-model="state.password" type="password" placeholder="••••••••" icon="i-lucide-lock" block />
        </UFormField>

        <UButton type="submit" label="Login" color="primary" :loading="loading" block />
      </UForm>
      
      <template #footer>
        <p class="text-xs text-center text-gray-500">
          Demo: use existing credentials from the server.
        </p>
      </template>
    </UCard>
  </div>
</template>
