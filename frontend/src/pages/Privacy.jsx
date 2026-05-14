import useSiteLinks from '../hooks/useSiteLinks'

export default function Privacy() {
  const { emailAddress } = useSiteLinks()
  const emailNode = emailAddress
    ? <a href={`mailto:${emailAddress}`}>{emailAddress}</a>
    : <span className="legal-empty">—</span>

  return (
    <section className="page shell legal-page">
      <h1>Politika privatnosti</h1>

      <h2>1. Rukovalac podacima</h2>
      <ul className="legal-info-list">
        <li><strong>Naziv firme:</strong> GlowFlow</li>
        <li><strong>Adresa:</strong> Jurija Gagarina 247, Beograd</li>
        <li><strong>Email:</strong> {emailNode}</li>
      </ul>

      <h2>2. Koje podatke prikupljamo</h2>
      <p>Možemo prikupljati sledeće podatke:</p>
      <ul>
        <li>Ime i prezime</li>
        <li>Adresu isporuke</li>
        <li>Email adresu</li>
        <li>Broj telefona</li>
        <li>IP adresu</li>
        <li>Podatke o kupovinama</li>
      </ul>

      <h2>3. Svrha obrade</h2>
      <p>Podaci se prikupljaju radi:</p>
      <ul>
        <li>Obrade porudžbina</li>
        <li>Isporuke proizvoda</li>
        <li>Komunikacije sa kupcem</li>
        <li>Izdavanja računa</li>
        <li>Slanja promotivnih poruka (uz saglasnost)</li>
      </ul>

      <h2>4. Pravna osnova obrade</h2>
      <p>Obrada se vrši na osnovu:</p>
      <ul>
        <li>Izvršenja ugovora</li>
        <li>Zakonske obaveze</li>
        <li>Legitimanog interesa</li>
        <li>Saglasnosti korisnika</li>
      </ul>

      <h2>5. Čuvanje podataka</h2>
      <p>
        Podaci se čuvaju onoliko dugo koliko je potrebno radi realizacije svrhe
        obrade, odnosno u skladu sa zakonskim obavezama.
      </p>

      <h2>6. Prava korisnika</h2>
      <p>Korisnik ima pravo na:</p>
      <ul>
        <li>Pristup podacima</li>
        <li>Ispravku podataka</li>
        <li>Brisanje podataka</li>
        <li>Ograničenje obrade</li>
        <li>Prigovor na obradu</li>
        <li>Prenosivost podataka</li>
      </ul>
      <p>Zahtev se može poslati na: {emailNode}</p>

      <h2>7. Kolačići (Cookies)</h2>
      <p>
        Sajt koristi kolačiće radi poboljšanja korisničkog iskustva i analitike.
        Korisnik može podesiti svoj internet pregledač da odbije kolačiće.
      </p>
    </section>
  )
}
