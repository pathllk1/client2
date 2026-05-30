import { reactive } from 'vue'

interface User {
  id: string
  name: string
  email: string
  role: string
  firms: any[]
}

export const authState = reactive({
  user: null as User | null,
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  selectedFirmId: localStorage.getItem('selected_firm_id'),
  loading: false
})

export const setAccessToken = (token: string) => {
  authState.accessToken = token
  localStorage.setItem('access_token', token)
}

export const setRefreshToken = (token: string) => {
  authState.refreshToken = token
  localStorage.setItem('refresh_token', token)
}

export const clearAuth = () => {
  authState.user = null
  authState.accessToken = null
  authState.refreshToken = null
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

