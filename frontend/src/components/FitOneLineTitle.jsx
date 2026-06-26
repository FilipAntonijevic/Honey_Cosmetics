import { forwardRef, useLayoutEffect, useRef } from 'react'

const TITLE_ROW_SELECTOR = '.pop-head-row, .community-banner__title-row'
const MOBILE_FILL_MQ = '(max-width: 768px)'
const MOBILE_FILL_RATIO = 0.9

function isMobileEdgeFill() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_FILL_MQ).matches
}

function viewportWidth() {
  return Math.max(window.visualViewport?.width ?? document.documentElement.clientWidth, 60)
}

function measureTextWidth(el) {
  el.style.display = 'inline-block'
  el.style.width = 'auto'
  el.style.maxWidth = 'none'
  return el.scrollWidth
}

function restoreButtonLabelLayout(el) {
  if (!el.classList.contains('product-card-action__label')) return
  el.style.display = 'inline-flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.lineHeight = '1'
  el.style.width = '100%'
  el.style.transform = ''
}

function fitTextToWidth(el, width, maxRem, minRem) {
  const fillEdge = isMobileEdgeFill() && Boolean(el.closest(TITLE_ROW_SELECTOR))
  const sizeCap = fillEdge ? 10 : maxRem

  el.style.whiteSpace = 'nowrap'
  el.style.overflow = 'visible'
  el.style.transform = ''
  el.style.textAlign = 'center'
  el.style.boxSizing = 'border-box'

  let letterSpacing = fillEdge ? 0.08 : 0.04
  let size = minRem

  const apply = () => {
    el.style.fontSize = `${size}rem`
    el.style.letterSpacing = `${letterSpacing}em`
    return measureTextWidth(el)
  }

  apply()

  if (fillEdge) {
    while (size < sizeCap && apply() < width - 1) {
      size += 0.025
    }
    while (letterSpacing <= 0.32 && apply() < width - 1) {
      letterSpacing += 0.01
    }
    while (size > minRem && apply() > width + 1) {
      size -= 0.025
    }
    while (letterSpacing > 0.04 && apply() > width + 1) {
      letterSpacing -= 0.01
    }
  } else {
    while (size < sizeCap && apply() < width - 1) {
      size += 0.02
    }
    while (size > minRem && apply() > width + 1) {
      size -= 0.02
    }
    while (letterSpacing <= 0.18 && apply() < width - 1) {
      letterSpacing += 0.005
    }
    while (letterSpacing > 0.03 && apply() > width + 1) {
      letterSpacing -= 0.005
    }
    if (apply() > width + 1) {
      const scale = Math.max(0.84, width / apply())
      el.style.transform = `scaleX(${scale})`
      el.style.transformOrigin = 'center center'
    }
  }

  const box = el.parentElement
  if (box) {
    box.style.textAlign = 'center'
    box.style.width = fillEdge ? `${width}px` : ''
    box.style.maxWidth = fillEdge ? `${width}px` : ''
  }

  restoreButtonLabelLayout(el)
}

const FitOneLineTitle = forwardRef(function FitOneLineTitle(
  { as: Component = 'span', maxRem = 0.95, minRem = 0.55, children, style, ...props },
  forwardedRef,
) {
  const innerRef = useRef(null)

  const setRef = (node) => {
    innerRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return

    const fit = () => {
      const box = el.parentElement
      if (!box) return

      const row = box.closest(TITLE_ROW_SELECTOR)
      const fillEdge = isMobileEdgeFill() && row
      const viewport = fillEdge ? viewportWidth() : Math.max(box.clientWidth, 60)
      const width = fillEdge ? viewport * MOBILE_FILL_RATIO : viewport

      if (fillEdge && row) {
        row.style.width = `${viewport}px`
        row.style.maxWidth = `${viewport}px`
      }

      fitTextToWidth(el, width, maxRem, minRem)
    }

    fit()

    const ro = new ResizeObserver(fit)
    if (el.parentElement) ro.observe(el.parentElement)
    const row = el.parentElement?.closest(TITLE_ROW_SELECTOR)
    if (row) ro.observe(row)

    const mq = window.matchMedia(MOBILE_FILL_MQ)
    mq.addEventListener('change', fit)
    window.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('resize', fit)

    return () => {
      ro.disconnect()
      mq.removeEventListener('change', fit)
      window.removeEventListener('resize', fit)
      window.visualViewport?.removeEventListener('resize', fit)
    }
  }, [children, maxRem, minRem])

  return (
    <Component ref={setRef} style={style} {...props}>
      {children}
    </Component>
  )
})

export default FitOneLineTitle
