// Reserved portal-page slugs.
//
// Pages live at `/p/<tenant>/<slug>`. If a teacher creates a page at
// `/login`, the portal sub-router resolves /p/<tenant>/login to BOTH
// the teacher's page and the platform login form — usually the latter
// wins because of route order, so the teacher's page silently 404s.
//
// We block creation outright AND surface a friendly "try this name"
// suggestion. Reserved slugs are stored without the leading slash so
// the same list works for both display ("/login") and storage forms.
//
// Additions/edits:
//   • Add the bare slug (no leading slash) to RESERVED_SLUGS.
//   • Provide a friendly alternative in SUGGESTIONS so the error
//     doesn't dead-end the user.

export const RESERVED_SLUGS: ReadonlyArray<string> = [
  // Auth surfaces — the platform owns these routes.
  "login",
  "signup",
  "log-in",
  "sign-in",
  "sign-up",
  "logout",
  "register",
  "forgot-password",
  "reset-password",
  "verify",
  "verify-email",
  // Commerce + system.
  "checkout",
  "order",
  "billing",
  "settings",
  "dashboard",
  // API surfaces.
  "api",
  "graphql",
  "rest",
  "webhook",
  "webhooks",
  // Built-in portal sub-routes (handled by /p/[tenant]/* layout).
  "courses",
  "blog",
  "wall",
  "members",
  "teachers",
  "instructors",
  "search",
  "404",
  "500",
  "robots.txt",
  "sitemap.xml",
  // Common subdomain-style names that risk confusion.
  "admin",
  "www",
  "mail",
  "ftp",
]

const RESERVED_SET = new Set(RESERVED_SLUGS.map((s) => s.toLowerCase()))

const SUGGESTIONS: Record<string, string> = {
  login: "/log-in-help",
  signup: "/join",
  "sign-up": "/join",
  "sign-in": "/account",
  logout: "/leave",
  checkout: "/buy",
  order: "/orders-info",
  api: "/integrations",
  dashboard: "/inside",
  admin: "/team",
  courses: "/our-courses",
  blog: "/news",
  teachers: "/our-team",
  instructors: "/our-team",
  members: "/community",
}

/** Normalise to the canonical comparable form: lowercase, leading
 *  slash stripped, trailing slash stripped. */
function normaliseSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/^\/+/, "").replace(/\/+$/, "")
}

/** Returns true if the slug collides with a reserved platform route. */
export function isReservedSlug(slug: string): boolean {
  const n = normaliseSlug(slug)
  if (!n) return false
  return RESERVED_SET.has(n)
}

/** Returns a friendly alternative slug for a reserved one. Falls back
 *  to a `-page` suffix when no curated suggestion exists. */
export function suggestAlternativeSlug(slug: string): string {
  const n = normaliseSlug(slug)
  if (!n) return "/new-page"
  if (SUGGESTIONS[n]) return SUGGESTIONS[n]
  return `/${n}-page`
}
