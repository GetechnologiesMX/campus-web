export const AGREEMENT_CODE_STATUS: Record<AgreementCodeStatus, string> = {
  available: 'Disponible',
  used: 'Usado',
  void: 'Anulado',
}

/** Characters the CMS allows in a code prefix: no 0/O, 1/I/L. */
export const CODE_PREFIX = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{2,6}$/

/** A prefix suggestion from the company name, e.g. "Acme Corp" → "ACME" (letters it can't use are skipped). */
export function prefixFrom(company: string) {
  return company.normalize('NFD').toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, '').slice(0, 4)
}

/** The link employees open to redeem a code for a course (also for courses not on sale). */
export function redeemUrl(origin: string, courseKey: string) {
  return `${origin}/canjear/${encodeURIComponent(courseKey)}`
}

export const NO_REVOKE_NOTE = 'Anular un código ya usado, desactivar el convenio o dejar que venza no quita el acceso a quien ya lo canjeó: solo impide canjes nuevos.'

/** Whether the agreement's codes can be redeemed today, as a badge. */
export function agreementState(agreement: Pick<Agreement, 'active' | 'is_current'>) {
  if (!agreement.active) return { label: 'Inactivo', badge: 'badge-muted' }
  if (!agreement.is_current) return { label: 'Vencido', badge: 'badge-warning' }
  return { label: 'Vigente', badge: 'badge-success' }
}
