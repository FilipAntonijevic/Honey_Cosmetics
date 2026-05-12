import { Link, NavLink } from 'react-router-dom'
import { useStore } from '../context/StoreContext'

const categories = ['Gel Lak', 'Baze', 'Builder Gel', 'Top Coat', 'Nega Kože', 'Ostali Proizvodi']

export default function Layout({ children }) {
  const { cart, wishlist, user, logout, toast } = useStore()

  return (
    <div className="site-shell">
      <header className="sticky-header">
        <div className="top-strip">Besplatna dostava za porudžbinu preko 10.000 RSD • Popust na prvu porudžbinu 10% uz kod HNB10</div>
        <div className="links-strip">
          <Link to="/about">O nama</Link>
          <Link to="/delivery-payment">Dostava i plaćanje</Link>
          <Link to="/contact">Kontakt</Link>
          <Link to="/shop?sort=newest">Bestsellers</Link>
          <a href="mailto:saradnja@honeycosmetics.rs">Saradnja</a>
        </div>
        <div className="main-header">
          <Link to="/" className="logo">HONEY Nail Innovations</Link>
          <input className="search" placeholder="Pretraži proizvode..." />
          <div className="icons">
            <Link to="/wishlist">♡ {wishlist.length}</Link>
            {user ? <button onClick={logout}>Odjava</button> : <Link to="/login">Nalog</Link>}
            <a href="tel:+38160000000">Telefon</a>
            <Link to="/cart">Korpa {cart.reduce((sum, item) => sum + item.quantity, 0)}</Link>
          </div>
        </div>
        <nav className="category-nav">
          {categories.map((category) => (
            <NavLink key={category} to={`/shop?category=${encodeURIComponent(category)}`}>{category}</NavLink>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="footer">© {new Date().getFullYear()} Honey Cosmetics • Premium beauty ecommerce experience.</footer>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
