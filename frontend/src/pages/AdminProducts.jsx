import { useEffect, useRef, useState } from 'react'
import api from '../api'
import ApiImage from '../components/ApiImage'

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  productTypeId: '',
  categoryId: '',
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [productTypes, setProductTypes] = useState([])
  const [categoriesForType, setCategoriesForType] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const loadProducts = async () => {
    setLoading(true)
    try {
      const [prodRes, typesRes] = await Promise.all([
        api.get('/admin/products'),
        api.get('/admin/product-types'),
      ])
      setProducts(prodRes.data)
      setProductTypes(typesRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    loadProducts()
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect -- load category options when vrsta changes */
  useEffect(() => {
    const typeId = form.productTypeId
    if (!typeId) {
      setCategoriesForType([])
      return
    }
    let cancelled = false
    api
      .get('/admin/categories', { params: { productTypeId: typeId } })
      .then(({ data }) => {
        if (!cancelled) setCategoriesForType(data)
      })
      .catch(() => {
        if (!cancelled) setCategoriesForType([])
      })
    return () => {
      cancelled = true
    }
  }, [form.productTypeId])
  /* eslint-enable react-hooks/set-state-in-effect */

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setError('')
    setShowForm(true)
  }

  const openEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      imageUrl: product.imageUrl,
      productTypeId: String(product.productTypeId ?? ''),
      categoryId: product.categoryId != null ? String(product.categoryId) : '',
    })
    setEditId(product.id)
    setError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setError('')
  }

  const set = (key) => (e) => {
    const v = e.target.value
    setForm((f) => {
      if (key === 'productTypeId' && v !== f.productTypeId) {
        return { ...f, productTypeId: v, categoryId: '' }
      }
      return { ...f, [key]: v }
    })
  }

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
    if (!form.name.trim() || !form.price || !form.productTypeId) {
      setError('Naziv, cena i vrsta proizvoda su obavezni.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        imageUrl: form.imageUrl.trim(),
        productTypeId: parseInt(form.productTypeId, 10),
        categoryId: form.categoryId ? parseInt(form.categoryId, 10) : null,
      }
      if (editId) {
        const { data } = await api.put(`/admin/products/${editId}`, payload)
        setProducts((prev) => prev.map((p) => (p.id === editId ? data : p)))
      } else {
        const { data } = await api.post('/admin/products', payload)
        setProducts((prev) => [data, ...prev])
      }
      closeForm()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.title ?? 'Čuvanje nije uspelo.')
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`Obrisati "${name}"?`)) return
    try {
      await api.delete(`/admin/products/${id}`)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert('Brisanje nije uspelo: ' + (err.response?.status ?? err.message))
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Proizvodi</h1>
          <p className="adm-page-sub">{products.length} proizvoda</p>
        </div>
        <button type="button" className="adm-btn adm-btn-primary" onClick={openNew}>+ Novi proizvod</button>
      </div>

      {showForm && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="adm-modal">
            <div className="adm-modal-header">
              <h2>{editId ? 'Izmeni proizvod' : 'Novi proizvod'}</h2>
              <button type="button" className="adm-modal-close" onClick={closeForm}>✕</button>
            </div>

            <form onSubmit={save} className="adm-form">
              {error && <div className="adm-form-error">{error}</div>}

              <div className="adm-form-row">
                <label>Naziv *</label>
                <input className="adm-input" value={form.name} onChange={set('name')} required />
              </div>

              <div className="adm-form-row adm-form-row--2">
                <div>
                  <label>Vrsta proizvoda *</label>
                  <select className="adm-input" value={form.productTypeId} onChange={set('productTypeId')} required>
                    <option value="">— izaberite vrstu —</option>
                    {productTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Kategorija</label>
                  <select
                    className="adm-input"
                    value={form.categoryId}
                    onChange={set('categoryId')}
                    disabled={!form.productTypeId}
                  >
                    <option value="">— bez kategorije —</option>
                    {categoriesForType.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                    Opciono. Liste se puni u panelu Kategorije za izabranu vrstu.
                  </p>
                </div>
              </div>

              <div className="adm-form-row">
                <label>Cena (RSD) *</label>
                <input className="adm-input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required />
              </div>

              <div className="adm-form-row">
                <label>Opis</label>
                <textarea className="adm-input adm-textarea" value={form.description} onChange={set('description')} rows={3} />
              </div>

              <div className="adm-form-row">
                <label>Slika</label>
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
                  <button
                    type="button"
                    className="adm-btn"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? 'Upload…' : '↑ Upload'}
                  </button>
                </div>
                {form.imageUrl && (
                  <img src={apiImageUrl(form.imageUrl)} alt="preview" className="adm-img-preview" />
                )}
              </div>

              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={closeForm}>Odustani</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
                  {saving ? 'Čuvanje…' : editId ? 'Sačuvaj izmene' : 'Kreiraj proizvod'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="adm-loading">Učitavanje…</div>
      ) : products.length === 0 ? (
        <div className="adm-empty">Nema proizvoda. Dodajte prvi proizvod.</div>
      ) : (
        <div className="adm-product-grid">
          {products.map((product) => (
            <div key={product.id} className="adm-product-card">
              <div className="adm-product-img-wrap">
                {product.imageUrl ? (
                  <ApiImage src={product.imageUrl} alt={product.name} className="adm-product-img" />
                ) : (
                  <div className="adm-product-img-empty">📷</div>
                )}
              </div>
              <div className="adm-product-info">
                <div className="adm-product-name">{product.name}</div>
                <div className="adm-product-meta">
                  {product.productType && (
                    <span className="adm-product-type" title="Vrsta">{product.productType}</span>
                  )}
                  {product.category && (
                    <span className="adm-product-cat" title="Kategorija">{product.category}</span>
                  )}
                </div>
                <div className="adm-product-price">{product.price.toLocaleString('sr-RS')} RSD</div>
              </div>
              <div className="adm-product-actions">
                <button type="button" className="adm-btn adm-btn-sm" onClick={() => openEdit(product)}>
                  Izmeni
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn-sm adm-btn-danger"
                  onClick={() => deleteProduct(product.id, product.name)}
                >
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
