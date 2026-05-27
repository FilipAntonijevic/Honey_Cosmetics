import { createPortal } from 'react-dom'

export default function Toast({ message }) {
  if (!message) return null
  return createPortal(
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>,
    document.body,
  )
}
