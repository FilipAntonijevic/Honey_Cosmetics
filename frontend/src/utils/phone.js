// Default Serbian phone prefix. User može da menja po želji.
export const DEFAULT_PHONE_PREFIX = '+381 '

/** Deo koji korisnik unosi iza +381 (za split prikaz u formama). */
export function extensionFromStored(stored) {
  const s = String(stored ?? '').trimStart()
  if (!s.startsWith('+381')) return ''
  let after = s.slice(4)
  if (after.startsWith(' ')) after = after.slice(1)
  return after
}

/** Rekonstruiše vrednost sa podrazumevanim prefiksom ako korisnik nalepi ceo broj koji počinje sa +381. */
export function storedFromExtensionInput(rawExt) {
  let v = String(rawExt ?? '')
  const lead = v.trimStart()
  if (lead.startsWith('+381')) {
    v = lead.slice(4).replace(/^\s+/, '')
  }
  return DEFAULT_PHONE_PREFIX + v
}

// Vraća dati broj ili default prefix ako je trenutna vrednost prazna.
export function phoneOrDefault(value) {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? DEFAULT_PHONE_PREFIX : value
}

// Vraća validan broj telefona za slanje ka API-ju.
// Ako korisnik nije dodao ništa osim default prefiksa, smatra se da telefon nije unet.
export function cleanPhone(value) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null
  if (trimmed === '+381' || trimmed === DEFAULT_PHONE_PREFIX.trim()) return null
  return trimmed
}

// Click/focus handler — pomera kursor na kraj inputa ako je vrednost samo prefix.
export function placeCursorAtEndIfPrefix(e) {
  const el = e.target
  const v = el.value ?? ''
  if (v.trim() === '+381' || v === DEFAULT_PHONE_PREFIX) {
    const end = el.value.length
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(end, end)
      } catch {
        // ignore browsers that don't support setSelectionRange on this input type
      }
    })
  }
}
