import { useState } from 'react'
import api from '../api'
import useSiteLinks from '../hooks/useSiteLinks'
import { cleanPhone } from '../utils/phone'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  message: '',
}

export default function Contact() {
  const {
    emailAddress,
    phoneNumber,
    instagramUrl,
    tikTokUrl,
    loading,
  } = useSiteLinks()

  const email = emailAddress?.trim()
  const phone = phoneNumber?.trim()
  const ig = instagramUrl?.trim()
  const tt = tikTokUrl?.trim()

  const [form, setForm] = useState(EMPTY_FORM)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setError('')
    setSent(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSent(false)

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const em = form.email.trim()
    const phoneRaw = form.phone.trim()
    const phClean = cleanPhone(form.phone)

    if (!firstName || !lastName || !em || !phoneRaw || !form.message.trim()) {
      setError('Molimo popunite sva polja.')
      return
    }
    if (!phClean) {
      setError('Unesite ispravan broj telefona.')
      return
    }
    if (!em.includes('@')) {
      setError('Unesite ispravan email.')
      return
    }

    setSending(true)
    try {
      await api.post('/contact/message', {
        firstName,
        lastName,
        email: em,
        phone: phClean,
        message: form.message.trim(),
      })
      setSent(true)
      setForm(EMPTY_FORM)
    } catch {
      setError('Slanje nije uspelo. Pokušajte ponovo ili nas kontaktirajte direktno.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="about-page">
      <div className="about-hero">
        <img
          src="/sections/kontakt.jpg"
          alt="Honey Cosmetics — kontakt"
          loading="lazy"
          className="about-hero-img"
        />
      </div>

      <div className="about-content contact-layout">
        <div className="contact-col contact-col--info">
          <h1 className="about-title contact-main-title">Kontakt</h1>

          {loading ? (
            <p className="contact-muted">Učitavanje…</p>
          ) : (
            <>
              <div className="contact-block">
                <div className="contact-field-label">Email</div>
                {email ? (
                  <a href={`mailto:${email}`} className="contact-field-value contact-link">
                    {email}
                  </a>
                ) : (
                  <span className="contact-field-value contact-muted">—</span>
                )}
              </div>

              <div className="contact-block">
                <div className="contact-field-label">Telefon</div>
                {phone ? (
                  <a href={`tel:${phone.replace(/\s+/g, '')}`} className="contact-field-value contact-link">
                    {phone}
                  </a>
                ) : (
                  <span className="contact-field-value contact-muted">—</span>
                )}
              </div>

              {(ig || tt) ? (
                <div className="contact-social-row" aria-label="Društvene mreže">
                  {ig ? (
                    <a
                      href={ig.startsWith('http') ? ig : `https://${ig}`}
                      className="contact-social-btn"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                    >
                      <InstagramGlyph />
                    </a>
                  ) : null}
                  {tt ? (
                    <a
                      href={tt.startsWith('http') ? tt : `https://${tt}`}
                      className="contact-social-btn"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                    >
                      <TikTokGlyph />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="contact-col contact-col--form">
          <form className="contact-form" onSubmit={submit}>
            <div className="contact-form-row2">
              <label className="contact-form-field">
                <span className="contact-form-label">Ime</span>
                <input
                  type="text"
                  className="contact-input"
                  value={form.firstName}
                  onChange={set('firstName')}
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="contact-form-field">
                <span className="contact-form-label">Prezime</span>
                <input
                  type="text"
                  className="contact-input"
                  value={form.lastName}
                  onChange={set('lastName')}
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>
            <label className="contact-form-field">
              <span className="contact-form-label">Telefon</span>
              <input
                type="tel"
                className="contact-input"
                value={form.phone}
                onChange={set('phone')}
                autoComplete="tel"
                required
              />
            </label>
            <label className="contact-form-field">
              <span className="contact-form-label">Email adresa</span>
              <input
                type="email"
                className="contact-input"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                required
              />
            </label>
            <label className="contact-form-field">
              <span className="contact-form-label">Recite kako možemo da Vam pomognemo</span>
              <textarea
                className="contact-textarea"
                rows={5}
                value={form.message}
                onChange={set('message')}
                required
              />
            </label>

            {error ? <p className="contact-form-error">{error}</p> : null}
            {sent ? (
              <p className="contact-form-success">Hvala — poruka je poslata. Javićemo vam se uskoro.</p>
            ) : null}

            <button type="submit" className="contact-submit" disabled={sending}>
              {sending ? 'Šaljem…' : 'Pošalji'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

function InstagramGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function TikTokGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V9.34a8.16 8.16 0 0 0 4.77 1.52V7.4a4.85 4.85 0 0 1-1.84-.71z" />
    </svg>
  )
}
