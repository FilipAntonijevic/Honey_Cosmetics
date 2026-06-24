import { hasBankTransferInfo } from './BankTransferSlip'
import UplatnicaSlip from './UplatnicaSlip'

/**
 * Prikaz podataka za bankovni prenos — uplatnica ili poruka dok se učitava / nije podešeno.
 */
export default function BankTransferPaymentInfo({
  template,
  loading = false,
  orderId,
  amount,
  payerName,
  className = '',
  layout = 'default',
}) {
  if (loading) {
    return (
      <p className={`bank-pay-loading${className ? ` ${className}` : ''}`}>
        Učitavanje podataka za uplatu…
      </p>
    )
  }

  if (hasBankTransferInfo(template)) {
    return (
      <UplatnicaSlip
        template={template}
        orderId={orderId}
        amount={amount}
        payerName={payerName}
        layout={layout}
      />
    )
  }

  return (
    <p className={`co-payment-hint co-payment-hint--inline bank-pay-missing${className ? ` ${className}` : ''}`}>
      Podaci za bankovni prenos trenutno nisu dostupni. Molimo sačekajte potvrdu porudžbine na email
      ili nas kontaktirajte pre uplate.
    </p>
  )
}
