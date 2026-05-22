"use client"

import { DollarSign, Users, BookOpen, TrendingUp, Award, Clock, Target, BarChart3 } from "lucide-react"
import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useLMS } from "@/lib/lms-store"
import { useStore } from "@/lib/store-store"
import { useCertificateStore } from "@/lib/certificate-store"
import { usePlan } from "@/lib/use-plan"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"
import {
  revenueByMonth,
  signupsByMonth,
  enrollmentsByMonth,
  topCourses as topCoursesAgg,
  acquisitionFunnel,
  cohortRetention,
} from "@/lib/analytics-aggregates"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { cn } from "@/lib/utils"

const COLORS = ["var(--success)", "var(--accent)", "var(--muted-foreground)"]

export default function AnalyticsPage() {
  const { getAnalytics, courses, enrollments, users } = useLMS()
  const { orders } = useStore()
  const { batches: certBatches } = useCertificateStore()
  const certificates = useMemo(
    () => certBatches.flatMap((b) => b.certificates),
    [certBatches],
  )
  const { isAtLeast } = usePlan()
  const analytics = getAnalytics()

  const students = useMemo(() => users.filter((u) => u.role === "student"), [users])

  // Real aggregations — these replace the hardcoded month-trend stubs
  // that ship in getAnalytics() for the chart sections below.
  const revTrend = useMemo(() => revenueByMonth(orders, 12), [orders])
  const signupTrend = useMemo(() => signupsByMonth(students, 12), [students])
  const enrolTrend = useMemo(() => enrollmentsByMonth(enrollments, 12), [enrollments])
  const topByRevenue = useMemo(() => topCoursesAgg(courses, enrollments, 8), [courses, enrollments])
  const funnel = useMemo(
    () => acquisitionFunnel(students, enrollments, certificates.length),
    [students, enrollments, certificates],
  )
  const cohorts = useMemo(() => cohortRetention(students, enrollments, 8, 6), [students, enrollments])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Track your course performance and student engagement</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${analytics.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-success mt-1">+12.5% from last month</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{analytics.totalStudents.toLocaleString()}</p>
                <p className="text-xs text-success mt-1">+8.2% from last month</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Courses</p>
                <p className="text-2xl font-bold">{courses.filter(c => c.status === "published").length}</p>
                <p className="text-xs text-muted-foreground mt-1">{analytics.totalCourses} total courses</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <BookOpen className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{Math.round(analytics.completionRate)}%</p>
                <p className="text-xs text-success mt-1">+5% from last month</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue for the past 5 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--card-foreground)",
                    }}
                    itemStyle={{ color: "var(--card-foreground)" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardDescription>Monthly new enrollments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.enrollmentsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--card-foreground)",
                    }}
                    itemStyle={{ color: "var(--card-foreground)" }}
                    formatter={(value: number) => [value, "Enrollments"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="var(--accent)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--accent)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student Progress Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Student Progress</CardTitle>
            <CardDescription>Distribution by completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Completed", value: analytics.studentProgress.completed },
                      { name: "In Progress", value: analytics.studentProgress.inProgress },
                      { name: "Not Started", value: analytics.studentProgress.notStarted },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--card-foreground)",
                    }}
                    itemStyle={{ color: "var(--card-foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-success" />
                  <span>Completed</span>
                </div>
                <span className="font-medium">{analytics.studentProgress.completed}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-accent" />
                  <span>In Progress</span>
                </div>
                <span className="font-medium">{analytics.studentProgress.inProgress}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                  <span>Not Started</span>
                </div>
                <span className="font-medium">{analytics.studentProgress.notStarted}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Courses */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Performing Courses</CardTitle>
            <CardDescription>Courses by enrollment and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topCourses.map((course, index) => (
                <div key={course.courseId} className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{course.title}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{course.enrollments.toLocaleString()} students</span>
                      <span>${course.revenue.toLocaleString()} revenue</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">${course.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-xl font-bold">{analytics.averageRating.toFixed(1)}/5.0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Enrollments</p>
                <p className="text-xl font-bold">{analytics.totalEnrollments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Content</p>
                <p className="text-xl font-bold">
                  {Math.round(courses.reduce((acc, c) => acc + c.totalDuration, 0) / 60)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Lessons</p>
                <p className="text-xl font-bold">
                  {courses.reduce((acc, c) => acc + c.totalLessons, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Deep dive — real aggregations from orders + signups data.   */}
      {/* ────────────────────────────────────────────────────────── */}

      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Deep dive</h2>
        <p className="text-sm text-muted-foreground">
          Real numbers from your orders, signups, and enrollments — the
          last 12 months.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue area chart — real data */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue trend (12 mo)</CardTitle>
            <CardDescription>
              Sum of paid orders per calendar month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--card-foreground)" }}
                    itemStyle={{ color: "var(--card-foreground)" }}
                    formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" fill="color-mix(in oklch, var(--primary) 15%, transparent)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Signups vs enrollments overlay */}
        <Card>
          <CardHeader>
            <CardTitle>Signups vs. enrollments</CardTitle>
            <CardDescription>
              Where the funnel widens or narrows month over month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signupTrend.map((s, i) => ({ ...s, enrolments: enrolTrend[i]?.value ?? 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--card-foreground)" }}
                    itemStyle={{ color: "var(--card-foreground)" }}
                  />
                  <Line type="monotone" dataKey="value" name="Signups" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="enrolments" name="Enrollments" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel + top-by-revenue */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Acquisition funnel</CardTitle>
            <CardDescription>From signup to certificate.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {funnel.map((stage, i) => (
                <li key={stage.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">{stage.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {stage.count.toLocaleString("en-IN")}
                      <span className="ml-2 text-xs">({stage.pctOfTop}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full transition-all",
                        i === 0 ? "bg-primary" : i < funnel.length - 1 ? "bg-primary/70" : "bg-success",
                      )}
                      style={{ width: `${stage.pctOfTop}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top courses by revenue</CardTitle>
            <CardDescription>Enrollments × price, plus completion rate.</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Course</th>
                  <th className="pb-2 text-right font-medium">Enroll.</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                  <th className="pb-2 text-right font-medium">Complete</th>
                </tr>
              </thead>
              <tbody>
                {topByRevenue.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No courses yet. Publish something to see this fill in.
                    </td>
                  </tr>
                ) : topByRevenue.map((c) => (
                  <tr key={c.courseId} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3">
                      <p className="line-clamp-1 font-medium">{c.title}</p>
                    </td>
                    <td className="py-2 text-right tabular-nums">{c.enrollments.toLocaleString("en-IN")}</td>
                    <td className="py-2 text-right tabular-nums">₹{c.revenue.toLocaleString("en-IN")}</td>
                    <td className="py-2 text-right tabular-nums">
                      <span className={cn(
                        "inline-flex w-12 justify-end",
                        c.completionPct >= 60 ? "text-success" : c.completionPct >= 30 ? "text-amber-600" : "text-muted-foreground",
                      )}>
                        {c.completionPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Cohort retention — Studio / Institute only (advanced analytics). */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort retention</CardTitle>
          <CardDescription>
            % of each signup-month cohort still active N weeks later.
            Hotter = better stickiness. Advanced-tier feature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAtLeast("analytics", "advanced") ? (
            <CohortHeatmap cohorts={cohorts} />
          ) : (
            <PlanFeatureGate feature="analytics">
              <CohortHeatmap cohorts={cohorts} />
            </PlanFeatureGate>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CohortHeatmap({ cohorts }: { cohorts: ReturnType<typeof cohortRetention> }) {
  if (cohorts.every((c) => c.size === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Not enough signups yet. The first cohort appears once you have
        students signing up across at least two months.
      </p>
    )
  }
  const weeks = cohorts[0]?.retention.length ?? 0
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">Cohort</th>
            <th className="pb-1 pr-3 text-right font-medium text-muted-foreground">Size</th>
            {Array.from({ length: weeks }, (_, w) => (
              <th key={w} className="pb-1 px-1 text-center font-medium text-muted-foreground">
                W{w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohort}>
              <td className="py-1 pr-3 font-medium">{c.cohortLabel}</td>
              <td className="py-1 pr-3 text-right tabular-nums text-muted-foreground">{c.size}</td>
              {c.retention.map((p, w) => (
                <td key={w} className="px-0.5 py-0.5">
                  <div
                    title={`${p}% retained at week ${w}`}
                    className={cn(
                      "flex h-7 items-center justify-center rounded text-[10px] font-medium tabular-nums",
                      p === 0
                        ? "bg-muted text-muted-foreground"
                        : p < 25
                          ? "bg-primary/10 text-primary"
                          : p < 50
                            ? "bg-primary/30 text-primary"
                            : p < 75
                              ? "bg-primary/60 text-primary-foreground"
                              : "bg-primary text-primary-foreground",
                    )}
                  >
                    {c.size > 0 ? `${p}%` : "—"}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
