/**
 * The logged-in user's courses ("Mis cursos"): their active enrollments in
 * Open edX, bought through Campus or given by the team, with the title and
 * image from the Campus catalog when the course is in it.
 *
 * Not cached: the answer is per user. We forward the browser's LMS session
 * cookie to the enrollment API, as /api/courses/{id}/owned does.
 */

interface EdxEnrollment {
  created: string | null
  mode: string
  is_active: boolean
  course_details: {
    course_id: string
    course_name: string | null
    course_start: string | null
    course_end: string | null
    pacing_type?: string | null
  }
}

/** "course-v1:Campus+CONTA101+2026" → { org: "Campus", number: "CONTA101" } */
function keyParts(courseId: string) {
  const [org = '', number = ''] = courseId.replace(/^course-v1:/, '').split('+')
  return { org, number }
}

export default defineEventHandler(async (event): Promise<MyCourse[]> => {
  const cookie = getRequestHeader(event, 'cookie')
  if (!cookie || getCookie(event, 'edxloggedin') !== 'true') {
    throw createError({ statusCode: 401, statusMessage: 'No has iniciado sesión.' })
  }
  const lms = useRuntimeConfig().openedxLmsUrl.replace(/\/$/, '')

  const [enrollments, catalog] = await Promise.all([
    $fetch<EdxEnrollment[]>(`${lms}/api/enrollment/v1/enrollment`, { headers: { cookie } }).catch((error) => {
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        throw createError({ statusCode: 401, statusMessage: 'No has iniciado sesión.' })
      }
      throw createError({ statusCode: 502, statusMessage: 'Open edX no responde. Intenta de nuevo en unos minutos.' })
    }),
    // Same cached answer as the catalog page. Without it the list still works,
    // with the names Open edX knows.
    $fetch<CourseSummary[]>('/api/courses').catch(() => [] as CourseSummary[]),
  ])
  const byId = new Map(catalog.map(course => [course.id, course]))

  return enrollments
    .filter(enrollment => enrollment.is_active)
    .map((enrollment): MyCourse => {
      const details = enrollment.course_details
      const entry = byId.get(details.course_id)
      const { org, number } = keyParts(details.course_id)
      return {
        id: details.course_id,
        name: entry?.name || details.course_name || details.course_id,
        org: entry?.org || org,
        number: entry?.number || number,
        image: entry?.image ?? null,
        start: details.course_start,
        end: details.course_end,
        // The enrollment API says "Self Paced" / "Instructor Paced".
        pacing: entry?.pacing ?? (/instructor/i.test(details.pacing_type ?? '') ? 'instructor' : 'self'),
        // The CMS enrolls buyers as "verified"; anything else was given to them.
        purchased: enrollment.mode === 'verified',
        enrolledAt: enrollment.created,
        inCatalog: !!entry,
      }
    })
    // Most recent enrollment first.
    .sort((a, b) => (b.enrolledAt ?? '').localeCompare(a.enrolledAt ?? ''))
})
