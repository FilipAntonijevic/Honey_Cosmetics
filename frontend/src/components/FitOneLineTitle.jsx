import { forwardRef, useLayoutEffect, useRef } from 'react'

const TITLE_ROW_SELECTOR = '.pop-head-row, .community-banner__title-row'
const MOBILE_MQ = '(max-width: 768px)'

function isMobile() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches
}

function titleFitWidth(box) {
  const row = box.closest(TITLE_ROW_SELECTOR)
  if (!row) return Math.max(box.clientWidth, 60)

  const rowStyle = getComputedStyle(row)
  const gap = parseFloat(rowStyle.columnGap || rowStyle.gap) || 0
  const pad =
    parseFloat(rowStyle.paddingLeft) + parseFloat(rowStyle.paddingRight)
  const lineEls = row.querySelectorAll('.pop-head-line, .community-banner__title-line')
  let lineUsed = 0
  lineEls.forEach((line) => {
    lineUsed += line.offsetWidth
  })
  const gaps = gap * Math.max(0, row.children.length - 1)
  const fromLines = row.clientWidth - pad - lineUsed - gaps
  if (fromLines > 60 && lineUsed > 0) return fromLines

  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const lineMin = parseFloat(rowStyle.getPropertyValue('--title-line-min')) || 1.25
  const sideReserve = lineMin * rootSize * 2 + gaps
  return Math.max(row.clientWidth - pad - sideReserve, 60)
}

function measureTextWidth(el) {
  el.style.display = 'inline-block'
  el.style.width = 'auto'
  el.style.maxWidth = 'none'
  return el.scrollWidth
}

function restoreCardTextLayout(el) {
  if (el.classList.contains('product-card-action__label')) {
    el.style.display = 'inline-flex'
    el.style.alignItems = 'center'
    el.style.justifyContent = 'center'
    el.style.lineHeight = '1'
    el.style.width = '100%'
    el.style.transform = ''
    return
  }

  if (el.classList.contains('product-card-title')) {
    el.style.display = 'block'
    el.style.textAlign = 'left'
    el.style.lineHeight = '1.25'
    el.style.width = '100%'
    el.style.transform = ''
    return
  }

  if (
    el.classList.contains('pop-title') ||
    el.classList.contains('community-banner__title')
  ) {
    el.style.display = 'block'
    el.style.textAlign = 'center'
    el.style.lineHeight = '1'
    el.style.width = '100%'
    el.style.transform = ''
  }
}

function fitTextToWidth(el, width, maxRem, minRem, { fillWidth = true, allowScaleX = true } = {}) {
  const isProductTitle = el.classList.contains('product-card-title')

  el.style.whiteSpace = 'nowrap'
  el.style.overflow = 'visible'
  el.style.transform = ''
  el.style.textAlign = isProductTitle ? 'left' : 'center'
  el.style.boxSizing = 'border-box'

  let letterSpacing = isProductTitle ? 0 : 0.04
  let size = minRem

  const apply = () => {
    el.style.fontSize = `${size}rem`
    el.style.letterSpacing = `${letterSpacing}em`
    return measureTextWidth(el)
  }

  apply()

  while (size < maxRem && apply() < width - 1) {
    size += 0.02
  }
  while (size > minRem && apply() > width + 1) {
    size -= 0.02
  }
  if (fillWidth) {
    while (letterSpacing <= 0.18 && apply() < width - 1) {
      letterSpacing += 0.005
    }
  }
  while (letterSpacing > 0.03 && apply() > width + 1) {
    letterSpacing -= 0.005
  }
  if (allowScaleX && apply() > width + 1) {
    const scale = Math.max(0.84, width / apply())
    el.style.transform = `scaleX(${scale})`
    el.style.transformOrigin = 'center center'
  }

  const box = el.parentElement
  if (box) {
    box.style.textAlign = isProductTitle ? 'left' : 'center'
    box.style.width = ''
    box.style.maxWidth = ''
  }

  restoreCardTextLayout(el)
}

const FitOneLineTitle = forwardRef(function FitOneLineTitle(
  {
    as: Component = 'span',
    maxRem = 0.95,
    minRem = 0.55,
    fillWidth = true,
    allowScaleX = true,
    children,
    style,
    ...props
  },
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
      const mobile = isMobile()
      const isSectionTitle =
        el.classList.contains('pop-title') ||
        el.classList.contains('community-banner__title')
      const effectiveMaxRem = mobile
        ? Math.min(maxRem, 0.81)
        : maxRem
      const effectiveMinRem = mobile
        ? Math.min(minRem, 0.36)
        : isSectionTitle
          ? minRem * 1.44
          : minRem
      const isButtonLabel = el.classList.contains('product-card-action__label')
      const isProductTitle = el.classList.contains('product-card-title')
      const width = isButtonLabel
        ? Math.max(box.clientWidth - 6, 40)
        : isProductTitle
          ? Math.max(box.clientWidth - 2, 40)
          : titleFitWidth(box)

      if (row) {
        row.style.width = ''
        row.style.maxWidth = ''
      }

      fitTextToWidth(el, width, effectiveMaxRem, effectiveMinRem, {
        fillWidth: isButtonLabel || isProductTitle || isSectionTitle ? false : fillWidth,
        allowScaleX: isButtonLabel || isProductTitle ? false : allowScaleX,
      })
    }

    fit()

    const ro = new ResizeObserver(fit)
    if (el.parentElement) ro.observe(el.parentElement)
    const row = el.parentElement?.closest(TITLE_ROW_SELECTOR)
    if (row) ro.observe(row)

    const mq = window.matchMedia(MOBILE_MQ)
    mq.addEventListener('change', fit)
    window.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('resize', fit)

    return () => {
      ro.disconnect()
      mq.removeEventListener('change', fit)
      window.removeEventListener('resize', fit)
      window.visualViewport?.removeEventListener('resize', fit)
    }
  }, [children, maxRem, minRem, fillWidth, allowScaleX])

  return (
    <Component ref={setRef} style={style} {...props}>
      {children}
    </Component>
  )
})

export default FitOneLineTitle
