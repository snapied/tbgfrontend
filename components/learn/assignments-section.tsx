"use client"

import { useMemo, useState } from "react"
import {
  Briefcase,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  generateId,
  useLMS,
  type Assignment,
  type AssignmentKind,
} from "@/lib/lms-store"

interface AssignmentsSectionProps {
  courseId: string
  studentId: string
}

export function AssignmentsSection({ courseId, studentId }: AssignmentsSectionProps) {
  const {
    getAssignmentsForCourse,
    submissions,
    submitAssignment,
  } = useLMS()
  // Course-wide assignments only — lesson- and session-linked follow-ups are
  // rendered inline beside their owning lesson/session, so we hide them here
  // to avoid duplicating the same card.
  const items = useMemo(
    () => getAssignmentsForCourse(courseId)
      .filter(a => !a.lessonId && !a.sessionId)
      .sort((a, b) =>
        (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt),
      ),
    [getAssignmentsForCourse, courseId],
  )

  if (items.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Assignments &amp; Projects
      </h2>
      <div className="space-y-2">
        {items.map((a) => {
          const submission = submissions.find(
            (s) => s.assignmentId === a.id && s.studentId === studentId,
          )
          return (
            <AssignmentRow
              key={a.id}
              assignment={a}
              submission={submission}
              onSubmit={(payload) => {
                submitAssignment({
                  id: generateId("sub"),
                  assignmentId: a.id,
                  studentId,
                  submittedAt: new Date().toISOString(),
                  contentUrl: payload.contentUrl,
                  notes: payload.notes,
                  status: "submitted",
                })
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

function AssignmentRow({
  assignment,
  submission,
  onSubmit,
}: {
  assignment: Assignment
  submission: ReturnType<typeof useLMS>["submissions"][number] | undefined
  onSubmit: (payload: { contentUrl?: string; notes?: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [contentUrl, setContentUrl] = useState(submission?.contentUrl ?? "")
  const [notes, setNotes] = useState(submission?.notes ?? "")

  const isGraded = submission?.status === "graded"
  const isSubmitted = !!submission

  return (
    <div
      id={`assignment-${assignment.id}`}
      className={cn(
        "rounded-lg border bg-card p-4",
        isGraded ? "border-success/30" : isSubmitted ? "border-primary/30" : "border-border",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <KindIcon kind={assignment.kind} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{assignment.title}</p>
              <StatusBadge submission={submission} maxScore={assignment.maxScore} />
            </div>
            <p className="text-xs text-muted-foreground">
              {assignment.dueAt
                ? `Due ${new Date(assignment.dueAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : "No due date"}
              {" · "}
              {assignment.maxScore} pts
            </p>
          </div>
        </div>
        <Button
          variant={isSubmitted && !isGraded ? "outline" : isGraded ? "ghost" : "default"}
          size="sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : isGraded ? "View" : isSubmitted ? "Update" : "Submit"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {assignment.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {assignment.description}
            </p>
          )}

          {isGraded ? (
            <div className="rounded-md border border-success/30 bg-success/5 p-3">
              <p className="text-sm font-semibold">
                Graded — {submission?.score}/{assignment.maxScore}
              </p>
              {submission?.feedback && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{submission.feedback}</p>
              )}
              {submission?.contentUrl && (
                <a
                  href={submission.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Your submission <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`url-${assignment.id}`} className="text-xs">
                  Submission link (Google Drive, Github, file URL…)
                </Label>
                <Input
                  id={`url-${assignment.id}`}
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`notes-${assignment.id}`} className="text-xs">
                  Notes (optional)
                </Label>
                <Textarea
                  id={`notes-${assignment.id}`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything you want Your instructor to know…"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!contentUrl && !notes}
                  onClick={() => {
                    onSubmit({ contentUrl: contentUrl || undefined, notes: notes || undefined })
                    setOpen(false)
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitted ? "Resubmit" : "Submit"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({
  submission,
  maxScore,
}: {
  submission?: { status: "submitted" | "graded"; score?: number }
  maxScore: number
}) {
  if (!submission) {
    return <Badge variant="outline">Not submitted</Badge>
  }
  if (submission.status === "graded") {
    return (
      <Badge className="gap-1 bg-success text-success-foreground">
        <CheckCircle2 className="h-3 w-3" />
        {submission.score}/{maxScore}
      </Badge>
    )
  }
  return <Badge variant="secondary">Submitted</Badge>
}

function KindIcon({ kind }: { kind: AssignmentKind }) {
  const Icon = kind === "project" ? Briefcase : kind === "test" ? FileText : ClipboardList
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-5 w-5" />
    </div>
  )
}
