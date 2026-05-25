import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import { OrderShippingBadge } from '../components/admin/AdminOrderTable'
import AdminModal from '../components/admin/AdminModal'

/** Redosled u padajućem meniju (Dostavljeno poslednje). */
const ORDER_STATUSES = ['Pending', 'Shipped', 'Returned', 'Cancelled', 'Delivered']

const FINAL_STATUSES = new Set(['Delivered', 'Returned', 'Cancelled'])

const STATUS_VALUES = {
  Pending: 0,
  Shipped: 5,
  Delivered: 6,
  Returned: 7,
  Cancelled: 8,
}

const STATUS_LABELS = {
  Pending: 'Na čekanju',
  Shipped: 'Poslato',
  Delivered: 'Dostavljeno',
  Returned: 'Vraćeno',
  Cancelled: 'Otkazano',
  AwaitingPayment: 'Na čekanju',
  PaymentConfirmed: 'Na čekanju',
  Processing: 'Na čekanju',
  InsufficientFunds: 'Na čekanju',
  FailedDelivery: 'Vraćeno',
}

const STATUS_COLORS = {
  Pending: '#f59e0b',
  Shipped: '#0ea5e9',
  Delivered: '#16a34a',
  Returned: '#f97316',
  Cancelled: '#ef4444',
}

const LEGACY_AS_PENDING = new Set([
  'AwaitingPayment',
  'PaymentConfirmed',
  'Processing',
  'InsufficientFunds',
  'FailedDelivery',
])

function normalizeStatus(status) {
  if (LEGACY_AS_PENDING.has(status)) return 'Pending'
  return status
}

function isFinalStatus(status) {
  return FINAL_STATUSES.has(status)
}

function statusLabel(status) {
  return STATUS_LABELS[status] ?? STATUS_LABELS[normalizeStatus(status)] ?? status
}

function AdminOrderRows({
  order,
  expanded,
  onToggleExpanded,
  renderStatusCell,
}) {
  const isExpanded = expanded === order.id

  return (
    <>
      <tr
        className={`adm-table-row${isExpanded ? ' expanded' : ''}`}
        onClick={() => onToggleExpanded(order.id)}
      >
        <td className="adm-td-id">#{order.id}</td>
        <td>
          <div className="adm-customer-name">{order.customerName}</div>
          <div className="adm-customer-email">{order.customerEmail}</div>
        </td>
        <td>{new Date(order.createdAt).toLocaleDateString('sr-RS')}</td>
        <td>{order.paymentMethod === 'CashOnDelivery' ? 'Pouzećem' : 'Bankovni prenos'}</td>
        <td className="adm-td-total">{Number(order.total).toLocaleString('sr-RS')} RSD</td>
        <td className="adm-td-shipping">
          <OrderShippingBadge freeShippingApplied={order.freeShippingApplied} compact />
        </td>
        <td onClick={(e) => e.stopPropagation()}>
          {renderStatusCell(order)}
        </td>
      </tr>
      {isExpanded && (
        <tr className="adm-expanded-row">
          <td colSpan={7}>
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
                <br />
                <strong>Dostava:</strong>{' '}
                <OrderShippingBadge freeShippingApplied={order.freeShippingApplied} />
              </div>
              <div className="adm-order-items">
                <strong>Stavke:</strong>
                <ul>
                  {order.items.map((item) => (
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
  )
}

export default function AdminOrders() {
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [selectedStatuses, setSelectedStatuses] = useState(
    () => new Set(['Pending']),
  )
  const [paymentFilter, setPaymentFilter] = useState('')
  const [updating, setUpdating] = useState(null)
  const [deliveredConfirm, setDeliveredConfirm] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [sort, setSort] = useState({ col: 'id', dir: 'desc' })
  const [headerOpen, setHeaderOpen] = useState(null)

  useEffect(() => {
    if (!headerOpen) return
    const handler = (e) => {
      if (!e.target.closest('.adm-header-filter')) {
        setHeaderOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [headerOpen])

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
    if (selectedStatuses.size < ORDER_STATUSES.length) {
      arr = arr.filter((o) => selectedStatuses.has(normalizeStatus(o.status)))
    }
    if (paymentFilter) arr = arr.filter(o => o.paymentMethod === paymentFilter)
    arr = [...arr]
    const { col, dir } = sort
    arr.sort((a, b) => {
      let av, bv
      if (col === 'customer') {
        const cmp = (a.customerName ?? '').localeCompare(b.customerName ?? '', 'sr', { sensitivity: 'base' })
        return dir === 'asc' ? cmp : -cmp
      }
      if (col === 'id') { av = a.id; bv = b.id }
      else if (col === 'date') { av = new Date(a.createdAt); bv = new Date(b.createdAt) }
      else if (col === 'total') { av = a.total; bv = b.total }
      else return 0
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [orders, sort, selectedStatuses, paymentFilter])

  const allStatusesSelected = selectedStatuses.size === ORDER_STATUSES.length
  const statusFilterActive = !allStatusesSelected

  const toggleStatusFilter = (status) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const toggleSelectAllStatuses = () => {
    setSelectedStatuses(
      allStatusesSelected ? new Set() : new Set(ORDER_STATUSES),
    )
  }

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId)
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: STATUS_VALUES[status] })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    } catch (err) {
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : 'Nije moguće ažurirati status.'
      alert(msg)
    } finally {
      setUpdating(null)
    }
  }

  const handleStatusSelect = (order, newStatus) => {
    if (isFinalStatus(order.status)) return
    if (newStatus === 'Delivered') {
      setDeliveredConfirm({ orderId: order.id, customerName: order.customerName })
      return
    }
    updateStatus(order.id, newStatus)
  }

  const confirmDelivered = async () => {
    if (!deliveredConfirm) return
    const { orderId } = deliveredConfirm
    setDeliveredConfirm(null)
    await updateStatus(orderId, 'Delivered')
  }

  const renderStatusCell = (order) => {
    const display = normalizeStatus(order.status)
    const color = STATUS_COLORS[order.status] ?? STATUS_COLORS[display] ?? '#6b7280'

    if (isFinalStatus(order.status)) {
      const isDelivered = order.status === 'Delivered'
      return (
        <span
          className={`adm-order-status-locked${isDelivered ? ' adm-order-status-locked--delivered' : ''}`}
          style={{ background: color, color: '#fff' }}
          title="Finalan status — ne može se menjati"
        >
          {statusLabel(order.status)}
        </span>
      )
    }

    return (
      <select
        className={`adm-select adm-select-sm adm-order-status-select${display === 'Delivered' ? ' adm-order-status-select--delivered' : ''}`}
        value={display}
        disabled={updating === order.id}
        style={{ background: STATUS_COLORS[display] ?? '#6b7280', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, padding: '4px 8px' }}
        onChange={e => handleStatusSelect(order, e.target.value)}
      >
        {ORDER_STATUSES.map(s => (
          <option
            key={s}
            value={s}
            className={s === 'Delivered' ? 'adm-order-status-option--delivered' : undefined}
          >
            {STATUS_LABELS[s] ?? s}
          </option>
        ))}
      </select>
    )
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

  const StatusFilterTh = () => {
    const open = headerOpen === 'status'
    return (
      <th className="adm-header-filter" style={{ position: 'relative', userSelect: 'none', whiteSpace: 'nowrap' }}>
        <div
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => setHeaderOpen(open ? null : 'status')}
        >
          Status
          <span style={{ fontSize: 11, opacity: statusFilterActive ? 1 : 0.4, color: statusFilterActive ? '#f59e0b' : 'inherit' }}>▼</span>
        </div>
        {open && (
          <div className="adm-filter-popup adm-filter-popup--status">
            <button
              type="button"
              className="adm-filter-popup-action"
              onClick={toggleSelectAllStatuses}
            >
              {allStatusesSelected ? 'Poništi sve' : 'Označi sve'}
            </button>
            {ORDER_STATUSES.map((status) => (
              <label key={status} className="adm-filter-check">
                <input
                  type="checkbox"
                  checked={selectedStatuses.has(status)}
                  onChange={() => toggleStatusFilter(status)}
                />
                <span
                  className="adm-filter-check-dot"
                  style={{ background: STATUS_COLORS[status] ?? '#6b7280' }}
                />
                <span>{STATUS_LABELS[status] ?? status}</span>
              </label>
            ))}
          </div>
        )}
      </th>
    )
  }

  const FilterTh = ({ filterKey, value, onChange, options, children }) => {
    const open = headerOpen === filterKey
    return (
      <th className="adm-header-filter" style={{ position: 'relative', userSelect: 'none', whiteSpace: 'nowrap' }}>
        <div
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => setHeaderOpen(open ? null : filterKey)}
        >
          {children}
          <span style={{ fontSize: 11, opacity: value ? 1 : 0.4, color: value ? '#f59e0b' : 'inherit' }}>▼</span>
        </div>
        {open && (
          <div className="adm-filter-popup">
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
          placeholder="Pretraži po ID-u porudžbine"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="adm-table-wrap" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <table className="adm-table">
          <thead>
            <tr>
              <SortTh col="id">#ID</SortTh>
              <SortTh col="customer">Kupac</SortTh>
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
              <th>Dostava</th>
              <StatusFilterTh />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  Učitavanje...
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  Nema porudžbina.
                </td>
              </tr>
            ) : displayed.map((order) => (
              <AdminOrderRows
                key={order.id}
                order={order}
                expanded={expanded}
                onToggleExpanded={(orderId) => setExpanded(expanded === orderId ? null : orderId)}
                renderStatusCell={renderStatusCell}
              />
            ))}
          </tbody>
        </table>
      </div>

      {deliveredConfirm && (
        <AdminModal
          open
          onClose={() => setDeliveredConfirm(null)}
          className="adm-modal--confirm"
        >
          <div className="adm-modal-body">
            <h2>Da li ste sigurni da želite da evidentirate da je pošiljka dostavljena?</h2>
            <p>
              Porudžbina <strong>#{deliveredConfirm.orderId}</strong>
              {deliveredConfirm.customerName ? <> ({deliveredConfirm.customerName})</> : null}
              {' '}biće označena kao dostavljena. Status je finalan, a uplata korisnika biće evidentirana u prihodima.
            </p>
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="adm-btn" onClick={() => setDeliveredConfirm(null)}>Odustani</button>
            <button
              type="button"
              className="adm-btn adm-btn-primary adm-btn--delivered"
              disabled={updating === deliveredConfirm.orderId}
              onClick={confirmDelivered}
            >
              {updating === deliveredConfirm.orderId ? 'Čuvanje…' : 'Da, evidentiraj dostavu'}
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  )
}
