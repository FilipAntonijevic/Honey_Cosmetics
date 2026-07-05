const CONTEXT_LABELS = {
  registration: 'registracije',
  resendConfirmation: 'slanja emaila za potvrdu registracije',
  forgotPassword: 'slanja linka za reset lozinke',
  contact: 'slanja poruke',
  collaboration: 'slanja poruke o saradnji',
  complaint: 'slanja reklamacije',
}

function extractApiMessage(err) {
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail.trim()
  if (typeof data?.title === 'string' && data.title.trim()) return data.title.trim()
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim()
  return null
}

/** Korisnička poruka kada slanje emaila ne uspe — bez SendGrid/tehničkih detalja. */
export function userFacingEmailError(err, context = 'registration') {
  const label = CONTEXT_LABELS[context] ?? 'slanja emaila'
  const fallback = `Došlo je do greške prilikom ${label}. Pokušajte ponovo kasnije.`
  const raw = extractApiMessage(err)
  if (!raw) return fallback
  if (/sendgrid/i.test(raw)) return fallback
  if (raw.length > 200) return fallback
  return raw
}
