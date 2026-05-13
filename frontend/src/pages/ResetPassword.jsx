import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const { setToast } = useStore()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Lozinke se ne podudaraju.')
      return
    }
    if (password.length < 8) {
      setError('Lozinka mora imati najmanje 8 karaktera.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
      setToast('Lozinka je promenjena.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const msg = err.response?.data
      setError(typeof msg === 'string' ? msg : 'Link je istekao ili je nevažeći.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page shell narrow">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-name">HONEY</span>
          <span className="auth-brand-tagline">Nail Innovations</span>
        </div>

        <h1 className="auth-title">Nova lozinka</h1>

        {done ? (
          <div className="auth-success">
            <p>Lozinka je uspešno promenjena! Preusmeravamo vas na prijavu…</p>
          </div>
        ) : (
          <>
            {!token && (
              <p className="auth-error" style={{ marginBottom: '1rem' }}>
                Nevažeći link. Zatražite novi reset lozinke.
              </p>
            )}
            <p className="auth-sub">Unesite novu lozinku za vaš nalog.</p>
            <form className="auth-form" onSubmit={submit}>
              <input
                type="password"
                className="auth-input"
                placeholder="Nova lozinka"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <input
                type="password"
                className="auth-input"
                placeholder="Potvrdi novu lozinku"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="auth-submit" disabled={loading || !token}>
                {loading ? 'Čuvanje…' : 'Sačuvaj novu lozinku'}
              </button>
            </form>
            <div className="auth-footer">
              <div className="auth-switch">
                <Link to="/forgot-password" className="auth-link-btn">Zatraži novi link</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

