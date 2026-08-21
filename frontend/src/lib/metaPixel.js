/** Meta Pixel — browser-only, never throws, never blocks checkout/cart/API. */

export const META_PIXEL_ID = (
  import.meta.env.VITE_META_PIXEL_ID || '925941173133063'
).trim()

export const META_PIXEL_CURRENCY = 'RSD'

const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js'

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/** Local Vite must not pollute the live Pixel; production + preview do fire. */
function shouldTrack() {
  if (!isBrowser() || !META_PIXEL_ID) return false
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1'
}

function installStub() {
  if (window.fbq) return
  const fbq = function (...args) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  }
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  window.fbq = fbq
  if (!window._fbq) window._fbq = fbq
}

function loadScript() {
  if (document.getElementById('meta-pixel-script')) return
  const script = document.createElement('script')
  script.id = 'meta-pixel-script'
  script.async = true
  script.src = SCRIPT_SRC
  script.onerror = () => {}
  const first = document.getElementsByTagName('script')[0]
  if (first?.parentNode) first.parentNode.insertBefore(script, first)
  else document.head.appendChild(script)
}

export function initMetaPixel() {
  try {
    if (!shouldTrack()) return
    installStub()
    loadScript()
    window.fbq('init', META_PIXEL_ID)
  } catch {
    /* Pixel must never take down the shop */
  }
}

export function track(event, params, options) {
  try {
    if (!shouldTrack() || !window.fbq || !event) return
    if (params && options) window.fbq('track', event, params, options)
    else if (params) window.fbq('track', event, params)
    else window.fbq('track', event)
  } catch {
    /* ignore */
  }
}

export function trackCustom(event, params) {
  try {
    if (!shouldTrack() || !window.fbq || !event) return
    if (params) window.fbq('trackCustom', event, params)
    else window.fbq('trackCustom', event)
  } catch {
    /* ignore */
  }
}

function asId(value) {
  return String(value ?? '').trim()
}

function money(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0
}

function contentsFromItems(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      const id = asId(item?.id ?? item?.productId)
      if (!id) return null
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1))
      const price = money(item.price ?? item.unitPrice)
      return { id, quantity, item_price: price }
    })
    .filter(Boolean)
}

export function trackPageView() {
  track('PageView')
}

export function trackViewContent(product) {
  try {
    if (!product?.id) return
    const qty = 1
    track('ViewContent', {
      content_ids: [asId(product.id)],
      content_name: product.name || '',
      content_type: 'product',
      content_category: product.category || product.productType || '',
      value: money(product.price),
      currency: META_PIXEL_CURRENCY,
      contents: contentsFromItems([{ ...product, quantity: qty }]),
    })
  } catch {
    /* ignore */
  }
}

export function trackAddToCart(product, quantity = 1) {
  try {
    if (!product?.id) return
    const qty = Math.max(1, Math.floor(Number(quantity) || 1))
    track('AddToCart', {
      content_ids: [asId(product.id)],
      content_name: product.name || '',
      content_type: 'product',
      value: money(Number(product.price) * qty),
      currency: META_PIXEL_CURRENCY,
      contents: contentsFromItems([{ ...product, quantity: qty }]),
    })
  } catch {
    /* ignore */
  }
}

export function trackAddToWishlist(product) {
  try {
    if (!product?.id) return
    track('AddToWishlist', {
      content_ids: [asId(product.id)],
      content_name: product.name || '',
      content_type: 'product',
      value: money(product.price),
      currency: META_PIXEL_CURRENCY,
    })
  } catch {
    /* ignore */
  }
}

export function trackInitiateCheckout(items, value) {
  try {
    const contents = contentsFromItems(items)
    if (!contents.length) return
    track('InitiateCheckout', {
      content_ids: contents.map((c) => c.id),
      content_type: 'product',
      num_items: contents.reduce((sum, c) => sum + c.quantity, 0),
      value: money(value),
      currency: META_PIXEL_CURRENCY,
      contents,
    })
  } catch {
    /* ignore */
  }
}

export function trackPurchase({ orderId, value, items }) {
  try {
    const contents = contentsFromItems(items)
    const eventID = orderId != null ? `purchase-${orderId}` : undefined
    track(
      'Purchase',
      {
        content_ids: contents.map((c) => c.id),
        content_type: 'product',
        num_items: contents.reduce((sum, c) => sum + c.quantity, 0),
        value: money(value),
        currency: META_PIXEL_CURRENCY,
        contents,
      },
      eventID ? { eventID } : undefined,
    )
  } catch {
    /* ignore */
  }
}

export function trackSearch(searchString) {
  try {
    const q = String(searchString || '').trim()
    if (!q) return
    track('Search', { search_string: q })
  } catch {
    /* ignore */
  }
}

export function trackCompleteRegistration() {
  track('CompleteRegistration', { status: true })
}

export function trackQrCampaign() {
  trackCustom('QrHny15')
}
