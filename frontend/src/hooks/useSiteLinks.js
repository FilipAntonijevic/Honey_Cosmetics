import { useEffect, useState } from 'react'
import api from '../api'

const EMPTY = {
  instagramUrl: '',
  tikTokUrl: '',
  emailAddress: '',
  phoneNumber: '',
  complaintsEmail: '',
}

/**
 * Fetches the public site links (email, phone, complaints email, social).
 * Returns the latest values plus a `loading` flag so callers can avoid
 * rendering placeholder dashes while the request is in flight.
 */
export default function useSiteLinks() {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get('/site/links')
      .then(({ data }) => {
        if (cancelled) return
        setData({
          instagramUrl: data?.instagramUrl ?? '',
          tikTokUrl: data?.tikTokUrl ?? '',
          emailAddress: data?.emailAddress ?? '',
          phoneNumber: data?.phoneNumber ?? '',
          complaintsEmail: data?.complaintsEmail ?? '',
        })
      })
      .catch(() => {
        if (!cancelled) setData(EMPTY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { ...data, loading }
}
