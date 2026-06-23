import { Link } from 'react-router-dom'
import ApiImage from './ApiImage'
import ProductCardActions from './ProductCardActions'

/**
 * Jedinstvena kartica proizvoda — ISTI izgled SVUDA (shop, wishlist, bestsellers).
 * Sastoji se od slike (fiksna visina) i donjeg dela: naslov, cena, dugmad.
 */
export default function ProductCard({ product, onToggleWishlist, eager = false }) {
  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-media" tabIndex={-1}>
        <ApiImage
          src={product.imageUrl}
          alt={product.name}
          loading={eager ? 'eager' : 'lazy'}
          variant="medium"
        />
      </Link>
      <div className="product-card-body">
        <h3>
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <strong>{Number(product.price).toLocaleString('sr-RS')} RSD</strong>
        <ProductCardActions product={product} onToggleWishlist={onToggleWishlist} />
      </div>
    </article>
  )
}
