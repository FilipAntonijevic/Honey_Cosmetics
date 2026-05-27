const fmtMoney = (n) =>
  Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function hasTemplate(template) {
  return Boolean(
    template?.bankTransferAccountNumber?.trim()
    && template?.bankTransferRecipientName?.trim(),
  )
}

/**
 * @param {object} template — bank fields from site settings
 * @param {number|null|undefined} orderId
 * @param {number|null|undefined} amount
 * @param {'preview'|'confirmed'} mode
 * @param {'default'|'checkout'} variant
 */
export default function BankTransferSlip({
  template,
  orderId,
  amount,
  mode = 'confirmed',
  variant = 'default',
}) {
  if (!hasTemplate(template)) return null

  const recipient = template.bankTransferRecipientName?.trim()
  const address = template.bankTransferRecipientAddress?.trim()
  const account = template.bankTransferAccountNumber?.trim()
  const purposeBase = template.bankTransferPurpose?.trim() || 'Uplata porudžbine'
  const isPreview = mode === 'preview'
  const isCheckout = variant === 'checkout'

  return (
    <div className={`bank-slip${isCheckout ? ' bank-slip--checkout' : ''}`}>
      <h3 className="bank-slip__title">Podaci za uplatu</h3>

      <p className="bank-slip__intro">
        {isPreview ? (
          <>
            Unesite sledeće podatke u uplatnicu / e-banking. Porudžbina se šalje tek nakon evidentirane uplate.
            {' '}
            <strong>Broj porudžbine upišite u polje „Poziv na broj”</strong> — dobijate ga odmah nakon potvrde narudžbine.
          </>
        ) : (
          <>
            Unesite ove podatke u uplatnicu / e-banking.
            {' '}
            <strong>Obavezno upišite broj porudžbine u polje „Poziv na broj”.</strong>
          </>
        )}
      </p>

      <dl className="bank-slip__grid">
        <div className="bank-slip__row">
          <dt>Primalac</dt>
          <dd><strong>{recipient}</strong></dd>
        </div>

        {address && (
          <div className="bank-slip__row">
            <dt>Adresa primaoca</dt>
            <dd>{address}</dd>
          </div>
        )}

        <div className="bank-slip__row">
          <dt>Broj računa</dt>
          <dd className="bank-slip__mono"><strong>{account}</strong></dd>
        </div>

        {amount != null && (
          <div className="bank-slip__row">
            <dt>Iznos</dt>
            <dd className="bank-slip__amount"><strong>{fmtMoney(amount)} RSD</strong></dd>
          </div>
        )}

        <div className="bank-slip__row bank-slip__row--highlight">
          <dt>Poziv na broj</dt>
          <dd>
            {orderId != null ? (
              <strong className="bank-slip__order-id">#{orderId}</strong>
            ) : (
              <span className="bank-slip__pending">
                Upišite <strong>broj porudžbine</strong> (dobijate ga posle potvrde)
              </span>
            )}
          </dd>
        </div>

        <div className="bank-slip__row">
          <dt>Svrha uplate</dt>
          <dd>
            {purposeBase}
            {orderId != null ? (
              <> — <strong className="bank-slip__order-id">#{orderId}</strong></>
            ) : (
              <> — <strong className="bank-slip__order-id">#broj porudžbine</strong></>
            )}
          </dd>
        </div>
      </dl>

      {orderId != null && (
        <p className="bank-slip__note">
          U polje <strong>„Poziv na broj”</strong> na uplatnici obavezno unesite{' '}
          <strong className="bank-slip__order-id">#{orderId}</strong>.
        </p>
      )}
    </div>
  )
}

export { hasTemplate }
