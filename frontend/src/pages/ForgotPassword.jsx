import { useState } from 'react'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const { setToast } = useStore()

  const submit = async (event) => {
    event.preventDefault()
    await api.post('/auth/forgot-password', { email })
    setToast('Ako email postoji, poslali smo reset link.')
  }

  return (
    <section className="page shell narrow">
      <h1>Forgot Password</h1>
      <form className="form" onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit">Pošalji link</button>
      </form>
    </section>
  )
}
