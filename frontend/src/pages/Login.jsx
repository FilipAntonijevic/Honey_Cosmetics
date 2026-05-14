import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { DEFAULT_PHONE_PREFIX, cleanPhone, placeCursorAtEndIfPrefix } from '../utils/phone'

export default function Account({ initialMode = 'login' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, register, user, initializing } = useStore()

  const [mode, setMode] = useState(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: DEFAULT_PHONE_PREFIX,
    country: 'Srbija',
    city: '',
    street: '',
    postalCode: '',
  })

  if (initializing) return null

  const from = location.state?.from ?? '/'
  if (user) return <Navigate to={user.role === 'Admin' ? '/admin' : from} replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const switchMode = (next) => {
    setMode(next)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setError('Ime i prezime su obavezni.')
        return
      }
      if (form.password !== form.confirmPassword) {
        setError('Lozinke se ne podudaraju.')
        return
      }
      if (form.password.length < 8) {
        setError('Lozinka mora imati najmanje 8 karaktera.')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const result = await login({ email: form.email, password: form.password })
        navigate(result?.role === 'Admin' ? '/admin' : from, { replace: true })
      } else {
        const result = await register({
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phoneNumber: cleanPhone(form.phoneNumber) ?? undefined,
          street: form.street.trim() || undefined,
          city: form.city.trim() || undefined,
          postalCode: form.postalCode.trim() || undefined,
          country: form.country || 'Srbija',
        })
        navigate(result?.role === 'Admin' ? '/admin' : from, { replace: true })
      }
    } catch (err) {
      if (mode === 'login') {
        setError('Pogrešan email ili lozinka.')
      } else {
        const msg = err.response?.data
        setError(
          typeof msg === 'string' && msg.length < 120
            ? msg
            : 'Registracija nije uspela. Pokušajte ponovo.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <section className="page shell narrow">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-name">HONEY</span>
          <span className="auth-brand-tagline">Nail Innovations</span>
        </div>

        <h1 className="auth-title">{isRegister ? 'Kreirajte nalog' : 'Dobrodošli'}</h1>
        <p className="auth-sub">
          {isRegister ? 'Postanite deo Honey zajednice' : 'Prijavite se u vaš Honey nalog'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {/* Name row — register only */}
          <div className={`auth-slide${isRegister ? ' open' : ''}`}>
            <div className="auth-slide-inner">
              <div className="form-row">
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Ime *"
                  value={form.firstName}
                  onChange={set('firstName')}
                  required={isRegister}
                  autoComplete="given-name"
                />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Prezime *"
                  value={form.lastName}
                  onChange={set('lastName')}
                  required={isRegister}
                  autoComplete="family-name"
                />
              </div>
            </div>
          </div>

          {/* Always visible fields */}
          <input
            type="email"
            className="auth-input"
            placeholder={isRegister ? 'Email adresa *' : 'Email adresa'}
            value={form.email}
            onChange={set('email')}
            required
            autoComplete="email"
          />
          <input
            type="password"
            className="auth-input"
            placeholder={isRegister ? 'Lozinka *' : 'Lozinka'}
            value={form.password}
            onChange={set('password')}
            required
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />

          {/* Extra register fields */}
          <div className={`auth-slide${isRegister ? ' open' : ''}`}>
            <div className="auth-slide-inner">
              <input
                type="password"
                className="auth-input"
                placeholder="Potvrdi lozinku *"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                required={isRegister}
                autoComplete="new-password"
              />
              <input
                type="tel"
                className="auth-input"
                placeholder="Telefon (opciono)"
                value={form.phoneNumber}
                onChange={set('phoneNumber')}
                onFocus={placeCursorAtEndIfPrefix}
                onClick={placeCursorAtEndIfPrefix}
                autoComplete="tel"
              />

              {/* Address — always shown inline, all optional */}
              <div className="auth-addr-section">
                <div className="auth-addr-label">Adresa dostave (opciono)</div>
                <input
                  type="text"
                  className="auth-input auth-input--prefilled"
                  value={form.country}
                  onChange={set('country')}
                  autoComplete="country-name"
                  readOnly
                />
                <div className="form-row">
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Grad"
                    value={form.city}
                    onChange={set('city')}
                    autoComplete="address-level2"
                  />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Poštanski broj"
                    value={form.postalCode}
                    onChange={set('postalCode')}
                    autoComplete="postal-code"
                  />
                </div>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Adresa (ulica, broj, sprat, stan)"
                  value={form.street}
                  onChange={set('street')}
                  autoComplete="street-address"
                />
              </div>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Molimo sačekajte…' : isRegister ? 'Kreiraj nalog' : 'Prijavi se'}
          </button>
        </form>

        <div className="auth-footer">
          <div className="auth-switch">
            {isRegister ? (
              <>
                <span>Već imate nalog?</span>
                <button type="button" className="auth-link-btn" onClick={() => switchMode('login')}>
                  Prijavite se
                </button>
              </>
            ) : (
              <>
                <span>Nemate nalog?</span>
                <button type="button" className="auth-link-btn" onClick={() => switchMode('register')}>
                  Registrujte se
                </button>
              </>
            )}
          </div>

          {!isRegister && (
            <Link to="/forgot-password" className="auth-forgot-link">
              Zaboravili ste lozinku?
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

