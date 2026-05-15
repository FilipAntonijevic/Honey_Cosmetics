import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import { apiImageUrl, publicUrl } from '../lib/assets'

const HERO_IMAGES = [
  publicUrl('/hero/POCETNA.jpg'),
  publicUrl('/hero/POCETNA2.png'),
  publicUrl('/hero/POCETNA3.jpg'),
  publicUrl('/hero/POCETNA-4.jpg'),
  publicUrl('/hero/POCETNA5.png'),
]

const HERO_INTERVAL_MS = 6000
const PRODUCT_INTERVAL_MS = 4500

/**
 * Endless hero carousel.
 * Renders [lastClone, ...images, firstClone] and silently snaps from the
 * clones back to the real slides on transitionend, so the carousel can move
 * forward forever without ever "rewinding" visually.
 */
function HeroCarousel({ images, interval = HERO_INTERVAL_MS }) {
  const N = images.length
  const slides = useMemo(
    () => (N > 0 ? [images[N - 1], ...images, images[0]] : []),
    [images, N],
  )

  const [index, setIndex] = useState(1)
  const [withTransition, setWithTransition] = useState(true)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const next = useCallback(() => {
    setWithTransition(true)
    setIndex((i) => i + 1)
  }, [])
  const prev = useCallback(() => {
    setWithTransition(true)
    setIndex((i) => i - 1)
  }, [])
  const goTo = useCallback((real) => {
    setWithTransition(true)
    setIndex(real + 1)
  }, [])

  // Auto-rotate
  useEffect(() => {
    if (paused || N === 0) return
    const id = setTimeout(next, interval)
    return () => clearTimeout(id)
  }, [index, paused, interval, N, next])

  // Snap clones back to the real slide without animation
  const onTransitionEnd = () => {
    if (index === slides.length - 1) {
      setWithTransition(false)
      setIndex(1)
    } else if (index === 0) {
      setWithTransition(false)
      setIndex(slides.length - 2)
    }
  }

  // After a silent snap, re-enable transitions for the next user action
  useEffect(() => {
    if (withTransition) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setWithTransition(true))
    })
    return () => cancelAnimationFrame(id)
  }, [withTransition])

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev()
      else next()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') prev()
    else if (e.key === 'ArrowRight') next()
  }

  if (N === 0) return null

  const realIndex = (((index - 1) % N) + N) % N

  return (
    <div
      className="hero-carousel"
      role="region"
      aria-roledescription="Karusel"
      aria-label="Početna galerija"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
    >
      <div
        className="hero-track"
        style={{
          transform: `translateX(-${index * 100}%)`,
          transition: withTransition
            ? 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'none',
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {slides.map((src, i) => (
          <div className="hero-slide" key={`${src}-${i}`} aria-hidden={i !== index}>
            <img src={src} alt="" loading={i === 1 ? 'eager' : 'lazy'} draggable="false" />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="hero-arrow left"
        onClick={prev}
        aria-label="Prethodna slika"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        className="hero-arrow right"
        onClick={next}
        aria-label="Sledeća slika"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="hero-dots" role="tablist">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === realIndex}
            aria-label={`Slika ${i + 1}`}
            className={`hero-dot${i === realIndex ? ' active' : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Endless product strip (isto kao hero).
 * Tri kopije liste; pomeramo translateX i na transitionend tiho skačemo
 * nazad u srednju kopiju — bez vidljivog povratka na početak.
 */
function ProductCarousel({ products }) {
  const trackRef = useRef(null)
  const singleWidthRef = useRef(0)
  const offsetRef = useRef(0)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const [offset, setOffset] = useState(0)
  const [withTransition, setWithTransition] = useState(true)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const { addToCart, toggleWishlist } = useStore()

  const itemsCount = products.length
  const loop = useMemo(() => {
    if (itemsCount === 0) return []
    return [...products, ...products, ...products]
  }, [products, itemsCount])

  const cardStep = useCallback(() => {
    const track = trackRef.current
    if (!track) return 280
    const card = track.querySelector('.product-card')
    if (!card) return 280
    const gap = parseFloat(getComputedStyle(track).gap || '16')
    return card.offsetWidth + gap
  }, [])

  const measureAndCenter = useCallback(() => {
    const track = trackRef.current
    if (!track || itemsCount === 0) return
    const sw = track.scrollWidth / 3
    if (sw <= 0) {
      requestAnimationFrame(measureAndCenter)
      return
    }
    singleWidthRef.current = sw
    setWithTransition(false)
    setOffset(sw)
    offsetRef.current = sw
    setReady(true)
  }, [itemsCount])

  useEffect(() => {
    setReady(false)
    measureAndCenter()
    const track = trackRef.current
    if (!track) return undefined
    const ro = new ResizeObserver(() => measureAndCenter())
    ro.observe(track)
    window.addEventListener('resize', measureAndCenter)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measureAndCenter)
    }
  }, [measureAndCenter, products])

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  useEffect(() => {
    if (withTransition) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setWithTransition(true))
    })
    return () => cancelAnimationFrame(id)
  }, [withTransition])

  const shift = useCallback((direction) => {
    setWithTransition(true)
    setOffset((o) => o + direction * cardStep())
  }, [cardStep])

  const onTransitionEnd = (e) => {
    if (e.target !== trackRef.current || e.propertyName !== 'transform') return
    const sw = singleWidthRef.current
    if (!sw) return
    const o = offsetRef.current
    if (o >= 2 * sw - 1) {
      setWithTransition(false)
      setOffset(o - sw)
    } else if (o < sw) {
      setWithTransition(false)
      setOffset(o + sw)
    }
  }

  useEffect(() => {
    if (paused || !ready || itemsCount === 0) return
    const id = setTimeout(() => shift(1), PRODUCT_INTERVAL_MS)
    return () => clearTimeout(id)
  }, [offset, paused, ready, itemsCount, shift])

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) shift(-1)
      else shift(1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  if (!itemsCount) return null

  return (
    <div
      className="pop-strip-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        className="pop-arrow left"
        onClick={() => shift(-1)}
        aria-label="Pomeri levo"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="pop-strip-viewport" aria-hidden={!ready}>
        <div
          ref={trackRef}
          className="pop-strip"
          style={{
            transform: `translateX(-${offset}px)`,
            transition: withTransition
              ? 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
            visibility: ready ? 'visible' : 'hidden',
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {loop.map((p, i) => (
            <article key={`${p.id}-${i}`} className="product-card">
              <img src={apiImageUrl(p.imageUrl)} alt={p.name} loading="lazy" />
              <div className="product-card-body">
                <h3>
                  <Link to={`/products/${p.id}`}>{p.name}</Link>
                </h3>
                <p>{[p.productType, p.category].filter(Boolean).join(' · ')}</p>
                <strong>{Number(p.price).toLocaleString('sr-RS')} RSD</strong>
                <div className="card-actions">
                  <button type="button" onClick={() => addToCart(p)}>Dodaj u korpu</button>
                  <button type="button" className="ghost" onClick={() => toggleWishlist(p)}>
                    Wishlist
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="pop-arrow right"
        onClick={() => shift(1)}
        aria-label="Pomeri desno"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}


export default function Home() {
  const [bestsellers, setBestsellers] = useState([])

  useEffect(() => {
    let cancelled = false
    api
      .get('/products/bestsellers')
      .then(({ data }) => {
        if (!cancelled) setBestsellers(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setBestsellers([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <HeroCarousel images={HERO_IMAGES} />

      {bestsellers.length > 0 && (
        <section className="section-gap pop-section">
          <div className="shell pop-section-head">
            <div className="pop-head">
              <h2 className="pop-title">Popularni proizvodi</h2>
              <Link to="/shop?bestsellers=1" className="pop-head-link">Vidi sve →</Link>
            </div>
          </div>
          <ProductCarousel products={bestsellers} />
        </section>
      )}

      <section className="feature-section feature-section--image-left">
        <div className="feature-section-img">
          <img src={publicUrl('/sections/Hema.jpg')} alt="HEMA & TPO Free" loading="lazy" />
          <span className="feature-section-img-badge">HEMA&amp;TPO FREE</span>
        </div>
        <div className="feature-section-body">
          <h2 className="feature-section-title">POTPUNO BEZBEDNO</h2>
          <p className="feature-section-text">
            Svi naši gelovi su <strong>HEMA i TPO free</strong> – bezbedni za prirodne nokte,
            nežni prema ploči nokta i izuzetno dugotrajni.
          </p>
          <Link to="/about" className="feature-section-btn">Više o tome</Link>
        </div>
      </section>

      <section className="feature-section feature-section--image-right">
        <div className="feature-section-body">
          <h2 className="feature-section-title">HONEY HARD GEL</h2>
          <p className="feature-section-text">
            <strong>Hard Gel</strong> je višenamenski gel koji se može koristiti kao builder gel
            ili kao gel za modelovanje noktiju.
          </p>
          <p className="feature-section-text">
            <strong>Ekološki</strong> je prihvatljiv i pažljivo razvijen kako bi bio bezbedan za upotrebu.
          </p>
          <Link to="/shop?vrsta=Baze" className="feature-section-btn">O proizvodu</Link>
        </div>
        <div className="feature-section-img">
          <img src={publicUrl('/sections/Hard_gel.png')} alt="Honey Hard Gel" loading="lazy" />
        </div>
      </section>

      <section className="feature-section feature-section--image-left">
        <div className="feature-section-img">
          <img src={publicUrl('/sections/Color_gel.jpg')} alt="Color Gel Polish" loading="lazy" />
        </div>
        <div className="feature-section-body">
          <h2 className="feature-section-title">COLOR GEL POLISHES</h2>
          <p className="feature-section-text">
            Naše <strong>HEMA &amp; TPO</strong> free gel boje su formulisane bez štetnih sastojaka,
            pružajući maksimalnu sigurnost za prirodnu noktatnu ploču i kožu.
          </p>
          <p className="feature-section-text">
            U ponudi imamo preko 100 pažljivo razvijenih nijansi – od klasičnih nude tonova do
            intenzivnih trend boja – sve visokog kvaliteta i bezbedne za profesionalnu upotrebu.
          </p>
          <Link to="/shop" className="feature-section-btn">Svi proizvodi</Link>
        </div>
      </section>
    </>
  )
}
