import { getProductDisplayName } from '../utils/productLineName'
import { getHardcodedProductSortOrder } from './productCatalogSort'

const collator = new Intl.Collator('sr', { numeric: true, sensitivity: 'base' })

export function compareProductNames(a, b) {
  const nameA = getProductDisplayName(a)
  const nameB = getProductDisplayName(b)

  const orderA = getHardcodedProductSortOrder(nameA)
  const orderB = getHardcodedProductSortOrder(nameB)
  if (orderA && orderB && orderA.group === orderB.group && orderA.order !== orderB.order) {
    return orderA.order - orderB.order
  }

  return collator.compare(nameA, nameB)
}

export function sortProductsByName(products) {
  return [...products].sort(compareProductNames)
}
