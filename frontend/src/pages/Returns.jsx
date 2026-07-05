import { useState } from 'react'
import api from '../api'
import { userFacingEmailError } from '../lib/emailErrors'
import useSiteLinks from '../hooks/useSiteLinks'
import PhoneField from '../components/PhoneField'
import { PHONE_DEFAULT, cleanPhone } from '../utils/phone'

const EMPTY = { firstName: '', lastName: '', email: '', phone: PHONE_DEFAULT, orderNumber: '', message: '' }

export default function Returns() {
  const { complaintsEmail } = useSiteLinks()
  const emailNode = complaintsEmail
    ? <a href={`mailto:${complaintsEmail}`}>{complaintsEmail}</a>
    : <span className="legal-empty">—</span>

  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const em = form.email.trim()
    if (!firstName || !lastName || !em || !form.message.trim()) {
      setError('Molimo popunite ime, prezime, email i opis reklamacije.')
      return
    }
    if (!em.includes('@')) {
      setError('Unesite ispravan email.')
      return
    }
    setSending(true)
    try {
      await api.post('/contact/complaint', {
        firstName,
        lastName,
        email: em,
        phone: cleanPhone(form.phone) ?? '',
        orderNumber: form.orderNumber.trim(),
        message: form.message.trim(),
      })
      setSent(true)
      setForm(EMPTY)
    } catch (err) {
      setError(userFacingEmailError(err, 'complaint'))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="page shell legal-page">
      <h1>Politika povraćaja i reklamacija</h1>

      <h2>1. Pravo na odustanak</h2>
      <p>
        U skladu sa Zakonom o zaštiti potrošača Republike Srbije, kupac ima pravo
        da odustane od kupovine u roku od 14 dana od dana prijema robe, bez
        navođenja razloga.
      </p>
      <p>Obrazac za odustanak može se poslati na: {emailNode}</p>
      <p>
        Kupac je dužan da vrati robu o svom trošku, neoštećenu i u originalnom
        pakovanju.
      </p>

      <h2>2. Izuzeci</h2>
      <p>Pravo na odustanak se ne odnosi na:</p>
      <ul>
        <li>Kozmetičke proizvode koji su otvoreni ili korišćeni</li>
        <li>Proizvode sa oštećenom zaštitnom ambalažom</li>
        <li>Personalizovane proizvode</li>
      </ul>

      <h2>3. Povraćaj novca</h2>
      <p>
        Povraćaj sredstava se vrši u roku od 14 dana od prijema vraćene robe, na
        isti način na koji je izvršeno plaćanje, osim ako se drugačije ne
        dogovorimo.
      </p>

      <h2>4. Reklamacije</h2>
      <p>
        U slučaju nesaobraznosti proizvoda, kupac ima pravo na reklamaciju u
        roku od 2 godine od dana kupovine.
      </p>
      <p>Reklamacije se podnose putem email-a: {emailNode}, ili preko formulara ispod.</p>
      <p>
        Prodavac je dužan da odgovori na reklamaciju u roku od 8 dana i reši je
        u zakonskom roku.
      </p>

      <h2>Podnesi reklamaciju</h2>
      {sent ? (
        <div className="collaboration-success">
          <p className="collaboration-success-icon">✓</p>
          <p className="collaboration-success-title">Reklamacija je poslata!</p>
          <p className="collaboration-success-note">Odgovorićemo vam u najkraćem roku.</p>
        </div>
      ) : (
        <form className="collaboration-form" onSubmit={submit}>
          <div className="collaboration-form-row">
            <div>
              <label className="collaboration-label" htmlFor="rec-firstname">Ime *</label>
              <input
                id="rec-firstname"
                className="collaboration-input"
                value={form.firstName}
                onChange={set('firstName')}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="collaboration-label" htmlFor="rec-lastname">Prezime *</label>
              <input
                id="rec-lastname"
                className="collaboration-input"
                value={form.lastName}
                onChange={set('lastName')}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="collaboration-form-row">
            <div>
              <label className="collaboration-label" htmlFor="rec-email">Email *</label>
              <input
                id="rec-email"
                type="email"
                className="collaboration-input"
                placeholder="email@example.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="collaboration-label" htmlFor="rec-phone">Telefon</label>
              <PhoneField
                id="rec-phone"
                className="collaboration-input"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                ariaLabel="Broj telefona"
              />
            </div>
          </div>
          <div>
            <label className="collaboration-label" htmlFor="rec-order">Broj porudžbine</label>
            <input
              id="rec-order"
              className="collaboration-input"
              placeholder="Opciono"
              value={form.orderNumber}
              onChange={set('orderNumber')}
            />
          </div>
          <div>
            <label className="collaboration-label" htmlFor="rec-message">Opis reklamacije *</label>
            <textarea
              id="rec-message"
              className="collaboration-input collaboration-textarea"
              placeholder="Opišite problem sa proizvodom…"
              value={form.message}
              onChange={set('message')}
            />
          </div>
          {error ? <p className="collaboration-error">{error}</p> : null}
          <button type="submit" className="collaboration-submit" disabled={sending}>
            {sending ? 'Slanje…' : 'Pošalji reklamaciju'}
          </button>
        </form>
      )}
    </section>
  )
}
