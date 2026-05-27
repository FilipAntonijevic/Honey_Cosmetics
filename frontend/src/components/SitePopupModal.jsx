import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import ApiImage from './ApiImage'
import { useStore } from '../context/StoreContext'

const DISMISS_KEY = 'honey_site_popup_dismissed_id'

export function getDismissedSitePopupId() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return null
    const id = Number(raw)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

export function dismissSitePopup(id) {
  try {
    localStorage.setItem(DISMISS_KEY, String(id))
  } catch {
    /* ignore */
  }
}

export default function SitePopupModal({ popup, onClose }) {
  const navigate = useNavigate()
  const { setToast } = useStore()
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!popup) return
    document.body.classList.add('is-site-popup-open')
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('is-site-popup-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [popup, onClose])

  if (!popup) return null

  const handleClose = () => {
    dismissSitePopup(popup.id)
    onClose()
  }

  const handleProduct = () => {
    if (!popup.productId) return
    dismissSitePopup(popup.id)
    onClose()
    navigate(`/products/${popup.productId}`)
  }

  const handleCopyCoupon = async () => {
    if (!popup.couponCode) return
    try {
      await navigator.clipboard.writeText(popup.couponCode)
      setToast('Kod je kopiran.')
    } catch {
      setToast('Kopiranje nije uspelo.')
    }
  }

  const actionLabel = popup.type === 'Product'
    ? 'Pogledaj proizvod'
    : popup.type === 'Coupon'
      ? 'Kopiraj kod'
      : 'Nastavi na sajt'

  const handleAction = () => {
    if (popup.type === 'Product') handleProduct()
    else if (popup.type === 'Coupon') handleCopyCoupon()
    else handleClose()
  }

  const desktopSrc = popup.imageUrl
  const mobileSrc = popup.mobileImageUrl || popup.imageUrl

  return createPortal(
    <div className="site-popup-root" role="presentation">
      <div
        className="site-popup-backdrop"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div
        className="site-popup-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Obaveštenje"
      >
        <button
          type="button"
          className="site-popup-close"
          onClick={handleClose}
          aria-label="Zatvori"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="site-popup-image-wrap">
          <ApiImage
            src={isMobile ? mobileSrc : desktopSrc}
            alt=""
            className="site-popup-image"
            variant="full"
          />
          <div className="site-popup-footer">
            <button type="button" className="site-popup-action" onClick={handleAction}>
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
