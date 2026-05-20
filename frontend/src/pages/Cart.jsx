import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import ApiImage from '../components/ApiImage'
import { applyStockLimitsToCart, clampCartQuantity } from '../utils/stock'

export default function Cart() {
  const { cart, removeFromCart, setCart, user, setToast } = useStore()
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState([])
  const [adjustedIds, setAdjustedIds] = useState(() => new Set())

  useEffect(() => {
    if (!cart.length) return
    api.get('/products').then(({ data }) => {
      setCatalog(data)
      const byId = new Map(data.map((p) => [p.id, p]))
      const { cart: next, adjusted, message } = applyStockLimitsToCart(cart, byId)
      if (adjusted) {
        setCart(next)
        if (message) setToast(message)
        const ids = new Set()
        cart.forEach((item) => {
          const p = byId.get(item.id)
          const capped = clampCartQuantity(item.quantity, p?.stockQuantity ?? 0)
          if (capped !== item.quantity && capped > 0) ids.add(item.id)
        })
        setAdjustedIds(ids)
        window.setTimeout(() => setAdjustedIds(new Set()), 2500)
      }
    }).catch(() => {})
  }, [cart.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const productsById = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog])

  const price = (item) => Number(productsById.get(item.id)?.price ?? item.price)

  const total = cart.reduce((sum, item) => sum + price(item) * item.quantity, 0)

  const changeQty = (id, delta) => {
    const product = productsById.get(id)
    const stock = product?.stockQuantity ?? itemStock(id)
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const requested = item.quantity + delta
        const nextQty = clampCartQuantity(requested, stock)
        if (nextQty < requested && delta > 0) {
          setToast('Nema dovoljno proizvoda na stanju.')
          setAdjustedIds((s) => new Set(s).add(id))
          window.setTimeout(() => setAdjustedIds(new Set()), 2500)
        }
        return { ...item, quantity: Math.max(1, nextQty) }
      }),
    )
    if (user && delta !== 0) {
      api.post('/cart', { productId: id, quantity: delta }).catch(() => {})
    }
  }

  function itemStock(id) {
    return productsById.get(id)?.stockQuantity ?? cart.find((i) => i.id === id)?.stockQuantity ?? 999
  }

  const fmt = (n) => Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="cart-page shell">
      {!cart.length ? (
        <div className="cart-empty">
          <p>Vaša korpa je prazna.</p>
          <Link className="cta" to="/shop">Nastavi kupovinu</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-left">
            <div className="cart-col-headers">
              <span>PROIZVOD</span>
              <span className="cart-col-total-label">CENA</span>
            </div>
            <div className="cart-divider" />

            {cart.map((item) => {
              const stock = itemStock(item.id)
              const atMax = item.quantity >= stock
              return (
                <div key={item.id} className="cart-row">
                  <div className="cart-row-left">
                    <div className="cart-img-wrap">
                      {item.imageUrl
                        ? <ApiImage src={item.imageUrl} alt={item.name} className="cart-img" variant="medium" />
                        : <div className="cart-img-ph" />}
                    </div>
                    <div className="cart-info">
                      <div className="cart-name">{item.name}</div>
                      <div className="cart-unit-price">{fmt(price(item))} RSD</div>
                      {adjustedIds.has(item.id) && (
                        <div className="cart-stock-notice" role="status">
                          Količina je smanjena na dostupno stanje ({item.quantity} kom).
                        </div>
                      )}
                      <div className="cart-qty-row">
                        <div className={`cart-qty${adjustedIds.has(item.id) ? ' cart-qty--adjusted' : ''}`}>
                          <button type="button" className="cart-qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                          <span className="cart-qty-num">{item.quantity}</span>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            disabled={atMax}
                            onClick={() => changeQty(item.id, +1)}
                          >
                            +
                          </button>
                        </div>
                        <button type="button" className="cart-remove" onClick={() => removeFromCart(item.id)} title="Ukloni">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="cart-row-price">{fmt(price(item) * item.quantity)} RSD</div>
                  <div className="cart-divider" />
                </div>
              )
            })}

            <Link className="cart-continue" to="/shop">← Nastavi kupovinu</Link>
          </div>

          <div className="cart-right">
            <div className="cart-summary">
              <div className="cart-summary-title">UKUPNA VREDNOST KORPE</div>
              <div className="cart-estimate">
                <div className="cart-estimate-label">Procenjeni ukupan iznos</div>
                <div className="cart-estimate-value">{fmt(total)} RSD</div>
              </div>
              <div className="cart-shipping-note">Dostava će biti izračunata na kasi</div>
              <button
                type="button"
                className="cart-checkout-btn"
                onClick={() => navigate('/checkout')}
              >
                Nastavi na plaćanje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
