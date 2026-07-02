import { publicUrl } from '../lib/assets'
import FitOneLineTitle from './FitOneLineTitle'

const ITEMS = [
  {
    icon: 'icon1.webp',
    title: 'Bestsellers',
    subtitle: 'Tvoji omiljeni proizvodi',
  },
  {
    icon: 'icon2.webp',
    title: 'Novi proizvodi',
    subtitle: 'Saznaj prvi nove proizvode',
  },
  {
    icon: 'icon3.webp',
    title: 'Popusti',
    subtitle: 'Budi obavešten o popustima',
  },
  {
    icon: 'icon4.webp',
    title: 'Specijalne ponude',
    subtitle: 'Za registrovane korisnike',
  },
]

export default function CommunityBanner() {
  return (
    <section className="community-banner" aria-labelledby="community-banner-title">
      <div className="community-banner__title-row">
        <span className="community-banner__title-line" aria-hidden="true" />
        <h2 id="community-banner-title" className="community-banner__title-wrap">
          <FitOneLineTitle
            as="span"
            className="community-banner__title"
            maxRem={1.555}
            minRem={0.32}
            fillWidth={false}
          >
            Pridružite se našoj zajednici
          </FitOneLineTitle>
        </h2>
        <span className="community-banner__title-line" aria-hidden="true" />
      </div>
      <div className="community-banner__inner shell">
        <ul className="community-banner__grid">
          {ITEMS.map(({ icon, title, subtitle }) => {
            const words = title.split(' ')
            const isMultiWord = words.length > 1

            return (
            <li key={title} className="community-banner__item">
              <img
                src={publicUrl(`/sections/${icon}`)}
                alt=""
                className="community-banner__icon"
                loading="lazy"
                draggable="false"
              />
              <p
                className={`community-banner__heading${
                  isMultiWord
                    ? ' community-banner__heading--stack'
                    : ' community-banner__heading--single'
                }`}
              >
                {isMultiWord
                  ? words.map((word) => (
                      <span key={word} className="community-banner__heading-word">
                        {word}
                      </span>
                    ))
                  : title}
              </p>
              <p className="community-banner__text">{subtitle}</p>
            </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
