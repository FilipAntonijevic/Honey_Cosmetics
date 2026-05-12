import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      <section className="hero shell">
        <div className="hero-products">
          <span className="badge">NEW</span>
          <span className="badge">-15%</span>
        </div>
        <div>
          <p className="eyebrow">Premium kolekcija 2026</p>
          <h1>Luxury beauty essentials za salon i kućnu rutinu</h1>
          <p>Minimalistički proizvodi visokog kvaliteta za besprekoran finish.</p>
          <Link className="cta" to="/shop">Istraži proizvode</Link>
        </div>
      </section>

      <section className="shell section-gap">
        <h2>Zašto Honey Cosmetics?</h2>
        <div className="grid-three">
          <article>Profesionalna formula i dugotrajnost.</article>
          <article>Elegantna nude i bež paleta.</article>
          <article>Brza dostava i podrška kupcima.</article>
        </div>
      </section>
    </>
  )
}
