import useSiteLinks from '../hooks/useSiteLinks'

export default function Returns() {
  const { complaintsEmail } = useSiteLinks()
  const emailNode = complaintsEmail
    ? <a href={`mailto:${complaintsEmail}`}>{complaintsEmail}</a>
    : <span className="legal-empty">—</span>

  return (
    <section className="page shell legal-page">
      <h1>Politika povraćaja i reklamacija</h1>

      <h2>1. Pravo na odustanak</h2>
      <p>
        U skladu sa Zakonom o zaštiti potrošača Republike Srbije, kupac ima pravo
        da odustane od kupovine u roku od 14 dana od dana prijema robe, bez
        navođenja razloga.
      </p>
      <p>Obrazac za odustanak može se poslati na: {emailNode}</p>
      <p>
        Kupac je dužan da vrati robu o svom trošku, neoštećenu i u originalnom
        pakovanju.
      </p>

      <h2>2. Izuzeci</h2>
      <p>Pravo na odustanak se ne odnosi na:</p>
      <ul>
        <li>Kozmetičke proizvode koji su otvoreni ili korišćeni</li>
        <li>Proizvode sa oštećenom zaštitnom ambalažom</li>
        <li>Personalizovane proizvode</li>
      </ul>

      <h2>3. Povraćaj novca</h2>
      <p>
        Povraćaj sredstava se vrši u roku od 14 dana od prijema vraćene robe, na
        isti način na koji je izvršeno plaćanje, osim ako se drugačije ne
        dogovorimo.
      </p>

      <h2>4. Reklamacije</h2>
      <p>
        U slučaju nesaobraznosti proizvoda, kupac ima pravo na reklamaciju u
        roku od 2 godine od dana kupovine.
      </p>
      <p>Reklamacije se podnose putem email-a: {emailNode}</p>
      <p>
        Prodavac je dužan da odgovori na reklamaciju u roku od 8 dana i reši je
        u zakonskom roku.
      </p>
    </section>
  )
}
