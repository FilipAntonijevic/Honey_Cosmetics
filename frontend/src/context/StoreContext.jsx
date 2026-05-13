/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api'

const StoreContext = createContext(null)

const fromStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }) {
  const [user, setUser] = useState(fromStorage('honey_user', null))
  const [cart, setCart] = useState(fromStorage('honey_cart', []))
  const [wishlist, setWishlist] = useState(fromStorage('honey_wishlist', []))
  const [toast, setToast] = useState('')
  const [initializing, setInitializing] = useState(true)

  // Persist state to localStorage
  useEffect(() => localStorage.setItem('honey_user', JSON.stringify(user)), [user])
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
      const refreshToken = localStorage.getItem('honey_refresh_token')
      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken })
          localStorage.setItem('honey_access_token', data.accessToken)
          localStorage.setItem('honey_refresh_token', data.refreshToken)
          setUser(data.user)
        } catch {
          localStorage.removeItem('honey_access_token')
          localStorage.removeItem('honey_refresh_token')
          localStorage.removeItem('honey_user')
          setUser(null)
        }
      }
      setInitializing(false)

      // Remove cart items that no longer exist in the DB
      try {
        const { data: products } = await api.get('/products')
        const validIds = new Set(products.map(p => p.id))
        setCart(prev => prev.filter(item => validIds.has(item.id)))
      } catch {
        // silently ignore — keep cart as-is if products can't be fetched
      }
    }
    restore()
  }, [])

  // Handle forced logout from token refresh interceptor
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null)
      setToast('Sesija je istekla. Prijavite se ponovo.')
    }
    window.addEventListener('auth:logout', handleForcedLogout)
    return () => window.removeEventListener('auth:logout', handleForcedLogout)
  }, [])

  const login = useCallback(async (payload) => {
    const { data } = await api.post('/auth/login', payload)
    localStorage.setItem('honey_access_token', data.accessToken)
    localStorage.setItem('honey_refresh_token', data.refreshToken)
    setUser(data.user)
    setToast('Uspešno ste prijavljeni.')
    return data.user
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    localStorage.setItem('honey_access_token', data.accessToken)
    localStorage.setItem('honey_refresh_token', data.refreshToken)
    setUser(data.user)
    setToast('Nalog je kreiran.')
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best-effort server logout
    }
    localStorage.removeItem('honey_access_token')
    localStorage.removeItem('honey_refresh_token')
    setUser(null)
    setToast('Odjavljeni ste.')
  }, [])

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    setToast('Proizvod dodat u korpu.')
  }, [])

  const removeFromCart = useCallback(
    (productId) => setCart((prev) => prev.filter((item) => item.id !== productId)),
    [],
  )

  const toggleWishlist = useCallback((product) => {
    setWishlist((prev) => {
      if (prev.some((item) => item.id === product.id)) {
        setToast('Uklonjeno sa wishlist-e.')
        return prev.filter((item) => item.id !== product.id)
      }
      setToast('Dodato u wishlist.')
      return [...prev, product]
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      cart,
      wishlist,
      toast,
      initializing,
      login,
      register,
      logout,
      addToCart,
      removeFromCart,
      toggleWishlist,
      setToast,
      setCart,
    }),
    [user, cart, wishlist, toast, initializing, login, register, logout, addToCart, removeFromCart, toggleWishlist, setCart],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside StoreProvider')
  return context
}
