import { useRef, useState } from 'react'
import ApiImage from './ApiImage'

/** Hover zum na poziciji kursora (mockup stranice proizvoda). */
export default function ProductImageZoom({ src, alt }) {
  const wrapRef = useRef(null)
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')

  const onMove = (e) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
    setOrigin(`${x}% ${y}%`)
  }

  return (
    <div
      ref={wrapRef}
      className="pd-zoom"
      onMouseEnter={() => setZoomed(true)}
      onMouseLeave={() => setZoomed(false)}
      onMouseMove={onMove}
    >
      <ApiImage
        src={src}
        alt={alt}
        className={`pd-zoom__img${zoomed ? ' is-zoomed' : ''}`}
        style={zoomed ? { transformOrigin: origin } : undefined}
      />
    </div>
  )
}
