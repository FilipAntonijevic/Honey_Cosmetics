import { Link } from 'react-router-dom'
import ApiImage from './ApiImage'
import FitOneLineTitle from './FitOneLineTitle'
import ProductCardActions from './ProductCardActions'
import { useStore } from '../context/StoreContext'
import { formatProductPrice } from '../utils/price'

function HeartIcon({ filled }) {
  return (
    <svg
      className="product-card-heart-icon"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="0.875"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

/**
 * Jedinstvena kartica proizvoda — ISTI izgled SVUDA (shop, wishlist, bestsellers).
 */
export default function ProductCard({ product, onToggleWishlist, eager = false }) {
  const { wishlist } = useStore()
  const inWishlist = wishlist.some((item) => item.id === product.id)

  return (
    <article className="product-card">
      <div className="product-card-media-wrap">
        <Link to={`/products/${product.id}`} className="product-card-media" tabIndex={-1}>
          <ApiImage
            src={product.imageUrl}
            alt={product.name}
            loading={eager ? 'eager' : 'lazy'}
            variant="medium"
          />
        </Link>
        {onToggleWishlist && (
          <button
            type="button"
            className={`product-card-action product-card-action--wishlist${inWishlist ? ' is-active' : ''}`}
            onClick={() => onToggleWishlist(product)}
            aria-label={inWishlist ? 'Ukloni sa wishlist-e' : 'Dodaj u wishlist'}
            aria-pressed={inWishlist}
          >
            <HeartIcon filled={inWishlist} />
          </button>
        )}
      </div>
      <div className="product-card-body">
        <h3>
          <Link to={`/products/${product.id}`}>
            <FitOneLineTitle
              as="span"
              className="product-card-title"
              maxRem={0.72}
              minRem={0.46}
              fillWidth={false}
              allowScaleX={false}
            >
              {product.name}
            </FitOneLineTitle>
          </Link>
        </h3>
        <strong>{formatProductPrice(product.price)}</strong>
        <ProductCardActions product={product} />
      </div>
    </article>
  )
}
