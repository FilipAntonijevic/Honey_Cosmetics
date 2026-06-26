/** Public assets (frontend/public) — respects Vite base path for GitHub Pages. */
export function publicUrl(path) {
  const clean = String(path).replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${clean}`
}

/** Site logo — povećaj verziju posle zamene frontend/public/logo.png (cache bust). */
export function logoUrl() {
  return publicUrl('/logo.png?v=2')
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

/** Isto kao backend: /images/foo.jpg → /images/thumbs/foo.webp */
export function variantWebpFileName(path) {
  const fileName = String(path).replace(/^\//, '').split('/').pop() || ''
  if (!fileName) return ''
  const base = fileName.includes('.') ? fileName.replace(/\.[^.]+$/, '') : fileName
  return `${base}.webp`
}

function apiVariantUrl(path, folder) {
  if (!path || /^https?:\/\//i.test(path)) return ''
  const webpName = variantWebpFileName(path)
  if (!webpName) return ''
  return apiImageUrl(`/images/${folder}/${webpName}`)
}

/** Legacy JPEG varijanta (dok traje migracija). */
export function apiVariantUrlLegacy(path, folder) {
  if (!path || /^https?:\/\//i.test(path)) return ''
  const fileName = String(path).replace(/^\//, '').split('/').pop()
  if (!fileName) return ''
  return apiImageUrl(`/images/${folder}/${fileName}`)
}

/** Mala verzija (~64px) — blur placeholder. */
export function apiThumbnailUrl(path) {
  return apiVariantUrl(path, 'thumbs')
}

/** Srednja verzija (~800px) — brz oštar prikaz u listama. */
export function apiMediumUrl(path) {
  return apiVariantUrl(path, 'medium')
}
