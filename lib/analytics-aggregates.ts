"use client"

// Centralised analytics aggregations. The Analytics dashboard reads
// these — they take the raw lms-store + store-store rows and turn
// them into the chart-ready shapes the page renders.
//
// All bucketing is calendar-month based unless otherwise noted. Date
// math uses local time (toLocaleString); analytics are creator-facing
// and stamped against the creator's day.
//
// Why a separate module: getAnalytics in lms-store used hardcoded
// numbers for the trend charts. Splitting the real math out keeps
// lms-store focused on state and makes the aggregations
// independently testable / mock-able.

import type { Course, Enrollment, User } from "./lms-store"
import type { Order } from "./store-store"

// ────────────────────────────────────────────────────────────────────
// Tiny date helpers
// ────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000

function yearMonth(d: Date): string {
  // YYYY-MM. Lexicographic order = chronological order.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(ym: string): string {
  // "2026-04" → "Apr 26"
  const [y, m] = ym.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short", year: "2-digit" })
}

// Returns an array of the last `n` months as YYYY-MM, oldest first.
function recentMonths(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(yearMonth(d))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Aggregates
// ────────────────────────────────────────────────────────────────────

export interface TrendPoint {
  /** "Apr 26" — already display-formatted. */
  label: string
  /** Raw YYYY-MM key, useful for sorting / joining. */
  key: string
  value: number
}

/** Revenue per month for the last `months` calendar months. */
export function revenueByMonth(orders: Order[], months = 12): TrendPoint[] {
  const buckets = new Map<string, number>(recentMonths(months).map((k) => [k, 0]))
  for (const o of orders) {
    if (o.status !== "paid") continue
    const ym = yearMonth(new Date(o.paidAt ?? o.createdAt))
    if (buckets.has(ym)) buckets.set(ym, (buckets.get(ym) ?? 0) + o.total)
  }
  return Array.from(buckets, ([key, value]) => ({ key, value, label: monthLabel(key) }))
}

/** New student signups per month. */
export function signupsByMonth(students: User[], months = 12): TrendPoint[] {
  const buckets = new Map<string, number>(recentMonths(months).map((k) => [k, 0]))
  for (const s of students) {
    if (!s.createdAt) continue
    const ym = yearMonth(new Date(s.createdAt))
    if (buckets.has(ym)) buckets.set(ym, (buckets.get(ym) ?? 0) + 1)
  }
  return Array.from(buckets, ([key, value]) => ({ key, value, label: monthLabel(key) }))
}

/** Enrollments started per month. */
export function enrollmentsByMonth(enrollments: Enrollment[], months = 12): TrendPoint[] {
  const buckets = new Map<string, number>(recentMonths(months).map((k) => [k, 0]))
  for (const e of enrollments) {
    if (!e.enrolledAt) continue
    const ym = yearMonth(new Date(e.enrolledAt))
    if (buckets.has(ym)) buckets.set(ym, (buckets.get(ym) ?? 0) + 1)
  }
  return Array.from(buckets, ([key, value]) => ({ key, value, label: monthLabel(key) }))
}

export interface TopCourseRow {
  courseId: string
  title: string
  enrollments: number
  revenue: number
  completionPct: number
}

/** Top N courses by revenue, plus completion percentage. */
export function topCourses(
  courses: Course[],
  enrollments: Enrollment[],
  limit = 8,
): TopCourseRow[] {
  return courses
    .map((c) => {
      const courseEnrolls = enrollments.filter((e) => e.courseId === c.id)
      const completed = courseEnrolls.filter((e) => e.progress >= 100).length
      return {
        courseId: c.id,
        title: c.title,
        enrollments: c.enrolledCount,
        revenue: c.price * c.enrolledCount,
        completionPct: courseEnrolls.length ? Math.round((completed / courseEnrolls.length) * 100) : 0,
      } satisfies TopCourseRow
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export interface FunnelStage {
  label: string
  count: number
  /** % of the FIRST stage (= "of total signups"). */
  pctOfTop: number
}

/** Acquisition funnel: signups → enrolled → started → completed → certificate. */
export function acquisitionFunnel(
  students: User[],
  enrollments: Enrollment[],
  certCount: number,
): FunnelStage[] {
  const signups = students.length
  const enrolled = new Set(enrollments.map((e) => e.studentId)).size
  const started = enrollments.filter((e) => e.progress > 0).length
  const completed = enrollments.filter((e) => e.progress >= 100).length
  const base = Math.max(1, signups)
  const rows = [
    { label: "Signed up", count: signups },
    { label: "Enrolled in a course", count: enrolled },
    { label: "Started watching", count: started },
    { label: "Completed", count: completed },
    { label: "Got certificate", count: certCount },
  ]
  return rows.map((r) => ({ ...r, pctOfTop: Math.round((r.count / base) * 100) }))
}

export interface CohortRow {
  /** YYYY-MM signup month. */
  cohort: string
  cohortLabel: string
  size: number
  /** Retention[k] = % of cohort still active in week k after signup. */
  retention: number[]
}

/**
 * Cohort retention — group students by signup month, then ask "did
 * this student have any enrollment activity in week N after signup?"
 * Cheap proxy for "are they still engaged". We use the student's
 * last enrollment.lastAccessedAt as the activity signal.
 */
export function cohortRetention(
  students: User[],
  enrollments: Enrollment[],
  weeks = 8,
  monthsBack = 6,
): CohortRow[] {
  const cohorts = recentMonths(monthsBack)
  const cohortStudents = new Map<string, User[]>()
  for (const c of cohorts) cohortStudents.set(c, [])
  for (const s of students) {
    if (!s.createdAt) continue
    const ym = yearMonth(new Date(s.createdAt))
    if (cohortStudents.has(ym)) cohortStudents.get(ym)!.push(s)
  }
  // Index latest activity per student.
  const lastActiveByStudent = new Map<string, number>()
  for (const e of enrollments) {
    const ts = new Date(e.lastAccessedAt ?? e.enrolledAt).getTime()
    const prev = lastActiveByStudent.get(e.studentId) ?? 0
    if (ts > prev) lastActiveByStudent.set(e.studentId, ts)
  }
  return cohorts.map((c) => {
    const members = cohortStudents.get(c) ?? []
    const retention: number[] = []
    for (let w = 0; w < weeks; w++) {
      // Students active any time in week w after their signup.
      const active = members.filter((s) => {
        const signupAt = new Date(s.createdAt ?? Date.now()).getTime()
        const lastActive = lastActiveByStudent.get(s.id) ?? 0
        if (!lastActive) return false
        const weeksSince = Math.floor((lastActive - signupAt) / (7 * MS_PER_DAY))
        // "Active during week w" → most recent activity ≥ start of week w
        return weeksSince >= w
      }).length
      retention.push(members.length ? Math.round((active / members.length) * 100) : 0)
    }
    return {
      cohort: c,
      cohortLabel: monthLabel(c),
      size: members.length,
      retention,
    }
  })
}

/**
 * Day-of-week × hour heatmap for live class attendance. Helps creators
 * find their "best slot" empirically rather than guessing.
 */
export function liveAttendanceHeatmap(
  attendance: Array<{ joinedAt: string | Date }>,
): number[][] {
  // [day 0..6][hour 0..23]
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const a of attendance) {
    const d = new Date(a.joinedAt)
    grid[d.getDay()][d.getHours()] += 1
  }
  return grid
}
