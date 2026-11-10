/**
 * POST /api/courses/{id}/redeem  {"code"} — redeems a company agreement code
 * for this course as the logged-in user. The CMS validates it, consumes it and
 * enrolls the user; we pass its status and body through:
 * 201 {order_id, course_id} | 4xx/5xx {code, detail} | 401 when not logged in.
 */
import type { H3Event } from 'h3'

// The CMS calls Open edX (short timeouts there) before answering.
const REDEEM_TIMEOUT_MS = 45_000

/**
 * The browser's IP, for the CMS rate limit. Behind Caddy, X-Forwarded-For is
 * written by Caddy and its last entry is the client; without a proxy (dev) it's
 * the socket address. h3's getRequestIP takes the *first* entry, which the
 * client can set to anything, so we don't use it.
 */
function clientIp(event: H3Event): string {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  const last = forwarded?.split(',').pop()?.trim()
  return last || event.node.req.socket.remoteAddress || ''
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id', { decode: true })!
  const body = await readBody<{ code?: unknown }>(event).catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.slice(0, 64) : ''
  if (!code.trim()) {
    setResponseStatus(event, 400)
    return { code: 'invalid_code', detail: 'Escribe tu código.' }
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const ip = clientIp(event)
  // Replaces, never appends to, whatever X-Forwarded-For the browser sent.
  if (ip) headers['x-forwarded-for'] = ip

  const response = await cmsRequest(event, '/api/v1/agreements/redeem/', {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, course_id: id }),
  }, REDEEM_TIMEOUT_MS)
  const data = await response.json().catch(() => ({}))
  setResponseStatus(event, response.status)
  return data
})
