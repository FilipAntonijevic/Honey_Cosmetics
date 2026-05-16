import { useState } from 'react'
import api from '../api'
import PhoneField from '../components/PhoneField'
import { PHONE_DEFAULT, cleanPhone } from '../utils/phone'
import { publicUrl } from '../lib/assets'

const EMPTY = { fullName: '', company: '', email: '', phone: PHONE_DEFAULT, message: '' }

export default function Collaboration() {
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.fullName.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Molimo popunite sva obavezna polja.')
      return
    }
    setSending(true)
    try {
      await api.post('/contact/collaboration', { ...form, phone: cleanPhone(form.phone) ?? '' })
      setSent(true)
      setForm(EMPTY)
    } catch {
      setError('Greška pri slanju. Pokušajte ponovo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="about-page">
      <div className="about-hero">
        <img
          src={publicUrl('/sections/saradnja.jpg')}
          alt="Saradnja — Honey Cosmetics"
          loading="lazy"
          className="about-hero-img"
        />
      </div>

      <div className="about-content collaboration-page">
        <div className="collaboration-inner">
          <p className="collaboration-eyebrow">Honey Cosmetics</p>
          <h1 className="collaboration-title">Saradnja</h1>
          <p className="collaboration-lead">
            Zainteresovani ste za saradnju sa Honey Cosmetics? Popunite formular i odgovorićemo vam u
            najkraćem roku.
          </p>

          {sent ? (
            <div className="collaboration-success">
              <p className="collaboration-success-icon">✓</p>
              <p className="collaboration-success-title">Poruka je poslata!</p>
              <p className="collaboration-success-note">Javićemo vam se uskoro.</p>
            </div>
          ) : (
            <form className="collaboration-form" onSubmit={submit}>
              <div className="collaboration-form-row">
                <div>
                  <label className="collaboration-label" htmlFor="collab-fullname">
                    Ime i prezime *
                  </label>
                  <input
                    id="collab-fullname"
                    className="collaboration-input"
                    placeholder="Marko Marković"
                    value={form.fullName}
                    onChange={set('fullName')}
                  />
                </div>
                <div>
                  <label className="collaboration-label" htmlFor="collab-company">
                    Naziv firme
                  </label>
                  <input
                    id="collab-company"
                    className="collaboration-input"
                    placeholder="Opciono"
                    value={form.company}
                    onChange={set('company')}
                  />
                </div>
              </div>
              <div className="collaboration-form-row">
                <div>
                  <label className="collaboration-label" htmlFor="collab-email">
                    Email *
                  </label>
                  <input
                    id="collab-email"
                    type="email"
                    className="collaboration-input"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={set('email')}
                  />
                </div>
                <div>
                  <label className="collaboration-label" htmlFor="collab-phone">
                    Telefon
                  </label>
                  <PhoneField
                    id="collab-phone"
                    className="collaboration-input"
                    value={form.phone}
                    onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                    ariaLabel="Broj telefona"
                  />
                </div>
              </div>
              <div>
                <label className="collaboration-label" htmlFor="collab-message">
                  Poruka *
                </label>
                <textarea
                  id="collab-message"
                  className="collaboration-input collaboration-textarea"
                  placeholder="Opišite vaš predlog saradnje…"
                  value={form.message}
                  onChange={set('message')}
                />
              </div>
              {error ? <p className="collaboration-error">{error}</p> : null}
              <button type="submit" className="collaboration-submit" disabled={sending}>
                {sending ? 'Slanje…' : 'Pošalji'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
