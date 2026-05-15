/**
 * Viber ikonica iz /viber.png (isti vizuelni obim kao WhatsApp u meniju).
 */
export default function ViberIcon({ size = 25.1, className }) {
  return (
    <img
      src="/viber.png"
      alt=""
      className={className}
      width={size}
      height={size}
      draggable="false"
      aria-hidden="true"
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}
