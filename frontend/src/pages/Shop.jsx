import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import ApiImage from '../components/ApiImage'
import ProductCard from '../components/ProductCard'
import { useStore } from '../context/StoreContext'
import { formatProductTypeDisplay, resolveProductTypeApi } from '../lib/productTypes'
import { groupProductsForDisplay, pickDefaultVariantProduct } from '../lib/productVariants'

const SHOP_PAGE_SIZE = 12

/** Fallback ID-jevi dok se /product-types ne učita (redosled iz baze). */
const PRODUCT_TYPE_IDS = {
  'Gel Color Polish': 1,
  Baze: 2,
  'Builder Gelovi': 3,
  'Top Coat': 4,
  'Nega Kože': 5,
  'Alati za manikir': 6,
}

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
                  <ApiImage src={c.imageUrl} alt={c.name} loading="lazy" variant="medium" />
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

function parsePagedProducts(data) {
  if (Array.isArray(data)) {
    return { items: data, hasMore: false, totalCount: data.length }
  }
  const items = Array.isArray(data?.items) ? data.items : []
  return {
    items,
    hasMore: Boolean(data?.hasMore),
    totalCount: typeof data?.totalCount === 'number' ? data.totalCount : items.length,
  }
}

export default function Shop() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [productTypes, setProductTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [searchParams, setSearchParams] = useSearchParams()
  const { toggleWishlist } = useStore()
  const loadMoreRef = useRef(null)
  const loadingMoreRef = useRef(false)

  const searchTerm = (searchParams.get('search') ?? '').trim()
  const isSearchMode = searchTerm.length > 0
  const bestsellersMode = !isSearchMode && ['1', 'true'].includes(searchParams.get('bestsellers') ?? '')
  const vrstaName = bestsellersMode || isSearchMode
    ? null
    : (searchParams.get('type') ?? searchParams.get('vrsta') ?? searchParams.get('category'))
  const resolvedVrstaName = resolveProductTypeApi(vrstaName)
  const categoryIdParam = bestsellersMode || isSearchMode ? null : searchParams.get('categoryId')

  const usesPagination = !bestsellersMode

  useEffect(() => {
    api
      .get('/product-types')
      .then(({ data }) => setProductTypes(Array.isArray(data) ? data : []))
      .catch(() => setProductTypes([]))
  }, [])

  const selectedType = useMemo(
    () => productTypes.find((t) => t.name === resolvedVrstaName) ?? null,
    [productTypes, resolvedVrstaName],
  )

  const selectedTypeId = selectedType?.id ?? (resolvedVrstaName ? PRODUCT_TYPE_IDS[resolvedVrstaName] : null)

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

  useEffect(() => {
    if (!selectedType || !categoryIdParam || !categories.length) return
    const valid = categories.some((c) => String(c.id) === String(categoryIdParam))
    if (!valid) {
      const next = new URLSearchParams(searchParams)
      next.delete('categoryId')
      setSearchParams(next, { replace: true })
    }
  }, [selectedType, categoryIdParam, categories, searchParams, setSearchParams])

  const buildListParams = useCallback(
    (pageNum) => {
      const params = {}
      if (usesPagination) {
        params.page = pageNum
        params.pageSize = SHOP_PAGE_SIZE
      }
      if (isSearchMode) {
        params.search = searchTerm
      } else if (categoryIdParam) {
        params.categoryId = categoryIdParam
      } else if (selectedTypeId) {
        params.productTypeId = selectedTypeId
      }
      return params
    },
    [usesPagination, isSearchMode, searchTerm, categoryIdParam, selectedTypeId],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setProducts([])
      setPage(1)
      setHasMore(false)
      try {
        if (bestsellersMode) {
          const { data } = await api.get('/products/bestsellers')
          if (!cancelled) setProducts(Array.isArray(data) ? data : [])
          return
        }

        const { data } = await api.get('/products', { params: buildListParams(1) })
        if (cancelled) return
        const parsed = parsePagedProducts(data)
        setProducts(parsed.items)
        setHasMore(parsed.hasMore)
        setPage(1)
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
  }, [resolvedVrstaName, selectedTypeId, bestsellersMode, isSearchMode, searchTerm, categoryIdParam, buildListParams])

  const loadMore = useCallback(async () => {
    if (!usesPagination || loadingMoreRef.current || !hasMore) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const { data } = await api.get('/products', { params: buildListParams(nextPage) })
      const parsed = parsePagedProducts(data)
      setProducts((prev) => [...prev, ...parsed.items])
      setHasMore(parsed.hasMore)
      setPage(nextPage)
    } catch {
      setHasMore(false)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [usesPagination, hasMore, page, buildListParams])

  useEffect(() => {
    if (!usesPagination || loading || !hasMore) return
    const node = loadMoreRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore()
      },
      { root: null, rootMargin: '320px 0px', threshold: 0 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [usesPagination, loading, hasMore, loadMore, products.length])

  const displayProducts = useMemo(
    () => groupProductsForDisplay(products),
    [products],
  )

  const onSelectCategory = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id == null) {
      next.delete('categoryId')
    } else {
      next.set('categoryId', String(id))
    }
    setSearchParams(next, { replace: true })
  }

  const displayVrstaName = formatProductTypeDisplay(resolvedVrstaName) || vrstaName

  const headerTitle = useMemo(() => {
    if (isSearchMode) return `Pretraga: „${searchTerm}"`
    if (bestsellersMode) return 'Bestsellers'
    if (!displayVrstaName) return 'Svi proizvodi'
    if (categoryIdParam) {
      const cat = categories.find((c) => String(c.id) === String(categoryIdParam))
      if (cat) return `${displayVrstaName} — ${cat.name}`
    }
    return displayVrstaName
  }, [isSearchMode, searchTerm, bestsellersMode, displayVrstaName, categoryIdParam, categories])

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="skeleton-grid">
          {Array.from({ length: SHOP_PAGE_SIZE }).map((_, index) => (
            <div key={index} className="skeleton" />
          ))}
        </div>
      )
    }

    if (!displayProducts.length) {
      const isTypePage = !isSearchMode && !bestsellersMode && Boolean(displayVrstaName)
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
      <>
        <div className="product-grid">
          {displayProducts.map((product) => {
            const display = pickDefaultVariantProduct(product, product.variants)
            return (
              <ProductCard
                key={display.variantGroupId ?? display.id}
                product={display}
                onToggleWishlist={toggleWishlist}
              />
            )
          })}
        </div>
        {usesPagination && hasMore ? (
          <div className="shop-load-more" ref={loadMoreRef} aria-hidden="true">
            {loadingMore ? (
              <div className="skeleton-grid shop-load-more__skeleton">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton" />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    )
  }, [
    loading,
    displayProducts,
    toggleWishlist,
    bestsellersMode,
    isSearchMode,
    searchTerm,
    displayVrstaName,
    usesPagination,
    hasMore,
    loadingMore,
  ])

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
