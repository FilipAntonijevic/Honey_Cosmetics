import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api'
import ApiImage from '../../components/ApiImage'
import AdminOrderTable from '../../components/admin/AdminOrderTable'
import ProductNameWithVariant from '../../components/ProductNameWithVariant'

const ROLE_LABELS = {
  Admin: 'Admin',
  User: 'Korisnik',
}

function fmtMoney(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  return `${x.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD`
}

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatAddress(detail) {
  const parts = [detail.street, detail.city, detail.postalCode, detail.country].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
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

export default function AdminUserDetail() {
  const { id } = useParams()
  const [detail, setDetail] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDetail = useCallback(() => {
    setLoading(true)
    setError('')
    return api.get(`/admin/users/${id}`)
      .then(({ data }) => setDetail(data))
      .catch(() => {
        setDetail(null)
        setError('Kupac nije pronađen.')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  useEffect(() => {
    if (!detail?.email) {
      setOrders([])
      return
    }
    setOrdersLoading(true)
    const params = new URLSearchParams({ search: detail.email })
    api.get(`/admin/orders?${params}`)
      .then(({ data }) => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false))
  }, [detail?.email])

  if (loading) {
    return (
      <div className="adm-page">
        <div className="adm-loading">Učitavanje…</div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="adm-page">
        <Link to="/admin/users" className="adm-back-link">← Svi korisnici</Link>
        <p className="adm-empty">{error || 'Kupac nije pronađen.'}</p>
      </div>
    )
  }

  return (
    <div className="adm-page">
      <Link to="/admin/users" className="adm-back-link">← Svi korisnici</Link>

      <div className="adm-users-detail__head">
        <div>
          <h1 className="adm-page-title">{detail.displayName || detail.email}</h1>
          <p className="adm-page-sub">{detail.email}</p>
        </div>
        {detail.isRegistered ? (
          <span className={`adm-user-role adm-user-role--${(detail.role ?? 'user').toLowerCase()}`}>
            {ROLE_LABELS[detail.role] ?? detail.role}
          </span>
        ) : (
          <span className="adm-user-role adm-user-role--guest">Gost (bez naloga)</span>
        )}
      </div>

      <StatSection title="Profil" hint="Kontakt i adresa">
        <StatMetric label="Telefon" value={detail.phoneNumber || '—'} />
        <StatMetric label="Adresa" value={formatAddress(detail)} />
        <StatMetric
          label="Registracija"
          value={detail.isRegistered ? fmtDate(detail.registeredAt) : 'Nema naloga'}
        />
        <StatMetric label="Prvi kontakt" value={fmtDate(detail.firstSeenAt)} />
        <StatMetric label="Poslednja aktivnost" value={fmtDate(detail.lastActivityAt)} />
      </StatSection>

      <StatSection title="Kupovina" hint="Bez otkazanih i vraćenih porudžbina">
        <StatMetric label="Ukupno potrošeno" value={fmtMoney(detail.totalSpent)} highlight />
        <StatMetric label="Porudžbine" value={detail.orderCount} />
        <StatMetric label="Prosečna porudžbina" value={fmtMoney(detail.averageOrderValue)} />
        <StatMetric label="Dostavljeno" value={detail.deliveredOrderCount} />
        <StatMetric label="Otkazano / vraćeno" value={detail.cancelledOrderCount} />
        <StatMetric label="Kuponi iskorišćeni" value={detail.couponsUsed} />
      </StatSection>

      {detail.productPurchases?.length > 0 && (
        <section className="adm-stats-section">
          <div className="adm-stats-section__head">
            <h3 className="adm-stats-section__title">Kupljeni proizvodi</h3>
            <p className="adm-stats-section__hint">Grupisano po proizvodu</p>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--compact">
              <thead>
                <tr>
                  <th>Proizvod</th>
                  <th>Kom</th>
                  <th>Narudžbina</th>
                  <th>Iznos</th>
                </tr>
              </thead>
              <tbody>
                {detail.productPurchases.map((p) => (
                  <tr key={p.productId}>
                    <td>
                      <div className="adm-users-product">
                        {p.imageUrl && (
                          <ApiImage src={p.imageUrl} alt="" className="adm-users-product__img" />
                        )}
                        <ProductNameWithVariant productName={p.productName} variantLabel={p.variantLabel} />
                      </div>
                    </td>
                    <td>{p.totalQuantity}</td>
                    <td>{p.orderCount}×</td>
                    <td>{fmtMoney(p.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {detail.isRegistered && detail.wishlist?.length > 0 && (
        <section className="adm-stats-section">
          <div className="adm-stats-section__head">
            <h3 className="adm-stats-section__title">Wishlist</h3>
            <p className="adm-stats-section__hint">{detail.wishlistCount} proizvoda</p>
          </div>
          <div className="adm-users-wishlist">
            {detail.wishlist.map((w) => (
              <div key={w.productId} className="adm-users-wishlist__item">
                {w.imageUrl && (
                  <ApiImage src={w.imageUrl} alt="" className="adm-users-wishlist__img" />
                )}
                <div>
                  <div className="adm-users-wishlist__name">
                    <ProductNameWithVariant productName={w.productName} variantLabel={w.variantLabel} />
                  </div>
                  <div className="adm-users-wishlist__meta">
                    {fmtMoney(w.price)}
                    {!w.inStock && <span className="adm-users-wishlist__oos">Nema na stanju</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {detail.isRegistered && detail.cart?.length > 0 && (
        <section className="adm-stats-section">
          <div className="adm-stats-section__head">
            <h3 className="adm-stats-section__title">Korpa (trenutno)</h3>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--compact">
              <thead>
                <tr>
                  <th>Proizvod</th>
                  <th>Kom</th>
                  <th>Cena</th>
                </tr>
              </thead>
              <tbody>
                {detail.cart.map((item) => (
                  <tr key={item.productId}>
                    <td>
                      <ProductNameWithVariant productName={item.productName} variantLabel={item.variantLabel} />
                    </td>
                    <td>{item.quantity}</td>
                    <td>{fmtMoney(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(detail.orderCount > 0 || ordersLoading) && (
        <section className="adm-stats-section">
          <div className="adm-stats-section__head">
            <h3 className="adm-stats-section__title">Porudžbine</h3>
          </div>
          <AdminOrderTable
            orders={orders}
            loading={ordersLoading}
            showCustomer={false}
            readOnly
            sortable
          />
        </section>
      )}
    </div>
  )
}
