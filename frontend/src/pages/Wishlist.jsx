import { useStore } from '../context/StoreContext'

export default function Wishlist() {
  const { wishlist, toggleWishlist, addToCart } = useStore()

  return (
    <section className="page shell">
      <h1>Wishlist</h1>
      {!wishlist.length ? <p>Wishlist je prazna.</p> : (
        <div className="product-grid">
          {wishlist.map((item) => (
            <article className="product-card" key={item.id}>
              <img src={item.imageUrl} alt={item.name} />
              <h3>{item.name}</h3>
              <strong>{Number(item.price).toLocaleString('sr-RS')} RSD</strong>
              <div className="card-actions">
                <button onClick={() => addToCart(item)}>Dodaj u korpu</button>
                <button className="ghost" onClick={() => toggleWishlist(item)}>Ukloni</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
