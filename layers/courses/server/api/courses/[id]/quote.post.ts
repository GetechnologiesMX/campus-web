/**
 * POST /api/courses/{id}/quote  {"code"?} — the price of the course now, with
 * the running offer or a discount code. Public: logged in, the CMS also checks
 * how many times the user already used the code. Status and body pass through:
 * 200 {list_price, discount, price, free, code, code_ignored, promotion} |
 * 4xx {code, detail}.
 */
const QUOTE_TIMEOUT_MS = 15_000

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id', { decode: true })!
  const body = await readBody<{ code?: unknown }>(event).catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.slice(0, 64) : ''

  const init: RequestInit = {
    method: 'POST',
    headers: jsonHeadersWithIp(event),
    body: JSON.stringify({ course_id: id, code }),
  }
  const path = '/api/v1/promotions/quote/'
  const response = edxJwt(event)
    ? await cmsRequest(event, path, init, QUOTE_TIMEOUT_MS)
    : await fetch(cmsUrl(path), { ...init, signal: AbortSignal.timeout(QUOTE_TIMEOUT_MS) }).catch((error) => {
        console.error(`[cms] POST ${path} failed:`, error)
        return Response.json({ detail: 'No pudimos revisar el código. Intenta de nuevo en un momento.' }, { status: 503 })
      })
  const data = await response.json().catch(() => ({}))
  setResponseStatus(event, response.status)
  return data
})
