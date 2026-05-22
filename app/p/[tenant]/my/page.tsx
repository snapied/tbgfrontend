"use client"

// Student home — four "what's next" cards.
//
//   1. Continue learning — the enrollment with the most recent
//      lastAccessedAt; click → /p/<tenant>/learn/<courseSlug>.
//   2. Next live class — soonest scheduled class in courses I'm
//      enrolled in; countdown + Join CTA.
//   3. Latest notifications — three most-recent in-app notifications.
//   4. Recent grades — last quiz attempt + last assignment submission
//      with a graded status (if any).
//
// Designed to load fast off lms-store (no network); cards link out
// to dedicated sub-pages for the full lists.

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  ChevronUp,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ClipboardList,
  Crown,
  FileQuestion,
  Flame,
  Inbox,
  PlayCircle,
  RotateCcw,
  Trophy,
  Video,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useLMS } from "@/lib/lms-store"
import { useWall } from "@/lib/wall-store"
import {
  computeLeaderboard,
  levelForPoints,
  streakForStudent,
  tierForRank,
} from "@/lib/leaderboard"
import { cn } from "@/lib/utils"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import { STUDENT_HOME_TOUR, STUDENT_HOME_TOUR_ID } from "@/components/student/tours"

function tenantSlugFrom(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  if (!t) return ""
  return Array.isArray(t) ? t[0] ?? "" : t
}

export default function StudentHomePage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlugFrom(params)
  const {
    currentUser,
    enrollments,
    liveSessions,
    notifications,
    quizAttempts,
    submissions,
    assignments,
    students,
    attendance,
    quizzes,
    studentGroups,
    doubts,
    getCourseById,
    getQuizById,
  } = useLMS()
  const { entries: wallEntries } = useWall()

  // Leaderboard widget input — same compute the dedicated page uses,
  // memoised so we don't re-score on every render.
  const leaderboard = useMemo(
    () =>
      computeLeaderboard({
        students,
        enrollments,
        attendance,
        attempts: quizAttempts,
        quizzes,
        submissions,
        sessions: liveSessions,
        studentGroups,
        doubts,
        wallEntries,
      }),
    [
      students,
      enrollments,
      attendance,
      quizAttempts,
      quizzes,
      submissions,
      liveSessions,
      studentGroups,
      doubts,
      wallEntries,
    ],
  )
  const myLeaderboardEntry = currentUser
    ? leaderboard.find((e) => e.student.id === currentUser.id) ?? null
    : null
  // Nearest competitor above the student — drives the "X to overtake
  // them" prompt that turns the widget from a passive number into a
  // call-to-action.
  const nextAheadOnBoard =
    myLeaderboardEntry && myLeaderboardEntry.rank > 1
      ? leaderboard[myLeaderboardEntry.rank - 2] ?? null
      : null
  const myLevel = useMemo(
    () =>
      myLeaderboardEntry ? levelForPoints(myLeaderboardEntry.total) : null,
    [myLeaderboardEntry],
  )
  const myStreak = useMemo(
    () =>
      currentUser
        ? streakForStudent({
            studentId: currentUser.id,
            attendance,
            attempts: quizAttempts,
            submissions,
            doubts,
          })
        : 0,
    [currentUser, attendance, quizAttempts, submissions, doubts],
  )

  const myEnrollments = useMemo(
    () =>
      currentUser
        ? enrollments
            .filter((e) => e.studentId === currentUser.id)
            .slice()
            .sort((a, b) =>
              (b.lastAccessedAt ?? b.enrolledAt).localeCompare(
                a.lastAccessedAt ?? a.enrolledAt,
              ),
            )
        : [],
    [enrollments, currentUser],
  )

  const continueLearning = myEnrollments[0]
  const continueCourse = continueLearning
    ? getCourseById(continueLearning.courseId)
    : undefined

  // ── Quizzes to do ────────────────────────────────────────
  // Three quizzes the student should act on, picked across the same
  // taxonomy as /my/quizzes:
  //   • not-started — no attempt at all
  //   • retry-available — best attempt failed and they still have
  //     retries left
  //   • pending-review — teacher-graded submission waiting on the
  //     instructor (we still surface it so they remember they handed
  //     it in)
  // Pinned to the student's enrolled courses, sorted by the most
  // recently created quiz first (best proxy for "what's new").
  type QuizToDoStatus = "not-started" | "retry-available" | "pending-review"
  type QuizToDoRow = {
    quiz: ReturnType<typeof useLMS>["quizzes"][number]
    status: QuizToDoStatus
    courseTitle: string
    attemptsUsed: number
  }
  const quizzesToDo = useMemo<QuizToDoRow[]>(() => {
    if (!currentUser) return []
    const enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseId))
    const rows: QuizToDoRow[] = []
    for (const quiz of quizzes) {
      if (!enrolledCourseIds.has(quiz.courseId)) continue
      const mine = quizAttempts.filter(
        (a) => a.quizId === quiz.id && a.studentId === currentUser.id,
      )
      const best = mine.slice().sort((a, b) => b.score - a.score)[0]
      let status: QuizToDoStatus | null = null
      if (!best) status = "not-started"
      else if ((best.status ?? "graded") === "pending-review") status = "pending-review"
      else if (!best.passed) {
        // Failed; only surface as "retry" if there are attempts left.
        const cap = quiz.maxAttempts
        if (cap === 0 || mine.length < cap) status = "retry-available"
      }
      if (!status) continue
      rows.push({
        quiz,
        status,
        courseTitle: getCourseById(quiz.courseId)?.title ?? "—",
        attemptsUsed: mine.length,
      })
    }
    return rows
      .sort((a, b) => b.quiz.createdAt.localeCompare(a.quiz.createdAt))
      .slice(0, 3)
  }, [currentUser, myEnrollments, quizzes, quizAttempts, getCourseById])

  // ── Recent / upcoming assignments ────────────────────────
  // Two-bucket list: assignments still owed (not submitted yet, or
  // returned-for-revision) sorted by due-date, then recently graded.
  // Cap at 3 rows total so the card stays glanceable.
  type AssignmentRowKind = "due" | "graded" | "submitted"
  type AssignmentRow = {
    assignment: ReturnType<typeof useLMS>["assignments"][number]
    kind: AssignmentRowKind
    courseTitle: string
    submission?: ReturnType<typeof useLMS>["submissions"][number]
  }
  const assignmentRows = useMemo<AssignmentRow[]>(() => {
    if (!currentUser) return []
    const enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseId))
    const myCourseAssignments = assignments.filter((a) =>
      enrolledCourseIds.has(a.courseId),
    )
    const mySubsById = new Map<string, ReturnType<typeof useLMS>["submissions"][number]>()
    for (const s of submissions) {
      if (s.studentId !== currentUser.id) continue
      const prev = mySubsById.get(s.assignmentId)
      // Keep the most recent submission per assignment (last write wins).
      if (!prev || s.submittedAt.localeCompare(prev.submittedAt) > 0) {
        mySubsById.set(s.assignmentId, s)
      }
    }
    const due: AssignmentRow[] = []
    const graded: AssignmentRow[] = []
    for (const a of myCourseAssignments) {
      const sub = mySubsById.get(a.id)
      const courseTitle = getCourseById(a.courseId)?.title ?? "—"
      if (!sub) {
        due.push({ assignment: a, kind: "due", courseTitle })
      } else if (sub.status === "graded") {
        graded.push({ assignment: a, kind: "graded", courseTitle, submission: sub })
      } else {
        // Submitted, awaiting grading — surface as "submitted" with a
        // muted state so the student remembers it's queued.
        due.push({ assignment: a, kind: "submitted", courseTitle, submission: sub })
      }
    }
    due.sort((a, b) => {
      // Earlier due dates first; unscheduled (no dueAt) sink to the
      // bottom of the "due" bucket so concrete deadlines lead.
      const ad = a.assignment.dueAt ?? "9999-12-31"
      const bd = b.assignment.dueAt ?? "9999-12-31"
      return ad.localeCompare(bd)
    })
    graded.sort((a, b) => {
      const ag = a.submission?.gradedAt ?? a.submission?.submittedAt ?? ""
      const bg = b.submission?.gradedAt ?? b.submission?.submittedAt ?? ""
      return bg.localeCompare(ag)
    })
    return [...due, ...graded].slice(0, 3)
  }, [currentUser, myEnrollments, assignments, submissions, getCourseById])

  // Next live class — must be in a course I'm enrolled in, scheduled
  // in the future, not cancelled. Soonest first.
  const myCourseIds = useMemo(
    () => new Set(myEnrollments.map((e) => e.courseId)),
    [myEnrollments],
  )
  const nextLiveClass = useMemo(() => {
    const now = Date.now()
    return liveSessions
      .filter((s) => s.status !== "cancelled")
      .filter((s) => myCourseIds.has(s.courseId))
      .filter((s) => new Date(s.scheduledAt).getTime() > now - 60 * 60 * 1000) // include in-progress (60min grace)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0]
  }, [liveSessions, myCourseIds])

  const myNotifications = useMemo(
    () =>
      currentUser
        ? notifications
            .filter((n) => n.userId === currentUser.id)
            .slice(0, 3)
        : [],
    [notifications, currentUser],
  )

  // Most recent graded quiz attempt + most recent graded assignment.
  const recentQuizAttempt = useMemo(
    () =>
      currentUser
        ? quizAttempts
            .filter((a) => a.studentId === currentUser.id)
            .filter((a) => (a.status ?? "graded") === "graded")
            .sort((a, b) =>
              (b.gradedAt ?? b.completedAt ?? "").localeCompare(
                a.gradedAt ?? a.completedAt ?? "",
              ),
            )[0]
        : undefined,
    [quizAttempts, currentUser],
  )
  const recentSubmission = useMemo(
    () =>
      currentUser
        ? submissions
            .filter((s) => s.studentId === currentUser.id)
            .filter((s) => s.status === "graded")
            .sort((a, b) =>
              (b.gradedAt ?? b.submittedAt).localeCompare(
                a.gradedAt ?? a.submittedAt,
              ),
            )[0]
        : undefined,
    [submissions, currentUser],
  )

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_HOME_TOUR_ID} steps={STUDENT_HOME_TOUR} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            Welcome back{currentUser?.name ? `, ${currentUser.name.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your learning home. Pick up where you left off, or jump into what&apos;s next.
          </p>
        </div>
        <TakeATourButton tourId={STUDENT_HOME_TOUR_ID} />
      </div>

      {/* Leaderboard widget — full-width strip above the grid so the
          rank + point total are the first thing the student sees on
          every visit. Renders a non-empty state even for fresh
          tenants thanks to the welcome bonus in the scoring engine. */}
      <LeaderboardWidget
        slug={slug}
        myEntry={myLeaderboardEntry}
        nextAhead={nextAheadOnBoard}
        totalRanked={leaderboard.length}
        level={myLevel}
        streak={myStreak}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Continue learning ──────────────────────────────── */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Continue learning
            </div>
            {continueLearning && continueCourse ? (
              <>
                <div>
                  <p className="line-clamp-1 font-serif text-lg font-semibold">
                    {continueCourse.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last opened{" "}
                    {new Date(continueLearning.lastAccessedAt).toLocaleDateString()}
                  </p>
                </div>
                <Progress value={continueLearning.progress} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{continueLearning.progress}% complete</span>
                  <Button asChild size="sm">
                    <Link href={`/p/${slug}/learn/${continueCourse.slug}`}>
                      <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                      Resume
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <EmptyCardBody
                icon={<BookOpen className="h-5 w-5" />}
                title="No courses yet"
                body="Browse the catalog to enroll in your first course."
                cta={{ label: "Browse courses", href: `/p/${slug}/courses` }}
              />
            )}
          </CardContent>
        </Card>

        {/* ── Next live class ────────────────────────────────── */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Video className="h-3.5 w-3.5" />
              Next live class
            </div>
            {nextLiveClass ? (
              <NextLiveClassBody slug={slug} session={nextLiveClass} />
            ) : (
              <EmptyCardBody
                icon={<Video className="h-5 w-5" />}
                title="No scheduled classes"
                body="When your teacher schedules a live class, it&apos;ll show up here with a countdown."
                cta={{ label: "All classes", href: `/p/${slug}/my/classes` }}
              />
            )}
          </CardContent>
        </Card>

        {/* ── Latest notifications ───────────────────────────── */}
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Inbox className="h-3.5 w-3.5" />
                Latest notifications
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href={`/p/${slug}/my/inbox`}>
                  Open inbox <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            {myNotifications.length > 0 ? (
              <ul className="space-y-2">
                {myNotifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "rounded-md border border-border bg-card/40 p-3",
                      n.status === "read" ? "opacity-60" : "",
                    )}
                  >
                    <p className="line-clamp-1 text-sm font-medium">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                Nothing new. We&apos;ll ping you when something needs your attention.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Recent grades ──────────────────────────────────── */}
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              Recent grades
            </div>
            <div className="space-y-2">
              {recentQuizAttempt && (
                <RecentGradeRow
                  icon={<FileQuestion className="h-4 w-4" />}
                  title={getQuizById(recentQuizAttempt.quizId)?.title ?? "Quiz"}
                  detail={`${recentQuizAttempt.score}% · ${recentQuizAttempt.passed ? "Passed" : "Did not pass"}`}
                />
              )}
              {recentSubmission && (
                <RecentGradeRow
                  icon={<ClipboardList className="h-4 w-4" />}
                  title={
                    assignments.find((a) => a.id === recentSubmission.assignmentId)
                      ?.title ?? "Assignment"
                  }
                  detail={
                    typeof recentSubmission.score === "number"
                      ? `${recentSubmission.score} pts`
                      : "Graded"
                  }
                />
              )}
              {!recentQuizAttempt && !recentSubmission && (
                <p className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                  No grades yet. Complete a quiz or assignment to see results here.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Quizzes to do ──────────────────────────────────── */}
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FileQuestion className="h-3.5 w-3.5" />
                Quizzes to do
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href={`/p/${slug}/my/quizzes`}>
                  All quizzes <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            {quizzesToDo.length > 0 ? (
              <ul className="space-y-2">
                {quizzesToDo.map((row) => (
                  <QuizToDoItem key={row.quiz.id} row={row} slug={slug} />
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                You&apos;re all caught up — no quizzes waiting on you right now.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Recent assignments ─────────────────────────────── */}
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" />
                Recent assignments
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href={`/p/${slug}/my/assignments`}>
                  All assignments <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            {assignmentRows.length > 0 ? (
              <ul className="space-y-2">
                {assignmentRows.map((row) => (
                  <AssignmentBoardItem
                    key={row.assignment.id}
                    row={row}
                    slug={slug}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                Nothing in your queue. Newly posted assignments show up here with their due dates.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Inline leaderboard card for the student home. Compact summary —
// rank, points, tier, gap-to-next — with a Crown variant for #1 and a
// "Your spot is waiting" empty state when there are zero ranked
// students (e.g. brand-new tenant with no student roster). Always
// links out to the full /my/leaderboard page so curious students get
// the breakdown without crowding this surface.
function LeaderboardWidget({
  slug,
  myEntry,
  nextAhead,
  totalRanked,
  level,
  streak,
}: {
  slug: string
  myEntry: ReturnType<typeof computeLeaderboard>[number] | null
  nextAhead: ReturnType<typeof computeLeaderboard>[number] | null
  totalRanked: number
  level: ReturnType<typeof levelForPoints> | null
  streak: number
}) {
  const href = `/p/${slug}/my/leaderboard`
  if (!myEntry) {
    return (
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Your spot is waiting on the leaderboard</p>
              <p className="text-xs text-muted-foreground">
                Earn points for classes, quizzes, doubts — and just for being part of the community.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={href}>
              Open leaderboard <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }
  const tier = tierForRank(myEntry.rank, myEntry.total)
  const isChampion = myEntry.rank === 1
  const gap = nextAhead ? nextAhead.total - myEntry.total + 1 : 0
  const showStreak = streak >= 2
  return (
    <Card
      className={cn(
        "overflow-hidden border-amber-500/30",
        "bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent",
      )}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-bold tabular-nums shadow-sm",
              isChampion && "bg-amber-400 text-amber-950",
              myEntry.rank === 2 && "bg-slate-300 text-slate-900",
              myEntry.rank === 3 && "bg-amber-700/70 text-amber-50",
              myEntry.rank > 3 && "bg-primary/15 text-primary",
            )}
          >
            {isChampion ? <Crown className="h-6 w-6" /> : `#${myEntry.rank}`}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Leaderboard
              </p>
              {level && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {level.current.emoji} Lv {level.current.level} · {level.current.name}
                </span>
              )}
              {tier && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  {tier.emoji} {tier.label}
                </span>
              )}
              {showStreak && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                  <Flame className="h-3 w-3" />
                  {streak}-day streak
                </span>
              )}
            </div>
            <p className="mt-0.5 font-serif text-lg font-semibold leading-tight">
              {myEntry.total} XP · rank #{myEntry.rank} of {totalRanked}
            </p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {isChampion ? (
                <>You&apos;re leading the workspace. Defend it.</>
              ) : nextAhead ? (
                <>
                  <span className="font-semibold tabular-nums">{gap}</span> more
                  points to overtake{" "}
                  <span className="font-medium">{nextAhead.student.name}</span>
                </>
              ) : (
                <>Climb the board by taking quizzes and joining classes.</>
              )}
            </p>
          </div>
          <Button asChild size="sm" variant="default">
            <Link href={href}>
              {isChampion ? "Defend rank" : "See how to climb"}
              <ChevronUp className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* XP progress to next level. Hidden at the top level — we
            show the bar to motivate the climb, and there's no climb
            past Legend. */}
        {level && level.next && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                Next level: {level.next.emoji} {level.next.name}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {level.toNext} XP to go
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${level.pct}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NextLiveClassBody({
  slug,
  session,
}: {
  slug: string
  session: ReturnType<typeof useLMS>["liveSessions"][number]
}) {
  const scheduledMs = new Date(session.scheduledAt).getTime()
  const diffMin = Math.round((scheduledMs - Date.now()) / 60_000)
  const when = new Date(session.scheduledAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  const inProgress = diffMin <= 5 && diffMin >= -60
  const joinHref = session.roomCode
    ? `/p/${slug}/live/${session.roomCode}`
    : `/p/${slug}/my/classes`

  return (
    <>
      <div>
        <p className="line-clamp-1 font-serif text-lg font-semibold">
          {session.title}
        </p>
        <p className="text-xs text-muted-foreground">{when}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {inProgress
            ? "Happening now or imminent"
            : diffMin > 60 * 24
              ? `In ${Math.round(diffMin / (60 * 24))} day(s)`
              : diffMin > 60
                ? `In ${Math.round(diffMin / 60)} hour(s)`
                : `In ${Math.max(0, diffMin)} min`}
        </span>
        <Button asChild size="sm" variant={inProgress ? "default" : "outline"}>
          <Link href={joinHref}>
            <Video className="mr-1.5 h-3.5 w-3.5" />
            {inProgress ? "Join now" : "Open"}
          </Link>
        </Button>
      </div>
    </>
  )
}

// Row for the "Quizzes to do" card. Status drives the icon, chip
// colour, and CTA copy (Start / Retry / Awaiting review). Whole row
// is clickable into the quiz player so the student can act in one
// click — no second confirmation step needed.
function QuizToDoItem({
  row,
  slug,
}: {
  row: {
    quiz: ReturnType<typeof useLMS>["quizzes"][number]
    status: "not-started" | "retry-available" | "pending-review"
    courseTitle: string
    attemptsUsed: number
  }
  slug: string
}) {
  const { quiz, status, courseTitle, attemptsUsed } = row
  const meta =
    status === "not-started"
      ? { icon: <CircleDashed className="h-4 w-4" />, label: "Not started", cta: "Start", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" }
      : status === "retry-available"
        ? { icon: <RotateCcw className="h-4 w-4" />, label: "Retry available", cta: "Retry", tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" }
        : { icon: <Clock3 className="h-4 w-4" />, label: "Awaiting review", cta: "View", tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" }
  const remaining =
    quiz.maxAttempts === 0
      ? "Unlimited attempts"
      : `${Math.max(0, quiz.maxAttempts - attemptsUsed)} of ${quiz.maxAttempts} left`
  return (
    <li>
      <Link
        href={`/p/${slug}/quiz/${quiz.id}`}
        className="group flex items-center gap-3 rounded-md border border-border bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-card"
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            meta.tone,
          )}
        >
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium">{quiz.title}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {courseTitle} · {meta.label}
            {status === "retry-available" && ` · ${remaining}`}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
          {meta.cta}
          <ArrowRight className="ml-0.5 inline h-3 w-3" />
        </span>
      </Link>
    </li>
  )
}

// Row for the "Recent assignments" card. Three states:
//   • due — not submitted yet; shows due date with red tint if overdue
//   • submitted — handed in, waiting on the teacher
//   • graded — score is back; shows the score
function AssignmentBoardItem({
  row,
  slug,
}: {
  row: {
    assignment: ReturnType<typeof useLMS>["assignments"][number]
    kind: "due" | "graded" | "submitted"
    courseTitle: string
    submission?: ReturnType<typeof useLMS>["submissions"][number]
  }
  slug: string
}) {
  const { assignment, kind, courseTitle, submission } = row
  const dueAt = assignment.dueAt ? new Date(assignment.dueAt) : null
  const overdue = dueAt ? dueAt.getTime() < Date.now() : false
  const meta = (() => {
    if (kind === "graded") {
      const score = submission?.score
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        detail:
          typeof score === "number"
            ? `Graded · ${score} pts`
            : "Graded",
      }
    }
    if (kind === "submitted") {
      return {
        icon: <Clock3 className="h-4 w-4" />,
        tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
        detail: "Submitted · awaiting grade",
      }
    }
    return {
      icon: <ClipboardList className="h-4 w-4" />,
      tone: overdue
        ? "bg-destructive/15 text-destructive"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      detail: dueAt
        ? overdue
          ? `Due ${dueAt.toLocaleDateString()} · overdue`
          : `Due ${dueAt.toLocaleDateString()}`
        : "No due date",
    }
  })()
  return (
    <li>
      <Link
        href={`/p/${slug}/my/assignments`}
        className="group flex items-center gap-3 rounded-md border border-border bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-card"
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            meta.tone,
          )}
        >
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium">{assignment.title}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {courseTitle} · {meta.detail}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
  )
}

function RecentGradeRow({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode
  title: string
  detail: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card/40 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

function EmptyCardBody({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode
  title: string
  body: string
  cta: { label: string; href: string }
}) {
  return (
    <div className="space-y-3 py-2 text-center">
      <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{body}</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  )
}
