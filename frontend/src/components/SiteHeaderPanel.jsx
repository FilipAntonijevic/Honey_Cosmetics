import { Link } from 'react-router-dom'
import { publicUrl } from '../lib/assets'
import ViberIcon from './icons/ViberIcon'

/**
 * @param {'flow' | 'reveal'} variant
 * flow — ceo glavni header u toku stranice (normalan skrol)
 * reveal — ceo gornji header (ticker, linkovi, logo, kategorije), fiksiran, samo skrol nagore / nadole
 */
export default function SiteHeaderPanel({
  variant,
  bodyRef,
  attachRefs,
  userMenuRef,
  phoneMenuRef,
  categoriesMenuRef,
  visible = true,
  vrste,
  siteLinks,
  user,
  wishlist,
  cartCount,
  searchInput,
  onSearchChange,
  onSearchSubmit,
  onLogoClick,
  userMenuOpen,
  onUserMenuToggle,
  onUserMenuClose,
  phoneMenuOpen,
  onPhoneMenuToggle,
  onPhoneMenuClose,
  categoriesMenuOpen,
  onCategoriesMenuToggle,
  onCategoriesMenuClose,
  onMiniCartOpen,
  miniCartOpen,
  onLogout,
  phoneHref,
  whatsAppHref,
  viberHref,
  hasAnyPhoneOption,
}) {
  const isRevealOverlay = variant === 'reveal'
  const inactive = isRevealOverlay && !visible
  const tabOff = inactive ? -1 : undefined

  const headerClass = [
    'site-header-panel',
    `site-header-panel--${variant}`,
    isRevealOverlay && (visible ? 'is-visible' : 'is-hidden'),
  ]
    .filter(Boolean)
    .join(' ')

  const refProps = (r) => (attachRefs && r ? { ref: r } : {})

  const topStrip = (
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
  )

  const linksStrip = (
    <div className="links-strip">
      <Link to="/about" tabIndex={tabOff}>O nama</Link>
      <Link to="/collaboration" tabIndex={tabOff}>Saradnja</Link>
      <Link to="/delivery-payment" tabIndex={tabOff}>Dostava i plaćanje</Link>
      <Link to="/contact" tabIndex={tabOff}>Kontakt</Link>
      <Link to="/shop?bestsellers=1" tabIndex={tabOff}>Bestsellers</Link>
    </div>
  )

  const mainBand = (
    <div className="main-header-band">
      <div className="main-header shell">
        <Link
          to="/"
          className="logo"
          aria-label="Honey Nail Innovations"
          onClick={onLogoClick}
          tabIndex={tabOff}
        >
          <img src={publicUrl('/logo.png')} alt="Honey Nail Innovations" className="logo-img" />
        </Link>

        <form className="search-wrap" role="search" onSubmit={onSearchSubmit}>
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="search"
            type="search"
            name={variant === 'flow' ? 'q' : 'q-reveal'}
            placeholder="Pretraži proizvode..."
            value={searchInput}
            onChange={onSearchChange}
            aria-label="Pretraži proizvode po nazivu"
            enterKeyHint="search"
            autoComplete="off"
            tabIndex={tabOff}
          />
        </form>

        <div className="header-toolbar">
          <div className="icons">
            <Link to="/wishlist" className="icon-btn" title="Wishlist" tabIndex={tabOff}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {wishlist.length > 0 && <span className="icon-badge">{wishlist.length}</span>}
            </Link>

            {user ? (
              <div className="user-menu-wrap" {...refProps(userMenuRef)}>
                <button
                  type="button"
                  className="icon-btn"
                  title={user.fullName}
                  onClick={onUserMenuToggle}
                  tabIndex={tabOff}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
                {userMenuOpen && attachRefs && (
                  <div className="user-menu">
                    <div className="user-menu-name">{user.fullName}</div>
                    <Link to="/my-orders" className="user-menu-item" onClick={onUserMenuClose}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      Moje porudžbine
                    </Link>
                    <Link to="/profile" className="user-menu-item" onClick={onUserMenuClose}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Lični podaci
                    </Link>
                    <div className="user-menu-divider" />
                    <button type="button" className="user-menu-item user-menu-logout" onClick={() => { onUserMenuClose(); onLogout() }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Odjavi se
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="icon-btn" title="Nalog" tabIndex={tabOff}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </Link>
            )}

            <div className="phone-menu-wrap" {...refProps(phoneMenuRef)}>
              <button
                type="button"
                className="icon-btn"
                title="Telefon"
                aria-label="Telefon"
                onClick={onPhoneMenuToggle}
                tabIndex={tabOff}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6.03 6.03l.96-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </button>
              {phoneMenuOpen && attachRefs && (
                <div className="phone-menu" role="menu">
                  {phoneHref ? (
                    <a href={phoneHref} className="phone-menu-item" onClick={onPhoneMenuClose} role="menuitem">
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
                    <a href={whatsAppHref} target="_blank" rel="noreferrer" className="phone-menu-item" onClick={onPhoneMenuClose} role="menuitem">
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
                    <a href={viberHref} className="phone-menu-item" onClick={onPhoneMenuClose} role="menuitem">
                      <span className="phone-menu-icon phone-menu-icon--viber">
                        <ViberIcon size={39} />
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
                onClick={onMiniCartOpen}
                aria-expanded={miniCartOpen}
                aria-haspopup="dialog"
                tabIndex={tabOff}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                {cartCount > 0 && <span className="icon-badge">{cartCount}</span>}
              </button>
            </div>
          </div>

          <div className="categories-menu-wrap" {...refProps(categoriesMenuRef)}>
            <button
              type="button"
              className="categories-menu-btn"
              aria-label="Vrste proizvoda"
              aria-expanded={categoriesMenuOpen}
              onClick={onCategoriesMenuToggle}
              tabIndex={tabOff}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
            {categoriesMenuOpen && attachRefs && (
              <div className="categories-dropdown" role="menu">
                {vrste.map((cat) => (
                  <Link
                    key={cat}
                    to={`/shop?type=${encodeURIComponent(cat)}`}
                    className="categories-dropdown-item"
                    role="menuitem"
                    onClick={onCategoriesMenuClose}
                  >
                    {cat}
                  </Link>
                ))}
                <Link
                  to="/shop?bestsellers=1"
                  className="categories-dropdown-item categories-dropdown-item--muted"
                  role="menuitem"
                  onClick={onCategoriesMenuClose}
                >
                  Bestsellers
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const categoryNav = (
    <nav className="category-nav category-nav--desktop" aria-label="Vrste proizvoda">
      {vrste.map((cat) => (
        <Link key={cat} to={`/shop?type=${encodeURIComponent(cat)}`} className="cat-link" tabIndex={tabOff}>
          {cat.toUpperCase()}
        </Link>
      ))}
    </nav>
  )

  const showTop = variant === 'flow' || isRevealOverlay
  const showCore = variant === 'flow' || isRevealOverlay

  return (
    <header
      className={headerClass}
      aria-hidden={inactive}
    >
      <div ref={bodyRef} className="site-header-body">
        {showTop && (
          <>
            {topStrip}
            {linksStrip}
          </>
        )}
        {showCore && (
          <>
            {mainBand}
            {categoryNav}
          </>
        )}
      </div>
    </header>
  )
}
