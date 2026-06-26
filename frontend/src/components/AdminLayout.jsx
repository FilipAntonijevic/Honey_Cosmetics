import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { logoUrl } from '../lib/assets'
import Toast from './Toast'

const MOBILE_ADM_MQ = '(max-width: 768px)'

const navItems = [
  { to: '/admin/orders', label: 'Porudžbine', icon: '📦' },
  { to: '/admin/products', label: 'Proizvodi', icon: '🧴' },
  { to: '/admin/finance', label: 'Prihodi', icon: '💰' },
  { to: '/admin/users', label: 'Korisnici', icon: '👤' },
  { to: '/admin/categories', label: 'Kategorije', icon: '📁' },
  { to: '/admin/homescreen', label: 'Homescreen', icon: '🏠' },
  { to: '/admin/site-popup', label: 'Popup', icon: '💬' },
  { to: '/admin/coupons', label: 'Kuponi', icon: '🎫' },
  { to: '/admin/links', label: 'Linkovi', icon: '🔗' },
]

export default function AdminLayout() {
  const { logout, user, toast } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const sidebarRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarClosing, setSidebarClosing] = useState(false)

  const closeSidebar = () => {
    if (sidebarClosing || !sidebarOpen) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSidebarOpen(false)
      return
    }
    setSidebarClosing(true)
  }

  const openSidebar = () => {
    setSidebarClosing(false)
    setSidebarOpen(true)
  }

  const toggleSidebar = () => {
    if (sidebarOpen) closeSidebar()
    else openSidebar()
  }

  useEffect(() => {
    if (!sidebarClosing) return
    const el = sidebarRef.current
    if (!el) {
      setSidebarOpen(false)
      setSidebarClosing(false)
      return
    }
    let done = false
    const finishClose = () => {
      if (done) return
      done = true
      setSidebarOpen(false)
      setSidebarClosing(false)
    }
    const onTransitionEnd = (e) => {
      if (e.target !== el || e.propertyName !== 'transform') return
      finishClose()
    }
    el.addEventListener('transitionend', onTransitionEnd)
    const t = window.setTimeout(finishClose, 320)
    return () => {
      clearTimeout(t)
      el.removeEventListener('transitionend', onTransitionEnd)
    }
  }, [sidebarClosing])

  useEffect(() => {
    setSidebarOpen(false)
    setSidebarClosing(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('is-adm-sidebar-open', sidebarOpen)
    if (!sidebarOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeSidebar()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('is-adm-sidebar-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [sidebarOpen])

  const closeSidebarOnNav = () => {
    if (window.matchMedia(MOBILE_ADM_MQ).matches) closeSidebar()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="adm-shell">
      <div
        ref={sidebarRef}
        className={`adm-sidebar-rail${sidebarOpen ? ' is-open' : ''}${sidebarClosing ? ' is-closing' : ''}`}
      >
      <aside className="adm-sidebar">
        <div className="adm-logo">
          <img src={logoUrl()} alt="Honey Nail Innovations" className="adm-logo-img" />
          <span className="adm-logo-sub">Admin Panel</span>
        </div>

        <nav className="adm-nav">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `adm-nav-item${isActive ? ' active' : ''}`}
              onClick={closeSidebarOnNav}
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
          <button type="button" className="adm-logout-btn" onClick={handleLogout}>
            ⏏ Odjava
          </button>
        </div>
      </aside>

        <button
          type="button"
          className="adm-sidebar-tab"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Zatvori meni' : 'Otvori meni'}
          aria-expanded={sidebarOpen}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {sidebarOpen ? (
              <polyline points="15 18 9 12 15 6" />
            ) : (
              <polyline points="9 18 15 12 9 6" />
            )}
          </svg>
        </button>
      </div>

      <div className="adm-content">
        <main className="adm-main"><Outlet /></main>
      </div>

      <Toast message={toast} />
    </div>
  )
}
