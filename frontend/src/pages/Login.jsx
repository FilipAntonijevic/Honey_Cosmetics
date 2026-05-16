import { useLayoutEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import PhoneField from '../components/PhoneField'
import { PHONE_DEFAULT, cleanPhone } from '../utils/phone'

export default function Account({ initialMode = 'login' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, register, user, initializing } = useStore()

  const [mode, setMode] = useState(initialMode)
  /** Za /login blokira autofill tačaka dok korisnik ne klikne/fokusira polje (read-only trik). */
  const [loginPwInteractable, setLoginPwInteractable] = useState(() => initialMode === 'register')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registerEmailSent, setRegisterEmailSent] = useState(false)
  const [devConfirmLink, setDevConfirmLink] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: PHONE_DEFAULT,
    country: 'Srbija',
    city: '',
    street: '',
    postalCode: '',
  })

  // Svaka nova poseta: prazni lozinke; Chromium često naknadno ubrizga autofill — readOnly na login-u + ponovno čišćenje.
  useLayoutEffect(() => {
    setLoginPwInteractable(initialMode === 'register')
    setForm((f) => ({
      ...f,
      password: '',
      confirmPassword: '',
    }))
    const delays = [0, 50, 120, 250, 500, 900, 1400]
    const ids = delays.map((ms) =>
      window.setTimeout(() => {
        setForm((f) => ({
          ...f,
          password: '',
          confirmPassword: '',
        }))
      }, ms),
    )
    return () => ids.forEach(clearTimeout)
  }, [location.key, initialMode])

  if (initializing) return null

  const from = location.state?.from ?? '/'
  if (user) return <Navigate to={user.role === 'Admin' ? '/admin' : from} replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setRegisterEmailSent(false)
    if (next === 'login') {
      setForm((f) => ({ ...f, password: '', confirmPassword: '' }))
      setLoginPwInteractable(false)
    } else {
      setLoginPwInteractable(true)
    }
  }

  const unlockLoginPasswordField = () => {
    if (mode === 'login') setLoginPwInteractable(true)
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
        const data = await register({
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
        setDevConfirmLink(data.devConfirmationLink ?? '')
        setRegisterEmailSent(true)
      }
    } catch (err) {
      if (mode === 'login') {
        const msg = err.response?.data
        setError(
          typeof msg === 'string' && msg.length < 160
            ? msg
            : 'Pogrešan email ili lozinka.',
        )
      } else if (err.staleApi) {
        setError(
          'Backend još uvek koristi staru registraciju (nalog se odmah kreira). Zaustavite dotnet run i pokrenite ponovo.',
        )
      } else {
        const msg = err.response?.data
        const detail =
          typeof msg === 'string'
            ? msg
            : msg?.title || msg?.detail || msg?.message
        setError(
          typeof detail === 'string' && detail.length < 200
            ? detail
            : err.response?.status === 400
              ? 'Proverite unete podatke (email, lozinka).'
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

        {registerEmailSent ? (
          <div className="auth-success">
            <p>
              {devConfirmLink ? (
                'Registracija je sačuvana. SendGrid nije podešen — aktivirajte nalog linkom ispod:'
              ) : (
                <>
                  Poslali smo vam email sa linkom za potvrdu na adresu{' '}
                  <strong>{form.email}</strong>.
                </>
              )}
            </p>
            {!devConfirmLink && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#6b7280' }}>
                Kliknite na link u emailu da aktivirate nalog. Link važi 24 sata.
              </p>
            )}
            {devConfirmLink && (
              <p style={{ marginTop: '1rem' }}>
                <a href={devConfirmLink} className="auth-link-btn">
                  Potvrdi registraciju
                </a>
              </p>
            )}
            <div className="auth-footer auth-switch" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="auth-link-btn"
                disabled={resendLoading}
                onClick={async () => {
                  setResendLoading(true)
                  setError('')
                  try {
                    const { data } = await api.post('/auth/resend-confirmation', {
                      email: form.email,
                    })
                    if (data.devConfirmationLink) setDevConfirmLink(data.devConfirmationLink)
                  } catch (err) {
                    const msg = err.response?.data
                    setError(
                      typeof msg === 'string' && msg.length < 160
                        ? msg
                        : 'Slanje emaila nije uspelo.',
                    )
                  } finally {
                    setResendLoading(false)
                  }
                }}
              >
                {resendLoading ? 'Šaljem…' : 'Pošalji ponovo'}
              </button>
              <span className="auth-switch-sep">·</span>
              <button type="button" className="auth-link-btn" onClick={() => switchMode('login')}>
                Idi na prijavu
              </button>
            </div>
            {error && <p className="auth-error" style={{ marginTop: '0.75rem' }}>{error}</p>}
          </div>
        ) : (
        <>
        <p className="auth-sub">
          {isRegister ? 'Postanite deo Honey zajednice' : 'Prijavite se u vaš Honey nalog'}
        </p>

        <form
          className="auth-form"
          onSubmit={submit}
          autoComplete={isRegister ? 'on' : 'off'}
        >
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
          <div
            className="auth-input-wrap auth-input-wrap--password"
            role="presentation"
            onMouseDownCapture={unlockLoginPasswordField}
            onPointerDownCapture={unlockLoginPasswordField}
          >
            <input
              key={`auth-password-${location.key}-${mode}`}
              type="password"
              className="auth-input auth-input-has-visual-ph"
              placeholder=""
              readOnly={isRegister ? false : !loginPwInteractable}
              value={form.password}
              onChange={set('password')}
              onFocus={unlockLoginPasswordField}
              required
              spellCheck={false}
              autoCorrect="off"
              name={isRegister ? 'new-password' : `login-pw-${location.key}`}
              autoComplete={isRegister ? 'new-password' : 'off'}
              aria-label={isRegister ? 'Sifra (obavezno)' : 'Sifra'}
            />
            {!form.password && (
              <span className="auth-input-visual-ph" aria-hidden="true">
                {isRegister ? 'Sifra *' : 'Sifra'}
              </span>
            )}
          </div>

          {/* Extra register fields */}
          <div className={`auth-slide${isRegister ? ' open' : ''}`}>
            <div className="auth-slide-inner">
              <div className="auth-input-wrap auth-input-wrap--password">
                <input
                  key={`auth-confirm-${location.key}`}
                  type="password"
                  className="auth-input auth-input-has-visual-ph"
                  placeholder=""
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  required={isRegister}
                  name="confirm-password"
                  autoComplete="new-password"
                  aria-label="Potvrda šifre (obavezno)"
                />
                {!form.confirmPassword && (
                  <span className="auth-input-visual-ph" aria-hidden="true">
                    Potvrdi šifru *
                  </span>
                )}
              </div>
              <PhoneField
                className="auth-input"
                value={form.phoneNumber}
                onChange={(v) => setForm((f) => ({ ...f, phoneNumber: v }))}
                ariaLabel="Broj telefona (opciono)"
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
        </>
        )}
      </div>
    </section>
  )
}

