/** Ograniči količinu u korpi prema stanju na lageru. */
export function clampCartQuantity(quantity, stockQuantity) {
  const stock = Math.max(0, Number(stockQuantity) || 0)
  if (stock <= 0) return 0
  return Math.min(Math.max(1, quantity), stock)
}

export function isInStock(product) {
  if (product?.inStock != null) return Boolean(product.inStock)
  return (product?.stockQuantity ?? 0) > 0
}

/**
 * @returns {{ cart: array, adjusted: boolean, message: string|null }}
 */
export function applyStockLimitsToCart(cart, productsById) {
  let adjusted = false
  const next = []

  for (const item of cart) {
    const p = productsById.get(item.id)
    const stock = p?.stockQuantity ?? 0
    if (stock <= 0) {
      adjusted = true
      continue
    }
    const qty = clampCartQuantity(item.quantity, stock)
    if (qty !== item.quantity) adjusted = true
    if (qty > 0) next.push({ ...item, quantity: qty })
  }

  return {
    cart: next,
    adjusted,
    message: adjusted ? 'Nema dovoljno proizvoda na stanju.' : null,
  }
}
