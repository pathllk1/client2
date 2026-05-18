import { computed } from 'vue'
import { useApi } from '@/utils/api'
import { authState, setAccessToken, setRefreshToken, clearAuth } from '@/stores/auth'

export const useAuth = () => {
  const api = useApi()

  const isAuthenticated = computed(() => !!authState.accessToken)
  const user = computed(() => authState.user)
  const selectedFirmId = computed(() => authState.selectedFirmId)

  const selectFirm = (id: string | null) => {
    authState.selectedFirmId = id
    if (id) {
      localStorage.setItem('selected_firm_id', id)
    } else {
      localStorage.removeItem('selected_firm_id')
    }
  }

  const setTokens = (access: string, refresh: string) => {
    setAccessToken(access)
    setRefreshToken(refresh)
  }

  const login = async (credentials: any) => {
    authState.loading = true
    try {
      const response = await api.post('/auth/login', credentials)
      authState.user = response.user
      setTokens(response.accessToken, response.refreshToken)
      
      // Select first firm by default
      if (response.user.firms && response.user.firms.length > 0) {
        const firstFirm = response.user.firms[0]
        selectFirm(firstFirm.firm.id || firstFirm.firm._id)
      }
      
      return response
    } finally {
      authState.loading = false
    }
  }

  const signup = async (data: any) => {
    authState.loading = true
    try {
      const response = await api.post('/auth/signup', data)
      authState.user = response.user
      setTokens(response.accessToken, response.refreshToken)

      // Select first firm by default
      if (response.user.firms && response.user.firms.length > 0) {
        const firstFirm = response.user.firms[0]
        selectFirm(firstFirm.firm.id || firstFirm.firm._id)
      }

      return response
    } finally {
      authState.loading = false
    }
  }

  const logout = async () => {
    try {
      if (authState.refreshToken) {
        await api.post('/auth/logout', { refreshToken: authState.refreshToken })
      }
    } catch (e) {
      console.error('Logout error', e)
    } finally {
      clearAuth()
    }
  }

  const fetchMe = async () => {
    if (!authState.accessToken) return null
    try {
      const user = await api.get('/auth/me')
      authState.user = user
      return user
    } catch (e) {
      // clearAuth() is handled by interceptor in useApi
      return null
    }
  }

  return {
    state: authState,
    isAuthenticated,
    user,
    selectedFirmId,
    selectFirm,
    login,
    signup,
    logout,
    fetchMe
  }
}
