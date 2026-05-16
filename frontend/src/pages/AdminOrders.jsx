import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../api'

const STATUSES = ['Pending', 'Shipped', 'Delivered', 'Returned', 'Cancelled']

const STATUS_VALUES = {
  Pending: 0,
  Shipped: 5,
  Delivered: 6,
  Returned: 7,
  Cancelled: 8,
}

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
  const [paymentFilter, setPaymentFilter] = useState('')
  const [updating, setUpdating] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [sort, setSort] = useState({ col: 'id', dir: 'desc' })
  const [headerOpen, setHeaderOpen] = useState(null)
  const headerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setHeaderOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const { data } = await api.get(`/admin/orders?${params}`)
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const toggleSort = (col) => {
    setSort(prev => prev.col === col
      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: col === 'id' || col === 'date' ? 'desc' : 'asc' }
    )
  }

  const displayed = useMemo(() => {
    let arr = orders
    if (statusFilter) arr = arr.filter(o => o.status === statusFilter)
    if (paymentFilter) arr = arr.filter(o => o.paymentMethod === paymentFilter)
    arr = [...arr]
    const { col, dir } = sort
    arr.sort((a, b) => {
      let av, bv
      if (col === 'id') { av = a.id; bv = b.id }
      else if (col === 'date') { av = new Date(a.createdAt); bv = new Date(b.createdAt) }
      else if (col === 'total') { av = a.total; bv = b.total }
      else return 0
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [orders, sort, statusFilter, paymentFilter])

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId)
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: STATUS_VALUES[status] })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    } catch {
      alert('Nije moguće ažurirati status.')
    } finally {
      setUpdating(null)
    }
  }

  const SortTh = ({ col, children }) => {
    const active = sort.col === col
    return (
      <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => toggleSort(col)}>
        {children}{' '}
        <span style={{ opacity: active ? 1 : 0.3 }}>{active && sort.dir === 'asc' ? '↑' : '↓'}</span>
      </th>
    )
  }

  const FilterTh = ({ filterKey, value, onChange, options, children }) => {
    const open = headerOpen === filterKey
    return (
      <th style={{ position: 'relative', userSelect: 'none', whiteSpace: 'nowrap' }}>
        <div
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => setHeaderOpen(open ? null : filterKey)}
        >
          {children}
          <span style={{ fontSize: 11, opacity: value ? 1 : 0.4, color: value ? '#f59e0b' : 'inherit' }}>▼</span>
        </div>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            boxShadow: '0 6px 24px rgba(0,0,0,0.13)', minWidth: 170, overflow: 'hidden'
          }}>
            <div
              style={{ padding: '9px 16px', cursor: 'pointer', fontWeight: !value ? 700 : 400, background: !value ? '#f9fafb' : 'transparent', color: '#374151', fontSize: 14 }}
              onClick={(e) => { e.stopPropagation(); onChange(''); setHeaderOpen(null) }}
            >
              Sve
            </div>
            {options.map(opt => (
              <div
                key={opt.value}
                style={{ padding: '9px 16px', cursor: 'pointer', fontWeight: value === opt.value ? 700 : 400, background: value === opt.value ? '#f9fafb' : 'transparent', color: '#374151', fontSize: 14 }}
                onClick={(e) => { e.stopPropagation(); onChange(opt.value); setHeaderOpen(null) }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </th>
    )
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Porudžbine</h1>
        <p className="adm-page-sub">{displayed.length} rezultata</p>
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-search"
          placeholder="Pretraži po imenu ili emailu..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="adm-table-wrap" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <table className="adm-table">
          <thead>
            <tr ref={headerRef}>
              <SortTh col="id">#ID</SortTh>
              <th>Kupac</th>
              <SortTh col="date">Datum</SortTh>
              <FilterTh
                filterKey="payment"
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={[
                  { value: 'CashOnDelivery', label: 'Pouzećem' },
                  { value: 'BankTransfer', label: 'Bankovni prenos' },
                ]}
              >
                Plaćanje
              </FilterTh>
              <SortTh col="total">Ukupno</SortTh>
              <FilterTh
                filterKey="status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] ?? s }))}
              >
                Status
              </FilterTh>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  Učitavanje...
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  Nema porudžbina.
                </td>
              </tr>
            ) : displayed.map(order => (
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
                  <td>{order.paymentMethod === 'CashOnDelivery' ? 'Pouzećem' : 'Bankovni prenos'}</td>
                  <td className="adm-td-total">{Number(order.total).toLocaleString('sr-RS')} RSD</td>
                  <td onClick={e => e.stopPropagation()}>
                    <select
                      className="adm-select adm-select-sm"
                      value={order.status}
                      disabled={updating === order.id}
                      style={{ background: STATUS_COLORS[order.status] ?? '#6b7280', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, padding: '4px 8px' }}
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
                    <td colSpan={6}>
                      <div className="adm-order-detail">
                        <div className="adm-order-detail-col">
                          <strong>Adresa dostave:</strong> {order.deliveryAddress}<br />
                          <strong>Telefon:</strong> {order.phone ?? '—'}<br />
                          <strong>Međuzbir:</strong> {Number(order.subtotal).toLocaleString('sr-RS')} RSD<br />
                          {order.couponCode && (
                            <>
                              <strong>Kupon:</strong> {order.couponCode}<br />
                            </>
                          )}
                          <strong>Popust:</strong>{' '}
                          {order.discount > 0
                            ? `−${Number(order.discount).toLocaleString('sr-RS')} RSD`
                            : '—'}
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
    </div>
  )
}
