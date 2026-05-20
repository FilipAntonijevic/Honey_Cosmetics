/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api'
import {
  clearAuthSession,
  getRefreshToken,
  getStoredUser,
  migrateLegacyAuthFromLocalStorage,
  setAuthSession,
} from '../utils/authStorage'
import { clampCartQuantity, enrichCartItems, getCheckoutCart, isInStock } from '../utils/stock'

migrateLegacyAuthFromLocalStorage()

const StoreContext = createContext(null)

const fromStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const mapServerCartRows = (rows) =>
  rows.map((item) => ({
    id: item.productId,
    name: item.name,
    price: item.price,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    inStock: true,
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

async function mergeLocalWishlistToServer() {
  const local = fromStorage('honey_wishlist', [])
  await Promise.all(
    local.map((item) => api.post(`/wishlist/${item.id}`).catch(() => {})),
  )
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
    if (Boolean(a.inStock) !== Boolean(b.inStock)) return false
    if ((a.stockQuantity ?? -1) !== (b.stockQuantity ?? -1)) return false
  }
  return true
}

export function StoreProvider({ children }) {
  const [user, setUser] = useState(fromStorage('honey_user', null))
  const [cart, setCart] = useState(fromStorage('honey_cart', []))
  const [wishlist, setWishlist] = useState(fromStorage('honey_wishlist', []))
  const [toast, setToast] = useState('')
  const [cartAddTick, setCartAddTick] = useState(0)
  const [initializing, setInitializing] = useState(true)

  // Auth u sessionStorage (po tabu); korpa/wishlist ostaju u localStorage
  useEffect(() => {
    setAuthSession({ accessToken: undefined, refreshToken: undefined, user })
  }, [user])
  useEffect(() => localStorage.setItem('honey_cart', JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem('honey_wishlist', JSON.stringify(wishlist)), [wishlist])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  // Session restore: validate stored refresh token on mount
  useEffect(() => {
    const restore = async () => {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken })
          setAuthSession({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
          })
          setUser(data.user)
          // Cart sync: server is source of truth for logged-in users
          try {
            const { data: serverCart } = await api.get('/cart')
            if (serverCart.length > 0) {
              setCart(mapServerCartRows(serverCart))
            } else {
              const localCart = fromStorage('honey_cart', [])
              localCart.forEach(item => {
                api.post('/cart', { productId: item.id, quantity: item.quantity }).catch(() => {})
              })
            }
          } catch {}
          try {
            await mergeLocalWishlistToServer()
            setWishlist(await fetchServerWishlist())
          } catch {}
        } catch {
          clearAuthSession()
          setUser(null)
          /* Server korpa ostala u memoriji browsera kao “gost”; očisti da ne “curi”. */
          setCart([])
        }
      } else {
        // Guest: remove cart items that no longer exist in the DB
        try {
          const { data: products } = await api.get('/products')
          const validIds = new Set(products.map(p => p.id))
          setCart(prev => prev.filter(item => validIds.has(item.id)))
        } catch {}
      }
      setInitializing(false)
    }
    restore()
  }, [])

  // Handle forced logout from token refresh interceptor
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null)
      setCart([])
      setToast('Sesija je istekla. Prijavite se ponovo.')
    }
    window.addEventListener('auth:logout', handleForcedLogout)
    return () => window.removeEventListener('auth:logout', handleForcedLogout)
  }, [])

  const login = useCallback(async (payload) => {
    const { data } = await api.post('/auth/login', payload)
    setAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    })
    setUser(data.user)
    setToast('Uspešno ste prijavljeni.')
    await Promise.all(
      cart.map((item) =>
        api.post('/cart', { productId: item.id, quantity: item.quantity }).catch(() => {}),
      ),
    )
    try {
      const { data: serverCart } = await api.get('/cart')
      setCart(mapServerCartRows(serverCart ?? []))
    } catch {}
    try {
      await mergeLocalWishlistToServer()
      setWishlist(await fetchServerWishlist())
    } catch {}
    return data.user
  }, [cart])

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
    setCart([])
    setToast('Odjavljeni ste.')
  }, [])

  const addToCart = useCallback((product) => {
    if (!isInStock(product)) {
      setToast('Proizvod trenutno nije na stanju.')
      return false
    }
    const stock = product.stockQuantity ?? 0
    let added = 0
    let limited = false
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      const requested = (existing?.quantity ?? 0) + 1
      const nextQty = clampCartQuantity(requested, stock)
      if (nextQty < requested) limited = true
      if (nextQty <= 0) return prev
      added = nextQty - (existing?.quantity ?? 0)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: nextQty, stockQuantity: stock, inStock: true } : item,
        )
      }
      return [...prev, { ...product, quantity: nextQty, stockQuantity: stock, inStock: true }]
    })
    if (added > 0) {
      if (user) api.post('/cart', { productId: product.id, quantity: added }).catch(() => {})
      setToast(limited ? 'Nema dovoljno proizvoda na stanju.' : 'Proizvod dodat u korpu.')
      setCartAddTick((t) => t + 1)
      return true
    }
    setToast('Nema dovoljno proizvoda na stanju.')
    return false
  }, [user])

  const removeFromCart = useCallback(
    (productId) => {
      setCart((prev) => prev.filter((item) => item.id !== productId))
      if (user) {
        api.delete(`/cart/${productId}`).catch(() => {})
      }
    },
    [user],
  )

  const refreshCartStock = useCallback(async () => {
    try {
      const { data: products } = await api.get('/products')
      const byId = new Map(products.map((p) => [p.id, p]))
      let oosIds = []
      let checkoutSnapshot = []

      setCart((prev) => {
        if (!prev.length) {
          checkoutSnapshot = []
          return prev
        }
        const enriched = enrichCartItems(prev, byId)
        checkoutSnapshot = getCheckoutCart(enriched)
        oosIds = enriched.filter((i) => !i.inStock).map((i) => i.id)
        if (cartStockUnchanged(prev, enriched)) return prev
        return enriched
      })

      if (user && oosIds.length > 0) {
        await Promise.all(oosIds.map((id) => api.delete(`/cart/${id}`).catch(() => {})))
      }
      return checkoutSnapshot
    } catch {
      return getCheckoutCart(cart)
    }
  }, [user, cart])

  const checkoutCart = useMemo(() => getCheckoutCart(cart), [cart])

  useEffect(() => {
    if (initializing) return
    const t = window.setTimeout(() => refreshCartStock(), 50)
    return () => window.clearTimeout(t)
  }, [cart, initializing, refreshCartStock])

  const toggleWishlist = useCallback((product) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => item.id === product.id)
      if (user) {
        if (exists) api.delete(`/wishlist/${product.id}`).catch(() => {})
        else api.post(`/wishlist/${product.id}`).catch(() => {})
      }
      if (exists) {
        setToast('Uklonjeno sa wishlist-e.')
        return prev.filter((item) => item.id !== product.id)
      }
      setToast('Dodato u wishlist.')
      return [...prev, product]
    })
  }, [user])

  const value = useMemo(
    () => ({
      user,
      setUser,
      cart,
      wishlist,
      toast,
      cartAddTick,
      initializing,
      login,
      register,
      logout,
      addToCart,
      removeFromCart,
      toggleWishlist,
      refreshCartStock,
      checkoutCart,
      setToast,
      setCart,
    }),
    [user, cart, checkoutCart, wishlist, toast, cartAddTick, initializing, login, register, logout, addToCart, removeFromCart, toggleWishlist, refreshCartStock, setCart, setUser],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside StoreProvider')
  return context
}
