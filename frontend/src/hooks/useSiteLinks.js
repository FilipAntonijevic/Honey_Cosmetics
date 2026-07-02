import { useEffect, useState } from 'react'
import api from '../api'

const parseEmailList = (raw) =>
  String(raw || '')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)

const EMPTY = {
  instagramUrl: '',
  tikTokUrl: '',
  emailAddress: '',
  infoEmails: [],
  officeEmail: '',
  phoneNumber: '',
  complaintsEmail: '',
  whatsAppNumber: '',
  viberNumber: '',
  freeShippingThreshold: 10000,
  shippingCost: 430,
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
        const infoEmails = parseEmailList(data?.infoEmails)
        const primaryEmail = infoEmails[0] || data?.emailAddress || ''
        setData({
          instagramUrl: data?.instagramUrl ?? '',
          tikTokUrl: data?.tikTokUrl ?? '',
          emailAddress: primaryEmail,
          infoEmails,
          officeEmail: data?.officeEmail ?? '',
          phoneNumber: data?.phoneNumber ?? '',
          complaintsEmail: data?.complaintsEmail ?? '',
          whatsAppNumber: data?.whatsAppNumber ?? '',
          viberNumber: data?.viberNumber ?? '',
          freeShippingThreshold: data?.freeShippingThreshold != null ? Number(data.freeShippingThreshold) : 10000,
          shippingCost: data?.shippingCost != null ? Number(data.shippingCost) : 430,
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
