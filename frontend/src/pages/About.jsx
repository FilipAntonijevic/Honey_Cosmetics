import { publicUrl } from '../lib/assets'

export default function About() {
  return (
    <section className="about-page">
      <div className="about-hero">
        <img
          src={publicUrl('/sections/o_nama.jpg')}
          alt="Honey Cosmetics — o nama"
          loading="lazy"
          className="about-hero-img"
        />
      </div>

      <div className="about-content">
        <div className="about-body">
        <h1 className="about-title">O NAMA</h1>

        <p className="about-text">
          Mi smo brend profesionalne kozmetike za nokte, nastao iz direktnog rada
          sa nail studijima i tehničarima.
        </p>

        <p className="about-text">
          Od samog početka naš fokus su ljudi, a ne masovna prodaja. Lično obilazimo
          studije, upoznajemo svoje klijente i gradimo odnose zasnovane na poverenju,
          otvorenoj komunikaciji i realnom iskustvu sa proizvodima.
        </p>

        <p className="about-text">
          Svi naši proizvodi su HEMA i TPO free, sertifikovani i bezbedni za
          profesionalnu upotrebu. Proizvode uvozimo iz Rusije, iz proverenih
          laboratorija sa dugogodišnjim iskustvom u razvoju nail kozmetike.
        </p>

        <p className="about-text">
          Pre nego što krenemo u intenzivan marketing, našim klijentima omogućavamo
          da testiraju proizvode u svakodnevnom radu. Verujemo da kvalitet mora prvo
          da se dokaže u praksi.
        </p>

        <p className="about-text">
          Naš cilj je da ponudimo odličan proizvod po fer ceni, izgradimo dugoročne
          odnose sa studijima i zajedno rastemo sa našim klijentima.
        </p>
        </div>
      </div>
    </section>
  )
}
