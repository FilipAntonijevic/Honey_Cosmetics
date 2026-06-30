import { stripVariantFromName } from '../utils/productLineName'

const BIAB_CODE_RE = /biab\s+b0([1-5])\b/i
const TOP_COAT_BRILLIANT_RE = /^top coat brilliant\b/i
const TOP_COAT_PLAIN_RE = /^top coat\b/i
const TOP_COAT_FAMILY_RE = /\btop coat\b/i

/** @returns {{ group: string, order: number } | null} */
export function getHardcodedProductSortOrder(name) {
  const base = stripVariantFromName(name).trim()
  if (!base) return null

  const biabMatch = base.match(BIAB_CODE_RE)
  if (biabMatch) {
    return { group: 'biab', order: Number(biabMatch[1]) }
  }

  if (TOP_COAT_BRILLIANT_RE.test(base)) {
    return { group: 'topcoat', order: 2 }
  }

  if (TOP_COAT_PLAIN_RE.test(base) && !/colored/i.test(base)) {
    return { group: 'topcoat', order: 1 }
  }

  return null
}

export function isTopCoatFamily(name) {
  const base = stripVariantFromName(name).trim()
  return TOP_COAT_FAMILY_RE.test(base)
}

export function compareHardcodedProductNames(nameA, nameB) {
  const orderA = getHardcodedProductSortOrder(nameA)
  const orderB = getHardcodedProductSortOrder(nameB)

  if (orderA && orderB && orderA.group === orderB.group && orderA.order !== orderB.order) {
    return orderA.order - orderB.order
  }

  const aPinnedTop = orderA?.group === 'topcoat'
  const bPinnedTop = orderB?.group === 'topcoat'
  const aOtherTop = !orderA && isTopCoatFamily(nameA)
  const bOtherTop = !orderB && isTopCoatFamily(nameB)

  if (aPinnedTop && bOtherTop) return -1
  if (bPinnedTop && aOtherTop) return 1

  return 0
}
