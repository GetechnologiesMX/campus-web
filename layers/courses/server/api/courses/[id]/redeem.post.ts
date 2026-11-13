/**
 * POST /api/courses/{id}/redeem  {"code"} — redeems a company agreement code
 * for this course as the logged-in user. The CMS validates it, consumes it and
 * enrolls the user; we pass its status and body through:
 * 201 {order_id, course_id} | 4xx/5xx {code, detail} | 401 when not logged in.
 */
// The CMS calls Open edX (short timeouts there) before answering.
const REDEEM_TIMEOUT_MS = 45_000

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id', { decode: true })!
  const body = await readBody<{ code?: unknown }>(event).catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.slice(0, 64) : ''
  if (!code.trim()) {
    setResponseStatus(event, 400)
    return { code: 'invalid_code', detail: 'Escribe tu código.' }
  }

  const response = await cmsRequest(event, '/api/v1/agreements/redeem/', {
    method: 'POST',
    headers: jsonHeadersWithIp(event),
    body: JSON.stringify({ code, course_id: id }),
  }, REDEEM_TIMEOUT_MS)
  const data = await response.json().catch(() => ({}))
  setResponseStatus(event, response.status)
  return data
})
