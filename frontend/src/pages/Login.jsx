import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, setToast } = useStore()
  const navigate = useNavigate()

  const submit = async (event) => {
    event.preventDefault()
    try {
      await login({ email, password })
      navigate('/')
    } catch {
      setToast('Pogrešni kredencijali.')
    }
  }

  return (
    <section className="page shell narrow">
      <h1>Login</h1>
      <form className="form" onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Prijava</button>
      </form>
      <Link to="/forgot-password">Zaboravili ste lozinku?</Link>
    </section>
  )
}
