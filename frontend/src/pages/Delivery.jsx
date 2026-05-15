import useSiteLinks from '../hooks/useSiteLinks'

export default function Delivery() {
  const { emailAddress } = useSiteLinks()
  const contactEmail = emailAddress?.trim()

  return (
    <section className="about-page">
      <div className="about-hero">
        <img
          src="/sections/dostava.jpg"
          alt="Honey Cosmetics — dostava"
          loading="lazy"
          className="about-hero-img"
        />
      </div>

      <div className="about-content">
        <div className="about-body">
        <h1 className="about-title">Dostava i plaćanje</h1>

        <h2 className="about-subtitle">1. Područje dostave</h2>
        <p className="about-text">
          Dostava se vrši na teritoriji Republike Srbije (ili navesti druge države
          ako postoji međunarodna dostava).
        </p>

        <h2 className="about-subtitle">2. Rok isporuke</h2>
        <p className="about-text">
          Rok isporuke je 1–5 radnih dana od potvrde porudžbine, osim u slučajevima
          praznika ili vanrednih okolnosti.
        </p>

        <h2 className="about-subtitle">3. Troškovi dostave</h2>
        <p className="about-text">
          Troškovi dostave se određuju od strane kurirske službe (za porudžbine do
          10.000 dinara).
          <br />
          Besplatna dostava za porudžbine preko 10.000 dinara.
        </p>

        <h2 className="about-subtitle">4. Kurirska služba</h2>
        <p className="about-text">
          Dostavu vrši Pošta Srbije (Post Express).
        </p>

        <h2 className="about-subtitle">5. Oštećenje prilikom isporuke</h2>
        <p className="about-text">
          Kupac je dužan da proveri paket prilikom prijema. Ukoliko postoji
          oštećenje, potrebno je odmah prijaviti kuriru i kontaktirati nas
          {contactEmail ? (
            <>
              {' '}na:{' '}
              <a href={`mailto:${contactEmail}`} className="about-link">
                {contactEmail}
              </a>
            </>
          ) : (
            '.'
          )}
        </p>
        </div>
      </div>
    </section>
  )
}
