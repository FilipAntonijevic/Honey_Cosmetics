export function computeCheckoutTotals({
  subtotal = 0,
  discount = 0,
  freeShippingThreshold = 10000,
  shippingCost = 430,
} = {}) {
  const itemsTotal = Math.max(0, Number(subtotal) - Number(discount))
  const threshold = Number(freeShippingThreshold) || 0
  const baseShipping = Math.max(0, Number(shippingCost) || 0)
  const freeShippingApplied = threshold > 0 && itemsTotal >= threshold
  const shipping = freeShippingApplied ? 0 : baseShipping
  const grandTotal = itemsTotal + shipping
  return { itemsTotal, shipping, grandTotal, freeShippingApplied }
}
