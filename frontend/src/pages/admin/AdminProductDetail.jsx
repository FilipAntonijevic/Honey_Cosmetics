import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import ApiImage from '../../components/ApiImage'

function parseNum(v) {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function formatCalc(n) {
  if (!Number.isFinite(n)) return ''
  const rounded = Math.round(n * 100) / 100
  return rounded === 0 ? '' : String(rounded)
}

const EMPTY_NABAVKA = {
  quantity: '',
  unitCost: '',
  totalMerchandiseCost: '',
  transportUnitCost: '',
  totalTransportCost: '',
  note: '',
}

export default function AdminProductDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showNabavka, setShowNabavka] = useState(false)
  const [nabavka, setNabavka] = useState(EMPTY_NABAVKA)
  const merchTotalManual = useRef(false)
  const transportTotalManual = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/admin/products/${id}`),
      api.get(`/admin/products/${id}/stats`),
    ])
      .then(([p, s]) => {
        setProduct(p.data)
        setStats(s.data)
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const openNabavka = () => {
    merchTotalManual.current = false
    transportTotalManual.current = false
    setNabavka({
      ...EMPTY_NABAVKA,
      unitCost: product?.unitCostPrice != null ? String(product.unitCostPrice) : '',
    })
    setError('')
    setShowNabavka(true)
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

  const confirmArrival = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post(`/admin/products/${id}/stock-arrival`)
      load()
    } catch (err) {
      setError(typeof err.response?.data === 'string' ? err.response.data : 'Prijava robe nije uspela.')
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

  if (loading) return <div className="adm-page"><div className="adm-loading">Učitavanje…</div></div>
  if (!product) return <div className="adm-page"><p>Proizvod nije pronađen.</p><Link to="/admin/products">← Proizvodi</Link></div>

  const fmt = (n) => Number(n).toLocaleString('sr-RS', { maximumFractionDigits: 0 })

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
            {(product.orderedQuantity ?? 0) > 0 && (
              <div className="adm-product-ordered">
                <span className="adm-product-ordered__badge">
                  PORUČENO: {product.orderedQuantity} komada
                </span>
                <button
                  type="button"
                  className="adm-btn adm-btn-primary adm-btn--arrival"
                  disabled={saving}
                  onClick={confirmArrival}
                >
                  {saving ? '…' : 'Stiglo'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="adm-product-hub__actions">
        <button type="button" className="adm-btn adm-btn-blue" onClick={openNabavka}>Nabavka</button>
        <Link to={`/admin/products/${id}/edit`} className="adm-btn">Izmeni detalje o proizvodu</Link>
        <button type="button" className="adm-btn" onClick={() => setShowStats(true)}>Statistika</button>
        <button type="button" className="adm-btn adm-btn-danger" onClick={() => setShowDelete(true)}>Obriši proizvod</button>
      </div>

      {showDelete && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDelete(false)}>
          <div className="adm-modal adm-modal--confirm" role="dialog" aria-modal="true">
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
          </div>
        </div>
      )}

      {showStats && stats && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowStats(false)}>
          <div className="adm-modal adm-modal--stats" role="dialog">
            <h2 className="adm-modal__title-center">Statistika</h2>
            <p className="adm-modal__subtitle-center">{product.name}</p>
            <div className="adm-stats-grid-panel">
              <div className="adm-stats-grid-panel__item">
                <span className="adm-stats-grid-panel__label">Prodata količina</span>
                <span className="adm-stats-grid-panel__value">{stats.totalSoldQuantity} kom</span>
              </div>
              <div className="adm-stats-grid-panel__item">
                <span className="adm-stats-grid-panel__label">Prihod od prodaje</span>
                <span className="adm-stats-grid-panel__value">{fmt(stats.totalRevenue)} RSD</span>
              </div>
              <div className="adm-stats-grid-panel__item">
                <span className="adm-stats-grid-panel__label">Nabavna vrednost prodatog</span>
                <span className="adm-stats-grid-panel__value">{fmt(stats.totalCostOfGoods)} RSD</span>
              </div>
              <div className="adm-stats-grid-panel__item adm-stats-grid-panel__item--highlight">
                <span className="adm-stats-grid-panel__label">Ukupan profit</span>
                <span className="adm-stats-grid-panel__value">{fmt(stats.totalProfit)} RSD</span>
              </div>
              <div className="adm-stats-grid-panel__item">
                <span className="adm-stats-grid-panel__label">Profit po komadu</span>
                <span className="adm-stats-grid-panel__value">{fmt(stats.profitPerUnitSold)} RSD</span>
              </div>
              <div className="adm-stats-grid-panel__item">
                <span className="adm-stats-grid-panel__label">Trenutno stanje</span>
                <span className="adm-stats-grid-panel__value">{stats.stockQuantity} kom</span>
              </div>
              <div className="adm-stats-grid-panel__item adm-stats-grid-panel__item--wide">
                <span className="adm-stats-grid-panel__label">Cena nabavke (prosek)</span>
                <span className="adm-stats-grid-panel__value">
                  {stats.unitCostPrice != null ? `${fmt(stats.unitCostPrice)} RSD` : '—'}
                </span>
              </div>
            </div>
            <div className="adm-modal-footer adm-modal-footer--center">
              <button type="button" className="adm-btn" onClick={() => setShowStats(false)}>Zatvori</button>
            </div>
          </div>
        </div>
      )}

      {showNabavka && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowNabavka(false)}>
          <div className="adm-modal adm-modal--wide" role="dialog">
            <h2>Nabavka — {product.name}</h2>
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
          </div>
        </div>
      )}
    </div>
  )
}
