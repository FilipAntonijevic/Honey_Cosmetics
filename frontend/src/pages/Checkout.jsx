import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function Checkout() {
  const { user, cart, setToast } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ deliveryAddress: user?.defaultAddress ?? '', phone: '', paymentMethod: 0, couponCode: '' })

  const submit = async (event) => {
    event.preventDefault()
    if (!user) {
      setToast('Morate biti prijavljeni za završetak porudžbine.')
      return navigate('/login')
    }

    if (!cart.length) {
      return setToast('Korpa je prazna.')
    }

    try {
      await api.post('/orders/checkout', form)
      setToast('Porudžbina je uspešno kreirana.')
      navigate('/my-orders')
    } catch {
      setToast('Greška prilikom checkout procesa.')
    }
  }

  return (
    <section className="page shell">
      <h1>Checkout</h1>
      <form className="form" onSubmit={submit}>
        <input placeholder="Adresa" value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} required />
        <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Coupon kod" value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value })} />
        <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: Number(e.target.value) })}>
          <option value={0}>Pouzećem</option>
          <option value={1}>Direktna bankovna transakcija</option>
        </select>
        <button type="submit">Naruči</button>
      </form>
    </section>
  )
}
