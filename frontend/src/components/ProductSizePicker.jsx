import { useNavigate } from 'react-router-dom'
import { getConfiguredVariantOptions } from '../lib/productVariants'

export default function ProductSizePicker({ product, variants, selectedId, onSelect }) {
  const navigate = useNavigate()
  const configured = getConfiguredVariantOptions(product)
  const options = (variants?.length ? variants : [])
    .slice()
    .sort((a, b) => {
      const order = configured ?? []
      const ai = order.findIndex((x) => x.toLowerCase() === a.variantLabel?.toLowerCase())
      const bi = order.findIndex((x) => x.toLowerCase() === b.variantLabel?.toLowerCase())
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })

  if (options.length <= 1) return null

  const handleSelect = (variant) => {
    if (variant.id === selectedId) return
    onSelect?.(variant)
    navigate(`/products/${variant.id}`, { replace: true })
  }

  return (
    <div className="pd-variant-picker" role="group" aria-label="Izaberite gramazu">
      <span className="pd-variant-picker__label">Gramaza</span>
      <div className="pd-variant-picker__options">
        {options.map((variant) => {
          const active = variant.id === selectedId
          const out = !variant.inStock
          return (
            <button
              key={variant.id}
              type="button"
              className={`pd-variant-option${active ? ' is-active' : ''}${out ? ' is-out' : ''}`}
              onClick={() => handleSelect(variant)}
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
