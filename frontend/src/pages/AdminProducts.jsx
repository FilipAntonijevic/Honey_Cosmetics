import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import ApiImage from '../components/ApiImage'

const ADMIN_PAGE_SIZE = 12

function parsePagedAdminProducts(data) {
  const items = Array.isArray(data?.items) ? data.items : []
  return {
    items,
    hasMore: Boolean(data?.hasMore),
    totalCount: typeof data?.totalCount === 'number' ? data.totalCount : items.length,
  }
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const loadMoreRef = useRef(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchPage = useCallback(async (pageNum, searchTerm) => {
    const { data } = await api.get('/admin/products', {
      params: {
        page: pageNum,
        pageSize: ADMIN_PAGE_SIZE,
        ...(searchTerm ? { search: searchTerm } : {}),
      },
    })
    return parsePagedAdminProducts(data)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setProducts([])
      setPage(1)
      setHasMore(false)
      setTotalCount(0)
      try {
        const parsed = await fetchPage(1, debouncedSearch)
        if (cancelled) return
        setProducts(parsed.items)
        setHasMore(parsed.hasMore)
        setTotalCount(parsed.totalCount)
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
  }, [debouncedSearch, fetchPage])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const parsed = await fetchPage(nextPage, debouncedSearch)
      setProducts((prev) => [...prev, ...parsed.items])
      setHasMore(parsed.hasMore)
      setTotalCount(parsed.totalCount)
      setPage(nextPage)
    } catch {
      setHasMore(false)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [hasMore, page, debouncedSearch, fetchPage])

  useEffect(() => {
    if (loading || !hasMore) return
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
  }, [loading, hasMore, loadMore, products.length])

  const searchActive = debouncedSearch.length > 0

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Proizvodi</h1>
          <p className="adm-page-sub">
            {loading
              ? 'Učitavanje…'
              : searchActive
                ? `${products.length} od ${totalCount} — kliknite na sliku za detalje`
                : `${totalCount} proizvoda — kliknite na sliku za detalje`}
          </p>
        </div>
        <Link to="/admin/products/new" className="adm-btn adm-btn-primary">+ Dodaj novi proizvod</Link>
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="Pretraži proizvod po nazivu, vrsti ili kategoriji…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="adm-product-grid adm-product-grid--pick">
          {Array.from({ length: ADMIN_PAGE_SIZE }).map((_, index) => (
            <div key={index} className="adm-product-card adm-product-card--skeleton" aria-hidden="true">
              <div className="adm-product-img-wrap adm-product-img-wrap--skeleton" />
              <div className="adm-product-info">
                <div className="adm-product-skeleton-line adm-product-skeleton-line--title" />
                <div className="adm-product-skeleton-line adm-product-skeleton-line--meta" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="adm-empty">
          {searchActive ? 'Nema proizvoda za tu pretragu.' : 'Nema proizvoda.'}
        </div>
      ) : (
        <>
          <div className="adm-product-grid adm-product-grid--pick">
            {products.map((product) => {
              const stock = product.totalStock ?? 0
              const variantCount = product.variantCount ?? 1
              return (
                <Link key={product.id} to={`/admin/products/${product.id}`} className="adm-product-card adm-product-card--link">
                  <div className="adm-product-img-wrap">
                    {product.imageUrl ? (
                      <ApiImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="adm-product-img"
                        loading="lazy"
                        variant="medium"
                      />
                    ) : (
                      <div className="adm-product-img-empty">📷</div>
                    )}
                    {stock <= 0 && (
                      <span className="adm-product-stock-tag">Nema na stanju</span>
                    )}
                  </div>
                  <div className="adm-product-info">
                    <div className="adm-product-name">{product.name}</div>
                    <div className="adm-product-meta">
                      <span className="adm-product-type">{product.productType}</span>
                      {product.category && (
                        <span className="adm-product-cat">{product.category}</span>
                      )}
                      {variantCount > 1 && (
                        <span className="adm-product-cat">{variantCount} gramaže</span>
                      )}
                    </div>
                    <div className={`adm-product-stock-qty${stock <= 0 ? ' adm-product-stock-qty--out' : ''}`}>
                      <strong>{stock}</strong> kom na stanju
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          {hasMore ? (
            <div className="adm-product-load-more" ref={loadMoreRef} aria-hidden="true">
              {loadingMore ? (
                <div className="adm-product-grid adm-product-grid--pick adm-product-grid--load-more">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="adm-product-card adm-product-card--skeleton" aria-hidden="true">
                      <div className="adm-product-img-wrap adm-product-img-wrap--skeleton" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
