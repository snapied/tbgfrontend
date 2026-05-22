"use client"

// Student detail page — one screen for everything a teacher needs:
//   • Profile header with avatar (real photo when set), edit, send
//     message, quick stats.
//   • Tabbed body: Overview · Activity · Doubts · Invoices ·
//     Messages. Each tab is a focused panel so the page doesn't
//     become a wall of cards.
//   • Sidebar: learning stats, quiz performance, certificates.

import { use, useState } from "react"
import Link from "next/link"
import {
  Award,
  BookOpen,
  Calendar,
  ExternalLink,
  History,
  Mail,
  MessageCircleQuestion,
  Pencil,
  Phone,
  Receipt,
  Send,
  TrendingUp,
  User as UserIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLMS } from "@/lib/lms-store"
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs"
import { StudentPerformance } from "@/components/dashboard/student-performance"
import { StudentEnrollWidget } from "@/components/students/student-enroll-widget"
import { StudentActivityTimeline } from "@/components/students/student-activity-timeline"
import { StudentDoubtsPanel } from "@/components/students/student-doubts"
import { StudentInvoices } from "@/components/students/student-invoices"
import { MessageComposer } from "@/components/messages/message-composer"

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const {
    getUserById,
    enrollments,
    getCourseById,
    quizAttempts,
    quizzes,
    getMessagesForRecipient,
    getUserById: lookup,
  } = useLMS()

  const student = getUserById(id)
  const [messageOpen, setMessageOpen] = useState(false)

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold">Student not found</h1>
        <Button asChild className="mt-4">
          <Link href="/dashboard/students">Back to Students</Link>
        </Button>
      </div>
    )
  }

  const studentEnrollments = enrollments.filter((e) => e.studentId === id)
  const studentQuizAttempts = quizAttempts.filter((a) => a.studentId === id)
  const completedCourses = studentEnrollments.filter((e) => e.progress === 100).length
  const inProgressCourses = studentEnrollments.filter((e) => e.progress > 0 && e.progress < 100).length
  const averageProgress = studentEnrollments.length > 0
    ? Math.round(studentEnrollments.reduce((acc, e) => acc + e.progress, 0) / studentEnrollments.length)
    : 0
  const averageQuizScore = studentQuizAttempts.length > 0
    ? Math.round(studentQuizAttempts.reduce((acc, a) => acc + a.score, 0) / studentQuizAttempts.length)
    : 0

  const messages = getMessagesForRecipient(id)
  const certificateEnrollments = studentEnrollments.filter((e) => e.certificateId)

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs
        crumbs={[
          { label: "Students", href: "/dashboard/students" },
          { label: student.name },
        ]}
      />

      {/* Profile header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {student.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.avatar}
                alt={student.name}
                className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground">{student.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {student.email}
                </span>
                {student.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {student.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(student.createdAt).toLocaleDateString()}
                </span>
              </div>
              {student.bio && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{student.bio}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/students/${student.id}/edit`}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit
                </Link>
              </Button>
              <Button onClick={() => setMessageOpen(true)}>
                <Send className="mr-1.5 h-4 w-4" /> Send message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <StudentPerformance studentId={student.id} />

          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview"><UserIcon className="mr-1.5 h-3.5 w-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="activity"><History className="mr-1.5 h-3.5 w-3.5" /> Activity</TabsTrigger>
              <TabsTrigger value="doubts"><MessageCircleQuestion className="mr-1.5 h-3.5 w-3.5" /> Doubts</TabsTrigger>
              <TabsTrigger value="invoices"><Receipt className="mr-1.5 h-3.5 w-3.5" /> Invoices</TabsTrigger>
              <TabsTrigger value="messages"><Send className="mr-1.5 h-3.5 w-3.5" /> Messages</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <StudentEnrollWidget studentId={student.id} />

              <Card>
                <CardHeader>
                  <CardTitle>Quiz attempts</CardTitle>
                  <CardDescription>{studentQuizAttempts.length} attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  {studentQuizAttempts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No attempts yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {studentQuizAttempts.map((attempt) => {
                        const quiz = quizzes.find((q) => q.id === attempt.quizId)
                        return (
                          <div
                            key={attempt.id}
                            className="flex items-center justify-between rounded-md bg-muted/40 p-3"
                          >
                            <div>
                              <p className="font-medium">{quiz?.title || "Unknown quiz"}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(attempt.completedAt || attempt.startedAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-base font-bold ${attempt.passed ? "text-success" : "text-destructive"}`}>
                                {attempt.score}%
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {attempt.passed ? "Passed" : "Failed"}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <StudentActivityTimeline studentId={student.id} />
            </TabsContent>

            <TabsContent value="doubts" className="mt-4">
              <StudentDoubtsPanel studentId={student.id} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <StudentInvoices student={student} />
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Messages sent</CardTitle>
                  <CardDescription>
                    {messages.length} message{messages.length === 1 ? "" : "s"} sent to this student.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nothing sent yet. Click <strong>Send message</strong> above to start.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {messages.map((m) => {
                        const sender = lookup(m.senderId)
                        return (
                          <li
                            key={m.id}
                            className="rounded-md border border-border bg-card p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold">{m.subject}</p>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(m.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              From {sender?.name ?? "Teacher"} via {m.channels.join(", ")}
                              {m.attachments && m.attachments.length > 0
                                ? ` · ${m.attachments.length} attachment${m.attachments.length === 1 ? "" : "s"}`
                                : ""}
                            </p>
                            <div
                              className="mt-2 line-clamp-3 text-sm text-foreground/90"
                              dangerouslySetInnerHTML={{ __html: m.body }}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row icon={<BookOpen className="h-4 w-4 text-muted-foreground" />} label="Enrolled" value={`${studentEnrollments.length} courses`} />
              <Row icon={<Award className="h-4 w-4 text-success" />} label="Completed" value={`${completedCourses} courses`} valueClassName="text-success" />
              <Row icon={<TrendingUp className="h-4 w-4 text-accent" />} label="In progress" value={`${inProgressCourses} courses`} valueClassName="text-accent" />
              <div className="border-t border-border pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall progress</span>
                  <span className="font-semibold">{averageProgress}%</span>
                </div>
                <Progress value={averageProgress} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiz performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="Quizzes taken" value={`${studentQuizAttempts.length}`} />
              <Row label="Average score" value={`${averageQuizScore}%`} />
              <Row
                label="Pass rate"
                value={`${
                  studentQuizAttempts.length > 0
                    ? Math.round((studentQuizAttempts.filter((a) => a.passed).length / studentQuizAttempts.length) * 100)
                    : 0
                }%`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              {certificateEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No certificates earned yet.</p>
              ) : (
                <div className="space-y-2">
                  {certificateEnrollments.map((enrollment) => {
                    const course = getCourseById(enrollment.courseId)
                    return (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between rounded bg-muted/40 p-2"
                      >
                        <span className="truncate text-sm font-medium">{course?.title}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/verify/${enrollment.certificateId}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <MessageComposer
        open={messageOpen}
        onOpenChange={setMessageOpen}
        recipients={[student]}
      />
    </div>
  )
}

function Row({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`font-semibold ${valueClassName ?? ""}`}>{value}</span>
    </div>
  )
}
