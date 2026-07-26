const TRAILING_VARIANT_RE = /\s*[(\\-–]?\s*(\d+)\s*(ml|gr|g)\s*\)?\s*$/i

export function stripVariantFromName(name) {
  if (!name) return ''
  const trimmed = String(name).trim()
  const match = trimmed.match(TRAILING_VARIANT_RE)
  if (!match) return trimmed
  return trimmed.slice(0, match.index).trimEnd(' ', '-', '–', '(')
}

function normalizeVariantUnit(num, unit) {
  const u = String(unit).toLowerCase()
  const normalized = u === 'g' ? 'gr' : u
  return `${num}${normalized}`
}

export function extractVariantLabelFromName(name) {
  if (!name) return ''
  const trimmed = String(name).trim()
  const tail = trimmed.match(TRAILING_VARIANT_RE)
  if (tail) return normalizeVariantUnit(tail[1], tail[2])

  // Legacy proizvodi: gramaža je u nazivu ali nije na samom kraju.
  const matches = [...trimmed.matchAll(/(\d+)\s*(ml|gr|g)\b/gi)]
  if (!matches.length) return ''
  const last = matches[matches.length - 1]
  return normalizeVariantUnit(last[1], last[2])
}

export function getProductDisplayName(item) {
  const raw = String(item?.productName ?? item?.name ?? '').trim()
  const label = getVariantLabel(item)
  if (!label) return raw
  return stripVariantFromName(raw)
}

export function getVariantLabel(item) {
  return item?.variantLabel?.trim() || null
}
