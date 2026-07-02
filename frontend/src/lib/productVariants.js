import { getProductDisplayName } from '../utils/productLineName'
import { sortProductsByName } from './productNameSort'

/** Opcije (gramaže) proizvoda — sortirane redosledom koji je zadao admin. */
export function getVariantOptions(product) {
  const variants = product?.variants
  if (!variants?.length) return []
  return variants
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0))
}

export function productHasVariantPicker(product) {
  return (product?.variants?.length ?? 0) > 1
}

/**
 * Najskuplja opcija (najveća gramaža). Izjednačena cena → veća opcija (manji sortOrder), pa manji id.
 * @param {object} [opts]
 * @param {boolean} [opts.inStockOnly] Uzmi u obzir samo opcije koje su na stanju.
 */
export function getMaxPriceVariant(options, { inStockOnly = false } = {}) {
  const pool = inStockOnly ? options.filter((o) => o.inStock) : options
  if (!pool.length) return null
  return pool.reduce((best, o) => {
    const bp = best.price ?? 0
    const op = o.price ?? 0
    if (op > bp) return o
    if (op === bp) {
      const bs = best.sortOrder ?? 0
      const os = o.sortOrder ?? 0
      if (os < bs) return o
      if (os === bs && (o.id ?? 0) < (best.id ?? 0)) return o
    }
    return best
  }, pool[0])
}

/** Opcija koja se prikazuje na karticama — uvek najskuplja (najveća gramaža), bez obzira na stanje. */
export function getDefaultVariant(product) {
  const options = getVariantOptions(product)
  if (!options.length) return null
  return getMaxPriceVariant(options) ?? options[0]
}

/**
 * Opcija koja se PODRAZUMEVANO selektuje na stranici proizvoda:
 * najskuplja koja je na stanju; ako nijedna nije na stanju — najskuplja (biće prikazana kao nedostupna).
 */
export function getDefaultSelectedVariant(product) {
  const options = getVariantOptions(product)
  if (!options.length) return null
  return getMaxPriceVariant(options, { inStockOnly: true }) ?? getMaxPriceVariant(options) ?? options[0]
}

export function getDefaultVariantLabel(product) {
  return getDefaultVariant(product)?.variantLabel ?? product?.variantLabel ?? null
}

export function pickDefaultVariantProduct(product, variants = product?.variants, productsById = null) {
  if (!variants?.length) return product
  if (variants.length === 1) {
    const only = variants[0]
    if (only.id === product.id) return product
    return productsById?.get(only.id) ?? { ...product, ...only, variants: product.variants ?? variants }
  }

  const chosen = getMaxPriceVariant(variants) ?? variants[0]
  if (chosen.id === product.id) return product
  const full = productsById?.get(chosen.id)
  return full
    ? { ...full, variants: product.variants ?? variants }
    : { ...product, ...chosen, variants: product.variants ?? variants }
}

export function formatProductLineName(name) {
  return getProductDisplayName({ name })
}

export function resolveGroupKey(product) {
  if (!product) return null
  return product.variantGroupId ?? product.id
}

/** Jedna stavka po grupi varijanti + svi ID-evi u grupi (za admin dodelu kategorije). */
export function groupProductsWithMembers(products) {
  const byGroup = new Map()
  for (const product of products) {
    const key = resolveGroupKey(product)
    const entry = byGroup.get(key)
    if (!entry) {
      byGroup.set(key, { key, memberIds: [product.id], rep: product })
    } else {
      entry.memberIds.push(product.id)
      if (product.isDefaultVariant && !entry.rep.isDefaultVariant) entry.rep = product
    }
  }
  return sortProductsByName([...byGroup.values()].map((g) => g.rep)).map((rep) =>
    byGroup.get(resolveGroupKey(rep)),
  )
}

export function expandSelectionWithGroupMembers(selectedIds, products) {
  const idSet = new Set(selectedIds)
  const groups = groupProductsWithMembers(products)
  const expanded = new Set(selectedIds)
  for (const group of groups) {
    if (group.memberIds.some((id) => idSet.has(id))) {
      group.memberIds.forEach((id) => expanded.add(id))
    }
  }
  return [...expanded]
}

/** Jedna kartica po grupi varijanti; prikazuje se podrazumevana opcija. */
export function groupProductsForDisplay(products) {
  const allById = new Map(products.map((p) => [p.id, p]))
  const byGroup = new Map()
  for (const product of products) {
    const key = resolveGroupKey(product)
    if (!byGroup.has(key)) {
      byGroup.set(key, pickDefaultVariantProduct(product, product.variants, allById))
    }
  }
  return sortProductsByName([...byGroup.values()])
}
