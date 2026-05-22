"use client"

// Student-facing leaderboard. Same computeLeaderboard() the teacher
// dashboard uses, so the ranking is identical — only the chrome is
// different.
//
// Gamification choices:
//   • Podium block highlights the top 3 with a 2-1-3 Olympic layout
//     so #1 visually dominates.
//   • "Your rank" card shows the exact point gap to the next student
//     above (and to top-3 if the student isn't already there), turning
//     the climb into a concrete number rather than a vague aspiration.
//   • Full list is capped at top 30 — past that, position rarely
//     motivates and the page gets noisy. Students outside the top 30
//     still see a pinned card up top with their rank.

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  BookOpen,
  CalendarCheck,
  ChevronUp,
  Crown,
  FileQuestion,
  Flame,
  Heart,
  MessageCircleQuestion,
  Medal,
  Sparkles,
  Trophy,
  UserCircle2,
  Users2,
  Zap,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useLMS } from "@/lib/lms-store"
import { useWall } from "@/lib/wall-store"
import {
  badgesForEntry,
  computeLeaderboard,
  DEFAULT_SCORE_RULES,
  levelForPoints,
  streakForStudent,
  tierForRank,
  type LeaderboardEntry,
} from "@/lib/leaderboard"
import { cn } from "@/lib/utils"

const TOP_N = 30

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

function initials(name?: string): string {
  if (!name) return "?"
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

export default function MyLeaderboardPage() {
  const params = useParams<{ tenant: string }>()
  void tenantSlug(params)
  const {
    currentUser,
    students,
    enrollments,
    attendance,
    quizAttempts,
    quizzes,
    submissions,
    liveSessions,
    studentGroups,
    doubts,
  } = useLMS()
  const { entries: wallEntries } = useWall()

  const entries = useMemo<LeaderboardEntry[]>(
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

  const myEntry = currentUser
    ? entries.find((e) => e.student.id === currentUser.id) ?? null
    : null

  // Concrete gap-to-next-rank — turns "do better" into "earn N more
  // points and you jump to rank K". If they're #1, we celebrate
  // instead.
  const nextAhead = useMemo(() => {
    if (!myEntry) return null
    if (myEntry.rank === 1) return null
    return entries[myEntry.rank - 2] ?? null
  }, [myEntry, entries])

  // Gap to top-3 — only meaningful if the student is currently
  // outside the podium. Once they break into top 3, this hint
  // disappears and the medal moment takes over.
  const thirdPlace = entries[2] ?? null
  const gapToPodium =
    myEntry && thirdPlace && myEntry.rank > 3
      ? thirdPlace.total - myEntry.total + 1
      : null

  const top3 = entries.slice(0, 3)
  const top30 = entries.slice(0, TOP_N)

  const totalPointsAwarded = useMemo(
    () => entries.reduce((acc, e) => acc + e.total, 0),
    [entries],
  )
  const tenantSlugStr = Array.isArray(params.tenant)
    ? params.tenant[0] ?? ""
    : params.tenant ?? ""

  // Gamification — level progression and current streak for the
  // signed-in student. Both derived from the same scoring inputs the
  // leaderboard uses, so they stay in lockstep with the visible total.
  const myLevel = useMemo(
    () => (myEntry ? levelForPoints(myEntry.total) : null),
    [myEntry],
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
  const myBadges = useMemo(
    () => (myEntry ? badgesForEntry(myEntry) : []),
    [myEntry],
  )

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to see the leaderboard.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                Leaderboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {entries.length === 0
                  ? "No students in the workspace yet — invite a cohort and the board lights up."
                  : `${entries.length} student${entries.length === 1 ? "" : "s"} climbing right now · earn points for classes, quizzes, doubts, and just being part of the community.`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <StatPill label="Players" value={entries.length} />
            <StatPill label="Total pts" value={totalPointsAwarded} />
            <StatPill
              label="Your rank"
              value={myEntry ? `#${myEntry.rank}` : "—"}
            />
            <StatPill
              label="Your level"
              value={
                myLevel ? `${myLevel.current.emoji} ${myLevel.current.level}` : "—"
              }
            />
          </div>
        </div>
      </div>

      {/* Podium — Olympic 2-1-3 layout so #1 reads as the apex. Empty
          slots collapse so an early-stage cohort doesn't see hollow
          pedestals. */}
      {top3.length > 0 && <Podium entries={top3} meId={currentUser.id} />}

      {/* Your card — pinned even if you're outside the top 30, with a
          concrete gap-to-next hint so the climb is a number not a
          vibe. */}
      {myEntry ? (
        <Card
          className={cn(
            "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
          )}
        >
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-4">
              <RankBadge entry={myEntry} large />
              <Avatar className="h-12 w-12 ring-2 ring-primary/40">
                {myEntry.student.avatar ? (
                  <AvatarImage src={myEntry.student.avatar} alt={myEntry.student.name} />
                ) : null}
                <AvatarFallback>{initials(myEntry.student.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  You — {myEntry.student.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {myEntry.stats.quizzesPassed} quizzes passed · {myEntry.stats.assignmentsSubmitted} assignments · {myEntry.stats.classesAttended} classes
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">{myEntry.breakdown.total}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  points
                </p>
              </div>
            </div>

            {/* Goal lines — only render when there's a meaningful
                target. Top-3 podium dwellers get a celebration
                instead of a stretch goal. */}
            {myEntry.rank === 1 ? (
              <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-200">
                <Crown className="h-4 w-4" />
                You&apos;re on top. Keep the streak alive — every quiz and
                class defends the throne.
              </div>
            ) : (
              <div className="space-y-1.5">
                {nextAhead && (
                  <GoalRow
                    icon={<ChevronUp className="h-3.5 w-3.5" />}
                    label={
                      <>
                        <span className="font-semibold tabular-nums">
                          {nextAhead.total - myEntry.total + 1}
                        </span>{" "}
                        more points to overtake{" "}
                        <span className="font-medium">
                          {nextAhead.student.name}
                        </span>{" "}
                        at rank #{nextAhead.rank}
                      </>
                    }
                  />
                )}
                {gapToPodium != null && gapToPodium > 0 && (
                  <GoalRow
                    icon={<Medal className="h-3.5 w-3.5 text-amber-600" />}
                    label={
                      <>
                        <span className="font-semibold tabular-nums">
                          {gapToPodium}
                        </span>{" "}
                        points stand between you and a podium spot.
                      </>
                    }
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            You&apos;ll appear here once you join a class, take a quiz, or submit work.
          </CardContent>
        </Card>
      )}

      {/* Gamification strip — level XP bar + streak. Sits above the
          analytical "How you earned" block because progression /
          streak are the most emotionally salient bits. */}
      {myEntry && myLevel && (
        <LevelStreakCard
          level={myLevel}
          streak={myStreak}
          name={myEntry.student.name}
        />
      )}

      {/* Achievement badges — earned chips light up, locked ones stay
          greyed with their hint so the student can see what unlocks
          them. Drives the same "what should I do next" question the
          Earn-more card answers, but via collectible icons. */}
      {myEntry && myBadges.length > 0 && <BadgesCard badges={myBadges} />}

      {/* How you earned + what you can do next. Two side-by-side panels
          that make the score feel decomposable instead of opaque, and
          give the student concrete next actions to climb. */}
      {myEntry && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownCard entry={myEntry} />
          <EarnMoreCard entry={myEntry} slug={tenantSlugStr} />
        </div>
      )}

      {/* Full ranking — capped at top 30. */}
      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">No activity yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to take a quiz or join a live class.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {top30.map((entry) => {
                const isMe = entry.student.id === currentUser.id
                const tier = tierForRank(entry.rank, entry.total)
                return (
                  <li
                    key={entry.student.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 transition-colors",
                      isMe && "bg-primary/5",
                      entry.rank <= 3 && "bg-amber-500/[0.04]",
                    )}
                  >
                    <RankBadge entry={entry} />
                    <Avatar className="h-9 w-9">
                      {entry.student.avatar ? (
                        <AvatarImage src={entry.student.avatar} alt={entry.student.name} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {initials(entry.student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {entry.student.name}
                        {isMe && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            You
                          </Badge>
                        )}
                        {tier && entry.rank > 3 && (
                          <span
                            className="ml-2 text-[10px] text-muted-foreground"
                            aria-label={tier.label}
                          >
                            {tier.emoji} {tier.label}
                          </span>
                        )}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {entry.stats.quizzesPassed}/{entry.stats.quizzesTaken} quizzes ·{" "}
                        {entry.stats.assignmentsSubmitted} assignments ·{" "}
                        {entry.stats.classesAttended} classes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold tabular-nums">
                        {entry.breakdown.total}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        pts
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {entries.length > TOP_N && (
        <p className="text-center text-xs text-muted-foreground">
          Showing top {TOP_N}. Climb into the leaderboard by attending classes and submitting work.
        </p>
      )}
    </div>
  )
}

function GoalRow({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-foreground/80">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
        {icon}
      </span>
      <span>{label}</span>
    </div>
  )
}

// Big "you're a Scholar" card with the XP progress bar to the next
// level and a flame chip if the student has a live streak. This is
// the emotional hook of the page — bigger / brighter than the
// analytical breakdown below, on purpose.
function LevelStreakCard({
  level,
  streak,
  name,
}: {
  level: ReturnType<typeof levelForPoints>
  streak: number
  name: string
}) {
  const { current, next, total, inLevel, toNext, pct } = level
  const isMax = !next
  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          "bg-gradient-to-br p-4 sm:p-5",
          isMax
            ? "from-amber-400/25 via-amber-500/15 to-transparent"
            : "from-primary/15 via-primary/5 to-transparent",
        )}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ring-2",
              isMax ? "bg-amber-400/30 ring-amber-400/60" : "bg-primary/15 ring-primary/30",
            )}
            aria-hidden
          >
            {current.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Level {current.level} · {name}
            </p>
            <p className="font-serif text-xl font-bold leading-tight">
              {current.name}
              <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                {total} XP
              </span>
            </p>
          </div>
          {streak >= 2 && (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-sm font-semibold text-orange-700 dark:text-orange-300">
              <Flame className="h-4 w-4" />
              <span className="tabular-nums">{streak}</span>
              <span className="text-xs font-normal">day streak</span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {isMax ? "Top of the ladder" : `Next: ${next.emoji} ${next.name}`}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {isMax
                ? `${inLevel} XP this level`
                : `${toNext} XP to go`}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isMax ? "bg-amber-400" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

// Achievement chips grouped by category. Earned chips render in
// colour; unearned ones are dimmed but still visible (so the student
// knows what's possible). Hover surfaces the unlock condition.
function BadgesCard({
  badges,
}: {
  badges: ReturnType<typeof badgesForEntry>
}) {
  const earnedCount = badges.filter((b) => b.earned).length
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" />
            Achievements
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {earnedCount} / {badges.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {badges.map(({ def, earned }) => (
            <div
              key={def.key}
              title={`${def.label} — ${def.hint}`}
              className={cn(
                "group flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
                earned
                  ? "border-amber-500/30 bg-amber-500/10 hover:-translate-y-0.5 hover:border-amber-500/50"
                  : "border-dashed border-border bg-muted/30 opacity-60",
              )}
            >
              <span
                className={cn(
                  "text-2xl leading-none",
                  earned ? "" : "grayscale",
                )}
                aria-hidden
              >
                {def.emoji}
              </span>
              <p
                className={cn(
                  "line-clamp-1 text-[11px] font-semibold",
                  earned ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {def.label}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Compact stat tile used in the header strip. Big number, tiny label.
function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 backdrop-blur">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

// "How you earned" — splits the student's total into the five named
// buckets the engine tracks. Empty buckets are kept (greyed out) so
// the student can see the levers they haven't pulled yet.
function BreakdownCard({ entry }: { entry: LeaderboardEntry }) {
  const rows: Array<{
    key: keyof LeaderboardEntry["breakdown"]
    label: string
    icon: React.ReactNode
    detail: string
  }> = [
    {
      key: "engagement",
      label: "Engagement",
      icon: <Flame className="h-3.5 w-3.5" />,
      detail: `${entry.stats.daysActive}d active · ${entry.stats.communitiesJoined} communities · ${entry.stats.doubtsAsked} doubts`,
    },
    {
      key: "attendance",
      label: "Live classes",
      icon: <CalendarCheck className="h-3.5 w-3.5" />,
      detail: `${entry.stats.classesAttended} attended`,
    },
    {
      key: "quizzes",
      label: "Quizzes",
      icon: <FileQuestion className="h-3.5 w-3.5" />,
      detail: `${entry.stats.quizzesPassed}/${entry.stats.quizzesTaken} passed`,
    },
    {
      key: "assignments",
      label: "Assignments",
      icon: <Zap className="h-3.5 w-3.5" />,
      detail: `${entry.stats.assignmentsSubmitted} submitted · ${entry.stats.assignmentsHighScore} high-score`,
    },
    {
      key: "lessons",
      label: "Lessons & courses",
      icon: <BookOpen className="h-3.5 w-3.5" />,
      detail: `${entry.stats.lessonsCompleted} lessons · ${entry.stats.coursesCompleted} courses done`,
    },
  ]
  const max = Math.max(...rows.map((r) => entry.breakdown[r.key] as number), 1)
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          How you earned your {entry.total} points
        </div>
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const pts = entry.breakdown[row.key] as number
            const pct = (pts / max) * 100
            const dim = pts === 0
            return (
              <li key={row.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 font-medium",
                      dim && "text-muted-foreground",
                    )}
                  >
                    {row.icon}
                    {row.label}
                  </span>
                  <span className="tabular-nums font-semibold">{pts}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      dim ? "bg-muted-foreground/20" : "bg-primary",
                    )}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{row.detail}</p>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

// "Earn more" — actionable list calibrated to the engine's rules.
// We hide actions the student has already maxed out (e.g. "complete
// your profile" when avatar + phone are set) so the panel stays
// motivating rather than nagging.
function EarnMoreCard({
  entry,
  slug,
}: {
  entry: LeaderboardEntry
  slug: string
}) {
  const rules = DEFAULT_SCORE_RULES
  const actions: Array<{
    key: string
    label: string
    points: number
    icon: React.ReactNode
    href: string
    show: boolean
  }> = [
    {
      key: "profile",
      label: "Complete your profile (photo + phone)",
      points: rules.profileComplete,
      icon: <UserCircle2 className="h-4 w-4" />,
      href: `/p/${slug}/my/settings`,
      show: !entry.stats.profileComplete,
    },
    {
      key: "community",
      label: "Join a community",
      points: rules.perCommunityJoined,
      icon: <Users2 className="h-4 w-4" />,
      href: `/p/${slug}/my/communities`,
      show: true,
    },
    {
      key: "doubt",
      label: "Ask a doubt",
      points: rules.perDoubtAsked,
      icon: <MessageCircleQuestion className="h-4 w-4" />,
      href: `/p/${slug}/my/doubts`,
      show: true,
    },
    {
      key: "wall",
      label: "Share a win on the Wall of Love",
      points: rules.perWallEntry,
      icon: <Heart className="h-4 w-4" />,
      href: `/p/${slug}/my/wall`,
      show: true,
    },
    {
      key: "class",
      label: "Attend a live class",
      points: rules.attendedClass,
      icon: <CalendarCheck className="h-4 w-4" />,
      href: `/p/${slug}/my/classes`,
      show: true,
    },
    {
      key: "quiz",
      label: "Pass a quiz",
      points: rules.quizAttempted + rules.quizPassedBonus,
      icon: <FileQuestion className="h-4 w-4" />,
      href: `/p/${slug}/my/quizzes`,
      show: true,
    },
  ].filter((a) => a.show)

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          Quick wins to climb
        </div>
        <ul className="space-y-2">
          {actions.map((a) => (
            <li
              key={a.key}
              className="flex items-center gap-3 rounded-md border border-border/60 bg-card/50 p-2.5 transition-colors hover:border-primary/40 hover:bg-card"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                {a.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">{a.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  +{a.points} pts
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={a.href}>Go</Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// 2-1-3 podium. Tallest column is the centre (#1); silver to the
// left, bronze to the right. Skips slots gracefully when fewer than
// three students have any activity.
function Podium({ entries, meId }: { entries: LeaderboardEntry[]; meId: string }) {
  const [first, second, third] = entries
  // Ordering for the visual row: [silver, gold, bronze].
  const slots: Array<{
    entry: LeaderboardEntry | undefined
    height: string
    bg: string
    icon: React.ReactNode
    label: string
    medalEmoji: string
  }> = [
    {
      entry: second,
      height: "h-20",
      bg: "from-slate-300 to-slate-200 dark:from-slate-500 dark:to-slate-600",
      icon: <Medal className="h-5 w-5 text-slate-700 dark:text-slate-200" />,
      label: "Runner-up",
      medalEmoji: "🥈",
    },
    {
      entry: first,
      height: "h-28",
      bg: "from-amber-300 to-amber-200 dark:from-amber-500 dark:to-amber-600",
      icon: <Crown className="h-6 w-6 text-amber-900 dark:text-amber-100" />,
      label: "Champion",
      medalEmoji: "🥇",
    },
    {
      entry: third,
      height: "h-16",
      bg: "from-amber-700/70 to-amber-600/60 dark:from-amber-800 dark:to-amber-700",
      icon: <Medal className="h-5 w-5 text-amber-50" />,
      label: "Bronze",
      medalEmoji: "🥉",
    },
  ]
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            This week&apos;s podium
          </p>
        </div>
        <div className="grid grid-cols-3 items-end gap-3 sm:gap-4">
          {slots.map((slot, idx) => {
            const e = slot.entry
            if (!e) {
              return (
                <div key={idx} className="flex flex-col items-center gap-2 opacity-40">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                    ?
                  </div>
                  <p className="text-[11px] text-muted-foreground">Open spot</p>
                  <div className={cn("w-full rounded-t-md bg-muted/40", slot.height)} />
                </div>
              )
            }
            const isMe = e.student.id === meId
            return (
              <div key={e.student.id} className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1 text-lg">{slot.medalEmoji}</div>
                <Avatar
                  className={cn(
                    "h-14 w-14 ring-2 ring-offset-2 ring-offset-background",
                    isMe ? "ring-primary" : "ring-amber-400/60",
                  )}
                >
                  {e.student.avatar ? (
                    <AvatarImage src={e.student.avatar} alt={e.student.name} />
                  ) : null}
                  <AvatarFallback>{initials(e.student.name)}</AvatarFallback>
                </Avatar>
                <p
                  className={cn(
                    "line-clamp-1 max-w-[8rem] text-center text-xs font-semibold",
                    isMe && "text-primary",
                  )}
                >
                  {isMe ? `You · ${e.student.name}` : e.student.name}
                </p>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {e.total} pts
                </p>
                <div
                  className={cn(
                    "flex w-full items-center justify-center rounded-t-md bg-gradient-to-b",
                    slot.bg,
                    slot.height,
                  )}
                >
                  {slot.icon}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function RankBadge({
  entry,
  large,
}: {
  entry: LeaderboardEntry
  large?: boolean
}) {
  if (entry.rank <= 3) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums shadow-sm",
          large ? "h-12 w-12 text-base" : "h-10 w-10 text-sm",
          entry.rank === 1 && "bg-amber-400 text-amber-950",
          entry.rank === 2 && "bg-slate-300 text-slate-900",
          entry.rank === 3 && "bg-amber-700/70 text-amber-50",
        )}
        title={
          entry.rank === 1 ? "Champion" : entry.rank === 2 ? "Runner-up" : "Bronze"
        }
      >
        {entry.rank === 1 ? <Crown className="h-5 w-5" /> : `#${entry.rank}`}
      </div>
    )
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold tabular-nums text-foreground/70",
        large ? "h-12 w-12 text-base" : "h-10 w-10 text-sm",
      )}
    >
      #{entry.rank}
    </div>
  )
}
