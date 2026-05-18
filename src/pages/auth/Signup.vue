<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/utils/api'
import { useToast } from '@nuxt/ui/composables'

const router = useRouter()
const api = useApi()
const { signup, state } = useAuth()
const toast = useToast()

const firms = ref<any[]>([])
const loadingFirms = ref(false)

const form = reactive({
  name: '',
  email: '',
  password: '',
  firmId: ''
})

onMounted(async () => {
  loadingFirms.value = true
  try {
    const response = await api.get('/firms')
    if (response.success && Array.isArray(response.data)) {
      firms.value = response.data.map((f: any) => ({ label: f.name, value: f._id }))
    }
  } catch (err) {
    toast.add({ title: 'Error', description: 'Failed to load firms', color: 'error' })
  } finally {
    loadingFirms.value = false
  }
})

const onSubmit = async () => {
  try {
    await signup(form)
    toast.add({ title: 'Account created!', color: 'success' })
    router.push('/')
  } catch (err: any) {
    toast.add({ title: 'Signup failed', description: err.message, color: 'error' })
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-200px)]">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h2 class="text-2xl font-bold">Create Account</h2>
          <p class="text-sm text-gray-500">Join our business management platform</p>
        </div>
      </template>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <UFormField label="Full Name" class="w-full">
          <UInput
            v-model="form.name"
            placeholder="John Doe"
            icon="i-heroicons-user"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField label="Select Your Firm" class="w-full">
          <USelect
            v-model="form.firmId"
            :items="firms"
            :loading="loadingFirms"
            placeholder="Choose a firm..."
            required
            class="w-full"
          />
        </UFormField>

        <UFormField label="Email Address" class="w-full">
          <UInput
            v-model="form.email"
            type="email"
            placeholder="name@company.com"
            icon="i-heroicons-envelope"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password" class="w-full">
          <UInput
            v-model="form.password"
            type="password"
            placeholder="Minimum 8 characters"
            icon="i-heroicons-lock-closed"
            required
            class="w-full"
          />
        </UFormField>

        <UButton type="submit" block :loading="state.loading">
          Create My Account
        </UButton>
      </form>

      <template #footer>
        <div class="text-center text-sm">
          Already have an account? 
          <ULink to="/auth/login" class="text-primary font-semibold">Sign in</ULink>
        </div>
      </template>
    </UCard>
  </div>
</template>
