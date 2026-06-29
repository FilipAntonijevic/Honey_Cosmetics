import { useCallback, useEffect, useRef, useState } from 'react'
import ApiImage from './ApiImage'

const MIN_PINCH_SCALE = 1
const MAX_PINCH_SCALE = 4

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const onChange = () => setCoarse(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return coarse
}

function touchDistance(touches) {
  if (touches.length < 2) return 0
  const [a, b] = touches
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

/** Hover zum na desktopu; pinch + pan na telefonu. */
export default function ProductImageZoom({ src, alt }) {
  const wrapRef = useRef(null)
  const isTouch = useCoarsePointer()

  const [hoverZoomed, setHoverZoomed] = useState(false)
  const [originX, setOriginX] = useState(50)
  const [originY, setOriginY] = useState(50)

  const [pinchScale, setPinchScale] = useState(1)
  const [pinchTranslate, setPinchTranslate] = useState({ x: 0, y: 0 })
  const [gesturing, setGesturing] = useState(false)

  const pinchScaleRef = useRef(1)
  const pinchTranslateRef = useRef({ x: 0, y: 0 })
  const gestureRef = useRef(null)

  useEffect(() => {
    pinchScaleRef.current = pinchScale
  }, [pinchScale])

  useEffect(() => {
    pinchTranslateRef.current = pinchTranslate
  }, [pinchTranslate])

  const clampPan = useCallback((x, y, scale) => {
    const el = wrapRef.current
    if (!el || scale <= 1) return { x: 0, y: 0 }
    const maxX = (el.clientWidth * (scale - 1)) / 2
    const maxY = (el.clientHeight * (scale - 1)) / 2
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }
  }, [])

  const applyPan = useCallback((x, y, scale) => {
    const pan = clampPan(x, y, scale)
    pinchTranslateRef.current = pan
    setPinchTranslate(pan)
  }, [clampPan])

  const applyScale = useCallback((scale) => {
    const next = Math.min(MAX_PINCH_SCALE, Math.max(MIN_PINCH_SCALE, scale))
    pinchScaleRef.current = next
    setPinchScale(next)
    if (next <= 1) applyPan(0, 0, 1)
    else applyPan(pinchTranslateRef.current.x, pinchTranslateRef.current.y, next)
    return next
  }, [applyPan])

  const onDesktopMove = (e) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
    setOriginX(x)
    setOriginY(y)
  }

  useEffect(() => {
    const el = wrapRef.current
    if (!el || !isTouch) return undefined

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        gestureRef.current = {
          mode: 'pinch',
          startDistance: touchDistance(e.touches),
          startScale: pinchScaleRef.current,
          startTranslate: { ...pinchTranslateRef.current },
        }
        setGesturing(true)
        return
      }
      if (e.touches.length === 1 && pinchScaleRef.current > 1) {
        gestureRef.current = {
          mode: 'pan',
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startTranslate: { ...pinchTranslateRef.current },
        }
        setGesturing(true)
      }
    }

    const onTouchMove = (e) => {
      const g = gestureRef.current
      if (!g) return

      if (g.mode === 'pinch' && e.touches.length >= 2) {
        e.preventDefault()
        const dist = touchDistance(e.touches)
        if (!g.startDistance) return
        applyScale(g.startScale * (dist / g.startDistance))
        return
      }

      if (g.mode === 'pan' && e.touches.length === 1) {
        e.preventDefault()
        const dx = e.touches[0].clientX - g.startX
        const dy = e.touches[0].clientY - g.startY
        applyPan(
          g.startTranslate.x + dx,
          g.startTranslate.y + dy,
          pinchScaleRef.current,
        )
      }
    }

    const onTouchEnd = () => {
      gestureRef.current = null
      setGesturing(false)
      if (pinchScaleRef.current < 1.02) applyScale(1)
      else {
        applyPan(
          pinchTranslateRef.current.x,
          pinchTranslateRef.current.y,
          pinchScaleRef.current,
        )
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [isTouch, applyPan, applyScale])

  const imgStyle = isTouch
    ? {
        transform: `translate(${pinchTranslate.x}px, ${pinchTranslate.y}px) scale(${pinchScale})`,
        transformOrigin: 'center center',
      }
    : undefined

  const wrapStyle = !isTouch
    ? {
        '--zoom-x': `${originX}%`,
        '--zoom-y': `${originY}%`,
      }
    : undefined

  const imgClassName = [
    'pd-zoom__img',
    !isTouch && hoverZoomed ? 'is-zoomed' : '',
    isTouch && gesturing ? 'is-gesturing' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={wrapRef}
      className={`pd-zoom${isTouch ? ' pd-zoom--pinch' : ''}`}
      style={wrapStyle}
      onMouseEnter={isTouch ? undefined : () => setHoverZoomed(true)}
      onMouseLeave={isTouch ? undefined : () => setHoverZoomed(false)}
      onMouseMove={isTouch ? undefined : onDesktopMove}
    >
      <ApiImage
        src={src}
        alt={alt}
        className="pd-zoom__wrap"
        imgClassName={imgClassName}
        style={imgStyle}
      />
    </div>
  )
}
