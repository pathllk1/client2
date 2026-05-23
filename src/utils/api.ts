import { authState, setAccessToken, setRefreshToken, clearAuth } from '@/stores/auth'

let isRefreshing = false
let refreshPromise: Promise<any> | null = null

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || '/api'

const refreshTokenLogic = async () => {
  const baseUrl = getBaseUrl()
  const latestRefreshToken = localStorage.getItem('refresh_token') || authState.refreshToken
  if (!latestRefreshToken) return null
  try {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: latestRefreshToken })
      }).then(async res => {
        if (!res.ok) throw new Error('Refresh failed')
        return res.json()
      })
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

const rawRequest = async (endpoint: string, options: any = {}): Promise<any> => {
  const baseUrl = getBaseUrl()
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
  
  // Handle query params in options.params
  let finalUrl = url
  if (options.params) {
    const searchParams = new URLSearchParams()
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) searchParams.append(key, String(val))
    })
    const qs = searchParams.toString()
    if (qs) finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (authState.accessToken) headers['Authorization'] = `Bearer ${authState.accessToken}`
  if (authState.selectedFirmId) headers['X-Firm-ID'] = authState.selectedFirmId

  const performRequest = async (retry = true): Promise<any> => {
    const response = await fetch(finalUrl, { ...options, headers })

    const newToken = response.headers.get('X-New-Access-Token')
    if (newToken) setAccessToken(newToken)

    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh') && retry) {
      // Check if another tab already refreshed the token
      const latestAccessToken = localStorage.getItem('access_token')
      if (latestAccessToken && latestAccessToken !== authState.accessToken) {
        setAccessToken(latestAccessToken)
        const latestRefreshToken = localStorage.getItem('refresh_token')
        if (latestRefreshToken) setRefreshToken(latestRefreshToken)
        
        headers['Authorization'] = `Bearer ${latestAccessToken}`
        const retryRes = await fetch(finalUrl, { ...options, headers })
        if (!retryRes.ok) throw new Error(`Retry failed! status: ${retryRes.status}`)
        return retryRes.json()
      }

      const freshToken = await refreshTokenLogic()
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`
        const retryRes = await fetch(finalUrl, { ...options, headers })
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

    // Support for blob response types
    if (options.responseType === 'blob') {
      return response.blob()
    }

    return response.json()
  }

  return performRequest()
}

// Named export 'api' for consistent usage in billing/inventory
export const api = {
  get: (url: string, options?: any) => rawRequest(url, { ...options, method: 'GET' }),
  post: (url: string, data: any, options?: any) => rawRequest(url, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: (url: string, data: any, options?: any) => rawRequest(url, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  patch: (url: string, data: any, options?: any) => rawRequest(url, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  delete: (url: string, options?: any) => rawRequest(url, { ...options, method: 'DELETE' }),
}

// Keep useApi for compatibility
export const useApi = () => {
  return {
    ...api,
    download: async (endpoint: string, filename: string, method: string = 'GET', data?: any) => {
       const res = await rawRequest(endpoint, { method, body: data ? JSON.stringify(data) : undefined, responseType: 'blob' })
       const url = window.URL.createObjectURL(res)
       const link = document.createElement('a')
       link.href = url
       link.download = filename
       link.click()
       window.URL.revokeObjectURL(url)
    }
  }
}
