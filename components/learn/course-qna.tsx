"use client"

// Public Q&A section for the course detail page.
// Shows resolved doubts (teacher-answered) with question + accepted answer,
// collapsed by default so the page doesn't feel overwhelming.
// Visitors can also submit a new question — it lands in the teacher's inbox.
// Shown after the Reviews card, before "More by this instructor".

import { useState } from "react"
import {
  ChevronDown,
  HelpCircle,
  MessageCircleQuestion,
  Pencil,
  Save,
  Send,
  ThumbsUp,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useLMS, generateId, type Doubt } from "@/lib/lms-store"
import { RichTextContent } from "@/components/editor/rich-text-content"
import { toast } from "sonner"

interface Props {
  courseId: string
  courseTitle: string
  instructorId: string
  instructorName: string
  instructorEmail: string
}

export function CourseQnA({
  courseId,
  courseTitle,
  instructorId,
  instructorName,
  instructorEmail,
}: Props) {
  const { getDoubtsForCourse, getUserById, addDoubt, updateDoubt, currentUser } = useLMS()

  // Only show resolved doubts that have at least one reply (teacher-answered)
  const allDoubts = getDoubtsForCourse(courseId)
  const answeredDoubts = allDoubts.filter(
    (d) => d.status === "resolved" && d.replies.length > 0,
  )

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [question, setQuestion] = useState("")
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const isTeacher = currentUser?.role === "admin" || currentUser?.role === "instructor"

  const handleSubmit = async () => {
    const title = question.trim()
    if (!title) return
    setSubmitting(true)

    // Build the doubt. If there's a logged-in student, file it against their
    // account; otherwise create a guest enquiry so the teacher can reply
    // by email without the asker needing to sign up.
    const now = new Date().toISOString()
    const doubt: Doubt = {
      id: generateId("doubt"),
      courseId,
      studentId: currentUser?.id ?? "guest",
      status: "open",
      title,
      body: `<p>${title}</p>`,
      replies: [],
      createdAt: now,
      updatedAt: now,
      ...(currentUser
        ? {}
        : {
            guest: {
              name: guestName.trim() || "Anonymous",
              email: guestEmail.trim(),
              whatsapp: "",
            },
          }),
    }

    addDoubt(doubt)

    // Best-effort email to the teacher
    try {
      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: instructorEmail,
          subject: `New question on "${courseTitle}"`,
          html: `<p>A student asked a question on your course <strong>${courseTitle}</strong>:</p><blockquote style="border-left:3px solid #d4af37;padding:8px 12px;margin:12px 0">${title}</blockquote>${
            !currentUser && guestEmail
              ? `<p>Reply to: <a href="mailto:${guestEmail}">${guestEmail}</a></p>`
              : ""
          }`,
        }),
      })
    } catch {
      /* fine */
    }

    setQuestion("")
    setGuestName("")
    setGuestEmail("")
    setShowForm(false)
    setSubmitting(false)
    toast.success("Question submitted!", {
      description: `${instructorName} typically replies within 24 hours.`,
    })
  }

  // Don't render the card at all if there are no answered questions AND
  // the ask-a-question form would be the only thing showing.
  // (We do show it for the form alone — that's valuable.)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5" />
              Ask before enrolling
            </CardTitle>
            {/* Sprint B Brand #29 — pre-sale framing. "Ask before
                enrolling" lands harder for visitors than the generic
                "Questions & answers". Sub-line carries the response-
                time promise so a visitor's mental cost-of-asking is
                set correctly. We pull instructorName so the line
                reads as a personal commitment, not a system claim. */}
            <p className="mt-1 text-sm text-muted-foreground">
              {answeredDoubts.length > 0
                ? `${answeredDoubts.length} answered question${answeredDoubts.length === 1 ? "" : "s"} from previous learners. ${instructorName} usually replies within a day.`
                : `Not sure if this course is for you? ${instructorName} usually replies within a day.`}
            </p>
          </div>
          <Button
            size="sm"
            variant={showForm ? "outline" : "default"}
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0"
          >
            {showForm ? "Cancel" : (
              <>
                <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
                Ask a question
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Ask-a-question form */}
        {showForm && (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
            <p className="text-sm font-semibold">Your question</p>
            <Textarea
              placeholder={`Ask ${instructorName} anything about this course…`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {!currentUser && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Your name (optional)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Email to get the reply"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {instructorName} typically replies within 24 hours.
              </p>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!question.trim() || submitting}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>
        )}

        {/* Answered Q&A list */}
        {answeredDoubts.length > 0 && (
          <ul className="space-y-2">
            {answeredDoubts.map((d) => {
              const isOpen = expandedId === d.id
              const askerName =
                d.guest?.name ?? getUserById(d.studentId)?.name ?? "Student"
              // First reply is treated as the accepted answer
              const answer = d.replies[0]
              const answererName = getUserById(answer?.authorId)?.name ?? instructorName

              return (
                <li key={d.id}>
                  <div
                    className={cn(
                      "group/row rounded-xl border border-border transition-colors",
                      isOpen && "border-primary/25 bg-primary/[0.02]",
                    )}
                  >
                    {/* Question row — click to expand. Rendered as a
                        div+role="button" rather than a real <button>
                        because the row needs to host nested controls
                        (edit-title button, inline input when in edit
                        mode) and nested interactive elements inside a
                        real <button> is invalid HTML + triggers a
                        React hydration error. */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={() => setExpandedId(isOpen ? null : d.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setExpandedId(isOpen ? null : d.id)
                        }
                      }}
                      className="flex w-full cursor-pointer items-start gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <ThumbsUp className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {editingId === d.id ? (
                          // Instructor edit mode — inline input
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateDoubt(d.id, { title: editTitle.trim() || d.title })
                                  setEditingId(null)
                                }
                                if (e.key === "Escape") setEditingId(null)
                              }}
                              className="flex-1 rounded-md border border-primary px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateDoubt(d.id, { title: editTitle.trim() || d.title })
                                setEditingId(null)
                              }}
                              className="rounded p-1 text-success hover:bg-success/10"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold leading-snug">
                              {d.title}
                            </p>
                            {isTeacher && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditTitle(d.title)
                                  setEditingId(d.id)
                                }}
                                className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover/row:opacity-100 transition-opacity"
                                title="Edit question title"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Asked by {askerName} ·{" "}
                          {new Date(d.createdAt).toLocaleDateString()} ·{" "}
                          <span className="text-success font-medium">Answered</span>
                          {d.updatedAt !== d.createdAt && (
                            <span className="ml-1 text-muted-foreground/60">(edited)</span>
                          )}
                        </p>
                      </div>
                      {editingId !== d.id && (
                        <ChevronDown
                          className={cn(
                            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            isOpen && "rotate-180",
                          )}
                        />
                      )}
                    </div>

                    {/* Expanded: question body + answer */}
                    {isOpen && (
                      <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                        {/* Full question */}
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                            {askerName} asked
                          </p>
                          <RichTextContent html={d.body} className="text-sm" />
                        </div>

                        {/* Accepted answer */}
                        {answer && (
                          <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                            <div className="mb-1.5 flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                                ✓ Answer
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {answererName} ·{" "}
                                {new Date(answer.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <RichTextContent html={answer.body} className="text-sm" />
                          </div>
                        )}

                        {/* Subsequent replies if any */}
                        {d.replies.length > 1 && (
                          <div className="space-y-2 border-l-2 border-primary/20 pl-3">
                            {d.replies.slice(1).map((r) => (
                              <div key={r.id} className="rounded-md bg-muted/30 p-2.5">
                                <p className="text-[11px] font-semibold text-muted-foreground">
                                  {getUserById(r.authorId)?.name ?? "Instructor"} ·{" "}
                                  {new Date(r.createdAt).toLocaleDateString()}
                                </p>
                                <RichTextContent html={r.body} className="mt-1 text-sm" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Empty state when no answered Qs and form is hidden. Kept
            compact — the previous full-bleed icon + big-message
            empty state visually dominated the card on courses with
            no public Q history yet, making the section look broken.
            Inline one-liner sits below the header instead. */}
        {answeredDoubts.length === 0 && !showForm && (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
            No questions answered publicly yet — yours could be the first.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
