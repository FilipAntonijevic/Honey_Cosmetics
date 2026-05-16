import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import { StoreProvider, useStore } from './context/StoreContext'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetails from './pages/ProductDetails'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Account from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ConfirmEmail from './pages/ConfirmEmail'
import MyOrders from './pages/MyOrders'
import Profile from './pages/Profile'
import StaticPage from './pages/StaticPage'
import About from './pages/About'
import Contact from './pages/Contact'
import Delivery from './pages/Delivery'
import Collaboration from './pages/Collaboration'
import Wishlist from './pages/Wishlist'
import AdminDashboard from './pages/AdminDashboard'
import AdminOrders from './pages/AdminOrders'
import AdminProducts from './pages/AdminProducts'
import AdminCoupons from './pages/AdminCoupons'
import AdminCategories from './pages/AdminCategories'
import AdminBestsellers from './pages/AdminBestsellers'
import AdminLinks from './pages/AdminLinks'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Returns from './pages/Returns'

// Scrolls the window to the top on every route change so users start each
// page at the top, the same as a normal full-page navigation would.
function ScrollToTop() {
  const { pathname, search, hash } = useLocation()
  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search, hash])
  return null
}

/** Klik na link ka stranici na kojoj već jesi → skrol na vrh (logo, meni, footer). */
function SamePageScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    const onClickCapture = (e) => {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = e.target.closest('a[href]')
      if (!anchor || anchor.target === '_blank') return

      const href = anchor.getAttribute('href')
      if (
        !href
        || href.startsWith('#')
        || href.startsWith('mailto:')
        || href.startsWith('tel:')
        || href.startsWith('javascript:')
      ) {
        return
      }

      let url
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return

      const current = `${location.pathname}${location.search}${location.hash}`
      const target = `${toRouterPath(url.pathname)}${url.search}${url.hash}`

      if (current === target) {
        e.preventDefault()
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
      }
    }

    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [location])

  return null
}

// Requires user to be logged in; admins are kicked to /admin
function AuthRoute({ children }) {
  const { user, initializing } = useStore()
  const location = useLocation()
  if (initializing) return null
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (user.role === 'Admin') return <Navigate to="/admin" replace />
  return children
}

// Requires admin role
function AdminRoute({ children }) {
  const { user, initializing } = useStore()
  if (initializing) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'Admin') return <Navigate to="/" replace />
  return children
}

function ClientRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/my-orders" element={<AuthRoute><MyOrders /></AuthRoute>} />
        <Route path="/profile" element={<AuthRoute><Profile /></AuthRoute>} />
        <Route path="/login" element={<Account initialMode="login" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route path="/about" element={<About />} />
        <Route path="/collaboration" element={<Collaboration />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/delivery-payment" element={<Delivery />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function AdminRoutes() {
  return (
    <AdminRoute>
      <AdminLayout>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="bestsellers" element={<AdminBestsellers />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="links" element={<AdminLinks />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminLayout>
    </AdminRoute>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/*" element={<ClientRoutes />} />
    </Routes>
  )
}

function getRouterBasePath() {
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return ''
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function routerBasename() {
  const base = getRouterBasePath()
  return base || undefined
}

/** Browser pathname → router path (npr. /Honey_Cosmetics/ → / na GitHub Pages). */
function toRouterPath(pathname) {
  const base = getRouterBasePath()
  let path = pathname || '/'
  if (base) {
    if (path === base || path === `${base}/`) path = '/'
    else if (path.startsWith(`${base}/`)) path = path.slice(base.length) || '/'
  }
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path || '/'
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter basename={routerBasename()}>
        <ScrollToTop />
        <SamePageScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </StoreProvider>
  )
}


