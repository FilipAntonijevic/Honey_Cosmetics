import { getProductDisplayName } from '../utils/productLineName'
import { compareHardcodedProductNames } from './productCatalogSort'

const collator = new Intl.Collator('sr', { numeric: true, sensitivity: 'base' })

export function compareProductNames(a, b) {
  const nameA = getProductDisplayName(a)
  const nameB = getProductDisplayName(b)

  const hardcoded = compareHardcodedProductNames(nameA, nameB)
  if (hardcoded !== 0) return hardcoded

  return collator.compare(nameA, nameB)
}

export function sortProductsByName(products) {
  return [...products].sort(compareProductNames)
}
