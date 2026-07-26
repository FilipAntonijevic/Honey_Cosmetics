import { useCallback, useEffect, useState } from 'react'
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
  freeShippingThreshold: null,
  shippingCost: null,
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
  const [error, setError] = useState(null)
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setRevision((value) => value + 1)
  }, [])

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
          freeShippingThreshold: data?.freeShippingThreshold != null ? Number(data.freeShippingThreshold) : null,
          shippingCost: data?.shippingCost != null ? Number(data.shippingCost) : null,
          notificationBannerText: data?.notificationBannerText ?? '',
          notificationBannerEnabled: data?.notificationBannerEnabled ?? true,
          bankTransferRecipientName: data?.bankTransferRecipientName ?? '',
          bankTransferRecipientAddress: data?.bankTransferRecipientAddress ?? '',
          bankTransferAccountNumber: data?.bankTransferAccountNumber ?? '',
          bankTransferPurpose: data?.bankTransferPurpose ?? '',
        })
      })
      .catch(() => {
        if (!cancelled) {
          setData(EMPTY)
          setError('Podešavanja sajta nisu dostupna.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [revision])

  return { ...data, loading, error, retry }
}
