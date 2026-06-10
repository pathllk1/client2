import { ref } from 'vue'
import { authState, setAccessToken, setRefreshToken, clearAuth } from '@/stores/auth'

export const isGlobalLoading = ref(false)
let activeRequestsCount = 0

const startRequest = () => {
  activeRequestsCount++
  isGlobalLoading.value = true
}

const endRequest = () => {
  activeRequestsCount = Math.max(0, activeRequestsCount - 1)
  if (activeRequestsCount === 0) {
    isGlobalLoading.value = false
  }
}

let refreshPromise: Promise<string | null> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || '/api'

// ─── Proactive Token Refresh ────────────────────────────────────────────────
// Decodes JWT payload client-side (no verification — server does that).
// Used only to read the `exp` claim for scheduling the refresh timer.
export const decodeTokenPayload = (token: string): any | null => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

/**
 * Schedule a proactive refresh 2 minutes before the access token expires.
 * If the token has ≤2 min remaining, refresh immediately.
 * Called after login, after every successful refresh, and on app boot.
 */
export const scheduleTokenRefresh = (accessToken: string) => {
  if (refreshTimer) clearTimeout(refreshTimer)

  const payload = decodeTokenPayload(accessToken)
  if (!payload?.exp) return

  const expiresAtMs = payload.exp * 1000
  const now = Date.now()
  const bufferMs = 2 * 60 * 1000 // 2 minutes before expiry
  const delayMs = Math.max(0, expiresAtMs - now - bufferMs)

  refreshTimer = setTimeout(async () => {
    const newToken = await refreshTokenLogic()
    if (!newToken) {
      // Don't force logout — let the next API call's 401 handler deal with it
      console.warn('[Auth] Proactive refresh failed, will retry on next API call')
    }
  }, delayMs)
}

/** Cancel the scheduled refresh timer (called on logout) */
export const cancelTokenRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

// ─── Token Refresh Logic (race-condition-safe) ──────────────────────────────
// Uses the promise itself as the concurrency lock. All concurrent 401 callers
// share the same in-flight promise. No boolean flag needed.
const refreshTokenLogic = async (): Promise<string | null> => {
  // If a refresh is already in-flight, all callers share the same promise
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const baseUrl = getBaseUrl()
    const latestRefreshToken = localStorage.getItem('refresh_token') || authState.refreshToken
    if (!latestRefreshToken) return null
    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: latestRefreshToken })
      })
      if (!res.ok) throw new Error('Refresh failed')
      const data = await res.json()
      if (data?.accessToken) {
        setAccessToken(data.accessToken)
        if (data.refreshToken) setRefreshToken(data.refreshToken)
        scheduleTokenRefresh(data.accessToken)
        return data.accessToken
      }
      return null
    } catch {
      return null
    }
  })()

  try {
    return await refreshPromise
  } finally {
    // Only clears AFTER the inner IIFE has fully resolved/rejected.
    // All concurrent callers have already received their result by now.
    refreshPromise = null
  }
}

// ─── Transient Error Retry Logic ───────────────────────────────────────────
// These HTTP statuses indicate the server is temporarily overloaded or
// restarting (Vercel cold starts, DB reconnecting). Retrying after a
// short delay will usually succeed.
const TRANSIENT_STATUS_CODES = new Set([502, 503, 504])
const MAX_RETRIES = 3
const BASE_RETRY_DELAY_MS = 1000

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * fetch() wrapper with automatic retry + exponential backoff for
 * transient server errors (502/503/504) and network failures.
 */
const fetchWithRetry = async (
  input: string,
  init: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, init)

      // If the status is transient and we have retries left, wait & retry
      if (TRANSIENT_STATUS_CODES.has(response.status) && attempt < retries) {
        const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt) // 1s, 2s, 4s
        console.warn(
          `[API] ${init.method || 'GET'} ${input} → ${response.status}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`
        )
        await delay(waitMs)
        continue
      }

      return response
    } catch (err) {
      // Network error (offline, DNS failure, CORS preflight failure, etc.)
      if (attempt < retries && err instanceof TypeError) {
        const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
        console.warn(
          `[API] Network error for ${input}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries}):`,
          (err as Error).message
        )
        await delay(waitMs)
        continue
      }
      throw err
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error('fetchWithRetry: exhausted all retries')
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
    // Only set Content-Type when there's actually a body to send.
    // DELETE/GET requests without a body must NOT send this header —
    // Fastify's JSON parser rejects an empty body when Content-Type is application/json.
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  }

  if (authState.accessToken) headers['Authorization'] = `Bearer ${authState.accessToken}`
  if (authState.selectedFirmId) headers['X-Firm-ID'] = authState.selectedFirmId

  const performRequest = async (retry = true): Promise<any> => {
    // Use fetchWithRetry instead of bare fetch — handles 502/503/504 and network errors
    const response = await fetchWithRetry(finalUrl, { ...options, headers })

    const newToken = response.headers.get('X-New-Access-Token')
    if (newToken) {
      setAccessToken(newToken)
      scheduleTokenRefresh(newToken)
    }

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
      window.location.href = `${import.meta.env.BASE_URL}auth/login`
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

  startRequest()
  try {
    return await performRequest()
  } finally {
    endRequest()
  }
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
