import { forwardRef, useLayoutEffect, useRef } from 'react'

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

      const width = box.clientWidth
      let size = maxRem
      el.style.fontSize = `${size}rem`
      el.style.whiteSpace = 'nowrap'
      el.style.overflow = 'hidden'
      el.style.display = 'block'
      el.style.maxWidth = '100%'

      while (size > minRem && el.scrollWidth > width + 1) {
        size -= 0.02
        el.style.fontSize = `${size}rem`
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [children, maxRem, minRem])

  return (
    <Component ref={setRef} style={style} {...props}>
      {children}
    </Component>
  )
})

export default FitOneLineTitle
