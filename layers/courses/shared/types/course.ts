export interface CourseSummary {
  id: string
  name: string
  org: string
  number: string
  shortDescription: string
  image: string | null
  start: string | null
  startDisplay: string | null
  pacing: 'self' | 'instructor' | string
  /** List price. */
  price: number | null
  currency: string | null
  purchasable: boolean
  /** A sale for everyone running now (set in the admin, Promociones). */
  offer: CourseOffer | null
}

export interface CourseOffer {
  name: string
  /** What it costs with the offer. */
  price: number
  discount: number
  /** When the offer ends (ISO), or null if it has no end date. */
  endsAt: string | null
}

/** The price for the visitor now, from the CMS (`/api/courses/{id}/quote`). Amounts are "1234.50" strings. */
export interface PriceQuote {
  list_price: string
  discount: string
  price: string
  /** A 100% discount code: enrolls without paying. */
  free: boolean
  /** The discount code applied ("" if none). */
  code: string
  /** The code is valid but the running offer already gives a lower price. */
  code_ignored: boolean
  promotion: { name: string, kind: 'offer' | 'code', ends_at: string | null } | null
}

export interface CourseDetail extends CourseSummary {
  /** Plain text written by the accountant in the CMS; blank lines separate paragraphs. */
  description: string
  effort: string | null
  end: string | null
}
