import { hasBankTransferInfo } from './BankTransferSlip'

const fmtMoney = (n) =>
  Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Mini simulirana slika srpske uplatnice (nalog za uplatu), popunjena
 * podacima koje je admin uneo (primalac, račun, svrha) + podaci porudžbine.
 *
 * @param {object} template — bank polja iz site settings
 * @param {number|null|undefined} orderId — broj porudžbine (poziv na broj)
 * @param {number|null|undefined} amount — iznos za uplatu
 * @param {string|null|undefined} payerName — ime uplatioca (kupca), opciono
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
          <div className="uplatnica__row">
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
              <span className="uplatnica__value">
                {amount != null ? `=${fmtMoney(amount)}` : '—'}
              </span>
            </div>
          </div>

          <div className="uplatnica__field">
            <span className="uplatnica__label">račun primaoca</span>
            <span className="uplatnica__value uplatnica__value--mono">{account}</span>
          </div>

          <div className="uplatnica__row">
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
