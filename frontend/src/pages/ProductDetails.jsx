import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api'
import ApiImage from '../components/ApiImage'
import ProductGallery from '../components/ProductGallery'
import { useStore } from '../context/StoreContext'

function formatPrice(value) {
  return `${Number(value).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`
}

function DescriptionBlock({ text }) {
  if (!text?.trim()) return null
  const blocks = text.trim().split(/\n\s*\n/)
  return (
    <div className="pd-description">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter(Boolean)
        if (lines.length === 1 && lines[0].length < 80 && !lines[0].includes('.')) {
          return <h2 key={i} className="pd-description-heading">{lines[0]}</h2>
        }
        return (
          <p key={i} className="pd-description-p">
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function QuickLink({ to, icon, children }) {
  return (
    <Link to={to} className="pd-quick-link">
      <span className="pd-quick-link__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="pd-quick-link__text">{children}</span>
    </Link>
  )
}

function RelatedCard({ product, onAddToCart }) {
  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-media" tabIndex={-1}>
        <ApiImage src={product.imageUrl} alt={product.name} loading="lazy" />
      </Link>
      <div className="product-card-body">
        <h3>
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <strong>{formatPrice(product.price)}</strong>
        <div className="card-actions">
          <button type="button" onClick={() => onAddToCart(product)}>
            Dodaj u korpu
          </button>
        </div>
      </div>
    </article>
  )
}

export default function ProductDetails() {
  const { id } = useParams()
  const { addToCart } = useStore()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setQuantity(1)

    Promise.all([
      api.get(`/products/${id}`),
      api.get(`/products/${id}/related`, { params: { count: 4 } }),
    ])
      .then(([prodRes, relRes]) => {
        if (cancelled) return
        setProduct(prodRes.data)
        setRelated(relRes.data ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(null)
          setRelated([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const addWithQty = () => {
    if (!product) return
    for (let i = 0; i < quantity; i += 1) {
      addToCart(product)
    }
  }

  if (loading) {
    return (
      <section className="page product-page">
        <div className="shell pd-shell">
          <div className="pd-hero pd-hero--loading">
            <div className="pd-skeleton pd-skeleton--title" />
            <div className="pd-skeleton pd-skeleton--price" />
            <div className="pd-skeleton pd-skeleton--image" />
          </div>
        </div>
      </section>
    )
  }

  if (!product) {
    return (
      <section className="page product-page shell narrow">
        <p>Proizvod nije pronađen.</p>
        <Link to="/shop">Nazad u prodavnicu</Link>
      </section>
    )
  }

  return (
    <section className="page product-page">
      <div className="shell pd-shell">
        <div className="pd-hero">
          <div className="pd-info">
            <h1 className="pd-title">{product.name}</h1>
            <p className="pd-price">{formatPrice(product.price)}</p>

            <div className="pd-buy">
              <div className="pd-qty" aria-label="Količina">
                <button
                  type="button"
                  className="pd-qty__btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Smanji količinu"
                >
                  −
                </button>
                <span className="pd-qty__value" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="pd-qty__btn"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Povećaj količinu"
                >
                  +
                </button>
              </div>
              <button type="button" className="pd-add-btn" onClick={addWithQty}>
                Dodaj u korpu
              </button>
            </div>

            <div className="pd-quick-links">
              <QuickLink
                to="/delivery-payment"
                icon={
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M3 7h11v8H3zM14 9h4l3 3v3h-7V9z" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                }
              >
                Dostava i plaćanje
              </QuickLink>
              <QuickLink
                to="/about"
                icon={
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 10v6M12 7h.01" />
                  </svg>
                }
              >
                O našim proizvodima
              </QuickLink>
              <QuickLink
                to="/contact"
                icon={
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M4 6h16v10H7l-3 3V6z" />
                  </svg>
                }
              >
                Više pitanja? Kontaktirajte nas
              </QuickLink>
            </div>
          </div>

          <div className="pd-media">
            <ProductGallery
              imageUrl={product.imageUrl}
              additionalImageUrls={product.additionalImageUrls}
              alt={product.name}
            />
          </div>
        </div>

        {product.description?.trim() ? (
          <div className="pd-description-wrap">
            <DescriptionBlock text={product.description} />
          </div>
        ) : null}

        {related.length > 0 ? (
          <section className="pd-related" aria-labelledby="pd-related-title">
            <h2 id="pd-related-title" className="pd-related-title">
              Možda Vam se svide i…
            </h2>
            <div className="pd-related-grid product-grid">
              {related.map((p) => (
                <RelatedCard key={p.id} product={p} onAddToCart={addToCart} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  )
}
