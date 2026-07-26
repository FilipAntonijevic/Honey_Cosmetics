/** Kratak keš shop liste — povratak je brz, ali katalog ne ostaje trajno zastareo. */
const SHOP_CACHE_TTL_MS = 60_000

let cache = {
  key: null,
  products: [],
  hasMore: false,
  page: 1,
  writtenAt: 0,
}

export function readShopListCache(key) {
  if (cache.key !== key) return null
  if (Date.now() - cache.writtenAt > SHOP_CACHE_TTL_MS) {
    clearShopListCache()
    return null
  }
  return cache
}

export function writeShopListCache(key, { products, hasMore, page }) {
  cache = { key, products, hasMore, page, writtenAt: Date.now() }
}

export function clearShopListCache() {
  cache = { key: null, products: [], hasMore: false, page: 1, writtenAt: 0 }
}
