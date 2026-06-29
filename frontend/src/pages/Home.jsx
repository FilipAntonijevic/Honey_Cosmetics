import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import { publicUrl, toImageStoragePath } from '../lib/assets'
import {
  preloadDirectImagesProgressive,
  preloadProductImagesMedium,
} from '../lib/imagePreload'
import ApiImage from '../components/ApiImage'
import ProductCard from '../components/ProductCard'
import FitOneLineTitle from '../components/FitOneLineTitle'
import { groupProductsForDisplay } from '../lib/productVariants'

const POP_VISIBLE_MAX = 5
const POP_DESKTOP_GAP_PX = Math.round(17 * 1.1)
const POP_MIN_VIEWPORT_PX = 320

// Izmeri tačnu širinu shop kartice iz CSS (--shop-card-width), ista svuda.
function measureShopCardWidthPx() {
  if (typeof document === 'undefined') return 0
  const shell = document.createElement('div')
  shell.className = 'shell'
  shell.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;'
  const grid = document.createElement('div')
  grid.className = 'product-grid'
  const card = document.createElement('div')
  card.className = 'product-card'
  grid.appendChild(card)
  shell.appendChild(grid)
  document.body.appendChild(shell)
  const width = Math.round(card.getBoundingClientRect().width)
  document.body.removeChild(shell)
  return width
}

/** Traka: [poslednjih V] + [svi proizvodi] + [prvih V] — kružno pomeranje kao hero. */
function buildProductSlides(products, visible) {
  const N = products.length
  if (N === 0) {
    return { slides: [], startIndex: 0, snapHigh: 0, snapLow: 0, lastIndex: 0, visible: 0 }
  }
  const v = Math.min(visible, N)
  const prev = products.slice(-v)
  const next = products.slice(0, v)
  const slides = [
    ...prev.map((product, i) => ({ product, slideKey: `pre-${product.id}-${i}` })),
    ...products.map((product) => ({ product, slideKey: `main-${product.id}` })),
    ...next.map((product, i) => ({ product, slideKey: `post-${product.id}-${i}` })),
  ]
  const startIndex = v
  const snapLow = startIndex + N - 1
  const snapHigh = startIndex + N
  return { slides, startIndex, snapLow, snapHigh, lastIndex: slides.length - 1, visible: v }
}

const HERO_IMAGES = [
  publicUrl('/hero/POCETNA.jpg'),
  publicUrl('/hero/POCETNA2.png'),
  publicUrl('/hero/POCETNA3.jpg'),
  publicUrl('/hero/POCETNA-4.jpg'),
  publicUrl('/hero/POCETNA5.png'),
].map((url) => ({ desktop: url, mobile: url }))

const HERO_INTERVAL_MS = 6000
const PRODUCT_INTERVAL_MS = 4500
const HERO_TRANSITION_MS = 700
const PRODUCT_TRANSITION_MS = 550
const heroTransitionFallbackMs = HERO_TRANSITION_MS + 150
const productTransitionFallbackMs = PRODUCT_TRANSITION_MS + 150

function forceTrackReflow(trackEl) {
  if (trackEl) void trackEl.offsetWidth
}

/** Nakon skoka sa klona: bez transition, reflow, pa tek onda ponovo animacija. */
function useInstantSnap(trackRef, index) {
  const snapPendingRef = useRef(false)
  const afterSnapRef = useRef(null)

  const isSnapping = useCallback(() => snapPendingRef.current, [])

  const jumpWithoutTransition = useCallback((applyIndex, afterSnap) => {
    if (snapPendingRef.current) return
    snapPendingRef.current = true
    afterSnapRef.current = afterSnap ?? null
    applyIndex()
  }, [])

  useLayoutEffect(() => {
    if (!snapPendingRef.current) return
    snapPendingRef.current = false
    forceTrackReflow(trackRef.current)
    const done = afterSnapRef.current
    afterSnapRef.current = null
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        done?.()
      })
    })
  }, [index, trackRef])

  return { jumpWithoutTransition, isSnapping }
}

function useSyncedIndex(initial) {
  const [index, setIndexState] = useState(initial)
  const indexRef = useRef(initial)
  const setIndex = useCallback((next) => {
    const value = typeof next === 'function' ? next(indexRef.current) : next
    indexRef.current = value
    setIndexState(value)
  }, [])
  indexRef.current = index
  return [index, setIndex, indexRef]
}

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
 * slides: { desktop, mobile }[] — desktop on PC, mobile on ≤768px.
 */
function useHeroMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

function HeroSlideImage({ src, loading }) {
  const storagePath = toImageStoragePath(src)
  if (storagePath.startsWith('/images/')) {
    return (
      <ApiImage
        src={storagePath}
        alt=""
        variant="full"
        loading={loading}
        className="hero-slide-img"
      />
    )
  }
  return <img src={src} alt="" loading={loading} draggable="false" />
}

function HeroCarousel({ slides, interval = HERO_INTERVAL_MS }) {
  const isMobile = useHeroMobile()
  const images = useMemo(
    () => slides.map((s) => (isMobile ? (s.mobile || s.desktop) : s.desktop)),
    [slides, isMobile],
  )
  const N = images.length
  const trackSlides = useMemo(
    () => (N > 0 ? [images[N - 1], ...images, images[0]] : []),
    [images, N],
  )
  const lastIndex = trackSlides.length - 1

  const tabVisible = useTabVisible()
  const trackRef = useRef(null)
  const busyRef = useRef(false)
  const wrapLockRef = useRef(false)
  const fallbackRef = useRef(null)

  const [index, setIndex, indexRef] = useSyncedIndex(1)
  const [withTransition, setWithTransition] = useState(true)
  const [paused, setPaused] = useState(false)
  const [autoScrollKey, setAutoScrollKey] = useState(0)

  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const resetAutoScroll = useCallback(() => setAutoScrollKey((k) => k + 1), [])

  const clearFallback = useCallback(() => {
    if (fallbackRef.current != null) {
      clearTimeout(fallbackRef.current)
      fallbackRef.current = null
    }
  }, [])

  const { jumpWithoutTransition: instantJump, isSnapping } = useInstantSnap(trackRef, index)

  const isLocked = useCallback(
    () => busyRef.current || wrapLockRef.current || isSnapping(),
    [isSnapping],
  )

  const jumpWithoutTransition = useCallback(
    (targetIndex) => {
      const fromClone = indexRef.current <= 0 || indexRef.current >= lastIndex
      clearFallback()
      busyRef.current = true
      wrapLockRef.current = true
      instantJump(
        () => {
          setWithTransition(false)
          setIndex(targetIndex)
        },
        () => {
          setWithTransition(true)
          wrapLockRef.current = false
          busyRef.current = false
          if (fromClone) setAutoScrollKey((k) => k + 1)
        },
      )
    },
    [lastIndex, clearFallback, instantJump, setIndex, indexRef],
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
    if (isSnapping()) return
    const i = indexRef.current
    if (i >= lastIndex) jumpWithoutTransition(1)
    else if (i <= 0) jumpWithoutTransition(lastIndex - 1)
    else busyRef.current = false
  }, [lastIndex, jumpWithoutTransition, isSnapping, indexRef])

  const scheduleCloneFallback = useCallback(() => {
    clearFallback()
    fallbackRef.current = setTimeout(() => {
      if (indexRef.current <= 0 || indexRef.current >= lastIndex) snapIfOnClone()
    }, heroTransitionFallbackMs)
  }, [clearFallback, snapIfOnClone, lastIndex, indexRef])

  /** Ista logika kao tačkice — uvek cilja pravi slajd (1…N), ne inkrement klonova. */
  const navigateToReal = useCallback(
    (real) => {
      if (N === 0 || isLocked()) return
      const target = ((real % N) + N) % N + 1
      const current = indexRef.current

      clearFallback()

      if (current <= 0 || current >= lastIndex) {
        jumpWithoutTransition(target)
        return
      }

      if (current === target) return

      busyRef.current = true
      setWithTransition(true)
      setIndex(target)
    },
    [N, lastIndex, clearFallback, jumpWithoutTransition, isLocked, setIndex, indexRef],
  )

  const navigateNext = useCallback(() => {
    if (N === 0 || isLocked()) return
    const real = getRealIndex()

    if (isOnClone()) {
      if (!wrapLockRef.current) snapIfOnClone()
      return
    }

    if (real === N - 1) {
      wrapLockRef.current = true
      busyRef.current = true
      setWithTransition(true)
      setIndex(lastIndex)
      scheduleCloneFallback()
      return
    }

    navigateToReal(real + 1)
  }, [N, lastIndex, getRealIndex, isOnClone, isLocked, snapIfOnClone, navigateToReal, scheduleCloneFallback, setIndex])

  const navigatePrev = useCallback(() => {
    if (N === 0 || isLocked()) return
    const real = getRealIndex()

    if (isOnClone()) {
      if (!wrapLockRef.current) snapIfOnClone()
      return
    }

    if (real === 0) {
      wrapLockRef.current = true
      busyRef.current = true
      setWithTransition(true)
      setIndex(0)
      scheduleCloneFallback()
      return
    }

    navigateToReal(real - 1)
  }, [N, getRealIndex, isOnClone, isLocked, snapIfOnClone, navigateToReal, scheduleCloneFallback, setIndex])

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
      if (isSnapping()) return
      clearFallback()
      const i = indexRef.current
      if (i >= lastIndex) {
        if (!wrapLockRef.current) return
        jumpWithoutTransition(1)
        return
      }
      if (i <= 0) {
        if (!wrapLockRef.current) return
        jumpWithoutTransition(lastIndex - 1)
        return
      }
      wrapLockRef.current = false
      busyRef.current = false
    },
    [lastIndex, clearFallback, jumpWithoutTransition, isSnapping, indexRef],
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
    <div className="hero-carousel-wrap">
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
            transform: `translate3d(-${index * 100}%, 0, 0)`,
            transition: withTransition
              ? `transform ${HERO_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
              : 'none',
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {trackSlides.map((src, i) => (
            <div className="hero-slide" key={`${src}-${i}`} aria-hidden={i !== index}>
              <HeroSlideImage src={src} loading={i === 1 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>

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
    </div>
  )
}


function ProductCarousel({ products }) {
  const N = products.length
  const [visibleSlots, setVisibleSlots] = useState(POP_VISIBLE_MAX)
  const strip = useMemo(
    () => buildProductSlides(products, visibleSlots),
    [products, visibleSlots],
  )
  const { slides, startIndex, snapLow, snapHigh, lastIndex } = strip

  const tabVisible = useTabVisible()
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const stepRef = useRef(0)
  const busyRef = useRef(false)
  const wrapLockRef = useRef(false)
  const fallbackRef = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const draggingRef = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [index, setIndex, indexRef] = useSyncedIndex(1)
  const [stepPx, setStepPx] = useState(0)
  const [withTransition, setWithTransition] = useState(true)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [autoScrollKey, setAutoScrollKey] = useState(0)

  const { toggleWishlist } = useStore()

  const resetAutoScroll = useCallback(() => setAutoScrollKey((k) => k + 1), [])

  useEffect(() => {
    if (N > 0) {
      wrapLockRef.current = false
      busyRef.current = false
      setIndex(startIndex)
    }
  }, [startIndex, N, setIndex])

  const measureStep = useCallback(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track || N === 0) return

    const vw = viewport.clientWidth
    let visible
    let cardWidth
    let stepGap

    if (vw <= 768) {
      // Telefon: jedna kartica, centrirana — ista širina kao u shop gridu
      visible = 1
      track.style.gap = ''
      const gap = parseFloat(getComputedStyle(track).gap || '16') || 16
      stepGap = gap
      cardWidth = measureShopCardWidthPx()
      if (cardWidth <= 0) return
      const outer = viewport.getBoundingClientRect().width
      const pad = Math.max(0, Math.round((outer - cardWidth) / 2))
      viewport.style.paddingLeft = `${pad}px`
      viewport.style.paddingRight = `${pad}px`
      viewport.style.width = ''
      viewport.style.marginLeft = ''
      viewport.style.marginRight = ''
    } else {
      // Desktop: 5 kartica — puna shop širina, bez smanjivanja
      viewport.style.paddingLeft = ''
      viewport.style.paddingRight = ''
      track.style.gap = ''
      viewport.style.maxWidth = '100%'
      viewport.style.marginLeft = 'auto'
      viewport.style.marginRight = 'auto'
      viewport.style.flexShrink = '0'
      void viewport.offsetWidth

      const shopCard = measureShopCardWidthPx()
      if (shopCard <= 0) return

      visible = Math.min(N, POP_VISIBLE_MAX)
      const layoutGap = POP_DESKTOP_GAP_PX
      stepGap = layoutGap
      track.style.gap = `${layoutGap}px`

      cardWidth = shopCard

      const rowWidth = visible * cardWidth + Math.max(0, visible - 1) * layoutGap
      viewport.style.width = `${rowWidth}px`

      const section = viewport.closest('.pop-section')
      if (section) section.style.setProperty('--pop-card-gap', `${layoutGap}px`)
    }

    setVisibleSlots(visible)
    viewport.style.setProperty('--pop-card-width', `${cardWidth}px`)
    viewport.style.setProperty('--pop-visible', String(visible))
    const step = cardWidth + stepGap
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
    const wrap = viewport.parentElement
    if (wrap) ro.observe(wrap)
    const block = wrap?.parentElement
    if (block) ro.observe(block)
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

  const { jumpWithoutTransition: instantJump, isSnapping } = useInstantSnap(trackRef, index)

  const isLocked = useCallback(
    () => busyRef.current || wrapLockRef.current || isSnapping(),
    [isSnapping],
  )

  const jumpWithoutTransition = useCallback(
    (targetIndex) => {
      const fromClone = indexRef.current < startIndex || indexRef.current > snapLow
      clearFallback()
      busyRef.current = true
      wrapLockRef.current = true
      instantJump(
        () => {
          setWithTransition(false)
          setIndex(targetIndex)
        },
        () => {
          setWithTransition(true)
          wrapLockRef.current = false
          busyRef.current = false
          if (fromClone) setAutoScrollKey((k) => k + 1)
        },
      )
    },
    [startIndex, snapLow, clearFallback, instantJump, setIndex, indexRef],
  )

  const isOnClone = useCallback(() => {
    const i = indexRef.current
    return i < startIndex || i > snapLow
  }, [startIndex, snapLow, indexRef])

  const snapIfOnClone = useCallback(() => {
    if (isSnapping()) return
    const i = indexRef.current
    if (i > snapLow) jumpWithoutTransition(startIndex)
    else if (i < startIndex) jumpWithoutTransition(snapLow)
    else busyRef.current = false
  }, [startIndex, snapLow, jumpWithoutTransition, isSnapping, indexRef])

  // Sigurnosni tajmer: ako 'transitionend' ne stigne (npr. promena ne pomera
  // transform), oslobodi zaključavanja da bi sledeći prevlak uvek radio.
  const scheduleSettleFallback = useCallback(() => {
    clearFallback()
    fallbackRef.current = setTimeout(() => {
      const i = indexRef.current
      if (i < startIndex || i > snapLow) {
        snapIfOnClone()
      } else {
        wrapLockRef.current = false
        busyRef.current = false
      }
    }, productTransitionFallbackMs)
  }, [clearFallback, snapIfOnClone, startIndex, snapLow, indexRef])

  // Trenutno "smiri" traku: normalizuj klon-poziciju u stvarni indeks (bez
  // pomeranja vidljivog proizvoda) i oslobodi zaključavanja, kako bi novi
  // prevlak mogao odmah da krene — i u toku tekuće animacije.
  const settleNow = useCallback(() => {
    clearFallback()
    const i = indexRef.current
    let target = i
    if (i > snapLow) target = i - N
    else if (i < startIndex) target = i + N
    if (target !== i) {
      setWithTransition(false)
      setIndex(target)
    }
    wrapLockRef.current = false
    busyRef.current = false
  }, [clearFallback, snapLow, startIndex, N, setIndex, indexRef])

  const navigateNext = useCallback(() => {
    if (N === 0 || stepRef.current <= 0 || isLocked()) return
    const i = indexRef.current

    if (isOnClone()) {
      if (!wrapLockRef.current) snapIfOnClone()
      return
    }

    if (i === snapLow) {
      wrapLockRef.current = true
      busyRef.current = true
      setWithTransition(true)
      setIndex(snapHigh)
      scheduleSettleFallback()
      return
    }

    busyRef.current = true
    setWithTransition(true)
    setIndex(i + 1)
    scheduleSettleFallback()
  }, [N, snapLow, snapHigh, isOnClone, isLocked, snapIfOnClone, scheduleSettleFallback, setIndex, indexRef])

  const navigatePrev = useCallback(() => {
    if (N === 0 || stepRef.current <= 0 || isLocked()) return
    const i = indexRef.current

    if (isOnClone()) {
      if (!wrapLockRef.current) snapIfOnClone()
      return
    }

    if (i === startIndex) {
      wrapLockRef.current = true
      busyRef.current = true
      setWithTransition(true)
      setIndex(startIndex - 1)
      scheduleSettleFallback()
      return
    }

    busyRef.current = true
    setWithTransition(true)
    setIndex(i - 1)
    scheduleSettleFallback()
  }, [N, startIndex, isOnClone, isLocked, snapIfOnClone, scheduleSettleFallback, setIndex, indexRef])

  const onTransitionEnd = useCallback(
    (e) => {
      if (e.target !== trackRef.current || e.propertyName !== 'transform') return
      if (isSnapping()) return
      clearFallback()
      const i = indexRef.current
      if (i > snapLow) {
        if (!wrapLockRef.current) return
        jumpWithoutTransition(startIndex)
        return
      }
      if (i < startIndex) {
        if (!wrapLockRef.current) return
        jumpWithoutTransition(snapLow)
        return
      }
      wrapLockRef.current = false
      busyRef.current = false
    },
    [startIndex, snapLow, clearFallback, jumpWithoutTransition, isSnapping, indexRef],
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
    // Ne odbacuj dodir ako traka još uvek "radi" — umesto toga je smiri i
    // dozvoli novi prevlak. Tako korisnik može da vrti proizvode u krug
    // bez čekanja da se prethodna animacija završi.
    settleNow()
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    draggingRef.current = false
    setPaused(true)
  }
  const onTouchMove = (e) => {
    if (touchStartX.current == null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (!draggingRef.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        // vertikalni skrol — prepusti pregledaču
        touchStartX.current = null
        setPaused(false)
        return
      }
      if (Math.abs(dx) > 6) {
        draggingRef.current = true
        setWithTransition(false)
      } else {
        return
      }
    }
    setDragOffset(dx)
  }
  const onTouchEnd = (e) => {
    const wasDragging = draggingRef.current
    const startX = touchStartX.current
    touchStartX.current = null
    touchStartY.current = null
    draggingRef.current = false
    setPaused(false)
    if (!wasDragging || startX == null) {
      setWithTransition(true)
      setDragOffset(0)
      return
    }
    const dx = e.changedTouches[0].clientX - startX
    const step = stepRef.current || 200
    const threshold = Math.min(60, step * 0.22)
    setWithTransition(true)
    setDragOffset(0)
    if (dx <= -threshold) {
      resetAutoScroll()
      navigateNext()
    } else if (dx >= threshold) {
      resetAutoScroll()
      navigatePrev()
    }
  }

  if (!N) return null

  const baseTranslate = stepPx > 0 ? index * stepPx : 0
  const translateX = Math.round(baseTranslate - dragOffset)

  return (
    <div
      className="pop-strip-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
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
        style={{ '--pop-visible': visibleSlots, '--pop-visible-max': POP_VISIBLE_MAX }}
      >
        <div
          ref={trackRef}
          className="pop-strip"
          style={{
            transform: `translate3d(-${translateX}px, 0, 0)`,
            transition: withTransition
              ? `transform ${PRODUCT_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
              : 'none',
            visibility: ready ? 'visible' : 'hidden',
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {slides.map(({ product, slideKey }) => (
            <ProductCard
              key={slideKey}
              product={product}
              onToggleWishlist={toggleWishlist}
              eager
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
  const [heroSlides, setHeroSlides] = useState(HERO_IMAGES)

  useEffect(() => {
    let cancelled = false
    api
      .get('/home-slideshow')
      .then(async ({ data }) => {
        if (cancelled) return
        const items = (data ?? []).sort((a, b) => a.sortOrder - b.sortOrder)
        const paths = items
          .flatMap((s) => [s.imageUrl, s.mobileImageUrl || s.imageUrl])
          .filter(Boolean)
        if (paths.length === 0) return
        const mapped = items
          .map((s) => ({
            desktop: s.imageUrl,
            mobile: s.mobileImageUrl || s.imageUrl,
          }))
          .filter((s) => s.desktop)
        if (mapped.length > 0) setHeroSlides(mapped)
        preloadDirectImagesProgressive(paths)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadPopular = async () => {
      try {
        const { data } = await api.get('/products/bestsellers')
        let list = Array.isArray(data) ? data : []
        if (list.length === 0) {
          const { data: fallback } = await api.get('/products')
          list = (Array.isArray(fallback) ? fallback : []).slice(0, 8)
        }
        if (list.length === 0) {
          if (!cancelled) {
            setBestsellers([])
            setBestsellersReady(true)
          }
          return
        }

        const firstBatch = list.slice(0, POP_VISIBLE_MAX)
        if (cancelled) return

        setBestsellers(groupProductsForDisplay(list))
        setBestsellersReady(true)
        preloadProductImagesMedium(firstBatch)
        if (list.length > POP_VISIBLE_MAX) {
          preloadProductImagesMedium(list.slice(POP_VISIBLE_MAX))
        }
      } catch {
        if (!cancelled) {
          setBestsellers([])
          setBestsellersReady(true)
        }
      }
    }
    loadPopular()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <HeroCarousel slides={heroSlides} />

      {bestsellersReady && bestsellers.length > 0 && (
        <section className="section-gap pop-section">
          <div className="pop-head">
            <div className="pop-head-row">
              <span className="pop-head-line" aria-hidden="true" />
              <h2 className="pop-title-wrap">
                <FitOneLineTitle
                  as="span"
                  className="pop-title"
                  maxRem={1.555}
                  minRem={0.36}
                  fillWidth={false}
                >
                  Popularni proizvodi
                </FitOneLineTitle>
              </h2>
              <span className="pop-head-line" aria-hidden="true" />
            </div>
          </div>
          <div className="shell">
            <div className="pop-carousel-block">
              <ProductCarousel products={bestsellers} />
              <div className="pop-foot">
                <Link to="/shop?bestsellers=1" className="pop-head-link">Vidi sve →</Link>
              </div>
            </div>
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
