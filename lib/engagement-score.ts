// Engagement / churn classifier for instructors.
//
// Derives a per-student lifecycle stage from signals already in the
// LMS store (attendance, quiz attempts, submissions, doubts, days
// since signup, leaderboard points). No new persistence — the
// instructor CRM is a read-model the same way the leaderboard is.
//
// Stages, in increasing-concern order:
//   • champion   — top 10% of the cohort by points AND active in the
//                  last 7 days. The students you brag about.
//   • active     — any signal of activity in the last 7 days.
//   • onboarding — enrolled less than 7 days ago. Treated separately
//                  so a fresh signup isn't immediately flagged as
//                  "cooling" before they've had a chance.
//   • cooling    — last activity 7–14 days ago.
//   • at-risk    — last activity 15–29 days ago. Where bulk nudges
//                  earn their keep.
//   • churned    — no activity for 30+ days. Often a write-off; the
//                  instructor decides whether to attempt reactivation
//                  or move on.

import type {
  AssignmentSubmission,
  AttendanceRecord,
  Doubt,
  Enrollment,
  QuizAttempt,
  User,
} from "@/lib/lms-store"

export type LifecycleStage =
  | "champion"
  | "active"
  | "onboarding"
  | "cooling"
  | "at-risk"
  | "churned"

export interface LifecycleStageMeta {
  /** Display label shown on instructor surfaces. */
  label: string
  /** Tailwind colour token used for the chip — short keyword so
   *  callers can compose their own class strings. */
  tone: "emerald" | "blue" | "slate" | "amber" | "rose" | "destructive"
  /** One-liner hint that goes in the tooltip / "what should I do" copy. */
  hint: string
}

export const STAGE_META: Record<LifecycleStage, LifecycleStageMeta> = {
  champion: {
    label: "Champion",
    tone: "emerald",
    hint: "Top of the cohort and recently active — your evangelist material.",
  },
  active: {
    label: "Active",
    tone: "blue",
    hint: "Doing the work in the last week. Keep them in flow.",
  },
  onboarding: {
    label: "Onboarding",
    tone: "slate",
    hint: "Enrolled in the last week. Watch for early engagement signals.",
  },
  cooling: {
    label: "Cooling",
    tone: "amber",
    hint: "Quiet for a week or two. A nudge usually pulls them back.",
  },
  "at-risk": {
    label: "At risk",
    tone: "rose",
    hint: "Two to four weeks of silence — this is when one outreach saves the enrollment.",
  },
  churned: {
    label: "Churned",
    tone: "destructive",
    hint: "30+ days silent. Consider win-back or wave goodbye.",
  },
}

export interface EngagementInputs {
  students: User[]
  enrollments: Enrollment[]
  attendance: AttendanceRecord[]
  attempts: QuizAttempt[]
  submissions: AssignmentSubmission[]
  doubts?: Doubt[]
  /** Optional points map (studentId → total) so the classifier can
   *  pick "champion" without re-running the full leaderboard.
   *  Callers that have the leaderboard handy pass it in; everyone
   *  else gets correct stages minus the champion promotion. */
  pointsByStudent?: Map<string, number>
}

export interface EngagementRow {
  student: User
  stage: LifecycleStage
  lastActiveAt: string | null
  daysSinceLastActive: number | null
  enrolledAt: string | null
  points: number
}

function ts(iso: string | undefined | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

/**
 * Compute every student's lifecycle stage in one pass. The result is
 * ordered with the most-concerning stages first (churned → at-risk →
 * cooling → onboarding → active → champion) so a table can render
 * the rows that need attention up top.
 */
export function classifyStudents(input: EngagementInputs): EngagementRow[] {
  // Bucket the last-active timestamp per student across every signal
  // we track. We keep the latest one — the moment of last activity
  // across all surfaces, not last-attended class specifically.
  const lastByStudent = new Map<string, number>()
  const noteSignal = (sid: string, iso: string | undefined | null) => {
    const t = ts(iso ?? undefined)
    if (t === null) return
    const prev = lastByStudent.get(sid)
    if (prev === undefined || t > prev) lastByStudent.set(sid, t)
  }
  for (const r of input.attendance) noteSignal(r.studentId, r.joinedAt)
  for (const a of input.attempts) noteSignal(a.studentId, a.completedAt ?? a.startedAt)
  for (const s of input.submissions) noteSignal(s.studentId, s.submittedAt)
  if (input.doubts) {
    for (const d of input.doubts) noteSignal(d.studentId, d.createdAt)
  }
  // Lesson-completion timestamps live on Enrollment.lastAccessedAt, so
  // we use that as a soft signal too (a student who's clicked into the
  // course recently counts as active even without a graded artefact).
  for (const e of input.enrollments) noteSignal(e.studentId, e.lastAccessedAt)

  // Pre-compute the champion threshold (top-10% by points). Falls
  // back to "no champion" when the points map is missing or the
  // cohort is too small (< 10 students with non-zero points).
  let championThreshold = Infinity
  if (input.pointsByStudent && input.pointsByStudent.size >= 10) {
    const points = [...input.pointsByStudent.values()].sort((a, b) => b - a)
    const cutoffIdx = Math.max(0, Math.floor(points.length * 0.1) - 1)
    championThreshold = points[cutoffIdx] ?? Infinity
  }

  // Earliest enrollment per student — drives the "onboarding" window
  // (only counts students enrolled in the last week as onboarding,
  // regardless of activity).
  const earliestEnrollmentByStudent = new Map<string, number>()
  for (const e of input.enrollments) {
    const t = ts(e.enrolledAt)
    if (t === null) continue
    const prev = earliestEnrollmentByStudent.get(e.studentId)
    if (prev === undefined || t < prev) {
      earliestEnrollmentByStudent.set(e.studentId, t)
    }
  }

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  const rows: EngagementRow[] = []
  for (const student of input.students) {
    if (student.role !== "student") continue
    const lastT = lastByStudent.get(student.id) ?? null
    const enrolledT = earliestEnrollmentByStudent.get(student.id) ?? ts(student.createdAt) ?? null
    const points = input.pointsByStudent?.get(student.id) ?? 0
    const daysSinceLastActive =
      lastT === null ? null : Math.floor((now - lastT) / DAY)
    const daysSinceEnrolled =
      enrolledT === null ? null : Math.floor((now - enrolledT) / DAY)

    let stage: LifecycleStage
    if (daysSinceLastActive !== null && daysSinceLastActive <= 7) {
      // Recent activity. Promote to champion if they're top-10% AND
      // their points clear the threshold — both checks because the
      // threshold could be 0 in tiny cohorts.
      if (points >= championThreshold && points > 0) {
        stage = "champion"
      } else {
        stage = "active"
      }
    } else if (
      daysSinceEnrolled !== null &&
      daysSinceEnrolled <= 7 &&
      (daysSinceLastActive === null || daysSinceLastActive > 7)
    ) {
      // Brand-new but already gone quiet — still in the "onboarding"
      // window where one warm touch can save them.
      stage = "onboarding"
    } else if (daysSinceLastActive === null) {
      // Ever-quiet student. If they've been enrolled forever, that's
      // churned; if recently, treat as onboarding.
      stage =
        daysSinceEnrolled !== null && daysSinceEnrolled <= 7
          ? "onboarding"
          : daysSinceEnrolled !== null && daysSinceEnrolled <= 30
            ? "at-risk"
            : "churned"
    } else if (daysSinceLastActive <= 14) {
      stage = "cooling"
    } else if (daysSinceLastActive <= 29) {
      stage = "at-risk"
    } else {
      stage = "churned"
    }

    rows.push({
      student,
      stage,
      lastActiveAt: lastT ? new Date(lastT).toISOString() : null,
      daysSinceLastActive,
      enrolledAt: enrolledT ? new Date(enrolledT).toISOString() : null,
      points,
    })
  }

  // Sort by urgency first (churned > at-risk > cooling > onboarding >
  // active > champion) so the rows that need attention lead the
  // table. Within a stage, students who've been silent longest come
  // first.
  const stageOrder: Record<LifecycleStage, number> = {
    churned: 0,
    "at-risk": 1,
    cooling: 2,
    onboarding: 3,
    active: 4,
    champion: 5,
  }
  rows.sort((a, b) => {
    const so = stageOrder[a.stage] - stageOrder[b.stage]
    if (so !== 0) return so
    const ad = a.daysSinceLastActive ?? Number.MAX_SAFE_INTEGER
    const bd = b.daysSinceLastActive ?? Number.MAX_SAFE_INTEGER
    return bd - ad
  })
  return rows
}
