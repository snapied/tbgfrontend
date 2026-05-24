// Tokenised magic links for student testimonial submissions.
//
// Goal: when a teacher hits "Ask 23 past students" from the Build
// Your Wall card, each student receives a personalised URL that
// pre-fills the submission form with their name, course, and
// instructor attribution — without forcing them to sign in.
//
// Token shape (URL-safe base64 of a JSON payload):
//   { s: tenantSlug, u: studentUserId?, n: name?, c: courseId?, i: instructorId?, t: timestamp }
//
// We deliberately don't sign the token in this POC — the server-side
// API endpoint is the source of truth for which student → course
// pairs are eligible (it cross-checks against the enrolment table at
// submit time). The token is just a UX convenience; a tampered token
// can't escalate to writing a testimonial for a non-existent course
// because the server rejects unrecognised pairs.
//
// A future v2 swaps this for HMAC-signed tokens once the API
// surface is hardened.

export interface MagicLinkPayload {
  /** Tenant slug — needed because the magic link can land cross-tenant. */
  tenantSlug: string
  /** Optional pre-fill for the submitting student. */
  studentUserId?: string
  studentName?: string
  studentEmail?: string
  /** Course this testimonial is about (drives the public form's "About course"
   *  pre-fill). */
  courseId?: string
  /** Instructor this testimonial is about (drives `aboutInstructorId`). */
  instructorId?: string
  /** Issue timestamp — caller decides expiry policy. */
  issuedAt: number
}

const SHAPE_MAP: Record<string, keyof MagicLinkPayload> = {
  s: "tenantSlug",
  u: "studentUserId",
  n: "studentName",
  e: "studentEmail",
  c: "courseId",
  i: "instructorId",
  t: "issuedAt",
}
const KEY_TO_SHORT = Object.fromEntries(
  Object.entries(SHAPE_MAP).map(([s, k]) => [k, s]),
) as Record<keyof MagicLinkPayload, string>

/** URL-safe base64 encode (no padding, no `+/`). Works in browser + Node. */
function b64UrlEncode(s: string): string {
  if (typeof window !== "undefined") {
    return window
      .btoa(unescape(encodeURIComponent(s)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  }
  // Node fallback (used during SSG / API routes).
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}
function b64UrlDecode(s: string): string {
  const pad = s.length % 4
  const padded = s + (pad ? "=".repeat(4 - pad) : "")
  const normalised = padded.replace(/-/g, "+").replace(/_/g, "/")
  if (typeof window !== "undefined") {
    return decodeURIComponent(escape(window.atob(normalised)))
  }
  return Buffer.from(normalised, "base64").toString("utf8")
}

export function encodeMagicLink(payload: MagicLinkPayload): string {
  const short: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null || v === "") continue
    const s = KEY_TO_SHORT[k as keyof MagicLinkPayload]
    if (!s) continue
    short[s] = v
  }
  return b64UrlEncode(JSON.stringify(short))
}

export function decodeMagicLink(token: string): MagicLinkPayload | null {
  if (!token) return null
  try {
    const json = b64UrlDecode(token)
    const short = JSON.parse(json) as Record<string, unknown>
    const out: Partial<MagicLinkPayload> = {}
    for (const [s, v] of Object.entries(short)) {
      const k = SHAPE_MAP[s]
      if (!k) continue
      ;(out as Record<string, unknown>)[k] = v
    }
    if (!out.tenantSlug) return null
    return {
      tenantSlug: String(out.tenantSlug),
      studentUserId: out.studentUserId ? String(out.studentUserId) : undefined,
      studentName: out.studentName ? String(out.studentName) : undefined,
      studentEmail: out.studentEmail ? String(out.studentEmail) : undefined,
      courseId: out.courseId ? String(out.courseId) : undefined,
      instructorId: out.instructorId ? String(out.instructorId) : undefined,
      issuedAt: typeof out.issuedAt === "number" ? out.issuedAt : Date.now(),
    }
  } catch {
    return null
  }
}

/** Build a fully-qualified public submission URL from a payload. */
export function buildMagicLink(origin: string, payload: MagicLinkPayload): string {
  const token = encodeMagicLink(payload)
  // Use a top-level `/testimonial` route so the form survives
  // tenant-portal rebranding (the public sub-portal doesn't need to
  // host this — it's a platform-level capture).
  return `${origin.replace(/\/$/, "")}/testimonial?t=${token}`
}

/** Token-age helper. We treat 30 days as the soft window — submissions
 *  after that still go through but render a "this link is old, please
 *  verify the course you're reviewing" hint on the form. */
export function tokenAgeDays(payload: MagicLinkPayload): number {
  return Math.floor((Date.now() - payload.issuedAt) / 86400000)
}
