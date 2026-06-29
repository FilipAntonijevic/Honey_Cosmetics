/** API/baza → kratko ime na javnom sajtu */
const PRODUCT_TYPE_DISPLAY_NAMES = {
  'Gel Color Polish': 'Gel Lak',
  'Builder Gelovi': 'Builder Gel',
}

/** URL ili prikaz → API naziv za filtere i mapiranje */
const PRODUCT_TYPE_API_NAMES = {
  'Gel Lak': 'Gel Color Polish',
  'Builder Gel': 'Builder Gelovi',
  'Gel Color Polish': 'Gel Color Polish',
  'Builder Gelovi': 'Builder Gelovi',
  'Ostali Proizvodi': 'Alati za manikir',
}

export function formatProductTypeDisplay(apiName) {
  if (!apiName) return ''
  return PRODUCT_TYPE_DISPLAY_NAMES[apiName] ?? apiName
}

export function resolveProductTypeApi(name) {
  if (!name) return null
  return PRODUCT_TYPE_API_NAMES[name] ?? name
}

export function isManicureToolsProductType(name) {
  if (!name) return false
  return name === 'Alati za manikir' || name === 'Ostali Proizvodi'
}
