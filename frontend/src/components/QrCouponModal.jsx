import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { QR_COUPON_CODE, setQrPopupDismissed } from '../utils/qrCoupon'

/**
 * Shown only when the site is opened via the QR campaign URL (?qr=hny15).
 * Closing dismisses the modal; checkout still auto-applies HNY15 once
 * (user can remove it — it will not be forced back).
 */
export default function QrCouponModal({ open, onClose }) {
  const handleClose = useCallback((e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    setQrPopupDismissed(true)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.body.classList.add('is-site-popup-open')
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('is-site-popup-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, handleClose])

  if (!open) return null

  return createPortal(
    <div className="qr-coupon-root" role="presentation" onClick={handleClose}>
      <div
        className="qr-coupon-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-coupon-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="qr-coupon-close"
          onClick={handleClose}
          onPointerDown={handleClose}
          aria-label="Zatvori"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="qr-coupon-body">
          <p className="qr-coupon-eyebrow">Čestitamo!</p>
          <h2 id="qr-coupon-title" className="qr-coupon-title">
            Osvojili ste kupon
          </h2>
          <p className="qr-coupon-code" aria-label={`Kod kupona ${QR_COUPON_CODE}`}>
            {QR_COUPON_CODE}
          </p>
          <p className="qr-coupon-desc">
            Popust od <strong>15%</strong> na porudžbinu. Kod će biti automatski
            primenjen na stranici za plaćanje (možete ga ukloniti ako želite).
          </p>
          <button type="button" className="qr-coupon-action" onClick={handleClose}>
            Nastavi kupovinu
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
