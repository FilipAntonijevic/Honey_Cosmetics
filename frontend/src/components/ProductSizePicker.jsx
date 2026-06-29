export default function ProductSizePicker({ variants, selectedId, onSelect }) {
  const options = (variants?.length ? variants : [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0))

  if (options.length <= 1) return null

  return (
    <div className="pd-variant-picker" role="group" aria-label="Izaberite gramazu">
      <div className="pd-variant-picker__options">
        {options.map((variant) => {
          const active = variant.id === selectedId
          const out = !variant.inStock
          return (
            <button
              key={variant.id}
              type="button"
              className={`pd-variant-option${active ? ' is-active' : ''}${out ? ' is-out' : ''}`}
              onClick={() => onSelect?.(variant)}
              aria-pressed={active}
              disabled={out && !active}
              title={out ? 'Nije na stanju' : undefined}
            >
              {variant.variantLabel}
            </button>
          )
        })}
      </div>
      {options.every((v) => !v.inStock) ? (
        <p className="pd-variant-picker__note">Trenutno nije na stanju ni jedna gramaza.</p>
      ) : null}
    </div>
  )
}
