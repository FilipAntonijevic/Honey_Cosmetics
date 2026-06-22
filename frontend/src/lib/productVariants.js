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

/** Podrazumevana opcija — bira je admin (isDefault), pa prva po redosledu. */
export function getDefaultVariant(product) {
  const options = getVariantOptions(product)
  if (!options.length) return null
  return options.find((v) => v.isDefault) ?? options[0]
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

  const chosen = variants.find((v) => v.isDefault) ?? variants.find((v) => v.inStock) ?? variants[0]
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
