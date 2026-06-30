import { stripVariantFromName } from '../utils/productLineName'

const BIAB_CODE_RE = /biab\s+b0([1-5])\b/i
const TOP_COAT_BRILLIANT_RE = /^top coat brilliant\b/i
const TOP_COAT_PLAIN_RE = /^top coat\b/i

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
