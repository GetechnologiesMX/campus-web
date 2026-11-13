/**
 * GET /comprar/{course_id}[?codigo=BUENFIN] — target of the "Comprar" button.
 * A plain link, so the page never deals with tokens or CSRF: anonymous
 * visitors go through the LMS login and come back here (with the code); then
 * the CMS prices the course (offer or code) and starts the Stripe checkout and
 * we redirect to it. A 100% code enrolls right away, and a course already
 * owned goes straight into the course.
 */

// Discount code problems: back to the course page with the code, which
// checks it again and explains what's wrong.
const CODE_ERRORS = new Set(['invalid_code', 'not_started', 'expired', 'not_applicable', 'sold_out', 'already_used', 'too_many_attempts'])

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id', { decode: true })!
  const config = useRuntimeConfig()
  const codigo = getQuery(event).codigo
  const code = typeof codigo === 'string' ? codigo.slice(0, 64) : ''
  const loginUrl = `${config.public.lmsUrl}/login?next=${encodeURIComponent(getRequestURL(event).href)}`
  const coursePage = `/cursos/${encodeURIComponent(id)}`
  const courseUrl = `${config.public.learningMfeUrl}/course/${encodeURIComponent(id)}/home`

  // Without the LMS JWT cmsRequest answers 401 itself. A 100% code makes the
  // CMS enroll in Open edX before answering: give it time.
  const response = await cmsRequest(event, '/api/v1/checkout/', {
    method: 'POST',
    headers: jsonHeadersWithIp(event),
    body: JSON.stringify({ course_id: id, ...(code ? { code } : {}) }),
  }, 45_000).catch(() => null)
  const data = await response?.json().catch(() => ({})) ?? {}

  if (response?.ok && data.checkout_url) {
    return sendRedirect(event, data.checkout_url)
  }
  if (response?.ok && data.enrolled) {
    return sendRedirect(event, courseUrl)
  }
  if (response?.status === 401) {
    return sendRedirect(event, loginUrl)
  }
  if (data.code === 'already_owned') {
    return sendRedirect(event, courseUrl)
  }
  if (code && CODE_ERRORS.has(data.code)) {
    return sendRedirect(event, `${coursePage}?codigo=${encodeURIComponent(code)}`)
  }
  if (data.code === 'price_changed') {
    return sendRedirect(event, `${coursePage}?payment=price_changed`)
  }
  // Not for sale anymore, or Stripe/CMS/Open edX down: back to the course page, which explains it.
  return sendRedirect(event, `${coursePage}?payment=unavailable`)
})
