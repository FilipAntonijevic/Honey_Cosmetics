import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import ApiImage from '../components/ApiImage'
import FreeShippingBar from '../components/FreeShippingBar'
import useSiteLinks from '../hooks/useSiteLinks'
import { clampCartQuantity } from '../utils/stock'

export default function Cart() {
  const { checkoutCart, removeFromCart, setCart, user, setToast, refreshCartStock } = useStore()
  const { freeShippingThreshold } = useSiteLinks()
  const navigate = useNavigate()

  useEffect(() => {
    refreshCartStock()
  }, [refreshCartStock])

  const price = (item) => Number(item.price)

  const total = checkoutCart.reduce((sum, item) => sum + price(item) * item.quantity, 0)

  const changeQty = (id, delta) => {
    const item = checkoutCart.find((i) => i.id === id)
    if (!item) return
    const stock = item.stockQuantity ?? 0
    setCart((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const requested = row.quantity + delta
        const nextQty = clampCartQuantity(requested, stock)
        if (nextQty < requested && delta > 0) {
          setToast('Nema dovoljno proizvoda na stanju.')
        }
        return { ...row, quantity: Math.max(1, nextQty) }
      }),
    )
    if (user && delta !== 0) {
      api.post('/cart', { productId: id, quantity: delta }).catch(() => {})
    }
  }

  const fmt = (n) => Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const goCheckout = () => {
    if (!checkoutCart.length) {
      setToast('U korpi nema proizvoda koji su na stanju.')
      return
    }
    navigate('/checkout')
  }

  return (
    <div className="cart-page shell">
      {!checkoutCart.length ? (
        <div className="cart-empty">
          <p>Vaša korpa je prazna ili nema proizvoda na stanju.</p>
          <Link className="cta" to="/shop">Nastavi kupovinu</Link>
        </div>
      ) : (
        <>
          <FreeShippingBar cartTotal={total} threshold={freeShippingThreshold} />
          <div className="cart-grid">
          <div className="cart-left">
            <div className="cart-col-headers">
              <span>PROIZVOD</span>
              <span className="cart-col-total-label">CENA</span>
            </div>
            <div className="cart-divider" />

            {checkoutCart.map((item) => {
              const stock = item.stockQuantity ?? 0
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
                      <div className="cart-qty-row">
                        <div className="cart-qty">
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
              <button
                type="button"
                className="cart-checkout-btn"
                onClick={goCheckout}
              >
                Nastavi na plaćanje
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
