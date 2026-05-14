import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function Layout({ children }) {
  const { cart, wishlist, user, logout, toast } = useStore()
  const [vrste, setVrste] = useState([])
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    api
      .get('/product-types')
      .then(({ data }) => setVrste(Array.isArray(data) ? data.map((x) => x.name) : []))
      .catch(() =>
        setVrste(['Gel Lak', 'Baze', 'Builder Gel', 'Top Coat', 'Nega Kože', 'Ostali Proizvodi']),
      )
  }, [])

  useEffect(() => {
    if (!userMenuOpen) return
    const close = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [userMenuOpen])

  return (
    <div className="site-shell">
      <header className="sticky-header">

        {/* Promo ticker */}
        <div className="top-strip">
          <div className="ticker-track">
            {[...Array(4)].map((_, i) => (
              <span key={i} className="ticker-item">
                Besplatna dostava za porudžbinu preko 10.000 RSD
                <span className="ticker-sep">•</span>
                Popust na prvu porudžbinu 10% uz kod FIRSTORDER
                <span className="ticker-sep">•</span>
              </span>
            ))}
          </div>
        </div>

        {/* Small links row */}
        <div className="links-strip">
          <Link to="/about">O nama</Link>
          <Link to="/collaboration">Saradnja</Link>
          <Link to="/delivery-payment">Dostava i plaćanje</Link>
          <Link to="/contact">Kontakt</Link>
          <Link to="/shop?bestsellers=1">Bestsellers</Link>
        </div>

        {/* Main header row */}
        <div className="main-header shell">
          <Link to="/" className="logo">
            <span className="logo-honey">HONEY</span>
            <span className="logo-sub">Nail Innovations</span>
          </Link>

          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search" placeholder="Pretraži proizvode..." />
          </div>

          <div className="icons">
            <Link to="/wishlist" className="icon-btn" title="Wishlist">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {wishlist.length > 0 && <span className="icon-badge">{wishlist.length}</span>}
            </Link>

            {user ? (
              <div className="user-menu-wrap" ref={userMenuRef}>
                <button
                  className="icon-btn"
                  title={user.fullName}
                  onClick={() => setUserMenuOpen((o) => !o)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
                {userMenuOpen && (
                  <div className="user-menu">
                    <div className="user-menu-name">{user.fullName}</div>
                    <Link
                      to="/my-orders"
                      className="user-menu-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      Moje porudžbine
                    </Link>
                    <Link
                      to="/profile"
                      className="user-menu-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Lični podaci
                    </Link>
                    <div className="user-menu-divider" />
                    <button
                      className="user-menu-item user-menu-logout"
                      onClick={() => { setUserMenuOpen(false); logout() }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Odjavi se
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="icon-btn" title="Nalog">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </Link>
            )}

            <a href="tel:+38160000000" className="icon-btn" title="Telefon">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6.03 6.03l.96-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </a>

            <Link to="/cart" className="icon-btn cart-icon-btn" title="Korpa">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              {cartCount > 0 && <span className="icon-badge">{cartCount}</span>}
            </Link>
          </div>
        </div>

        {/* Category navbar */}
        <nav className="category-nav">
          {vrste.map((cat) => (
            <NavLink key={cat} to={`/shop?vrsta=${encodeURIComponent(cat)}`} className="cat-link">
              {cat.toUpperCase()}
            </NavLink>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner shell">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-logo-honey">HONEY</span>
              <span className="footer-logo-sub">Nail Innovations</span>
            </div>
            <p className="footer-copy">© {new Date().getFullYear()} Honey Cosmetics<br />Premium beauty experience.</p>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">O Nama</div>
            <Link to="/about">O Nama</Link>
            <Link to="/collaboration">Saradnja</Link>
            <Link to="/delivery-payment">Dostava i plaćanje</Link>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Informacije</div>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/my-orders">Moj nalog</Link>
            <Link to="/contact">Kontakt</Link>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Legal</div>
            <Link to="/about">Uslovi korišćenja</Link>
            <Link to="/about">Politika privatnosti</Link>
            <Link to="/about">Politika povraćaja i reklamacija</Link>
          </div>
        </div>
      </footer>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

