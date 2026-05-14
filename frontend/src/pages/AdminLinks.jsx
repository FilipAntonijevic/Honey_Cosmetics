import { useEffect, useState } from 'react'
import api from '../api'

const EMPTY = {
  instagramUrl: '',
  tikTokUrl: '',
  emailAddress: '',
  phoneNumber: '',
  complaintsEmail: '',
  whatsAppNumber: '',
  viberNumber: '',
}

const isLikelyUrl = (s) => /^https?:\/\//i.test(s.trim())
const isLikelyEmail = (s) => s.trim().includes('@')

export default function AdminLinks() {
  const [form, setForm] = useState(EMPTY)
  const [initial, setInitial] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get('/admin/site/links')
      .then(({ data }) => {
        if (cancelled) return
        const next = {
          instagramUrl: data?.instagramUrl ?? '',
          tikTokUrl: data?.tikTokUrl ?? '',
          emailAddress: data?.emailAddress ?? '',
          phoneNumber: data?.phoneNumber ?? '',
          complaintsEmail: data?.complaintsEmail ?? '',
          whatsAppNumber: data?.whatsAppNumber ?? '',
          viberNumber: data?.viberNumber ?? '',
        }
        setForm(next)
        setInitial(next)
      })
      .catch(() => {
        if (!cancelled) setError('Greška pri učitavanju linkova.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setMessage('')
  }

  const dirty =
    form.instagramUrl !== initial.instagramUrl ||
    form.tikTokUrl !== initial.tikTokUrl ||
    form.emailAddress !== initial.emailAddress ||
    form.phoneNumber !== initial.phoneNumber ||
    form.complaintsEmail !== initial.complaintsEmail ||
    form.whatsAppNumber !== initial.whatsAppNumber ||
    form.viberNumber !== initial.viberNumber

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const ig = form.instagramUrl.trim()
    const tt = form.tikTokUrl.trim()
    const em = form.emailAddress.trim()
    const ph = form.phoneNumber.trim()
    const ce = form.complaintsEmail.trim()
    const wa = form.whatsAppNumber.trim()
    const vb = form.viberNumber.trim()

    if (ig && !isLikelyUrl(ig)) {
      setError('Instagram link mora počinjati sa http:// ili https://')
      return
    }
    if (tt && !isLikelyUrl(tt)) {
      setError('TikTok link mora počinjati sa http:// ili https://')
      return
    }
    if (em && !isLikelyEmail(em) && !isLikelyUrl(em)) {
      setError('Email mora sadržati @ (ili biti puna URL adresa).')
      return
    }
    if (ce && !isLikelyEmail(ce)) {
      setError('Email za reklamacije mora sadržati @.')
      return
    }

    setSaving(true)
    try {
      const { data } = await api.put('/admin/site/links', {
        instagramUrl: ig,
        tikTokUrl: tt,
        emailAddress: em,
        phoneNumber: ph,
        complaintsEmail: ce,
        whatsAppNumber: wa,
        viberNumber: vb,
      })
      const next = {
        instagramUrl: data?.instagramUrl ?? '',
        tikTokUrl: data?.tikTokUrl ?? '',
        emailAddress: data?.emailAddress ?? '',
        phoneNumber: data?.phoneNumber ?? '',
        complaintsEmail: data?.complaintsEmail ?? '',
        whatsAppNumber: data?.whatsAppNumber ?? '',
        viberNumber: data?.viberNumber ?? '',
      }
      setForm(next)
      setInitial(next)
      setMessage('Sačuvano.')
    } catch (err) {
      setError(err?.response?.data ?? 'Greška pri čuvanju.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="adm-page">
        <div className="adm-page-header"><h1>Linkovi</h1></div>
        <p>Učitavanje…</p>
      </div>
    )
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1>Linkovi</h1>
      </div>

      <form className="adm-links-form" onSubmit={submit}>
        <LinkField
          icon={<InstagramIcon />}
          label="Instagram"
          placeholder="https://www.instagram.com/honey.cosmetics"
          value={form.instagramUrl}
          onChange={set('instagramUrl')}
          type="url"
        />

        <LinkField
          icon={<TikTokIcon />}
          label="TikTok"
          placeholder="https://www.tiktok.com/@honey.cosmetics"
          value={form.tikTokUrl}
          onChange={set('tikTokUrl')}
          type="url"
        />

        <LinkField
          icon={<MailIcon />}
          label="Email"
          placeholder="info@honey-cosmetic.com"
          value={form.emailAddress}
          onChange={set('emailAddress')}
          type="text"
        />

        <LinkField
          icon={<PhoneIcon />}
          label="Mobilni telefon"
          placeholder="+381606340344"
          value={form.phoneNumber}
          onChange={set('phoneNumber')}
          type="tel"
        />

        <LinkField
          icon={<WhatsAppIcon />}
          label="WhatsApp (broj ili wa.me link)"
          placeholder="+381606340344"
          value={form.whatsAppNumber}
          onChange={set('whatsAppNumber')}
          type="text"
        />

        <LinkField
          icon={<ViberIcon />}
          label="Viber (broj ili viber:// link)"
          placeholder="+381606340344"
          value={form.viberNumber}
          onChange={set('viberNumber')}
          type="text"
        />

        <LinkField
          icon={<ComplaintsIcon />}
          label="Email za reklamacije"
          placeholder="reklamacije@honey-cosmetic.com"
          value={form.complaintsEmail}
          onChange={set('complaintsEmail')}
          type="text"
        />

        {error && <div className="adm-links-error">{String(error)}</div>}
        {message && <div className="adm-links-ok">{message}</div>}

        <div className="adm-links-actions">
          <button
            type="submit"
            className="adm-links-save"
            disabled={saving || !dirty}
          >
            {saving ? 'Čuvam…' : 'Sačuvaj'}
          </button>
        </div>
      </form>
    </div>
  )
}

function LinkField({ icon, label, placeholder, value, onChange, type }) {
  return (
    <label className="adm-links-row">
      <span className="adm-links-icon" aria-hidden="true">{icon}</span>
      <span className="adm-links-text">
        <span className="adm-links-label">{label}</span>
        <input
          className="adm-links-input"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          autoComplete="off"
        />
      </span>
    </label>
  )
}

function InstagramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V9.34a8.16 8.16 0 0 0 4.77 1.52V7.4a4.85 4.85 0 0 1-1.84-.71z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6.03 6.03l.96-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.81 11.81 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  )
}

function ViberIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.398.002c-.32 0-1.246 0-1.49.026C7.21.226 5.32.945 3.65 2.486 1.91 4.083.94 6.06.62 8.41c-.1.74-.13 1.49-.14 2.237-.01 1.92-.01 3.83.04 5.75.05 1.84.62 3.5 1.89 4.87 1.13 1.23 2.54 1.93 4.18 2.18.42.06.85.1 1.28.13.05 0 .07.02.07.07v.31c.01.69-.07.6.46.59.04 0 .08-.02.12-.04.59-.39 1.18-.78 1.77-1.17l1.13-.75c.05-.03.1-.04.16-.04 1.07-.03 2.15-.04 3.21-.16 1.7-.19 3.16-.85 4.31-2.14 1.05-1.17 1.6-2.56 1.83-4.1.16-1.06.18-2.13.18-3.21V8.59c-.01-.95-.07-1.89-.27-2.82-.46-2.17-1.6-3.86-3.6-4.94-1.18-.63-2.47-.93-3.79-.99-1.13-.05-2.26-.04-3.38-.04zm.06 2.16c1.16 0 2.32 0 3.48.07 1.19.07 2.34.34 3.34 1.03 1.39.96 2.18 2.34 2.5 3.96.21 1.07.25 2.16.25 3.25v3.36c-.01.86-.07 1.71-.27 2.55-.41 1.69-1.43 2.85-3.05 3.5-.85.34-1.74.47-2.65.5-1.04.04-2.08.05-3.13.07-.13 0-.24.04-.34.11l-2.31 1.59c-.03.02-.06.05-.09.06-.05.01-.08-.02-.08-.07v-.96c0-.27-.04-.31-.31-.34-.41-.04-.83-.07-1.24-.12-1.61-.21-2.92-.92-3.83-2.31-.6-.92-.88-1.94-.98-3.02-.07-.79-.07-1.59-.08-2.39 0-1.32-.01-2.64.04-3.95.04-1.16.21-2.3.71-3.37.74-1.59 1.97-2.6 3.67-3.05.83-.22 1.68-.31 2.54-.34.61-.02 1.22-.04 1.83-.04zM12.36 4.55c-.13 0-.2.07-.2.2v.4c0 .12.07.19.19.2.51.05 1.01.13 1.5.27 1.42.42 2.55 1.22 3.4 2.43.68.97 1.04 2.06 1.13 3.24.02.27.07.32.34.32h.34c.18-.01.27-.1.27-.28-.04-.74-.16-1.46-.39-2.16-.52-1.59-1.49-2.84-2.91-3.74-.96-.61-2.03-.94-3.16-1.06-.17-.02-.34-.02-.51-.02zm.32 1.78c-.18-.01-.27.06-.28.24v.4c0 .14.06.21.2.23.46.04.91.16 1.32.36 1.07.53 1.78 1.35 2.13 2.49.13.42.18.85.21 1.28.01.16.08.23.24.24h.4c.18 0 .28-.09.27-.27-.02-.49-.09-.97-.23-1.45-.38-1.33-1.18-2.34-2.36-3.07-.55-.34-1.15-.55-1.78-.65-.04 0-.08-.01-.12-.01zM12.99 8.1c-.16 0-.24.07-.24.24v.43c0 .14.08.22.22.23.32.03.61.16.83.4.21.23.32.5.34.81.01.16.09.24.25.24h.43c.16 0 .24-.08.23-.24-.01-.79-.61-1.7-1.42-1.95-.21-.07-.43-.1-.65-.16zM9.62 7.06c-.21-.01-.42.08-.6.21-.45.34-.85.74-1.17 1.2-.16.23-.15.51.04.71.32.34.66.66 1 .98.07.07.13.15.16.24.07.18 0 .35-.13.5l-.34.4c-.1.13-.18.27-.19.43-.01.19.07.36.18.51.5.7 1.13 1.27 1.86 1.71.46.28.96.46 1.49.59.24.06.43.01.6-.18l.46-.46c.16-.16.36-.16.55-.06.18.1.36.21.55.31.32.18.65.36.97.55.16.1.21.27.13.45-.04.09-.1.18-.16.25-.36.4-.74.79-1.1 1.19-.21.23-.5.31-.79.21-.7-.21-1.39-.46-2.05-.78-1.39-.66-2.61-1.55-3.59-2.74-.71-.86-1.29-1.8-1.69-2.85-.21-.55-.39-1.11-.49-1.69-.04-.27.04-.5.21-.71l1.13-1.13c.13-.13.27-.18.4-.06.07.05.13.13.18.21.18.32.36.65.55.97.13.21.27.42.4.62.07.13.07.27-.03.39l-.43.46zm10.36 5.81c-.21-.01-.39.13-.49.32-.55.94-1.27 1.69-2.21 2.21-.97.55-1.99.78-3.09.75-.21-.01-.39.11-.43.32-.07.34.15.55.5.55 1.21 0 2.39-.27 3.45-.84 1.09-.59 1.95-1.41 2.62-2.44.13-.21.05-.46-.18-.62-.07-.04-.1-.06-.17-.05z"/>
    </svg>
  )
}

function ComplaintsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
      <path d="M12 11v3"/>
      <circle cx="12" cy="17" r="0.6" fill="currentColor"/>
    </svg>
  )
}
