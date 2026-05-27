import { useEffect, useState } from 'react'
import api from '../api'

const EMPTY = {
  instagramUrl: '',
  tikTokUrl: '',
  emailAddress: '',
  phoneNumber: '',
  complaintsEmail: '',
  whatsAppNumber: '',
  viberNumber: '',
  freeShippingThreshold: 10000,
  notificationBannerText: '',
  notificationBannerEnabled: true,
  bankTransferRecipientName: '',
  bankTransferRecipientAddress: '',
  bankTransferAccountNumber: '',
  bankTransferPurpose: '',
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
          whatsAppNumber: data?.whatsAppNumber ?? '',
          viberNumber: data?.viberNumber ?? '',
          freeShippingThreshold: data?.freeShippingThreshold != null ? Number(data.freeShippingThreshold) : 10000,
          notificationBannerText: data?.notificationBannerText ?? '',
          notificationBannerEnabled: data?.notificationBannerEnabled ?? true,
          bankTransferRecipientName: data?.bankTransferRecipientName ?? '',
          bankTransferRecipientAddress: data?.bankTransferRecipientAddress ?? '',
          bankTransferAccountNumber: data?.bankTransferAccountNumber ?? '',
          bankTransferPurpose: data?.bankTransferPurpose ?? '',
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
