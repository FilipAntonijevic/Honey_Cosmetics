import { Link } from 'react-router-dom'
import FitOneLineTitle from './FitOneLineTitle'

export default function ProductCardActions({ product }) {
  return (
    <div className="product-card-actions">
      <Link
        to={`/products/${product.id}`}
        className="product-card-action product-card-action--view"
        aria-label={`O proizvodu: ${product.name}`}
      >
        <span className="product-card-action__label-wrap">
          <FitOneLineTitle
            as="span"
            className="product-card-action__label"
            maxRem={0.56}
            minRem={0.32}
            fillWidth={false}
            allowScaleX={false}
          >
            više o proizvodu →
          </FitOneLineTitle>
        </span>
      </Link>
    </div>
  )
}
