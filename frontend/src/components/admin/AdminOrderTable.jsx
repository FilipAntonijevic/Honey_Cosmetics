import { Fragment, useMemo, useState } from 'react'

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

function fmtMoney(n) {
  return Number(n).toLocaleString('sr-RS', { maximumFractionDigits: 0 })
}

function SortTh({ col, sort, onSort, children }) {
  const active = sort.col === col
  return (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      onClick={() => onSort(col)}
    >
      {children}{' '}
      <span style={{ opacity: active ? 1 : 0.3 }}>{active && sort.dir === 'asc' ? '↑' : '↓'}</span>
    </th>
  )
}

/**
 * Expandable admin orders table with optional status updates and sorting.
 */
export default function AdminOrderTable({
  orders,
  loading = false,
  onUpdateOrder,
  showCustomer = true,
  compact = false,
  readOnly = false,
  sortable = false,
}) {
  const [expanded, setExpanded] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [deliveredConfirm, setDeliveredConfirm] = useState(null)
  const [sort, setSort] = useState({ col: 'id', dir: 'desc' })

  const toggleSort = (col) => {
    setSort((prev) => (prev.col === col
      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: col === 'id' || col === 'date' ? 'desc' : 'asc' }))
  }

  const displayedOrders = useMemo(() => {
    if (!sortable) return orders
    const arr = [...orders]
    const { col, dir } = sort
    arr.sort((a, b) => {
      if (col === 'customer') {
        const cmp = (a.customerName ?? '').localeCompare(b.customerName ?? '', 'sr', { sensitivity: 'base' })
        return dir === 'asc' ? cmp : -cmp
      }
      let av
      let bv
      if (col === 'id') { av = a.id; bv = b.id }
      else if (col === 'date') { av = new Date(a.createdAt); bv = new Date(b.createdAt) }
      else if (col === 'total') { av = a.total; bv = b.total }
      else return 0
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [orders, sort, sortable])

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId)
    try {
      await onUpdateOrder(orderId, status)
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
    const isDelivered = order.status === 'Delivered'

    if (readOnly || isFinalStatus(order.status)) {
      return (
        <span
          className={`adm-order-status-locked${isDelivered ? ' adm-order-status-locked--delivered' : ''}`}
          style={{ background: color, color: '#fff' }}
          title={readOnly ? undefined : 'Finalan status — ne može se menjati'}
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
        style={{
          background: STATUS_COLORS[display] ?? '#6b7280',
          color: '#fff',
          fontWeight: 600,
          border: 'none',
          borderRadius: 8,
          padding: '4px 8px',
        }}
        onChange={(e) => handleStatusSelect(order, e.target.value)}
      >
        {ORDER_STATUSES.map((s) => (
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

  const colSpan = showCustomer ? 6 : 5

  return (
    <>
      <div className="adm-table-wrap">
        <table className={`adm-table${compact ? ' adm-table--compact' : ''}`}>
          <thead>
            <tr>
              {sortable ? (
                <>
                  <SortTh col="id" sort={sort} onSort={toggleSort}>#ID</SortTh>
                  {showCustomer && (
                    <SortTh col="customer" sort={sort} onSort={toggleSort}>Kupac</SortTh>
                  )}
                  <SortTh col="date" sort={sort} onSort={toggleSort}>Datum</SortTh>
                  <th>Plaćanje</th>
                  <SortTh col="total" sort={sort} onSort={toggleSort}>Ukupno</SortTh>
                  <th>Status</th>
                </>
              ) : (
                <>
                  <th>#ID</th>
                  {showCustomer && <th>Kupac</th>}
                  <th>Datum</th>
                  <th>Plaćanje</th>
                  <th>Ukupno</th>
                  <th>Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  Učitavanje…
                </td>
              </tr>
            ) : displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={colSpan} style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  Nema porudžbina.
                </td>
              </tr>
            ) : (
              displayedOrders.map((order) => (
                <Fragment key={order.id}>
                  <tr
                    className={`adm-table-row${expanded === order.id ? ' expanded' : ''}`}
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  >
                    <td className="adm-td-id">#{order.id}</td>
                    {showCustomer && (
                      <td>
                        <div className="adm-customer-name">{order.customerName}</div>
                        <div className="adm-customer-email">{order.customerEmail}</div>
                      </td>
                    )}
                    <td>{new Date(order.createdAt).toLocaleDateString('sr-RS')}</td>
                    <td>{order.paymentMethod === 'CashOnDelivery' ? 'Pouzećem' : 'Bankovni prenos'}</td>
                    <td className="adm-td-total">{fmtMoney(order.total)} RSD</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {renderStatusCell(order)}
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr className="adm-expanded-row">
                      <td colSpan={colSpan}>
                        <div className="adm-order-detail">
                          <div className="adm-order-detail-col">
                            <strong>Adresa dostave:</strong> {order.deliveryAddress}<br />
                            <strong>Telefon:</strong> {order.phone ?? '—'}<br />
                            <strong>Međuzbir:</strong> {fmtMoney(order.subtotal)} RSD<br />
                            {order.couponCode && (
                              <>
                                <strong>Kupon:</strong> {order.couponCode}<br />
                              </>
                            )}
                            <strong>Popust:</strong>{' '}
                            {order.discount > 0
                              ? `−${fmtMoney(order.discount)} RSD`
                              : '—'}
                            <br />
                            {order.freeShippingApplied && (
                              <>
                                <strong>Dostava:</strong> Besplatna<br />
                              </>
                            )}
                          </div>
                          <div className="adm-order-items">
                            <strong>Stavke:</strong>
                            <ul>
                              {order.items.map((item) => (
                                <li key={item.productId}>
                                  {item.productName} × {item.quantity} — {fmtMoney(item.unitPrice * item.quantity)} RSD
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deliveredConfirm && !readOnly && (
        <div
          className="adm-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setDeliveredConfirm(null)}
        >
          <div className="adm-modal adm-modal--confirm" role="dialog" aria-modal="true">
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
          </div>
        </div>
      )}
    </>
  )
}

export { STATUS_VALUES }
