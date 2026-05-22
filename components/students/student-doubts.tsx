"use client"

// Doubts/Q&A panel for the student detail page. Lists every question
// this student has raised, lets the teacher reply inline, and lets
// either side resolve a thread. Each reply fires an in-app
// notification + email to the other party so threads don't go silent.

import { useState } from "react"
import {
  CheckCircle2,
  CircleDot,
  MessageCircleQuestion,
  Send,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { RichTextContent, isRichTextEmpty, stripRichTextTags } from "@/components/editor/rich-text-content"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiDoubtReply } from "@/lib/ai-client"
import { cn } from "@/lib/utils"
import {
  generateId,
  useLMS,
  type Doubt,
  type DoubtReply,
  type Notification,
} from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"

interface Props {
  studentId: string
}

export function StudentDoubtsPanel({ studentId }: Props) {
  const {
    getDoubtsForStudent,
    replyToDoubt,
    setDoubtStatus,
    deleteDoubt,
    addNotifications,
    currentUser,
    getCourseById,
    getUserById,
  } = useLMS()
  const confirm = useConfirm()
  const doubts = getDoubtsForStudent(studentId)
  const student = getUserById(studentId)

  const onReply = async (doubt: Doubt, body: string) => {
    if (!currentUser) return
    const reply: DoubtReply = {
      id: generateId("dreply"),
      authorId: currentUser.id,
      body,
      createdAt: new Date().toISOString(),
    }
    replyToDoubt(doubt.id, reply)
    // Address for the email. Guest enquiries carry the asker's email
    // on the doubt itself (no User record); enrolled-student doubts
    // resolve through the User lookup. Whichever exists, that's where
    // the reply goes.
    const recipientEmail = doubt.guest?.email ?? student?.email
    const recipientName = doubt.guest?.name ?? student?.name ?? "there"
    // Notify the student in-app — only meaningful when the doubt was
    // filed by a real account. Guest enquiries skip this; the email
    // below is the only channel they receive on.
    if (!doubt.guest && currentUser.id !== doubt.studentId) {
      const notif: Notification = {
        id: generateId("notif"),
        userId: doubt.studentId,
        channel: "in-app",
        type: "doubt.replied",
        title: `New reply on "${doubt.title}"`,
        body: stripTags(body).slice(0, 200),
        url: `/dashboard/doubts`,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        status: "sent",
        meta: { doubtId: doubt.id },
      }
      addNotifications([notif])
    }
    // Best-effort email to the asker (student or guest).
    if (recipientEmail) {
      try {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail,
            subject: `New reply on your question: ${doubt.title}`,
            replyTo: currentUser.email,
            html: `<p>Hi ${escapeHtml(recipientName.split(" ")[0] || recipientName)},</p><p>${escapeHtml(currentUser.name) || "Your instructor"} replied to your question <strong>"${escapeHtml(doubt.title)}"</strong>:</p><blockquote style="border-left:3px solid #d4af37;padding:8px 12px;margin:12px 0;background:#fafaf7">${body}</blockquote>${doubt.guest ? `<p style="color:#666;font-size:14px">You can reply directly to this email to continue the conversation.</p>` : `<p><a href="/dashboard/doubts">Open the conversation →</a></p>`}`,
          }),
        })
      } catch {
        /* fine */
      }
    }
  }

  if (doubts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5" />
            Doubts &amp; questions
          </CardTitle>
          <CardDescription>
            Anything this student asks shows up here. They can post from their lesson player.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No questions yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5" />
          Doubts &amp; questions
        </CardTitle>
        <CardDescription>
          {doubts.length} thread{doubts.length === 1 ? "" : "s"} from this student.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {doubts.map((d) => (
          <DoubtThread
            key={d.id}
            doubt={d}
            courseTitle={d.courseId ? getCourseById(d.courseId)?.title : undefined}
            authorName={getUserById(d.studentId)?.name ?? "Student"}
            getReplierName={(id) => getUserById(id)?.name ?? "Teacher"}
            onReply={(body) => onReply(d, body)}
            onResolve={() => setDoubtStatus(d.id, d.status === "open" ? "resolved" : "open")}
            onDelete={async () => {
              const ok = await confirm({
                title: "Delete this question?",
                description: "All replies are moved to Trash with it — you can restore them within 7 days.",
                destructive: true,
              })
              if (!ok) return
              deleteDoubt(d.id)
              toastUndoableDelete({
                kind: "doubt",
                ids: d.id,
                label: d.title,
                itemNoun: "question",
              })
            }}
          />
        ))}
      </CardContent>
    </Card>
  )
}

export function DoubtThread({
  doubt,
  courseTitle,
  authorName,
  getReplierName,
  onReply,
  onResolve,
  onDelete,
}: {
  doubt: Doubt
  courseTitle?: string
  authorName: string
  getReplierName: (id: string) => string
  onReply: (body: string) => void
  onResolve: () => void
  onDelete: () => void
}) {
  const [body, setBody] = useState("")
  const [open, setOpen] = useState(doubt.status === "open")
  const submit = () => {
    if (isRichTextEmpty(body)) return
    onReply(body)
    setBody("")
  }
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{doubt.title}</p>
            <StatusBadge status={doubt.status} />
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {authorName}
            {courseTitle ? ` · ${courseTitle}` : ""} · {new Date(doubt.createdAt).toLocaleDateString()}
            {doubt.replies.length > 0 && ` · ${doubt.replies.length} replies`}
          </p>
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onResolve}>
            {doubt.status === "open" ? (
              <><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark resolved</>
            ) : (
              <><CircleDot className="mr-1 h-3.5 w-3.5" /> Reopen</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 p-4">
          <RichTextContent html={doubt.body} className="text-sm" />

          {doubt.replies.length > 0 && (
            <div className="space-y-2 border-l-2 border-primary/30 pl-3">
              {doubt.replies.map((r) => (
                <div key={r.id} className="rounded-md bg-muted/40 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {getReplierName(r.authorId)} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                  <RichTextContent html={r.body} className="mt-1 text-sm" />
                </div>
              ))}
            </div>
          )}

          {doubt.status === "open" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-muted-foreground">Your reply</p>
                {/* AI drafter — uses the doubt's title + body
                    as the student's question. Overwrites the
                    current reply draft on click; the teacher
                    edits before sending. */}
                <AIGenerateButton
                  size="xs"
                  label="Draft a reply"
                  onGenerate={async () => {
                    const question = `${doubt.title}\n\n${stripRichTextTags(doubt.body).slice(0, 800)}`
                    const r = await aiDoubtReply({
                      question,
                      context: courseTitle,
                      tone: "detailed",
                    })
                    if ("error" in r) return
                    setBody(r.content)
                  }}
                />
              </div>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Type your reply…"
                minHeight={120}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={submit} disabled={isRichTextEmpty(body)}>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Send reply
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Doubt["status"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        status === "open"
          ? "bg-accent/15 text-accent"
          : "bg-success/15 text-success",
      )}
    >
      {status}
    </span>
  )
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
