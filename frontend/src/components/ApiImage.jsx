import { useEffect, useState } from 'react'
import axios from 'axios'
import { apiImageUrl } from '../lib/assets'
import { getPreloadedImage } from '../lib/imagePreload'

/** Učitava /images/... sa API-ja; za ngrok koristi fetch + blob (img tag ne može poslati ngrok header). */
export default function ApiImage({ src, alt = '', className, style, loading }) {
  const directUrl = src ? apiImageUrl(src) : ''
  const useBlob = directUrl.includes('ngrok')

  const [displaySrc, setDisplaySrc] = useState(useBlob ? '' : directUrl)

  useEffect(() => {
    if (!src || !directUrl) {
      setDisplaySrc('')
      return
    }

    const cached = getPreloadedImage(src)
    if (cached) {
      setDisplaySrc(cached)
      return
    }

    if (!useBlob) {
      setDisplaySrc(directUrl)
      return
    }

    let cancelled = false
    let objectUrl = ''

    axios
      .get(directUrl, {
        responseType: 'blob',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
      .then((res) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(res.data)
        setDisplaySrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setDisplaySrc('')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, directUrl, useBlob])

  if (!displaySrc) return null

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
    />
  )
}
