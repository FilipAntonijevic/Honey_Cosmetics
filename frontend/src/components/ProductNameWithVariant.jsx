import { getProductDisplayName, getVariantLabel } from '../utils/productLineName'

export default function ProductNameWithVariant({
  name,
  productName,
  variantLabel,
  className = '',
  nameClassName = '',
  variantClassName = 'product-variant-tag',
}) {
  const displayName = getProductDisplayName({ name, productName })
  const label = getVariantLabel({ variantLabel })

  return (
    <span className={className}>
      <span className={nameClassName}>{displayName}</span>
      {label ? <span className={variantClassName}>{label}</span> : null}
    </span>
  )
}
