import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/metaPixel'

/** SPA PageView on client routes only. Admin is excluded. Never blocks rendering. */
export default function MetaPixelTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    trackPageView()
  }, [pathname])

  return null
}
