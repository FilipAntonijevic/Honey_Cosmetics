import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: '⬛', exact: true },
  { to: '/admin/orders', label: 'Porudžbine', icon: '📦' },
  { to: '/admin/products', label: 'Proizvodi', icon: '🧴' },
  { to: '/admin/categories', label: 'Kategorije', icon: '📁' },
  { to: '/admin/bestsellers', label: 'Bestsellers', icon: '★' },
  { to: '/admin/coupons', label: 'Kuponi', icon: '🎫' },
]

export default function AdminLayout({ children }) {
  const { logout, user, toast } = useStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-logo">
          <span className="adm-logo-text">HONEY</span>
          <span className="adm-logo-sub">Admin Panel</span>
        </div>

        <nav className="adm-nav">
          {navItems.map(({ to, label, icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `adm-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="adm-nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-user-info">
            <div className="adm-user-name">{user?.fullName ?? 'Admin'}</div>
            <div className="adm-user-email">{user?.email ?? ''}</div>
          </div>
          <button className="adm-logout-btn" onClick={handleLogout}>
            ⏏ Odjava
          </button>
        </div>
      </aside>

      <div className="adm-content">
        <main className="adm-main">{children}</main>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
