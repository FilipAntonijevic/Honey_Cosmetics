import { useEffect, useRef, useState } from 'react'
import api from '../api'
import ApiImage from '../components/ApiImage'
import { apiImageUrl } from '../lib/assets'

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  imageUrls: [''],
  productTypeId: '',
  categoryId: '',
}

function productToImageUrls(product) {
  const main = product.imageUrl?.trim() ?? ''
  const extra = (product.additionalImageUrls ?? []).map((u) => u.trim()).filter(Boolean)
  const urls = main ? [main, ...extra] : extra
  return urls.length > 0 ? urls : ['']
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
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [error, setError] = useState('')
  const fileRefs = useRef([])

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
      description: product.description ?? '',
      price: String(product.price),
      imageUrls: productToImageUrls(product),
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

  const setImageUrl = (index, value) => {
    setForm((f) => {
      const imageUrls = [...f.imageUrls]
      imageUrls[index] = value
      return { ...f, imageUrls }
    })
  }

  const addImageSlot = () => {
    setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ''] }))
  }

  const removeImageSlot = (index) => {
    setForm((f) => {
      if (f.imageUrls.length <= 1) return f
      const imageUrls = f.imageUrls.filter((_, i) => i !== index)
      return { ...f, imageUrls }
    })
  }

  const moveImage = (index, direction) => {
    setForm((f) => {
      const next = index + direction
      if (next < 0 || next >= f.imageUrls.length) return f
      const imageUrls = [...f.imageUrls]
      ;[imageUrls[index], imageUrls[next]] = [imageUrls[next], imageUrls[index]]
      return { ...f, imageUrls }
    })
  }

  const uploadImage = async (file, index) => {
    setUploadingIndex(index)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/admin/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImageUrl(index, data.url)
    } catch {
      setError('Upload slike nije uspeo.')
    } finally {
      setUploadingIndex(null)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.price || !form.productTypeId) {
      setError('Naziv, cena i vrsta proizvoda su obavezni.')
      return
    }

    const urls = form.imageUrls.map((u) => u.trim()).filter(Boolean)
    if (urls.length === 0) {
      setError('Dodajte bar jednu sliku (glavnu).')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        imageUrl: urls[0],
        additionalImageUrls: urls.slice(1),
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
          <div className="adm-modal adm-modal--wide">
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
                <label>Slike proizvoda</label>
                <p className="adm-field-hint">
                  Prva slika je glavna (prikazuje se u prodavnici i na karticama). Ostale se vide na stranici proizvoda.
                </p>
                <div className="adm-product-images">
                  {form.imageUrls.map((url, index) => (
                    <div key={index} className="adm-product-image-slot">
                      <div className="adm-product-image-slot__head">
                        <span className="adm-product-image-slot__label">
                          {index === 0 ? 'Glavna slika' : `Dodatna slika ${index}`}
                        </span>
                        <div className="adm-product-image-slot__actions">
                          <button
                            type="button"
                            className="adm-btn adm-btn-sm"
                            disabled={index === 0}
                            onClick={() => moveImage(index, -1)}
                            aria-label="Pomeri gore"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn-sm"
                            disabled={index === form.imageUrls.length - 1}
                            onClick={() => moveImage(index, 1)}
                            aria-label="Pomeri dole"
                          >
                            ↓
                          </button>
                          {form.imageUrls.length > 1 ? (
                            <button
                              type="button"
                              className="adm-btn adm-btn-sm adm-btn-danger"
                              onClick={() => removeImageSlot(index)}
                            >
                              Ukloni
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="adm-image-row">
                        <input
                          className="adm-input"
                          placeholder="URL slike…"
                          value={url}
                          onChange={(e) => setImageUrl(index, e.target.value)}
                        />
                        <span className="adm-or">ili</span>
                        <input
                          type="file"
                          ref={(el) => { fileRefs.current[index] = el }}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], index)}
                        />
                        <button
                          type="button"
                          className="adm-btn"
                          disabled={uploadingIndex === index}
                          onClick={() => fileRefs.current[index]?.click()}
                        >
                          {uploadingIndex === index ? 'Upload…' : '↑ Upload'}
                        </button>
                      </div>
                      {url ? (
                        <img src={apiImageUrl(url)} alt="" className="adm-img-preview adm-img-preview--sm" />
                      ) : null}
                    </div>
                  ))}
                </div>
                <button type="button" className="adm-btn adm-btn-add-image" onClick={addImageSlot}>
                  + Dodaj sliku
                </button>
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
