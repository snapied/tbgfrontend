"use client"

import { useMemo } from "react"
import {
  CalendarCheck2,
  ClipboardList,
  FileQuestion,
  TrendingUp,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"

interface StudentPerformanceProps {
  studentId: string
}

export function StudentPerformance({ studentId }: StudentPerformanceProps) {
  const { getStudentPerformance } = useLMS()
  const perf = useMemo(() => getStudentPerformance(studentId), [getStudentPerformance, studentId])

  // Simple weighted overall score: attendance 30% / quizzes 35% / assignments 35%.
  // Only counted components contribute — e.g. if there are no quizzes, the
  // weight is redistributed across what's present.
  const overall = useMemo(() => {
    const parts: Array<{ weight: number; value: number }> = []
    if (perf.attendance.totalSessions > 0) parts.push({ weight: 30, value: perf.attendance.rate })
    if (perf.quizzes.attempts > 0) parts.push({ weight: 35, value: perf.quizzes.avgScore })
    if (perf.assignments.graded > 0) parts.push({ weight: 35, value: perf.assignments.avgScore })
    const wSum = parts.reduce((a, p) => a + p.weight, 0)
    if (wSum === 0) return null
    return Math.round(parts.reduce((a, p) => a + (p.value * p.weight) / wSum, 0))
  }, [perf])

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Performance</CardTitle>
          <CardDescription>Attendance, quizzes, assignments &amp; projects.</CardDescription>
        </div>
        {overall !== null && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall</p>
            <p className={cn(
              "text-2xl font-bold tabular-nums",
              overall >= 80 ? "text-success" : overall >= 50 ? "text-accent" : "text-destructive",
            )}>
              {overall}%
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Top metrics */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            icon={<CalendarCheck2 className="h-4 w-4" />}
            label="Attendance"
            primary={`${perf.attendance.rate}%`}
            detail={`${perf.attendance.attended}/${perf.attendance.totalSessions} sessions`}
          />
          <Metric
            icon={<FileQuestion className="h-4 w-4" />}
            label="Quiz avg"
            primary={perf.quizzes.attempts > 0 ? `${perf.quizzes.avgScore}%` : "—"}
            detail={
              perf.quizzes.attempts === 0
                ? "No attempts"
                : `${perf.quizzes.passed}/${perf.quizzes.attempts - perf.quizzes.pending} passed${perf.quizzes.pending > 0 ? ` · ${perf.quizzes.pending} pending` : ""}`
            }
          />
          <Metric
            icon={<ClipboardList className="h-4 w-4" />}
            label="Coursework"
            primary={perf.assignments.graded > 0 ? `${perf.assignments.avgScore}%` : "—"}
            detail={`${perf.assignments.submitted}/${perf.assignments.total} submitted · ${perf.assignments.graded} graded`}
          />
        </div>

        {/* Per-course breakdown */}
        {perf.byCourse.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments yet.</p>
        ) : (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              By course
            </p>
            <div className="space-y-3">
              {perf.byCourse.map((c) => (
                <div key={c.courseId} className="rounded-md border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium leading-snug">{c.courseTitle}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {c.attendance.totalSessions + c.quizzes.attempts + c.assignments.total} items
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Bar
                      label="Attendance"
                      pct={c.attendance.rate}
                      detail={`${c.attendance.attended}/${c.attendance.totalSessions}`}
                      empty={c.attendance.totalSessions === 0}
                    />
                    <Bar
                      label="Quizzes"
                      pct={c.quizzes.avgScore}
                      detail={c.quizzes.attempts > 0 ? `avg ${c.quizzes.avgScore}% · ${c.quizzes.passed}/${c.quizzes.attempts} pass` : "—"}
                      empty={c.quizzes.attempts === 0}
                    />
                    <Bar
                      label="Coursework"
                      pct={c.assignments.avgScore}
                      detail={c.assignments.total > 0
                        ? `${c.assignments.submitted}/${c.assignments.total} done · avg ${c.assignments.avgScore}%`
                        : "—"}
                      empty={c.assignments.total === 0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({
  icon,
  label,
  primary,
  detail,
}: {
  icon: React.ReactNode
  label: string
  primary: string
  detail: string
}) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums">{primary}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function Bar({
  label,
  pct,
  detail,
  empty,
}: {
  label: string
  pct: number
  detail: string
  empty?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums", empty && "text-muted-foreground")}>
          {empty ? "—" : `${pct}%`}
        </span>
      </div>
      <Progress value={empty ? 0 : pct} className="mt-1 h-1.5" />
      <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  )
}
