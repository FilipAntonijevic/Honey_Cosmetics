const CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
])

function isNumericField(el) {
  return (
    el instanceof HTMLInputElement &&
    !el.readOnly &&
    !el.disabled &&
    (el.type === 'number' || el.dataset.numeric != null)
  )
}

function fieldOptions(el) {
  const mode = el.dataset.numeric
  if (mode === 'integer') return { decimal: false, signed: false }
  if (mode === 'signed-integer') return { decimal: false, signed: true }
  if (mode === 'decimal') return { decimal: true, signed: false }
  if (mode === 'signed-decimal') return { decimal: true, signed: true }

  const step = el.getAttribute('step')
  let decimal = false
  if (step === 'any') decimal = true
  else if (step != null) decimal = String(step).includes('.')

  const min = el.getAttribute('min')
  const signed = min != null && Number(min) < 0
  return { decimal, signed }
}

export function sanitizeNumericValue(raw, { decimal = true, signed = false } = {}) {
  let s = String(raw ?? '').replace(/,/g, '.')

  if (!decimal) {
    const match = signed ? s.match(/^-?\d*/) : s.match(/^\d*/)
    return match ? match[0] : ''
  }

  let result = ''
  let hasDot = false
  let i = 0
  if (signed && s.startsWith('-')) {
    result = '-'
    i = 1
  }
  for (; i < s.length; i += 1) {
    const c = s[i]
    if (c >= '0' && c <= '9') result += c
    else if (c === '.' && !hasDot) {
      hasDot = true
      result += c
    }
  }
  return result
}

function blockNumericKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (CONTROL_KEYS.has(e.key)) return

  const { decimal, signed } = fieldOptions(e.currentTarget)

  if (/^\d$/.test(e.key)) return

  if (decimal && (e.key === '.' || e.key === ',')) {
    const v = e.currentTarget.value
    if (v.includes('.') || v.includes(',')) e.preventDefault()
    return
  }

  if (signed && e.key === '-') {
    const { selectionStart, value } = e.currentTarget
    if (selectionStart === 0 && !value.includes('-')) return
  }

  e.preventDefault()
}

function applySanitizedValue(el, next) {
  const opts = fieldOptions(el)
  const clean = sanitizeNumericValue(next, opts)
  if (clean === el.value) return

  el.value = clean
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function onPaste(e) {
  const el = e.target
  if (!isNumericField(el)) return

  e.preventDefault()
  const pasted = e.clipboardData?.getData('text') ?? ''
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  applySanitizedValue(el, el.value.slice(0, start) + pasted + el.value.slice(end))
}

function onInput(e) {
  const el = e.target
  if (!isNumericField(el) || el.dataset.numericSanitizing === '1') return

  const opts = fieldOptions(el)
  const clean = sanitizeNumericValue(el.value, opts)
  if (clean === el.value) return

  el.dataset.numericSanitizing = '1'
  el.value = clean
  el.dispatchEvent(new Event('input', { bubbles: true }))
  delete el.dataset.numericSanitizing
}

function onKeyDown(e) {
  if (!isNumericField(e.target)) return
  blockNumericKeyDown(e)
}

export function installNumericInputGuard() {
  if (typeof document === 'undefined') return
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('paste', onPaste, true)
  document.addEventListener('input', onInput, true)
}
