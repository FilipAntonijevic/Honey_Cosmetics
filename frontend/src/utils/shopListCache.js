/** Keš shop liste — sprečava ponovni API poziv pri povratku na isti prikaz. */
let cache = {
  key: null,
  products: [],
  hasMore: false,
  page: 1,
}

export function readShopListCache(key) {
  if (cache.key !== key) return null
  return cache
}

export function writeShopListCache(key, { products, hasMore, page }) {
  cache = { key, products, hasMore, page }
}

export function clearShopListCache() {
  cache = { key: null, products: [], hasMore: false, page: 1 }
}
