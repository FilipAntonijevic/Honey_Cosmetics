import { getProductDisplayName } from '../utils/productLineName'

const collator = new Intl.Collator('sr', { numeric: true, sensitivity: 'base' })

export function compareProductNames(a, b) {
  const nameA = getProductDisplayName(a)
  const nameB = getProductDisplayName(b)
  return collator.compare(nameA, nameB)
}

export function sortProductsByName(products) {
  return [...products].sort(compareProductNames)
}
