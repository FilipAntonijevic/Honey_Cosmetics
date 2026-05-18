import axios from 'axios'
import { apiImageUrl, apiMediumUrl, apiThumbnailUrl, apiVariantUrlLegacy } from './assets'

/** Keš blob/http URL-ova — ApiImage i karusel dele iste učitane slike. */
const cache = new Map()

export function getPreloadedImage(url) {
  if (!url) return ''
  const key = apiImageUrl(url)
  return cache.get(key) || ''
}

/** URL spreman za <img> — koristi keš posle preloadProductImagesAwait. */
export function resolveProductImageSrc(imageUrl) {
  return getPreloadedImage(imageUrl) || apiImageUrl(imageUrl) || ''
}

export function attachResolvedImageSrc(products) {
  if (!Array.isArray(products)) return []
  return products.map((p) => ({
    ...p,
    imageSrc: resolveProductImageSrc(p?.imageUrl),
  }))
}

/** Prvih `count` sa keširanim slikama, ostali čekaju preload u pozadini. */
export function attachResolvedImageSrcPartial(products, count) {
  if (!Array.isArray(products)) return []
  return products.map((p, i) => ({
    ...p,
    imageSrc: i < count ? resolveProductImageSrc(p?.imageUrl) : '',
  }))
}

function preloadUrl(key) {
  if (!key || cache.has(key)) return Promise.resolve()
  return preloadUrlOnce(key)
}

function preloadUrlOnce(key) {
  if (!key || cache.has(key)) return Promise.resolve()

  if (key.includes('ngrok')) {
    return axios
      .get(key, {
        responseType: 'blob',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
      .then(async (res) => {
        const blobUrl = URL.createObjectURL(res.data)
        cache.set(key, blobUrl)
        const img = new Image()
        img.src = blobUrl
        if (img.decode) await img.decode().catch(() => {})
      })
      .catch(() => {})
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = async () => {
      cache.set(key, key)
      if (img.decode) await img.decode().catch(() => {})
      resolve()
    }
    img.onerror = () => resolve()
    img.src = key
  })
}

function preloadVariant(webpKey, legacyKey) {
  if (!webpKey) return Promise.resolve()
  if (cache.has(webpKey)) return Promise.resolve()
  return preloadUrlOnce(webpKey).catch(() =>
    legacyKey && !cache.has(legacyKey) ? preloadUrlOnce(legacyKey) : Promise.resolve(),
  )
}

function preloadOne(imageUrl, { full = true } = {}) {
  const key = apiImageUrl(imageUrl)
  if (!key) return Promise.resolve()
  if (cache.has(key)) return Promise.resolve()

  const thumbKey = apiThumbnailUrl(imageUrl)
  const thumbLegacy = apiVariantUrlLegacy(imageUrl, 'thumbs')
  const mediumKey = apiMediumUrl(imageUrl)
  const mediumLegacy = apiVariantUrlLegacy(imageUrl, 'medium')

  let chain = Promise.resolve()
  if (thumbKey || thumbLegacy)
    chain = chain.then(() => preloadVariant(thumbKey, thumbLegacy))
  if (mediumKey || mediumLegacy)
    chain = chain.then(() => preloadVariant(mediumKey, mediumLegacy))
  if (full) {
    chain = chain.then(() => preloadUrlOnce(key))
  } else {
    chain = chain.then(async () => {
      if (!mediumKey && !mediumLegacy) {
        await preloadUrlOnce(key)
        return
      }
      await preloadVariant(mediumKey, mediumLegacy)
      const cachedMedium = (mediumKey && cache.get(mediumKey)) || (mediumLegacy && cache.get(mediumLegacy))
      if (cachedMedium) cache.set(key, cachedMedium)
    })
  }

  return chain
}

/** Lista/kartice — dovoljna je srednja rezolucija. */
export function preloadProductImagesMedium(products) {
  if (!Array.isArray(products)) return
  for (const p of products) preloadOne(p?.imageUrl, { full: false })
}

export function preloadProductImagesMediumAwait(products) {
  if (!Array.isArray(products) || products.length === 0) return Promise.resolve()
  return Promise.all(products.map((p) => preloadOne(p?.imageUrl, { full: false })))
}

/** Pokreni preload u pozadini (ne čeka) — puna rezolucija. */
export function preloadProductImages(products) {
  if (!Array.isArray(products)) return
  for (const p of products) preloadOne(p?.imageUrl, { full: true })
}

/** Sačekaj sve slike bestsellera pre prikaza karusela. */
export function preloadProductImagesAwait(products) {
  if (!Array.isArray(products) || products.length === 0) return Promise.resolve()
  return Promise.all(products.map((p) => preloadOne(p?.imageUrl)))
}
