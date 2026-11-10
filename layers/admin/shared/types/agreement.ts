/** Company agreements (convenios), as the Campus CMS returns them (`/api/v1/agreements/`). */

export interface AgreementReport {
  /** Seats the company bought. */
  seats: number
  generated: number
  /** Codes someone redeemed and still has the course (also if voided later). */
  used: number
  available: number
  void: number
  /** Redeemed codes whose access a contador removed: their seats are free again. */
  revoked: number
  /** Seats without a code yet: how many more can be generated. */
  free_seats: number
}

export interface Agreement {
  id: number
  company: string
  contact_email: string
  /** Product ids. */
  products: number[]
  products_detail: { id: number, title: string, course_key: string, status: ProductStatus }[]
  seats: number
  code_prefix: string
  /** Last day codes can be redeemed (YYYY-MM-DD, Mexico City). */
  expires_at: string
  active: boolean
  notes: string
  /** Active and not past expires_at. */
  is_current: boolean
  report: AgreementReport
  created: string
  modified: string
}

export type AgreementInput = Pick<Agreement,
  'company' | 'contact_email' | 'products' | 'seats' | 'code_prefix' | 'expires_at' | 'active' | 'notes'>

export type AgreementCodeStatus = 'available' | 'used' | 'void' | 'revoked'

export interface AgreementCode {
  id: number
  code: string
  status: AgreementCodeStatus
  username: string | null
  email: string | null
  course_key: string | null
  course_title: string | null
  redeemed_at: string | null
  /** Access in Open edX of whoever redeemed it; null if nobody did. */
  access: OrderAccess | null
  revoked_at: string | null
  /** Username of the contador who removed the access. */
  revoked_by: string | null
  created: string
}
