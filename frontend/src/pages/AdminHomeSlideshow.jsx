import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api'
import ApiImage from '../components/ApiImage'

function apiError(err, fallback) {
  const d = err?.response?.data
  if (typeof d === 'string' && d.trim()) return d
  return fallback
}

export default function AdminHomeSlideshow({ embedded = false }) {
  const [slides, setSlides] = useState([])
  const [initialIds, setInitialIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [draftDesktop, setDraftDesktop] = useState('')
  const [draftMobile, setDraftMobile] = useState('')
  const [uploadingDesktop, setUploadingDesktop] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [adding, setAdding] = useState(false)
  const [replacing, setReplacing] = useState(null)
  const desktopFileRef = useRef(null)
  const mobileFileRef = useRef(null)
  const replaceFileRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/home-slideshow')
      const ordered = [...data].sort((a, b) => a.sortOrder - b.sortOrder)
      setSlides(ordered)
      setInitialIds(ordered.map((s) => s.id))
      setError('')
    } catch {
      setError('Učitavanje nije uspelo.')
      setSlides([])
      setInitialIds([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const slideIds = useMemo(() => slides.map((s) => s.id), [slides])

  const dirty = useMemo(() => {
    if (slideIds.length !== initialIds.length) return true
    return slideIds.some((id, i) => initialIds[i] !== id)
  }, [slideIds, initialIds])

  const uploadFile = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/admin/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url
  }

  const uploadDraft = async (file, target) => {
    const setUploading = target === 'desktop' ? setUploadingDesktop : setUploadingMobile
    const setUrl = target === 'desktop' ? setDraftDesktop : setDraftMobile
    setUploading(true)
    setError('')
    try {
      const url = await uploadFile(file)
      setUrl(url)
    } catch (err) {
      setError(apiError(err, 'Upload nije uspeo.'))
    } finally {
      setUploading(false)
      if (target === 'desktop' && desktopFileRef.current) desktopFileRef.current.value = ''
      if (target === 'mobile' && mobileFileRef.current) mobileFileRef.current.value = ''
    }
  }

  const addSlide = async () => {
    if (!draftDesktop.trim()) {
      setError('Uploadujte desktop (PC) sliku.')
      return
    }
    if (!draftMobile.trim()) {
      setError('Uploadujte mobilnu sliku.')
      return
    }
    setAdding(true)
    setError('')
    try {
      const { data: created } = await api.post('/admin/home-slideshow', {
        imageUrl: draftDesktop.trim(),
        mobileImageUrl: draftMobile.trim(),
      })
      setSlides((prev) => [...prev, created])
      setDraftDesktop('')
      setDraftMobile('')
      setSuccess('Slajd je dodat. Sačuvaj redosled ako si menjao raspored.')
    } catch (err) {
      setError(apiError(err, 'Dodavanje nije uspelo.'))
    } finally {
      setAdding(false)
    }
  }

  const replaceSlideImage = async (slideId, target, file) => {
    const slide = slides.find((s) => s.id === slideId)
    if (!slide) return
    setReplacing(`${slideId}-${target}`)
    setError('')
    try {
      const url = await uploadFile(file)
      const next = {
        imageUrl: target === 'desktop' ? url : slide.imageUrl,
        mobileImageUrl: target === 'mobile' ? url : slide.mobileImageUrl,
      }
      const { data: updated } = await api.put(`/admin/home-slideshow/${slideId}`, next)
      setSlides((prev) => prev.map((s) => (s.id === slideId ? updated : s)))
      setSuccess('Slika je ažurirana.')
    } catch (err) {
      setError(apiError(err, 'Ažuriranje slike nije uspelo.'))
    } finally {
      setReplacing(null)
      if (replaceFileRef.current) replaceFileRef.current.value = ''
    }
  }

  const move = (index, delta) => {
    setSlides((prev) => {
      const next = prev.slice()
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setSuccess('')
  }

  const removeSlide = async (id) => {
    if (!confirm('Obrisati sliku iz slideshow-a?')) return
    setError('')
    try {
      await api.delete(`/admin/home-slideshow/${id}`)
      setSlides((prev) => prev.filter((s) => s.id !== id))
      setInitialIds((prev) => prev.filter((x) => x !== id))
      setSuccess('Slika je obrisana.')
    } catch {
      setError('Brisanje nije uspelo.')
    }
  }

  const saveOrder = async () => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.put('/admin/home-slideshow/order', { slideIds })
      setInitialIds(slideIds)
      setSuccess('Redosled je sačuvan.')
    } catch (err) {
      setError(apiError(err, 'Čuvanje nije uspelo.'))
    } finally {
      setSaving(false)
    }
  }

  const resetOrder = () => {
    load()
    setSuccess('')
  }

  const pickReplace = (slideId, target) => {
    if (!replaceFileRef.current) return
    replaceFileRef.current.setAttribute('data-slide-id', String(slideId))
    replaceFileRef.current.setAttribute('data-target', target)
    replaceFileRef.current.click()
  }

  const headerActions = (
    <div className="adm-page-header-actions">
      <button type="button" className="adm-btn" onClick={resetOrder} disabled={!dirty || saving}>
        Poništi
      </button>
      <button
        type="button"
        className="adm-btn adm-btn-primary"
        onClick={saveOrder}
        disabled={!dirty || saving}
      >
        {saving ? 'Čuvanje…' : 'Sačuvaj redosled'}
      </button>
    </div>
  )

  return (
    <div className={embedded ? 'adm-home-section' : 'adm-page'}>
      {!embedded && (
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Slideshow</h1>
            <p className="adm-page-sub">
              Slike na početnoj stranici. Za svaki slajd potrebne su dve verzije: desktop (PC) i mobilna.
            </p>
          </div>
          {headerActions}
        </div>
      )}

      {embedded && (
        <div className="adm-home-section-head">
          <div>
            <h2 className="adm-home-section-title">Slideshow</h2>
            <p className="adm-page-sub">
              Slike na početnoj stranici. Za svaki slajd potrebne su dve verzije: desktop (PC) i mobilna.
            </p>
          </div>
          {headerActions}
        </div>
      )}

      {error && <div className="adm-form-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && (
        <div
          className="adm-form-error"
          style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', marginBottom: '1rem' }}
        >
          {success}
        </div>
      )}

      <div
        className="adm-modal-body adm-slideshow-add"
        style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.4rem', marginBottom: '1.5rem' }}
      >
        <h2 style={{ margin: '0 0 0.35rem', fontSize: '1rem', color: '#1a1a2e' }}>Dodaj slajd</h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#6b7280' }}>
          Uploadujte obe rezolucije — desktop za računar, mobilnu za telefon.
        </p>
        <div className="adm-slideshow-upload-grid">
          <div className="adm-slideshow-upload-col">
            <span className="adm-slideshow-upload-label">Desktop (PC) *</span>
            <input
              ref={desktopFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(e) => e.target.files[0] && uploadDraft(e.target.files[0], 'desktop')}
            />
            <button
              type="button"
              className="adm-btn adm-btn-primary"
              disabled={uploadingDesktop}
              onClick={() => desktopFileRef.current?.click()}
            >
              {uploadingDesktop ? 'Upload…' : draftDesktop ? 'Promeni desktop' : 'Upload desktop'}
            </button>
            {draftDesktop && (
              <ApiImage src={draftDesktop} alt="" className="adm-best-thumb adm-best-thumb--wide" />
            )}
          </div>
          <div className="adm-slideshow-upload-col">
            <span className="adm-slideshow-upload-label">Mobilna *</span>
            <input
              ref={mobileFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(e) => e.target.files[0] && uploadDraft(e.target.files[0], 'mobile')}
            />
            <button
              type="button"
              className="adm-btn adm-btn-primary"
              disabled={uploadingMobile}
              onClick={() => mobileFileRef.current?.click()}
            >
              {uploadingMobile ? 'Upload…' : draftMobile ? 'Promeni mobilnu' : 'Upload mobilna'}
            </button>
            {draftMobile && (
              <ApiImage src={draftMobile} alt="" className="adm-best-thumb adm-best-thumb--wide" />
            )}
          </div>
        </div>
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          style={{ marginTop: '1rem' }}
          disabled={adding || !draftDesktop || !draftMobile}
          onClick={addSlide}
        >
          {adding ? 'Dodajem…' : '+ Dodaj slajd'}
        </button>
      </div>

      <input
        ref={replaceFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          const slideId = Number(replaceFileRef.current?.getAttribute('data-slide-id'))
          const target = replaceFileRef.current?.getAttribute('data-target')
          if (file && slideId && (target === 'desktop' || target === 'mobile')) {
            replaceSlideImage(slideId, target, file)
          }
        }}
      />

      {loading ? (
        <div className="adm-loading">Učitavanje…</div>
      ) : slides.length === 0 ? (
        <div className="adm-empty">Nema slika. Dodaj prvi slajd iznad.</div>
      ) : (
        <ul className="adm-best-list">
          {slides.map((slide, i) => (
            <li key={slide.id} className="adm-best-item adm-slideshow-item">
              <span className="adm-best-pos">{i + 1}.</span>
              <div className="adm-slideshow-previews">
                <div className="adm-slideshow-preview">
                  <span className="adm-slideshow-preview-label">Desktop</span>
                  <ApiImage src={slide.imageUrl} alt="" className="adm-best-thumb adm-best-thumb--wide" />
                  <button
                    type="button"
                    className="adm-btn adm-btn-sm"
                    disabled={replacing === `${slide.id}-desktop`}
                    onClick={() => pickReplace(slide.id, 'desktop')}
                  >
                    {replacing === `${slide.id}-desktop` ? '…' : 'Promeni'}
                  </button>
                </div>
                <div className="adm-slideshow-preview">
                  <span className="adm-slideshow-preview-label">Mobilna</span>
                  <ApiImage src={slide.mobileImageUrl} alt="" className="adm-best-thumb adm-best-thumb--wide" />
                  {slide.mobileImageUrl === slide.imageUrl && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#b45309',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 6,
                        padding: '0.15rem 0.4rem',
                        lineHeight: 1.25,
                        textAlign: 'center',
                      }}
                    >
                      Ista kao desktop — postavi zasebnu mobilnu sliku
                    </span>
                  )}
                  <button
                    type="button"
                    className="adm-btn adm-btn-sm"
                    disabled={replacing === `${slide.id}-mobile`}
                    onClick={() => pickReplace(slide.id, 'mobile')}
                  >
                    {replacing === `${slide.id}-mobile` ? '…' : 'Promeni'}
                  </button>
                </div>
              </div>
              <div className="adm-best-meta">
                <div className="adm-best-name">Slajd #{i + 1}</div>
              </div>
              <div className="adm-best-actions">
                <button
                  type="button"
                  className="adm-btn adm-btn-sm"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Pomeri gore"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn-sm"
                  onClick={() => move(i, 1)}
                  disabled={i === slides.length - 1}
                  aria-label="Pomeri dole"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn-sm adm-btn-danger"
                  onClick={() => removeSlide(slide.id)}
                >
                  Obriši
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
