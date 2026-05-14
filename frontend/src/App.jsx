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
import MyOrders from './pages/MyOrders'
import Profile from './pages/Profile'
import StaticPage from './pages/StaticPage'
import Wishlist from './pages/Wishlist'
import AdminDashboard from './pages/AdminDashboard'
import AdminOrders from './pages/AdminOrders'
import AdminProducts from './pages/AdminProducts'
import AdminCoupons from './pages/AdminCoupons'

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
        <Route path="/about" element={<StaticPage title="O nama">Honey Cosmetics je premium beauty brend fokusiran na elegantan minimalizam i kvalitet.</StaticPage>} />
        <Route path="/contact" element={<StaticPage title="Kontakt">Pišite nam na hello@honeycosmetics.rs ili pozovite +381 60 000 000.</StaticPage>} />
        <Route path="/delivery-payment" element={<StaticPage title="Dostava i plaćanje">Plaćanje je moguće pouzećem ili direktnom bankovnom transakcijom. Dostava u celoj Srbiji.</StaticPage>} />
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
          <Route path="coupons" element={<AdminCoupons />} />
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

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </StoreProvider>
  )
}


