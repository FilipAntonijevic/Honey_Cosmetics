import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  apiImageUrl,
  apiMediumUrl,
  apiThumbnailUrl,
  apiVariantUrlLegacy,
} from '../lib/assets'
import { getCachedVariantUrl } from '../lib/imagePreload'

async function fetchBlobUrl(url) {
  const { data } = await axios.get(url, {
    responseType: 'blob',
    headers: { 'ngrok-skip-browser-warning': 'true' },
  })
  return URL.createObjectURL(data)
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function resolveUrl(directUrl, useBlob) {
  if (!directUrl) return ''
  if (!useBlob) return directUrl
  return fetchBlobUrl(directUrl)
}

async function loadVariant(webpUrl, legacyUrl, useBlob) {
  if (webpUrl) {
    try {
      const url = await resolveUrl(webpUrl, useBlob)
      await loadImageElement(url)
      return url
    } catch {
      /* WebP još nije generisan */
    }
  }
  if (legacyUrl) {
    const url = await resolveUrl(legacyUrl, useBlob)
    await loadImageElement(url)
    return url
  }
  throw new Error('variant unavailable')
}

async function loadVariantStep(src, variant, webpUrl, legacyUrl, useBlob) {
  const cached = getCachedVariantUrl(src, variant)
  if (cached) {
    await loadImageElement(cached)
    return cached
  }
  return loadVariant(webpUrl, legacyUrl, useBlob)
}

/**
 * Progresivno: thumb (blur) → medium → full.
 * variant="medium" — za kartice u prodavnici (ne učitava original).
 */
export default function ApiImage({
  src,
  alt = '',
  className,
  imgClassName,
  style,
  loading,
  variant = 'full',
}) {
  const fullDirect = src ? apiImageUrl(src) : ''
  const mediumDirect = src ? apiMediumUrl(src) : ''
  const thumbDirect = src ? apiThumbnailUrl(src) : ''
  const mediumLegacy = src ? apiVariantUrlLegacy(src, 'medium') : ''
  const thumbLegacy = src ? apiVariantUrlLegacy(src, 'thumbs') : ''
  const useBlob = fullDirect.includes('ngrok')
  const wantFull = variant === 'full'

  const [thumbSrc, setThumbSrc] = useState('')
  const [displaySrc, setDisplaySrc] = useState('')
  const [fullReady, setFullReady] = useState(false)

  useEffect(() => {
    if (!src || !fullDirect) {
      setThumbSrc('')
      setDisplaySrc('')
      setFullReady(false)
      return
    }

    setThumbSrc('')
    setDisplaySrc('')
    setFullReady(false)

    let cancelled = false
    let blobUrls = []

    const trackBlob = (url) => {
      if (url.startsWith('blob:')) blobUrls.push(url)
      return url
    }

    const run = async () => {
      try {
        try {
          const thumb = await loadVariantStep(src, 'thumb', thumbDirect, thumbLegacy, useBlob)
          if (!cancelled) setThumbSrc(trackBlob(thumb))
        } catch {
          /* thumb još nije generisan */
        }

        try {
          const medium = await loadVariantStep(src, 'medium', mediumDirect, mediumLegacy, useBlob)
          if (cancelled) return
          setDisplaySrc(trackBlob(medium))
          if (!wantFull) {
            setFullReady(true)
            return
          }
        } catch {
          /* medium još nije generisan */
        }

        const fullCached = getCachedVariantUrl(src, 'full')
        const full = fullCached || (await resolveUrl(fullDirect, useBlob))
        await loadImageElement(full)
        if (cancelled) return
        setDisplaySrc(trackBlob(full))
        setFullReady(true)
      } catch {
        if (!cancelled) {
          setThumbSrc('')
          setDisplaySrc('')
        }
      }
    }

    run()

    return () => {
      cancelled = true
      for (const url of blobUrls) URL.revokeObjectURL(url)
      blobUrls = []
    }
  }, [src, fullDirect, mediumDirect, thumbDirect, mediumLegacy, thumbLegacy, useBlob, wantFull])

  if (!thumbSrc && !displaySrc) {
    return <span className={`api-image api-image--pending${className ? ` ${className}` : ''}`} style={style} aria-hidden />
  }

  const wrapClass = [
    'api-image',
    fullReady ? 'api-image--ready' : '',
    !thumbSrc ? 'api-image--no-thumb' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={wrapClass} style={style}>
      {thumbSrc && !fullReady ? (
        <img
          src={thumbSrc}
          alt=""
          aria-hidden
          className="api-image__placeholder"
          loading={loading}
          decoding="async"
        />
      ) : null}
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={alt}
          className={['api-image__full', imgClassName].filter(Boolean).join(' ')}
          loading={loading}
          decoding="async"
        />
      ) : null}
    </span>
  )
}
