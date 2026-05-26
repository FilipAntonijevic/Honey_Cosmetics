import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import AdminOrderTable, { ORDER_STATUSES, STATUS_VALUES, normalizeStatus } from '../components/admin/AdminOrderTable'

export default function AdminOrders() {
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [selectedStatuses, setSelectedStatuses] = useState(() => new Set(['Pending']))
  const [paymentFilter, setPaymentFilter] = useState('')
  const [headerOpen, setHeaderOpen] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const { data } = await api.get(`/admin/orders?${params}`)
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const displayed = useMemo(() => {
    let arr = orders
    if (selectedStatuses.size < ORDER_STATUSES.length) {
      arr = arr.filter((o) => selectedStatuses.has(normalizeStatus(o.status)))
    }
    if (paymentFilter) arr = arr.filter((o) => o.paymentMethod === paymentFilter)
    return arr
  }, [orders, selectedStatuses, paymentFilter])

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

  const onUpdateOrder = async (orderId, status) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: STATUS_VALUES[status] })
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
    } catch (err) {
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : 'Nije moguće ažurirati status.'
      alert(msg)
      throw err
    }
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
          placeholder="Pretraži po ID-u porudžbine"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <AdminOrderTable
        orders={displayed}
        loading={loading}
        onUpdateOrder={onUpdateOrder}
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
