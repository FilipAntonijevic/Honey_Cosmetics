import { useSearchParams } from 'react-router-dom'
import AdminBestsellers from '../AdminBestsellers'
import AdminHomeSlideshow from '../AdminHomeSlideshow'
import AdminNotificationBanner from './AdminNotificationBanner'

const TABS = [
  { id: 'bestsellers', label: 'Bestsellers' },
  { id: 'slideshow', label: 'Slideshow' },
  { id: 'banner', label: 'Notification banner' },
]

export default function AdminHomeScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'bestsellers'

  const setTab = (id) => {
    setSearchParams({ tab: id }, { replace: true })
  }

  return (
    <div className="adm-page adm-page--home-screen">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Homescreen</h1>
          <p className="adm-page-sub">Početna strana — bestsellers, slideshow i gornja traka.</p>
        </div>
      </div>

      <div className="adm-home-tabs" role="tablist" aria-label="Homescreen sekcije">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`adm-home-tab${tab === id ? ' adm-home-tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="adm-home-tab-panel" role="tabpanel">
        {tab === 'bestsellers' && <AdminBestsellers embedded />}
        {tab === 'slideshow' && <AdminHomeSlideshow embedded />}
        {tab === 'banner' && <AdminNotificationBanner embedded />}
      </div>
    </div>
  )
}
