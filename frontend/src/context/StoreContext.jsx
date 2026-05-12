/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
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

  useEffect(() => localStorage.setItem('honey_user', JSON.stringify(user)), [user])
  useEffect(() => localStorage.setItem('honey_cart', JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem('honey_wishlist', JSON.stringify(wishlist)), [wishlist])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timeout)
  }, [toast])

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload)
    localStorage.setItem('honey_access_token', data.accessToken)
    localStorage.setItem('honey_refresh_token', data.refreshToken)
    setUser(data.user)
    setToast('Uspešno ste prijavljeni.')
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    localStorage.setItem('honey_access_token', data.accessToken)
    localStorage.setItem('honey_refresh_token', data.refreshToken)
    setUser(data.user)
    setToast('Nalog je kreiran.')
  }

  const logout = () => {
    localStorage.removeItem('honey_access_token')
    localStorage.removeItem('honey_refresh_token')
    setUser(null)
    setToast('Odjavljeni ste.')
  }

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    setToast('Proizvod dodat u korpu.')
  }

  const removeFromCart = (productId) => setCart((prev) => prev.filter((item) => item.id !== productId))

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      if (prev.some((item) => item.id === product.id)) {
        setToast('Uklonjeno sa wishlist-e.')
        return prev.filter((item) => item.id !== product.id)
      }
      setToast('Dodato u wishlist.')
      return [...prev, product]
    })
  }

  const value = useMemo(
    () => ({
      user,
      cart,
      wishlist,
      toast,
      login,
      register,
      logout,
      addToCart,
      removeFromCart,
      toggleWishlist,
      setToast,
    }),
    [user, cart, wishlist, toast],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside StoreProvider')
  return context
}
