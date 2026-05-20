/**
 * Auth podaci u sessionStorage — svaki tab browsera ima svoju sesiju.
 * localStorage se ne koristi za login (deljen je između tabova).
 */

const KEYS = {
  access: 'honey_access_token',
  refresh: 'honey_refresh_token',
  user: 'honey_user',
}

function parseUser(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Jednokratno: prebaci stare tokene iz localStorage u ovaj tab, pa obriši deljene ključeve. */
export function migrateLegacyAuthFromLocalStorage() {
  if (sessionStorage.getItem(KEYS.access)) return

  const access = localStorage.getItem(KEYS.access)
  const refresh = localStorage.getItem(KEYS.refresh)
  const user = localStorage.getItem(KEYS.user)

  if (access) sessionStorage.setItem(KEYS.access, access)
  if (refresh) sessionStorage.setItem(KEYS.refresh, refresh)
  if (user) sessionStorage.setItem(KEYS.user, user)

  localStorage.removeItem(KEYS.access)
  localStorage.removeItem(KEYS.refresh)
  localStorage.removeItem(KEYS.user)
}

export function getAccessToken() {
  return sessionStorage.getItem(KEYS.access)
}

export function getRefreshToken() {
  return sessionStorage.getItem(KEYS.refresh)
}

export function getStoredUser() {
  return parseUser(sessionStorage.getItem(KEYS.user))
}

export function setAuthSession({ accessToken, refreshToken, user }) {
  if (accessToken) sessionStorage.setItem(KEYS.access, accessToken)
  if (refreshToken) sessionStorage.setItem(KEYS.refresh, refreshToken)
  if (user !== undefined) {
    if (user) sessionStorage.setItem(KEYS.user, JSON.stringify(user))
    else sessionStorage.removeItem(KEYS.user)
  }
  localStorage.removeItem(KEYS.access)
  localStorage.removeItem(KEYS.refresh)
  localStorage.removeItem(KEYS.user)
}

export function setStoredUser(user) {
  if (user) sessionStorage.setItem(KEYS.user, JSON.stringify(user))
  else sessionStorage.removeItem(KEYS.user)
  localStorage.removeItem(KEYS.user)
}

export function clearAuthSession() {
  sessionStorage.removeItem(KEYS.access)
  sessionStorage.removeItem(KEYS.refresh)
  sessionStorage.removeItem(KEYS.user)
  localStorage.removeItem(KEYS.access)
  localStorage.removeItem(KEYS.refresh)
  localStorage.removeItem(KEYS.user)
}
