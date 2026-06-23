import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api'
import ApiImage from '../components/ApiImage'
import AdminModal from '../components/admin/AdminModal'
import {
  expandSelectionWithGroupMembers,
  groupProductsWithMembers,
  resolveGroupKey,
} from '../lib/productVariants'

const emptyForm = { name: '', imageUrl: '' }

export default function AdminCategories() {
  const [productTypes, setProductTypes] = useState([])
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [categories, setCategories] = useState([])
  const [typeProducts, setTypeProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const [assignCategory, setAssignCategory] = useState(null)
  const [assignProductIds, setAssignProductIds] = useState([])
  const [assignInitialIds, setAssignInitialIds] = useState([])
  const [assignSearch, setAssignSearch] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState('')

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
      setTypeProducts([])
      return
    }
    setListLoading(true)
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/admin/categories', { params: { productTypeId: typeId } }),
        api.get('/admin/products'),
      ])
      const typeIdNum = parseInt(typeId, 10)
      setCategories(catRes.data)
      setTypeProducts((prodRes.data ?? []).filter((p) => p.productTypeId === typeIdNum))
    } catch {
      setCategories([])
      setTypeProducts([])
    } finally {
      setListLoading(false)
    }
  }

  const productCountByCategory = useMemo(() => {
    const counts = new Map()
    const seen = new Map()
    for (const p of typeProducts) {
      if (p.categoryId == null) continue
      const groupKey = resolveGroupKey(p)
      if (!seen.has(p.categoryId)) seen.set(p.categoryId, new Set())
      const groups = seen.get(p.categoryId)
      if (groups.has(groupKey)) continue
      groups.add(groupKey)
      counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1)
    }
    return counts
  }, [typeProducts])

  const assignProductGroups = useMemo(
    () => groupProductsWithMembers(typeProducts),
    [typeProducts],
  )

  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- mount fetch */
  useEffect(() => {
    loadTypes()
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- reload list when vrsta changes */
  useEffect(() => {
    if (selectedTypeId) loadCategories(selectedTypeId)
    else {
      setCategories([])
      setTypeProducts([])
    }
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

  const openAssign = (row) => {
    setAssignCategory(row)
    setAssignSearch('')
    setAssignError('')
    setAssignLoading(true)
    const inCategory = expandSelectionWithGroupMembers(
      typeProducts.filter((p) => p.categoryId === row.id).map((p) => p.id),
      typeProducts,
    )
    setAssignProductIds(inCategory)
    setAssignInitialIds(inCategory)
    setAssignLoading(false)
  }

  const closeAssign = () => {
    setAssignCategory(null)
    setAssignProductIds([])
    setAssignInitialIds([])
    setAssignSearch('')
    setAssignError('')
  }

  const assignDirty = useMemo(() => {
    if (assignProductIds.length !== assignInitialIds.length) return true
    const sortedA = [...assignProductIds].sort((a, b) => a - b)
    const sortedB = [...assignInitialIds].sort((a, b) => a - b)
    return sortedA.some((id, i) => id !== sortedB[i])
  }, [assignProductIds, assignInitialIds])

  const filteredAssignGroups = useMemo(() => {
    const term = assignSearch.trim().toLowerCase()
    return assignProductGroups.filter(({ rep }) => {
      if (!term) return true
      const hay = [rep.name, rep.category].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(term)
    })
  }, [assignProductGroups, assignSearch])

  const selectedAssignGroupCount = useMemo(() => {
    const selected = new Set(assignProductIds)
    return assignProductGroups.filter((g) => g.memberIds.every((id) => selected.has(id))).length
  }, [assignProductGroups, assignProductIds])

  const isGroupSelected = (memberIds) => memberIds.every((id) => assignProductIds.includes(id))

  const toggleAssignGroup = (memberIds) => {
    setAssignProductIds((prev) => {
      const allSelected = memberIds.every((id) => prev.includes(id))
      if (allSelected) return prev.filter((id) => !memberIds.includes(id))
      return [...new Set([...prev, ...memberIds])]
    })
    setAssignError('')
  }

  const selectAllFiltered = () => {
    const ids = filteredAssignGroups.flatMap((g) => g.memberIds)
    setAssignProductIds((prev) => [...new Set([...prev, ...ids])])
  }

  const clearFiltered = () => {
    const filtered = new Set(filteredAssignGroups.flatMap((g) => g.memberIds))
    setAssignProductIds((prev) => prev.filter((id) => !filtered.has(id)))
  }

  const saveAssign = async () => {
    if (!assignCategory) return
    setAssignError('')
    setAssignSaving(true)
    try {
      await api.put(`/admin/categories/${assignCategory.id}/products`, {
        productIds: assignProductIds,
      })
      await loadCategories(selectedTypeId)
      closeAssign()
    } catch (err) {
      const msg = err.response?.data
      setAssignError(
        typeof msg === 'string' ? msg : msg?.title ?? msg?.detail ?? 'Čuvanje nije uspelo.',
      )
    } finally {
      setAssignSaving(false)
    }
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
      setTypeProducts((prev) =>
        prev.map((p) => (p.categoryId === id ? { ...p, categoryId: null, category: '' } : p)),
      )
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
                <th>Artikala</th>
                <th className="adm-th-actions">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((row) => (
                <tr key={row.id} className="adm-table-row">
                  <td>
                    {row.imageUrl ? (
                      <ApiImage src={row.imageUrl} alt="" style={{ width: 56, height: 56, objectFit: 'fill', borderRadius: 8 }} />
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td className="adm-customer-name">{row.name}</td>
                  <td>{productCountByCategory.get(row.id) ?? 0}</td>
                  <td className="adm-td-actions">
                    <div className="adm-table-actions">
                      <button type="button" className="adm-btn adm-btn-sm adm-btn-primary" onClick={() => openAssign(row)}>
                        Ubaci artikle
                      </button>
                      <button type="button" className="adm-btn adm-btn-sm" onClick={() => openEdit(row)}>Izmeni</button>
                      <button type="button" className="adm-btn adm-btn-sm adm-btn-danger" onClick={() => deleteRow(row.id, row.name)}>Obriši</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal open={showForm} onClose={closeForm}>
        <div className="adm-modal-header">
          <h2>{editId ? 'Izmeni kategoriju' : 'Nova kategorija'}</h2>
          <button type="button" className="adm-modal-close" onClick={closeForm}>✕</button>
        </div>
        <p className="adm-modal-intro">
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
            {form.imageUrl && <ApiImage src={form.imageUrl} alt="" className="adm-img-preview" />}
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="adm-btn" onClick={closeForm}>Odustani</button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
              {saving ? 'Čuvanje…' : 'Sačuvaj'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={Boolean(assignCategory)} onClose={closeAssign} className="adm-modal--wide adm-modal--assign">
        <div className="adm-modal-header">
          <h2>Ubaci artikle</h2>
          <button type="button" className="adm-modal-close" onClick={closeAssign}>✕</button>
        </div>
        {assignCategory && (
          <p className="adm-modal-intro">
            Kategorija: <strong>{assignCategory.name}</strong>
            {' · '}
            Vrsta: <strong>{assignCategory.productTypeName || selectedTypeLabel}</strong>
            {' · '}
            Izabrano: <strong>{selectedAssignGroupCount}</strong>
          </p>
        )}

        {assignError && <div className="adm-form-error" style={{ marginBottom: '0.75rem' }}>{assignError}</div>}

        <div className="adm-cat-assign-toolbar">
          <input
            className="adm-search"
            placeholder="Pretraga proizvoda…"
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
          />
          <button type="button" className="adm-btn adm-btn-sm" onClick={selectAllFiltered}>
            Označi sve
          </button>
          <button type="button" className="adm-btn adm-btn-sm" onClick={clearFiltered}>
            Poništi filter
          </button>
        </div>

        {assignLoading ? (
          <div className="adm-loading">Učitavanje proizvoda…</div>
        ) : filteredAssignGroups.length === 0 ? (
          <div className="adm-empty">Nema proizvoda ove vrste{assignSearch.trim() ? ' za ovu pretragu' : ''}.</div>
        ) : (
          <ul className="adm-cat-assign-list">
            {filteredAssignGroups.map(({ rep, memberIds }) => {
              const checked = isGroupSelected(memberIds)
              const inOtherCategory = memberIds.some((id) => {
                const p = typeProducts.find((row) => row.id === id)
                return p?.categoryId != null && p.categoryId !== assignCategory?.id
              })
              return (
                <li key={resolveGroupKey(rep)} className={`adm-cat-assign-item${checked ? ' is-selected' : ''}`}>
                  <label className="adm-cat-assign-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAssignGroup(memberIds)}
                    />
                    {rep.imageUrl ? (
                      <ApiImage src={rep.imageUrl} alt="" className="adm-best-thumb" />
                    ) : (
                      <div className="adm-best-thumb adm-best-thumb-empty" />
                    )}
                    <span className="adm-cat-assign-meta">
                      <span className="adm-best-name">{rep.name}</span>
                      <span className="adm-best-sub">
                        {inOtherCategory ? `Trenutno: ${rep.category}` : rep.category ? `U kategoriji: ${rep.category}` : 'Bez kategorije'}
                        {memberIds.length > 1 ? ` · ${memberIds.length} opcije` : ''}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <div className="adm-modal-footer">
          <button type="button" className="adm-btn" onClick={closeAssign}>Odustani</button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={saveAssign}
            disabled={assignSaving || !assignDirty}
          >
            {assignSaving ? 'Čuvanje…' : 'Sačuvaj izbor'}
          </button>
        </div>
      </AdminModal>
    </div>
  )
}
