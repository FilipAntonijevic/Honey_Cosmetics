import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import AdminOrderTable, { ORDER_STATUSES, STATUS_VALUES, normalizeStatus } from '../components/admin/AdminOrderTable'

function parseOrderIdQuery(raw) {
  const q = raw.trim().replace(/^#/, '')
  if (!/^\d+$/.test(q)) return null
  const id = Number(q)
  return Number.isSafeInteger(id) ? id : null
}

export default function AdminOrders() {
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [exactSearch, setExactSearch] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState(() => new Set(['Pending', 'Shipped']))
  const [paymentFilter, setPaymentFilter] = useState('')
  const [headerOpen, setHeaderOpen] = useState(null)

  const fetchOrders = useCallback(async ({ exact = false } = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) {
        params.set('search', search.trim())
        if (exact) params.set('exactId', 'true')
      }
      const { data } = await api.get(`/admin/orders?${params}`)
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    if (exactSearch) return
    fetchOrders({ exact: false })
  }, [search, exactSearch, fetchOrders])

  const displayed = useMemo(() => {
    let arr = orders
    const exactId = exactSearch ? parseOrderIdQuery(search) : null
    if (exactId != null) {
      arr = arr.filter((o) => o.id === exactId)
    }
    const isSearching = search.trim().length > 0
    if (!isSearching && selectedStatuses.size < ORDER_STATUSES.length) {
      arr = arr.filter((o) => selectedStatuses.has(normalizeStatus(o.status)))
    }
    if (paymentFilter) arr = arr.filter((o) => o.paymentMethod === paymentFilter)
    return arr
  }, [orders, selectedStatuses, paymentFilter, search, exactSearch])

  const allStatusesSelected = selectedStatuses.size === ORDER_STATUSES.length
  const statusFilterActive = !allStatusesSelected

  const toggleStatusFilter = (status) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const toggleSelectAllStatuses = () => {
    setSelectedStatuses(allStatusesSelected ? new Set() : new Set(ORDER_STATUSES))
  }

  const onUpdateOrder = async (orderId, status, adminDeliveryCost) => {
    try {
      const body = { status: STATUS_VALUES[status] }
      if (adminDeliveryCost != null) body.adminDeliveryCost = adminDeliveryCost
      await api.put(`/admin/orders/${orderId}/status`, body)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? {
        ...o,
        status,
        ...(adminDeliveryCost != null ? { freeShippingDeliveryCost: adminDeliveryCost } : {}),
      } : o)))
    } catch (err) {
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : 'Nije moguće ažurirati status.'
      alert(msg)
      throw err
    }
  }

  const onUpdatePayment = async (orderId, isPaid) => {
    try {
      await api.put(`/admin/orders/${orderId}/payment`, { isPaid })
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, isPaid } : o)))
    } catch (err) {
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : 'Nije moguće ažurirati status uplate.'
      alert(msg)
      throw err
    }
  }

  const handleSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    setExactSearch(true)
    fetchOrders({ exact: true })
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Porudžbine</h1>
        <p className="adm-page-sub">{displayed.length} rezultata</p>
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="Pretraži po ID-u porudžbine (Enter za tačan ID)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setExactSearch(false)
          }}
          onKeyDown={handleSearchKeyDown}
          inputMode="numeric"
          data-numeric="integer"
        />
      </div>

      <AdminOrderTable
        orders={displayed}
        loading={loading}
        onUpdateOrder={onUpdateOrder}
        onUpdatePayment={onUpdatePayment}
        sortable
        fillHeight
        columnFilters={{
          paymentFilter,
          onPaymentFilterChange: setPaymentFilter,
          selectedStatuses,
          onToggleStatus: toggleStatusFilter,
          onToggleSelectAll: toggleSelectAllStatuses,
          allStatusesSelected,
          statusFilterActive,
          headerOpen,
          onHeaderOpenChange: setHeaderOpen,
        }}
      />
    </div>
  )
}
