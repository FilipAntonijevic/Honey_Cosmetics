/** Ograniči količinu u korpi prema stanju na lageru. */
import { getProductDisplayName } from './productLineName'

export function clampCartQuantity(quantity, stockQuantity) {
  const stock = Math.max(0, Number(stockQuantity) || 0)
  const qty = Number(quantity) || 0
  if (stock <= 0) return 0
  return Math.min(Math.max(1, qty), stock)
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
    const qty = inStock ? clampCartQuantity(item.quantity, stock) : Number(item.quantity) || 0
    next.push({
      ...item,
      name: getProductDisplayName({ name: p.name ?? item.name }),
      variantLabel: p.variantLabel ?? item.variantLabel ?? null,
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
    if (!isInStock(item)) return false
    const stock = item.stockQuantity ?? 0
    return stock > 0 && item.quantity > 0
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
      removedOutOfStock.push(getProductDisplayName({ name: p.name ?? item.name }))
      continue
    }
    const qty = clampCartQuantity(item.quantity, stock)
    if (qty !== item.quantity) adjusted = true
    if (qty > 0) {
      next.push({
        ...item,
        name: getProductDisplayName({ name: p.name ?? item.name }),
        variantLabel: p.variantLabel ?? item.variantLabel ?? null,
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
