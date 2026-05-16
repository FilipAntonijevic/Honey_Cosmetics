import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import ApiImage from '../components/ApiImage'

export default function Wishlist() {
  const { wishlist, toggleWishlist, addToCart } = useStore()

  return (
    <section className="page shell">
      <h1>Wishlist</h1>
      {!wishlist.length ? <p>Wishlist je prazna.</p> : (
        <div className="product-grid">
          {wishlist.map((item) => (
            <article className="product-card" key={item.id}>
              <ApiImage src={item.imageUrl} alt={item.name} />
              <div className="product-card-body">
                <h3>{item.name}</h3>
                <strong>{Number(item.price).toLocaleString('sr-RS')} RSD</strong>
                <div className="card-actions">
                  <button onClick={() => addToCart(item)}>Dodaj u korpu</button>
                  <button className="ghost" onClick={() => toggleWishlist(item)}>Ukloni</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="wishlist-shop-cta">
        <Link className="cta" to="/shop">Izaberi proizvode</Link>
      </p>
    </section>
  )
}
