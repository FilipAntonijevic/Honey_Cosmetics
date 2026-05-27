import { useEffect, useState } from 'react'
import api from '../../api'

const DEFAULT_TEXT = 'Besplatna dostava za porudžbinu preko 10.000 RSD • Popust na prvu porudžbinu 10% uz kod FIRSTORDER'

export default function AdminNotificationBanner({ embedded = false }) {
  const [text, setText] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [initial, setInitial] = useState({ text: '', enabled: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    api.get('/admin/home-screen/notification-banner')
      .then(({ data }) => {
        if (cancelled) return
        const next = {
          text: data?.text ?? '',
          enabled: data?.enabled ?? true,
        }
        setText(next.text)
        setEnabled(next.enabled)
        setInitial(next)
      })
      .catch(() => {
        if (!cancelled) setError('Učitavanje nije uspelo.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const dirty = text !== initial.text || enabled !== initial.enabled

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const trimmed = text.trim()
    if (!trimmed) {
      setError('Tekst trake je obavezan.')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.put('/admin/home-screen/notification-banner', {
        text: trimmed,
        enabled,
      })
      const next = { text: data?.text ?? trimmed, enabled: data?.enabled ?? enabled }
      setText(next.text)
      setEnabled(next.enabled)
      setInitial(next)
      setSuccess('Sačuvano.')
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.title ?? 'Čuvanje nije uspelo.')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setText(initial.text)
    setEnabled(initial.enabled)
    setError('')
    setSuccess('')
  }

  const previewSegments = (text.trim() || DEFAULT_TEXT).split('•').map((s) => s.trim()).filter(Boolean)

  if (loading) {
    return embedded ? <div className="adm-loading">Učitavanje…</div> : (
      <div className="adm-page">
        <div className="adm-page-header"><h1 className="adm-page-title">Notification banner</h1></div>
        <div className="adm-loading">Učitavanje…</div>
      </div>
    )
  }

  return (
    <div className={embedded ? 'adm-home-section' : 'adm-page'}>
      {!embedded && (
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Notification banner</h1>
            <p className="adm-page-sub">Crna traka na vrhu sajta sa ponavljajućim tekstom.</p>
          </div>
        </div>
      )}

      {embedded && (
        <div className="adm-home-section-head">
          <div>
            <h2 className="adm-home-section-title">Notification banner</h2>
            <p className="adm-page-sub">Crna traka na vrhu sajta sa ponavljajućim tekstom.</p>
          </div>
        </div>
      )}

      {error && <div className="adm-form-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && (
        <div
          className="adm-form-error"
          style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', marginBottom: '1rem' }}
        >
          {success}
        </div>
      )}

      <form onSubmit={save} className="adm-modal-body adm-home-banner-form">
        <label className="adm-filter-check adm-home-banner-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => { setEnabled(e.target.checked); setSuccess('') }}
          />
          <span>Prikaži traku korisnicima</span>
        </label>

        <div className="adm-form-row" style={{ marginTop: '1rem' }}>
          <label className="adm-form-row">Tekst trake</label>
          <p className="adm-field-hint" style={{ margin: '0 0 0.5rem' }}>
            Više poruka razdvojite znakom • (npr. poruka 1 • poruka 2).
          </p>
          <textarea
            className="adm-input adm-home-banner-textarea"
            rows={4}
            value={text}
            onChange={(e) => { setText(e.target.value); setSuccess('') }}
            placeholder={DEFAULT_TEXT}
          />
        </div>

        <div className="adm-home-banner-preview-wrap">
          <span className="adm-form-row">Pregled</span>
          <div className={`top-strip adm-home-banner-preview${enabled ? '' : ' adm-home-banner-preview--off'}`}>
            {enabled ? (
              <div className="ticker-track adm-home-banner-preview-track">
                {[...Array(2)].map((_, i) => (
                  <span key={i} className="ticker-item">
                    {previewSegments.map((seg, j) => (
                      <span key={`${i}-${j}`}>
                        {seg}
                        {j < previewSegments.length - 1 && <span className="ticker-sep">•</span>}
                      </span>
                    ))}
                    <span className="ticker-sep">•</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="adm-home-banner-preview-off">Traka je isključena — korisnici je ne vide.</p>
            )}
          </div>
        </div>

        <div className="adm-page-header-actions" style={{ marginTop: '1.25rem' }}>
          <button type="button" className="adm-btn" onClick={reset} disabled={!dirty || saving}>
            Poništi
          </button>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={!dirty || saving}>
            {saving ? 'Čuvanje…' : 'Sačuvaj'}
          </button>
        </div>
      </form>
    </div>
  )
}
