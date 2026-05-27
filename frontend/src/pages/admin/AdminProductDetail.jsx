import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import ApiImage from '../../components/ApiImage'
import AdminModal from '../../components/admin/AdminModal'
import { OrderShippingBadge } from '../../components/admin/AdminOrderTable'

function parseNum(v) {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function formatCalc(n) {
  if (!Number.isFinite(n)) return ''
  const rounded = Math.round(n * 100) / 100
  return rounded === 0 ? '' : String(rounded)
}

function apiErrorMessage(err, fallback) {
  const data = err.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data?.errors) {
    const msgs = Object.values(data.errors).flat().filter(Boolean)
    if (msgs.length) return msgs.join(' ')
  }
  if (typeof data?.title === 'string' && data.title.trim()) return data.title
  if (err.response?.status === 404) {
    return 'API ruta nije pronađena — ponovo pokrenite backend (dotnet run).'
  }
  return fallback
}

function StatMetric({ label, value, highlight, sub }) {
  return (
    <div className={`adm-stats-metric${highlight ? ' adm-stats-metric--highlight' : ''}`}>
      <span className="adm-stats-metric__label">{label}</span>
      <span className="adm-stats-metric__value">{value}</span>
      {sub && <span className="adm-stats-metric__sub">{sub}</span>}
    </div>
  )
}

function StatSection({ title, hint, children }) {
  return (
    <section className="adm-stats-section">
      <div className="adm-stats-section__head">
        <h3 className="adm-stats-section__title">{title}</h3>
        {hint && <p className="adm-stats-section__hint">{hint}</p>}
      </div>
      <div className="adm-stats-section__grid">{children}</div>
    </section>
  )
}

const ORDER_STATUS_LABELS = {
  Pending: 'Na čekanju',
  Shipped: 'Poslato',
  Delivered: 'Dostavljeno',
  Returned: 'Vraćeno',
  Cancelled: 'Otkazano',
}

function parseOrderIdFromReference(ref) {
  if (!ref) return null
  const m = String(ref).match(/#(\d+)/)
  return m ? Number(m[1]) : null
}

function normalizeLedgerDetail(raw = {}, order, productId) {
  const d = {
    purchaseQuantity: raw.purchaseQuantity ?? raw.PurchaseQuantity,
    purchaseUnitCost: raw.purchaseUnitCost ?? raw.PurchaseUnitCost,
    purchaseTransportUnitCost: raw.purchaseTransportUnitCost ?? raw.PurchaseTransportUnitCost,
    purchaseMerchandiseTotal: raw.purchaseMerchandiseTotal ?? raw.PurchaseMerchandiseTotal,
    purchaseTransportTotal: raw.purchaseTransportTotal ?? raw.PurchaseTransportTotal,
    purchaseTotalCost: raw.purchaseTotalCost ?? raw.PurchaseTotalCost,
    purchaseNote: raw.purchaseNote ?? raw.PurchaseNote,
    writeOffQuantity: raw.writeOffQuantity ?? raw.WriteOffQuantity,
    writeOffNote: raw.writeOffNote ?? raw.WriteOffNote,
    orderId: raw.orderId ?? raw.OrderId,
    orderStatus: raw.orderStatus ?? raw.OrderStatus,
    orderCustomerName: raw.orderCustomerName ?? raw.OrderCustomerName,
    orderCustomerEmail: raw.orderCustomerEmail ?? raw.OrderCustomerEmail,
    orderDeliveryAddress: raw.orderDeliveryAddress ?? raw.OrderDeliveryAddress,
    orderPhone: raw.orderPhone ?? raw.OrderPhone,
    orderPaymentMethod: raw.orderPaymentMethod ?? raw.OrderPaymentMethod,
    orderSubtotal: raw.orderSubtotal ?? raw.OrderSubtotal,
    orderDiscount: raw.orderDiscount ?? raw.OrderDiscount,
    orderCouponCode: raw.orderCouponCode ?? raw.OrderCouponCode,
    orderTotal: raw.orderTotal ?? raw.OrderTotal,
    orderFreeShippingApplied: raw.orderFreeShippingApplied ?? raw.OrderFreeShippingApplied,
    orderFreeShippingDeliveryCost: raw.orderFreeShippingDeliveryCost ?? raw.OrderFreeShippingDeliveryCost,
    orderCreatedAt: raw.orderCreatedAt ?? raw.OrderCreatedAt,
    orderItemQuantity: raw.orderItemQuantity ?? raw.OrderItemQuantity,
    orderItemUnitPrice: raw.orderItemUnitPrice ?? raw.OrderItemUnitPrice,
    orderRestoreNote: raw.orderRestoreNote ?? raw.OrderRestoreNote,
    orderItems: raw.orderItems ?? raw.OrderItems,
  }

  if (!order) return d

  const line = order.items?.find((i) => i.productId === productId)
  return {
    ...d,
    orderId: d.orderId ?? order.id,
    orderStatus: d.orderStatus ?? order.status,
    orderCustomerName: d.orderCustomerName ?? order.customerName,
    orderCustomerEmail: d.orderCustomerEmail ?? order.customerEmail,
    orderDeliveryAddress: d.orderDeliveryAddress ?? order.deliveryAddress,
    orderPhone: d.orderPhone ?? order.phone,
    orderPaymentMethod: d.orderPaymentMethod ?? order.paymentMethod,
    orderSubtotal: d.orderSubtotal ?? order.subtotal,
    orderDiscount: d.orderDiscount ?? order.discount,
    orderCouponCode: d.orderCouponCode ?? order.couponCode,
    orderTotal: d.orderTotal ?? order.total,
    orderFreeShippingApplied: d.orderFreeShippingApplied ?? order.freeShippingApplied,
    orderFreeShippingDeliveryCost: d.orderFreeShippingDeliveryCost ?? order.freeShippingDeliveryCost,
    orderItems: d.orderItems ?? order.items,
    orderItemQuantity: d.orderItemQuantity ?? line?.quantity,
    orderItemUnitPrice: d.orderItemUnitPrice ?? line?.unitPrice,
  }
}

function normalizeLedgerRow(row, ordersById, productId) {
  const reference = row.reference ?? row.Reference ?? ''
  const rawDetail = row.detail ?? row.Detail ?? {}
  const orderId = rawDetail.orderId ?? rawDetail.OrderId ?? parseOrderIdFromReference(reference)
  const order = orderId ? ordersById[orderId] : null

  return {
    sequence: row.sequence ?? row.Sequence,
    occurredAt: row.occurredAt ?? row.OccurredAt,
    kind: row.kind ?? row.Kind,
    label: row.label ?? row.Label,
    quantityDelta: row.quantityDelta ?? row.QuantityDelta,
    reference: reference || (orderId ? `Porudžbina #${orderId}` : ''),
    detail: normalizeLedgerDetail(rawDetail, order, productId),
  }
}

function StockLedgerDetail({ row, fmt, fmtMoney }) {
  const d = row.detail ?? {}
  const kind = row.kind

  if (kind === 'PurchaseReceived') {
    return (
      <dl className="adm-stock-ledger-detail__dl">
        <dt>Količina</dt>
        <dd>{d.purchaseQuantity ?? '—'} kom</dd>
        <dt>Cena proizvoda (po komadu)</dt>
        <dd>{fmtMoney(d.purchaseUnitCost)}</dd>
        <dt>Ukupna cena proizvoda</dt>
        <dd>{fmtMoney(d.purchaseMerchandiseTotal)}</dd>
        <dt>Transport (po komadu)</dt>
        <dd>{fmtMoney(d.purchaseTransportUnitCost)}</dd>
        <dt>Transport / carina (ukupno)</dt>
        <dd>{fmtMoney(d.purchaseTransportTotal)}</dd>
        <dt>Ukupan trošak nabavke</dt>
        <dd><strong>{fmtMoney(d.purchaseTotalCost)}</strong></dd>
        {d.purchaseNote && (
          <>
            <dt>Napomena</dt>
            <dd>{d.purchaseNote}</dd>
          </>
        )}
      </dl>
    )
  }

  if (kind === 'WriteOff') {
    return (
      <dl className="adm-stock-ledger-detail__dl">
        <dt>Količina</dt>
        <dd>{d.writeOffQuantity ?? '—'} kom</dd>
        {d.writeOffNote && (
          <>
            <dt>Napomena</dt>
            <dd>{d.writeOffNote}</dd>
          </>
        )}
      </dl>
    )
  }

  if (kind === 'OrderPlaced' || kind === 'OrderRestored') {
    return (
      <div className="adm-stock-ledger-detail__order">
        {d.orderRestoreNote && (
          <p className="adm-stock-ledger-detail__restore-note">{d.orderRestoreNote}</p>
        )}
        <dl className="adm-stock-ledger-detail__dl">
          <dt>Kupac</dt>
          <dd>{d.orderCustomerName ?? '—'}</dd>
          <dt>Email</dt>
          <dd>{d.orderCustomerEmail ?? '—'}</dd>
          <dt>Status</dt>
          <dd>{ORDER_STATUS_LABELS[d.orderStatus] ?? d.orderStatus ?? '—'}</dd>
          <dt>Adresa dostave</dt>
          <dd>{d.orderDeliveryAddress ?? '—'}</dd>
          <dt>Telefon</dt>
          <dd>{d.orderPhone ?? '—'}</dd>
          <dt>Plaćanje</dt>
          <dd>{d.orderPaymentMethod === 'CashOnDelivery' ? 'Pouzećem' : 'Bankovni prenos'}</dd>
          <dt>Međuzbir</dt>
          <dd>{fmtMoney(d.orderSubtotal)}</dd>
          {d.orderCouponCode && (
            <>
              <dt>Kupon</dt>
              <dd>{d.orderCouponCode}</dd>
            </>
          )}
          <dt>Popust</dt>
          <dd>{Number(d.orderDiscount) > 0 ? `−${fmt(d.orderDiscount)} RSD` : '—'}</dd>
          <dt>Dostava</dt>
          <dd><OrderShippingBadge freeShippingApplied={d.orderFreeShippingApplied} compact /></dd>
          {d.orderFreeShippingDeliveryCost != null && (
            <>
              <dt>Trošak dostave (admin)</dt>
              <dd>{fmtMoney(d.orderFreeShippingDeliveryCost)}</dd>
            </>
          )}
          <dt>Ukupno</dt>
          <dd><strong>{fmtMoney(d.orderTotal)}</strong></dd>
          <dt>Ovaj proizvod</dt>
          <dd>
            {d.orderItemQuantity ?? '—'} kom × {fmtMoney(d.orderItemUnitPrice)}
          </dd>
        </dl>
        {Array.isArray(d.orderItems) && d.orderItems.length > 0 && (
          <div className="adm-stock-ledger-detail__items">
            <strong>Stavke porudžbine:</strong>
            <ul>
              {d.orderItems.map((item) => (
                <li key={item.productId}>
                  {item.productName} × {item.quantity} — {fmt(item.unitPrice * item.quantity)} RSD
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return null
}

const EMPTY_NABAVKA = {
  quantity: '',
  unitCost: '',
  totalMerchandiseCost: '',
  transportUnitCost: '',
  totalTransportCost: '',
  note: '',
}

const EMPTY_OTPIS = { quantity: '', note: '' }

export default function AdminProductDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')
  const [pendingReceipts, setPendingReceipts] = useState([])
  const [stockLedger, setStockLedger] = useState([])
  const [stockLedgerLoading, setStockLedgerLoading] = useState(false)
  const [expandedLedgerRow, setExpandedLedgerRow] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showNabavka, setShowNabavka] = useState(false)
  const [showOtpis, setShowOtpis] = useState(false)
  const [nabavka, setNabavka] = useState(EMPTY_NABAVKA)
  const [otpis, setOtpis] = useState(EMPTY_OTPIS)
  const merchTotalManual = useRef(false)
  const transportTotalManual = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadStats = async () => {
    setStatsLoading(true)
    setStatsError('')
    try {
      const { data } = await api.get(`/admin/products/${id}/stats`)
      setStats(data)
      return data
    } catch (err) {
      setStats(null)
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : 'Statistika nije učitana. Proverite da li API radi sa najnovijom verzijom.'
      setStatsError(msg)
      return null
    } finally {
      setStatsLoading(false)
    }
  }

  const loadPendingReceipts = () =>
    api.get(`/admin/products/${id}/pending-receipts`)
      .then(({ data }) => setPendingReceipts(data ?? []))
      .catch(() => setPendingReceipts([]))

  const loadStockLedger = async () => {
    setStockLedgerLoading(true)
    try {
      const productId = Number(id)
      const [{ data: ledger }, { data: orders }] = await Promise.all([
        api.get(`/admin/products/${id}/stock-ledger`),
        api.get('/admin/orders'),
      ])
      const ordersById = Object.fromEntries((orders ?? []).map((o) => [o.id, o]))
      setStockLedger(
        (ledger ?? [])
          .filter((row) => Number(row.quantityDelta ?? row.QuantityDelta) !== 0)
          .map((row) => normalizeLedgerRow(row, ordersById, productId)),
      )
    } catch {
      setStockLedger([])
    } finally {
      setStockLedgerLoading(false)
    }
  }

  const load = ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    return api.get(`/admin/products/${id}`)
      .then((p) => {
        setProduct(p.data)
        return Promise.all([loadStats(), loadPendingReceipts(), loadStockLedger()])
      })
      .catch(() => {
        if (!silent) setProduct(null)
        throw new Error('load failed')
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }

  useEffect(() => { load() }, [id])

  const openStats = async () => {
    setShowStats(true)
    await loadStats()
  }

  const openNabavka = () => {
    merchTotalManual.current = false
    transportTotalManual.current = false
    setNabavka({
      ...EMPTY_NABAVKA,
      unitCost: product?.unitCostPrice != null ? String(product.unitCostPrice) : '',
      transportUnitCost: product?.unitTransportCost != null ? String(product.unitTransportCost) : '',
    })
    setError('')
    setShowNabavka(true)
  }

  const openOtpis = () => {
    setOtpis(EMPTY_OTPIS)
    setError('')
    setShowOtpis(true)
  }

  const handleNabavkaChange = (field, value) => {
    setNabavka((prev) => {
      const next = { ...prev, [field]: value }
      const q = parseNum(field === 'quantity' ? value : next.quantity)
      const u = parseNum(field === 'unitCost' ? value : next.unitCost)
      const tu = parseNum(field === 'transportUnitCost' ? value : next.transportUnitCost)

      if (field === 'totalMerchandiseCost') {
        merchTotalManual.current = true
        return next
      }
      if (field === 'totalTransportCost') {
        transportTotalManual.current = true
        return next
      }

      if (field === 'quantity' || field === 'unitCost') {
        merchTotalManual.current = false
        if (q > 0) next.totalMerchandiseCost = formatCalc(q * u)
      }
      if (field === 'quantity' || field === 'transportUnitCost') {
        transportTotalManual.current = false
        if (q > 0) next.totalTransportCost = formatCalc(q * tu)
      }

      return next
    })
  }

  const deleteProduct = async () => {
    setSaving(true)
    try {
      await api.delete(`/admin/products/${id}`)
      navigate('/admin/products')
    } catch (err) {
      alert(typeof err.response?.data === 'string' ? err.response.data : 'Brisanje nije uspelo.')
    } finally {
      setSaving(false)
      setShowDelete(false)
    }
  }

  const confirmArrival = async (receiptId) => {
    setSaving(true)
    setError('')
    try {
      await api.post(`/admin/products/${id}/stock-receipts/${receiptId}/arrival`)
      load()
    } catch (err) {
      setError(typeof err.response?.data === 'string' ? err.response.data : 'Prijava robe nije uspela.')
    } finally {
      setSaving(false)
    }
  }

  const removePendingReceipt = async (receiptId) => {
    if (!window.confirm('Ukloniti ovu evidenciju nabavke? Roba neće ući na lager.')) return
    setSaving(true)
    setError('')
    try {
      await api.delete(`/admin/products/${id}/stock-receipts/${receiptId}`)
      load()
    } catch (err) {
      setError(typeof err.response?.data === 'string' ? err.response.data : 'Uklanjanje nije uspelo.')
    } finally {
      setSaving(false)
    }
  }

  const submitNabavka = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const qty = parseInt(nabavka.quantity, 10)
    const unit = parseFloat(nabavka.unitCost) || 0
    const transportUnit = parseFloat(nabavka.transportUnitCost) || 0
    const totalMerch = nabavka.totalMerchandiseCost
      ? parseFloat(nabavka.totalMerchandiseCost)
      : Math.round(qty * unit * 100) / 100
    const totalTransport = nabavka.totalTransportCost
      ? parseFloat(nabavka.totalTransportCost)
      : Math.round(qty * transportUnit * 100) / 100
    const totalPurchase = Math.round((totalMerch + totalTransport) * 100) / 100
    try {
      await api.post(`/admin/products/${id}/stock-purchase`, {
        quantity: qty,
        unitCost: unit,
        transportUnitCost: transportUnit,
        transportCost: totalTransport,
        totalMerchandiseCost: totalMerch > 0 ? totalMerch : null,
        totalTransportCost: totalTransport > 0 ? totalTransport : null,
        totalPurchaseCost: totalPurchase > 0 ? totalPurchase : null,
        note: nabavka.note || null,
      })
      setShowNabavka(false)
      load()
    } catch (err) {
      setError(typeof err.response?.data === 'string' ? err.response.data : 'Nabavka nije sačuvana.')
    } finally {
      setSaving(false)
    }
  }

  const submitOtpis = async (e) => {
    e.preventDefault()
    setError('')
    const qty = parseInt(otpis.quantity, 10)
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Unesite ispravnu količinu.')
      return
    }
    const available = product?.stockQuantity ?? 0
    if (qty > available) {
      setError(`Na stanju je samo ${available} komada.`)
      return
    }
    const note = otpis.note?.trim()
    if (!note) {
      setError('Unesite napomenu za otpis.')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post(`/admin/products/${id}/stock-write-off`, {
        quantity: qty,
        note,
      })
      setProduct((prev) => prev ? {
        ...prev,
        stockQuantity: data.stockQuantity,
        orderedQuantity: data.orderedQuantity,
        unitCostPrice: data.unitCostPrice,
      } : prev)
      setOtpis(EMPTY_OTPIS)
      setShowOtpis(false)
      await load({ silent: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Otpis nije sačuvan.'))
    } finally {
      setSaving(false)
    }
  }

  const ledgerRows = useMemo(
    () => stockLedger.filter((row) => Number(row.quantityDelta) !== 0),
    [stockLedger],
  )

  if (loading) return <div className="adm-page"><div className="adm-loading">Učitavanje…</div></div>
  if (!product) return <div className="adm-page"><p>Proizvod nije pronađen.</p><Link to="/admin/products">← Proizvodi</Link></div>

  const fmt = (n) => {
    const x = Number(n)
    if (!Number.isFinite(x)) return '—'
    return x.toLocaleString('sr-RS', { maximumFractionDigits: 0 })
  }
  const fmtMoney = (n) => {
    const x = Number(n)
    if (!Number.isFinite(x)) return '—'
    return `${fmt(x)} RSD`
  }
  const fmtPct = (n) => {
    const x = Number(n)
    if (!Number.isFinite(x)) return '—'
    return `${x.toLocaleString('sr-RS', { maximumFractionDigits: 1 })} %`
  }
  const fmtQty = (n) => {
    const x = Number(n)
    if (!Number.isFinite(x)) return '—'
    return `${x.toLocaleString('sr-RS')} kom`
  }
  const fmtCount = (n) => {
    const x = Number(n)
    if (!Number.isFinite(x)) return '—'
    return x.toLocaleString('sr-RS')
  }
  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  const fmtLedgerDelta = (n) => {
    const x = Number(n)
    if (!Number.isFinite(x) || x === 0) return '—'
    return x > 0 ? `+${x}` : String(x)
  }

  const d = stats
    ? {
        price: stats.price,
        unitCostPrice: stats.unitCostPrice ?? stats.averagePurchaseUnitCost,
        unitTransportCost: stats.unitTransportCost,
        averagePurchaseUnitCost: stats.averagePurchaseUnitCost,
        unitMargin: stats.unitMargin,
        marginPercent: stats.marginPercent,
        totalSoldQuantity: stats.totalSoldQuantity,
        deliveredOrderCount: stats.deliveredOrderCount,
        totalOrdersWithProduct: stats.totalOrdersWithProduct,
        totalRevenue: stats.totalRevenue,
        averageSalePrice: stats.averageSalePrice,
        totalCostOfGoods: stats.totalCostOfGoods,
        totalProfit: stats.totalProfit,
        profitMarginPercent: stats.profitMarginPercent,
        profitPerUnitSold: stats.profitPerUnitSold,
        activeOrderQuantity: stats.activeOrderQuantity,
        returnedCancelledQuantity: stats.returnedCancelledQuantity,
        wishlistCount: stats.wishlistCount,
        stockQuantity: stats.stockQuantity,
        orderedQuantity: stats.orderedQuantity,
        pendingReceiptQuantity: stats.pendingReceiptQuantity,
        stockRetailValue: stats.stockRetailValue,
        stockCostValue: stats.stockCostValue,
        totalPurchasedQuantity: stats.totalPurchasedQuantity,
        totalPurchaseSpend: stats.totalPurchaseSpend,
        purchaseReceiptCount: stats.purchaseReceiptCount,
      }
    : product
      ? {
          price: product.price,
          unitCostPrice: product.unitCostPrice,
          unitTransportCost: product.unitTransportCost,
          stockQuantity: product.stockQuantity,
          orderedQuantity: product.orderedQuantity,
        }
      : null

  const qty = parseNum(nabavka.quantity)
  const unit = parseNum(nabavka.unitCost)
  const transportUnit = parseNum(nabavka.transportUnitCost)
  const totalMerch = parseNum(nabavka.totalMerchandiseCost)
  const totalTransport = parseNum(nabavka.totalTransportCost)
  const costPerProduct = unit + transportUnit
  const orderGrandTotal = totalMerch + totalTransport

  return (
    <div className="adm-page">
      <Link to="/admin/products" className="adm-back-link">← Svi proizvodi</Link>
      {location.state?.restored && (
        <p className="adm-notice" role="status">
          Proizvod sa istim imenom je vraćen u prodavnicu (ranije uklonjen zapis je obnovljen).
        </p>
      )}
      <div className="adm-product-hub">
        <div className="adm-product-hub__media">
          <ApiImage src={product.imageUrl} alt={product.name} className="adm-product-hub__img" />
        </div>
        <div className="adm-product-hub__info">
          <h1 className="adm-page-title">{product.name}</h1>
          <p className="adm-page-sub">
            {product.productType}{product.category ? ` · ${product.category}` : ''} · {fmt(product.price)} RSD
          </p>
          <div className="adm-product-hub__stock-row">
            <p className="adm-product-hub__stock">
              Na stanju: <strong>{product.stockQuantity ?? 0}</strong> kom
            </p>
            {(product.unitCostPrice != null || product.unitTransportCost != null) && (
              <p className="adm-product-hub__stock">
                {product.unitCostPrice != null && (
                  <>Nabavka: <strong>{fmt(product.unitCostPrice)}</strong> RSD/kom</>
                )}
                {product.unitCostPrice != null && product.unitTransportCost != null && ' · '}
                {product.unitTransportCost != null && (
                  <>Transport: <strong>{fmt(product.unitTransportCost)}</strong> RSD/kom</>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="adm-product-detail-toolbar">
        {error && !showNabavka && !showOtpis && (
          <p className="adm-form-error" role="alert">{error}</p>
        )}

        <div className="adm-product-hub__actions">
          <button type="button" className="adm-btn adm-btn-blue" onClick={openNabavka}>Nabavka</button>
          <button type="button" className="adm-btn adm-btn-writeoff" onClick={openOtpis}>Otpis</button>
          <Link to={`/admin/products/${id}/edit`} className="adm-btn">Izmeni detalje o proizvodu</Link>
          <button type="button" className="adm-btn" onClick={openStats}>Statistika</button>
          <button type="button" className="adm-btn adm-btn-danger" onClick={() => setShowDelete(true)}>Obriši proizvod</button>
        </div>

        {pendingReceipts.length > 0 && (
          <div className="adm-pending-receipts-wrap">
            <ul className="adm-pending-receipts">
              {pendingReceipts.map((receipt) => (
                <li key={receipt.id} className="adm-pending-receipt-card">
                  <div className="adm-pending-receipt-card__main">
                    <span className="adm-pending-receipt-card__badge">
                      PORUČENO: {receipt.quantity} komada
                    </span>
                    <span className="adm-pending-receipt-card__date">
                      {fmtDate(receipt.createdAt)}
                    </span>
                    {receipt.totalCost > 0 && (
                      <span className="adm-pending-receipt-card__meta">
                        {fmtMoney(receipt.totalCost)}
                      </span>
                    )}
                    {receipt.note && (
                      <span className="adm-pending-receipt-card__note">{receipt.note}</span>
                    )}
                  </div>
                  <div className="adm-pending-receipt-card__actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn-primary adm-btn--arrival"
                      disabled={saving}
                      onClick={() => confirmArrival(receipt.id)}
                    >
                      {saving ? '…' : 'Stiglo'}
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn-danger adm-btn--compact"
                      disabled={saving}
                      onClick={() => removePendingReceipt(receipt.id)}
                    >
                      Ukloni
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <section className="adm-product-stock-ledger">
          <h2 className="adm-product-stock-ledger__title">Evidencija lagera</h2>
          {stockLedgerLoading ? (
            <p className="adm-product-stock-ledger__empty">Učitavanje…</p>
          ) : ledgerRows.length === 0 ? (
            <p className="adm-product-stock-ledger__empty">Nema zabeleženih promena.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table adm-product-stock-ledger__table">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Događaj</th>
                    <th>Lager</th>
                    <th>Referenca</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row) => {
                    const rowKey = `${row.sequence}-${row.occurredAt}-${row.kind}`
                    const isOpen = expandedLedgerRow === rowKey
                    return (
                      <Fragment key={rowKey}>
                        <tr
                          className={`adm-stock-ledger-row${isOpen ? ' adm-stock-ledger-row--open' : ''}`}
                          onClick={() => setExpandedLedgerRow(isOpen ? null : rowKey)}
                        >
                          <td data-label="Datum">{fmtDate(row.occurredAt)}</td>
                          <td data-label="Događaj">{row.label}</td>
                          <td
                            data-label="Lager"
                            className={row.quantityDelta > 0 ? 'adm-stock-delta--in' : row.quantityDelta < 0 ? 'adm-stock-delta--out' : ''}
                          >
                            {fmtLedgerDelta(row.quantityDelta)}
                          </td>
                          <td data-label="Referenca">
                            {row.detail?.orderId ? (
                              <Link to="/admin/orders" className="adm-stock-ledger-ref-link">
                                {row.reference || `Porudžbina #${row.detail.orderId}`}
                              </Link>
                            ) : (
                              row.reference || '—'
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="adm-stock-ledger-detail-row">
                            <td colSpan={4}>
                              <StockLedgerDetail row={row} fmt={fmt} fmtMoney={fmtMoney} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AdminModal open={showDelete} onClose={() => setShowDelete(false)} className="adm-modal--confirm">
            <div className="adm-modal-body">
              <h2>Da li ste sigurni da želite da obrišete proizvod?</h2>
              <p>Proizvod „{product.name}” biće uklonjen iz prodavnice. Istorija porudžbina ostaje sačuvana; isto ime možete ponovo koristiti da ga vratite.</p>
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={() => setShowDelete(false)}>Odustani</button>
              <button type="button" className="adm-btn adm-btn-danger" disabled={saving} onClick={deleteProduct}>
                {saving ? 'Brisanje…' : 'Da, obriši'}
              </button>
            </div>
      </AdminModal>

      <AdminModal
        open={showStats}
        onClose={() => setShowStats(false)}
        className="adm-modal--stats"
        labelledBy="product-stats-title"
      >
            <header className="adm-stats-modal__header">
              <h2 id="product-stats-title" className="adm-stats-modal__title">Statistika</h2>
              <p className="adm-stats-modal__product">{product.name}</p>
            </header>

            <div className="adm-stats-modal__body">
              {statsLoading && (
                <p className="adm-stats-modal__status">Učitavanje podataka iz baze…</p>
              )}
              {statsError && !statsLoading && (
                <p className="adm-stats-modal__error" role="alert">{statsError}</p>
              )}
              {stats && d && !statsLoading && (
                <>
                  <StatSection title="Proizvod i cene">
                    <StatMetric label="Prodajna cena" value={fmtMoney(d.price)} />
                    <StatMetric label="Nabavna cena (lager)" value={fmtMoney(stats?.unitCostPrice)} />
                    <StatMetric label="Transport po komadu (lager)" value={fmtMoney(stats?.unitTransportCost)} />
                    <StatMetric
                      label="Prosečna nabavna (iz nabavki)"
                      value={fmtMoney(d.averagePurchaseUnitCost)}
                    />
                    <StatMetric label="Marža po komadu" value={fmtMoney(d.unitMargin)} />
                    <StatMetric label="Marža (% od cene)" value={fmtPct(d.marginPercent)} />
                  </StatSection>

                  <StatSection
                    title="Prodaja (dostavljeno)"
                    hint="Samo porudžbine sa statusom „Dostavljeno“."
                  >
                    <StatMetric label="Prodata količina" value={fmtQty(d.totalSoldQuantity)} />
                    <StatMetric label="Dostavljenih porudžbina" value={fmtCount(d.deliveredOrderCount)} />
                    <StatMetric label="Prihod od prodaje" value={fmtMoney(d.totalRevenue)} />
                    <StatMetric label="Prosečna prodajna cena" value={fmtMoney(d.averageSalePrice)} />
                    <StatMetric label="Nabavna vrednost prodatog" value={fmtMoney(d.totalCostOfGoods)} />
                    <StatMetric
                      label="Ukupan profit"
                      value={fmtMoney(d.totalProfit)}
                      highlight
                      sub={Number.isFinite(Number(d.profitMarginPercent))
                        ? `Marža profita ${fmtPct(d.profitMarginPercent)}`
                        : null}
                    />
                    <StatMetric label="Profit po komadu" value={fmtMoney(d.profitPerUnitSold)} />
                  </StatSection>

                  <StatSection title="Porudžbine">
                    <StatMetric
                      label="Ukupno porudžbina sa proizvodom"
                      value={fmtCount(d.totalOrdersWithProduct)}
                      sub="Svi statusi"
                    />
                    <StatMetric
                      label="U aktivnim porudžbinama"
                      value={fmtQty(d.activeOrderQuantity)}
                      sub="Na čekanju, poslato i sl."
                    />
                    <StatMetric
                      label="Vraćeno / otkazano"
                      value={fmtQty(d.returnedCancelledQuantity)}
                    />
                    <StatMetric
                      label="Na listi želja (korisnici)"
                      value={fmtCount(d.wishlistCount)}
                      sub="Ulogovani korisnici u bazi"
                    />
                  </StatSection>

                  <StatSection title="Zalihe">
                    <StatMetric label="Na lageru" value={fmtQty(d.stockQuantity)} />
                    <StatMetric label="Poručeno (čeka stiglo)" value={fmtQty(d.orderedQuantity)} />
                    <StatMetric
                      label="Na čekanju prijema (nabavke)"
                      value={fmtQty(d.pendingReceiptQuantity)}
                    />
                    <StatMetric label="Vrednost lagera (prodajno)" value={fmtMoney(d.stockRetailValue)} />
                    <StatMetric label="Vrednost lagera (nabavno)" value={fmtMoney(d.stockCostValue)} />
                  </StatSection>

                  <StatSection title="Nabavke (iz baze)">
                    <StatMetric label="Ukupno nabavljeno" value={fmtQty(d.totalPurchasedQuantity)} />
                    <StatMetric label="Ukupan trošak nabavki" value={fmtMoney(d.totalPurchaseSpend)} />
                    <StatMetric label="Broj evidencija nabavke" value={fmtCount(d.purchaseReceiptCount)} />
                  </StatSection>
                </>
              )}
            </div>

            <div className="adm-modal-footer adm-modal-footer--center">
              <button type="button" className="adm-btn" onClick={() => setShowStats(false)}>Zatvori</button>
            </div>
      </AdminModal>

      <AdminModal open={showNabavka} onClose={() => setShowNabavka(false)} className="adm-modal--wide">
            <div className="adm-modal-header">
              <h2>Nabavka — {product.name}</h2>
            </div>
            <p className="adm-modal-hint">
              Trošak se evidentira odmah; količina na lageru raste tek kada pritisnete „Stiglo“ na stranici proizvoda.
            </p>
            {error && <div className="adm-form-error">{error}</div>}
            <form onSubmit={submitNabavka} className="adm-form adm-form--nabavka">
              <div className="adm-form-row">
                <label>Količina *</label>
                <input
                  className="adm-input"
                  type="number"
                  min="1"
                  required
                  value={nabavka.quantity}
                  onChange={(e) => handleNabavkaChange('quantity', e.target.value)}
                />
              </div>

              <div className="adm-form-row adm-form-row--2">
                <div>
                  <label>Cena po proizvodu (RSD)</label>
                  <input
                    className="adm-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={nabavka.unitCost}
                    onChange={(e) => handleNabavkaChange('unitCost', e.target.value)}
                  />
                </div>
                <div>
                  <label>Ukupna cena nabavke (RSD)</label>
                  <input
                    className="adm-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={nabavka.totalMerchandiseCost}
                    onChange={(e) => handleNabavkaChange('totalMerchandiseCost', e.target.value)}
                    placeholder={qty > 0 && unit > 0 ? formatCalc(qty * unit) : ''}
                  />
                </div>
              </div>

              <div className="adm-form-row adm-form-row--2">
                <div>
                  <label>Cena transporta po proizvodu (RSD)</label>
                  <input
                    className="adm-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={nabavka.transportUnitCost}
                    onChange={(e) => handleNabavkaChange('transportUnitCost', e.target.value)}
                  />
                </div>
                <div>
                  <label>Cena transporta ukupno (RSD)</label>
                  <input
                    className="adm-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={nabavka.totalTransportCost}
                    onChange={(e) => handleNabavkaChange('totalTransportCost', e.target.value)}
                    placeholder={qty > 0 && transportUnit > 0 ? formatCalc(qty * transportUnit) : ''}
                  />
                </div>
              </div>

              <div className="adm-nabavka-summary">
                <div className="adm-nabavka-summary__row">
                  <div>
                    <span className="adm-nabavka-summary__label">Ukupan trošak po proizvodu</span>
                    <span className="adm-nabavka-summary__value">
                      {costPerProduct > 0 ? `${fmt(costPerProduct)} RSD` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="adm-nabavka-summary__label">Ukupan trošak narudžbine</span>
                    <span className="adm-nabavka-summary__value adm-nabavka-summary__value--total">
                      {orderGrandTotal > 0 ? `${fmt(orderGrandTotal)} RSD` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="adm-form-row">
                <label>Napomena</label>
                <input
                  className="adm-input"
                  value={nabavka.note}
                  onChange={(e) => handleNabavkaChange('note', e.target.value)}
                />
              </div>

              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={() => setShowNabavka(false)}>Odustani</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
                  {saving ? 'Čuvanje…' : 'Evidentiraj porudžbinu'}
                </button>
              </div>
            </form>
      </AdminModal>

      <AdminModal open={showOtpis} onClose={() => setShowOtpis(false)}>
            <div className="adm-modal-header">
              <h2>Otpis — {product.name}</h2>
            </div>
            <p className="adm-modal-hint">
              Smanjuje stanje na lageru odmah i evidentira otpis u Prihodima (iznos −0 RSD). Na stanju trenutno: <strong>{product.stockQuantity ?? 0} kom</strong>.
            </p>
            {error && <div className="adm-form-error">{error}</div>}
            <form onSubmit={submitOtpis} className="adm-form" noValidate>
              <div className="adm-form-row">
                <label htmlFor="otpis-qty">Količina za otpis *</label>
                <input
                  id="otpis-qty"
                  className="adm-input"
                  type="number"
                  min="1"
                  max={product.stockQuantity ?? 0}
                  value={otpis.quantity}
                  onChange={(e) => setOtpis((o) => ({ ...o, quantity: e.target.value }))}
                />
              </div>
              <div className="adm-form-row">
                <label htmlFor="otpis-note">Napomena *</label>
                <input
                  id="otpis-note"
                  className="adm-input"
                  value={otpis.note}
                  onChange={(e) => setOtpis((o) => ({ ...o, note: e.target.value }))}
                  placeholder="npr. oštećeno, istekao rok…"
                />
              </div>
              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={() => setShowOtpis(false)}>Odustani</button>
                <button type="submit" className="adm-btn adm-btn-writeoff" disabled={saving || (product.stockQuantity ?? 0) <= 0}>
                  {saving ? 'Čuvanje…' : 'Potvrdi otpis'}
                </button>
              </div>
            </form>
      </AdminModal>
    </div>
  )
}
