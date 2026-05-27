import { useEffect, useRef, useState } from 'react'
import api from '../api'
import ApiImage from '../components/ApiImage'

const POPUP_TYPES = [
  { value: 'Product', label: 'Proizvod' },
  { value: 'Announcement', label: 'Obaveštenje' },
  { value: 'Coupon', label: 'Kupon' },
]

const EMPTY_FORM = {
  type: 'Product',
  imageUrl: '',
  mobileImageUrl: '',
  productId: '',
  couponCode: '',
  activate: true,
}

const typeLabel = (type) => POPUP_TYPES.find((t) => t.value === type)?.label ?? type

function apiErrorMessage(err, fallback) {
  const data = err.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data?.errors) {
    const msgs = Object.values(data.errors).flat().filter(Boolean)
    if (msgs.length) return msgs.join(' ')
  }
  if (typeof data?.title === 'string' && data.title.trim()) return data.title
  if (err.response?.status === 404) return 'API nije dostupan — restartujte backend.'
  return fallback
}

export default function AdminSitePopup() {
  const [popups, setPopups] = useState([])
  const [products, setProducts] = useState([])
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const desktopFileRef = useRef(null)
  const mobileFileRef = useRef(null)
  const [uploadingDesktop, setUploadingDesktop] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)

  const loadProducts = () =>
    api.get('/admin/products')
      .then(({ data }) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => {
        setProducts([])
        setError((prev) => prev || 'Učitavanje proizvoda nije uspelo.')
      })

  const loadCoupons = () =>
    api.get('/coupons')
      .then(({ data }) => setCoupons(Array.isArray(data) ? data : []))
      .catch(() => {
        setCoupons([])
        setError((prev) => prev || 'Učitavanje kupona nije uspelo.')
      })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/admin/site-popups')
      setPopups(data ?? [])
    } catch (err) {
      setPopups([])
      setError(apiErrorMessage(err, 'Učitavanje popup-ova nije uspelo.'))
    }
    await Promise.all([loadProducts(), loadCoupons()])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (showForm && form.type === 'Product' && products.length === 0 && !loading) {
      loadProducts()
    }
    if (showForm && form.type === 'Coupon' && coupons.length === 0 && !loading) {
      loadCoupons()
    }
  }, [showForm, form.type, products.length, coupons.length, loading])

  const setField = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const uploadImage = async (file, target) => {
    const setUploading = target === 'desktop' ? setUploadingDesktop : setUploadingMobile
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/admin/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm((prev) => ({
        ...prev,
        [target === 'desktop' ? 'imageUrl' : 'mobileImageUrl']: data.url,
      }))
    } catch (err) {
      setError(apiErrorMessage(err, 'Upload nije uspeo.'))
    } finally {
      setUploading(false)
      if (target === 'desktop' && desktopFileRef.current) desktopFileRef.current.value = ''
      if (target === 'mobile' && mobileFileRef.current) mobileFileRef.current.value = ''
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.imageUrl.trim()) {
      setError('Uploadujte PC sliku za popup.')
      return
    }
    if (!form.mobileImageUrl.trim()) {
      setError('Uploadujte mobilnu sliku za popup.')
      return
    }
    if (form.type === 'Product' && !form.productId) {
      setError('Izaberite proizvod.')
      return
    }
    if (form.type === 'Coupon' && !form.couponCode.trim()) {
      setError('Izaberite kupon.')
      return
    }

    setSaving(true)
    try {
      await api.post('/admin/site-popups', {
        imageUrl: form.imageUrl.trim(),
        mobileImageUrl: form.mobileImageUrl.trim(),
        type: form.type,
        productId: form.type === 'Product' ? Number(form.productId) : null,
        couponCode: form.type === 'Coupon' ? form.couponCode.trim() : null,
        activate: form.activate,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Kreiranje nije uspelo.'))
    } finally {
      setSaving(false)
    }
  }

  const activatePopup = async (id) => {
    setError('')
    try {
      await api.patch(`/admin/site-popups/${id}/activate`)
      load()
    } catch {
      setError('Aktivacija nije uspela.')
    }
  }

  const deactivatePopup = async (id) => {
    setError('')
    try {
      await api.patch(`/admin/site-popups/${id}/deactivate`)
      load()
    } catch {
      setError('Deaktivacija nije uspela.')
    }
  }

  const deletePopup = async (id) => {
    if (!confirm('Obrisati ovaj popup?')) return
    setError('')
    try {
      await api.delete(`/admin/site-popups/${id}`)
      load()
    } catch {
      setError('Brisanje nije uspelo.')
    }
  }

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Popup</h1>
          <p className="adm-page-sub">
            Popup koji se prikazuje korisnicima pri otvaranju sajta. U isto vreme može biti aktivan samo jedan.
          </p>
        </div>
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          onClick={() => { setShowForm((s) => !s); setError('') }}
        >
          {showForm ? 'Zatvori' : '+ Novi popup'}
        </button>
      </div>

      {error && <div className="adm-form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {showForm && (
        <form
          className="adm-modal-body adm-site-popup-form"
          onSubmit={submit}
        >
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#1a1a2e' }}>Novi popup</h2>

          <div className="adm-form-row">
            <label className="adm-form-row">Tip popup-a</label>
            <div className="adm-site-popup-type-row">
              {POPUP_TYPES.map(({ value, label }) => (
                <label key={value} className="adm-site-popup-type-option">
                  <input
                    type="radio"
                    name="popupType"
                    value={value}
                    checked={form.type === value}
                    onChange={() => setForm((prev) => ({ ...prev, type: value }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="adm-form-row adm-form-row--2" style={{ marginTop: '0.9rem' }}>
            <div>
              <label className="adm-form-row">PC slika *</label>
              <input
                ref={desktopFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'desktop')}
              />
              <div className="adm-site-popup-upload-row">
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  disabled={uploadingDesktop || uploadingMobile}
                  onClick={() => desktopFileRef.current?.click()}
                >
                  {uploadingDesktop ? 'Upload…' : form.imageUrl ? 'Promeni PC' : 'Upload PC'}
                </button>
                {form.imageUrl && (
                  <ApiImage src={form.imageUrl} alt="" className="adm-site-popup-form-preview adm-site-popup-form-preview--wide" />
                )}
              </div>
            </div>
            <div>
              <label className="adm-form-row">Mobilna slika *</label>
              <input
                ref={mobileFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'mobile')}
              />
              <div className="adm-site-popup-upload-row">
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  disabled={uploadingDesktop || uploadingMobile}
                  onClick={() => mobileFileRef.current?.click()}
                >
                  {uploadingMobile ? 'Upload…' : form.mobileImageUrl ? 'Promeni mobilnu' : 'Upload mobilna'}
                </button>
                {form.mobileImageUrl && (
                  <ApiImage src={form.mobileImageUrl} alt="" className="adm-site-popup-form-preview adm-site-popup-form-preview--tall" />
                )}
              </div>
            </div>
          </div>

          {form.type === 'Product' && (
            <div className="adm-form-row" style={{ marginTop: '0.9rem' }}>
              <label className="adm-form-row">Proizvod</label>
              <select
                className="adm-input"
                value={form.productId}
                onChange={setField('productId')}
              >
                <option value="">
                  {products.length === 0 ? '— Nema učitanih proizvoda —' : '— Izaberite proizvod —'}
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {form.type === 'Coupon' && (
            <div className="adm-form-row" style={{ marginTop: '0.9rem' }}>
              <label className="adm-form-row">Kod kupona</label>
              <select
                className="adm-input"
                value={form.couponCode}
                onChange={setField('couponCode')}
              >
                <option value="">
                  {coupons.length === 0 ? '— Nema učitanih kupona —' : '— Izaberite kupon —'}
                </option>
                {coupons.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code}{c.isActive ? '' : ' (neaktivan)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="adm-form-row" style={{ marginTop: '0.9rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.activate} onChange={setField('activate')} />
              Aktiviraj odmah (deaktivira prethodni aktivan popup)
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1rem' }}>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={saving || uploadingDesktop || uploadingMobile}>
              {saving ? 'Čuvanje…' : 'Kreiraj popup'}
            </button>
            <button
              type="button"
              className="adm-btn"
              onClick={() => { setShowForm(false); setError('') }}
            >
              Otkaži
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="adm-loading">Učitavanje…</div>
      ) : popups.length === 0 ? (
        <p className="adm-empty">Nema popup-ova. Kreiraj prvi iznad.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>PC</th>
                <th>Mobilna</th>
                <th>Tip</th>
                <th>Detalji</th>
                <th>Kreiran</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {popups.map((p) => (
                <tr key={p.id}>
                  <td data-label="PC">
                    <ApiImage src={p.imageUrl} alt="" className="adm-site-popup-list-thumb adm-site-popup-list-thumb--wide" />
                  </td>
                  <td data-label="Mobilna">
                    <ApiImage src={p.mobileImageUrl} alt="" className="adm-site-popup-list-thumb adm-site-popup-list-thumb--tall" />
                  </td>
                  <td data-label="Tip">{typeLabel(p.type)}</td>
                  <td data-label="Detalji">
                    {p.type === 'Product' && (p.productName ?? '—')}
                    {p.type === 'Coupon' && (p.couponCode ?? '—')}
                    {p.type === 'Announcement' && '—'}
                  </td>
                  <td data-label="Kreiran">{fmtDate(p.createdAt)}</td>
                  <td data-label="Akcije" className="adm-coupon-cell-actions">
                    {p.isActive ? (
                      <button
                        type="button"
                        className="adm-btn-sm adm-coupon-btn adm-coupon-btn--deactivate"
                        onClick={() => deactivatePopup(p.id)}
                      >
                        Deaktiviraj
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adm-btn-sm adm-coupon-btn"
                        onClick={() => activatePopup(p.id)}
                      >
                        Aktiviraj
                      </button>
                    )}
                    <button
                      type="button"
                      className="adm-btn-sm adm-coupon-btn adm-coupon-btn--delete"
                      onClick={() => deletePopup(p.id)}
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
