import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const { setUser, setToast, cart, setCart } = useStore()
  const navigate = useNavigate()
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
        const { data } = await api.post('/auth/confirm-email', { token })
        if (cancelled) return
        localStorage.setItem('honey_access_token', data.accessToken)
        localStorage.setItem('honey_refresh_token', data.refreshToken)
        setUser(data.user)
        await Promise.all(
          cart.map((item) =>
            api.post('/cart', { productId: item.id, quantity: item.quantity }).catch(() => {}),
          ),
        )
        try {
          const { data: serverCart } = await api.get('/cart')
          setCart(
            (serverCart ?? []).map((item) => ({
              id: item.productId,
              name: item.name,
              price: item.price,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
            })),
          )
        } catch {
          /* keep local cart */
        }
        setToast('Nalog je aktiviran. Dobrodošli!')
        setStatus('success')
        setTimeout(() => {
          navigate(data.user?.role === 'Admin' ? '/admin' : '/', { replace: true })
        }, 2000)
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
  }, [token, navigate, setUser, setToast, cart, setCart])

  return (
    <section className="page shell narrow">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-name">HONEY</span>
          <span className="auth-brand-tagline">Nail Innovations</span>
        </div>

        <h1 className="auth-title">Potvrda registracije</h1>

        {status === 'loading' && (
          <p className="auth-sub">Aktiviramo vaš nalog, molimo sačekajte…</p>
        )}

        {status === 'success' && (
          <div className="auth-success">
            <p>Nalog je uspešno aktiviran! Preusmeravamo vas…</p>
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
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
