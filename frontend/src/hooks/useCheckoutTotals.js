import { useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { computeCheckoutTotals } from '../utils/shipping'

export default function useCheckoutTotals(siteLinks = {}) {
  const { checkoutSubtotal, checkoutDiscount } = useStore()

  return useMemo(
    () => {
      const threshold = Number(siteLinks.freeShippingThreshold)
      const shippingCost = Number(siteLinks.shippingCost)
      const settingsReady =
        siteLinks.freeShippingThreshold != null
        && siteLinks.shippingCost != null
        && Number.isFinite(threshold)
        && Number.isFinite(shippingCost)
      return computeCheckoutTotals({
        subtotal: checkoutSubtotal,
        discount: checkoutDiscount,
        // Dok podešavanja nisu potvrđena, ne prikazuj lažnu besplatnu
        // dostavu niti hardkodovanu cenu. Checkout ionako blokira submit.
        freeShippingThreshold: settingsReady ? threshold : Number.POSITIVE_INFINITY,
        shippingCost: settingsReady ? shippingCost : 0,
      })
    },
    [checkoutSubtotal, checkoutDiscount, siteLinks.freeShippingThreshold, siteLinks.shippingCost],
  )
}
