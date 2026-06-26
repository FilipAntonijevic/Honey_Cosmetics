import { Link } from 'react-router-dom'

export default function ProductCardActions({ product }) {
  return (
    <div className="product-card-actions">
      <Link
        to={`/products/${product.id}`}
        className="product-card-action product-card-action--view"
        aria-label={`O proizvodu: ${product.name}`}
      >
        o proizvodu →
      </Link>
    </div>
  )
}
