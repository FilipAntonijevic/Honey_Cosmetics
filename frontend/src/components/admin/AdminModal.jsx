import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Admin modal rendered via portal on document.body so it stays
 * viewport-centered (not clipped/shifted by .adm-main scroll area).
 */
export default function AdminModal({
  open,
  onClose,
  children,
  className = '',
  labelledBy,
}) {
  useEffect(() => {
    if (!open) return
    document.body.classList.add('is-adm-modal-open')
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('is-adm-modal-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="adm-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className={`adm-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
