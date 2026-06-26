const TRAILING_VARIANT_RE = /\s*[\(-–]?\s*\d+\s*(ml|gr)\s*\)?\s*$/i

export function stripVariantFromName(name) {
  if (!name) return ''
  const trimmed = String(name).trim()
  const match = trimmed.match(TRAILING_VARIANT_RE)
  if (!match) return trimmed
  return trimmed.slice(0, match.index).trimEnd()
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
