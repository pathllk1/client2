const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Storage keys for auth data
 */
const AUTH_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  CSRF_TOKEN: 'auth_csrf_token',
};

export function setAuthData(data: { accessToken: string; refreshToken: string; csrfToken: string }) {
  localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, data.accessToken);
  localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, data.refreshToken);
  localStorage.setItem(AUTH_KEYS.CSRF_TOKEN, data.csrfToken);
}

export function clearAuthData() {
  localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(AUTH_KEYS.CSRF_TOKEN);
}

export function getAccessToken() {
  return localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken() {
  return localStorage.getItem(AUTH_KEYS.REFRESH_TOKEN);
}

export function getCSRFToken() {
  return localStorage.getItem(AUTH_KEYS.CSRF_TOKEN);
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers);

  // Set Content-Type
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Set Authorization Header (Access Token)
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set Refresh Token Header (for silent refresh)
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    headers.set('X-Refresh-Token', refreshToken);
  }

  // Set CSRF Token Header for state-changing requests
  const method = (options.method || 'GET').toUpperCase();
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (stateChangingMethods.includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'omit', // Tightest security: don't use cookies at all
  });


  // Check if token was refreshed silently by server and update storage
  // Only check if we are already logged in (have a token) and it's a JSON response
  const accessToken = getAccessToken();
  if (response.ok && accessToken) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const clonedResponse = response.clone();
      try {
        const data = await clonedResponse.json();
        if (data.tokenRefreshed && data.accessToken && data.csrfToken) {
          setAuthData({
            accessToken: data.accessToken,
            refreshToken: getRefreshToken() || '',
            csrfToken: data.csrfToken
          });
        }
      } catch (e) {
        // Not a JSON response or other error, ignore
      }
    }
  }

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    // Handle unauthorized - maybe clear state and redirect
    // clearAuthData();
  }

  return response;
}
