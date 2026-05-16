import {
  clampPhoneSelection,
  normalizePhoneInput,
  phoneOrDefault,
  placePhoneCursor,
} from '../utils/phone'

/**
 * Jedno polje: počinje sa +381, „+“ se ne može obrisati, 381 može (backspace).
 * Bez dodatnih placeholder cifara.
 */
export default function PhoneField({
  value,
  onChange,
  className = 'auth-input',
  id,
  name,
  required = false,
  disabled = false,
  autoComplete = 'tel',
  ariaLabel = 'Broj telefona (opciono)',
}) {
  const display = phoneOrDefault(value)

  const handleChange = (e) => {
    onChange(normalizePhoneInput(e.target.value))
  }

  const handleKeyDown = (e) => {
    const el = e.target
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0

    if (e.key === '+' && start > 0) {
      e.preventDefault()
      return
    }

    if ((e.key === 'Backspace' || e.key === 'Delete') && end > 0 && start < 1) {
      e.preventDefault()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text') || ''
    const el = e.target
    const start = Math.max(1, el.selectionStart ?? 1)
    const end = el.selectionEnd ?? start
    const before = display.slice(0, start)
    const after = display.slice(end)
    onChange(normalizePhoneInput(before + pasted + after))
    requestAnimationFrame(() => placePhoneCursor(el))
  }

  return (
    <input
      id={id}
      name={name}
      type="tel"
      inputMode="tel"
      className={className}
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={placePhoneCursor}
      onClick={(e) => {
        clampPhoneSelection(e)
        placePhoneCursor(e)
      }}
      onSelect={clampPhoneSelection}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
    />
  )
}
