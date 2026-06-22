import { resolveProductTypeApi } from './productTypes'

/** Podrazumevana gramaza po tipu/kategoriji (prva u nizu). */
const VARIANT_RULES = [
  {
    match: ({ productType }) => resolveProductTypeApi(productType) === 'Gel Color Polish',
    options: ['15ml', '8ml'],
  },
  {
    match: ({ productType, category }) =>
      resolveProductTypeApi(productType) === 'Builder Gelovi'
      && /hard/i.test(category ?? ''),
    options: ['15gr', '38gr'],
  },
  {
    match: ({ productType, category }) =>
      resolveProductTypeApi(productType) === 'Builder Gelovi'
      && /jelly/i.test(category ?? ''),
    options: ['38gr'],
  },
  {
    match: ({ productType, category }) =>
      resolveProductTypeApi(productType) === 'Builder Gelovi'
      && /biab/i.test(category ?? ''),
    options: ['15ml'],
  },
  {
    match: ({ productType }) => resolveProductTypeApi(productType) === 'Baze',
    options: ['15ml'],
  },
  {
    match: ({ productType }) => resolveProductTypeApi(productType) === 'Top Coat',
    options: ['15ml'],
  },
  {
    match: ({ productType, category }) =>
      resolveProductTypeApi(productType) === 'Nega Kože'
      && /(ulje|zanoktice)/i.test(category ?? ''),
    options: ['15ml'],
  },
]

export function getConfiguredVariantOptions(product) {
  if (!product) return null
  const ctx = {
    productType: product.productType,
    category: product.category,
  }
  const rule = VARIANT_RULES.find((r) => r.match(ctx))
  return rule?.options ?? null
}

export function productHasVariantPicker(product) {
  const fromApi = product?.variants?.length > 1
  const configured = getConfiguredVariantOptions(product)
  return fromApi || (configured?.length ?? 0) > 1
}

export function getDefaultVariantLabel(product) {
  const configured = getConfiguredVariantOptions(product)
  return configured?.[0] ?? product?.variants?.[0]?.variantLabel ?? null
}

export function pickDefaultVariantProduct(product, variants = product?.variants, productsById = null) {
  if (!variants?.length) return product
  if (variants.length === 1) {
    const only = variants[0]
    if (only.id === product.id) return product
    return productsById?.get(only.id) ?? { ...product, ...only, variants: product.variants ?? variants }
  }

  const configured = getConfiguredVariantOptions(product)
  const preferredLabel = configured?.[0]
  const preferred = preferredLabel
    ? variants.find((v) => v.variantLabel?.toLowerCase() === preferredLabel.toLowerCase())
    : null
  const inStock = variants.find((v) => v.inStock)
  const chosen = preferred ?? inStock ?? variants[0]
  if (chosen.id === product.id) return product
  const full = productsById?.get(chosen.id)
  return full
    ? { ...full, variants: product.variants ?? variants }
    : { ...product, ...chosen, variants: product.variants ?? variants }
}

import { getProductDisplayName } from '../utils/productLineName'
import { sortProductsByName } from './productNameSort'

export function formatProductLineName(name) {
  return getProductDisplayName({ name })
}

export function resolveGroupKey(product) {
  if (!product) return null
  return product.variantGroupId ?? product.id
}

/** Jedna kartica po grupi varijanti; podrazumevana gramaza 15ml/15gr. */
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
