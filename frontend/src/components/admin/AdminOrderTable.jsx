import { Fragment, useEffect, useMemo, useState } from 'react'
import AdminModal from './AdminModal'
import ProductNameWithVariant from '../../components/ProductNameWithVariant'

export const ORDER_STATUSES = ['Pending', 'Shipped', 'Returned', 'Cancelled', 'Delivered']

const FINAL_STATUSES = new Set(['Delivered', 'Returned', 'Cancelled'])

export const STATUS_VALUES = {
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

export function normalizeStatus(status) {
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

export function OrderShippingBadge({ freeShippingApplied, compact = false }) {
  if (freeShippingApplied) {
    return (
      <span className={`adm-shipping-badge adm-shipping-badge--free${compact ? ' adm-shipping-badge--compact' : ''}`}>
        OSTVARENA BESPLATNA DOSTAVA
      </span>
    )
  }
  return (
    <span className={`adm-shipping-badge adm-shipping-badge--paid${compact ? ' adm-shipping-badge--compact' : ''}`}>
      Dostavu plaća korisnik
    </span>
  )
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

function FilterTh({ filterKey, value, onChange, options, children, headerOpen, onHeaderOpenChange }) {
  const open = headerOpen === filterKey
  return (
    <th className="adm-header-filter" style={{ position: 'relative', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <div
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        onClick={() => onHeaderOpenChange(open ? null : filterKey)}
      >
        {children}
        <span style={{ fontSize: 11, opacity: value ? 1 : 0.4, color: value ? '#f59e0b' : 'inherit' }}>▼</span>
      </div>
      {open && (
        <div className="adm-filter-popup">
          <div
            style={{ padding: '9px 16px', cursor: 'pointer', fontWeight: !value ? 700 : 400, background: !value ? '#f9fafb' : 'transparent', color: '#374151', fontSize: 14 }}
            onClick={(e) => { e.stopPropagation(); onChange(''); onHeaderOpenChange(null) }}
          >
            Sve
          </div>
          {options.map((opt) => (
            <div
              key={opt.value}
              style={{ padding: '9px 16px', cursor: 'pointer', fontWeight: value === opt.value ? 700 : 400, background: value === opt.value ? '#f9fafb' : 'transparent', color: '#374151', fontSize: 14 }}
              onClick={(e) => { e.stopPropagation(); onChange(opt.value); onHeaderOpenChange(null) }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </th>
  )
}

function StatusFilterTh({
  selectedStatuses,
  onToggleStatus,
  onToggleSelectAll,
  allSelected,
  filterActive,
  headerOpen,
  onHeaderOpenChange,
}) {
  const open = headerOpen === 'status'
  return (
    <th className="adm-header-filter" style={{ position: 'relative', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <div
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        onClick={() => onHeaderOpenChange(open ? null : 'status')}
      >
        Status
        <span style={{ fontSize: 11, opacity: filterActive ? 1 : 0.4, color: filterActive ? '#f59e0b' : 'inherit' }}>▼</span>
      </div>
      {open && (
        <div className="adm-filter-popup adm-filter-popup--status">
          <button type="button" className="adm-filter-popup-action" onClick={onToggleSelectAll}>
            {allSelected ? 'Poništi sve' : 'Označi sve'}
          </button>
          {ORDER_STATUSES.map((status) => (
            <label key={status} className="adm-filter-check">
              <input
                type="checkbox"
                checked={selectedStatuses.has(status)}
                onChange={() => onToggleStatus(status)}
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

/**
 * Expandable admin orders table with optional status updates and sorting.
 */
export default function AdminOrderTable({
  orders,
  loading = false,
  onUpdateOrder,
  onUpdatePayment,
  showCustomer = true,
  compact = false,
  readOnly = false,
  sortable = false,
  fillHeight = false,
  columnFilters,
}) {
  const [expanded, setExpanded] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [payUpdating, setPayUpdating] = useState(null)
  const [statusConfirm, setStatusConfirm] = useState(null)
  const [deliveryCostInput, setDeliveryCostInput] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [sort, setSort] = useState({ col: 'id', dir: 'desc' })
  const [headerOpen, setHeaderOpen] = useState(null)

  const filterHeaderOpen = columnFilters?.headerOpen ?? headerOpen
  const setFilterHeaderOpen = columnFilters?.onHeaderOpenChange ?? setHeaderOpen

  useEffect(() => {
    if (!filterHeaderOpen) return
    const handler = (e) => {
      if (!e.target.closest('.adm-header-filter')) setFilterHeaderOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterHeaderOpen, setFilterHeaderOpen])

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

  const updateStatus = async (orderId, status, adminDeliveryCost) => {
    setUpdating(orderId)
    try {
      await onUpdateOrder(orderId, status, adminDeliveryCost)
    } finally {
      setUpdating(null)
    }
  }

  const togglePayment = async (order) => {
    if (!onUpdatePayment) return
    setPayUpdating(order.id)
    try {
      await onUpdatePayment(order.id, !order.isPaid)
    } finally {
      setPayUpdating(null)
    }
  }

  const openStatusConfirm = (order, newStatus) => {
    setConfirmError('')
    setDeliveryCostInput('')
    setStatusConfirm({
      orderId: order.id,
      status: newStatus,
      customerName: order.customerName,
      freeShippingApplied: order.freeShippingApplied,
    })
  }

  const handleStatusSelect = (order, newStatus) => {
    if (isFinalStatus(order.status)) return
    if (newStatus === 'Delivered') {
      openStatusConfirm(order, newStatus)
      return
    }
    if (newStatus === 'Returned' && order.freeShippingApplied) {
      openStatusConfirm(order, newStatus)
      return
    }
    updateStatus(order.id, newStatus)
  }

  const confirmStatusChange = async () => {
    if (!statusConfirm) return
    const { orderId, status, freeShippingApplied } = statusConfirm
    let adminDeliveryCost

    if (freeShippingApplied) {
      const parsed = parseFloat(String(deliveryCostInput).replace(',', '.'))
      if (!Number.isFinite(parsed) || parsed < 0) {
        setConfirmError('Unesite ispravan iznos dostave (0 ili više).')
        return
      }
      adminDeliveryCost = parsed
    }

    setStatusConfirm(null)
    setConfirmError('')
    await updateStatus(orderId, status, adminDeliveryCost)
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

  const colSpan = showCustomer ? 7 : 6

  return (
    <>
      <div
        className="adm-table-wrap"
        style={fillHeight ? { flex: 1, overflowY: 'auto', minHeight: 0 } : undefined}
      >
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
                  {columnFilters ? (
                    <FilterTh
                      filterKey="payment"
                      value={columnFilters.paymentFilter}
                      onChange={columnFilters.onPaymentFilterChange}
                      options={[
                        { value: 'CashOnDelivery', label: 'Pouzećem' },
                        { value: 'BankTransfer', label: 'Bankovni prenos' },
                      ]}
                      headerOpen={filterHeaderOpen}
                      onHeaderOpenChange={setFilterHeaderOpen}
                    >
                      Plaćanje
                    </FilterTh>
                  ) : (
                    <th>Plaćanje</th>
                  )}
                  <SortTh col="total" sort={sort} onSort={toggleSort}>Ukupno</SortTh>
                  <th>Dostava</th>
                  {columnFilters ? (
                    <StatusFilterTh
                      selectedStatuses={columnFilters.selectedStatuses}
                      onToggleStatus={columnFilters.onToggleStatus}
                      onToggleSelectAll={columnFilters.onToggleSelectAll}
                      allSelected={columnFilters.allStatusesSelected}
                      filterActive={columnFilters.statusFilterActive}
                      headerOpen={filterHeaderOpen}
                      onHeaderOpenChange={setFilterHeaderOpen}
                    />
                  ) : (
                    <th>Status</th>
                  )}
                </>
              ) : (
                <>
                  <th>#ID</th>
                  {showCustomer && <th>Kupac</th>}
                  <th>Datum</th>
                  <th>Plaćanje</th>
                  <th>Ukupno</th>
                  <th>Dostava</th>
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
                    <td className="adm-td-shipping">
                      <OrderShippingBadge freeShippingApplied={order.freeShippingApplied} compact />
                    </td>
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
                            <strong>Dostava:</strong>{' '}
                            <OrderShippingBadge freeShippingApplied={order.freeShippingApplied} />
                            {!order.freeShippingApplied && Number(order.shippingCost) > 0 && (
                              <>
                                {' '}
                                (+{fmtMoney(order.shippingCost)} RSD)
                              </>
                            )}
                            {order.freeShippingDeliveryCost != null && (
                              <>
                                <br />
                                <strong>Trošak dostave (admin):</strong>{' '}
                                {fmtMoney(order.freeShippingDeliveryCost)} RSD
                              </>
                            )}
                            {order.paymentMethod === 'BankTransfer' && (
                              <div className="adm-order-pay">
                                <strong>Status uplate:</strong>{' '}
                                <span className={`adm-pay-badge${order.isPaid ? ' adm-pay-badge--paid' : ''}`}>
                                  {order.isPaid ? 'Plaćeno' : 'Čeka se uplata'}
                                </span>
                                {!readOnly && onUpdatePayment && (
                                  <button
                                    type="button"
                                    className="adm-btn adm-btn-sm adm-order-pay-btn"
                                    disabled={payUpdating === order.id}
                                    onClick={(e) => { e.stopPropagation(); togglePayment(order) }}
                                  >
                                    {payUpdating === order.id
                                      ? 'Čuvanje…'
                                      : order.isPaid ? 'Označi kao neplaćeno' : 'Označi kao plaćeno'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="adm-order-items">
                            <strong>Stavke:</strong>
                            <ul>
                              {order.items.map((item) => (
                                <li key={item.productId}>
                                  <ProductNameWithVariant
                                    productName={item.productName}
                                    variantLabel={item.variantLabel}
                                  /> × {item.quantity} — {fmtMoney(item.unitPrice * item.quantity)} RSD
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

      {statusConfirm && !readOnly && (
        <AdminModal
          open
          onClose={() => { setStatusConfirm(null); setConfirmError('') }}
          className="adm-modal--confirm"
        >
          <div className="adm-modal-body">
            {statusConfirm.status === 'Delivered' ? (
              <>
                <h2>Da li ste sigurni da želite da evidentirate da je pošiljka dostavljena?</h2>
                <p>
                  Porudžbina <strong>#{statusConfirm.orderId}</strong>
                  {statusConfirm.customerName ? <> ({statusConfirm.customerName})</> : null}
                  {' '}biće označena kao dostavljena. Status je finalan, a uplata korisnika biće evidentirana u prihodima.
                </p>
              </>
            ) : (
              <>
                <h2>Označiti porudžbinu kao vraćenu?</h2>
                <p>
                  Porudžbina <strong>#{statusConfirm.orderId}</strong>
                  {statusConfirm.customerName ? <> ({statusConfirm.customerName})</> : null}
                  {' '}biće označena kao vraćena. Roba se vraća na lager.
                </p>
              </>
            )}
            {statusConfirm.freeShippingApplied && (
              <div className="adm-form-row" style={{ marginTop: '1rem' }}>
                <label className="adm-form-row" htmlFor="admin-delivery-cost">
                  Koliko ste platili dostavu? (RSD)
                </label>
                <input
                  id="admin-delivery-cost"
                  className="adm-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="npr. 450"
                  value={deliveryCostInput}
                  onChange={(e) => {
                    setDeliveryCostInput(e.target.value)
                    setConfirmError('')
                  }}
                  autoFocus
                />
                <p className="adm-modal-hint" style={{ padding: '0.5rem 0 0' }}>
                  Kupac je imao besplatnu dostavu — ovaj trošak se evidentira kao rashod u prihodima.
                </p>
              </div>
            )}
            {confirmError && (
              <p className="adm-form-error" style={{ marginTop: '0.75rem' }}>{confirmError}</p>
            )}
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="adm-btn" onClick={() => { setStatusConfirm(null); setConfirmError('') }}>
              Odustani
            </button>
            <button
              type="button"
              className={`adm-btn adm-btn-primary${statusConfirm.status === 'Delivered' ? ' adm-btn--delivered' : ''}`}
              disabled={updating === statusConfirm.orderId}
              onClick={confirmStatusChange}
            >
              {updating === statusConfirm.orderId ? 'Čuvanje…' : 'Potvrdi'}
            </button>
          </div>
        </AdminModal>
      )}
    </>
  )
}
