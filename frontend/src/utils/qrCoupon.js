/** QR campaign: open site with ?qr=hny15 → popup + checkout autofill for HNY15. */

export const QR_COUPON_CODE = 'HNY15'
export const QR_COUPON_PARAM = 'qr'
export const QR_COUPON_PARAM_VALUE = 'hny15'
export const QR_COUPON_STORAGE_KEY = 'honey_qr_coupon'
export const QR_COUPON_OPT_OUT_KEY = 'honey_qr_coupon_opt_out'
export const QR_POPUP_DISMISSED_KEY = 'honey_qr_popup_dismissed'

/** True when this browser tab was opened via the QR campaign URL. */
export function getQrCouponCode() {
  try {
    const code = sessionStorage.getItem(QR_COUPON_STORAGE_KEY)
    return code && code.trim() ? code.trim().toUpperCase() : null
  } catch {
    return null
  }
}

export function setQrCouponCode(code = QR_COUPON_CODE) {
  try {
    sessionStorage.setItem(QR_COUPON_STORAGE_KEY, String(code).trim().toUpperCase())
  } catch {
    /* ignore */
  }
}

/** User removed the auto-applied coupon — do not force it back. */
export function isQrCouponOptedOut() {
  try {
    return sessionStorage.getItem(QR_COUPON_OPT_OUT_KEY) === '1'
  } catch {
    return false
  }
}

export function setQrCouponOptedOut(optedOut = true) {
  try {
    if (optedOut) sessionStorage.setItem(QR_COUPON_OPT_OUT_KEY, '1')
    else sessionStorage.removeItem(QR_COUPON_OPT_OUT_KEY)
  } catch {
    /* ignore */
  }
}

export function isQrPopupDismissed() {
  try {
    return sessionStorage.getItem(QR_POPUP_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function setQrPopupDismissed(dismissed = true) {
  try {
    if (dismissed) sessionStorage.setItem(QR_POPUP_DISMISSED_KEY, '1')
    else sessionStorage.removeItem(QR_POPUP_DISMISSED_KEY)
  } catch {
    /* ignore */
  }
}

const isQrParamName = (key) => key.trim().toLowerCase() === QR_COUPON_PARAM

/** Accepts both `hny15` and the coupon code itself, in any letter case. */
function isQrCampaignValue(raw) {
  const value = (raw ?? '').trim().toLowerCase()
  return value === QR_COUPON_PARAM_VALUE || value === QR_COUPON_CODE.toLowerCase()
}

/**
 * Campaign value from a query string, or null. The param name is matched
 * case-insensitively because some scanners hand over `?QR=hny15`.
 */
export function readQrCouponParam(search) {
  for (const [key, value] of new URLSearchParams(search).entries()) {
    if (isQrParamName(key) && isQrCampaignValue(value)) return value
  }
  return null
}

function withoutQrParam(search) {
  const params = new URLSearchParams(search)
  for (const key of [...params.keys()]) {
    if (isQrParamName(key)) params.delete(key)
  }
  return params
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Phone QR scanners do not always hand over a clean query string: some
 * percent-encode it into the path (`/%3Fqr=hny15`), others push it into the
 * hash (`/#?qr=hny15`). In both shapes `location.search` is empty, the router
 * sees an unknown path, the catch-all route replaces it with `/`, and the
 * campaign silently never starts — which is why scanning failed while typing
 * the same link worked. Rewrite those shapes into a real query string before
 * the router mounts. Returns true when the URL was rewritten.
 */
export function normalizeQrCouponUrl() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return false

  const { pathname, search, hash } = window.location
  if (readQrCouponParam(search)) return false

  const decodedPath = safeDecode(pathname)
  const marker = decodedPath.indexOf('?')

  const candidates = []
  if (marker !== -1) {
    candidates.push([decodedPath.slice(0, marker), decodedPath.slice(marker + 1)])
  }
  if (hash) candidates.push([pathname, hash.replace(/^#\??/, '')])

  for (const [base, query] of candidates) {
    if (!readQrCouponParam(query)) continue

    const params = withoutQrParam(query)
    params.set(QR_COUPON_PARAM, QR_COUPON_PARAM_VALUE)
    window.history.replaceState(null, '', `${base || '/'}?${params.toString()}`)
    return true
  }

  return false
}

/**
 * If the current URL has ?qr=hny15 (case-insensitive), activate the campaign
 * and return true so the win popup can be shown. Strips the param via replace.
 */
export function consumeQrCouponParam(search, navigate) {
  if (!readQrCouponParam(search)) return false

  setQrCouponCode(QR_COUPON_CODE)
  // Fresh QR scan: allow auto-apply again and show popup again.
  setQrCouponOptedOut(false)
  setQrPopupDismissed(false)

  const next = withoutQrParam(search).toString()
  navigate(
    { search: next ? `?${next}` : '', hash: window.location.hash },
    { replace: true },
  )
  return true
}
