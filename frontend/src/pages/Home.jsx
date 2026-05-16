import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import { publicUrl } from '../lib/assets'
import { attachResolvedImageSrc, preloadProductImagesAwait } from '../lib/imagePreload'

const POP_VISIBLE_MAX = 5

const HERO_IMAGES = [
  publicUrl('/hero/POCETNA.jpg'),
  publicUrl('/hero/POCETNA2.png'),
  publicUrl('/hero/POCETNA3.jpg'),
  publicUrl('/hero/POCETNA-4.jpg'),
  publicUrl('/hero/POCETNA5.png'),
]

const HERO_INTERVAL_MS = 6000
const PRODUCT_INTERVAL_MS = 4500
const TRANSITION_FALLBACK_MS = 900

function useTabVisible() {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

/**
 * Endless hero carousel — [lastClone, ...images, firstClone], snap on clone slides.
 */
function HeroCarousel({ images, interval = HERO_INTERVAL_MS }) {
  const N = images.length
  const slides = useMemo(
    () => (N > 0 ? [images[N - 1], ...images, images[0]] : []),
    [images, N],
  )
  const lastIndex = slides.length - 1

  const tabVisible = useTabVisible()
  const trackRef = useRef(null)
  const busyRef = useRef(false)
  const fallbackRef = useRef(null)

  const [index, setIndex] = useState(1)
  const [withTransition, setWithTransition] = useState(true)
  const [paused, setPaused] = useState(false)
  const [autoScrollKey, setAutoScrollKey] = useState(0)
  const indexRef = useRef(1)
  indexRef.current = index

  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const resetAutoScroll = useCallback(() => setAutoScrollKey((k) => k + 1), [])

  const clearFallback = useCallback(() => {
    if (fallbackRef.current != null) {
      clearTimeout(fallbackRef.current)
      fallbackRef.current = null
    }
  }, [])

  const releaseBusyAfterSnap = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setWithTransition(true)
        busyRef.current = false
      })
    })
  }, [])

  const jumpWithoutTransition = useCallback(
    (targetIndex) => {
      const fromClone = indexRef.current <= 0 || indexRef.current >= lastIndex
      clearFallback()
      setWithTransition(false)
      setIndex(targetIndex)
      releaseBusyAfterSnap()
      if (fromClone) setAutoScrollKey((k) => k + 1)
    },
    [lastIndex, clearFallback, releaseBusyAfterSnap],
  )

  const getRealIndex = useCallback(() => {
    const i = indexRef.current
    if (i <= 0) return N - 1
    if (i >= lastIndex) return 0
    return i - 1
  }, [N, lastIndex])

  const isOnClone = useCallback(
    () => {
      const i = indexRef.current
      return i <= 0 || i >= lastIndex
    },
    [lastIndex],
  )

  const snapIfOnClone = useCallback(() => {
    const i = indexRef.current
    if (i >= lastIndex) jumpWithoutTransition(1)
    else if (i <= 0) jumpWithoutTransition(lastIndex - 1)
    else busyRef.current = false
  }, [lastIndex, jumpWithoutTransition])

  const scheduleCloneFallback = useCallback(() => {
    clearFallback()
    fallbackRef.current = setTimeout(snapIfOnClone, TRANSITION_FALLBACK_MS)
  }, [clearFallback, snapIfOnClone])

  /** Ista logika kao tačkice — uvek cilja pravi slajd (1…N), ne inkrement klonova. */
  const navigateToReal = useCallback(
    (real) => {
      if (N === 0) return
      const target = ((real % N) + N) % N + 1
      const current = indexRef.current

      clearFallback()

      if (current <= 0 || current >= lastIndex) {
        jumpWithoutTransition(target)
        return
      }

      if (current === target) {
        busyRef.current = false
        return
      }

      if (busyRef.current) return

      busyRef.current = true
      setWithTransition(true)
      setIndex(target)
    },
    [N, lastIndex, clearFallback, jumpWithoutTransition],
  )

  const navigateNext = useCallback(() => {
    if (N === 0) return
    const current = indexRef.current
    const real = getRealIndex()

    if (isOnClone()) {
      snapIfOnClone()
      return
    }

    if (real === N - 1) {
      if (busyRef.current) return
      busyRef.current = true
      setWithTransition(true)
      setIndex(lastIndex)
      scheduleCloneFallback()
      return
    }

    navigateToReal(real + 1)
  }, [N, lastIndex, getRealIndex, isOnClone, snapIfOnClone, navigateToReal, scheduleCloneFallback])

  const navigatePrev = useCallback(() => {
    if (N === 0) return
    const current = indexRef.current
    const real = getRealIndex()

    if (isOnClone()) {
      snapIfOnClone()
      return
    }

    if (real === 0) {
      if (busyRef.current) return
      busyRef.current = true
      setWithTransition(true)
      setIndex(0)
      scheduleCloneFallback()
      return
    }

    navigateToReal(real - 1)
  }, [N, getRealIndex, isOnClone, snapIfOnClone, navigateToReal, scheduleCloneFallback])

  useEffect(() => {
    if (paused || !tabVisible || N === 0 || isOnClone()) return
    const id = setTimeout(() => navigateNext(), interval)
    return () => clearTimeout(id)
  }, [index, paused, tabVisible, interval, N, navigateNext, autoScrollKey, isOnClone])

  useEffect(() => {
    if (!tabVisible) {
      clearFallback()
      return
    }
    busyRef.current = false
    snapIfOnClone()
  }, [tabVisible, snapIfOnClone, clearFallback])

  const onArrowPrev = useCallback(() => {
    resetAutoScroll()
    navigatePrev()
  }, [resetAutoScroll, navigatePrev])

  const onArrowNext = useCallback(() => {
    resetAutoScroll()
    navigateNext()
  }, [resetAutoScroll, navigateNext])

  const onTransitionEnd = useCallback(
    (e) => {
      if (e.target !== trackRef.current || e.propertyName !== 'transform') return
      clearFallback()
      const i = indexRef.current
      if (i >= lastIndex) jumpWithoutTransition(1)
      else if (i <= 0) jumpWithoutTransition(lastIndex - 1)
      else busyRef.current = false
    },
    [indexRef, lastIndex, clearFallback, jumpWithoutTransition],
  )

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) navigatePrev()
      else navigateNext()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') navigatePrev()
    else if (e.key === 'ArrowRight') navigateNext()
  }

  useEffect(() => () => clearFallback(), [clearFallback])

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
        ref={trackRef}
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
        onClick={onArrowPrev}
        aria-label="Prethodna slika"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        className="hero-arrow right"
        onClick={onArrowNext}
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
            onClick={() => navigateToReal(i)}
          />
        ))}
      </div>
    </div>
  )
}

function ProductCarouselCard({ product, onAddToCart, onToggleWishlist }) {
  return (
    <article className="product-card">
      {product.imageSrc ? (
        <img src={product.imageSrc} alt={product.name} loading="eager" decoding="async" draggable="false" />
      ) : null}
      <div className="product-card-body">
        <h3>
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <p>{[product.productType, product.category].filter(Boolean).join(' · ')}</p>
        <strong>{Number(product.price).toLocaleString('sr-RS')} RSD</strong>
        <div className="card-actions">
          <button type="button" onClick={() => onAddToCart(product)}>Dodaj u korpu</button>
          <button type="button" className="ghost" onClick={() => onToggleWishlist(product)}>
            Wishlist
          </button>
        </div>
      </div>
    </article>
  )
}

function ProductCarousel({ products }) {
  const N = products.length
  const slides = useMemo(() => {
    if (N === 0) return []
    return [
      { product: products[N - 1], slideKey: 'clone-prev' },
      ...products.map((p) => ({ product: p, slideKey: String(p.id) })),
      { product: products[0], slideKey: 'clone-next' },
    ]
  }, [products, N])
  const lastIndex = slides.length - 1

  const tabVisible = useTabVisible()
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const stepRef = useRef(0)
  const busyRef = useRef(false)
  const fallbackRef = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const [index, setIndex] = useState(1)
  const [stepPx, setStepPx] = useState(0)
  const [withTransition, setWithTransition] = useState(true)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [autoScrollKey, setAutoScrollKey] = useState(0)
  const indexRef = useRef(1)
  indexRef.current = index

  const { addToCart, toggleWishlist } = useStore()

  const resetAutoScroll = useCallback(() => setAutoScrollKey((k) => k + 1), [])

  const measureStep = useCallback(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track || N === 0) return
    const visible = Math.min(POP_VISIBLE_MAX, N)
    const gap = parseFloat(getComputedStyle(track).gap || '16')
    const cardWidth = (viewport.clientWidth - (visible - 1) * gap) / visible
    if (cardWidth <= 0) return
    viewport.style.setProperty('--pop-card-width', `${cardWidth}px`)
    const step = cardWidth + gap
    stepRef.current = step
    setStepPx(step)
    setReady(true)
  }, [N])

  useEffect(() => {
    setReady(false)
    setStepPx(0)
    const id = requestAnimationFrame(measureStep)
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return () => cancelAnimationFrame(id)
    const ro = new ResizeObserver(() => measureStep())
    ro.observe(viewport)
    ro.observe(track)
    window.addEventListener('resize', measureStep)
    return () => {
      cancelAnimationFrame(id)
      ro.disconnect()
      window.removeEventListener('resize', measureStep)
    }
  }, [measureStep, products])

  const clearFallback = useCallback(() => {
    if (fallbackRef.current != null) {
      clearTimeout(fallbackRef.current)
      fallbackRef.current = null
    }
  }, [])

  const releaseBusyAfterSnap = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setWithTransition(true)
        busyRef.current = false
      })
    })
  }, [])

  const jumpWithoutTransition = useCallback(
    (targetIndex) => {
      const fromClone = indexRef.current <= 0 || indexRef.current >= lastIndex
      clearFallback()
      setWithTransition(false)
      setIndex(targetIndex)
      releaseBusyAfterSnap()
      if (fromClone) setAutoScrollKey((k) => k + 1)
    },
    [lastIndex, clearFallback, releaseBusyAfterSnap],
  )

  const getRealIndex = useCallback(() => {
    const i = indexRef.current
    if (i <= 0) return N - 1
    if (i >= lastIndex) return 0
    return i - 1
  }, [N, lastIndex])

  const isOnClone = useCallback(
    () => {
      const i = indexRef.current
      return i <= 0 || i >= lastIndex
    },
    [lastIndex],
  )

  const snapIfOnClone = useCallback(() => {
    const i = indexRef.current
    if (i >= lastIndex) jumpWithoutTransition(1)
    else if (i <= 0) jumpWithoutTransition(lastIndex - 1)
    else busyRef.current = false
  }, [lastIndex, jumpWithoutTransition])

  const scheduleCloneFallback = useCallback(() => {
    clearFallback()
    fallbackRef.current = setTimeout(snapIfOnClone, TRANSITION_FALLBACK_MS)
  }, [clearFallback, snapIfOnClone])

  const navigateToReal = useCallback(
    (real) => {
      if (N === 0 || stepRef.current <= 0) return
      const target = ((real % N) + N) % N + 1
      const current = indexRef.current

      clearFallback()

      if (current <= 0 || current >= lastIndex) {
        jumpWithoutTransition(target)
        return
      }

      if (current === target) {
        busyRef.current = false
        return
      }

      if (busyRef.current) return

      busyRef.current = true
      setWithTransition(true)
      setIndex(target)
    },
    [N, lastIndex, clearFallback, jumpWithoutTransition],
  )

  const navigateNext = useCallback(() => {
    if (N === 0 || stepRef.current <= 0) return
    const current = indexRef.current
    const real = getRealIndex()

    if (isOnClone()) {
      snapIfOnClone()
      return
    }

    if (real === N - 1) {
      if (busyRef.current) return
      busyRef.current = true
      setWithTransition(true)
      setIndex(lastIndex)
      scheduleCloneFallback()
      return
    }

    navigateToReal(real + 1)
  }, [N, lastIndex, getRealIndex, isOnClone, snapIfOnClone, navigateToReal, scheduleCloneFallback])

  const navigatePrev = useCallback(() => {
    if (N === 0 || stepRef.current <= 0) return
    const current = indexRef.current
    const real = getRealIndex()

    if (isOnClone()) {
      snapIfOnClone()
      return
    }

    if (real === 0) {
      if (busyRef.current) return
      busyRef.current = true
      setWithTransition(true)
      setIndex(0)
      scheduleCloneFallback()
      return
    }

    navigateToReal(real - 1)
  }, [N, getRealIndex, isOnClone, snapIfOnClone, navigateToReal, scheduleCloneFallback])

  const onTransitionEnd = useCallback(
    (e) => {
      if (e.target !== trackRef.current || e.propertyName !== 'transform') return
      clearFallback()
      const i = indexRef.current
      if (i >= lastIndex) jumpWithoutTransition(1)
      else if (i <= 0) jumpWithoutTransition(lastIndex - 1)
      else busyRef.current = false
    },
    [lastIndex, clearFallback, jumpWithoutTransition],
  )

  useEffect(() => {
    if (!tabVisible) {
      clearFallback()
      return
    }
    busyRef.current = false
    snapIfOnClone()
  }, [tabVisible, snapIfOnClone, clearFallback])

  useEffect(() => {
    if (paused || !tabVisible || !ready || N === 0 || isOnClone()) return
    const id = setTimeout(() => navigateNext(), PRODUCT_INTERVAL_MS)
    return () => clearTimeout(id)
  }, [index, paused, tabVisible, ready, N, navigateNext, autoScrollKey, isOnClone])

  useEffect(() => () => clearFallback(), [clearFallback])

  const onArrowPrev = useCallback(() => {
    resetAutoScroll()
    navigatePrev()
  }, [resetAutoScroll, navigatePrev])

  const onArrowNext = useCallback(() => {
    resetAutoScroll()
    navigateNext()
  }, [resetAutoScroll, navigateNext])

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) navigatePrev()
      else navigateNext()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  if (!N) return null

  const visibleSlots = Math.min(POP_VISIBLE_MAX, N)
  const translateX = stepPx > 0 ? index * stepPx : 0

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
        onClick={onArrowPrev}
        aria-label="Pomeri levo"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div
        ref={viewportRef}
        className="pop-strip-viewport"
        aria-hidden={!ready}
        style={{ '--pop-visible': visibleSlots }}
      >
        <div
          ref={trackRef}
          className="pop-strip"
          style={{
            transform: `translateX(-${translateX}px)`,
            transition: withTransition
              ? 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
            visibility: ready ? 'visible' : 'hidden',
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {slides.map(({ product, slideKey }) => (
            <ProductCarouselCard
              key={slideKey}
              product={product}
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="pop-arrow right"
        onClick={onArrowNext}
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
  const [bestsellersReady, setBestsellersReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get('/products/bestsellers')
      .then(async ({ data }) => {
        const list = Array.isArray(data) ? data : []
        await preloadProductImagesAwait(list)
        if (!cancelled) {
          setBestsellers(attachResolvedImageSrc(list))
          setBestsellersReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBestsellers([])
          setBestsellersReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <HeroCarousel images={HERO_IMAGES} />

      {bestsellersReady && bestsellers.length > 0 && (
        <section className="section-gap pop-section">
          <div className="shell">
            <div className="pop-head">
              <h2 className="pop-title">Popularni proizvodi</h2>
              <Link to="/shop?bestsellers=1" className="pop-head-link">Vidi sve →</Link>
            </div>
            <ProductCarousel products={bestsellers} />
          </div>
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
          <Link to="/shop?type=Baze" className="feature-section-btn">O proizvodu</Link>
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
