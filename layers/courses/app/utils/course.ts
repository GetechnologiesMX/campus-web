export function formatPrice(price: number | null, currency: string | null) {
  if (price == null || !currency) return ''
  // $1,499 or $1,499.50: centavos only when there are some.
  const digits = Number.isInteger(price) ? 0 : 2
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(price)
}

/** "Termina el 30 de noviembre" for an offer's end (in Mexico City). */
export function offerEnds(endsAt: string | null) {
  if (!endsAt) return ''
  const day = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long' }).format(new Date(endsAt))
  return `Termina el ${day}`
}

export function coursePath(id: string) {
  return `/cursos/${encodeURIComponent(id)}`
}
