import { useEffect, useState } from 'react'
import api from '../api'
import ViberIcon from '../components/icons/ViberIcon'

const EMPTY = {
  instagramUrl: '',
  tikTokUrl: '',
  emailAddress: '',
  phoneNumber: '',
  complaintsEmail: '',
  notificationsEmail: '',
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
          notificationsEmail: data?.notificationsEmail ?? '',
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
    form.notificationsEmail !== initial.notificationsEmail ||
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
    const ne = form.notificationsEmail.trim()
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
    if (ne && !isLikelyEmail(ne)) {
      setError('Email za notifikacije mora sadržati @.')
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
        notificationsEmail: ne,
        whatsAppNumber: wa,
        viberNumber: vb,
      })
      const next = {
        instagramUrl: data?.instagramUrl ?? '',
        tikTokUrl: data?.tikTokUrl ?? '',
        emailAddress: data?.emailAddress ?? '',
        phoneNumber: data?.phoneNumber ?? '',
        complaintsEmail: data?.complaintsEmail ?? '',
        notificationsEmail: data?.notificationsEmail ?? '',
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
      <div className="adm-page adm-page-links">
        <div className="adm-page-header"><h1>Linkovi</h1></div>
        <p>Učitavanje…</p>
      </div>
    )
  }

  return (
    <div className="adm-page adm-page-links">
      <div className="adm-page-header">
        <h1>Linkovi</h1>
      </div>

      <form className="adm-links-form" onSubmit={submit}>
        <p className="adm-links-section-heading">Email adrese</p>

        <LinkField
          icon={<OrdersInboxIcon />}
          label="Porudžbine i notifikacije (inbox)"
          placeholder="npr. narudzbine@honey-cosmetic.com"
          value={form.notificationsEmail}
          onChange={set('notificationsEmail')}
          type="text"
        />

        <LinkField
          icon={<MailIcon />}
          label="Info — kontakt za kupce na sajtu"
          placeholder="info@honey-cosmetic.com"
          value={form.emailAddress}
          onChange={set('emailAddress')}
          type="text"
        />

        <LinkField
          icon={<MailIcon />}
          label="Reklamacije"
          placeholder="reklamacije@honey-cosmetic.com"
          value={form.complaintsEmail}
          onChange={set('complaintsEmail')}
          type="text"
        />

        <p className="adm-links-section-heading adm-links-section-heading--spaced">Društvene mreže i telefon</p>

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

/** Porudžbine — inbox ikonica (vizuelno drugačija od prostog konverta) */
function OrdersInboxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
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

