import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const token = searchParams.get('token') ?? ''
  const confirmStarted = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }

    if (confirmStarted.current) return
    confirmStarted.current = true

    let cancelled = false

    const confirm = async () => {
      try {
        await api.post('/auth/confirm-email', { token })
        if (cancelled) return
        setStatus('success')
      } catch (err) {
        if (cancelled) return
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
      }
    }

    confirm()
    return () => {
      cancelled = true
    }
  }, [token])

  const title =
    status === 'success'
      ? 'Registracija uspešna'
      : status === 'error' || status === 'invalid'
        ? 'Potvrda nije uspela'
        : 'Potvrda registracije'

  return (
    <section className="page shell narrow">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-name">HONEY</span>
          <span className="auth-brand-tagline">Nail Innovations</span>
        </div>

        <h1 className="auth-title">{title}</h1>

        {status === 'loading' && (
          <p className="auth-sub">Potvrđujemo registraciju…</p>
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

        {status === 'invalid' && (
          <>
            <p className="auth-error">Nevažeći link za potvrdu.</p>
            <div className="auth-footer">
              <div className="auth-switch">
                <Link to="/register" className="auth-link-btn">Registrujte se</Link>
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
