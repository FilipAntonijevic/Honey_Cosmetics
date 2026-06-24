import { useEffect, useState } from 'react'
import api from '../api'
import { useStore } from '../context/StoreContext'
import ApiImage from '../components/ApiImage'
import { hasTemplate } from '../components/BankTransferSlip'
import UplatnicaSlip from '../components/UplatnicaSlip'
import useSiteLinks from '../hooks/useSiteLinks'
import ProductNameWithVariant from '../components/ProductNameWithVariant'

const STATUS_LABEL = {
  Pending: 'Na čekanju',
  AwaitingPayment: 'Na čekanju',
  InsufficientFunds: 'Na čekanju',
  PaymentConfirmed: 'Na čekanju',
  Processing: 'Na čekanju',
  Shipped: 'Poslato',
  Delivered: 'Dostavljeno',
  Returned: 'Vraćeno',
  Cancelled: 'Otkazano',
  FailedDelivery: 'Neuspešna dostava',
}

const STATUS_COLOR = {
  Pending: '#f59e0b',
  AwaitingPayment: '#6366f1',
  PaymentConfirmed: '#6366f1',
  Processing: '#6366f1',
  Shipped: '#0ea5e9',
  Delivered: '#22c55e',
  Returned: '#f97316',
  Cancelled: '#ef4444',
  FailedDelivery: '#ef4444',
}

const PAYMENT_LABEL = {
  CashOnDelivery: 'Pouzećem',
  BankTransfer: 'Bankovni prenos',
  0: 'Pouzećem',
  1: 'Bankovni prenos',
}

function paymentLabel(method) {
  return PAYMENT_LABEL[method] ?? PAYMENT_LABEL[String(method)] ?? String(method)
}

function isBankTransfer(method) {
  return method === 'BankTransfer' || method === 1 || method === '1'
}

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const siteLinks = useSiteLinks()
  const { unseenOrders, markOrderSeen } = useStore()

  useEffect(() => {
    api.get('/orders/mine')
      .then(({ data }) => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n) => Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (iso) =>
    new Date(iso).toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const toggleOrder = (orderId) => {
    setExpandedId((prev) => {
      const next = prev === orderId ? null : orderId
      if (next === orderId) markOrderSeen(orderId)
      return next
    })
  }

  return (
    <section className="page shell my-orders-page">
      <h1>Moje porudžbine</h1>

      {loading && <p className="my-orders-loading">Učitavanje…</p>}

      {!loading && !orders.length && <p>Trenutno nema porudžbina.</p>}

      {!loading && orders.length > 0 && (
        <p className="my-orders-hint">Kliknite na porudžbinu da vidite sve detalje kao u e-mail potvrdi.</p>
      )}

      <div className="orders-list">
        {orders.map((order) => {
          const expanded = expandedId === order.id
          return (
            <article
              key={order.id}
              className={`order-card${expanded ? ' order-card--expanded' : ''}`}
            >
              <button
                type="button"
                className="order-card-toggle"
                onClick={() => toggleOrder(order.id)}
                aria-expanded={expanded}
                aria-controls={`order-details-${order.id}`}
              >
                <div className="order-card-header">
                  <span className="order-card-id">
                    Porudžbina #{order.id}
                    {unseenOrders.includes(order.id) && (
                      <span className="order-card-new">Novo</span>
                    )}
                  </span>
                  <span className="order-card-date">{fmtDate(order.createdAt)}</span>
                  <span
                    className="order-status"
                    style={{ background: STATUS_COLOR[order.status] ?? '#9ca3af', color: '#fff' }}
                  >
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <span className={`order-card-chevron${expanded ? ' order-card-chevron--open' : ''}`} aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>

                <div className="order-items">
                  {order.items.map((item) => (
                    <div key={`${order.id}-${item.productId}`} className="order-item-row">
                      {item.imageUrl
                        ? <ApiImage src={item.imageUrl} alt={item.productName} className="order-item-img" variant="medium" />
                        : <div className="order-item-img order-item-img--ph" />}
                      <div className="order-item-info">
                        <ProductNameWithVariant
                          productName={item.productName}
                          variantLabel={item.variantLabel}
                          className="order-item-name"
                        />
                        <span className="order-item-qty">× {item.quantity}</span>
                      </div>
                      <span className="order-item-price">{fmt(item.unitPrice * item.quantity)} RSD</span>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <span className="order-payment">{paymentLabel(order.paymentMethod)}</span>
                  {order.discount > 0 && (
                    <span className="order-discount">
                      Popust{order.couponCode ? ` (${order.couponCode})` : ''}: −{fmt(order.discount)} RSD
                    </span>
                  )}
                  {order.freeShippingApplied && (
                    <span className="order-shipping-free">Besplatna dostava</span>
                  )}
                  <span className="order-total">Ukupno: <strong>{fmt(order.total)} RSD</strong></span>
                </div>
              </button>

              <div
                id={`order-details-${order.id}`}
                className={`order-card-details${expanded ? ' order-card-details--open' : ''}`}
                hidden={!expanded}
              >
                <h3 className="order-details-title">Detalji porudžbine</h3>

                <section className="order-details-block">
                  <h4 className="order-details-heading">Poručeno</h4>
                  <table className="order-details-table">
                    <thead>
                      <tr>
                        <th>Proizvod</th>
                        <th>Kom</th>
                        <th>Cena</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={`detail-${order.id}-${item.productId}`}>
                          <td>
                            <ProductNameWithVariant
                              productName={item.productName}
                              variantLabel={item.variantLabel}
                            />
                          </td>
                          <td className="order-details-table__num">{item.quantity}</td>
                          <td className="order-details-table__num">{fmt(item.unitPrice * item.quantity)} RSD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <dl className="order-details-totals">
                    <div className="order-details-totals__row">
                      <dt>Međuzbir</dt>
                      <dd>{fmt(order.subtotal)} RSD</dd>
                    </div>
                    {order.discount > 0 && (
                      <div className="order-details-totals__row order-details-totals__row--discount">
                        <dt>
                          Popust
                          {order.couponCode ? ` (${order.couponCode})` : ''}
                        </dt>
                        <dd>−{fmt(order.discount)} RSD</dd>
                      </div>
                    )}
                    {order.freeShippingApplied ? (
                      <div className="order-details-totals__row order-details-totals__row--shipping">
                        <dt>Poštarina</dt>
                        <dd>Besplatna</dd>
                      </div>
                    ) : Number(order.shippingCost) > 0 ? (
                      <div className="order-details-totals__row order-details-totals__row--shipping">
                        <dt>Poštarina</dt>
                        <dd>+{fmt(order.shippingCost)} RSD</dd>
                      </div>
                    ) : null}
                    <div className="order-details-totals__row order-details-totals__row--total">
                      <dt>Ukupno</dt>
                      <dd>{fmt(order.total)} RSD</dd>
                    </div>
                  </dl>
                </section>

                <section className="order-details-block">
                  <h4 className="order-details-heading">Podaci o dostavi</h4>
                  <dl className="order-details-meta">
                    <div>
                      <dt>Adresa</dt>
                      <dd>{order.deliveryAddress || '—'}</dd>
                    </div>
                    {order.phone && (
                      <div>
                        <dt>Telefon</dt>
                        <dd>{order.phone}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Način plaćanja</dt>
                      <dd>{paymentLabel(order.paymentMethod)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{STATUS_LABEL[order.status] ?? order.status}</dd>
                    </div>
                    {isBankTransfer(order.paymentMethod) && (
                      <div>
                        <dt>Status uplate</dt>
                        <dd>
                          <span className={`order-pay-badge${order.isPaid ? ' order-pay-badge--paid' : ''}`}>
                            {order.isPaid ? 'Plaćeno' : 'Čeka se uplata'}
                          </span>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Datum porudžbine</dt>
                      <dd>{fmtDate(order.createdAt)}</dd>
                    </div>
                  </dl>
                  {isBankTransfer(order.paymentMethod) && hasTemplate(siteLinks) && (
                    <>
                      {!order.isPaid && (
                        <p className="order-pay-note">
                          Vaša porudžbina neće biti poslata dok sredstva ne budu uplaćena.
                        </p>
                      )}
                      <UplatnicaSlip
                        template={siteLinks}
                        orderId={order.id}
                        amount={order.total}
                      />
                    </>
                  )}
                </section>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
