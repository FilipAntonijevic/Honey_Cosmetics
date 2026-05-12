import { useEffect, useState } from 'react'
import api from '../api'

export default function MyOrders() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    api.get('/orders/mine').then(({ data }) => setOrders(data)).catch(() => setOrders([]))
  }, [])

  return (
    <section className="page shell">
      <h1>My Orders</h1>
      {!orders.length ? <p>Trenutno nema porudžbina.</p> : (
        <div className="orders-grid">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <h3>Porudžbina #{order.id}</h3>
              <p>Status: <strong>{order.status}</strong></p>
              <p>Ukupno: {Number(order.total).toLocaleString('sr-RS')} RSD</p>
              <p>Način plaćanja: {order.paymentMethod === 0 ? 'Pouzećem' : 'Bankovni transfer'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
