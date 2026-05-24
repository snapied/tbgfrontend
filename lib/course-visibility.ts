// Course visibility helpers — one place that decides "is this
// course allowed to appear in the catalogue?" and "should this
// visitor see the detail page?".
//
// CourseVisibility = "public" | "unlisted" | "password" | "private"
//   • public   — discoverable on the catalogue + open to anyone
//   • unlisted — hidden from the catalogue, openable via direct link
//   • password — hidden from the catalogue; detail page rendered
//                only after the visitor enters `accessPassword`
//   • private  — invite-only; detail page rendered only for
//                enrolled students (or the course's instructor /
//                co-instructors / workspace admins / instructors).
//
// Status interplay: only `status === "published"` courses ever
// appear in the catalogue. Draft and archived courses are filtered
// out regardless of visibility.

import type { Course, CourseVisibility, Enrollment, User } from "./lms-store"

export function getCourseVisibility(course: Pick<Course, "visibility">): CourseVisibility {
  // Legacy rows pre-date the visibility column; treat missing as public.
  return course.visibility ?? "public"
}

/** True iff the course should appear in the public catalogue list. */
export function isCatalogVisible(course: Course): boolean {
  if (course.status !== "published") return false
  return getCourseVisibility(course) === "public"
}

/** Snapshot of who's looking at the course. All optional — callers
 *  on public pages can pass `{}` and we treat them as anonymous. */
export interface ViewerContext {
  /** Currently signed-in user (any role). */
  user?: Pick<User, "id" | "role"> | null
  /** Enrollments belonging to the viewer (any course). The helper
   *  filters internally to the one course it's checking. */
  enrollments?: Enrollment[]
  /** Whether the visitor passed the password gate this session.
   *  Stored in sessionStorage by the password gate component. */
  passwordOk?: boolean
}

export type AccessDecision =
  | { allowed: true; reason: "public" | "unlisted-link" | "password-passed" | "enrolled" | "instructor" | "admin" }
  | { allowed: false; reason: "needs-password" | "needs-invite" | "draft-or-archived" }

/** Decide whether the viewer can SEE the course detail / lesson
 *  pages. Use this on every entry point that resolves a course by
 *  slug or id from a public URL. */
export function canViewCourse(course: Course, viewer: ViewerContext = {}): AccessDecision {
  // Draft + archived → blocked everywhere on the public surface.
  if (course.status !== "published") {
    return { allowed: false, reason: "draft-or-archived" }
  }

  const vis = getCourseVisibility(course)

  // Instructor / co-instructor of the course bypasses every gate.
  // They need to be able to preview their own course at any time.
  const viewerId = viewer.user?.id
  if (viewerId) {
    if (course.instructor?.id === viewerId) return { allowed: true, reason: "instructor" }
    if ((course.coInstructorIds ?? []).includes(viewerId)) return { allowed: true, reason: "instructor" }
    // Workspace admins / instructors at the tenant level see everything.
    if (viewer.user?.role === "admin" || viewer.user?.role === "instructor") {
      return { allowed: true, reason: "admin" }
    }
  }

  // Enrolled students get in regardless of visibility — once they're
  // in a private course's roster, the gate is moot for them.
  if (viewerId) {
    const isEnrolled = (viewer.enrollments ?? []).some(
      (e) => e.studentId === viewerId && e.courseId === course.id,
    )
    if (isEnrolled) return { allowed: true, reason: "enrolled" }
  }

  switch (vis) {
    case "public":
      return { allowed: true, reason: "public" }
    case "unlisted":
      // Anyone with the link gets in — they can't have found the URL
      // by browsing the catalogue.
      return { allowed: true, reason: "unlisted-link" }
    case "password":
      return viewer.passwordOk
        ? { allowed: true, reason: "password-passed" }
        : { allowed: false, reason: "needs-password" }
    case "private":
      return { allowed: false, reason: "needs-invite" }
  }
}

// ── Password gate session storage ───────────────────────────────
// Once a visitor enters the right password for a course we drop a
// breadcrumb in sessionStorage so they aren't re-prompted on every
// navigation in the same tab. sessionStorage (not localStorage) so
// closing the tab clears the bypass — passwords aren't long-lived.

const PASSWORD_OK_KEY = (courseId: string) => `thebigclass.course-pw-ok.${courseId}`

export function rememberPasswordOk(courseId: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(PASSWORD_OK_KEY(courseId), "1")
  } catch {
    /* private mode — gate stays per-render only */
  }
}

export function hasPasswordOk(courseId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.sessionStorage.getItem(PASSWORD_OK_KEY(courseId)) === "1"
  } catch {
    return false
  }
}

export function forgetPasswordOk(courseId: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(PASSWORD_OK_KEY(courseId))
  } catch {
    /* ignore */
  }
}

// Human label used in toast / inline copy on the dashboard.
export function visibilityLabel(v: CourseVisibility): string {
  switch (v) {
    case "public":   return "Public — discoverable on the catalogue"
    case "unlisted": return "Unlisted — accessible only via direct link"
    case "password": return "Password-gated — requires the course password"
    case "private":  return "Private — invite-only (enrolled students)"
  }
}
