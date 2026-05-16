/** Podrazumevani početak u polju — korisnik može obrisati 381, ne i „+“. */
export const PHONE_DEFAULT = '+381'

/** @deprecated */
export const PHONE_PREFIX = PHONE_DEFAULT
export const DEFAULT_PHONE_PREFIX = PHONE_DEFAULT

/** Normalizuje unos: uvek počinje sa „+“, zatim samo cifre i razmaci. */
export function normalizePhoneInput(raw) {
  if (raw == null || raw === '') return PHONE_DEFAULT

  let s = String(raw).trimStart()
  if (!s.startsWith('+')) s = `+${s.replace(/\+/g, '')}`
  else s = `+${s.slice(1).replace(/\+/g, '')}`

  const body = s.slice(1).replace(/[^\d\s]/g, '')
  const combined = `+${body}`

  return combined === '+' ? '+' : combined
}

export function phoneOrDefault(value) {
  const t = (value ?? '').trim()
  if (!t || t === '+') return PHONE_DEFAULT
  return normalizePhoneInput(t)
}

/** Prazno ako je samo „+“ ili samo pozivni bez broja (npr. +381). */
export function cleanPhone(value) {
  const normalized = normalizePhoneInput(value).replace(/\s/g, '')
  if (normalized === '+' || normalized === '+381') return null
  const digits = normalized.slice(1)
  if (digits.length <= 3) return null
  return normalizePhoneInput(value).trim()
}

/** Kursor posle „+381“ ili na kraju ako je kraće. */
export function placePhoneCursor(e) {
  const el = e.target
  const v = el.value ?? ''
  const pos = v.startsWith(PHONE_DEFAULT) ? PHONE_DEFAULT.length : Math.max(1, v.length)
  requestAnimationFrame(() => {
    try {
      const start = Math.max(1, Math.min(pos, v.length))
      el.setSelectionRange(start, start)
    } catch {
      /* ignore */
    }
  })
}

export function clampPhoneSelection(e) {
  const el = e.target
  if (el.selectionStart < 1) {
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(1, Math.max(1, el.selectionEnd))
      } catch {
        /* ignore */
      }
    })
  }
}
