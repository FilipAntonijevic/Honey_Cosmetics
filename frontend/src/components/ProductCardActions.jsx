import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 20 14"
      width="18"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 2 15 7 3 12" />
    </svg>
  )
}

export default function ProductCardActions({ product, onToggleWishlist }) {
  const { wishlist } = useStore()
  const inWishlist = wishlist.some((item) => item.id === product.id)

  return (
    <div className="product-card-actions">
      <button
        type="button"
        className={`product-card-action product-card-action--wishlist${inWishlist ? ' is-active' : ''}`}
        onClick={() => onToggleWishlist(product)}
        aria-label={inWishlist ? 'Ukloni sa wishlist-e' : 'Dodaj u wishlist'}
        aria-pressed={inWishlist}
      >
        <HeartIcon filled={inWishlist} />
      </button>
      <Link
        to={`/products/${product.id}`}
        className="product-card-action product-card-action--view"
        aria-label={`Pogledaj ${product.name}`}
      >
        <ArrowIcon />
      </Link>
    </div>
  )
}
