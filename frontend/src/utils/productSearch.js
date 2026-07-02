const SERBIAN_REPLACEMENTS = [
  ['đ', 'dj'], ['Đ', 'dj'],
  ['č', 'c'], ['Č', 'c'],
  ['ć', 'c'], ['Ć', 'c'],
  ['š', 's'], ['Š', 's'],
  ['ž', 'z'], ['Ž', 'z'],
]

function normalize(text) {
  if (!text || !String(text).trim()) return ''
  let value = String(text).trim()
  for (const [from, to] of SERBIAN_REPLACEMENTS) {
    value = value.split(from).join(to)
  }
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function tokenize(query) {
  return normalize(query).split(/[\s\t]+/).filter(Boolean)
}

export function matchesProductName(productName, query) {
  const tokens = tokenize(query)
  if (tokens.length === 0) return true
  const normalizedName = normalize(productName)
  return tokens.every((token) => normalizedName.includes(token))
}

export function filterProductsByName(products, query) {
  if (!query?.trim()) return products
  return products.filter((p) => matchesProductName(p.name, query))
}
