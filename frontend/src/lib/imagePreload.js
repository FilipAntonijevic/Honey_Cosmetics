import axios from 'axios'
import {
  apiImageUrl,
  apiMediumUrl,
  apiThumbnailUrl,
  apiVariantUrlLegacy,
} from './assets'

/** Keš blob/http URL-ova — ApiImage i karusel dele iste učitane slike. */
const cache = new Map()

export function getPreloadedImage(url) {
  if (!url) return ''
  const key = apiImageUrl(url)
  return cache.get(key) || ''
}

/** Keširani URL za thumb/medium/full varijantu (brži koraci u ApiImage). */
export function getCachedVariantUrl(imageUrl, variant) {
  if (!imageUrl) return ''
  if (variant === 'full') return getPreloadedImage(imageUrl)

  const webpKey = variant === 'thumb' ? apiThumbnailUrl(imageUrl) : apiMediumUrl(imageUrl)
  if (webpKey && cache.has(webpKey)) return cache.get(webpKey)

  const legacyKey =
    variant === 'thumb'
      ? apiVariantUrlLegacy(imageUrl, 'thumbs')
      : apiVariantUrlLegacy(imageUrl, 'medium')
  if (legacyKey && cache.has(legacyKey)) return cache.get(legacyKey)

  return ''
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

  const thumbKey = apiThumbnailUrl(imageUrl)
  const thumbLegacy = apiVariantUrlLegacy(imageUrl, 'thumbs')
  const mediumKey = apiMediumUrl(imageUrl)
  const mediumLegacy = apiVariantUrlLegacy(imageUrl, 'medium')

  let chain = Promise.resolve()
  if (thumbKey || thumbLegacy) chain = chain.then(() => preloadVariant(thumbKey, thumbLegacy))
  if (mediumKey || mediumLegacy) chain = chain.then(() => preloadVariant(mediumKey, mediumLegacy))

  if (full) {
    chain = chain.then(() => preloadUrlOnce(key))
    return chain
  }

  return chain.then(async () => {
    if (!mediumKey && !mediumLegacy) {
      await preloadUrlOnce(key)
      return
    }
    await preloadVariant(mediumKey, mediumLegacy)
    const cachedMedium =
      (mediumKey && cache.get(mediumKey)) || (mediumLegacy && cache.get(mediumLegacy))
    if (cachedMedium) cache.set(key, cachedMedium)
  })
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

/** Slideshow / direktne slike iz baze — thumb → medium → full. */
export function resolveDirectImageSrc(imageUrl) {
  return getPreloadedImage(imageUrl) || apiImageUrl(imageUrl) || ''
}

export function preloadDirectImagesAwait(imageUrls) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) return Promise.resolve()
  return Promise.all(
    imageUrls.map((url) => {
      if (!url) return Promise.resolve()
      const storagePath = url.startsWith('/images/') ? url : null
      if (storagePath) return preloadOne(storagePath, { full: true })
      const key = apiImageUrl(url)
      return key ? preloadUrlOnce(key) : Promise.resolve()
    }),
  )
}

/** Samo thumb + medium u pozadini (ne blokira prikaz). */
export function preloadDirectImagesProgressive(imageUrls) {
  if (!Array.isArray(imageUrls)) return
  for (const url of imageUrls) {
    if (!url) continue
    if (url.startsWith('/images/')) preloadOne(url, { full: true })
    else {
      const key = apiImageUrl(url)
      if (key) preloadUrlOnce(key)
    }
  }
}
