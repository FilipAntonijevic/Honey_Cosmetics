import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import ApiImage from './ApiImage'
import { publicUrl } from '../lib/assets'
import { useStore } from '../context/StoreContext'
import SiteHeaderPanel from './SiteHeaderPanel'

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
  const { cart, wishlist, user, logout, toast, removeFromCart, cartAddTick } = useStore()
  const [vrste, setVrste] = useState([])
  const [siteLinks, setSiteLinks] = useState(EMPTY_LINKS)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((s, item) => s + Number(item.price) * item.quantity, 0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false)
  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false)
  const [miniCartOpen, setMiniCartOpen] = useState(false)
  const [miniCartClosing, setMiniCartClosing] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 769px)').matches,
  )
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

  const handleLogoClick = (e) => {
    if (location.pathname !== '/') return
    e.preventDefault()
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }

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
    const mq = window.matchMedia('(min-width: 769px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!isDesktop || cartAddTick === 0) return
    setMiniCartClosing(false)
    setMiniCartOpen(true)
  }, [cartAddTick, isDesktop])

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
    const lockScroll = miniCartOpen && !miniCartClosing && !isDesktop
    document.body.classList.toggle('is-mini-cart-open', lockScroll)
    if (!miniCartOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeMiniCart()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('is-mini-cart-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [miniCartOpen, miniCartClosing, isDesktop])

  const [revealVisible, setRevealVisible] = useState(false)
  const lastScrollY = useRef(0)

  const getScrollY = () =>
    Math.max(
      window.scrollY,
      document.documentElement.scrollTop,
      document.body.scrollTop,
    )

  useEffect(() => {
    lastScrollY.current = getScrollY()
    setRevealVisible(false)
    setUserMenuOpen(false)
    setPhoneMenuOpen(false)
    setCategoriesMenuOpen(false)
    document.body.classList.remove('is-mini-cart-open')
  }, [location.pathname])

  useEffect(() => {
    return () => document.body.classList.remove('is-mini-cart-open')
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const y = getScrollY()
      const delta = y - lastScrollY.current
      lastScrollY.current = y

      if (delta < 0) {
        setRevealVisible(true)
      } else if (delta > 0) {
        setRevealVisible(false)
        setUserMenuOpen(false)
        setPhoneMenuOpen(false)
        setCategoriesMenuOpen(false)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const headerPanelProps = {
    vrste,
    siteLinks,
    user,
    wishlist,
    cartCount,
    searchInput,
    onSearchChange: (e) => setSearchInput(e.target.value),
    onSearchSubmit: submitProductSearch,
    onLogoClick: handleLogoClick,
    userMenuOpen,
    onUserMenuToggle: () => setUserMenuOpen((o) => !o),
    onUserMenuClose: () => setUserMenuOpen(false),
    phoneMenuOpen,
    onPhoneMenuToggle: () => setPhoneMenuOpen((o) => !o),
    onPhoneMenuClose: () => setPhoneMenuOpen(false),
    categoriesMenuOpen,
    onCategoriesMenuToggle: () => {
      setCategoriesMenuOpen((o) => !o)
      setUserMenuOpen(false)
      setPhoneMenuOpen(false)
      setMiniCartOpen(false)
    },
    onCategoriesMenuClose: () => setCategoriesMenuOpen(false),
    onMiniCartOpen: () => setMiniCartOpen(true),
    miniCartOpen,
    onLogout: logout,
    phoneHref,
    whatsAppHref,
    viberHref,
    hasAnyPhoneOption,
  }

  return (
    <div className="site-shell">
      <SiteHeaderPanel
        variant="reveal"
        visible={revealVisible}
        attachRefs={revealVisible}
        userMenuRef={userMenuRef}
        phoneMenuRef={phoneMenuRef}
        categoriesMenuRef={categoriesMenuRef}
        {...headerPanelProps}
      />

      <SiteHeaderPanel
        variant="flow"
        attachRefs={!revealVisible}
        userMenuRef={userMenuRef}
        phoneMenuRef={phoneMenuRef}
        categoriesMenuRef={categoriesMenuRef}
        {...headerPanelProps}
      />

      {(miniCartOpen || miniCartClosing) && (
        <>
          {miniCartOpen && !miniCartClosing && !isDesktop && (
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
                        <ApiImage src={item.imageUrl} alt={item.name} className="mini-cart-img" variant="medium" />
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

