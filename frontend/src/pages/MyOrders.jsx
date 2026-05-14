import { useEffect, useState } from 'react'
import api from '../api'

const STATUS_LABEL = {
  Pending: 'Na čekanju',
  AwaitingPayment: 'Čeka uplatu',
  Shipped: 'Poslato',
  Delivered: 'Dostavljeno',
  Returned: 'Vraćeno',
  Cancelled: 'Otkazano',
}

const STATUS_COLOR = {
  Pending: '#f59e0b',
  AwaitingPayment: '#6366f1',
  Shipped: '#0ea5e9',
  Delivered: '#22c55e',
  Returned: '#f97316',
  Cancelled: '#ef4444',
}

const PAYMENT_LABEL = { CashOnDelivery: 'Pouzećem', BankTransfer: 'Bankovni prenos', 0: 'Pouzećem', 1: 'Bankovni prenos' }

export default function MyOrders() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    api.get('/orders/mine').then(({ data }) => setOrders(data)).catch(() => setOrders([]))
  }, [])

  const fmt = (n) => Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <section className="page shell">
      <h1>Moje porudžbine</h1>
      {!orders.length ? <p>Trenutno nema porudžbina.</p> : (
        <div className="orders-list">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="order-card-header">
                <span className="order-card-id">Porudžbina #{order.id}</span>
                <span className="order-card-date">{new Date(order.createdAt).toLocaleDateString('sr-RS')}</span>
                <span
                  className="order-status"
                  style={{ background: STATUS_COLOR[order.status] ?? '#9ca3af', color: '#fff' }}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <div className="order-items">
                {order.items.map((item) => (
                  <div key={item.productId} className="order-item-row">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.productName} className="order-item-img" />
                      : <div className="order-item-img order-item-img--ph" />}
                    <div className="order-item-info">
                      <span className="order-item-name">{item.productName}</span>
                      <span className="order-item-qty">× {item.quantity}</span>
                    </div>
                    <span className="order-item-price">{fmt(item.unitPrice * item.quantity)} RSD</span>
                  </div>
                ))}
              </div>

              <div className="order-card-footer">
                <span className="order-payment">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
                {order.discount > 0 && (
                  <span className="order-discount">Popust: -{fmt(order.discount)} RSD</span>
                )}
                <span className="order-total">Ukupno: <strong>{fmt(order.total)} RSD</strong></span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
