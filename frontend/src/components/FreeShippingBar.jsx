const fmt = (n) =>
  Number(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 17h4" />
      <path d="M3 17h2" />
      <path d="M19 17h2" />
      <path d="M14 17a2 2 0 1 0 4 0" />
      <path d="M6 17a2 2 0 1 0 4 0" />
      <path d="M3 13V6a1 1 0 0 1 1-1h11v8" />
      <path d="M14 5h4l3 4v4h-7V5z" />
    </svg>
  )
}

export default function FreeShippingBar({ cartTotal, threshold, compact = false }) {
  const thresh = Number(threshold)
  if (!thresh || thresh <= 0) return null

  const total = Math.max(0, Number(cartTotal) || 0)
  const qualified = total >= thresh
  const remaining = Math.max(0, thresh - total)
  const progress = Math.min(100, (total / thresh) * 100)

  return (
    <div className={`free-shipping-bar${compact ? ' free-shipping-bar--compact' : ''}${qualified ? ' free-shipping-bar--qualified' : ''}`}>
      <p className="free-shipping-bar__text">
        {qualified ? (
          <strong className="free-shipping-bar__success">OSTVARILI STE BESPLATNU DOSTAVU</strong>
        ) : (
          <>
            Još{' '}
            <span className="free-shipping-bar__amount">{fmt(remaining)} RSD</span>
            {' '}do <strong>BESPLATNE DOSTAVE</strong>
          </>
        )}
      </p>
      {!qualified && (
        <div className="free-shipping-bar__track-wrap">
          <div className="free-shipping-bar__track">
            <div
              className="free-shipping-bar__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="free-shipping-bar__goal">
            <span className="free-shipping-bar__truck"><TruckIcon /></span>
            <span className="free-shipping-bar__goal-label">Besplatna dostava</span>
          </div>
        </div>
      )}
    </div>
  )
}
