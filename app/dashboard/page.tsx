"use client"

import Link from "next/link"
import { Award, FileText, CheckCircle, Clock, Plus, ArrowUpRight, BookOpen, GraduationCap, BarChart3, Megaphone, MessageSquare, FileQuestion, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useCertificateStore } from "@/lib/certificate-store"
import { useLMS } from "@/lib/lms-store"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { GettingStartedCard } from "@/components/dashboard/getting-started"

// Starter tour for fresh teachers landing on the dashboard. Selectors
// hit the sidebar items (which carry `data-tour=...` markers) and
// dashboard cards. The tour appears as a "Show me around" pill in the
// bottom-right on first visit; users can dismiss it permanently.
const DASHBOARD_TOUR: TourStep[] = [
  {
    title: "Welcome to The Big Class",
    body: "Two-minute tour of the bits you'll use most. Hit Next to step through, or close anytime.",
    emoji: "👋",
    placement: "center",
  },
  {
    target: "[data-tour='nav-courses']",
    title: "Your courses",
    body: "Build, edit, and publish courses. Each course can have modules, lessons, quizzes, assignments, and live sessions.",
    emoji: "📚",
    placement: "right",
  },
  {
    target: "[data-tour='nav-students']",
    title: "Students + groups + messaging",
    body: "Add students, bucket them into groups, send single or bulk messages with attachments across email, in-app, and WhatsApp.",
    emoji: "🎓",
    placement: "right",
  },
  {
    target: "[data-tour='nav-doubts']",
    title: "Doubts & Q&A",
    body: "Students ask questions from their lesson player; you reply here. Threads stay open until you mark them resolved.",
    emoji: "❓",
    placement: "right",
  },
  {
    target: "[data-tour='nav-portal']",
    title: "Customer portal",
    body: "Your public branded site — home, about, faculty, blog, shop, contact. Theme presets in one click, drag-in sections, custom domain.",
    emoji: "🌐",
    placement: "right",
  },
  {
    target: "[data-tour='nav-store']",
    title: "Storefront",
    body: "Sell courses, downloads, 1-on-1 sessions, memberships, bundles, license keys. Products auto-list in your public Shop.",
    emoji: "🛍️",
    placement: "right",
  },
  {
    title: "You're set — start with a course",
    body: "Most teachers go: create a course → enroll a few students → post a follow-up assignment. We've got templates if you'd like a head start.",
    emoji: "✨",
    placement: "center",
  },
]

export default function DashboardPage() {
  const { batches } = useCertificateStore()
  const { courses, students, quizzes, discussions, announcements, enrollments } = useLMS()
  
  // Certificate stats
  const totalCertificates = batches.reduce((acc, batch) => acc + batch.successCount, 0)
  const completedBatches = batches.filter(b => b.status === "completed").length
  const recentBatches = batches.slice(0, 3)

  // LMS stats
  const publishedCourses = courses?.filter(c => c.status === "published").length || 0
  const totalStudents = students?.length || 0
  const activeEnrollments = enrollments?.length || 0
  const avgCompletionRate = enrollments?.length > 0 
    ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length)
    : 0

  const stats = [
    { name: "Published Courses", value: publishedCourses.toString(), icon: BookOpen, change: `${courses?.length || 0} total`, color: "text-primary" },
    { name: "Total Students", value: totalStudents.toString(), icon: GraduationCap, change: `${activeEnrollments} enrolled`, color: "text-success" },
    { name: "Certificates Issued", value: totalCertificates.toLocaleString(), icon: Award, change: `${completedBatches} batches`, color: "text-accent" },
    { name: "Avg. Completion", value: `${avgCompletionRate}%`, icon: BarChart3, change: "Course progress", color: "text-primary" },
  ]

  return (
    <div className="space-y-8">
      <ProductTour tourId="dashboard-v1" steps={DASHBOARD_TOUR} />
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your certificate overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId="dashboard-v1" />
          <Button asChild>
            <Link href="/dashboard/new-batch">
              <Plus className="mr-2 h-4 w-4" />
              New Certificate Batch
            </Link>
          </Button>
        </div>
      </div>

      {/* Onboarding rail — vanishes once the user has done all 4 things
          (or dismisses it manually). New tenants land on a clear path
          instead of an empty dashboard with 30 sidebar items. */}
      <GettingStartedCard />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Courses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Courses</CardTitle>
              <CardDescription>Your active courses</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/courses">
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(courses || []).slice(0, 3).map((course) => {
                const courseEnrollments = (enrollments || []).filter(e => e.courseId === course.id)
                const avgProgress = courseEnrollments.length > 0
                  ? Math.round(courseEnrollments.reduce((acc, e) => acc + e.progress, 0) / courseEnrollments.length)
                  : 0
                return (
                  <div key={course.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{course.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {courseEnrollments.length} students enrolled
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        course.status === "published"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {course.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={avgProgress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-10">{avgProgress}%</span>
                    </div>
                  </div>
                )
              })}
              {(courses || []).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No courses yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest discussions and announcements</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(announcements || []).slice(0, 2).map((ann) => (
                <div key={ann.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <Megaphone className="h-5 w-5 text-primary mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{ann.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ann.content}</p>
                  </div>
                </div>
              ))}
              {(discussions || []).slice(0, 2).map((disc) => (
                <div key={disc.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <MessageSquare className="h-5 w-5 text-accent mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{disc.title}</p>
                    <p className="text-sm text-muted-foreground">{disc.replies.length} replies</p>
                  </div>
                </div>
              ))}
              {(announcements || []).length === 0 && (discussions || []).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificate Batches */}
      {recentBatches.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Certificate Batches</CardTitle>
              <CardDescription>Your recently generated certificates</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/history">
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{batch.courseName}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="capitalize">{batch.template} template</span>
                      <span>&bull;</span>
                      <span>{batch.successCount}/{batch.totalRows} certificates</span>
                      <span>&bull;</span>
                      <span>{new Date(batch.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        batch.status === "completed"
                          ? "bg-success/10 text-success"
                          : "bg-accent/20 text-accent-foreground"
                      }`}
                    >
                      {batch.status === "completed" ? "Completed" : "Processing"}
                    </span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/history/${batch.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/dashboard/courses/new">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5 text-primary" />
                Create Course
              </CardTitle>
              <CardDescription>Build a new course with lessons</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/dashboard/quizzes/new">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileQuestion className="h-5 w-5 text-primary" />
                Create Quiz
              </CardTitle>
              <CardDescription>Add assessments to courses</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/dashboard/new-batch">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-5 w-5 text-primary" />
                Generate Certificates
              </CardTitle>
              <CardDescription>Upload CSV and create batch</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/dashboard/students">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary" />
                Manage Students
              </CardTitle>
              <CardDescription>View and manage enrollments</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}
