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

/**
 * If the current URL has ?qr=hny15 (case-insensitive), activate the campaign
 * and return true so the win popup can be shown. Strips the param via replace.
 */
export function consumeQrCouponParam(search, navigate) {
  const params = new URLSearchParams(search)
  const raw = (params.get(QR_COUPON_PARAM) ?? '').trim().toLowerCase()
  if (raw !== QR_COUPON_PARAM_VALUE && raw !== QR_COUPON_CODE.toLowerCase()) {
    return false
  }

  setQrCouponCode(QR_COUPON_CODE)
  // Fresh QR scan: allow auto-apply again and show popup again.
  setQrCouponOptedOut(false)
  setQrPopupDismissed(false)

  params.delete(QR_COUPON_PARAM)
  const next = params.toString()
  navigate(
    { search: next ? `?${next}` : '', hash: window.location.hash },
    { replace: true },
  )
  return true
}
