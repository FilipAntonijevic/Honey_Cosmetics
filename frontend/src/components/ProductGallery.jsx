import { useEffect, useMemo, useState } from 'react'
import ApiImage from './ApiImage'
import ProductImageZoom from './ProductImageZoom'

/** Glavna slika + vertikalni thumbnaili (bez full-screen lupe). */
export default function ProductGallery({ imageUrl, additionalImageUrls, alt }) {
  const images = useMemo(() => {
    const list = [imageUrl, ...(additionalImageUrls ?? [])].filter(Boolean)
    return [...new Set(list)]
  }, [imageUrl, additionalImageUrls])

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [images])

  if (images.length === 0) return null

  const activeSrc = images[activeIndex] ?? images[0]

  return (
    <div className="pd-gallery">
      <div className="pd-gallery__main">
        <ProductImageZoom key={activeSrc} src={activeSrc} alt={alt} />
      </div>
      {images.length > 1 ? (
        <div className="pd-gallery__thumbs" role="tablist" aria-label="Slike proizvoda">
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Slika ${index + 1}`}
              className={`pd-gallery__thumb${index === activeIndex ? ' is-active' : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              <ApiImage src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
