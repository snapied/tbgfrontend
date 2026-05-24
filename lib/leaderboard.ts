// Leaderboard scoring engine.
//
// All scoring is derived from existing data: attendance records, quiz
// attempts, assignment submissions, lesson completions. No new persistence
// — the leaderboard is a live read-model so it stays in sync with
// everything happening across the app without separate event plumbing.

import type {
  AssignmentSubmission,
  AttendanceRecord,
  Doubt,
  Enrollment,
  LiveSession,
  Quiz,
  QuizAttempt,
  StudentGroup,
  User,
} from "@/lib/lms-store"
import type { WallEntry } from "@/lib/wall-store"

export interface ScoreRules {
  attendedClass: number
  quizAttempted: number
  quizPassedBonus: number          // added on top of quizAttempted for a pass
  assignmentSubmitted: number
  assignmentHighScoreBonus: number // added when graded score >= 80% of max
  lessonCompleted: number
  courseCompleted: number
  // ── Engagement ──────────────────────────────────────────────
  // Baseline points that exist independent of "did you finish a
  // quiz". Designed so a brand-new tenant still has a non-empty
  // leaderboard the day it spins up — every student walks in with a
  // welcome bonus and gains small amounts by being present in the
  // workspace (joining a community, asking a doubt, posting a win).
  welcomeBonus: number              // every student, just for being here
  profileComplete: number           // avatar + phone filled in
  perCommunityJoined: number
  perDoubtAsked: number
  perWallEntry: number
  perDayActive: number              // 1 pt per day since they signed up
  daysActiveCap: number             // cap on how many days count
}

export const DEFAULT_SCORE_RULES: ScoreRules = {
  attendedClass: 10,
  quizAttempted: 5,
  quizPassedBonus: 15,
  assignmentSubmitted: 15,
  assignmentHighScoreBonus: 10,
  lessonCompleted: 2,
  courseCompleted: 50,
  welcomeBonus: 50,
  profileComplete: 20,
  perCommunityJoined: 15,
  perDoubtAsked: 5,
  perWallEntry: 10,
  perDayActive: 1,
  daysActiveCap: 30,
}

export interface ScoreBreakdown {
  attendance: number
  quizzes: number
  assignments: number
  lessons: number
  courses: number
  engagement: number
  total: number
}

export interface LeaderboardEntry {
  student: User
  rank: number
  total: number
  breakdown: ScoreBreakdown
  stats: {
    classesAttended: number
    quizzesTaken: number
    quizzesPassed: number
    assignmentsSubmitted: number
    assignmentsHighScore: number
    lessonsCompleted: number
    coursesCompleted: number
    communitiesJoined: number
    doubtsAsked: number
    wallEntries: number
    daysActive: number
    profileComplete: boolean
  }
}

interface ScoreInputs {
  students: User[]
  enrollments: Enrollment[]
  attendance: AttendanceRecord[]
  attempts: QuizAttempt[]
  quizzes: Quiz[]
  submissions: AssignmentSubmission[]
  sessions: LiveSession[]  // used to filter only sessions that actually happened
  // Optional engagement signals — leaderboard still works if these
  // aren't passed (they'll just contribute zero), so existing
  // callers don't break.
  studentGroups?: StudentGroup[]
  doubts?: Doubt[]
  wallEntries?: WallEntry[]
  rules?: ScoreRules
  /** Optional — when present, lets the engine compute "lessons
   *  completed" against each course's CURRENT lesson set rather
   *  than blindly trusting `enrollment.completedLessons.length`,
   *  which keeps counting after lessons are removed. Same input as
   *  the engagement classifier so callers can pass the same array. */
  courseLessonIds?: Map<string, Set<string>>
}

/**
 * Compute the leaderboard across all enrolled students in the tenant.
 * Students with zero activity are excluded; sorted by total points desc,
 * with stable secondary sort by name.
 */
export function computeLeaderboard(input: ScoreInputs): LeaderboardEntry[] {
  const rules = input.rules ?? DEFAULT_SCORE_RULES
  const quizById = new Map(input.quizzes.map((q) => [q.id, q]))

  // For attendance, we only count sessions that ended or were marked as held.
  const validSessionIds = new Set(
    input.sessions
      .filter((s) => {
        if (s.status === "cancelled") return false
        if (s.wasHeld === false) return false
        if (s.wasHeld === true) return true
        const ended = new Date(s.scheduledAt).getTime() + s.durationMinutes * 60_000 < Date.now()
        return ended
      })
      .map((s) => s.id),
  )

  // Bucket inputs by studentId for O(N) scoring.
  const attendanceByStudent = new Map<string, AttendanceRecord[]>()
  for (const a of input.attendance) {
    if (!validSessionIds.has(a.sessionId)) continue
    const arr = attendanceByStudent.get(a.studentId) ?? []
    arr.push(a)
    attendanceByStudent.set(a.studentId, arr)
  }
  const attemptsByStudent = new Map<string, QuizAttempt[]>()
  for (const a of input.attempts) {
    const arr = attemptsByStudent.get(a.studentId) ?? []
    arr.push(a)
    attemptsByStudent.set(a.studentId, arr)
  }
  const subsByStudent = new Map<string, AssignmentSubmission[]>()
  for (const s of input.submissions) {
    const arr = subsByStudent.get(s.studentId) ?? []
    arr.push(s)
    subsByStudent.set(s.studentId, arr)
  }
  const enrollmentsByStudent = new Map<string, Enrollment[]>()
  for (const e of input.enrollments) {
    const arr = enrollmentsByStudent.get(e.studentId) ?? []
    arr.push(e)
    enrollmentsByStudent.set(e.studentId, arr)
  }

  const entries: LeaderboardEntry[] = []

  for (const student of input.students) {
    if (student.role !== "student") continue

    const att   = attendanceByStudent.get(student.id) ?? []
    const atts  = attemptsByStudent.get(student.id)   ?? []
    const subs  = subsByStudent.get(student.id)        ?? []
    const enrs  = enrollmentsByStudent.get(student.id) ?? []

    const classesAttended = att.length

    // De-dupe quiz attempts per quiz — best attempt counts.
    const bestAttemptByQuiz = new Map<string, QuizAttempt>()
    for (const a of atts) {
      const prev = bestAttemptByQuiz.get(a.quizId)
      if (!prev || a.score > prev.score) bestAttemptByQuiz.set(a.quizId, a)
    }
    const quizzesTaken = bestAttemptByQuiz.size
    let quizzesPassed = 0
    for (const a of bestAttemptByQuiz.values()) {
      const q = quizById.get(a.quizId)
      if (!q) continue
      if (a.passed) quizzesPassed++
    }

    // Submissions — count by assignment (one credit per assignment, best score).
    const bestSubByAssignment = new Map<string, AssignmentSubmission>()
    for (const s of subs) {
      const prev = bestSubByAssignment.get(s.assignmentId)
      if (!prev || (s.score ?? 0) > (prev.score ?? 0)) bestSubByAssignment.set(s.assignmentId, s)
    }
    const assignmentsSubmitted = bestSubByAssignment.size
    let assignmentsHighScore = 0
    for (const s of bestSubByAssignment.values()) {
      if (s.score != null && s.score >= 80) assignmentsHighScore++
    }

    // Count lessons completed against each course's CURRENT lesson
    // set when the caller passes courseLessonIds. Otherwise fall back
    // to the stored array (preserves prior behaviour for callers that
    // didn't provide the map). The course-complete bonus uses the
    // same live ratio so a curriculum that grew after enrolment
    // doesn't keep flagging a half-finished course as done.
    let lessonsCompleted = 0
    let coursesCompleted = 0
    for (const e of enrs) {
      const liveSet = input.courseLessonIds?.get(e.courseId)
      const aliveDone = liveSet
        ? e.completedLessons.filter((id) => liveSet.has(id)).length
        : e.completedLessons.length
      lessonsCompleted += aliveDone
      const courseLessonCount = liveSet?.size
      const livePct =
        courseLessonCount && courseLessonCount > 0
          ? Math.round((aliveDone / courseLessonCount) * 100)
          : e.progress
      if (livePct >= 100) coursesCompleted++
    }

    // ── Engagement ──────────────────────────────────────────
    // Everyone starts with the welcome bonus the moment they show
    // up in the student roster — gives the leaderboard something
    // to render on day 1 of a tenant. Layered with small bumps
    // for "being part of the workspace" (community membership,
    // doubts asked, wall posts, days active) so movement on the
    // leaderboard tracks engagement, not just graded artefacts.
    const communitiesJoined = (input.studentGroups ?? []).filter((g) =>
      g.memberIds.includes(student.id),
    ).length
    const doubtsAsked = (input.doubts ?? []).filter(
      (d) => d.studentId === student.id,
    ).length
    const wallEntries = (input.wallEntries ?? []).filter(
      (w) => w.studentId === student.id,
    ).length
    const phone = (student.phone ?? "").trim()
    const avatar = (student.avatar ?? "").trim()
    const profileComplete = phone.length > 0 && avatar.length > 0
    const daysActive = (() => {
      const start = new Date(student.createdAt).getTime()
      if (!Number.isFinite(start)) return 0
      const ms = Date.now() - start
      if (ms <= 0) return 0
      const days = Math.floor(ms / (24 * 60 * 60 * 1000))
      return Math.min(days, rules.daysActiveCap)
    })()
    const engagement =
      rules.welcomeBonus +
      (profileComplete ? rules.profileComplete : 0) +
      communitiesJoined * rules.perCommunityJoined +
      doubtsAsked * rules.perDoubtAsked +
      wallEntries * rules.perWallEntry +
      daysActive * rules.perDayActive

    const breakdown: ScoreBreakdown = {
      attendance: classesAttended * rules.attendedClass,
      quizzes: quizzesTaken * rules.quizAttempted + quizzesPassed * rules.quizPassedBonus,
      assignments:
        assignmentsSubmitted * rules.assignmentSubmitted +
        assignmentsHighScore * rules.assignmentHighScoreBonus,
      lessons: lessonsCompleted * rules.lessonCompleted,
      courses: coursesCompleted * rules.courseCompleted,
      engagement,
      total: 0,
    }
    breakdown.total =
      breakdown.attendance +
      breakdown.quizzes +
      breakdown.assignments +
      breakdown.lessons +
      breakdown.courses +
      breakdown.engagement

    // Every student in the roster shows up — the welcome bonus
    // ensures the total is never zero, so we don't need to skip
    // "no activity" rows anymore. A fresh signup lands somewhere
    // near the bottom of the board with their welcome points and
    // climbs from there.
    entries.push({
      student,
      rank: 0,
      total: breakdown.total,
      breakdown,
      stats: {
        classesAttended,
        quizzesTaken,
        quizzesPassed,
        assignmentsSubmitted,
        assignmentsHighScore,
        lessonsCompleted,
        coursesCompleted,
        communitiesJoined,
        doubtsAsked,
        wallEntries,
        daysActive,
        profileComplete,
      },
    })
  }

  entries.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.student.name.localeCompare(b.student.name)
  })
  entries.forEach((e, i) => { e.rank = i + 1 })

  return entries
}

/**
 * Compact tier label for the top of the leaderboard. `total` is the
 * cohort size (number of ranked students), not a sentinel.
 */
export function tierForRank(rank: number, total: number): { label: string; emoji: string } | null {
  if (rank < 1) return null
  if (rank === 1) return { label: "Champion", emoji: "🥇" }
  if (rank === 2) return { label: "Runner-up", emoji: "🥈" }
  if (rank === 3) return { label: "Bronze", emoji: "🥉" }
  // For small cohorts we don't render a tier past 3rd — labelling
  // 4th of 7 as "Top half" is noise. For larger cohorts we use a
  // 10% slice (rounded UP so 11 students still has 2 top-10% rows).
  if (total < 10) return null
  if (rank <= Math.max(4, Math.ceil(total * 0.1))) return { label: "Top 10%", emoji: "⭐" }
  return null
}

// ============================================================
// Gamification — levels, badges, streaks
// ============================================================

// Point-based progression independent of rank. Lets a student climb
// even when the cohort is small/static, and makes "+15 pts for joining
// a community" feel concrete: it's a slice of the progress bar to the
// next level. Names are deliberately schoolwork-flavoured rather than
// gamer-flavoured ("Scholar" vs "Bronze rank V") so the tone fits the
// LMS.
export interface Level {
  /** 1-indexed level number — 1 is the starting tier. */
  level: number
  /** Display name shown on chips ("Scholar"). */
  name: string
  /** Compact emoji rendered before the name in tight UI. */
  emoji: string
  /** Inclusive lower bound of points for this level. */
  min: number
  /** Inclusive upper bound — Infinity for the top level. */
  max: number
}

export const LEVELS: Level[] = [
  { level: 1, name: "Newcomer",   emoji: "🌱", min: 0,    max: 99 },
  { level: 2, name: "Learner",    emoji: "📘", min: 100,  max: 249 },
  { level: 3, name: "Scholar",    emoji: "🎓", min: 250,  max: 499 },
  { level: 4, name: "Achiever",   emoji: "🏅", min: 500,  max: 999 },
  { level: 5, name: "Expert",     emoji: "⚡", min: 1000, max: 1999 },
  { level: 6, name: "Master",     emoji: "🌟", min: 2000, max: 4999 },
  { level: 7, name: "Legend",     emoji: "👑", min: 5000, max: Infinity },
]

export interface LevelProgress {
  current: Level
  /** Next level the student is climbing toward. null when already at the top. */
  next: Level | null
  /** Total pts the student has. */
  total: number
  /** Pts earned since entering the current level. */
  inLevel: number
  /** Total pts spanned by this level — Infinity for the final level. */
  span: number
  /** Pts still needed to clear into the next level. 0 when at the top. */
  toNext: number
  /** 0–100 fill toward `next`. Pinned to 100 at the top level. */
  pct: number
}

export function levelForPoints(total: number): LevelProgress {
  // Walk LEVELS in order — the first whose [min, max] contains `total`
  // is the current level. Always finds a match because Newcomer starts
  // at 0 and Legend ends at Infinity.
  const idx = LEVELS.findIndex((l) => total >= l.min && total <= l.max)
  const current = LEVELS[Math.max(0, idx)]
  const next = LEVELS[idx + 1] ?? null
  const inLevel = Math.max(0, total - current.min)
  if (!next) {
    return { current, next: null, total, inLevel, span: Infinity, toNext: 0, pct: 100 }
  }
  const span = next.min - current.min
  const toNext = Math.max(0, next.min - total)
  const pct = span > 0 ? Math.min(100, (inLevel / span) * 100) : 0
  return { current, next, total, inLevel, span, toNext, pct }
}

// ── Badges ──────────────────────────────────────────────────
// Achievement metadata is split into definition (key + label + how to
// earn) and per-student state (earned? progress toward earning?). The
// engine derives both from the stats already on each LeaderboardEntry
// — no new persistence needed.
export interface BadgeDef {
  key: BadgeKey
  label: string
  emoji: string
  /** One-liner shown on hover / under the chip. */
  hint: string
  /** Group used to lay out the badges section. */
  group: "milestone" | "engagement" | "academic" | "social" | "rank"
}

export type BadgeKey =
  | "welcome"
  | "profile-star"
  | "first-class"
  | "perfect-attendance"
  | "first-quiz"
  | "quiz-hunter"
  | "high-scorer"
  | "first-course"
  | "social-butterfly"
  | "curious-mind"
  | "wall-of-love"
  | "veteran"
  | "dedicated"
  | "top-ten"
  | "podium"
  | "champion"

export const BADGES: Record<BadgeKey, BadgeDef> = {
  welcome:             { key: "welcome",             label: "Welcome aboard",  emoji: "🎉", hint: "You signed up — points start flowing.",                     group: "milestone" },
  "profile-star":      { key: "profile-star",        label: "Profile star",    emoji: "✨", hint: "Photo + phone added. People can find you.",                  group: "milestone" },
  "first-class":       { key: "first-class",         label: "First class",     emoji: "🎤", hint: "Attended your first live session.",                          group: "academic" },
  "perfect-attendance":{ key: "perfect-attendance",  label: "Regular",         emoji: "📅", hint: "Attended 5 live classes.",                                    group: "academic" },
  "first-quiz":        { key: "first-quiz",          label: "Quiz rookie",     emoji: "🧠", hint: "Passed your first quiz.",                                     group: "academic" },
  "quiz-hunter":       { key: "quiz-hunter",         label: "Quiz hunter",     emoji: "🎯", hint: "Passed 5 quizzes.",                                            group: "academic" },
  "high-scorer":       { key: "high-scorer",         label: "Sharpshooter",    emoji: "🏹", hint: "Got 80%+ on at least 3 assignments.",                          group: "academic" },
  "first-course":      { key: "first-course",        label: "Course finisher", emoji: "🏆", hint: "Completed your first course.",                                 group: "academic" },
  "social-butterfly":  { key: "social-butterfly",    label: "Social butterfly",emoji: "🦋", hint: "Joined 3+ communities.",                                       group: "social" },
  "curious-mind":      { key: "curious-mind",        label: "Curious mind",    emoji: "❓", hint: "Asked 5+ doubts.",                                              group: "social" },
  "wall-of-love":      { key: "wall-of-love",        label: "Storyteller",     emoji: "💌", hint: "Shared a win on the Wall of Love.",                            group: "social" },
  veteran:             { key: "veteran",             label: "Veteran",         emoji: "🛡️", hint: "Active for 7+ days.",                                          group: "engagement" },
  dedicated:           { key: "dedicated",           label: "Dedicated",       emoji: "🔥", hint: "Active for 30+ days.",                                         group: "engagement" },
  "top-ten":           { key: "top-ten",             label: "Top 10",          emoji: "🔟", hint: "Ranked in the top 10 of the leaderboard.",                     group: "rank" },
  podium:              { key: "podium",              label: "Podium",          emoji: "🥉", hint: "Ranked in the top 3 of the leaderboard.",                      group: "rank" },
  champion:            { key: "champion",            label: "Champion",        emoji: "👑", hint: "Currently #1 on the leaderboard.",                              group: "rank" },
}

export interface BadgeState {
  def: BadgeDef
  earned: boolean
}

export function badgesForEntry(entry: LeaderboardEntry): BadgeState[] {
  const s = entry.stats
  const r = entry.rank
  const conditions: Record<BadgeKey, boolean> = {
    welcome: true,                              // every entry — welcome bonus already in the score
    "profile-star": s.profileComplete,
    "first-class": s.classesAttended >= 1,
    "perfect-attendance": s.classesAttended >= 5,
    "first-quiz": s.quizzesPassed >= 1,
    "quiz-hunter": s.quizzesPassed >= 5,
    "high-scorer": s.assignmentsHighScore >= 3,
    "first-course": s.coursesCompleted >= 1,
    "social-butterfly": s.communitiesJoined >= 3,
    "curious-mind": s.doubtsAsked >= 5,
    "wall-of-love": s.wallEntries >= 1,
    veteran: s.daysActive >= 7,
    dedicated: s.daysActive >= 30,
    "top-ten": r <= 10,
    podium: r <= 3,
    champion: r === 1,
  }
  // Stable order: milestone → academic → social → engagement → rank,
  // then earned-first within each group so the bright chips lead.
  const order: BadgeKey[] = [
    "welcome",
    "profile-star",
    "first-class",
    "perfect-attendance",
    "first-quiz",
    "quiz-hunter",
    "high-scorer",
    "first-course",
    "social-butterfly",
    "curious-mind",
    "wall-of-love",
    "veteran",
    "dedicated",
    "top-ten",
    "podium",
    "champion",
  ]
  return order.map((key) => ({ def: BADGES[key], earned: conditions[key] }))
}

// ── Streak ──────────────────────────────────────────────────
// "How many consecutive recent days has this student done anything?"
// Counts distinct calendar days, walking backwards from today, until
// we hit a day with no signals. Used to drive the 🔥 streak chip on
// the dashboard + leaderboard.
export interface StreakInputs {
  studentId: string
  attendance: AttendanceRecord[]
  attempts: QuizAttempt[]
  submissions: AssignmentSubmission[]
  doubts?: Doubt[]
  /** Generous default — the student is in the workspace today, so
   *  even if no activity row exists, today counts. Set to false in
   *  tests / cron contexts where you want a strict signal-based count. */
  countTodayAsActive?: boolean
}

export function streakForStudent(input: StreakInputs): number {
  const sid = input.studentId
  const days = new Set<string>()
  const addDay = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return
    days.add(d.toISOString().slice(0, 10))
  }
  for (const a of input.attendance) if (a.studentId === sid) addDay(a.joinedAt)
  for (const a of input.attempts) if (a.studentId === sid) addDay(a.completedAt ?? a.startedAt)
  for (const s of input.submissions) if (s.studentId === sid) addDay(s.submittedAt)
  if (input.doubts) {
    for (const d of input.doubts) if (d.studentId === sid) addDay(d.createdAt)
  }
  if (input.countTodayAsActive !== false) {
    days.add(new Date().toISOString().slice(0, 10))
  }
  // Walk back from today; the moment a day is missing we stop.
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < 90; i++) { // cap the scan at 90 days
    const key = cursor.toISOString().slice(0, 10)
    if (!days.has(key)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
