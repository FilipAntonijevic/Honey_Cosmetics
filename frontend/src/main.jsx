import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { installNumericInputGuard } from './utils/numericInput'
import { normalizeQrCouponUrl } from './utils/qrCoupon'

installNumericInputGuard()

// Must run before the router mounts, so a scanner-mangled QR link is repaired
// instead of being discarded by the catch-all route.
normalizeQrCouponUrl()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
