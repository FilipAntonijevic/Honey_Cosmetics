import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import ApiImage from '../components/ApiImage'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/admin/products')
      .then(({ data }) => setProducts(data))
      .finally(() => setLoading(false))
  }, [])

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = products
    if (q) {
      list = list.filter((p) =>
        p.name?.toLowerCase().includes(q)
        || p.productType?.toLowerCase().includes(q)
        || (p.category?.toLowerCase().includes(q) ?? false),
      )
    }

    const byGroup = new Map()
    for (const p of list) {
      const key = p.variantGroupId ?? p.id
      const entry = byGroup.get(key)
      if (!entry) {
        byGroup.set(key, { rep: p, totalStock: p.stockQuantity ?? 0, count: 1 })
      } else {
        entry.totalStock += p.stockQuantity ?? 0
        entry.count += 1
        if (p.isDefaultVariant && !entry.rep.isDefaultVariant) entry.rep = p
      }
    }

    return [...byGroup.values()].sort((a, b) => a.totalStock - b.totalStock)
  }, [products, search])

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Proizvodi</h1>
          <p className="adm-page-sub">
            {search.trim()
              ? `${displayed.length} od ${products.length} — kliknite na sliku za detalje`
              : `${products.length} proizvoda — kliknite na sliku za detalje`}
          </p>
        </div>
        <Link to="/admin/products/new" className="adm-btn adm-btn-primary">+ Dodaj novi proizvod</Link>
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="Pretraži proizvod po nazivu, vrsti ili kategoriji…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="adm-loading">Učitavanje…</div>
      ) : displayed.length === 0 ? (
        <div className="adm-empty">
          {search.trim() ? 'Nema proizvoda za tu pretragu.' : 'Nema proizvoda.'}
        </div>
      ) : (
        <div className="adm-product-grid adm-product-grid--pick">
          {displayed.map(({ rep: product, totalStock, count }) => {
            const stock = totalStock
            return (
              <Link key={product.id} to={`/admin/products/${product.id}`} className="adm-product-card adm-product-card--link">
                <div className="adm-product-img-wrap">
                  {product.imageUrl ? (
                    <ApiImage src={product.imageUrl} alt={product.name} className="adm-product-img" />
                  ) : (
                    <div className="adm-product-img-empty">📷</div>
                  )}
                  {stock <= 0 && (
                    <span className="adm-product-stock-tag">Nema na stanju</span>
                  )}
                </div>
                <div className="adm-product-info">
                  <div className="adm-product-name">{product.name}</div>
                  <div className="adm-product-meta">
                    <span className="adm-product-type">{product.productType}</span>
                    {product.category && (
                      <span className="adm-product-cat">{product.category}</span>
                    )}
                    {count > 1 && (
                      <span className="adm-product-cat">{count} gramaže</span>
                    )}
                  </div>
                  <div className={`adm-product-stock-qty${stock <= 0 ? ' adm-product-stock-qty--out' : ''}`}>
                    <strong>{stock}</strong> kom na stanju
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
