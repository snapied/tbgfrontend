"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Paperclip,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLMS, type Assignment, type AssignmentKind } from "@/lib/lms-store"
import { useTenantBasePath } from "@/lib/tenant-path"

interface LessonFollowUpsProps {
  lessonId: string
  studentId: string
}

/**
 * Renders inline cards for any assignments the teacher posted as a follow-up
 * to the lesson the student is currently viewing. Clicking a card opens the
 * public assignment page where the student can submit.
 */
export function LessonFollowUps({ lessonId, studentId }: LessonFollowUpsProps) {
  const { getAssignmentsForLesson, submissions } = useLMS()
  const items = useMemo(
    () => getAssignmentsForLesson(lessonId).sort(
      (a, b) => (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt),
    ),
    [getAssignmentsForLesson, lessonId],
  )

  if (items.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        After this lesson
      </h2>
      <div className="space-y-2">
        {items.map((a) => {
          const submission = submissions.find(s => s.assignmentId === a.id && s.studentId === studentId)
          return <FollowUpCard key={a.id} assignment={a} submission={submission} />
        })}
      </div>
    </section>
  )
}

function FollowUpCard({
  assignment,
  submission,
}: {
  assignment: Assignment
  submission?: ReturnType<typeof useLMS>["submissions"][number]
}) {
  const { basePath } = useTenantBasePath()
  const Icon = kindIcon(assignment.kind)
  const status = submission?.status === "graded"
    ? "graded"
    : submission?.status === "submitted"
      ? "submitted"
      : "open"
  const resourceCount = assignment.resources?.length ?? 0

  const dueLabel = assignment.dueAt
    ? `Due ${new Date(assignment.dueAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "No due date"

  return (
    <Link
      href={`${basePath}/assignment/${assignment.shareToken ?? assignment.id}`}
      className={cn(
        "block rounded-lg border transition-colors hover:border-primary/40 hover:bg-muted/30",
        status === "graded"
          ? "border-success/30 bg-success/[0.04]"
          : status === "submitted"
            ? "border-primary/30 bg-primary/[0.04]"
            : "border-border bg-card",
      )}
    >
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                status === "graded" ? "bg-success/15 text-success" : "bg-accent/15 text-accent",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{assignment.title}</p>
                <StatusBadge
                  status={status}
                  score={submission?.score}
                  maxScore={assignment.maxScore}
                />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <Clock className="mr-1 inline h-3 w-3" />
                {dueLabel}
                {" · "}
                {assignment.maxScore} pts
                {resourceCount > 0 && (
                  <>
                    {" · "}
                    <Paperclip className="mr-0.5 inline h-3 w-3" />
                    {resourceCount} resource{resourceCount === 1 ? "" : "s"}
                  </>
                )}
              </p>
              {assignment.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {assignment.description}
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function StatusBadge({
  status,
  score,
  maxScore,
}: {
  status: "open" | "submitted" | "graded"
  score?: number
  maxScore: number
}) {
  if (status === "graded") {
    return (
      <Badge className="gap-1 bg-success text-success-foreground">
        <CheckCircle2 className="h-3 w-3" />
        {score}/{maxScore}
      </Badge>
    )
  }
  if (status === "submitted") {
    return <Badge variant="secondary">Submitted</Badge>
  }
  return <Badge variant="outline">Open</Badge>
}

function kindIcon(kind: AssignmentKind) {
  if (kind === "project") return Briefcase
  if (kind === "test") return FileText
  return ClipboardList
}
