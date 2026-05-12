import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import { useStore } from '../context/StoreContext'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const { setToast } = useStore()

  const submit = async (event) => {
    event.preventDefault()
    await api.post('/auth/reset-password', {
      token: searchParams.get('token') ?? '',
      newPassword: password,
    })
    setToast('Lozinka je promenjena.')
  }

  return (
    <section className="page shell narrow">
      <h1>Reset Password</h1>
      <form className="form" onSubmit={submit}>
        <input type="password" placeholder="Nova lozinka" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Sačuvaj</button>
      </form>
    </section>
  )
}
