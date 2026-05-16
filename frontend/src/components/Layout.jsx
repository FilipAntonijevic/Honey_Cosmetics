import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import ApiImage from './ApiImage'
import { publicUrl } from '../lib/assets'
import ViberIcon from './icons/ViberIcon'
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
  const { cart, wishlist, user, logout, toast, removeFromCart } = useStore()
  const [vrste, setVrste] = useState([])
  const [siteLinks, setSiteLinks] = useState(EMPTY_LINKS)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((s, item) => s + Number(item.price) * item.quantity, 0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false)
  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false)
  const [miniCartOpen, setMiniCartOpen] = useState(false)
  const [miniCartClosing, setMiniCartClosing] = useState(false)
  const miniCartDrawerRef = useRef(null)
  const userMenuRef = useRef(null)
  const phoneMenuRef = useRef(null)
  const categoriesMenuRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    if (location.pathname === '/shop') {
      setSearchInput(new URLSearchParams(location.search).get('search') ?? '')
    }
  }, [location.pathname, location.search])

  const submitProductSearch = (e) => {
    e.preventDefault()
    const q = searchInput.trim()
    if (!q) {
      navigate('/shop')
      return
    }
    navigate(`/shop?search=${encodeURIComponent(q)}`)
  }

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

  useEffect(() => {
    if (!categoriesMenuOpen) return
    const close = (e) => {
      if (categoriesMenuRef.current && !categoriesMenuRef.current.contains(e.target)) {
        setCategoriesMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [categoriesMenuOpen])

  const closeMiniCart = () => {
    if (miniCartClosing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMiniCartOpen(false)
      return
    }
    setMiniCartClosing(true)
  }

  useEffect(() => {
    if (!miniCartClosing) return
    const el = miniCartDrawerRef.current
    if (!el) {
      setMiniCartOpen(false)
      setMiniCartClosing(false)
      return
    }
    let done = false
    const finishClose = () => {
      if (done) return
      done = true
      setMiniCartOpen(false)
      setMiniCartClosing(false)
    }
    const onAnimationEnd = (e) => {
      if (e.target !== el) return
      if (e.animationName === 'mini-cart-slide-out') finishClose()
    }
    el.addEventListener('animationend', onAnimationEnd)
    const t = window.setTimeout(finishClose, 320)
    return () => {
      clearTimeout(t)
      el.removeEventListener('animationend', onAnimationEnd)
    }
  }, [miniCartClosing])

  useEffect(() => {
    document.body.classList.toggle('is-mini-cart-open', miniCartOpen && !miniCartClosing)
    if (!miniCartOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeMiniCart()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('is-mini-cart-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [miniCartOpen])

  const stickyHeaderRef = useRef(null)
  const headerBodyRef = useRef(null)
  const headerHiddenRef = useRef(false)
  const [headerHidden, setHeaderHidden] = useState(false)
  const lastScrollY = useRef(0)
  const scrollDownAccum = useRef(0)

  const getScrollY = () =>
    Math.max(
      window.scrollY,
      document.documentElement.scrollTop,
      document.body.scrollTop,
    )

  const measureHeader = () => {
    const el = headerBodyRef.current
    if (!el) return
    const h = el.offsetHeight
    if (h > 48) document.documentElement.style.setProperty('--site-header-h', `${h}px`)
  }

  useEffect(() => {
    headerHiddenRef.current = headerHidden
    if (!headerHidden) requestAnimationFrame(measureHeader)
  }, [headerHidden])

  useEffect(() => {
    const el = headerBodyRef.current
    if (!el) return
    measureHeader()
    const ro = new ResizeObserver(() => measureHeader())
    ro.observe(el)
    window.addEventListener('resize', measureHeader)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measureHeader)
    }
  }, [])

  useEffect(() => {
    lastScrollY.current = getScrollY()
    scrollDownAccum.current = 0
    headerHiddenRef.current = false
    setHeaderHidden(false)
    setUserMenuOpen(false)
    setPhoneMenuOpen(false)
    setCategoriesMenuOpen(false)
    document.body.classList.remove('is-mini-cart-open')
    requestAnimationFrame(measureHeader)
  }, [location.pathname])

  useEffect(() => {
    return () => document.body.classList.remove('is-mini-cart-open')
  }, [])

  useEffect(() => {
    const isAtBottom = (y) => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight
      return y >= maxScroll - 6
    }

    const onScroll = () => {
      const y = getScrollY()
      const delta = y - lastScrollY.current

      if (y <= 8) {
        if (headerHiddenRef.current) setHeaderHidden(false)
        scrollDownAccum.current = 0
      } else if (delta < 0) {
        scrollDownAccum.current = 0
        if (headerHiddenRef.current && (!isAtBottom(y) || delta <= -12)) {
          setHeaderHidden(false)
        }
      } else if (delta > 0) {
        scrollDownAccum.current += delta
        if (!headerHiddenRef.current && scrollDownAccum.current >= 12 && y > 48) {
          setHeaderHidden(true)
          setUserMenuOpen(false)
          setPhoneMenuOpen(false)
          setCategoriesMenuOpen(false)
          scrollDownAccum.current = 0
        }
      }

      lastScrollY.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="site-shell">
      <header
        ref={stickyHeaderRef}
        className={`sticky-header${headerHidden ? ' is-header-hidden' : ''}`}
      >
        <div ref={headerBodyRef} className="site-header-body">

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

        {/* Main header row — full-width white band, content in .shell */}
        <div className="main-header-band">
        <div className="main-header shell">
          <Link to="/" className="logo" aria-label="Honey Nail Innovations">
            <img src={publicUrl('/logo.png')} alt="Honey Nail Innovations" className="logo-img" />
          </Link>

          <form className="search-wrap" role="search" onSubmit={submitProductSearch}>
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="search"
              type="search"
              name="q"
              placeholder="Pretraži proizvode..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Pretraži proizvode po nazivu"
              enterKeyHint="search"
              autoComplete="off"
            />
          </form>

          <div className="header-toolbar">
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.81 11.81 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
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
                        <ViberIcon size={35.7} />
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

            <div className="mini-cart-wrap">
              <button
                type="button"
                className="icon-btn cart-icon-btn"
                title="Korpa"
                onClick={() => setMiniCartOpen(true)}
                aria-expanded={miniCartOpen}
                aria-haspopup="dialog"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                {cartCount > 0 && <span className="icon-badge">{cartCount}</span>}
              </button>
            </div>
          </div>

            <div className="categories-menu-wrap" ref={categoriesMenuRef}>
              <button
                type="button"
                className="categories-menu-btn"
                aria-label="Vrste proizvoda"
                aria-expanded={categoriesMenuOpen}
                onClick={() => {
                  setCategoriesMenuOpen((o) => !o)
                  setUserMenuOpen(false)
                  setPhoneMenuOpen(false)
                  setMiniCartOpen(false)
                }}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </button>
              {categoriesMenuOpen && (
                <div className="categories-dropdown" role="menu">
                  {vrste.map((cat) => (
                    <Link
                      key={cat}
                      to={`/shop?vrsta=${encodeURIComponent(cat)}`}
                      className="categories-dropdown-item"
                      role="menuitem"
                      onClick={() => setCategoriesMenuOpen(false)}
                    >
                      {cat}
                    </Link>
                  ))}
                  <Link
                    to="/shop?bestsellers=1"
                    className="categories-dropdown-item categories-dropdown-item--muted"
                    role="menuitem"
                    onClick={() => setCategoriesMenuOpen(false)}
                  >
                    Bestsellers
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* Category navbar — samo desktop */}
        <nav className="category-nav category-nav--desktop" aria-label="Vrste proizvoda">
          {vrste.map((cat) => (
            <Link key={cat} to={`/shop?vrsta=${encodeURIComponent(cat)}`} className="cat-link">
              {cat.toUpperCase()}
            </Link>
          ))}
        </nav>
        </div>
      </header>

      {(miniCartOpen || miniCartClosing) && (
        <>
          {miniCartOpen && !miniCartClosing && (
            <button
              type="button"
              className="mini-cart-backdrop"
              aria-label="Zatvori korpu"
              onClick={closeMiniCart}
              tabIndex={-1}
            />
          )}
          <aside
            ref={miniCartDrawerRef}
            className={`mini-cart-drawer${miniCartClosing ? ' mini-cart-drawer--closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Korpa"
          >
            <div className="mini-cart-drawer-top">
              <button
                type="button"
                className="mini-cart-close"
                onClick={closeMiniCart}
                aria-label="Zatvori korpu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="mini-cart-drawer-body">
              {cart.length === 0 ? (
                <p className="mini-cart-empty">Korpa je prazna.</p>
              ) : (
                <ul className="mini-cart-list">
                  {cart.map((item) => (
                    <li key={item.id} className="mini-cart-item">
                      {item.imageUrl && (
                        <ApiImage src={item.imageUrl} alt={item.name} className="mini-cart-img" />
                      )}
                      <div className="mini-cart-info">
                        <span className="mini-cart-name">{item.name}</span>
                        <span className="mini-cart-qty-price">
                          {item.quantity} × {Number(item.price).toLocaleString('sr-RS')} RSD
                        </span>
                      </div>
                      <button
                        type="button"
                        className="mini-cart-remove"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Ukloni ${item.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.length > 0 && (
              <div className="mini-cart-drawer-footer">
                <div className="mini-cart-divider" />
                <p className="mini-cart-total">
                  Ukupno: <strong>{cartTotal.toLocaleString('sr-RS')} RSD</strong>
                </p>
                <div className="mini-cart-divider" />
                <div className="mini-cart-actions">
                  <Link
                    to="/cart"
                    className="mini-cart-btn mini-cart-btn--outline"
                    onClick={() => setMiniCartOpen(false)}
                  >
                    Pregled korpe
                  </Link>
                  <Link
                    to="/checkout"
                    className="mini-cart-btn mini-cart-btn--fill"
                    onClick={() => setMiniCartOpen(false)}
                  >
                    Plaćanje
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </>
      )}

      <main>{children}</main>

      {/* Community banner (image + social row) — shown only on the home page. */}
      {isHome && (
      <section className="community-banner">
        <img
          src={publicUrl('/sections/Samo-za-dugorocne-klijente.png')}
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
              <img src={publicUrl('/logo.png')} alt="Honey Nail Innovations" className="footer-logo-img" />
            </div>
            <p className="footer-copy">
              © {new Date().getFullYear()} Sva prava zadržana.
            </p>
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

          <div className="footer-col footer-col--legal">
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

