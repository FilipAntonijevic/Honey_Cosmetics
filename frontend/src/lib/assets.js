/** Public assets (frontend/public) — respects Vite base path for GitHub Pages. */
export function publicUrl(path) {
  const clean = String(path).replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${clean}`
}

/** Product/category images served by the API (/images/...). */
export function apiImageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  if (api) {
    const root = api.replace(/\/api\/?$/i, '')
    return `${root}${path.startsWith('/') ? path : `/${path}`}`
  }

  return path.startsWith('/') ? path : `/${path}`
}
