import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import ApiImage from '../components/ApiImage'
import ProductCardActions from '../components/ProductCardActions'
import { formatProductTypeDisplay } from '../lib/productTypes'

export default function Wishlist() {
  const { wishlist, toggleWishlist } = useStore()
  const [catalogById, setCatalogById] = useState(null)

  useEffect(() => {
    api.get('/products')
      .then(({ data }) => {
        setCatalogById(new Map(data.map((p) => [p.id, p])))
      })
      .catch(() => setCatalogById(new Map()))
  }, [])

  const items = useMemo(() => {
    if (!catalogById) return wishlist
    return wishlist.map((item) => {
      const p = catalogById.get(item.id)
      if (!p) return item
      return {
        ...item,
        price: p.price ?? item.price,
        imageUrl: p.imageUrl ?? item.imageUrl,
        productType: p.productType ?? item.productType,
        category: p.category ?? item.category,
        stockQuantity: p.stockQuantity ?? 0,
        inStock: p.inStock ?? (p.stockQuantity ?? 0) > 0,
      }
    })
  }, [wishlist, catalogById])

  return (
    <section className="page shell">
      <h1>Wishlist</h1>
      {!wishlist.length ? (
        <div className="wishlist-row">
          <p className="wishlist-empty">Wishlist je prazna.</p>
          <Link className="wishlist-pick-btn" to="/shop">izaberi proizvode</Link>
        </div>
      ) : (
        <div className="wishlist-row">
          <div className="product-grid wishlist-grid">
            {items.map((item) => (
              <article className="product-card" key={item.id}>
                <Link to={`/products/${item.id}`} className="product-card-media" tabIndex={-1}>
                  <ApiImage src={item.imageUrl} alt={item.name} variant="medium" />
                </Link>
                <div className="product-card-body">
                  <h3>
                    <Link to={`/products/${item.id}`}>{item.name}</Link>
                  </h3>
                  <p>{[formatProductTypeDisplay(item.productType), item.category].filter(Boolean).join(' · ')}</p>
                  <strong>{Number(item.price).toLocaleString('sr-RS')} RSD</strong>
                  <ProductCardActions product={item} onToggleWishlist={toggleWishlist} />
                </div>
              </article>
            ))}
          </div>
          <Link className="wishlist-pick-btn" to="/shop">izaberi proizvode</Link>
        </div>
      )}
    </section>
  )
}
