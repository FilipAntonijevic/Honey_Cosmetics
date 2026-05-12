import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function ProductDetails() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const { addToCart, toggleWishlist } = useStore()

  useEffect(() => {
    api.get(`/products/${id}`).then(({ data }) => setProduct(data)).catch(() => setProduct(null))
  }, [id])

  if (!product) return <section className="page shell"><p>Proizvod nije pronađen.</p></section>

  return (
    <section className="page shell detail">
      <img src={product.imageUrl} alt={product.name} />
      <div>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <strong>{Number(product.price).toLocaleString('sr-RS')} RSD</strong>
        <div className="card-actions">
          <button onClick={() => addToCart(product)}>Dodaj u korpu</button>
          <button className="ghost" onClick={() => toggleWishlist(product)}>Wishlist</button>
        </div>
      </div>
    </section>
  )
}
