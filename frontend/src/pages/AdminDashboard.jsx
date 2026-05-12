import { useEffect, useState } from 'react'
import api from '../api'

export default function AdminDashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setData(data)).catch(() => setData(null))
  }, [])

  return (
    <section className="page shell">
      <h1>Admin Dashboard</h1>
      {!data ? <p>Nije moguće učitati dashboard (potreban admin token).</p> : (
        <div className="grid-three">
          <article>Ukupno porudžbina: {data.totalOrders}</article>
          <article>Pending porudžbine: {data.pendingOrders}</article>
          <article>Ukupno proizvoda: {data.totalProducts}</article>
        </div>
      )}
    </section>
  )
}
