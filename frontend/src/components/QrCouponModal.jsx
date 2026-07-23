import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { QR_COUPON_CODE } from '../utils/qrCoupon'

/**
 * Shown only when the site is opened via the QR campaign URL (?qr=hny15).
 * Closing dismisses the modal; checkout still pre-fills HNY15 in the input
 * (user must click Primeni — coupon is not auto-applied).
 */
export default function QrCouponModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    document.body.classList.add('is-site-popup-open')
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('is-site-popup-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const handleClose = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    onClose()
  }

  return createPortal(
    <div className="site-popup-root qr-coupon-root" role="presentation">
      <div
        className="site-popup-backdrop"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div
        className="site-popup-dialog qr-coupon-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-coupon-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="site-popup-close qr-coupon-close"
          onClick={handleClose}
          aria-label="Zatvori"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
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
            Popust od <strong>15%</strong> na porudžbinu. Kod će biti unet na
            stranici za plaćanje — pritisnite <strong>Primeni</strong> da ga
            iskoristite.
          </p>
          <button type="button" className="site-popup-action qr-coupon-action" onClick={handleClose}>
            Nastavi kupovinu
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
