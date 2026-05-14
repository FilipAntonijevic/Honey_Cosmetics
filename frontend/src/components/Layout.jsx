import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

const EMPTY_LINKS = {
  instagramUrl: '',
  tikTokUrl: '',
  emailAddress: '',
  phoneNumber: '',
  whatsAppNumber: '',
  viberNumber: '',
}

const cleanDigits = (v) => (v || '').replace(/[^+\d]/g, '')

/**
 * Build a deep link for WhatsApp / Viber given an admin-entered value.
 * Accepts either a phone number or an already-built URL and normalizes.
 */
const buildWhatsAppHref = (raw) => {
  const v = (raw || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v) || /^whatsapp:\/\//i.test(v)) return v
  const digits = cleanDigits(v).replace(/^\+/, '')
  return digits ? `https://wa.me/${digits}` : ''
}
const buildViberHref = (raw) => {
  const v = (raw || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v) || /^viber:\/\//i.test(v)) return v
  const withPlus = cleanDigits(v)
  // viber://chat expects %2B encoded leading +
  return withPlus ? `viber://chat?number=${encodeURIComponent(withPlus)}` : ''
}

export default function Layout({ children }) {
  const { cart, wishlist, user, logout, toast } = useStore()
  const [vrste, setVrste] = useState([])
  const [siteLinks, setSiteLinks] = useState(EMPTY_LINKS)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const phoneMenuRef = useRef(null)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    api
      .get('/product-types')
      .then(({ data }) => setVrste(Array.isArray(data) ? data.map((x) => x.name) : []))
      .catch(() =>
        setVrste(['Gel Lak', 'Baze', 'Builder Gel', 'Top Coat', 'Nega Kože', 'Ostali Proizvodi']),
      )
  }, [])

  useEffect(() => {
    api
      .get('/site/links')
      .then(({ data }) => setSiteLinks({
        instagramUrl: data?.instagramUrl ?? '',
        tikTokUrl: data?.tikTokUrl ?? '',
        emailAddress: data?.emailAddress ?? '',
        phoneNumber: data?.phoneNumber ?? '',
        whatsAppNumber: data?.whatsAppNumber ?? '',
        viberNumber: data?.viberNumber ?? '',
      }))
      .catch(() => setSiteLinks(EMPTY_LINKS))
  }, [])

  const mailHref = siteLinks.emailAddress
    ? (siteLinks.emailAddress.includes('@') ? `mailto:${siteLinks.emailAddress}` : siteLinks.emailAddress)
    : ''
  const phoneHref = siteLinks.phoneNumber ? `tel:${cleanDigits(siteLinks.phoneNumber)}` : ''
  const whatsAppHref = buildWhatsAppHref(siteLinks.whatsAppNumber)
  const viberHref = buildViberHref(siteLinks.viberNumber)
  const hasAnyPhoneOption = phoneHref || whatsAppHref || viberHref

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

  useEffect(() => {
    if (!phoneMenuOpen) return
    const close = (e) => {
      if (phoneMenuRef.current && !phoneMenuRef.current.contains(e.target)) {
        setPhoneMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [phoneMenuOpen])

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
          <Link to="/" className="logo" aria-label="Honey Nail Innovations">
            <img src="/logo.png" alt="Honey Nail Innovations" className="logo-img" />
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

            <div className="phone-menu-wrap" ref={phoneMenuRef}>
              <button
                type="button"
                className="icon-btn"
                title="Telefon"
                aria-label="Telefon"
                onClick={() => setPhoneMenuOpen((o) => !o)}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6.03 6.03l.96-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </button>
              {phoneMenuOpen && (
                <div className="phone-menu" role="menu">
                  {phoneHref ? (
                    <a
                      href={phoneHref}
                      className="phone-menu-item"
                      onClick={() => setPhoneMenuOpen(false)}
                      role="menuitem"
                    >
                      <span className="phone-menu-icon phone-menu-icon--call">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6.03 6.03l.96-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </span>
                      <span className="phone-menu-text">
                        <span className="phone-menu-label">Telefon</span>
                        <span className="phone-menu-value">{siteLinks.phoneNumber}</span>
                      </span>
                    </a>
                  ) : null}

                  {whatsAppHref ? (
                    <a
                      href={whatsAppHref}
                      target="_blank"
                      rel="noreferrer"
                      className="phone-menu-item"
                      onClick={() => setPhoneMenuOpen(false)}
                      role="menuitem"
                    >
                      <span className="phone-menu-icon phone-menu-icon--whatsapp">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.81 11.81 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                      </span>
                      <span className="phone-menu-text">
                        <span className="phone-menu-label">WhatsApp</span>
                        <span className="phone-menu-value">{siteLinks.whatsAppNumber}</span>
                      </span>
                    </a>
                  ) : null}

                  {viberHref ? (
                    <a
                      href={viberHref}
                      className="phone-menu-item"
                      onClick={() => setPhoneMenuOpen(false)}
                      role="menuitem"
                    >
                      <span className="phone-menu-icon phone-menu-icon--viber">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.4.002C9.473.029 5.351.21 3.108 2.27 1.474 3.91.901 6.34.838 9.34c-.06 3 .06 7.54 4.467 8.78v1.89s-.03.76.47.92c.62.18.96-.4 1.55-1.03l1.13-1.27c2.81.24 5.04-.31 5.29-.39 1.04-.21 7.03-1.59 7.5-7.36.49-5.97-1.65-9.7-4.66-11.32-.91-.5-3.55-1.66-7.35-1.55h-.07l.07-.01-.83.02zm.04 2.13c3.22-.05 5.83.32 6.42.6.94.45 2.45 1.5 2.93 5.5.43 3.59-.74 6.22-3.05 7.27-.32.14-2.31.66-4.85.42 0 0-.27-.26-.39-.39l-.07-.07c-.45-.46-1.4-1.41-2.45-2.07-.34-.21-.45-.31-1.07-.62-.59-.29-.74-.65-.84-.85-.21-.43-.53-1.51-.53-2.78.07-2.13.49-3.55 2.13-4.6 1.4-.9 3.18-.8 4.51-.05.51.29.81.55.84.59zm-.13 1.39c-.04-.01-.07-.02-.11-.03-.21-.07-.42-.13-.65-.12-.31.03-.55.21-.61.5-.04.21.04.43.21.6.31.31.65.6.96.91.04.04.07.08.07.13 0 .27-.07.55-.27.79-.43.49-1.4 1.46-1.46 1.52-.21.21-.27.43-.27.65v.13c0 .27.21.55.43.77.21.21.4.27.55.4.21.13.27.21.4.4l.04.04c.27.27.65.65 1.07 1.07.27.27.55.55.91.79.43.27.86.49 1.36.66.27.13.55.21.86.21.43 0 .77-.13 1.07-.43.21-.21.43-.43.61-.7.21-.4.21-.86 0-1.17-.13-.21-.43-.4-.65-.55-.13-.07-.21-.13-.27-.13-.13-.07-.27-.13-.4-.21-.27-.13-.55-.21-.79-.27-.27-.04-.55.04-.79.31-.13.13-.27.27-.43.4-.04.04-.13.07-.21.07-.13 0-.27-.07-.4-.13-.27-.13-.49-.31-.7-.49-.4-.4-.79-.79-1.16-1.24-.13-.13-.21-.31-.27-.49-.04-.13.04-.27.13-.34.13-.13.27-.27.4-.4.07-.07.13-.13.13-.27.04-.21.04-.43.04-.65 0-.13-.04-.27-.07-.4-.07-.27-.21-.55-.34-.79-.13-.27-.27-.55-.34-.86-.07-.34-.27-.61-.55-.79-.04-.04-.13-.07-.21-.13zm1.42.86c.32.04.59.18.85.39.27.21.46.51.55.84.07.21.07.43.07.65.04.18.04.4-.07.55-.07.13-.27.07-.34-.04-.04-.13 0-.27 0-.4 0-.31-.04-.65-.27-.91-.21-.27-.49-.43-.79-.43-.13 0-.27.07-.4-.04-.07-.13-.04-.34.13-.4.13-.07.27-.07.4-.07.04 0 .07-.01.11-.02h.13c-.04 0-.13 0-.17.02zm.08 1.49c.25-.03.5.1.66.31.18.21.21.49.21.77 0 .13 0 .27-.13.34-.13.07-.27 0-.27-.13-.04-.13 0-.27-.04-.4-.04-.21-.18-.39-.4-.43-.13-.04-.27 0-.27-.13-.04-.13.07-.21.13-.27.04-.04.08-.05.11-.06z"/></svg>
                      </span>
                      <span className="phone-menu-text">
                        <span className="phone-menu-label">Viber</span>
                        <span className="phone-menu-value">{siteLinks.viberNumber}</span>
                      </span>
                    </a>
                  ) : null}

                  {!hasAnyPhoneOption && (
                    <div className="phone-menu-empty">Brojevi nisu podešeni.</div>
                  )}
                </div>
              )}
            </div>

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

      {/* Community banner (image + social row) — shown only on the home page. */}
      {isHome && (
      <section className="community-banner">
        <img
          src="/sections/Samo-za-dugorocne-klijente.png"
          alt="Pridružite se našoj zajednici – Bestsellers, Novi proizvodi, Popusti, Specijalne ponude"
          className="community-banner-img"
          loading="lazy"
          draggable="false"
        />
        <div className="community-banner-socials">
          {siteLinks.instagramUrl ? (
            <a
              href={siteLinks.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="community-social"
              aria-label="Instagram"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          ) : (
            <span className="community-social is-disabled" aria-label="Instagram (link nije podešen)" aria-disabled="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </span>
          )}

          {siteLinks.tikTokUrl ? (
            <a
              href={siteLinks.tikTokUrl}
              target="_blank"
              rel="noreferrer"
              className="community-social"
              aria-label="TikTok"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V9.34a8.16 8.16 0 0 0 4.77 1.52V7.4a4.85 4.85 0 0 1-1.84-.71z" />
              </svg>
            </a>
          ) : (
            <span className="community-social is-disabled" aria-label="TikTok (link nije podešen)" aria-disabled="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V9.34a8.16 8.16 0 0 0 4.77 1.52V7.4a4.85 4.85 0 0 1-1.84-.71z" />
              </svg>
            </span>
          )}

          {mailHref ? (
            <a href={mailHref} className="community-social" aria-label="Email">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </a>
          ) : (
            <span className="community-social is-disabled" aria-label="Email (nije podešen)" aria-disabled="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
          )}
        </div>
      </section>
      )}

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner shell">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo.png" alt="Honey Nail Innovations" className="footer-logo-img" />
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
            <Link to="/terms">Uslovi korišćenja</Link>
            <Link to="/privacy">Politika privatnosti</Link>
            <Link to="/returns">Politika povraćaja i reklamacija</Link>
          </div>
        </div>
      </footer>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

