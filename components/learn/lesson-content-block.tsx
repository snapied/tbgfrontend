"use client"

// Full inline content render for a lesson — used on the teacher's course
// view page so they can preview every lesson without bouncing between
// edit and student-facing views.
//
// Branches per lesson type:
//   • video / audio / pdf / document / embed → LessonContentPreview
//     (iframes / native players, same component the editor uses inline)
//   • text → RichTextContent (the article body)
//   • quiz → looked-up Quiz card (title, question count, passing score)
//   • live → looked-up LiveSession card (title, time, meeting URL)
//
// Returns a soft "nothing yet" hint when the lesson's content field is
// empty, so an unfinished course visibly tells the teacher where to fill in.

import { Calendar, Clock, ExternalLink, Sparkles } from "lucide-react"
import type { Lesson } from "@/lib/lms-store"
import { useLMS } from "@/lib/lms-store"
import { LessonContentPreview } from "@/components/course-editor/lesson-content-preview"
import { RichTextContent, isRichTextEmpty } from "@/components/editor/rich-text-content"

export function stripRichTextTags(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function LessonContentBlock({ lesson }: { lesson: Lesson }) {
  const { quizzes, liveSessions } = useLMS()

  if (lesson.type === "text") {
    if (isRichTextEmpty(lesson.content)) {
      return <EmptyHint label="No article content yet." />
    }
    return (
      <RichTextContent
        html={lesson.content}
        className="rounded-md border border-border bg-background p-4"
      />
    )
  }

  if (lesson.type === "quiz") {
    const quiz = quizzes.find((q) => q.id === lesson.content)
    if (!quiz) return <EmptyHint label="No quiz attached yet." />
    return (
      <div className="rounded-md border border-border bg-background p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{quiz.title}</p>
            {quiz.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{stripRichTextTags(quiz.description)}</p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              {quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"} ·{" "}
              {quiz.passingScore}% to pass ·{" "}
              {quiz.maxAttempts} {quiz.maxAttempts === 1 ? "attempt" : "attempts"}
              {quiz.timeLimit ? ` · ${quiz.timeLimit} min limit` : ""}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (lesson.type === "live") {
    const session = liveSessions.find((s) => s.id === lesson.content)
    if (!session) return <EmptyHint label="No live session attached yet." />
    const when = new Date(session.scheduledAt)
    return (
      <div className="rounded-md border border-border bg-background p-4">
        <p className="font-medium">{session.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {session.durationMinutes} min
          </span>
          <span className="capitalize">{session.provider.replace("-", " ")}</span>
          {session.status === "cancelled" && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
              Cancelled
            </span>
          )}
        </div>
        {session.meetingUrl && (
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Join link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    )
  }

  // video / audio / pdf / document / embed
  if (!lesson.content) {
    return <EmptyHint label={`No ${lesson.type} content uploaded yet.`} />
  }
  return <LessonContentPreview type={lesson.type} url={lesson.content} />
}

function EmptyHint({ label }: { label: string }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-xs italic text-muted-foreground">
      {label}
    </p>
  )
}
