import { authState, setAccessToken, setRefreshToken, clearAuth } from '@/stores/auth'

let isRefreshing = false
let refreshPromise: Promise<any> | null = null

export const useApi = () => {
  const config = import.meta.env
  const baseUrl = config.VITE_API_BASE_URL || '/api'

  const refreshTokenLogic = async () => {
    if (!authState.refreshToken) return null
    try {
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: authState.refreshToken })
        }).then(res => res.json())
      }
      const data = await refreshPromise
      if (data && data.accessToken) {
        setAccessToken(data.accessToken)
        if (data.refreshToken) setRefreshToken(data.refreshToken)
        return data.accessToken
      }
      return null
    } catch {
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  }

  const request = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    
    // Request Interceptor: Add Auth and Firm headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    if (authState.accessToken) {
      headers['Authorization'] = `Bearer ${authState.accessToken}`
    }

    if (authState.selectedFirmId) {
      headers['X-Firm-ID'] = authState.selectedFirmId
    }

    const method = (options.method || 'GET').toUpperCase()

    console.log(`[API_REQUEST] ${method} ${url}`, { 
      hasToken: !!authState.accessToken, 
      selectedFirmId: authState.selectedFirmId,
      headers: headers 
    });

    // Mutation Protection: Ensure token exists for PUT, POST, PATCH, DELETE
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !authState.accessToken && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
      throw new Error('Authentication required for this operation')
    }

    const performRequest = async (retry = true): Promise<any> => {
      const response = await fetch(url, { ...options, headers })

      // Response Interceptor: Handle Token Rotation
      const newToken = response.headers.get('X-New-Access-Token')
      if (newToken) setAccessToken(newToken)

      // Response Interceptor: Handle 401 Unauthorized
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh') && retry) {
        const freshToken = await refreshTokenLogic()
        if (freshToken) {
          headers['Authorization'] = `Bearer ${freshToken}`
          const retryRes = await fetch(url, { ...options, headers })
          if (!retryRes.ok) throw new Error(`Retry failed! status: ${retryRes.status}`)
          return retryRes.json()
        }
        clearAuth()
        window.location.href = '/auth/login'
        throw new Error('Session expired. Please login again.')
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }))
        throw new Error(error.message || `HTTP error! status: ${response.status}`)
      }

      return response.json()
    }

    return performRequest()
  }

  const download = async (endpoint: string, filename: string) => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    
    const headers: Record<string, string> = {}
    if (authState.accessToken) headers['Authorization'] = `Bearer ${authState.accessToken}`
    if (authState.selectedFirmId) headers['X-Firm-ID'] = authState.selectedFirmId

    const performDownload = async (retry = true) => {
      const response = await fetch(url, { headers })

      if (response.status === 401 && retry) {
        const freshToken = await refreshTokenLogic()
        if (freshToken) {
          headers['Authorization'] = `Bearer ${freshToken}`
          return performDownload(false)
        }
        clearAuth()
        window.location.href = '/auth/login'
        throw new Error('Session expired. Please login again.')
      }

      if (!response.ok) {
        throw new Error(`Download failed! status: ${response.status}`)
      }

      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(link.href)
    }

    return performDownload()
  }

  return {
    get: (endpoint: string, options?: RequestInit) => request(endpoint, { ...options, method: 'GET' }),
    post: (endpoint: string, data: any, options?: RequestInit) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
    put: (endpoint: string, data: any, options?: RequestInit) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    patch: (endpoint: string, data: any, options?: RequestInit) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
    delete: (endpoint: string, data?: any, options?: RequestInit) => {
      const config: RequestInit = { ...options, method: 'DELETE' }
      if (data) config.body = JSON.stringify(data)
      return request(endpoint, config)
    },
    download
  }
}
