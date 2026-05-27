import { useEffect, useMemo, useState } from 'react'
import api from '../api'

const USAGE_LIMITS = [
  { value: 'Unlimited', label: 'Neograničeno' },
  { value: 'OncePerUser', label: 'Jednom po korisniku' },
  { value: 'OnceTotal', label: 'Samo jednom (deaktivira se posle upotrebe)' },
]

const EMPTY = {
  code: '',
  discountValue: '',
  expiresAt: '',
  usageLimit: 'OncePerUser',
}

function parseExpiryInput(raw) {
  const v = raw.trim()
  if (!v) return null

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
    const dt = new Date(v)
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }

  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[.\s]+(\d{1,2}):(\d{2}))?$/)
  if (m) {
    const [, d, mo, y, h = '23', mi = '59'] = m
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }

  const parsed = new Date(v)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function toDatetimeLocalValue(raw) {
  const iso = parseExpiryInput(raw)
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const usageLimitLabel = (value) =>
  USAGE_LIMITS.find((o) => o.value === value)?.label ?? value

const COUPON_STATUS_OPTIONS = [
  { value: 'active', label: 'Aktivan', color: '#16a34a' },
  { value: 'inactive', label: 'Neaktivan', color: '#9ca3af' },
]

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState(() => new Set(['active']))
  const [statusHeaderOpen, setStatusHeaderOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/coupons')
      setCoupons(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!statusHeaderOpen) return
    const handler = (e) => {
      if (!e.target.closest('.adm-header-filter')) setStatusHeaderOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusHeaderOpen])

  const visibleCoupons = useMemo(() => {
    if (selectedStatuses.size === 0) return []
    return coupons.filter((c) => {
      const key = c.isActive ? 'active' : 'inactive'
      return selectedStatuses.has(key)
    })
  }, [coupons, selectedStatuses])

  const allStatusesSelected = selectedStatuses.size === COUPON_STATUS_OPTIONS.length
  const statusFilterActive = !allStatusesSelected

  const toggleStatusFilter = (status) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const toggleSelectAllStatuses = () => {
    setSelectedStatuses(allStatusesSelected ? new Set() : new Set(COUPON_STATUS_OPTIONS.map((o) => o.value)))
  }

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [key]: val }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.code.trim()) { setError('Kod je obavezan.'); return }
    if (!form.discountValue || isNaN(Number(form.discountValue))) { setError('Popust mora biti broj.'); return }

    const expiresAt = form.expiresAt.trim() ? parseExpiryInput(form.expiresAt) : null
    if (form.expiresAt.trim() && !expiresAt) {
      setError('Datum isticanja nije validan. Koristite npr. 27.05.2026 18:00')
      return
    }

    setSaving(true)
    try {
      await api.post('/coupons', {
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue),
        isPercentage: true,
        expiresAt,
        usageLimit: form.usageLimit,
      })
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data ?? 'Greška pri kreiranju kupona.')
    } finally {
      setSaving(false)
    }
  }

  const deactivateCoupon = async (id) => {
    if (!confirm('Deaktivirati kupon? Neće biti moguće iskoristiti, ali ostaje u listi.')) return
    await api.patch(`/coupons/${id}/deactivate`)
    setCoupons(prev => prev.map(c => (c.id === id ? { ...c, isActive: false } : c)))
  }

  const deleteCoupon = async (id) => {
    if (!confirm('Obrisati kupon?')) return
    await api.delete(`/coupons/${id}`)
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  const fmt = (c) => `${c.discountValue}%`

  const fmtExpiry = (expiresAt) =>
    expiresAt ? new Date(expiresAt).toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : '—'

  const renderCouponActions = (c) => (
    <>
      {c.isActive ? (
        <button
          type="button"
          className="adm-btn-sm adm-coupon-btn adm-coupon-btn--deactivate"
          onClick={() => deactivateCoupon(c.id)}
        >
          Deaktiviraj
        </button>
      ) : null}
      <button
        type="button"
        className="adm-btn-sm adm-coupon-btn adm-coupon-btn--delete"
        onClick={() => deleteCoupon(c.id)}
      >
        Obriši
      </button>
    </>
  )

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Kuponi</h1>
          <p className="adm-page-sub">Upravljanje kupon kodovima</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => { setShowForm(s => !s); setError('') }}>
          {showForm ? 'Zatvori' : '+ Novi kupon'}
        </button>
      </div>

      {showForm && (
        <form className="adm-modal-body" onSubmit={submit} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.4rem', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.2rem', fontSize: '1rem', color: '#1a1a2e' }}>Novi kupon</h2>

          <div className="adm-form-row adm-form-row--2">
            <div>
              <label className="adm-form-row">Kod kupona</label>
              <input className="adm-input" placeholder="npr. FIRSTORDER" value={form.code} onChange={set('code')} />
            </div>
            <div>
              <label className="adm-form-row">Popust (%)</label>
              <input className="adm-input" type="number" min="0" max="100" step="0.01" placeholder="10" value={form.discountValue} onChange={set('discountValue')} />
            </div>
          </div>

          <div className="adm-form-row" style={{ marginTop: '0.8rem' }}>
            <label className="adm-form-row">Ističe (opciono)</label>
            <div className="adm-coupon-expiry-row">
              <input
                className="adm-input"
                type="text"
                placeholder="npr. 27.05.2026 18:00"
                value={form.expiresAt}
                onChange={set('expiresAt')}
              />
              <input
                className="adm-input adm-coupon-expiry-calendar"
                type="datetime-local"
                value={toDatetimeLocalValue(form.expiresAt)}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                aria-label="Izaberi datum i vreme isticanja"
              />
            </div>
          </div>

          <div className="adm-form-row" style={{ marginTop: '0.8rem' }}>
            <label className="adm-form-row">Korišćenje</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.35rem' }}>
              {USAGE_LIMITS.map(({ value, label }) => (
                <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="usageLimit"
                    value={value}
                    checked={form.usageLimit === value}
                    onChange={() => setForm(f => ({ ...f, usageLimit: value }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="adm-form-error" style={{ marginTop: '0.8rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1rem' }}>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
              {saving ? 'Čuvanje…' : 'Kreiraj kupon'}
            </button>
            <button type="button" className="adm-btn" onClick={() => { setShowForm(false); setError('') }}>
              Otkaži
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Učitavanje…</p>
      ) : (
        <div className="adm-table-wrap adm-table-wrap--coupons">
          <table className="adm-table adm-table--coupons">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Popust</th>
                <th>Ističe</th>
                <th>Korišćenje</th>
                <th>Iskorišć.</th>
                <th className="adm-header-filter" style={{ position: 'relative', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  <div
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    onClick={() => setStatusHeaderOpen((open) => !open)}
                  >
                    Status
                    <span
                      style={{
                        fontSize: 11,
                        opacity: statusFilterActive ? 1 : 0.4,
                        color: statusFilterActive ? '#f59e0b' : 'inherit',
                      }}
                    >
                      ▼
                    </span>
                  </div>
                  {statusHeaderOpen && (
                    <div className="adm-filter-popup adm-filter-popup--status">
                      <button type="button" className="adm-filter-popup-action" onClick={toggleSelectAllStatuses}>
                        {allStatusesSelected ? 'Poništi sve' : 'Označi sve'}
                      </button>
                      {COUPON_STATUS_OPTIONS.map(({ value, label, color }) => (
                        <label key={value} className="adm-filter-check">
                          <input
                            type="checkbox"
                            checked={selectedStatuses.has(value)}
                            onChange={() => toggleStatusFilter(value)}
                          />
                          <span className="adm-filter-check-dot" style={{ background: color }} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {visibleCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                    {coupons.length === 0 ? 'Nema kupona.' : 'Nema kupona za izabrani filter.'}
                  </td>
                </tr>
              ) : (
                visibleCoupons.map(c => (
                  <tr key={c.id}>
                    <td data-label="Kod" className="adm-coupon-cell-code">
                      <strong className="adm-coupon-code">{c.code}</strong>
                    </td>
                    <td data-label="Popust">{fmt(c)}</td>
                    <td data-label="Ističe">{fmtExpiry(c.expiresAt)}</td>
                    <td data-label="Korišćenje">{usageLimitLabel(c.usageLimit)}</td>
                    <td data-label="Iskorišćeno">{c.usageCount}×</td>
                    <td data-label="Status" className="adm-coupon-cell-status">
                      <span className={`adm-coupon-status${c.isActive ? ' adm-coupon-status--active' : ''}`}>
                        {c.isActive ? 'Aktivan' : 'Neaktivan'}
                      </span>
                    </td>
                    <td data-label="Akcije" className="adm-coupon-cell-actions">
                      {renderCouponActions(c)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
