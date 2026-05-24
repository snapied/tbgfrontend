"use client"

import { useMemo, useState } from "react"
import {
  Award,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  Crown,
  Medal,
  NotebookPen,
  Search,
  Trophy,
  Users as UsersIcon,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"
import { useWall } from "@/lib/wall-store"
import {
  computeLeaderboard,
  DEFAULT_SCORE_RULES,
  tierForRank,
  type LeaderboardEntry,
} from "@/lib/leaderboard"

export default function LeaderboardPage() {
  const {
    users,
    enrollments,
    attendance,
    quizAttempts,
    quizzes,
    submissions,
    liveSessions,
    courses,
    studentGroups,
    doubts,
  } = useLMS()
  const { entries: wallEntries } = useWall()
  const [search, setSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [timeRange, setTimeRange] = useState<"all" | "30d" | "7d">("all")

  // Apply course + time filters to source data before scoring.
  const filteredInputs = useMemo(() => {
    const cutoff =
      timeRange === "7d"  ? Date.now() - 7  * 86400000 :
      timeRange === "30d" ? Date.now() - 30 * 86400000 :
      0

    const inCourse = (cid: string) => courseFilter === "all" || cid === courseFilter
    const afterCutoff = (iso: string) => cutoff === 0 || new Date(iso).getTime() >= cutoff

    const enrolledStudentIds = new Set(
      enrollments.filter((e) => inCourse(e.courseId)).map((e) => e.studentId),
    )
    const courseQuizIds = new Set(
      quizzes.filter((q) => inCourse(q.courseId)).map((q) => q.id),
    )
    const courseSessionIds = new Set(
      liveSessions.filter((s) => inCourse(s.courseId)).map((s) => s.id),
    )

    return {
      students: users.filter((u) => u.role === "student" && enrolledStudentIds.has(u.id)),
      enrollments: enrollments.filter((e) => inCourse(e.courseId)),
      attendance: attendance.filter((a) =>
        courseSessionIds.has(a.sessionId) && afterCutoff(a.joinedAt),
      ),
      attempts: quizAttempts.filter((a) =>
        courseQuizIds.has(a.quizId) && afterCutoff(a.completedAt ?? a.startedAt),
      ),
      quizzes,
      submissions: submissions.filter((s) => afterCutoff(s.submittedAt)),
      sessions: liveSessions.filter((s) => inCourse(s.courseId)),
      // Engagement signals — workspace-wide, not course-scoped, so
      // the course filter doesn't clip them. The compute engine
      // intersects with the student roster, so passing the full set
      // is safe.
      studentGroups,
      doubts: doubts.filter((d) => afterCutoff(d.createdAt)),
      wallEntries,
      rules: DEFAULT_SCORE_RULES,
    }
  }, [users, enrollments, attendance, quizAttempts, quizzes, submissions, liveSessions, studentGroups, doubts, wallEntries, courseFilter, timeRange])

  const entries = useMemo(() => computeLeaderboard(filteredInputs), [filteredInputs])
  const visibleEntries = useMemo(() => {
    if (!search) return entries
    const q = search.toLowerCase()
    return entries.filter((e) =>
      e.student.name.toLowerCase().includes(q) ||
      e.student.email.toLowerCase().includes(q),
    )
  }, [entries, search])

  const podium = entries.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">
            Students earn points for attending classes, taking quizzes, submitting assignments, and completing courses.
          </p>
        </div>
      </div>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">
            <Trophy className="mr-2 h-3.5 w-3.5" /> Ranking
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Award className="mr-2 h-3.5 w-3.5" /> Scoring rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    placeholder="Search students…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-9"
                    aria-label="Search leaderboard"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-full sm:w-56" aria-label="Filter by course">
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
                  <SelectTrigger className="w-full sm:w-44" aria-label="Time range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {entries.length === 0 ? (
            <Card>
              <CardContent className="px-6 py-12 text-center">
                <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 font-semibold">No points yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once students attend classes, take quizzes, or submit assignments, the leaderboard will fill in here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Podium */}
              {podium.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {podium.map((e) => <PodiumCard key={e.student.id} entry={e} />)}
                </div>
              )}

              {/* Full ranking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Full ranking</CardTitle>
                  <CardDescription>{entries.length} students with points{search && ` · ${visibleEntries.length} match "${search}"`}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {visibleEntries.map((e) => (
                      <RankRow key={e.student.id} entry={e} totalCohort={entries.length} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How points are earned</CardTitle>
              <CardDescription>
                The same rules apply across every course. Best score per quiz / assignment is counted (no farming repeated attempts).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <RuleRow icon={<CalendarCheck className="h-4 w-4" />} label="Class attended" pts={DEFAULT_SCORE_RULES.attendedClass} />
              <RuleRow icon={<ClipboardCheck className="h-4 w-4" />} label="Quiz attempted" pts={DEFAULT_SCORE_RULES.quizAttempted} />
              <RuleRow icon={<ClipboardCheck className="h-4 w-4" />} label="Quiz passed (bonus)" pts={DEFAULT_SCORE_RULES.quizPassedBonus} suffix="bonus" />
              <RuleRow icon={<NotebookPen className="h-4 w-4" />} label="Assignment submitted" pts={DEFAULT_SCORE_RULES.assignmentSubmitted} />
              <RuleRow icon={<NotebookPen className="h-4 w-4" />} label="Assignment scored ≥ 80% (bonus)" pts={DEFAULT_SCORE_RULES.assignmentHighScoreBonus} suffix="bonus" />
              <RuleRow icon={<BookOpen className="h-4 w-4" />} label="Lesson completed" pts={DEFAULT_SCORE_RULES.lessonCompleted} />
              <RuleRow icon={<Crown className="h-4 w-4" />} label="Course completed" pts={DEFAULT_SCORE_RULES.courseCompleted} />
              <RuleRow icon={<Award className="h-4 w-4" />} label="Welcome bonus" pts={DEFAULT_SCORE_RULES.welcomeBonus} suffix="one-time" />
              <RuleRow icon={<Trophy className="h-4 w-4" />} label="Profile complete (avatar + phone)" pts={DEFAULT_SCORE_RULES.profileComplete} suffix="one-time" />
              <RuleRow icon={<UsersIcon className="h-4 w-4" />} label="Joined a community" pts={DEFAULT_SCORE_RULES.perCommunityJoined} />
              <RuleRow icon={<ClipboardCheck className="h-4 w-4" />} label="Asked a doubt" pts={DEFAULT_SCORE_RULES.perDoubtAsked} />
              <RuleRow icon={<NotebookPen className="h-4 w-4" />} label="Wall of Love entry" pts={DEFAULT_SCORE_RULES.perWallEntry} />
              <RuleRow icon={<CalendarCheck className="h-4 w-4" />} label="Day active (capped)" pts={DEFAULT_SCORE_RULES.perDayActive} suffix={`max ${DEFAULT_SCORE_RULES.daysActiveCap}d`} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const palette =
    entry.rank === 1 ? "from-amber-400 to-amber-600 text-amber-950" :
    entry.rank === 2 ? "from-slate-300 to-slate-500 text-slate-950" :
    "from-orange-400 to-orange-700 text-orange-50"
  const icon =
    entry.rank === 1 ? <Crown className="h-6 w-6" /> :
    entry.rank === 2 ? <Medal className="h-6 w-6" /> :
    <Medal className="h-6 w-6" />

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br", palette)}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{entry.student.name}</p>
            <p className="text-xs text-muted-foreground">
              Rank #{entry.rank}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{entry.total}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">pts</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RankRow({ entry, totalCohort }: { entry: LeaderboardEntry; totalCohort: number }) {
  // tierForRank's second argument is the cohort size — "top 10%"
  // of 100 ≠ "top 10%" of 12. The prior hardcoded 100 made every
  // small-cohort leaderboard tier the top 10 students "Top 10%",
  // which is meaningless.
  const tier = tierForRank(entry.rank, totalCohort)
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="w-8 shrink-0 text-center font-mono text-sm font-semibold tabular-nums text-muted-foreground">
        #{entry.rank}
      </span>
      {entry.student.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.student.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {entry.student.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{entry.student.name}</span>
          {tier && (
            <Badge variant="secondary" className="text-[10px]">
              {tier.emoji} {tier.label}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {entry.stats.classesAttended > 0 && (
            <span><CalendarCheck className="mr-0.5 inline h-3 w-3" /> {entry.stats.classesAttended} classes</span>
          )}
          {entry.stats.quizzesPassed > 0 && (
            <span><ClipboardCheck className="mr-0.5 inline h-3 w-3" /> {entry.stats.quizzesPassed} quizzes passed</span>
          )}
          {entry.stats.assignmentsSubmitted > 0 && (
            <span><NotebookPen className="mr-0.5 inline h-3 w-3" /> {entry.stats.assignmentsSubmitted} assignments</span>
          )}
          {entry.stats.coursesCompleted > 0 && (
            <span><Crown className="mr-0.5 inline h-3 w-3" /> {entry.stats.coursesCompleted} courses done</span>
          )}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold tabular-nums">{entry.total}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">pts</p>
      </div>
    </li>
  )
}

function RuleRow({
  icon, label, pts, suffix,
}: {
  icon: React.ReactNode
  label: string
  pts: number
  suffix?: string
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2.5">
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="font-bold tabular-nums">
        +{pts}
        {suffix && <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">{suffix}</span>}
      </span>
    </div>
  )
}
