import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { setToast } = useStore()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setToast('Nešto nije u redu. Pokušajte ponovo.')
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

        <h1 className="auth-title">Resetuj lozinku</h1>

        {sent ? (
          <div className="auth-success">
            <p>Ako vaš email postoji u sistemu, poslali smo vam link za reset lozinke.</p>
            <p className="auth-success-note">Proverite vaš inbox (i spam folder).</p>
            <Link to="/login" className="auth-link-btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
              Nazad na prijavu
            </Link>
          </div>
        ) : (
          <>
            <p className="auth-sub">Unesite vaš email i poslati ćemo vam link za reset lozinke.</p>
            <form className="auth-form" onSubmit={submit}>
              <input
                type="email"
                className="auth-input"
                placeholder="Email adresa"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Slanje…' : 'Pošalji reset link'}
              </button>
            </form>
            <div className="auth-footer">
              <div className="auth-switch">
                <span>Setili ste se lozinke?</span>
                <Link to="/login" className="auth-link-btn">Prijavite se</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

