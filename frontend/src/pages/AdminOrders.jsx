import { useCallback, useEffect, useState } from 'react'
import api from '../api'

const STATUSES = ['Pending', 'Shipped', 'Returned', 'Cancelled', 'Delivered']

const STATUS_LABELS = {
  Pending: 'Na čekanju',
  AwaitingPayment: 'Čeka uplatu',
  PaymentConfirmed: 'Uplata potvrđena',
  Processing: 'U obradi',
  Shipped: 'Poslato',
  Delivered: 'Dostavljeno',
  Returned: 'Vraćeno',
  Cancelled: 'Otkazano',
  FailedDelivery: 'Neuspela dostava',
}

const STATUS_COLORS = {
  Pending: '#f59e0b',
  AwaitingPayment: '#6366f1',
  PaymentConfirmed: '#10b981',
  Processing: '#3b82f6',
  Shipped: '#0ea5e9',
  Delivered: '#22c55e',
  Returned: '#f97316',
  Cancelled: '#ef4444',
  FailedDelivery: '#dc2626',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [updating, setUpdating] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      const { data } = await api.get(`/admin/orders?${params}`)
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => { load() }, [load])

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId)
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    } catch {
      alert('Nije moguće ažurirati status.')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Porudžbine</h1>
        <p className="adm-page-sub">{orders.length} rezultata</p>
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-search"
          placeholder="Pretraži po imenu ili emailu..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="adm-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Svi statusi</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="adm-loading">Učitavanje...</div>
      ) : orders.length === 0 ? (
        <div className="adm-empty">Nema porudžbina.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>#ID</th>
                <th>Kupac</th>
                <th>Datum</th>
                <th>Plaćanje</th>
                <th>Ukupno</th>
                <th>Status</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <>
                  <tr
                    key={order.id}
                    className={`adm-table-row${expanded === order.id ? ' expanded' : ''}`}
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  >
                    <td className="adm-td-id">#{order.id}</td>
                    <td>
                      <div className="adm-customer-name">{order.customerName}</div>
                      <div className="adm-customer-email">{order.customerEmail}</div>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString('sr-RS')}</td>
                    <td>{order.paymentMethod === 'CashOnDelivery' ? 'Pouzećem' : 'Prenos'}</td>
                    <td className="adm-td-total">{order.total.toLocaleString('sr-RS')} RSD</td>
                    <td>
                      <span
                        className="adm-status-badge"
                        style={{ background: STATUS_COLORS[order.status] ?? '#6b7280' }}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <select
                        className="adm-select adm-select-sm"
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={e => updateStatus(order.id, e.target.value)}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr key={`${order.id}-detail`} className="adm-expanded-row">
                      <td colSpan={7}>
                        <div className="adm-order-detail">
                          <div className="adm-order-detail-col">
                            <strong>Adresa dostave:</strong> {order.deliveryAddress}<br />
                            <strong>Telefon:</strong> {order.phone ?? '—'}<br />
                            <strong>Popust:</strong> {order.discount > 0 ? `${order.discount.toLocaleString('sr-RS')} RSD` : '—'}
                          </div>
                          <div className="adm-order-items">
                            <strong>Stavke:</strong>
                            <ul>
                              {order.items.map(item => (
                                <li key={item.productId}>
                                  {item.productName} × {item.quantity} — {(item.unitPrice * item.quantity).toLocaleString('sr-RS')} RSD
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
