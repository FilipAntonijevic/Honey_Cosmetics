import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'

export default function Cart() {
  const { cart, removeFromCart } = useStore()
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)

  return (
    <section className="page shell">
      <h1>Korpa</h1>
      {!cart.length ? <p>Korpa je prazna.</p> : (
        <>
          <div className="cart-list">
            {cart.map((item) => (
              <article key={item.id} className="cart-item">
                <img src={item.imageUrl} alt={item.name} />
                <div>
                  <h3>{item.name}</h3>
                  <p>Količina: {item.quantity}</p>
                  <strong>{Number(item.price).toLocaleString('sr-RS')} RSD</strong>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="ghost">Ukloni</button>
              </article>
            ))}
          </div>
          <p className="cart-total">Ukupno: {total.toLocaleString('sr-RS')} RSD</p>
          <Link className="cta" to="/checkout">Nastavi na checkout</Link>
        </>
      )}
    </section>
  )
}
