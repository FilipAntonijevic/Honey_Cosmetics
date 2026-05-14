import { useState } from 'react'
import api from '../api'
import { DEFAULT_PHONE_PREFIX, cleanPhone, placeCursorAtEndIfPrefix } from '../utils/phone'

const EMPTY = { fullName: '', company: '', email: '', phone: DEFAULT_PHONE_PREFIX, message: '' }

export default function Collaboration() {
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

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
    <div style={{ minHeight: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>Honey Cosmetics</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.2rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 0.6rem' }}>
          Saradnja
        </h1>
        <p style={{ color: '#6b6b6b', fontSize: '0.88rem', marginBottom: '2.2rem', lineHeight: 1.7 }}>
          Zainteresovani ste za saradnju sa Honey Cosmetics? Popunite formular i odgovorićemo vam u najkraćem roku.
        </p>

        {sent ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</p>
            <p style={{ fontWeight: 600, color: '#15803d', marginBottom: '0.3rem' }}>Poruka je poslata!</p>
            <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Javićemo vam se uskoro.</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Ime i prezime *</label>
                <input style={inputStyle} placeholder="Marko Marković" value={form.fullName} onChange={set('fullName')} />
              </div>
              <div>
                <label style={labelStyle}>Naziv firme</label>
                <input style={inputStyle} placeholder="opciono" value={form.company} onChange={set('company')} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" placeholder="email@example.com" value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label style={labelStyle}>Telefon</label>
                <input
                  style={inputStyle}
                  type="tel"
                  placeholder="+381 60 000 0000"
                  value={form.phone}
                  onChange={set('phone')}
                  onFocus={placeCursorAtEndIfPrefix}
                  onClick={placeCursorAtEndIfPrefix}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Poruka *</label>
              <textarea
                style={{ ...inputStyle, height: 130, resize: 'vertical' }}
                placeholder="Opišite vaš predlog saradnje..."
                value={form.message}
                onChange={set('message')}
              />
            </div>
            {error && <p style={{ fontSize: '0.82rem', color: '#dc2626', margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={sending}
              style={{
                alignSelf: 'flex-start',
                background: '#1a1a2e', color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '0.85rem 2.2rem',
                fontSize: '0.85rem', fontFamily: 'inherit',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: sending ? 'not-allowed' : 'pointer',
                opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? 'Slanje…' : 'Pošalji'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  border: '1px solid #e0d0c0',
  borderRadius: 8,
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  background: '#fff',
  color: '#1a1a1a',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#5c3d26',
  marginBottom: '0.35rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}
