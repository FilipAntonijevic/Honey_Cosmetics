import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'
import ApiImage from '../components/ApiImage'

function CategoryStrip({ categories, selectedId, onSelect }) {
  const trackRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateArrows = () => {
    const el = trackRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateArrows()
    const el = trackRef.current
    if (!el) return
    const onScroll = () => updateArrows()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateArrows)
    }
  }, [categories])

  const scrollBy = (dx) => {
    trackRef.current?.scrollBy({ left: dx, behavior: 'smooth' })
  }

  if (!categories.length) return null

  return (
    <div className="cat-strip-wrap">
      <button
        type="button"
        className={`cat-strip-arrow left${canLeft ? '' : ' is-disabled'}`}
        onClick={() => canLeft && scrollBy(-Math.round((trackRef.current?.clientWidth || 400) * 0.8))}
        aria-label="Pomeri levo"
        aria-disabled={!canLeft}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="cat-strip" ref={trackRef}>
        {categories.map((c) => {
          const active = String(c.id) === String(selectedId)
          return (
            <button
              key={c.id}
              type="button"
              className={`cat-strip-item${active ? ' active' : ''}`}
              onClick={() => onSelect(active ? null : c.id)}
              title={c.name}
            >
              <div className="cat-strip-img-wrap">
                {c.imageUrl ? (
                  <ApiImage src={c.imageUrl} alt={c.name} loading="lazy" />
                ) : (
                  <div className="cat-strip-img-empty" />
                )}
              </div>
              <span className="cat-strip-name">
                {c.name}
                {typeof c.productCount === 'number' && (
                  <span className="cat-strip-count"> ({c.productCount})</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className={`cat-strip-arrow right${canRight ? '' : ' is-disabled'}`}
        onClick={() => canRight && scrollBy(Math.round((trackRef.current?.clientWidth || 400) * 0.8))}
        aria-label="Pomeri desno"
        aria-disabled={!canRight}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

export default function Shop() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [productTypes, setProductTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart, toggleWishlist } = useStore()

  const searchTerm = (searchParams.get('search') ?? '').trim()
  const isSearchMode = searchTerm.length > 0
  const bestsellersMode = !isSearchMode && ['1', 'true'].includes(searchParams.get('bestsellers') ?? '')
  const vrstaName = bestsellersMode || isSearchMode
    ? null
    : (searchParams.get('type') ?? searchParams.get('vrsta') ?? searchParams.get('category'))
  const categoryIdParam = bestsellersMode || isSearchMode ? null : searchParams.get('categoryId')
  const sort = searchParams.get('sort') ?? 'newest'

  // Učitaj liste vrsta jednom (radi mapiranja name -> id).
  useEffect(() => {
    api
      .get('/product-types')
      .then(({ data }) => setProductTypes(Array.isArray(data) ? data : []))
      .catch(() => setProductTypes([]))
  }, [])

  const selectedType = useMemo(
    () => productTypes.find((t) => t.name === vrstaName) ?? null,
    [productTypes, vrstaName],
  )

  // Učitaj kategorije za izabranu vrstu.
  /* eslint-disable react-hooks/set-state-in-effect -- fetch dependant on vrsta */
  useEffect(() => {
    if (!selectedType) {
      setCategories([])
      return
    }
    let cancelled = false
    api
      .get('/categories', { params: { productTypeId: selectedType.id } })
      .then(({ data }) => {
        if (!cancelled) setCategories(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedType])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Učitaj proizvode po izabranom filteru.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        if (bestsellersMode) {
          const { data } = await api.get('/products/bestsellers')
          if (!cancelled) setProducts(Array.isArray(data) ? data : [])
          return
        }

        if (isSearchMode) {
          const { data } = await api.get('/products', { params: { search: searchTerm } })
          if (!cancelled) setProducts(Array.isArray(data) ? data : [])
          return
        }

        const params = {
          sort: sort === 'newest' ? undefined : sort,
        }
        if (categoryIdParam) params.categoryId = categoryIdParam

        const { data } = await api.get('/products', { params })
        const filtered = vrstaName && !categoryIdParam
          ? data.filter((item) => item.productType === vrstaName)
          : data
        if (!cancelled) setProducts(filtered)
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [searchParams, sort, vrstaName, categoryIdParam, bestsellersMode, isSearchMode, searchTerm])

  const onSelectCategory = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id == null) {
      next.delete('categoryId')
    } else {
      next.set('categoryId', String(id))
    }
    setSearchParams(next, { replace: true })
  }

  const headerTitle = useMemo(() => {
    if (isSearchMode) return `Pretraga: „${searchTerm}"`
    if (bestsellersMode) return 'Bestsellers'
    if (!vrstaName) return 'Svi proizvodi'
    if (categoryIdParam) {
      const cat = categories.find((c) => String(c.id) === String(categoryIdParam))
      if (cat) return `${vrstaName} — ${cat.name}`
    }
    return vrstaName
  }, [isSearchMode, searchTerm, bestsellersMode, vrstaName, categoryIdParam, categories])

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="skeleton-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton" />
          ))}
        </div>
      )
    }

    if (!products.length) {
      const isTypePage = !isSearchMode && !bestsellersMode && Boolean(vrstaName)
      const emptyMessage = isSearchMode
        ? `Nema proizvoda čiji naziv sadrži „${searchTerm}".`
        : bestsellersMode
          ? 'Trenutno nema proizvoda u sekciji Bestsellers.'
          : isTypePage
            ? 'Trenutno nema proizvoda u ovoj kategoriji.'
            : 'Nema rezultata za izabrane filtere.'

      return (
        <div className="shop-empty">
          <p className="shop-empty-message">{emptyMessage}</p>
          {isTypePage ? (
            <Link to="/shop" className="shop-empty-all-btn">
              Svi proizvodi
            </Link>
          ) : null}
        </div>
      )
    }

    return (
      <div className="product-grid">
        {products.map((product) => (
          <article key={product.id} className="product-card">
            <Link to={`/products/${product.id}`} className="product-card-media" tabIndex={-1}>
              <ApiImage src={product.imageUrl} alt={product.name} loading="lazy" />
            </Link>
            <div className="product-card-body">
              <h3>
                <Link to={`/products/${product.id}`}>{product.name}</Link>
              </h3>
              <p>{[product.productType, product.category].filter(Boolean).join(' · ')}</p>
              <strong>{Number(product.price).toLocaleString('sr-RS')} RSD</strong>
              <div className="card-actions">
                <button onClick={() => addToCart(product)}>Dodaj u korpu</button>
                <button onClick={() => toggleWishlist(product)} className="ghost">
                  Wishlist
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    )
  }, [loading, products, addToCart, toggleWishlist, bestsellersMode, isSearchMode, searchTerm, vrstaName])

  return (
    <section className="page shop-page">
      <div className="shop-title-band">
        <div className="shop-title-inner shell">
          <h1>{headerTitle}</h1>
        </div>
      </div>

      <div className="shop-page-content shell">
        {!isSearchMode && !bestsellersMode && selectedType && categories.length > 0 && (
          <CategoryStrip
            categories={categories}
            selectedId={categoryIdParam}
            onSelect={onSelectCategory}
          />
        )}

        {content}
      </div>
    </section>
  )
}
