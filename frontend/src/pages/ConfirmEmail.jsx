import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import { trackCompleteRegistration } from '../lib/metaPixel'

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('form')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const token = searchParams.get('token') ?? ''

  const submit = async (e) => {
    e.preventDefault()
    if (!token) {
      setStatus('invalid')
      return
    }
    if (password.length < 8) {
      setError('Lozinka mora imati najmanje 8 karaktera.')
      return
    }
    if (password !== confirmPassword) {
      setError('Lozinke se ne poklapaju.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await api.post('/auth/confirm-email', { token, password, confirmPassword })
      trackCompleteRegistration()
      setStatus('success')
    } catch (err) {
      const msg = err.response?.data
      const detail =
        typeof msg === 'string'
          ? msg
          : msg?.title || msg?.detail
      setError(
        typeof detail === 'string' && detail.length < 200
          ? detail
          : 'Link je istekao ili je nevažeći.',
      )
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    status === 'success'
      ? 'Registracija uspešna'
      : status === 'error' || status === 'invalid'
        ? 'Potvrda nije uspela'
        : 'Potvrda registracije'

  if (!token) {
    return (
      <section className="page shell narrow">
        <div className="auth-card">
          <h1 className="auth-title">Potvrda nije uspela</h1>
          <p className="auth-error">Nevažeći link za potvrdu.</p>
          <div className="auth-footer">
            <Link to="/register" className="auth-link-btn">Registrujte se</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page shell narrow">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-name">HONEY</span>
          <span className="auth-brand-tagline">Nail Innovations</span>
        </div>

        <h1 className="auth-title">{title}</h1>

        {status === 'form' && (
          <form onSubmit={submit} className="auth-form">
            <p className="auth-sub">Postavite lozinku da biste aktivirali nalog.</p>
            <input
              className="auth-input"
              type="password"
              placeholder="Lozinka (min. 8 karaktera)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <input
              className="auth-input"
              type="password"
              placeholder="Potvrdite lozinku"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Potvrđujemo…' : 'Aktiviraj nalog'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <div className="auth-success">
            <p>Uspešno ste kreirali nalog.</p>
            <div className="auth-footer auth-switch" style={{ marginTop: '1.25rem' }}>
              <Link to="/login" className="auth-link-btn">
                Prijava
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <>
            <p className="auth-error">{error}</p>
            <div className="auth-footer">
              <div className="auth-switch">
                <Link to="/register" className="auth-link-btn">Registrujte se ponovo</Link>
                <span className="auth-switch-sep">·</span>
                <Link to="/login" className="auth-link-btn">Prijava</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
