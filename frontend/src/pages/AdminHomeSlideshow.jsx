import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api'
import ApiImage from '../components/ApiImage'

export default function AdminHomeSlideshow() {
  const [slides, setSlides] = useState([])
  const [initialIds, setInitialIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef(null)

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

  const uploadImage = async (file) => {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data: uploaded } = await api.post('/admin/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { data: created } = await api.post('/admin/home-slideshow', { imageUrl: uploaded.url })
      setSlides((prev) => [...prev, created])
      setSuccess('Slika je dodata. Sačuvaj redosled ako si menjao raspored.')
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : 'Upload nije uspeo.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
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
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.title ?? 'Čuvanje nije uspelo.')
    } finally {
      setSaving(false)
    }
  }

  const resetOrder = () => {
    load()
    setSuccess('')
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Slideshow</h1>
          <p className="adm-page-sub">
            Slike na početnoj stranici (rotirajući panel). Redosled odgovara prikazu na sajtu.
          </p>
        </div>
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
      </div>

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
        className="adm-modal-body"
        style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.4rem', marginBottom: '1.5rem' }}
      >
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#1a1a2e' }}>Dodaj sliku</h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])}
        />
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Upload…' : '+ Upload slike'}
        </button>
      </div>

      {loading ? (
        <div className="adm-loading">Učitavanje…</div>
      ) : slides.length === 0 ? (
        <div className="adm-empty">Nema slika. Dodaj prvu sliku iznad.</div>
      ) : (
        <ul className="adm-best-list">
          {slides.map((slide, i) => (
            <li key={slide.id} className="adm-best-item">
              <span className="adm-best-pos">{i + 1}.</span>
              <ApiImage src={slide.imageUrl} alt="" className="adm-best-thumb adm-best-thumb--wide" />
              <div className="adm-best-meta">
                <div className="adm-best-name">Slajd #{i + 1}</div>
                <div className="adm-best-sub adm-best-sub--mono">{slide.imageUrl}</div>
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
