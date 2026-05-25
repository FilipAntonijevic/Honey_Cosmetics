import axios from 'axios'
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  migrateLegacyAuthFromLocalStorage,
  setAuthSession,
} from './utils/authStorage'

migrateLegacyAuthFromLocalStorage()

const BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api'
).replace(/\/$/, '')
const IS_NGROK = BASE_URL.includes('ngrok')

const api = axios.create({ baseURL: BASE_URL })

// Separate instance for token refresh — avoids triggering the response interceptor recursively
const refreshApi = axios.create({ baseURL: BASE_URL })

function applyRequestHeaders(config) {
  if (IS_NGROK) config.headers['ngrok-skip-browser-warning'] = 'true'
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}

api.interceptors.request.use(applyRequestHeaders)
refreshApi.interceptors.request.use((config) => {
  if (IS_NGROK) config.headers['ngrok-skip-browser-warning'] = 'true'
  return config
})

let refreshPromise = null

/** Refresh access token without sending a (possibly expired) Bearer header. */
export async function refreshSession(refreshToken) {
  const { data } = await refreshApi.post('/auth/refresh', { refreshToken })
  setAuthSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  })
  return data
}

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

    const storedRefresh = getRefreshToken()
    if (!storedRefresh) return Promise.reject(error)

    original._retry = true

    try {
      // Deduplicate concurrent refresh calls
      if (!refreshPromise) {
        refreshPromise = refreshSession(storedRefresh)
          .finally(() => { refreshPromise = null })
      }

      const data = await refreshPromise

      original.headers.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch {
      clearAuthSession()
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(error)
    }
  },
)

export default api
