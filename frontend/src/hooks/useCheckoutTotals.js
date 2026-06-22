import { useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { computeCheckoutTotals } from '../utils/shipping'

export default function useCheckoutTotals(siteLinks = {}) {
  const { checkoutSubtotal, checkoutDiscount } = useStore()

  return useMemo(
    () => computeCheckoutTotals({
      subtotal: checkoutSubtotal,
      discount: checkoutDiscount,
      freeShippingThreshold: siteLinks.freeShippingThreshold ?? 10000,
      shippingCost: siteLinks.shippingCost ?? 430,
    }),
    [checkoutSubtotal, checkoutDiscount, siteLinks.freeShippingThreshold, siteLinks.shippingCost],
  )
}
