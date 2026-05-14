import { useEffect, useState } from 'react'
import api from '../api'

const EMPTY = {
  code: '',
  discountValue: '',
  isPercentage: true,
  expiresAt: '',
  firstOrderOnly: false,
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

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

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [key]: val }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.code.trim()) { setError('Kod je obavezan.'); return }
    if (!form.discountValue || isNaN(Number(form.discountValue))) { setError('Popust mora biti broj.'); return }
    setSaving(true)
    try {
      await api.post('/coupons', {
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue),
        isPercentage: form.isPercentage,
        expiresAt: form.expiresAt || null,
        firstOrderOnly: form.firstOrderOnly,
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

  const deleteCoupon = async (id) => {
    if (!confirm('Obrisati kupon?')) return
    await api.delete(`/coupons/${id}`)
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  const fmt = (c) =>
    c.isPercentage ? `${c.discountValue}%` : `${Number(c.discountValue).toLocaleString('sr-RS')} RSD`

  return (
    <div className="adm-content">
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
              <label className="adm-form-row">Popust</label>
              <input className="adm-input" type="number" min="0" step="0.01" placeholder="10" value={form.discountValue} onChange={set('discountValue')} />
            </div>
          </div>

          <div className="adm-form-row adm-form-row--2" style={{ marginTop: '0.8rem' }}>
            <div>
              <label className="adm-form-row">Ističe (opciono)</label>
              <input className="adm-input" type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'flex-end', paddingBottom: '0.1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isPercentage} onChange={set('isPercentage')} />
                Procentualni popust (%)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.firstOrderOnly} onChange={set('firstOrderOnly')} />
                Samo za prvu porudžbinu
              </label>
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
      ) : coupons.length === 0 ? (
        <p className="adm-empty">Nema kupona.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Popust</th>
                <th>Tip</th>
                <th>Ističe</th>
                <th>Prva narudžbina</th>
                <th>Iskorišćen</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id}>
                  <td><strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{c.code}</strong></td>
                  <td>{fmt(c)}</td>
                  <td>{c.isPercentage ? 'Procenat' : 'Fiksni iznos'}</td>
                  <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('sr-RS') : '—'}</td>
                  <td>{c.firstOrderOnly ? '✓' : '—'}</td>
                  <td>{c.usageCount}×</td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 999,
                      background: c.isActive ? '#d1fae5' : '#f3f4f6',
                      color: c.isActive ? '#065f46' : '#6b7280'
                    }}>
                      {c.isActive ? 'Aktivan' : 'Neaktivan'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="adm-btn-sm"
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer' }}
                      onClick={() => deleteCoupon(c.id)}
                    >
                      Obriši
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
