import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import ApiImage from '../components/ApiImage'

export default function AdminBestsellers() {
  const [allProducts, setAllProducts] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [initialIds, setInitialIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [prodRes, bestRes] = await Promise.all([
          api.get('/admin/products'),
          api.get('/admin/bestsellers'),
        ])
        if (cancelled) return
        setAllProducts(prodRes.data)
        const ids = bestRes.data
          .slice()
          .sort((a, b) => a.bestsellerSortOrder - b.bestsellerSortOrder)
          .map((p) => p.id)
        setSelectedIds(ids)
        setInitialIds(ids)
      } catch {
        if (!cancelled) setError('Učitavanje nije uspelo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const productMap = useMemo(() => {
    const m = new Map()
    allProducts.forEach((p) => m.set(p.id, p))
    return m
  }, [allProducts])

  const selectedProducts = useMemo(
    () => selectedIds.map((id) => productMap.get(id)).filter(Boolean),
    [selectedIds, productMap],
  )

  const availableProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allProducts
      .filter((p) => !selectedIds.includes(p.id))
      .filter((p) => (term ? p.name.toLowerCase().includes(term) : true))
  }, [allProducts, selectedIds, search])

  const dirty = useMemo(() => {
    if (selectedIds.length !== initialIds.length) return true
    return selectedIds.some((id, i) => initialIds[i] !== id)
  }, [selectedIds, initialIds])

  const addProduct = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setSuccess('')
  }

  const removeProduct = (id) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id))
    setSuccess('')
  }

  const move = (index, delta) => {
    setSelectedIds((prev) => {
      const next = prev.slice()
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setSuccess('')
  }

  const reset = () => {
    setSelectedIds(initialIds)
    setError('')
    setSuccess('')
  }

  const save = async () => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.put('/admin/bestsellers', { productIds: selectedIds })
      setInitialIds(selectedIds)
      setSuccess('Bestseller lista je sačuvana.')
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.title ?? 'Čuvanje nije uspelo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Bestsellers</h1>
          <p className="adm-page-sub">
            Izaberi proizvode i njihov redosled za prikaz u sekciji Bestsellers.
          </p>
        </div>
        <div className="adm-page-header-actions">
          <button type="button" className="adm-btn" onClick={reset} disabled={!dirty || saving}>
            Poništi
          </button>
          <button type="button" className="adm-btn adm-btn-primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Čuvanje…' : 'Sačuvaj'}
          </button>
        </div>
      </div>

      {error && <div className="adm-form-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && (
        <div className="adm-form-error" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {loading ? (
        <div className="adm-loading">Učitavanje…</div>
      ) : (
        <div className="adm-best-grid">
          <section className="adm-best-col">
            <header className="adm-best-col-head">
              <h2>Izabrani ({selectedProducts.length})</h2>
              <span className="adm-page-sub">Redosled odgovara prikazu na sajtu.</span>
            </header>
            {selectedProducts.length === 0 ? (
              <div className="adm-empty">Nijedan proizvod nije označen kao bestseller.</div>
            ) : (
              <ul className="adm-best-list">
                {selectedProducts.map((p, i) => (
                  <li key={p.id} className="adm-best-item">
                    <span className="adm-best-pos">{i + 1}.</span>
                    {p.imageUrl ? (
                      <ApiImage src={p.imageUrl} alt={p.name} className="adm-best-thumb" />
                    ) : (
                      <div className="adm-best-thumb adm-best-thumb-empty" />
                    )}
                    <div className="adm-best-meta">
                      <div className="adm-best-name">{p.name}</div>
                      <div className="adm-best-sub">
                        {[p.productType, p.category].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="adm-best-actions">
                      <button
                        type="button"
                        className="adm-btn adm-btn-sm"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label="Pomeri gore"
                        title="Pomeri gore"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn-sm"
                        onClick={() => move(i, +1)}
                        disabled={i === selectedProducts.length - 1}
                        aria-label="Pomeri dole"
                        title="Pomeri dole"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn-sm adm-btn-danger"
                        onClick={() => removeProduct(p.id)}
                      >
                        Ukloni
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="adm-best-col">
            <header className="adm-best-col-head">
              <h2>Dodaj iz kataloga</h2>
              <input
                className="adm-search"
                placeholder="Pretraga proizvoda…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </header>
            {availableProducts.length === 0 ? (
              <div className="adm-empty">Nema rezultata.</div>
            ) : (
              <ul className="adm-best-list">
                {availableProducts.map((p) => (
                  <li key={p.id} className="adm-best-item">
                    {p.imageUrl ? (
                      <ApiImage src={p.imageUrl} alt={p.name} className="adm-best-thumb" />
                    ) : (
                      <div className="adm-best-thumb adm-best-thumb-empty" />
                    )}
                    <div className="adm-best-meta">
                      <div className="adm-best-name">{p.name}</div>
                      <div className="adm-best-sub">
                        {[p.productType, p.category].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <button type="button" className="adm-btn adm-btn-sm" onClick={() => addProduct(p.id)}>
                      + Dodaj
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
