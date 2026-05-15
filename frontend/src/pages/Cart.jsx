import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import { apiImageUrl } from '../lib/assets'

export default function Cart() {
  const { cart, removeFromCart, setCart, user } = useStore()
  const navigate = useNavigate()
  const [freshPrices, setFreshPrices] = useState({})

  useEffect(() => {
    if (!cart.length) return
    api.get('/products').then(({ data }) => {
      const map = {}
      data.forEach(p => { map[p.id] = p.price })
      setFreshPrices(map)
    }).catch(() => {})
  }, [cart])

  const price = (item) => Number(freshPrices[item.id] ?? item.price)
  const total = cart.reduce((sum, item) => sum + price(item) * item.quantity, 0)

  const changeQty = (id, delta) => {
    setCart(prev => prev
      .map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
    )
    if (user) {
      api.post('/cart', { productId: id, quantity: delta }).catch(() => {})
    }
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
          {/* LEFT — products */}
          <div className="cart-left">
            <div className="cart-col-headers">
              <span>PROIZVOD</span>
              <span className="cart-col-total-label">UKUPNO</span>
            </div>
            <div className="cart-divider" />

            {cart.map((item) => (
              <div key={item.id} className="cart-row">
                <div className="cart-row-left">
                  <div className="cart-img-wrap">
                    {item.imageUrl
                      ? <img src={apiImageUrl(item.imageUrl)} alt={item.name} className="cart-img" />
                      : <div className="cart-img-ph" />}
                  </div>
                  <div className="cart-info">
                    <div className="cart-name">{item.name}</div>
                    <div className="cart-unit-price">{fmt(price(item))} RSD</div>
                    {item.description && (
                      <div className="cart-desc">{item.description.length > 60 ? item.description.slice(0, 60) + '…' : item.description}</div>
                    )}
                    <div className="cart-qty-row">
                      <div className="cart-qty">
                        <button className="cart-qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                        <span className="cart-qty-num">{item.quantity}</span>
                        <button className="cart-qty-btn" onClick={() => changeQty(item.id, +1)}>+</button>
                      </div>
                      <button className="cart-remove" onClick={() => removeFromCart(item.id)} title="Ukloni">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="cart-row-price">{fmt(price(item) * item.quantity)} RSD</div>
                <div className="cart-divider" />
              </div>
            ))}

            <Link className="cart-continue" to="/shop">← Nastavi kupovinu</Link>
          </div>

          {/* RIGHT — summary */}
          <div className="cart-right">
            <div className="cart-summary">
              <div className="cart-summary-title">UKUPNA VREDNOST KORPE</div>


              <div className="cart-estimate">
                <div className="cart-estimate-label">Procenjeni ukupan iznos</div>
                <div className="cart-estimate-value">{fmt(total)} RSD</div>
              </div>
              <div className="cart-shipping-note">Dostava će biti izračunata na kasi</div>

              <button
                className="cart-checkout-btn"
                onClick={() => navigate('/checkout')}
              >
                NASTAVITE NA NAPLATU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
