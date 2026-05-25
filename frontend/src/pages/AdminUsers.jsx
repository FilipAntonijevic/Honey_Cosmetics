import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'

const ROLE_LABELS = {
  Admin: 'Admin',
  User: 'Korisnik',
}

function fmtMoney(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  return `${x.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD`
}

export default function AdminUsers() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const { data } = await api.get(`/admin/users?${params}`)
      setCustomers(data)
      return data
    } catch {
      setCustomers([])
      return []
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = window.setTimeout(loadList, search.trim() ? 250 : 0)
    return () => window.clearTimeout(t)
  }, [loadList, search])

  useEffect(() => {
    const q = search.trim()
    if (q) setSearchParams({ search: q }, { replace: true })
    else setSearchParams({}, { replace: true })
  }, [search, setSearchParams])

  const openCustomer = (id) => {
    navigate(`/admin/users/${id}`)
  }

  const handleSearchKeyDown = async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const data = customers.length > 0 && !loading
      ? customers
      : await loadList()
    if (data.length === 1) {
      openCustomer(data[0].id)
    }
  }

  const registeredCount = customers.filter((c) => c.isRegistered).length
  const guestCount = customers.length - registeredCount

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Korisnici</h1>
          <p className="adm-page-sub">
            {loading
              ? 'Učitavanje…'
              : `${customers.length} kupaca — ${registeredCount} sa nalogom, ${guestCount} samo gost`}
          </p>
        </div>
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="Pretraži po imenu, emailu ili telefonu… (Enter za jedan rezultat)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </div>

      {loading ? (
        <div className="adm-loading">Učitavanje…</div>
      ) : customers.length === 0 ? (
        <div className="adm-empty">
          {search.trim() ? 'Nema kupaca za tu pretragu.' : 'Nema evidentiranih kupaca.'}
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Ime</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Tip</th>
                <th>Porudžbine</th>
                <th>Potrošeno</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="adm-table-row"
                  onClick={() => openCustomer(c.id)}
                >
                  <td>{c.displayName || '—'}</td>
                  <td>{c.email}</td>
                  <td>{c.phoneNumber || '—'}</td>
                  <td>
                    {c.isRegistered ? (
                      <span className={`adm-user-role adm-user-role--${(c.role ?? 'user').toLowerCase()}`}>
                        {ROLE_LABELS[c.role] ?? c.role ?? 'Nalog'}
                      </span>
                    ) : (
                      <span className="adm-user-role adm-user-role--guest">Gost</span>
                    )}
                  </td>
                  <td>{c.orderCount ?? 0}</td>
                  <td>{fmtMoney(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
