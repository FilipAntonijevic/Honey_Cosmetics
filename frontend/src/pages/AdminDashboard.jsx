import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Dashboard</h1>
        <p className="adm-page-sub">Pregled stanja prodavnice</p>
      </div>

      {loading ? (
        <div className="adm-loading">Učitavanje...</div>
      ) : !stats ? (
        <div className="adm-empty">Nije moguće učitati dashboard.</div>
      ) : (
        <>
          <div className="adm-stats-grid">
            <div className="adm-stat-card">
              <div className="adm-stat-value">{stats.totalOrders}</div>
              <div className="adm-stat-label">Ukupno porudžbina</div>
            </div>
            <div className="adm-stat-card adm-stat-card--warn">
              <div className="adm-stat-value">{stats.pendingOrders}</div>
              <div className="adm-stat-label">Na čekanju</div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-value">{stats.totalProducts}</div>
              <div className="adm-stat-label">Proizvodi</div>
            </div>
            <div className="adm-stat-card adm-stat-card--green">
              <div className="adm-stat-value">{stats.totalRevenue.toLocaleString('sr-RS')} RSD</div>
              <div className="adm-stat-label">Ukupan prihod</div>
            </div>
          </div>

          <div className="adm-quick-links">
            <Link to="/admin/orders" className="adm-quick-btn">Upravljaj porudžbinama →</Link>
            <Link to="/admin/products" className="adm-quick-btn">Upravljaj proizvodima →</Link>
          </div>
        </>
      )}
    </div>
  )
}

