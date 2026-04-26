const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
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
    const csrfToken = getCookie('csrfToken');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    } else {
      console.warn('⚠️ No CSRF token found in cookies for state-changing request');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    // Handle unauthorized - maybe redirect to login or clear state
    // This will be coordinated with useAuth
  }

  return response;
}
