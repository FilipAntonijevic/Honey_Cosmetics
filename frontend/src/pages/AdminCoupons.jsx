import { useEffect, useMemo, useRef, useState } from 'react'
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

  const slashOrDot = v.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/)
  if (slashOrDot) {
    const [, d, mo, y] = slashOrDot
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), 23, 59, 59, 999)
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, mo, d] = v.split('-').map(Number)
    const dt = new Date(y, mo - 1, d, 23, 59, 59, 999)
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }

  const parsed = new Date(v)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

/** dd/mm/yyyy ili dd.mm.yyyy → YYYY-MM-DD */
function displayToIsoDate(display) {
  const m = display.trim().match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/)
  if (!m) return ''
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function formatExpiryTyping(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const WEEKDAYS = ['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne']
const MONTHS = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
]

function ExpiryCalendar({ open, anchorMonth, selectedDisplay, onPick, onClose }) {
  const [view, setView] = useState(anchorMonth)

  useEffect(() => {
    if (open) setView(anchorMonth)
  }, [open, anchorMonth])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const onClick = (e) => {
      if (!e.target.closest('.adm-coupon-expiry-calendar-popup') && !e.target.closest('.adm-coupon-expiry-calendar-btn')) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, onClose])

  if (!open) return null

  const year = view.getFullYear()
  const month = view.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const pickDay = (day) => {
    const formatted = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`
    onPick(formatted)
    onClose()
  }

  return (
    <div className="adm-coupon-expiry-calendar-popup" role="dialog" aria-label="Izaberi datum">
      <div className="adm-coupon-expiry-calendar-head">
        <button type="button" className="adm-coupon-expiry-calendar-nav" onClick={() => setView(new Date(year, month - 1, 1))} aria-label="Prethodni mesec">‹</button>
        <span className="adm-coupon-expiry-calendar-title">{MONTHS[month]} {year}</span>
        <button type="button" className="adm-coupon-expiry-calendar-nav" onClick={() => setView(new Date(year, month + 1, 1))} aria-label="Sledeći mesec">›</button>
      </div>
      <div className="adm-coupon-expiry-calendar-weekdays">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="adm-coupon-expiry-calendar-grid">
        {cells.map((day, i) => (
          day == null ? (
            <span key={`e-${i}`} className="adm-coupon-expiry-calendar-empty" />
          ) : (
            <button
              key={day}
              type="button"
              className={`adm-coupon-expiry-calendar-day${selectedDisplay === `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}` ? ' is-selected' : ''}`}
              onClick={() => pickDay(day)}
            >
              {day}
            </button>
          )
        ))}
      </div>
    </div>
  )
}

function validateDiscountPercent(raw) {
  if (raw === '' || raw == null) return 'Popust (%) je obavezan.'
  const n = Number(raw)
  if (Number.isNaN(n)) return 'Popust mora biti broj.'
  if (n < 0 || n > 100) return 'Popust mora biti između 0 i 100%.'
  return null
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
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [pendingAction, setPendingAction] = useState(null)
  const pendingActionRef = useRef(null)

  const readError = (err, fallback) => {
    const data = err.response?.data
    if (typeof data === 'string' && data.trim()) return data
    return data?.detail || data?.title || fallback
  }

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

  const handleExpiryTextChange = (e) => {
    setForm((f) => ({ ...f, expiresAt: formatExpiryTyping(e.target.value) }))
  }

  const openExpiryCalendar = () => {
    const iso = displayToIsoDate(form.expiresAt)
    if (iso) {
      const [y, m] = iso.split('-').map(Number)
      setCalendarMonth(new Date(y, m - 1, 1))
    } else {
      const now = new Date()
      setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    }
    setCalendarOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.code.trim()) { setError('Kod je obavezan.'); return }
    const discountError = validateDiscountPercent(form.discountValue)
    if (discountError) { setError(discountError); return }

    const expiresAt = form.expiresAt.trim() ? parseExpiryInput(form.expiresAt) : null
    if (form.expiresAt.trim() && !expiresAt) {
      setError('Datum isticanja nije validan. Koristite format dd/mm/yyyy')
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
    if (pendingActionRef.current) return
    if (!confirm('Deaktivirati kupon? Neće biti moguće iskoristiti, ali ostaje u listi.')) return
    pendingActionRef.current = `deactivate-${id}`
    setPendingAction(pendingActionRef.current)
    setError('')
    try {
      await api.patch(`/coupons/${id}/deactivate`)
      setCoupons(prev => prev.map(c => (c.id === id ? { ...c, isActive: false } : c)))
    } catch (err) {
      setError(readError(err, 'Deaktiviranje kupona nije uspelo.'))
    } finally {
      pendingActionRef.current = null
      setPendingAction(null)
    }
  }

  const deleteCoupon = async (id) => {
    if (pendingActionRef.current) return
    if (!confirm('Ukloniti kupon iz upotrebe? Kupon će biti deaktiviran, a istorija korišćenja sačuvana.')) return
    pendingActionRef.current = `delete-${id}`
    setPendingAction(pendingActionRef.current)
    setError('')
    try {
      await api.delete(`/coupons/${id}`)
      setCoupons(prev => prev.map(c => (c.id === id ? { ...c, isActive: false } : c)))
    } catch (err) {
      setError(readError(err, 'Uklanjanje kupona nije uspelo.'))
    } finally {
      pendingActionRef.current = null
      setPendingAction(null)
    }
  }

  const fmt = (c) => `${c.discountValue}%`

  const fmtExpiry = (expiresAt) =>
    expiresAt ? new Date(expiresAt).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) : '—'

  const renderCouponActions = (c) => (
    <>
      {c.isActive ? (
        <button
          type="button"
          className="adm-btn-sm adm-coupon-btn adm-coupon-btn--deactivate"
          disabled={pendingAction !== null}
          onClick={() => deactivateCoupon(c.id)}
        >
          {pendingAction === `deactivate-${c.id}` ? 'Deaktiviranje…' : 'Deaktiviraj'}
        </button>
      ) : null}
      <button
        type="button"
        className="adm-btn-sm adm-coupon-btn adm-coupon-btn--delete"
        disabled={pendingAction !== null}
        onClick={() => deleteCoupon(c.id)}
      >
        {pendingAction === `delete-${c.id}` ? 'Uklanjanje…' : 'Ukloni'}
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

      {error && !showForm && <p className="adm-form-error" role="alert">{error}</p>}

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
              <input
                className="adm-input"
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="10"
                value={form.discountValue}
                onChange={set('discountValue')}
                onBlur={() => {
                  const msg = validateDiscountPercent(form.discountValue)
                  if (msg) setError(msg)
                }}
              />
            </div>
          </div>

          <div className="adm-form-row" style={{ marginTop: '0.8rem' }}>
            <label className="adm-form-row">Ističe (opciono)</label>
            <div className="adm-coupon-expiry-field">
              <input
                className="adm-input adm-coupon-expiry-input"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/yyyy"
                maxLength={10}
                value={form.expiresAt}
                onChange={handleExpiryTextChange}
              />
              <button
                type="button"
                className="adm-coupon-expiry-calendar-btn"
                title="Izaberi datum"
                aria-label="Izaberi datum"
                aria-expanded={calendarOpen}
                onClick={openExpiryCalendar}
              >
                📅
              </button>
              <ExpiryCalendar
                open={calendarOpen}
                anchorMonth={calendarMonth}
                selectedDisplay={form.expiresAt}
                onPick={(formatted) => setForm((f) => ({ ...f, expiresAt: formatted }))}
                onClose={() => setCalendarOpen(false)}
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
