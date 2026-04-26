import { ref, readonly } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { apiFetch } from '../utils/api';

interface User {
  id: string;
  username: string;
  email: string;
  fullname: string;
  role: string;
  firm_id: string | null;
  firm_name: string | null;
  firm_code: string | null;
}

const user = ref<User | null>(null);
const loading = ref(false);
const initialized = ref(false);

export function useAuth() {
  const toast = useToast();

  async function fetchUser() {
    loading.value = true;
    try {
      const res = await apiFetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        user.value = data.user;
      } else {
        user.value = null;
      }
    } catch (e) {
      user.value = null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function login(credentials: any) {
    loading.value = true;
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        user.value = data.user;
        toast.add({
          title: 'Login Successful',
          description: `Welcome back, ${data.user.fullname}!`,
          color: 'success',
        });
        return { success: true };
      } else {
        toast.add({
          title: 'Login Failed',
          description: data.error || 'Invalid credentials',
          color: 'error',
        });
        return { success: false, error: data.error };
      }
    } catch (e) {
      toast.add({
        title: 'Error',
        description: 'An unexpected error occurred',
        color: 'error',
      });
      return { success: false, error: 'Server error' };
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      user.value = null;
      toast.add({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
        color: 'info',
      });
    } catch (e) {
      console.error('Logout failed', e);
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    initialized: readonly(initialized),
    fetchUser,
    login,
    logout,
  };
}
