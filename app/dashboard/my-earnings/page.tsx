"use client"

// Teacher Earnings Dashboard — reads from localStorage (commission
// store + LMS store). No backend API dependency.
//
// Shows: summary cards, commission terms, assigned courses, and
// a placeholder for future transaction history.

import { useMemo } from "react"
import {
  BookOpen,
  Clock,
  FileText,
  IndianRupee,
  Wallet,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useLMS } from "@/lib/lms-store"
import { getCommission, type CourseEngagement } from "@/lib/teacher-commission-store"

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(n)
}

const MODEL_LABELS: Record<string, string> = {
  percentage: "Percentage Split",
  per_student_fixed: "Per-Student Fixed",
  per_class_fixed: "Fixed Fee / Class",
}

export default function MyEarningsPage() {
  const { currentUser, courses } = useLMS()
  const userId = currentUser?.id
  const commission = useMemo(
    () => (userId ? getCommission(userId) : null),
    [userId],
  )

  const engagements = commission?.engagements ?? []

  // Courses assigned to this teacher (derived from engagements)
  const assignedCourses = useMemo(() => {
    if (!userId) return []
    if (engagements.length > 0) {
      const engCourseIds = new Set(engagements.map((e) => e.courseId))
      return courses.filter((c) => engCourseIds.has(c.id))
    }
    return courses.filter(
      (c) => c.instructor?.id === userId || c.coInstructorIds?.includes(userId),
    )
  }, [courses, userId, engagements])

  const totalStudents = assignedCourses.reduce((s, c) => s + c.enrolledCount, 0)

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Sign in to view your earnings.</p>
      </div>
    )
  }

  if (!commission || !commission.enabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">My Earnings</h1>
          <p className="text-muted-foreground">Your commission and payout dashboard.</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Wallet className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h2 className="mt-3 font-semibold">No commission set up</h2>
            <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">
              Your academy hasn&apos;t enabled paid engagement for your account yet.
              Contact your academy admin to set up commission tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Aggregate earnings across all engagements
  function estimateEngagementEarnings(eng: CourseEngagement): number {
    const course = courses.find((c) => c.id === eng.courseId)
    if (eng.model === "percentage") {
      const price = course?.price ?? 0
      const students = course?.enrolledCount ?? 0
      return Math.round(price * 0.975 * (eng.teacherPct ?? 0) / 100) * students
    }
    if (eng.model === "per_student_fixed") {
      const students = course?.enrolledCount ?? 0
      return (eng.fixedAmount ?? 0) * students
    }
    if (eng.model === "per_class_fixed") {
      return (eng.feePerClass ?? 0) * (eng.completedClasses ?? 0)
    }
    return 0
  }

  const earnedSoFar = engagements.reduce((sum, eng) => sum + estimateEngagementEarnings(eng), 0)
  const totalClassesDone = engagements.reduce((sum, eng) => sum + (eng.completedClasses ?? 0), 0)
  const totalContractValue = engagements
    .filter((eng) => eng.model === "per_class_fixed")
    .reduce((sum, eng) => sum + (eng.feePerClass ?? 0) * (eng.totalClasses ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">My Earnings</h1>
        <p className="text-muted-foreground">
          Your commission and payout dashboard — {currentUser.name}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated Earned</p>
                <p className="text-xl font-bold">{formatINR(earnedSoFar)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned Courses</p>
                <p className="text-xl font-bold">{engagements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Classes Done</p>
                <p className="text-xl font-bold">{totalClassesDone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contract Value</p>
                <p className="text-xl font-bold">
                  {totalContractValue > 0 ? formatINR(totalContractValue) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Terms — per-engagement table */}
      <Card>
        <CardHeader>
          <CardTitle>My Terms</CardTitle>
          <CardDescription>Your commission structure per course</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {engagements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commission set up for any course.</p>
          ) : (
            <div className="space-y-2">
              {engagements.map((eng) => {
                const engCourse = courses.find((c) => c.id === eng.courseId)
                const rateLabel = eng.model === "percentage"
                  ? `${eng.teacherPct}%`
                  : eng.model === "per_student_fixed"
                    ? formatINR(eng.fixedAmount ?? 0)
                    : `${formatINR(eng.feePerClass ?? 0)}/class`
                return (
                  <div key={eng.engagementId} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate">{engCourse?.title ?? "Unknown course"}</p>
                      <span className="text-sm font-semibold text-primary shrink-0 ml-2">{rateLabel}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{MODEL_LABELS[eng.model] ?? "—"}</span>
                      {eng.batchLabel && <span>{eng.batchLabel}</span>}
                      <span>Payout: Monthly, 15th</span>
                    </div>
                    {eng.model === "per_class_fixed" && (eng.totalClasses ?? 0) > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Contract Progress</span>
                          <span className="font-semibold">{eng.completedClasses ?? 0} / {eng.totalClasses} classes</span>
                        </div>
                        <Progress
                          value={((eng.completedClasses ?? 0) / (eng.totalClasses ?? 1)) * 100}
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Earned: {formatINR((eng.feePerClass ?? 0) * (eng.completedClasses ?? 0))}</span>
                          <span>Remaining: {formatINR((eng.feePerClass ?? 0) * ((eng.totalClasses ?? 0) - (eng.completedClasses ?? 0)))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Courses */}
      <Card>
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
          <CardDescription>{assignedCourses.length} course{assignedCourses.length === 1 ? "" : "s"} assigned</CardDescription>
        </CardHeader>
        <CardContent>
          {assignedCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {assignedCourses.map((c) => {
                const eng = engagements.find((e) => e.courseId === c.id)
                const rateLabel = eng
                  ? eng.model === "percentage"
                    ? `${eng.teacherPct}%`
                    : eng.model === "per_student_fixed"
                      ? `${formatINR(eng.fixedAmount ?? 0)}/student`
                      : `${formatINR(eng.feePerClass ?? 0)}/class`
                  : null
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.category || "Uncategorized"} &middot; {c.enrolledCount} student{c.enrolledCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">
                        {c.price > 0 ? formatINR(c.price) : "Free"}
                      </p>
                      {eng && rateLabel && (
                        <p className="text-[10px] text-primary">
                          {MODEL_LABELS[eng.model]}: {rateLabel}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Detailed breakdown of every payment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-medium">No transactions yet</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              When students enroll in your courses, each payment will appear here with a full
              breakdown: gross → gateway fees → GST → your share.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
