import axios from 'axios'
import { apiImageUrl } from './assets'

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

function preloadOne(imageUrl) {
  const key = apiImageUrl(imageUrl)
  if (!key) return Promise.resolve()
  if (cache.has(key)) return Promise.resolve()

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

/** Pokreni preload u pozadini (ne čeka). */
export function preloadProductImages(products) {
  if (!Array.isArray(products)) return
  for (const p of products) preloadOne(p?.imageUrl)
}

/** Sačekaj sve slike bestsellera pre prikaza karusela. */
export function preloadProductImagesAwait(products) {
  if (!Array.isArray(products) || products.length === 0) return Promise.resolve()
  return Promise.all(products.map((p) => preloadOne(p?.imageUrl)))
}
