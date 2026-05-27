import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import ApiImage from '../components/ApiImage'
import PhoneField from '../components/PhoneField'
import FreeShippingBar from '../components/FreeShippingBar'
import BankTransferSlip, { hasTemplate } from '../components/BankTransferSlip'
import useSiteLinks from '../hooks/useSiteLinks'
import { cleanPhone, isPhoneComplete, phoneOrDefault } from '../utils/phone'
import { clampCartQuantity, isInStock } from '../utils/stock'

export default function Checkout() {
  const {
    user,
    checkoutCart,
    checkoutCoupon,
    setCheckoutCoupon,
    checkoutSubtotal,
    checkoutDiscount,
    checkoutGrandTotal,
    setCart,
    clearCartAfterOrder,
    setToast,
    refreshCartStock,
  } = useStore()
  const siteLinks = useSiteLinks()
  const { freeShippingThreshold } = siteLinks
  const navigate = useNavigate()

  const [couponInput, setCouponInput] = useState('')
  const coupon = checkoutCoupon
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [form, setForm] = useState({
    email: user?.email ?? '',
    firstName: user?.fullName?.split(' ')[0] ?? '',
    lastName: user?.fullName?.split(' ').slice(1).join(' ') ?? '',
    address: user?.street ?? '',
    city: user?.city ?? '',
    state: user?.country ?? 'Srbija',
    postalCode: user?.postalCode ?? '',
    phone: phoneOrDefault(user?.phoneNumber),
    paymentMethod: '0',
    couponCode: '',
    instagram: '',
    note: '',
    addNote: false,
    createAccount: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [completedBankOrder, setCompletedBankOrder] = useState(null)

  useEffect(() => {
    refreshCartStock()
  }, [refreshCartStock])

  const subtotal = checkoutSubtotal

  const changeQty = (id, delta) => {
    const item = checkoutCart.find((i) => i.id === id)
    if (!item) return
    if (delta > 0 && !isInStock(item)) {
      setToast('Proizvod trenutno nije na stanju.')
      return
    }
    const stock = Number(item.stockQuantity) || 0
    const currentQty = Number(item.quantity) || 0
    if (delta > 0 && currentQty >= stock) {
      setToast('Nema dovoljno proizvoda na stanju.')
      return
    }
    setCart((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const rowQty = Number(row.quantity) || 0
        const requested = rowQty + delta
        const nextQty = clampCartQuantity(requested, stock)
        if (nextQty < requested && delta > 0) {
          setToast('Nema dovoljno proizvoda na stanju.')
        }
        return { ...row, quantity: Math.max(1, nextQty) }
      }),
    )
    if (user && delta > 0) {
      api.post('/cart', { productId: id, quantity: delta }).catch(() => {
        setToast('Nema dovoljno proizvoda na stanju.')
        refreshCartStock()
      })
    }
  }

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponError('')
    setCouponLoading(true)
    try {
      const { data } = await api.post('/coupons/validate', JSON.stringify(code), {
        headers: { 'Content-Type': 'application/json' }
      })
      if (data.isValid) {
        setCheckoutCoupon({ code, discountValue: data.discountValue, isPercentage: data.isPercentage })
        setForm(f => ({ ...f, couponCode: code }))
        setCouponError('')
      } else {
        setCheckoutCoupon(null)
        setForm(f => ({ ...f, couponCode: '' }))
        setCouponError(data.message || 'Izabrali ste nepostojeci kupon.')
      }
    } catch {
      setCouponError('Izabrali ste nepostojeci kupon.')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setCheckoutCoupon(null)
    setCouponInput('')
    setForm(f => ({ ...f, couponCode: '' }))
    setCouponError('')
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const toggle = (key) => () => setForm((f) => ({ ...f, [key]: !f[key] }))

  const buildAddress = () =>
    [form.address, form.city, form.state, form.postalCode].filter(Boolean).join(', ')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const inStockItems = await refreshCartStock()
    if (!inStockItems.length) {
      setError('Nema proizvoda na stanju u korpi.')
      setToast('Nema proizvoda na stanju u korpi.')
      return
    }
    if (!isPhoneComplete(form.phone)) {
      setError('Broj telefona je obavezan.')
      return
    }
    setSubmitting(true)
    try {
      const phoneClean = cleanPhone(form.phone)
      const isBankTransfer = Number(form.paymentMethod) === 1
      if (user) {
        const { data } = await api.post('/orders/checkout', {
          deliveryAddress: buildAddress(),
          phone: phoneClean,
          paymentMethod: Number(form.paymentMethod),
          couponCode: form.couponCode || null,
        })
        await clearCartAfterOrder()
        if (isBankTransfer) {
          setCompletedBankOrder(data)
        } else {
          navigate('/my-orders')
        }
      } else {
        const { data } = await api.post('/orders/guest-checkout', {
          items: inStockItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
          deliveryAddress: buildAddress(),
          phone: phoneClean,
          paymentMethod: Number(form.paymentMethod),
          couponCode: form.couponCode || null,
          guestName: `${form.firstName} ${form.lastName}`.trim() || null,
          guestEmail: form.email || null,
        })
        await clearCartAfterOrder()
        if (isBankTransfer) {
          setCompletedBankOrder(data)
        } else {
          navigate('/')
        }
      }
      setToast(isBankTransfer
        ? 'Porudžbina je kreirana. Izvršite uplatu prema uputstvu ispod.'
        : 'Porudžbina je uspešno kreirana!')
    } catch (err) {
      setError(err.response?.data ?? 'Greška prilikom naručivanja. Pokušajte ponovo.')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n) =>
    Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const discountAmt = checkoutDiscount
  const grandTotal = checkoutGrandTotal

  if (!checkoutCart.length && !completedBankOrder) {
    return (
      <div className="co-empty shell">
        <p>Korpa je prazna ili nema proizvoda na stanju.</p>
        <Link className="cta" to="/shop">Nastavi kupovinu</Link>
      </div>
    )
  }

  if (completedBankOrder) {
    return (
      <div className="co-page co-page--bank-success shell">
        <div className="co-bank-success">
          <h1 className="co-title">Porudžbina #{completedBankOrder.id} je kreirana</h1>
          <p className="co-bank-success-lead">
            Izvršite bankovnu uplatu prema uputstvu ispod. Porudžbina se šalje tek nakon evidentirane uplate.
          </p>
          <BankTransferSlip
            template={siteLinks}
            orderId={completedBankOrder.id}
            amount={completedBankOrder.total}
            mode="confirmed"
          />
          <div className="co-bank-success-actions">
            {user ? (
              <Link to="/my-orders" className="co-submit-btn co-submit-btn--link">Moje porudžbine</Link>
            ) : (
              <Link to="/" className="co-submit-btn co-submit-btn--link">Nastavi kupovinu</Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <form className="co-page" onSubmit={submit} noValidate>
      <div className="co-shell shell">

        {/* ── LEFT: FORM ── */}
        <div className="co-left">
          <h1 className="co-title">Plaćanje</h1>

          {/* Contact */}
          <section className="co-section">
            <div className="co-section-head">
              <span className="co-section-title">Kontakt informacije</span>
              {!user && <Link to="/login" className="co-section-link">Ulogujte se</Link>}
            </div>

            {user ? (
              <div className="co-logged-info">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>{user.fullName}</span>
              </div>
            ) : (
              <>
                <div className="co-field-wrap">
                  <input className="co-input" type="email" placeholder="Email" value={form.email} onChange={set('email')} />
                  <p className="co-field-hint">Trenutno završavate kupovinu kao gost.</p>
                </div>
              </>
            )}
          </section>

          {/* Shipping */}
          <section className="co-section">
            <div className="co-section-head">
              <span className="co-section-title">Adresa za isporuku</span>
            </div>

            <div className="co-field-wrap">
              <select className="co-input co-select">
                <option>Srbija</option>
              </select>
            </div>

            <div className="co-row-2">
              <input className="co-input" placeholder="Ime" value={form.firstName} onChange={set('firstName')} required />
              <input className="co-input" placeholder="Prezime" value={form.lastName} onChange={set('lastName')} />
            </div>

            <div className="co-field-wrap">
              <input className="co-input" placeholder="Adresa" value={form.address} onChange={set('address')} required />
              <a className="co-extra-link" href="#" onClick={(e) => e.preventDefault()}>+ Dodaj stan, apartman, lokal itd.</a>
            </div>

            <div className="co-row-2">
              <input className="co-input" placeholder="Grad" value={form.city} onChange={set('city')} />
              <input className="co-input" placeholder="Poštanski broj (opciono)" value={form.postalCode} onChange={set('postalCode')} inputMode="numeric" data-numeric="integer" />
            </div>

            <div className="co-field-wrap">
              <input
                className="co-input"
                placeholder="Regija (opciono)"
                value={form.state}
                onChange={set('state')}
              />
            </div>

            <div className="co-field-wrap co-field-wrap--phone">
              <PhoneField
                className="co-input"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                required
                ariaLabel="Broj telefona"
                placeholder="+381"
              />
            </div>
          </section>

          {/* Payment */}
          <section className="co-section">
            <div className="co-section-head">
              <span className="co-section-title">Opcije plaćanja</span>
            </div>

            <div className="co-payment-group">
              <label className={`co-payment-card${form.paymentMethod === '0' ? ' co-payment-card--selected' : ''}`}>
                <input
                  type="radio" name="pm" value="0"
                  checked={form.paymentMethod === '0'}
                  onChange={set('paymentMethod')}
                  className="co-radio"
                />
                <span className="co-payment-name">Plaćanje pouzećem</span>
              </label>
              {form.paymentMethod === '0' && (
                <p className="co-payment-hint">Plaćanje gotovinom prilikom dostave.</p>
              )}

              <label className={`co-payment-card${form.paymentMethod === '1' ? ' co-payment-card--selected' : ''}`}>
                <input
                  type="radio" name="pm" value="1"
                  checked={form.paymentMethod === '1'}
                  onChange={set('paymentMethod')}
                  className="co-radio"
                />
                <span className="co-payment-name">Direktna bankovna transakcija</span>
              </label>
              {form.paymentMethod === '1' && (
                <div className="co-payment-slip-wrap">
                  {hasTemplate(siteLinks) ? (
                    <BankTransferSlip
                      template={siteLinks}
                      amount={grandTotal}
                      mode="preview"
                      variant="checkout"
                    />
                  ) : (
                    <p className="co-payment-hint co-payment-hint--inline">
                      Platite narudžbinu direktno na našem računu. Vaša porudžbina neće biti poslata dok sredstva ne budu uplaćena.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Additional */}
          <section className="co-section">
            <div className="co-section-head">
              <span className="co-section-title">Dodatne informacije o porudžbini</span>
            </div>
            <div className="co-field-wrap">
              <input
                className="co-input"
                placeholder="Instagram / Tiktok naziv (za buduće saradnje) (opciono)"
                value={form.instagram}
                onChange={set('instagram')}
              />
            </div>
            <label className="co-checkbox-label">
              <input type="checkbox" checked={form.addNote} onChange={toggle('addNote')} className="co-checkbox" />
              <span>Dodajte napomenu svojoj porudžbini</span>
            </label>
            {form.addNote && (
              <textarea
                className="co-input co-textarea"
                placeholder="Napomena..."
                value={form.note}
                onChange={set('note')}
              />
            )}
          </section>

          {error && <p className="co-error">{error}</p>}

          {/* Actions */}
          <div className="co-actions">
            <Link to="/cart" className="co-back-link">← Povratak u korpu</Link>
            <button type="submit" className="co-submit-btn" disabled={submitting}>
              {submitting ? 'Slanje...' : 'Naručite'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: SUMMARY ── */}
        <div className="co-right">
          <div className="co-summary">
            <div className="co-summary-title">Rezime porudžbine</div>

            <FreeShippingBar cartTotal={grandTotal} threshold={freeShippingThreshold} compact />

            <div className="co-summary-items">
              {checkoutCart.map((item) => {
                const stock = Number(item.stockQuantity) || 0
                const atMax = !isInStock(item) || (Number(item.quantity) || 0) >= stock
                return (
                <div key={item.id} className="co-sum-item">
                  <div className="co-sum-img-wrap">
                    {item.imageUrl
                      ? <ApiImage src={item.imageUrl} alt={item.name} className="co-sum-img" variant="medium" />
                      : <div className="co-sum-img-ph" />}
                  </div>
                  <div className="co-sum-info">
                    <div className="co-sum-name">{item.name}</div>
                    {item.description && (
                      <div className="co-sum-desc">
                        {item.description.length > 55 ? item.description.slice(0, 55) + '…' : item.description}
                      </div>
                    )}
                    <div className="cart-qty-row co-sum-qty-row">
                      <div className="cart-qty">
                        <button type="button" className="cart-qty-btn" onClick={() => changeQty(item.id, -1)} aria-label="Smanji količinu">−</button>
                        <span className="cart-qty-num">{item.quantity}</span>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          disabled={atMax}
                          onClick={() => changeQty(item.id, +1)}
                          aria-label="Povećaj količinu"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="co-sum-price">{fmt(Number(item.price) * item.quantity)} RSD</div>
                </div>
                )
              })}
            </div>

            {/* Coupon */}
            <div className="co-coupon-block">
              {coupon ? (
                <div className="co-coupon-applied">
                  <span className="co-coupon-tag">
                    🎫 {coupon.code} &mdash; &minus;{fmt(discountAmt)} RSD
                  </span>
                  <button type="button" className="co-coupon-remove" onClick={removeCoupon}>&#x2715;</button>
                </div>
              ) : (
                <>
                  <div className="co-coupon-row">
                    <input
                      className="co-coupon-input"
                      placeholder="Kod kupona"
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value); setCouponError('') }}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                    />
                    <button
                      type="button"
                      className="co-coupon-apply"
                      onClick={applyCoupon}
                      disabled={couponLoading}
                    >
                      {couponLoading ? '…' : 'Primeni'}
                    </button>
                  </div>
                  {!user && (
                    <p className="co-coupon-guest">
                      Samo kuponi tipa „Jednom po korisniku” zahtevaju{' '}
                      <Link to="/login" state={{ from: '/checkout' }} className="co-coupon-guest-link">
                        prijavu
                      </Link>
                      . Neograničeni i „Samo jednom” kuponi mogu i gosti.
                    </p>
                  )}
                  {couponError && <p className="co-coupon-error">{couponError}</p>}
                </>
              )}
            </div>

            {/* Totals */}
            <div className="co-sum-divider" />
            <div className="co-total-row">
              <span>Međuzbir</span>
              <span>{fmt(subtotal)} RSD</span>
            </div>
            {coupon && (
              <div className="co-total-row" style={{ color: '#c0392b' }}>
                <span>Popust ({coupon.code})</span>
                <span>&minus;{fmt(discountAmt)} RSD</span>
              </div>
            )}
            {grandTotal >= freeShippingThreshold && freeShippingThreshold > 0 && (
              <div className="co-total-row" style={{ color: '#16a34a' }}>
                <span>Dostava</span>
                <span>Besplatna</span>
              </div>
            )}
            <div className="co-sum-divider" />
            <div className="co-grand-row">
              <span>Ukupno</span>
              <strong className="co-grand-value">{fmt(grandTotal)} RSD</strong>
            </div>
          </div>
        </div>

      </div>
    </form>
  )
}
