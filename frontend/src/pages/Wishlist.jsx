import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import ApiImage from '../components/ApiImage'
import { isInStock } from '../utils/stock'

export default function Wishlist() {
  const { wishlist, toggleWishlist, addToCart } = useStore()
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
        stockQuantity: p.stockQuantity ?? 0,
        inStock: p.inStock ?? (p.stockQuantity ?? 0) > 0,
      }
    })
  }, [wishlist, catalogById])

  return (
    <section className="page shell">
      <h1>Wishlist</h1>
      {!wishlist.length ? <p>Wishlist je prazna.</p> : (
        <div className="product-grid">
          {items.map((item) => {
            const outOfStock = !isInStock(item)
            return (
              <article className="product-card" key={item.id}>
                <Link to={`/products/${item.id}`} className="product-card-media" tabIndex={-1}>
                  <ApiImage src={item.imageUrl} alt={item.name} variant="medium" />
                </Link>
                <div className="product-card-body">
                  <h3>
                    <Link to={`/products/${item.id}`}>{item.name}</Link>
                  </h3>
                  <strong>{Number(item.price).toLocaleString('sr-RS')} RSD</strong>
                  <div className="card-actions">
                    <button
                      type="button"
                      className={outOfStock ? 'product-card-btn--out-of-stock' : undefined}
                      onClick={() => addToCart(item)}
                      disabled={outOfStock}
                    >
                      {outOfStock ? 'Nije na stanju' : 'Dodaj u korpu'}
                    </button>
                    <button type="button" className="ghost" onClick={() => toggleWishlist(item)}>
                      Ukloni
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="wishlist-shop-cta">
        <Link className="cta" to="/shop">Izaberi proizvode</Link>
      </p>
    </section>
  )
}
