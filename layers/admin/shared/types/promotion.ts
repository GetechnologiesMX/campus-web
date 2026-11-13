/** Promotions (offers and discount codes), as the Campus CMS returns them (`/api/v1/promotions/`). */

export type PromotionKind = 'offer' | 'code'
export type DiscountType = 'percent' | 'amount'
export type PromotionState = 'running' | 'scheduled' | 'ended' | 'sold_out' | 'inactive'

export interface PromotionReport {
  /** Paid + refunded + checkouts open right now. */
  uses: number
  /** Uses left, or null without a limit. */
  remaining: number | null
  paid: number
  refunded: number
  /** Money from its paid orders ("1234.50"). */
  revenue: string
  /** What it took off the list price of its paid orders. */
  discounts: string
}

export interface Promotion {
  id: number
  name: string
  kind: PromotionKind
  /** Only for kind "code", in uppercase. */
  code: string | null
  discount_type: DiscountType
  /** Percent (1-100) or pesos, as a "25.00" string. */
  value: string
  all_products: boolean
  products: number[]
  products_detail: { id: number, title: string, course_key: string | null, status: ProductStatus, price: string | null }[]
  /** ISO datetimes, or null: from now / no end. */
  starts_at: string | null
  ends_at: string | null
  max_uses: number | null
  max_uses_per_user: number | null
  active: boolean
  notes: string
  state: PromotionState
  report: PromotionReport
  created: string
  modified: string
}

export type PromotionInput = Pick<Promotion,
  'name' | 'kind' | 'code' | 'discount_type' | 'all_products' | 'products' | 'starts_at' | 'ends_at' | 'max_uses'
  | 'max_uses_per_user' | 'active' | 'notes'> & { value: string | number }
