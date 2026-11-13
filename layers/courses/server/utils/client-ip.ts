import type { H3Event } from 'h3'

/**
 * The browser's IP, for the CMS rate limits. Behind Caddy, X-Forwarded-For is
 * written by Caddy and its last entry is the client; without a proxy (dev) it's
 * the socket address. h3's getRequestIP takes the *first* entry, which the
 * client can set to anything, so we don't use it.
 */
export function clientIp(event: H3Event): string {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  const last = forwarded?.split(',').pop()?.trim()
  return last || event.node.req.socket.remoteAddress || ''
}

/** Headers for a JSON call to the CMS that carry the client IP (replacing, never appending to, what the browser sent). */
export function jsonHeadersWithIp(event: H3Event): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const ip = clientIp(event)
  if (ip) headers['x-forwarded-for'] = ip
  return headers
}
