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

/** Obogaći stavke korpe podacima iz kataloga (stanje, cena). */
export function enrichCartItems(cart, productsById) {
  const next = []
  for (const item of cart) {
    const p = productsById.get(item.id)
    if (!p) continue
    const stock = p.stockQuantity ?? 0
    const inStock = isInStock(p)
    const qty = inStock ? clampCartQuantity(item.quantity, stock) : item.quantity
    next.push({
      ...item,
      name: p.name ?? item.name,
      price: p.price ?? item.price,
      imageUrl: p.imageUrl ?? item.imageUrl,
      description: p.description ?? item.description,
      stockQuantity: stock,
      inStock,
      quantity: qty,
    })
  }
  return next
}

/** Samo stavke koje mogu u porudžbinu. */
export function getCheckoutCart(cart) {
  return cart.filter((item) => {
    if (item.inStock === false) return false
    if (item.stockQuantity != null) return item.stockQuantity > 0
    return item.inStock === true
  })
}

/**
 * @returns {{ cart: array, adjusted: boolean, message: string|null, removedOutOfStock: string[] }}
 */
export function applyStockLimitsToCart(cart, productsById) {
  let adjusted = false
  const removedOutOfStock = []
  const next = []

  for (const item of cart) {
    const p = productsById.get(item.id)
    if (!p) {
      adjusted = true
      continue
    }
    const stock = p.stockQuantity ?? 0
    if (!isInStock(p)) {
      adjusted = true
      removedOutOfStock.push(p.name ?? item.name)
      continue
    }
    const qty = clampCartQuantity(item.quantity, stock)
    if (qty !== item.quantity) adjusted = true
    if (qty > 0) {
      next.push({
        ...item,
        name: p.name ?? item.name,
        price: p.price ?? item.price,
        imageUrl: p.imageUrl ?? item.imageUrl,
        stockQuantity: stock,
        inStock: true,
        quantity: qty,
      })
    }
  }

  let message = null
  if (removedOutOfStock.length > 0) {
    message = removedOutOfStock.length === 1
      ? `${removedOutOfStock[0]} više nije na stanju i uklonjen je iz korpe.`
      : 'Neki proizvodi više nisu na stanju i uklonjeni su iz korpe.'
  } else if (adjusted) {
    message = 'Nema dovoljno proizvoda na stanju.'
  }

  return { cart: next, adjusted, message, removedOutOfStock }
}
