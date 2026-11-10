/** Company agreements (convenios), as the Campus CMS returns them (`/api/v1/agreements/`). */

export interface AgreementReport {
  /** Seats the company bought. */
  seats: number
  generated: number
  /** Codes someone redeemed (also if voided later: they keep the course). */
  used: number
  available: number
  void: number
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

export type AgreementCodeStatus = 'available' | 'used' | 'void'

export interface AgreementCode {
  id: number
  code: string
  status: AgreementCodeStatus
  username: string | null
  email: string | null
  course_key: string | null
  course_title: string | null
  redeemed_at: string | null
  created: string
}
