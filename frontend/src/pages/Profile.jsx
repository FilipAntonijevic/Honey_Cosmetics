import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function Profile() {
  const { setToast, user, setUser } = useStore()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Srbija',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => {
        setForm({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email ?? '',
          phoneNumber: data.phoneNumber ?? '',
          street: data.street ?? '',
          city: data.city ?? '',
          postalCode: data.postalCode ?? '',
          country: data.country ?? 'Srbija',
        })
      })
      .catch(() => setError('Greška pri učitavanju podataka.'))
      .finally(() => setLoading(false))
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.put('/auth/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber || null,
        street: form.street || null,
        city: form.city || null,
        postalCode: form.postalCode || null,
        country: form.country || null,
      })
      // Update local user in context/localStorage so checkout gets new values immediately
      const updated = {
        ...user,
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        phoneNumber: form.phoneNumber || null,
        street: form.street || null,
        city: form.city || null,
        postalCode: form.postalCode || null,
        country: form.country || null,
      }
      setUser(updated)
      localStorage.setItem('honey_user', JSON.stringify(updated))
      setToast('Podaci su uspešno sačuvani.')
    } catch (err) {
      setError(err.response?.data ?? 'Greška pri čuvanju.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-page shell">
      <div className="profile-breadcrumb">
        <Link to="/my-orders" className="profile-breadcrumb-link">Moje porudžbine</Link>
        <span className="profile-breadcrumb-sep">·</span>
        <span>Lični podaci</span>
      </div>

      <h1 className="profile-title">Lični podaci</h1>

      {loading ? (
        <div className="profile-loading">Učitavanje...</div>
      ) : (
        <div className="profile-grid">
          <form className="profile-form" onSubmit={submit}>

            <section className="profile-section">
              <div className="profile-section-title">Ime i prezime</div>
              <div className="profile-row-2">
                <div className="profile-field">
                  <label className="profile-label">Ime</label>
                  <input className="profile-input" value={form.firstName} onChange={set('firstName')} required />
                </div>
                <div className="profile-field">
                  <label className="profile-label">Prezime</label>
                  <input className="profile-input" value={form.lastName} onChange={set('lastName')} />
                </div>
              </div>
            </section>

            <section className="profile-section">
              <div className="profile-section-title">Kontakt</div>
              <div className="profile-field">
                <label className="profile-label">Email adresa</label>
                <input
                  className="profile-input profile-input--readonly"
                  value={form.email}
                  readOnly
                  title="Email adresa se ne može menjati"
                />
                <p className="profile-field-hint">Email adresa se ne može menjati.</p>
              </div>
              <div className="profile-field">
                <label className="profile-label">Broj telefona</label>
                <input
                  className="profile-input"
                  type="tel"
                  placeholder="+381 60 000 0000"
                  value={form.phoneNumber}
                  onChange={set('phoneNumber')}
                />
              </div>
            </section>

            <section className="profile-section">
              <div className="profile-section-title">Adresa dostave</div>
              <div className="profile-field">
                <label className="profile-label">Ulica i broj</label>
                <input
                  className="profile-input"
                  placeholder="npr. Bulevar oslobođenja 15"
                  value={form.street}
                  onChange={set('street')}
                />
              </div>
              <div className="profile-row-2">
                <div className="profile-field">
                  <label className="profile-label">Grad</label>
                  <input
                    className="profile-input"
                    placeholder="npr. Novi Sad"
                    value={form.city}
                    onChange={set('city')}
                  />
                </div>
                <div className="profile-field">
                  <label className="profile-label">Poštanski broj</label>
                  <input
                    className="profile-input"
                    placeholder="npr. 21000"
                    value={form.postalCode}
                    onChange={set('postalCode')}
                  />
                </div>
              </div>
              <div className="profile-field">
                <label className="profile-label">Država</label>
                <input
                  className="profile-input"
                  placeholder="Srbija"
                  value={form.country}
                  onChange={set('country')}
                />
              </div>
            </section>

            {error && <p className="profile-error">{error}</p>}

            <div className="profile-actions">
              <button type="submit" className="profile-save-btn" disabled={saving}>
                {saving ? 'Čuvanje...' : 'Sačuvaj izmene'}
              </button>
            </div>
          </form>

          <aside className="profile-aside">
            <div className="profile-aside-card">
              <div className="profile-aside-title">Brzi linkovi</div>
              <Link to="/my-orders" className="profile-aside-link">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Moje porudžbine
              </Link>
              <Link to="/wishlist" className="profile-aside-link">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Wishlist
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
