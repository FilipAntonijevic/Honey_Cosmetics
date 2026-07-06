import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import ProductCard from '../components/ProductCard'

export default function Wishlist() {
  const { wishlist, toggleWishlist, syncWishlist } = useStore()
  const [catalogById, setCatalogById] = useState(null)

  useEffect(() => {
    syncWishlist()
  }, [syncWishlist])

  useEffect(() => {
    api.get('/products')
      .then(({ data }) => {
        setCatalogById(new Map(data.map((p) => [p.id, p])))
      })
      .catch(() => setCatalogById(new Map()))
  }, [])

  const items = useMemo(() => {
    if (!catalogById) return []
    return wishlist
      .filter((item) => catalogById.has(item.id))
      .map((item) => {
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

  const showEmpty = catalogById ? items.length === 0 : wishlist.length === 0

  return (
    <section className="page shell wishlist-page">
      <h1>Wishlist</h1>
      {showEmpty ? (
        <div className="wishlist-row">
          <p className="wishlist-empty">Wishlist je prazna.</p>
          <Link className="wishlist-pick-btn" to="/shop">izaberi proizvode</Link>
        </div>
      ) : (
        <div className="wishlist-row">
          <div className="product-grid wishlist-grid">
            {items.map((item) => (
              <ProductCard key={item.id} product={item} onToggleWishlist={toggleWishlist} />
            ))}
          </div>
          <Link className="wishlist-pick-btn" to="/shop">izaberi proizvode</Link>
        </div>
      )}
    </section>
  )
}
