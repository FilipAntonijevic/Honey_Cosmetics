import useSiteLinks from '../hooks/useSiteLinks'

export default function Terms() {
  const { emailAddress, phoneNumber } = useSiteLinks()

  return (
    <section className="page shell legal-page">
      <h1>Uslovi korišćenja</h1>

      <h2>1. Opšte odredbe</h2>
      <p>
        Ovi Uslovi korišćenja regulišu pristup i korišćenje vebsajta
        honeycosmetics.rs (u daljem tekstu: „Sajt“).
      </p>

      <p>Vlasnik Sajta je:</p>
      <ul className="legal-info-list">
        <li><strong>Naziv firme:</strong> Glowflow</li>
        <li><strong>Adresa sedišta:</strong> Jurija Gagarina 247, Beograd</li>
        <li><strong>PIB:</strong> 114984901</li>
        <li>
          <strong>Email:</strong>{' '}
          <ContactValue value={emailAddress} type="email" />
        </li>
        <li>
          <strong>Telefon:</strong>{' '}
          <ContactValue value={phoneNumber} type="phone" />
        </li>
      </ul>

      <p>
        Korišćenjem Sajta prihvatate ove Uslove u celosti. Ukoliko se ne slažete
        sa Uslovima, molimo vas da ne koristite Sajt.
      </p>

      <h2>2. Proizvodi i informacije</h2>
      <p>
        Trudimo se da svi podaci o proizvodima (opis, cena, dostupnost) budu
        tačni i ažurirani. Zadržavamo pravo izmene cena, opisa i dostupnosti
        proizvoda bez prethodne najave.
      </p>
      <p>
        Fotografije proizvoda su informativnog karaktera i mogu se neznatno
        razlikovati od stvarnog izgleda proizvoda.
      </p>

      <h2>3. Poručivanje</h2>
      <p>
        Kupovina se obavlja elektronskim putem, popunjavanjem porudžbine na
        Sajtu.
      </p>
      <p>
        Zaključenje ugovora nastupa u trenutku kada kupac primi potvrdu
        porudžbine putem email-a.
      </p>
      <p>Prodavac zadržava pravo da odbije porudžbinu u slučaju:</p>
      <ul>
        <li>netačnih ili nepotpunih podataka</li>
        <li>sumnje na zloupotrebu</li>
        <li>nedostupnosti proizvoda</li>
      </ul>

      <h2>4. Cene i plaćanje</h2>
      <p>
        Sve cene su izražene u dinarima (RSD) i uključuju PDV (ukoliko je firma
        u sistemu PDV-a).
      </p>
      <p>Načini plaćanja:</p>
      <ul>
        <li>Plaćanje pouzećem</li>
        <li>Platne kartice</li>
        <li>Bankovni transfer</li>
      </ul>

      <h2>5. Intelektualna svojina</h2>
      <p>
        Svi sadržaji na Sajtu (tekst, fotografije, logo, dizajn) vlasništvo su
        firme Glowflow i ne smeju se kopirati, distribuirati ili koristiti bez
        prethodne pismene saglasnosti.
      </p>

      <h2>6. Odgovornost</h2>
      <p>Prodavac ne odgovara za:</p>
      <ul>
        <li>Tehničke greške na Sajtu</li>
        <li>Privremenu nedostupnost Sajta</li>
        <li>Štetu nastalu nepravilnim korišćenjem proizvoda</li>
      </ul>

      <h2>7. Izmene uslova</h2>
      <p>
        Zadržavamo pravo izmene Uslova korišćenja u bilo kom trenutku. Izmene
        stupaju na snagu objavljivanjem na Sajtu.
      </p>
    </section>
  )
}

function ContactValue({ value, type }) {
  if (!value) return <span className="legal-empty">—</span>
  if (type === 'email') {
    return <a href={`mailto:${value}`}>{value}</a>
  }
  if (type === 'phone') {
    const tel = value.replace(/[^+\d]/g, '')
    return <a href={`tel:${tel}`}>{value}</a>
  }
  return <span>{value}</span>
}
