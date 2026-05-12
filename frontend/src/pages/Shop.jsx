import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function Shop() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const { addToCart, toggleWishlist } = useStore()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const category = searchParams.get('category')
        const sort = searchParams.get('sort') ?? 'newest'
        const { data } = await api.get('/products', {
          params: {
            categoryId: undefined,
            sort: sort === 'newest' ? undefined : sort,
            search: searchParams.get('search') ?? undefined,
          },
        })
        const filtered = category ? data.filter((item) => item.category === category) : data
        setProducts(filtered)
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [searchParams])

  const content = useMemo(() => {
    if (loading) {
      return <div className="skeleton-grid">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton" />)}</div>
    }

    if (!products.length) {
      return <p>Nema rezultata za izabrane filtere.</p>
    }

    return (
      <div className="product-grid">
        {products.map((product) => (
          <article key={product.id} className="product-card">
            <img src={product.imageUrl} alt={product.name} loading="lazy" />
            <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
            <p>{product.category}</p>
            <strong>{Number(product.price).toLocaleString('sr-RS')} RSD</strong>
            <div className="card-actions">
              <button onClick={() => addToCart(product)}>Dodaj u korpu</button>
              <button onClick={() => toggleWishlist(product)} className="ghost">Wishlist</button>
            </div>
          </article>
        ))}
      </div>
    )
  }, [loading, products, addToCart, toggleWishlist])

  return (
    <section className="page shell">
      <h1>Shop</h1>
      {content}
    </section>
  )
}
