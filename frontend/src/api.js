import axios from 'axios'

const BASE_URL = '/api'

const api = axios.create({ baseURL: BASE_URL })

// Separate instance for token refresh — avoids triggering the response interceptor recursively
const refreshApi = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('honey_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Only attempt refresh on 401, not for auth endpoints (login/register = bad creds, not expired token)
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.startsWith('/auth/')
    ) {
      return Promise.reject(error)
    }

    const storedRefresh = localStorage.getItem('honey_refresh_token')
    if (!storedRefresh) return Promise.reject(error)

    original._retry = true

    try {
      // Deduplicate concurrent refresh calls
      if (!refreshPromise) {
        refreshPromise = refreshApi
          .post('/auth/refresh', { refreshToken: storedRefresh })
          .finally(() => { refreshPromise = null })
      }

      const { data } = await refreshPromise
      localStorage.setItem('honey_access_token', data.accessToken)
      localStorage.setItem('honey_refresh_token', data.refreshToken)

      original.headers.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch {
      localStorage.removeItem('honey_access_token')
      localStorage.removeItem('honey_refresh_token')
      localStorage.removeItem('honey_user')
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(error)
    }
  },
)

export default api
