import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'

export default function Register() {
  const { register, setToast } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', defaultAddress: '' })

  const submit = async (event) => {
    event.preventDefault()
    try {
      await register(form)
      navigate('/')
    } catch {
      setToast('Registracija nije uspela.')
    }
  }

  return (
    <section className="page shell narrow">
      <h1>Registracija</h1>
      <form className="form" onSubmit={submit}>
        <input type="text" placeholder="Ime i prezime" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <input type="text" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input type="text" placeholder="Default adresa" value={form.defaultAddress} onChange={(e) => setForm({ ...form, defaultAddress: e.target.value })} />
        <button type="submit">Kreiraj nalog</button>
      </form>
    </section>
  )
}
