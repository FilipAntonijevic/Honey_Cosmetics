/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import api, { refreshSession } from '../api'
import { clearShopListCache } from '../utils/shopListCache'
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  migrateLegacyAuthFromLocalStorage,
  setAuthSession,
} from '../utils/authStorage'
import { clampCartQuantity, enrichCartItems, getCheckoutCart, isInStock } from '../utils/stock'

migrateLegacyAuthFromLocalStorage()
localStorage.removeItem('honey_user')

const StoreContext = createContext(null)

const fromStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

/** Guest korpa u ovom tabu — snapshot pre logina, vraća se pri logout-u. */
const GUEST_CART_SNAPSHOT_KEY = 'honey_guest_cart_snapshot'
const GUEST_WISHLIST_SNAPSHOT_KEY = 'honey_guest_wishlist_snapshot'
let sessionRestorePromise = null

const saveGuestCartSnapshot = (items) => {
  try {
    sessionStorage.setItem(GUEST_CART_SNAPSHOT_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota errors */
  }
}

const loadGuestCartSnapshot = () => {
  try {
    const raw = sessionStorage.getItem(GUEST_CART_SNAPSHOT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveGuestWishlistSnapshot = (items) => {
  try {
    sessionStorage.setItem(GUEST_WISHLIST_SNAPSHOT_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota errors */
  }
}

const loadGuestWishlistSnapshot = () => {
  try {
    const raw = sessionStorage.getItem(GUEST_WISHLIST_SNAPSHOT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const clearAccountWishlistState = () => {
  localStorage.removeItem('honey_wishlist')
}

const restoreStoredSession = () => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return Promise.resolve(null)
  if (!sessionRestorePromise) {
    sessionRestorePromise = refreshSession(refreshToken).finally(() => {
      sessionRestorePromise = null
    })
  }
  return sessionRestorePromise
}

const mapServerCartRows = (rows) =>
  rows.map((item) => ({
    id: item.productId,
    name: item.name,
    variantLabel: item.variantLabel ?? null,
    price: item.price,
    imageUrl: item.imageUrl,
    quantity: Number(item.quantity) || 0,
    stockQuantity: item.stockQuantity ?? 0,
    inStock: item.inStock ?? (item.stockQuantity ?? 0) > 0,
  }))

const mapServerWishlistRows = (rows) =>
  rows.map((item) => ({
    id: item.productId,
    name: item.name,
    price: item.price,
    imageUrl: item.imageUrl,
    stockQuantity: item.stockQuantity ?? 0,
    inStock: item.inStock ?? (item.stockQuantity ?? 0) > 0,
  }))

async function fetchValidProductIds() {
  const { data } = await api.get('/products')
  return new Set((data ?? []).map((p) => p.id))
}

async function mergeLocalWishlistToServer(validIds, local = fromStorage('honey_wishlist', [])) {
  const toMerge = validIds
    ? local.filter((item) => validIds.has(item.id))
    : local
  const results = await Promise.allSettled(
    toMerge.map((item) => api.post(`/wishlist/${item.id}`)),
  )
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Wishlist merge failed')
  }
}

async function fetchServerWishlist() {
  const { data } = await api.get('/wishlist')
  return mapServerWishlistRows(data ?? [])
}

function cartStockUnchanged(prev, next) {
  if (prev.length !== next.length) return false
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i]
    const b = next[i]
    if (a.id !== b.id) return false
    if (a.quantity !== b.quantity) return false
    if (Number(a.price) !== Number(b.price)) return false
    if (Boolean(a.inStock) !== Boolean(b.inStock)) return false
    if ((a.stockQuantity ?? -1) !== (b.stockQuantity ?? -1)) return false
  }
  return true
}

function canSyncWithServer(user, initializing) {
  return Boolean(user && !initializing && getAccessToken())
}

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null)
  const [cart, setCart] = useState(fromStorage('honey_cart', []))
  const [wishlist, setWishlist] = useState([])
  const [wishlistReady, setWishlistReady] = useState(false)
  const [toast, setToast] = useState('')
  const [cartAddTick, setCartAddTick] = useState(0)
  const [checkoutCoupon, setCheckoutCoupon] = useState(null)
  const [initializing, setInitializing] = useState(true)
  // ID-jevi porudžbina koje je korisnik napravio, a još nije pogledao detalje.
  const [unseenOrders, setUnseenOrders] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [productSearchRevision, setProductSearchRevision] = useState(0)
  const appliedProductSearchRef = useRef('')
  const searchDraftRef = useRef('')
  const restoreStartedRef = useRef(false)
  const quantitySyncsRef = useRef(new Map())
  const cartRef = useRef(cart)
  cartRef.current = cart

  const updateSearchDraft = useCallback((value) => {
    searchDraftRef.current = value
  }, [])

  const applyProductSearch = useCallback((q) => {
    if (appliedProductSearchRef.current === q) return false
    appliedProductSearchRef.current = q
    clearShopListCache()
    setProductSearch(q)
    return true
  }, [])

  const forceProductSearch = useCallback((q) => {
    appliedProductSearchRef.current = q
    searchDraftRef.current = q
    clearShopListCache()
    setProductSearch(q)
    setProductSearchRevision((n) => n + 1)
  }, [])

  /** Isključi filter pretrage, zadrži tekst u search baru; ne ponovo primenjuj isti upit. */
  const suspendProductSearchFilter = useCallback(() => {
    appliedProductSearchRef.current = searchDraftRef.current.trim()
    clearShopListCache()
    setProductSearch('')
  }, [])

  useEffect(() => localStorage.setItem('honey_cart', JSON.stringify(cart)), [cart])
  useEffect(() => {
    if (user) {
      clearAccountWishlistState()
      return
    }
    localStorage.setItem('honey_wishlist', JSON.stringify(wishlist))
  }, [wishlist, user])

  // Učitaj/očisti notifikacije porudžbina kad se promeni korisnik.
  useEffect(() => {
    if (!user?.id) {
      setUnseenOrders([])
      return
    }
    setUnseenOrders(fromStorage(`honey_unseen_orders_${user.id}`, []))
  }, [user?.id])

  // Sačuvaj notifikacije porudžbina (po korisniku).
  useEffect(() => {
    if (!user?.id) return
    try {
      localStorage.setItem(`honey_unseen_orders_${user.id}`, JSON.stringify(unseenOrders))
    } catch {
      /* ignore quota errors */
    }
  }, [unseenOrders, user?.id])

  const addOrderNotification = useCallback((orderId) => {
    if (orderId == null) return
    setUnseenOrders((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]))
  }, [])

  const markOrderSeen = useCallback((orderId) => {
    setUnseenOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : prev))
  }, [])

  const syncWishlist = useCallback(async () => {
    try {
      if (getAccessToken()) {
        const server = await fetchServerWishlist()
        setWishlist(server)
        clearAccountWishlistState()
        return
      }
      const validIds = await fetchValidProductIds()
      const local = fromStorage('honey_wishlist', [])
      const pruned = local.filter((item) => validIds.has(item.id))
      setWishlist(pruned)
      try {
        localStorage.setItem('honey_wishlist', JSON.stringify(pruned))
      } catch {
        /* ignore quota errors */
      }
    } catch {
      /* keep current state on network error */
    } finally {
      setWishlistReady(true)
    }
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  // Session restore: validate stored refresh token on mount
  useEffect(() => {
    if (restoreStartedRef.current) return
    restoreStartedRef.current = true
    const restore = async () => {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        try {
          const data = await restoreStoredSession()
          if (!data) throw new Error('Session unavailable')
          setUser(data.user)
          // Cart sync: server is source of truth for logged-in users
          try {
            const { data: serverCart } = await api.get('/cart')
            if (serverCart.length > 0) {
              setCart(mapServerCartRows(serverCart))
            } else {
              const localCart = fromStorage('honey_cart', [])
              const results = await Promise.allSettled(
                localCart.map((item) =>
                  api.post('/cart', { productId: item.id, quantity: item.quantity }),
                ),
              )
              if (results.some((result) => result.status === 'rejected')) {
                setToast('Korpa nije potpuno sinhronizovana sa serverom.')
              }
            }
          } catch {
            setToast('Korpa nije mogla da se učita sa servera.')
          }
          try {
            setWishlist(await fetchServerWishlist())
          } catch {
            setToast('Wishlist nije mogla da se sinhronizuje sa serverom.')
          }
        } catch {
          clearAuthSession()
          setUser(null)
          setCheckoutCoupon(null)
          setCart(loadGuestCartSnapshot())
          clearAccountWishlistState()
          setWishlist(loadGuestWishlistSnapshot())
          setToast('Sesija je istekla. Prijavite se ponovo.')
        }
      } else {
        // Guest: ukloni iz korpe i wishlist-e proizvode koji više ne postoje
        try {
          const { data: products } = await api.get('/products')
          const validIds = new Set(products.map(p => p.id))
          setCart(prev => prev.filter(item => validIds.has(item.id)))
          const local = fromStorage('honey_wishlist', [])
          setWishlist(local.filter(item => validIds.has(item.id)))
        } catch {}
      }
      setInitializing(false)
    }
    restore()
  }, [])

  // Keep wishlist in sync with server/catalog (drops deleted or invalid products).
  useEffect(() => {
    if (initializing) return
    syncWishlist()
  }, [initializing, user?.id, syncWishlist])

  // Handle forced logout from token refresh interceptor
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null)
      setCheckoutCoupon(null)
      setCart(loadGuestCartSnapshot())
      clearAccountWishlistState()
      setWishlist(loadGuestWishlistSnapshot())
      setToast('Sesija je istekla. Prijavite se ponovo.')
    }
    window.addEventListener('auth:logout', handleForcedLogout)
    return () => window.removeEventListener('auth:logout', handleForcedLogout)
  }, [])

  const login = useCallback(async (payload) => {
    // Samo stvarno gostujuće stanje sme da se prenese na novi nalog.
    const guestCart = user ? [] : cart.map((item) => ({ ...item }))
    const guestWishlist = user ? [] : wishlist.map((item) => ({ ...item }))
    saveGuestCartSnapshot(guestCart)
    saveGuestWishlistSnapshot(guestWishlist)
    clearAccountWishlistState()

    const { data } = await api.post('/auth/login', payload)
    setAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    })
    setUser(data.user)
    setToast('Uspešno ste prijavljeni.')
    const cartMergeResults = await Promise.allSettled(
      guestCart.map((item) =>
        api.post('/cart', { productId: item.id, quantity: item.quantity }),
      ),
    )
    if (cartMergeResults.some((result) => result.status === 'rejected')) {
      setToast('Prijavljeni ste, ali korpa nije potpuno sinhronizovana.')
    }
    try {
      const { data: serverCart } = await api.get('/cart')
      setCart(mapServerCartRows(serverCart ?? []))
    } catch {
      setToast('Prijavljeni ste, ali korpa nije mogla da se učita.')
    }
    try {
      const validIds = await fetchValidProductIds()
      await mergeLocalWishlistToServer(validIds, guestWishlist)
      setWishlist(await fetchServerWishlist())
    } catch {
      setToast('Prijavljeni ste, ali wishlist nije mogla da se sinhronizuje.')
    }
    return data.user
  }, [cart, user, wishlist])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    if (data?.accessToken) {
      const err = new Error('STALE_API')
      err.staleApi = true
      throw err
    }
    if (!data?.message) {
      const err = new Error('INVALID_RESPONSE')
      throw err
    }
    setToast(data.message)
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best-effort server logout
    }
    clearAuthSession()
    setUser(null)
    setCheckoutCoupon(null)
    setCart(loadGuestCartSnapshot())
    clearAccountWishlistState()
    setWishlist(loadGuestWishlistSnapshot())
    setToast('Odjavljeni ste.')
  }, [])

  const clearCartAfterOrder = useCallback(async () => {
    setCheckoutCoupon(null)
    setCart([])
    try {
      localStorage.setItem('honey_cart', JSON.stringify([]))
      sessionStorage.removeItem(GUEST_CART_SNAPSHOT_KEY)
    } catch {
      /* ignore quota errors */
    }

    // Lokalno je već prazno — server cleanup u pozadini da dugme ne ostane disabled.
    if (canSyncWithServer(user, false)) {
      void (async () => {
        try {
          const { data: serverCart } = await api.get('/cart')
          if (Array.isArray(serverCart) && serverCart.length > 0) {
            await Promise.all(
              serverCart.map((item) =>
                api.delete(`/cart/${item.productId}`).catch(() => {}),
              ),
            )
          }
        } catch {
          /* server cart already cleared by checkout */
        }
      })()
    }
  }, [user])

  const refreshCartStock = useCallback(async () => {
    try {
      const { data: products } = await api.get('/products')
      const byId = new Map(products.map((p) => [p.id, p]))
      const enrichedSnapshot = enrichCartItems(cart, byId)
      const checkoutSnapshot = getCheckoutCart(enrichedSnapshot)
      const oosIds = enrichedSnapshot.filter((item) => !item.inStock).map((item) => item.id)

      setCart((current) => {
        const enriched = enrichCartItems(current, byId)
        return cartStockUnchanged(current, enriched) ? current : enriched
      })

      if (canSyncWithServer(user, false) && oosIds.length > 0) {
        const removals = await Promise.allSettled(
          oosIds.map((id) => api.delete(`/cart/${id}`)),
        )
        if (removals.some((result) => result.status === 'rejected')) {
          setToast('Rasprodati proizvodi nisu potpuno uklonjeni sa servera.')
        }
      }
      return checkoutSnapshot
    } catch {
      return getCheckoutCart(cart)
    }
  }, [user, cart])

  const syncCartQuantity = useCallback(
    (productId, quantity) => {
      if (!canSyncWithServer(user, false)) return true
      const syncs = quantitySyncsRef.current
      let entry = syncs.get(productId)
      if (!entry) {
        entry = { desired: quantity, running: false, timer: null, waiters: [] }
        syncs.set(productId, entry)
      }
      entry.desired = quantity

      const result = new Promise((resolve) => entry.waiters.push(resolve))
      const flush = async () => {
        if (entry.running) return
        entry.running = true
        let succeeded = true
        try {
          while (true) {
            const target = entry.desired
            if (target <= 0) {
              await api.delete(`/cart/${productId}`)
            } else {
              await api.put(`/cart/${productId}`, { productId, quantity: target })
            }
            if (target === entry.desired) break
          }
        } catch {
          succeeded = false
          setToast('Korpa nije sinhronizovana sa serverom.')
          await refreshCartStock()
        } finally {
          entry.running = false
          entry.timer = null
          const waiters = entry.waiters.splice(0)
          syncs.delete(productId)
          waiters.forEach((resolve) => resolve(succeeded))
        }
      }

      if (!entry.running) {
        if (entry.timer) window.clearTimeout(entry.timer)
        entry.timer = window.setTimeout(flush, 120)
      }
      return result
    },
    [user, refreshCartStock],
  )

  const addToCart = useCallback((product, qty = 1) => {
    if (!isInStock(product)) {
      setToast('Rasprodato.')
      return false
    }
    const stock = Number(product.stockQuantity) || 0
    const requestedAdd = Math.max(1, Math.floor(Number(qty) || 1))
    const currentCart = cartRef.current
    const existing = currentCart.find((item) => item.id === product.id)
    const currentQty = Number(existing?.quantity) || 0
    const nextQty = clampCartQuantity(currentQty + requestedAdd, stock)
    const addedQty = nextQty - currentQty

    if (addedQty <= 0) {
      setToast('Nema dovoljno proizvoda na stanju.')
      return false
    }

    const nextCart = existing
      ? currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: nextQty, stockQuantity: stock, inStock: true }
            : item,
        )
      : [...currentCart, { ...product, quantity: nextQty, stockQuantity: stock, inStock: true }]
    cartRef.current = nextCart
    setCart(nextCart)

    // Sve promene korpe koriste isti serializovani apsolutni PUT red.
    // Mešanje starog aditivnog POST-a sa PUT-ovima moglo je da naduva količinu.
    if (canSyncWithServer(user, false)) {
      void syncCartQuantity(product.id, nextQty)
    }

    const isMobile = typeof window !== 'undefined'
      && window.matchMedia('(max-width: 768px)').matches
    if (!isMobile) {
      setToast('Proizvod dodat u korpu.')
    }
    setCartAddTick((t) => t + 1)
    return true
  }, [user, syncCartQuantity])

  const removeFromCart = useCallback(
    async (productId) => {
      setCart((prev) => prev.filter((item) => item.id !== productId))
      return syncCartQuantity(productId, 0)
    },
    [syncCartQuantity],
  )

  /** Pre checkout-a: potisni lokalne količine na server (ulogovani). */
  const pushCartToServer = useCallback(async () => {
    if (!canSyncWithServer(user, false)) return true
    const items = getCheckoutCart(cart)
    await Promise.all([...quantitySyncsRef.current.values()].map(
      (entry) => new Promise((resolve) => entry.waiters.push(() => resolve())),
    ))
    const results = await Promise.all(
      items.map((item) => syncCartQuantity(item.id, Number(item.quantity) || 0)),
    )
    return results.every(Boolean)
  }, [user, cart, syncCartQuantity])

  const checkoutCart = useMemo(() => getCheckoutCart(cart), [cart])

  const checkoutSubtotal = useMemo(
    () => checkoutCart.reduce((s, item) => s + Number(item.price) * Number(item.quantity), 0),
    [checkoutCart],
  )

  const checkoutDiscount = useMemo(() => {
    if (!checkoutCoupon) return 0
    const val = Number(checkoutCoupon.discountValue) || 0
    const raw = checkoutCoupon.isPercentage ? checkoutSubtotal * (val / 100) : val
    return Math.round((raw + Number.EPSILON) * 100) / 100
  }, [checkoutCoupon, checkoutSubtotal])

  const checkoutGrandTotal = useMemo(
    () => Math.max(0, checkoutSubtotal - checkoutDiscount),
    [checkoutSubtotal, checkoutDiscount],
  )

  useEffect(() => {
    if (!checkoutCart.length) setCheckoutCoupon(null)
  }, [checkoutCart.length])

  useEffect(() => {
    if (initializing) return
    const t = window.setTimeout(() => refreshCartStock(), 50)
    return () => window.clearTimeout(t)
  }, [cart, initializing, refreshCartStock])

  const toggleWishlist = useCallback((product) => {
    const syncWithServer = canSyncWithServer(user, initializing)
    const previous = wishlist
    const exists = previous.some((item) => item.id === product.id)
    const next = exists
      ? previous.filter((item) => item.id !== product.id)
      : [...previous, product]
    setWishlist(next)
    setToast(exists ? 'Uklonjeno sa wishlist-e.' : 'Dodato u wishlist.')

    if (syncWithServer) {
      const request = exists
        ? api.delete(`/wishlist/${product.id}`)
        : api.post(`/wishlist/${product.id}`)
      void request.catch(() => {
        setWishlist((current) => {
          const stillOptimistic = current.some((item) => item.id === product.id) === !exists
          if (!stillOptimistic) return current
          return previous
        })
        setToast('Wishlist nije sinhronizovana sa serverom.')
      })
    }
  }, [user, initializing, wishlist])

  const value = useMemo(
    () => ({
      user,
      setUser,
      cart,
      wishlist,
      wishlistReady,
      toast,
      cartAddTick,
      initializing,
      unseenOrders,
      addOrderNotification,
      markOrderSeen,
      login,
      register,
      logout,
      clearCartAfterOrder,
      addToCart,
      removeFromCart,
      syncCartQuantity,
      pushCartToServer,
      toggleWishlist,
      syncWishlist,
      refreshCartStock,
      checkoutCart,
      checkoutCoupon,
      setCheckoutCoupon,
      checkoutSubtotal,
      checkoutDiscount,
      checkoutGrandTotal,
      setToast,
      setCart,
      productSearch,
      setProductSearch,
      productSearchRevision,
      applyProductSearch,
      forceProductSearch,
      suspendProductSearchFilter,
      updateSearchDraft,
    }),
    [user, cart, checkoutCart, checkoutCoupon, checkoutSubtotal, checkoutDiscount, checkoutGrandTotal, wishlist, wishlistReady, toast, cartAddTick, initializing, unseenOrders, addOrderNotification, markOrderSeen, login, register, logout, clearCartAfterOrder, addToCart, removeFromCart, syncCartQuantity, pushCartToServer, toggleWishlist, syncWishlist, refreshCartStock, setCart, setUser, productSearch, applyProductSearch, forceProductSearch, suspendProductSearchFilter, updateSearchDraft, productSearchRevision],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside StoreProvider')
  return context
}
