"use client"

// Student detail page — one screen for everything a teacher needs:
//   • Profile header with avatar (real photo when set), edit, send
//     message, quick stats.
//   • Tabbed body: Overview · Activity · Doubts · Invoices ·
//     Messages. Each tab is a focused panel so the page doesn't
//     become a wall of cards.
//   • Sidebar: learning stats, quiz performance, certificates.

import { Suspense, use, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { BackButton } from "@/components/ui/back-button"
import {
  Award,
  BookOpen,
  Calendar,
  ExternalLink,
  History,
  Link as LinkIcon2,
  Mail,
  MessageCircleQuestion,
  MessageSquare,
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
import { touchRecentStudent } from "@/lib/recently-viewed-students"
import { StudentPrivateNotesPanel } from "@/components/students/student-private-notes"
import { StudentTagsEditor } from "@/components/students/student-tags"
import { maskEmail, maskPhone } from "@/lib/masking"
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs"
import { StudentPerformance } from "@/components/dashboard/student-performance"
import { StudentEnrollWidget } from "@/components/students/student-enroll-widget"
import { StudentActivityTimeline } from "@/components/students/student-activity-timeline"
import { StudentDoubtsPanel } from "@/components/students/student-doubts"
import { StudentInvoices } from "@/components/students/student-invoices"
import { StudentPaymentLinks } from "@/components/students/student-payment-links"
import { MessageComposer } from "@/components/messages/message-composer"
import { NudgePreviewDialog, type NudgeKind } from "@/components/dashboard/engagement-nudge-dialog"
import { buildNotifications, type DispatchPayload } from "@/lib/notifications"
import {
  partitionByCooldown,
  markNudged,
  relativeFromNow,
} from "@/lib/nudge-cooldown"
import { useConfirm } from "@/lib/use-confirm"
import { useTenant } from "@/lib/tenant-store"
import { tenantPublicUrl } from "@/lib/tenant-resolver"
import { toast } from "sonner"

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <StudentDetailPageInner params={params} />
    </Suspense>
  )
}

function StudentDetailPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  // Tab state via URL so a refresh — or a deep-link from inbox /
  // doubts / messages — lands on the same tab. Whitelisted; falls
  // back to "overview" on a missing / unknown value.
  const TAB_VALUES = ["overview", "activity", "doubts", "invoices", "payment_links", "messages"] as const
  type StudentTab = (typeof TAB_VALUES)[number]
  const tabFromUrl = (searchParams?.get("tab") ?? "") as StudentTab | ""
  const activeTab: StudentTab = (TAB_VALUES as readonly string[]).includes(tabFromUrl)
    ? (tabFromUrl as StudentTab)
    : "overview"
  const setActiveTab = (next: string) => {
    const params2 = new URLSearchParams(searchParams?.toString() ?? "")
    if (next === "overview") params2.delete("tab")
    else params2.set("tab", next)
    const q = params2.toString()
    router.replace(q ? `${pathname}?${q}` : pathname)
  }

  const {
    getUserById,
    enrollments,
    getCourseById,
    quizAttempts,
    quizzes,
    getMessagesForRecipient,
    getEnrollmentProgress,
    addNotifications,
    currentUser,
  } = useLMS()
  const { currentTenant } = useTenant()
  const confirm = useConfirm()

  const isAdmin = currentUser?.role === "admin"
  const student = getUserById(id)
  // Touch the "recently viewed" log on every detail-page mount so
  // the roster's quick-switch strip reflects the teacher's latest
  // hop. Keyed off the visiting user so two co-teachers don't
  // pollute each other's recents.
  useEffect(() => {
    if (!student) return
    touchRecentStudent(currentUser?.id, student.id)
  }, [student, currentUser?.id])
  const [messageOpen, setMessageOpen] = useState(false)
  // Nudge state — per-student preview dialog. Same dialog the
  // engagement page uses; recipients are locked to this single student.
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [nudgeKind, setNudgeKind] = useState<NudgeKind>("checkin")
  const openNudge = (kind: NudgeKind) => {
    setNudgeKind(kind)
    setNudgeOpen(true)
  }
  const studentHomeUrl = currentTenant
    ? `${tenantPublicUrl(currentTenant.slug)}/my`
    : "/my"
  const fireNudgeConfirmed = async (payload: {
    type: string
    title: string
    body: string
    url: string
    channels: { inApp: boolean; email: boolean; whatsApp: boolean }
  }) => {
    if (!student) return
    // Single-recipient cooldown gate. If we nudged this student
    // recently, ask before stacking another ping on top.
    const kind = payload.type as "checkin" | "comeback"
    const { recent } = partitionByCooldown(kind, [student.id])
    if (recent.length === 1) {
      const labelForKind = kind === "checkin" ? "check-in" : "come-back"
      const stamp = relativeFromNow(recent[0].lastNudgedAt)
      const ok = await confirm({
        title: `Send another ${labelForKind}?`,
        description: `You already sent ${student.name} a ${labelForKind} ${stamp}. Sending again now risks looking like spam.`,
        confirmLabel: "Send anyway",
        cancelLabel: "Don't send",
      })
      if (!ok) {
        setNudgeOpen(false)
        return
      }
    }
    const dispatch: DispatchPayload = {
      type: payload.type,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      meta: { kind: payload.type },
    }
    const channels: ("in-app" | "email" | "whatsapp")[] = []
    if (payload.channels.inApp) channels.push("in-app")
    if (payload.channels.email) channels.push("email")
    if (payload.channels.whatsApp) channels.push("whatsapp")
    const entries = buildNotifications([student], dispatch, { channels })
    addNotifications(entries)
    markNudged(kind, [student.id])
    toast.success(`Sent to ${student.name}.`, {
      description: `Via ${channels.join(" · ") || "no channels"}`,
    })
    setNudgeOpen(false)
  }

  // Derive once instead of three separate `.filter` passes inline in
  // the JSX — same data, but stable identity across renders and one
  // pass over the array instead of three.
  const studentEnrollments = useMemo(
    () => enrollments.filter((e) => e.studentId === id),
    [enrollments, id],
  )
  const studentQuizAttempts = useMemo(
    () => quizAttempts.filter((a) => a.studentId === id),
    [quizAttempts, id],
  )
  // Live progress for each enrollment — recomputed against the
  // course's CURRENT lessons so a curriculum edit reflects here
  // immediately, and a deleted lesson no longer counts toward 100%.
  const liveProgressById = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of studentEnrollments) m.set(e.id, getEnrollmentProgress(e.id))
    return m
  }, [studentEnrollments, getEnrollmentProgress])
  const completedCourses = useMemo(
    () => [...liveProgressById.values()].filter((p) => p === 100).length,
    [liveProgressById],
  )
  const inProgressCourses = useMemo(
    () => [...liveProgressById.values()].filter((p) => p > 0 && p < 100).length,
    [liveProgressById],
  )
  const averageProgress = useMemo(() => {
    const ps = [...liveProgressById.values()]
    return ps.length === 0 ? 0 : Math.round(ps.reduce((a, b) => a + b, 0) / ps.length)
  }, [liveProgressById])
  const averageQuizScore = useMemo(
    () =>
      studentQuizAttempts.length > 0
        ? Math.round(studentQuizAttempts.reduce((acc, a) => acc + a.score, 0) / studentQuizAttempts.length)
        : 0,
    [studentQuizAttempts],
  )

  const messages = student ? getMessagesForRecipient(id) : []
  const certificateEnrollments = studentEnrollments.filter((e) => e.certificateId)

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold">Student not found</h1>
        <BackButton label="Back" fallbackHref="/dashboard/students" className="mt-4" />
      </div>
    )
  }

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
                  {isAdmin ? student.email : maskEmail(student.email)}
                </span>
                {student.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {isAdmin ? student.phone : maskPhone(student.phone)}
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
              {isAdmin && (
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/students/${student.id}/edit`}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit
                  </Link>
                </Button>
              )}
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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview"><UserIcon className="mr-1.5 h-3.5 w-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="activity"><History className="mr-1.5 h-3.5 w-3.5" /> Activity</TabsTrigger>
              <TabsTrigger value="doubts"><MessageCircleQuestion className="mr-1.5 h-3.5 w-3.5" /> Doubts</TabsTrigger>
              <TabsTrigger value="invoices"><Receipt className="mr-1.5 h-3.5 w-3.5" /> Invoices</TabsTrigger>
              <TabsTrigger value="payment_links"><LinkIcon2 className="mr-1.5 h-3.5 w-3.5" /> Links</TabsTrigger>
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

            <TabsContent value="payment_links" className="mt-4">
              <StudentPaymentLinks studentId={Number(student.id)} studentName={student.name} />
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
                        const sender = getUserById(m.senderId)
                        return (
                          <li
                            key={m.id}
                            className="rounded-md border border-border bg-card p-3"
                          >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <p className="min-w-0 truncate font-semibold" title={m.subject}>
                                {m.subject}
                              </p>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {new Date(m.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              From {sender?.name ?? "Instructor"} via {m.channels.join(", ")}
                              {m.attachments && m.attachments.length > 0
                                ? ` · ${m.attachments.length} attachment${m.attachments.length === 1 ? "" : "s"}`
                                : ""}
                            </p>
                            {/* Stripped to plain text — message bodies can carry
                                arbitrary HTML (teacher's rich-text drafts, AI-
                                generated snippets, third-party paste). Rendering
                                raw HTML on this page would let any of that
                                inject script tags or load remote trackers. */}
                            <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-foreground/90">
                              {stripTagsForPreview(m.body)}
                            </p>
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
          {/* Private notes — teacher's working notebook on this
              student. Renders at the top of the sidebar because it's
              the surface the teacher will reach for most often, and
              hiding it below stats / certificates would bury the
              actual workhorse panel. */}
          {/* Tags — shared across teachers, used as roster filters
              and quick visual scanners. Placed above private notes
              because tags are the cheap action; notes is the deep
              one. */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
              <CardDescription>
                Quick labels for filtering and scanning the roster.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentTagsEditor studentId={student.id} studentName={student.name} />
            </CardContent>
          </Card>
          <StudentPrivateNotesPanel
            studentId={student.id}
            studentName={student.name}
            authorId={currentUser?.id}
          />
          <Card>
            <CardHeader>
              <CardTitle>Learning stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row icon={<BookOpen className="h-4 w-4 text-muted-foreground" />} label="Enrolled" value={`${studentEnrollments.length} course${studentEnrollments.length === 1 ? "" : "s"}`} />
              <Row icon={<Award className="h-4 w-4 text-success" />} label="Completed" value={`${completedCourses} course${completedCourses === 1 ? "" : "s"}`} valueClassName="text-success" />
              <Row icon={<TrendingUp className="h-4 w-4 text-accent" />} label="In progress" value={`${inProgressCourses} course${inProgressCourses === 1 ? "" : "s"}`} valueClassName="text-accent" />
              <div className="border-t border-border pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall progress</span>
                  <span className="font-semibold tabular-nums">{averageProgress}%</span>
                </div>
                <Progress value={averageProgress} aria-label={`${averageProgress}% overall progress`} />
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
                    const courseTitle = course?.title ?? "Removed course"
                    return (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between rounded bg-muted/40 p-2"
                      >
                        <span
                          className={`min-w-0 flex-1 truncate text-sm font-medium ${course ? "" : "text-muted-foreground italic"}`}
                          title={courseTitle}
                        >
                          {courseTitle}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          aria-label={`Open certificate for ${courseTitle}`}
                          title={`Open certificate for ${courseTitle}`}
                        >
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

      {/* Per-student nudge bar. Mirrors the persistent nudge CTA on
          the roster + the per-row buttons on the engagement page —
          scoped to JUST this student. Lets the teacher fire a
          check-in / come-back without first switching to the bulk
          engagement table. */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] p-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-bold">Ready to nudge {student.name.split(" ")[0]}?</h2>
            <p className="text-xs text-muted-foreground">
              Preview + send in-app, email, or WhatsApp. They&apos;ll land back on their dashboard.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              variant="outline"
              onClick={() => openNudge("checkin")}
              title="Preview and send a warm check-in"
              className="flex-1 sm:flex-none"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send check-in
            </Button>
            <Button
              onClick={() => openNudge("comeback")}
              title="Preview and send a come-back nudge"
              className="flex-1 sm:flex-none"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send come-back
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <MessageComposer
        open={messageOpen}
        onOpenChange={setMessageOpen}
        recipients={[student]}
      />
      <NudgePreviewDialog
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        kind={nudgeKind}
        recipients={[student]}
        destinationUrl={studentHomeUrl}
        fromName={currentTenant?.name}
        onSend={(p) =>
          fireNudgeConfirmed({
            type: p.type,
            title: p.title,
            body: p.body,
            url: p.url,
            channels: p.channels,
          })
        }
      />
    </div>
  )
}

// Tiny tag stripper used by the Messages tab so we never render
// arbitrary instructor-drafted HTML in this page. Decodes a handful
// of common entities so the preview reads naturally.
function stripTagsForPreview(html: string): string {
  if (!html) return ""
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
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
