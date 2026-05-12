import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { StoreProvider, useStore } from './context/StoreContext'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetails from './pages/ProductDetails'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import MyOrders from './pages/MyOrders'
import StaticPage from './pages/StaticPage'
import Wishlist from './pages/Wishlist'
import AdminDashboard from './pages/AdminDashboard'

function AdminRoute({ children }) {
  const { user } = useStore()
  return user?.role === 'Admin' ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/about" element={<StaticPage title="O nama">Honey Cosmetics je premium beauty brend fokusiran na elegantan minimalizam i kvalitet.</StaticPage>} />
        <Route path="/contact" element={<StaticPage title="Kontakt">Pišite nam na hello@honeycosmetics.rs ili pozovite +381 60 000 000.</StaticPage>} />
        <Route path="/delivery-payment" element={<StaticPage title="Dostava i plaćanje">Plaćanje je moguće pouzećem ili direktnom bankovnom transakcijom. Dostava u celoj Srbiji.</StaticPage>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
    </Layout>
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
