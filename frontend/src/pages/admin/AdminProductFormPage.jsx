import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import { apiImageUrl } from '../../lib/assets'

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  imageUrls: [''],
  productTypeId: '',
  categoryId: '',
  unitCostPrice: '',
  unitTransportCost: '',
}

function productToImageUrls(product) {
  const main = product.imageUrl?.trim() ?? ''
  const extra = (product.additionalImageUrls ?? []).map((u) => u.trim()).filter(Boolean)
  const urls = main ? [main, ...extra] : extra
  return urls.length > 0 ? urls : ['']
}

export default function AdminProductFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [productTypes, setProductTypes] = useState([])
  const [categoriesForType, setCategoriesForType] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [error, setError] = useState('')
  const fileRefs = useRef([])

  useEffect(() => {
    api.get('/admin/product-types').then(({ data }) => setProductTypes(data))
    if (isNew) return
    setLoading(true)
    api.get(`/admin/products/${id}`)
      .then(({ data }) => {
        setForm({
          name: data.name,
          description: data.description ?? '',
          price: String(data.price),
          imageUrls: productToImageUrls(data),
          productTypeId: String(data.productTypeId ?? ''),
          categoryId: data.categoryId != null ? String(data.categoryId) : '',
          unitCostPrice: data.unitCostPrice != null ? String(data.unitCostPrice) : '',
          unitTransportCost: data.unitTransportCost != null ? String(data.unitTransportCost) : '',
        })
      })
      .catch(() => setError('Proizvod nije pronađen.'))
      .finally(() => setLoading(false))
  }, [id, isNew])

  useEffect(() => {
    const typeId = form.productTypeId
    if (!typeId) {
      setCategoriesForType([])
      return
    }
    api.get('/admin/categories', { params: { productTypeId: typeId } })
      .then(({ data }) => setCategoriesForType(data))
      .catch(() => setCategoriesForType([]))
  }, [form.productTypeId])

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

  const save = async (e) => {
    e.preventDefault()
    setError('')
    const urls = form.imageUrls.map((u) => u.trim()).filter(Boolean)
    if (!form.name.trim() || !form.price || !form.productTypeId || urls.length === 0) {
      setError('Naziv, cena, vrsta i bar jedna slika su obavezni.')
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
        unitCostPrice: form.unitCostPrice ? parseFloat(form.unitCostPrice) : null,
        unitTransportCost: form.unitTransportCost ? parseFloat(form.unitTransportCost) : null,
      }
      if (isNew) {
        const { data } = await api.post('/admin/products', payload)
        const product = data.product ?? data
        navigate(`/admin/products/${product.id}`, {
          state: data.restored ? { restored: true } : undefined,
        })
      } else {
        await api.put(`/admin/products/${id}`, payload)
        navigate(`/admin/products/${id}`)
      }
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.title ?? d?.detail ?? 'Čuvanje nije uspelo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="adm-page"><div className="adm-loading">Učitavanje…</div></div>

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <Link to={isNew ? '/admin/products' : `/admin/products/${id}`} className="adm-back-link">← Nazad</Link>
          <h1 className="adm-page-title">{isNew ? 'Novi proizvod' : 'Izmeni detalje'}</h1>
        </div>
      </div>

      <form onSubmit={save} className="adm-form adm-form--page">
        {error && <div className="adm-form-error">{error}</div>}
        <div className="adm-form-row">
          <label>Naziv *</label>
          <input className="adm-input" value={form.name} onChange={set('name')} required />
        </div>
        <div className="adm-form-row adm-form-row--2">
          <div>
            <label>Vrsta *</label>
            <select className="adm-input" value={form.productTypeId} onChange={set('productTypeId')} required>
              <option value="">— izaberite —</option>
              {productTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label>Kategorija</label>
            <select className="adm-input" value={form.categoryId} onChange={set('categoryId')} disabled={!form.productTypeId}>
              <option value="">— bez —</option>
              {categoriesForType.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="adm-form-row">
          <label>Cena prodaje (RSD) *</label>
          <input className="adm-input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required />
        </div>
        <div className="adm-form-row adm-form-row--2">
          <div>
            <label>Cena nabavke po komadu (RSD, opciono)</label>
            <input className="adm-input" type="number" min="0" step="0.01" value={form.unitCostPrice} onChange={set('unitCostPrice')} />
          </div>
          <div>
            <label>Cena transporta po komadu (RSD, opciono)</label>
            <input className="adm-input" type="number" min="0" step="0.01" value={form.unitTransportCost} onChange={set('unitTransportCost')} />
          </div>
        </div>
        <div className="adm-form-row">
          <label>Opis</label>
          <textarea className="adm-input adm-textarea" value={form.description} onChange={set('description')} rows={4} />
        </div>
        <div className="adm-form-row">
          <label>Slike</label>
          {form.imageUrls.map((url, index) => (
            <div key={index} className="adm-image-row" style={{ marginBottom: '0.5rem' }}>
              <input className="adm-input" value={url} onChange={(e) => setImageUrl(index, e.target.value)} placeholder="URL slike" />
              <input type="file" ref={(el) => { fileRefs.current[index] = el }} accept="image/*" style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingIndex(index)
                  const fd = new FormData()
                  fd.append('file', file)
                  api.post('/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                    .then(({ data }) => setImageUrl(index, data.url))
                    .finally(() => setUploadingIndex(null))
                }}
              />
              <button type="button" className="adm-btn" disabled={uploadingIndex === index} onClick={() => fileRefs.current[index]?.click()}>
                Upload
              </button>
              {url ? <img src={apiImageUrl(url)} alt="" className="adm-img-preview adm-img-preview--sm" /> : null}
            </div>
          ))}
          <button type="button" className="adm-btn" onClick={() => setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ''] }))}>+ Slika</button>
        </div>
        <div className="adm-form-actions">
          <button type="button" className="adm-btn" onClick={() => navigate(isNew ? '/admin/products' : `/admin/products/${id}`)}>Odustani</button>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
            {saving ? 'Čuvanje…' : isNew ? 'Sačuvaj' : 'Sačuvaj izmene'}
          </button>
        </div>
      </form>
    </div>
  )
}
