"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Eye,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Pencil,
  Save,
  Send,
  Share2,
  Trash2,
  Users,
  Video as VideoIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextContent, isRichTextEmpty } from "@/components/editor/rich-text-content"
import { cn } from "@/lib/utils"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import {
  useLMS,
  type AssignmentKind,
  type AssignmentResource,
  type AssignmentSubmission,
} from "@/lib/lms-store"
import {
  assignmentGradedAnnouncement,
  buildNotifications,
} from "@/lib/notifications"
import { AssignmentShareDialog } from "@/components/assignments/assignment-share-dialog"

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const {
    getAssignmentById,
    getSubmissionsForAssignment,
    getCourseById,
    enrollments,
    users,
    currentUser,
    gradeSubmission,
    deleteAssignment,
    addNotifications,
    getViewsForAssignment,
    getLiveSessionById,
    courses,
    notifications,
  } = useLMS()

  const assignment = getAssignmentById(id)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  const roster = useMemo(() => {
    if (!assignment) return []
    const subs = getSubmissionsForAssignment(assignment.id)
    const enrolled = enrollments.filter((e) => e.courseId === assignment.courseId)
    return enrolled
      .map((e) => {
        const student = users.find((u) => u.id === e.studentId)
        const submission = subs.find((s) => s.studentId === e.studentId)
        return { student, submission }
      })
      .filter((row): row is { student: NonNullable<typeof row.student>; submission: AssignmentSubmission | undefined } => !!row.student)
  }, [assignment, getSubmissionsForAssignment, enrollments, users])

  const selectedSubmission =
    roster.find((r) => r.submission?.id === selectedSubmissionId)?.submission ??
    roster.find((r) => r.submission && r.submission.status !== "graded")?.submission ??
    roster.find((r) => r.submission)?.submission

  if (!assignment) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Not found</h2>
          <Button asChild className="mt-4">
            <Link href="/dashboard/assignments">Back</Link>
          </Button>
        </div>
      </div>
    )
  }

  const course = getCourseById(assignment.courseId)
  const totalEnrolled = roster.length
  const submittedCount = roster.filter((r) => !!r.submission).length
  const gradedCount = roster.filter((r) => r.submission?.status === "graded").length
  const pendingCount = submittedCount - gradedCount
  const gradedSubs = roster.filter((r) => r.submission?.status === "graded" && typeof r.submission?.score === "number")
  // Average percentage only makes sense when maxScore > 0. Ungraded
  // assignments (maxScore === 0) leave avgPct at 0 — the UI hides
  // the average tile in that case rather than rendering "NaN%".
  const avgPct =
    gradedSubs.length > 0 && assignment.maxScore > 0
      ? Math.round(
          gradedSubs.reduce(
            (acc, r) => acc + ((r.submission?.score ?? 0) / assignment.maxScore) * 100,
            0,
          ) / gradedSubs.length,
        )
      : 0

  const confirm = useConfirm()
  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete "${assignment.title}"?`,
      description: "The assignment and its submissions go to Trash — you can restore them within 7 days.",
      destructive: true,
    })
    if (!ok) return
    const snapshot = { id: assignment.id, title: assignment.title }
    deleteAssignment(assignment.id)
    toastUndoableDelete({
      kind: "assignment",
      ids: snapshot.id,
      label: snapshot.title,
      itemNoun: "assignment",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/assignments">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{assignment.title}</h1>
            <p className="text-sm text-muted-foreground">
              {course?.title ?? "—"} ·{" "}
              {assignment.maxScore > 0
                ? `${assignment.maxScore} pts`
                : "Ungraded"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <KindBadge kind={assignment.kind} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/assignment/${assignment.shareToken ?? assignment.id}`} target="_blank">
              <Eye className="mr-1.5 h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-1.5 h-4 w-4" />
            Share
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* "Tied to" — surface the lesson / session this follow-up belongs to */}
      <TiedToCard
        lessonInfo={
          assignment.lessonId
            ? (() => {
                const c = courses.find(cc => cc.modules.some(m => m.lessons.some(l => l.id === assignment.lessonId)))
                const lesson = c?.modules
                  .flatMap(m => m.lessons)
                  .find(l => l.id === assignment.lessonId)
                return lesson && c ? { lessonTitle: lesson.title, courseSlug: c.slug } : null
              })()
            : null
        }
        sessionInfo={
          assignment.sessionId
            ? (() => {
                const session = getLiveSessionById(assignment.sessionId)
                return session ? { title: session.title, id: session.id } : null
              })()
            : null
        }
      />

      {/* Tracking + Distribution */}
      <TrackingPanel
        enrolledCount={totalEnrolled}
        viewedIds={new Set(getViewsForAssignment(assignment.id).map(v => v.studentId))}
        submittedIds={new Set(roster.filter(r => r.submission).map(r => r.student.id))}
        gradedIds={new Set(roster.filter(r => r.submission?.status === "graded").map(r => r.student.id))}
        notifications={notifications.filter(n => n.meta?.assignmentId === assignment.id)}
      />

      {assignment.description && !isRichTextEmpty(assignment.description) && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Instructions
            </p>
            {/* Auto-detect: legacy assignments stored plain text;
                new ones stored Tiptap HTML. If the value starts with
                a tag we render via RichTextContent, otherwise fall
                back to the whitespace-preserved plain-text path. */}
            {/^\s*<[a-z]/i.test(assignment.description) ? (
              <RichTextContent html={assignment.description} className="mt-1 text-sm" />
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {assignment.description}
              </p>
            )}
            {assignment.dueAt && (
              <p className="mt-3 text-xs text-muted-foreground">
                Due {new Date(assignment.dueAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(assignment.resources?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resources shared with students</CardTitle>
            <CardDescription>
              {assignment.resources!.length} item{assignment.resources!.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignment.resources!.map(r => (
              <ResourceRowAdmin key={r.id} resource={r} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Roster */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Roster</CardTitle>
            <CardDescription>
              {gradedCount}/{submittedCount} graded · {pendingCount} pending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 px-2 pb-3">
            {roster.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No one is enrolled yet.
              </p>
            ) : (
              roster.map(({ student, submission }) => {
                const isSelected = selectedSubmission?.id === submission?.id
                return (
                  <div
                    key={student.id}
                    role={submission ? "button" : undefined}
                    tabIndex={submission ? 0 : -1}
                    onClick={() => submission && setSelectedSubmissionId(submission.id)}
                    onKeyDown={(e) => {
                      if (!submission) return
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelectedSubmissionId(submission.id)
                      }
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      submission ? "cursor-pointer" : "cursor-default opacity-60",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/students/${student.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate font-medium hover:text-primary hover:underline"
                      >
                        {student.name}
                      </Link>
                      {submission ? (
                        <p className="text-xs text-muted-foreground">
                          Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not submitted</p>
                      )}
                    </div>
                    {submission && (
                      <div className="shrink-0 text-right">
                        {submission.status === "graded" ? (
                          assignment.maxScore > 0 ? (
                            <span className="text-sm font-semibold tabular-nums">
                              {submission.score}/{assignment.maxScore}
                            </span>
                          ) : (
                            <Badge className="bg-success/15 text-success">Reviewed</Badge>
                          )
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Grading panel */}
        <div className="min-w-0">
          {selectedSubmission ? (
            <GradingPanel
              key={selectedSubmission.id}
              assignment={assignment}
              submission={selectedSubmission}
              studentName={users.find((u) => u.id === selectedSubmission.studentId)?.name ?? selectedSubmission.studentId}
              onGrade={(s) => {
                gradeSubmission(selectedSubmission.id, {
                  score: s.score,
                  feedback: s.feedback,
                  gradedBy: currentUser?.id,
                })
                // Notify the student that their work was graded.
                const student = users.find((u) => u.id === selectedSubmission.studentId)
                if (student) {
                  const payload = assignmentGradedAnnouncement({
                    assignmentTitle: assignment.title,
                    score: s.score,
                    maxScore: assignment.maxScore,
                    assignmentId: assignment.id,
                  })
                  if (course) payload.url = `/learn/${course.slug}#assignment-${assignment.id}`
                  addNotifications(buildNotifications([student], payload))
                }
              }}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-medium">No submission selected</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a student from the roster to grade their work.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AssignmentShareDialog
        assignment={assignment}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  )
}

function TiedToCard({
  lessonInfo,
  sessionInfo,
}: {
  lessonInfo: { lessonTitle: string; courseSlug: string } | null
  sessionInfo: { title: string; id: string } | null
}) {
  if (!lessonInfo && !sessionInfo) return null
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs">
      {lessonInfo && (
        <span className="inline-flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Follow-up to lesson:</span>
          <Link
            href={`/learn/${lessonInfo.courseSlug}`}
            className="font-medium text-foreground hover:underline"
          >
            {lessonInfo.lessonTitle}
          </Link>
        </span>
      )}
      {sessionInfo && (
        <span className="inline-flex items-center gap-1.5">
          <VideoIcon className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Follow-up to live class:</span>
          <Link
            href={`/dashboard/classes/${sessionInfo.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {sessionInfo.title}
          </Link>
        </span>
      )}
    </div>
  )
}

function TrackingPanel({
  enrolledCount,
  viewedIds,
  submittedIds,
  gradedIds,
  notifications,
}: {
  enrolledCount: number
  viewedIds: Set<string>
  submittedIds: Set<string>
  gradedIds: Set<string>
  notifications: ReturnType<typeof useLMS>["notifications"]
}) {
  // Per-channel reach (counts the unique recipients we attempted to notify).
  const sentByChannel = {
    "in-app":   new Set(notifications.filter(n => n.channel === "in-app").map(n => n.userId)).size,
    "email":    new Set(notifications.filter(n => n.channel === "email").map(n => n.userId)).size,
    "whatsapp": new Set(notifications.filter(n => n.channel === "whatsapp").map(n => n.userId)).size,
  }
  const pct = (n: number) => enrolledCount > 0 ? Math.round((n / enrolledCount) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Distribution &amp; tracking</CardTitle>
        <CardDescription>
          Who got the link, who opened it, who submitted, who&apos;s graded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Funnel */}
        <div className="grid gap-2 sm:grid-cols-4">
          <FunnelTile
            icon={<Send className="h-3.5 w-3.5" />}
            label="Notified"
            value={Math.max(sentByChannel["in-app"], sentByChannel.email, sentByChannel.whatsapp)}
            total={enrolledCount}
            tone="muted"
          />
          <FunnelTile
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Opened"
            value={viewedIds.size}
            total={enrolledCount}
            tone="accent"
          />
          <FunnelTile
            icon={<ClipboardList className="h-3.5 w-3.5" />}
            label="Submitted"
            value={submittedIds.size}
            total={enrolledCount}
            tone="primary"
          />
          <FunnelTile
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Graded"
            value={gradedIds.size}
            total={enrolledCount}
            tone="success"
          />
        </div>

        {/* Per-channel breakdown */}
        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Delivery by channel
          </p>
          <ChannelLine
            icon={<ClipboardList className="h-3.5 w-3.5" />}
            label="In-app"
            count={sentByChannel["in-app"]}
            total={enrolledCount}
          />
          <ChannelLine
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Email"
            count={sentByChannel.email}
            total={enrolledCount}
            stub
          />
          <ChannelLine
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="WhatsApp"
            count={sentByChannel.whatsapp}
            total={enrolledCount}
            stub
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Open rate: <span className="font-semibold text-foreground">{pct(viewedIds.size)}%</span> ·
          Submission rate: <span className="font-semibold text-foreground">{pct(submittedIds.size)}%</span>
        </p>
      </CardContent>
    </Card>
  )
}

function FunnelTile({
  icon,
  label,
  value,
  total,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  total: number
  tone: "muted" | "accent" | "primary" | "success"
}) {
  const colorMap = {
    muted: "bg-muted text-muted-foreground",
    accent: "bg-accent/15 text-accent",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
  } as const
  return (
    <div className="rounded-md border border-border/60 bg-background p-3">
      <div className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium", colorMap[tone])}>
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-lg font-bold tabular-nums">
        {value}<span className="text-xs font-normal text-muted-foreground">/{total}</span>
      </p>
    </div>
  )
}

function ChannelLine({
  icon,
  label,
  count,
  total,
  stub,
}: {
  icon: React.ReactNode
  label: string
  count: number
  total: number
  stub?: boolean
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-primary">{icon}</span>
          {label}
          {stub && <span className="text-[10px] text-muted-foreground">(stub)</span>}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {count}/{total}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ResourceRowAdmin({ resource }: { resource: AssignmentResource }) {
  if (resource.type === "note") {
    return (
      <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{resource.label}</p>
        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{resource.note}</p>
      </div>
    )
  }
  const TypeIcon = resource.type === "file" ? FileText : resource.type === "video" ? VideoIcon : ExternalLink
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-sm hover:bg-muted/30"
    >
      <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">{resource.label}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{resource.type}</span>
    </a>
  )
}

function GradingPanel({
  assignment,
  submission,
  studentName,
  onGrade,
}: {
  assignment: { maxScore: number; title: string }
  submission: AssignmentSubmission
  studentName: string
  onGrade: (s: { score: number; feedback?: string }) => void
}) {
  const [score, setScore] = useState<string>(submission.score?.toString() ?? "")
  const [feedback, setFeedback] = useState(submission.feedback ?? "")
  const [saving, setSaving] = useState(false)

  const numericScore = parseFloat(score)
  // Ungraded assignments (maxScore === 0) — the teacher just marks
  // "received & reviewed" via feedback. We treat any submitted state
  // as valid in that case so the Save button isn't disabled forever.
  const ungraded = assignment.maxScore <= 0
  const valid = ungraded
    ? true
    : !Number.isNaN(numericScore) && numericScore >= 0 && numericScore <= assignment.maxScore

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{studentName}</CardTitle>
            <CardDescription>
              Submitted {new Date(submission.submittedAt).toLocaleString()}
              {submission.status === "graded" && submission.gradedAt && (
                <> · graded {new Date(submission.gradedAt).toLocaleString()}</>
              )}
            </CardDescription>
          </div>
          {submission.status === "graded" ? (
            <Badge className="gap-1 bg-success text-success-foreground">Graded</Badge>
          ) : (
            <Badge variant="secondary">Pending</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {submission.contentUrl ? (
          <div className="rounded-md border border-border/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Submission link
            </p>
            <a
              href={submission.contentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {submission.contentUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}

        {submission.notes && (
          <div className="rounded-md border border-border/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{submission.notes}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          {/* Score input is hidden entirely on ungraded assignments —
              the teacher only writes feedback to acknowledge the
              submission. Keeping the column reserved would render an
              awkward "/ 0" stub. */}
          {!ungraded ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Score</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={assignment.maxScore}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className={cn(!valid && score && "border-destructive")}
                />
                <span className="text-sm text-muted-foreground tabular-nums">/ {assignment.maxScore}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Score</label>
              <p className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                Ungraded — feedback only.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Feedback</label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder="What worked, what to improve…"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            disabled={!valid || saving}
            onClick={async () => {
              setSaving(true)
              // Ungraded assignments — pass 0 so the submission still
              // flips to "graded" state but the score is a no-op.
              // Readers branch on `assignment.maxScore > 0` before
              // rendering a "/<n>" suffix, so 0 reads as "ungraded".
              onGrade({
                score: ungraded ? 0 : numericScore,
                feedback: feedback || undefined,
              })
              setTimeout(() => setSaving(false), 300)
            }}
          >
            {submission.status === "graded" ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update grade
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Publish grade
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatTile({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              highlight ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary",
            )}
          >
            <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function KindBadge({ kind }: { kind: AssignmentKind }) {
  const icon = kind === "project" ? <Briefcase className="h-3 w-3" /> : kind === "test" ? <FileText className="h-3 w-3" /> : <ClipboardList className="h-3 w-3" />
  return <Badge variant="secondary" className="gap-1 capitalize">{icon}{kind}</Badge>
}
