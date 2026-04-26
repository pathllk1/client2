const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
let cachedCSRFToken: string | undefined;

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

/**
 * Get CSRF token from cache or fetch it from the server
 * The server sends it in the X-CSRF-Token response header
 */
async function getCSRFToken(): Promise<string | undefined> {
  // Return cached token if available
  if (cachedCSRFToken) {
    return cachedCSRFToken;
  }

  // Try to read from document.cookie first (works for same-origin)
  const cookieToken = getCookie('csrfToken');
  if (cookieToken) {
    cachedCSRFToken = cookieToken;
    return cookieToken;
  }

  // For cross-origin, fetch it from the server
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
    
    // Extract CSRF token from response header
    const token = response.headers.get('X-CSRF-Token');
    if (token) {
      cachedCSRFToken = token;
      console.log('✅ CSRF token fetched from server header:', token.substring(0, 8) + '...');
      return token;
    }
  } catch (e) {
    console.warn('⚠️ Failed to fetch CSRF token:', e);
  }

  return undefined;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Add CSRF token for state-changing methods
  const method = options.method?.toUpperCase() || 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = await getCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
      console.log('✅ CSRF token sent in header:', csrfToken.substring(0, 8) + '...');
    } else {
      console.warn('⚠️ No CSRF token found for state-changing request');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Update cached CSRF token from response header if present
  const newToken = response.headers.get('X-CSRF-Token');
  if (newToken) {
    cachedCSRFToken = newToken;
  }

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    // Handle unauthorized - maybe redirect to login or clear state
    // This will be coordinated with useAuth
  }

  return response;
}
