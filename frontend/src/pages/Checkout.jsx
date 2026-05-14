import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function Checkout() {
  const { user, cart, setCart, setToast } = useStore()
  const navigate = useNavigate()

  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState(null) // { code, discount, isPercentage }
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
    phone: user?.phoneNumber ?? '',
    paymentMethod: '0',
    couponCode: '',
    instagram: '',,
    note: '',
    addNote: false,
    createAccount: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
        setCoupon({ code, discountAmount: data.discountAmount })
        setForm(f => ({ ...f, couponCode: code }))
        setCouponError('')
      } else {
        setCoupon(null)
        setForm(f => ({ ...f, couponCode: '' }))
        setCouponError(data.message || 'Nepostojeći ili istekli kupon.')
      }
    } catch {
      setCouponError('Greška pri proveri kupona.')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setCoupon(null)
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
    if (!cart.length) { setToast('Korpa je prazna.'); return }
    setSubmitting(true)
    try {
      if (user) {
        await api.post('/orders/checkout', {
          deliveryAddress: buildAddress(),
          phone: form.phone,
          paymentMethod: Number(form.paymentMethod),
          couponCode: form.couponCode || null,
        })
        setCart([])
        navigate('/my-orders')
      } else {
        await api.post('/orders/guest-checkout', {
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
          deliveryAddress: buildAddress(),
          phone: form.phone || null,
          paymentMethod: Number(form.paymentMethod),
          couponCode: form.couponCode || null,
          guestName: `${form.firstName} ${form.lastName}`.trim() || null,
          guestEmail: form.email || null,
        })
        setCart([])
        navigate('/')
      }
      setToast('Porudžbina je uspešno kreirana!')
    } catch (err) {
      setError(err.response?.data ?? 'Greška prilikom naručivanja. Pokušajte ponovo.')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n) =>
    Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const subtotal = cart.reduce((s, item) => s + Number(item.price) * item.quantity, 0)
  const discountAmt = coupon ? coupon.discountAmount : 0
  const grandTotal = Math.max(0, subtotal - discountAmt)

  if (!cart.length) {
    return (
      <div className="co-empty shell">
        <p>Korpa je prazna.</p>
        <Link className="cta" to="/shop">Nastavi kupovinu</Link>
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
                <label className="co-checkbox-label">
                  <input type="checkbox" checked={form.createAccount} onChange={toggle('createAccount')} className="co-checkbox" />
                  <span>Kreirajte nalog sa Honey Cosmetics</span>
                </label>
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
              <input className="co-input" placeholder="Regija (opciono)" value={form.state} onChange={set('state')} />
            </div>

            <div className="co-row-2">
              <input className="co-input" placeholder="Poštanski broj (opciono)" value={form.postalCode} onChange={set('postalCode')} />
              <input className="co-input" placeholder="Telefon" value={form.phone} onChange={set('phone')} />
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

            <div className="co-summary-items">
              {cart.map((item) => (
                <div key={item.id} className="co-sum-item">
                  <div className="co-sum-img-wrap">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="co-sum-img" />
                      : <div className="co-sum-img-ph" />}
                    <span className="co-sum-qty">{item.quantity}</span>
                  </div>
                  <div className="co-sum-info">
                    <div className="co-sum-name">{item.name}</div>
                    {item.description && (
                      <div className="co-sum-desc">
                        {item.description.length > 55 ? item.description.slice(0, 55) + '…' : item.description}
                      </div>
                    )}
                  </div>
                  <div className="co-sum-price">{fmt(Number(item.price) * item.quantity)} RSD</div>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="co-coupon-block">
              {coupon ? (
                <div className="co-coupon-applied">
                  <span className="co-coupon-tag">
                    🎫 {coupon.code} &mdash; &minus;{fmt(coupon.discountAmount)} RSD
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
