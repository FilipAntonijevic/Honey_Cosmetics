import { useEffect, useRef, useState } from 'react'
import api from '../api'
import { apiImageUrl } from '../lib/assets'

const emptyForm = { name: '', imageUrl: '' }

export default function AdminCategories() {
  const [productTypes, setProductTypes] = useState([])
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const loadTypes = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/product-types')
      setProductTypes(data)
      if (data.length && selectedTypeId === '') {
        setSelectedTypeId(String(data[0].id))
      }
    } catch {
      setProductTypes([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async (typeId) => {
    if (!typeId) {
      setCategories([])
      return
    }
    setListLoading(true)
    try {
      const { data } = await api.get('/admin/categories', { params: { productTypeId: typeId } })
      setCategories(data)
    } catch {
      setCategories([])
    } finally {
      setListLoading(false)
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- mount fetch */
  useEffect(() => {
    loadTypes()
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- reload list when vrsta changes */
  useEffect(() => {
    if (selectedTypeId) loadCategories(selectedTypeId)
    else setCategories([])
  }, [selectedTypeId])
  /* eslint-enable react-hooks/set-state-in-effect */

  const openNew = () => {
    if (!selectedTypeId) {
      setError('Prvo izaberite vrstu proizvoda.')
      return
    }
    setForm(emptyForm)
    setEditId(null)
    setError('')
    setShowForm(true)
  }

  const openEdit = (row) => {
    setForm({ name: row.name, imageUrl: row.imageUrl })
    setEditId(row.id)
    setError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setError('')
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const uploadImage = async (file) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/admin/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm((f) => ({ ...f, imageUrl: data.url }))
    } catch {
      setError('Upload slike nije uspeo.')
    } finally {
      setUploading(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setError('')
    if (!selectedTypeId) {
      setError('Izaberite vrstu proizvoda.')
      return
    }
    if (!form.name.trim()) {
      setError('Naziv je obavezan.')
      return
    }
    if (!form.imageUrl.trim()) {
      setError('Slika je obavezna (URL ili upload).')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      imageUrl: form.imageUrl.trim(),
      productTypeId: parseInt(selectedTypeId, 10),
    }
    try {
      if (editId) {
        await api.put(`/admin/categories/${editId}`, payload)
      } else {
        await api.post('/admin/categories', payload)
      }
      await loadCategories(selectedTypeId)
      closeForm()
    } catch (err) {
      const msg = err.response?.data
      setError(typeof msg === 'string' ? msg : err.response?.data?.title ?? 'Čuvanje nije uspelo.')
    } finally {
      setSaving(false)
    }
  }

  const deleteRow = async (id, name) => {
    if (!window.confirm(`Obrisati kategoriju "${name}"?`)) return
    try {
      await api.delete(`/admin/categories/${id}`)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      alert('Brisanje nije uspelo: ' + (err.response?.status ?? err.message))
    }
  }

  const selectedTypeLabel = productTypes.find((t) => String(t.id) === String(selectedTypeId))?.name ?? ''

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Kategorije</h1>
          <p className="adm-page-sub">
            Kategorije unutar vrste (npr. Gel lak → podkategorije). Izaberite vrstu proizvoda da biste upravljali njenim kategorijama.
          </p>
        </div>
      </div>

      <div className="adm-toolbar" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: '#374151' }}>Vrsta proizvoda</label>
          <select
            className="adm-select adm-select-sm"
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            disabled={loading}
          >
            <option value="">— izaberite —</option>
            {productTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button type="button" className="adm-btn adm-btn-primary adm-btn-sm" onClick={openNew} disabled={!selectedTypeId}>
            + Nova kategorija
          </button>
        </div>
      </div>

      {loading ? (
        <div className="adm-loading">Učitavanje…</div>
      ) : !selectedTypeId ? (
        <div className="adm-empty">Izaberite vrstu proizvoda iz liste iznad.</div>
      ) : listLoading ? (
        <div className="adm-loading">Učitavanje kategorija…</div>
      ) : categories.length === 0 ? (
        <div className="adm-empty">
          Nema kategorija za „{selectedTypeLabel}". Kliknite „Nova kategorija" da dodate prvu.
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Slika</th>
                <th>Naziv</th>
                <th style={{ width: '160px' }} />
              </tr>
            </thead>
            <tbody>
              {categories.map((row) => (
                <tr key={row.id} className="adm-table-row">
                  <td>
                    {row.imageUrl ? (
                      <img src={apiImageUrl(row.imageUrl)} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td className="adm-customer-name">{row.name}</td>
                  <td>
                    <button type="button" className="adm-btn adm-btn-sm" onClick={() => openEdit(row)}>Izmeni</button>
                    {' '}
                    <button type="button" className="adm-btn adm-btn-sm adm-btn-danger" onClick={() => deleteRow(row.id, row.name)}>Obriši</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="adm-modal">
            <div className="adm-modal-header">
              <h2>{editId ? 'Izmeni kategoriju' : 'Nova kategorija'}</h2>
              <button type="button" className="adm-modal-close" onClick={closeForm}>✕</button>
            </div>
            <p style={{ margin: '0 1rem', fontSize: '0.85rem', color: '#6b7280' }}>
              Vrsta: <strong>{selectedTypeLabel}</strong>
            </p>
            <form onSubmit={save} className="adm-form">
              {error && <div className="adm-form-error">{error}</div>}
              <div className="adm-form-row">
                <label>Naziv *</label>
                <input className="adm-input" value={form.name} onChange={set('name')} required />
              </div>
              <div className="adm-form-row">
                <label>Slika *</label>
                <div className="adm-image-row">
                  <input className="adm-input" placeholder="URL slike…" value={form.imageUrl} onChange={set('imageUrl')} />
                  <span className="adm-or">ili</span>
                  <input
                    type="file"
                    ref={fileRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])}
                  />
                  <button type="button" className="adm-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? 'Upload…' : '↑ Upload'}
                  </button>
                </div>
                {form.imageUrl && <img src={apiImageUrl(form.imageUrl)} alt="" className="adm-img-preview" />}
              </div>
              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={closeForm}>Odustani</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
                  {saving ? 'Čuvanje…' : 'Sačuvaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
