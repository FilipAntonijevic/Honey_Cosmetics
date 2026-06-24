import { hasBankTransferInfo } from './BankTransferSlip'

const fmtMoney = (n) =>
  Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Mini simulirana srpska uplatnica (nalog za uplatu) — uvek široki pravougaonik,
 * proporcije kao na papirnatom obrascu, samo umanjena.
 */
export default function UplatnicaSlip({ template, orderId, amount, payerName }) {
  if (!hasBankTransferInfo(template)) return null

  const recipient = template.bankTransferRecipientName?.trim() || '—'
  const address = template.bankTransferRecipientAddress?.trim()
  const account = template.bankTransferAccountNumber?.trim() || '—'
  const purposeBase = template.bankTransferPurpose?.trim() || 'Uplata porudžbine'
  const purpose = orderId != null ? `${purposeBase} #${orderId}` : purposeBase
  const refNumber = orderId != null ? String(orderId) : null

  return (
    <div className="uplatnica" role="img" aria-label="Primer uplatnice za bankovni prenos">
      <div className="uplatnica__sheet">
        <div className="uplatnica__header">
          <span className="uplatnica__brand">NALOG ZA UPLATU</span>
          <span className="uplatnica__tag">uplatnica</span>
        </div>

        <div className="uplatnica__body">
          <div className="uplatnica__col uplatnica__col--left">
            <div className="uplatnica__field">
              <span className="uplatnica__label">uplatilac</span>
              <span className="uplatnica__value">{payerName?.trim() || '—'}</span>
            </div>
            <div className="uplatnica__field">
              <span className="uplatnica__label">svrha uplate</span>
              <span className="uplatnica__value">{purpose}</span>
            </div>
            <div className="uplatnica__field">
              <span className="uplatnica__label">primalac</span>
              <span className="uplatnica__value">
                <strong>{recipient}</strong>
                {address && <span className="uplatnica__sub">{address}</span>}
              </span>
            </div>
          </div>

          <div className="uplatnica__col uplatnica__col--right">
            <div className="uplatnica__row uplatnica__row--top">
              <div className="uplatnica__field uplatnica__field--sm">
                <span className="uplatnica__label">šifra plaćanja</span>
                <span className="uplatnica__value">189</span>
              </div>
              <div className="uplatnica__field uplatnica__field--sm">
                <span className="uplatnica__label">valuta</span>
                <span className="uplatnica__value">RSD</span>
              </div>
              <div className="uplatnica__field uplatnica__field--amount">
                <span className="uplatnica__label">iznos</span>
                <span className="uplatnica__value uplatnica__value--amount">
                  {amount != null ? `=${fmtMoney(amount)}` : '—'}
                </span>
              </div>
            </div>

            <div className="uplatnica__field uplatnica__field--account">
              <span className="uplatnica__label">račun primaoca</span>
              <span className="uplatnica__value uplatnica__value--mono">{account}</span>
            </div>

            <div className="uplatnica__row uplatnica__row--bottom">
              <div className="uplatnica__field uplatnica__field--model">
                <span className="uplatnica__label">model</span>
                <span className="uplatnica__value">00</span>
              </div>
              <div className="uplatnica__field uplatnica__field--ref">
                <span className="uplatnica__label">poziv na broj (odobrenje)</span>
                <span className="uplatnica__value">
                  {refNumber != null ? (
                    <strong>{refNumber}</strong>
                  ) : (
                    <em className="uplatnica__pending">broj porudžbine</em>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="uplatnica__hint">
        {orderId != null ? (
          <>U polje <strong>„poziv na broj”</strong> obavezno upišite <strong>{refNumber}</strong>.</>
        ) : (
          <>U polje <strong>„poziv na broj”</strong> upišite broj porudžbine (dobijate ga posle potvrde).</>
        )}
      </p>
    </div>
  )
}
