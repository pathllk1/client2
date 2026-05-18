<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@nuxt/ui/composables'

const router = useRouter()
const { login, state } = useAuth()
const toast = useToast()

const form = reactive({
  email: '',
  password: ''
})

const onSubmit = async () => {
  try {
    await login(form)
    toast.add({ title: 'Welcome back!', color: 'success' })
    router.push('/')
  } catch (err: any) {
    toast.add({ title: 'Login failed', description: err.message, color: 'error' })
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-200px)]">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h2 class="text-2xl font-bold">Welcome back</h2>
          <p class="text-sm text-gray-500">Access your multi-firm dashboard</p>
        </div>
      </template>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <UFormField label="Email Address" class="w-full">
          <UInput
            v-model="form.email"
            type="email"
            placeholder="name@company.com"
            icon="i-heroicons-envelope"
            autocomplete="email"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password" class="w-full">
          <template #hint>
            <ULink to="/forgot-password" class="text-xs text-primary font-medium">Forgot password?</ULink>
          </template>
          <UInput
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            autocomplete="current-password"
            required
            class="w-full"
          />
        </UFormField>

        <UButton type="submit" block :loading="state.loading">
          Sign In
        </UButton>
      </form>

      <template #footer>
        <div class="text-center text-sm">
          Don't have an account? 
          <ULink to="/auth/signup" class="text-primary font-semibold">Create one</ULink>
        </div>
      </template>
    </UCard>
  </div>
</template>
