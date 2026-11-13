export const PROMOTION_KIND: Record<PromotionKind, { label: string, hint: string }> = {
  offer: { label: 'Oferta', hint: 'Se aplica sola a cualquier persona; el curso se ve con el precio tachado.' },
  code: { label: 'Código de descuento', hint: 'Se aplica cuando la persona escribe el código al comprar.' },
}

export const PROMOTION_STATE: Record<PromotionState, { label: string, badge: string }> = {
  running: { label: 'Vigente', badge: 'badge-success' },
  scheduled: { label: 'Programada', badge: 'badge-info' },
  sold_out: { label: 'Agotada', badge: 'badge-warning' },
  ended: { label: 'Terminada', badge: 'badge-muted' },
  inactive: { label: 'Inactiva', badge: 'badge-muted' },
}

/** Characters the CMS accepts in a code. */
export const PROMOTION_CODE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/

/** "25%" or "$300". */
export function discountLabel(promotion: Pick<Promotion, 'discount_type' | 'value'>) {
  const value = Number(promotion.value)
  return promotion.discount_type === 'percent' ? `${Number.isInteger(value) ? value : value.toFixed(2)}%` : money(value)
}

/** "Todos los cursos" or the titles. */
export function promotionCourses(promotion: Pick<Promotion, 'all_products' | 'products_detail'>) {
  return promotion.all_products ? 'Todos los cursos' : promotion.products_detail.map(p => p.title).join(', ')
}

const DATE_TIME = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
})

/** "Desde 1 nov 2026, 0:00 hasta 30 nov 2026, 23:59", "Sin fecha de fin"... */
export function promotionDates(promotion: Pick<Promotion, 'starts_at' | 'ends_at'>) {
  const from = promotion.starts_at ? `Desde ${DATE_TIME.format(new Date(promotion.starts_at))}` : ''
  const until = promotion.ends_at ? `hasta ${DATE_TIME.format(new Date(promotion.ends_at))}` : 'sin fecha de fin'
  const text = [from, until].filter(Boolean).join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** ISO → the value of an <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** <input type="datetime-local"> → ISO, or null when empty. */
export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null
}

/** A link to the course with the code already applied, to share in ads or social networks. */
export function codeLink(origin: string, courseKey: string, code: string) {
  return `${origin}/cursos/${encodeURIComponent(courseKey)}?codigo=${encodeURIComponent(code)}`
}
