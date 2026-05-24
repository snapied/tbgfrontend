"use client"

// Single-doubt thread page. Renders the same DoubtThread the student
// detail page uses, but works for guest enquiries (no User record) by
// resolving asker info from doubt.guest. The dashboard inbox routes
// guest enquiries here; enrolled-student doubts still go through
// /dashboard/students/[id] where the full history lives.

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DoubtThread } from "@/components/students/student-doubts"
import {
  generateId,
  useLMS,
  type DoubtReply,
  type Notification,
} from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { sendAndLog } from "@/lib/email-client"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim()
}

export default function DoubtThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const confirm = useConfirm()
  const {
    doubts,
    replyToDoubt,
    setDoubtStatus,
    deleteDoubt,
    addNotifications,
    logSentEmail,
    currentUser,
    getCourseById,
    getUserById,
  } = useLMS()

  const doubt = doubts.find((d) => d.id === id)
  if (!doubt) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Question not found</h1>
        <p className="text-sm text-muted-foreground">
          It may have been deleted or moved to trash.
        </p>
        <Button asChild>
          <Link href="/dashboard/doubts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to inbox
          </Link>
        </Button>
      </div>
    )
  }

  const course = doubt.courseId ? getCourseById(doubt.courseId) : undefined
  const askerName = doubt.guest?.name ?? getUserById(doubt.studentId)?.name ?? "Student"
  const askerEmail = doubt.guest?.email ?? getUserById(doubt.studentId)?.email
  // Same reply logic as student-doubts.tsx, but inlined here so this
  // page works standalone for guest enquiries. Sends an email to the
  // captured guest address; skips the in-app notification because
  // guests don't have a User record to receive it.
  const onReply = async (body: string) => {
    if (!currentUser) return
    const reply: DoubtReply = {
      id: generateId("dreply"),
      authorId: currentUser.id,
      body,
      createdAt: new Date().toISOString(),
    }
    replyToDoubt(doubt.id, reply)
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
    if (askerEmail) {
      // sendAndLog records this in the workspace's outbound email log
      // so the Inbox's "Sent" view shows the teacher exactly what
      // went out, to whom, and when. Replaces the bare fetch call.
      await sendAndLog(
        {
          to: askerEmail,
          subject: `New reply on your question: ${doubt.title}`,
          replyTo: currentUser.email,
          html: `<p>Hi ${escapeHtml(askerName.split(" ")[0] || askerName)},</p><p>${escapeHtml(currentUser.name) || "Your instructor"} replied to your question <strong>"${escapeHtml(doubt.title)}"</strong>:</p><blockquote style="border-left:3px solid #d4af37;padding:8px 12px;margin:12px 0;background:#fafaf7">${body}</blockquote>${doubt.guest ? `<p style="color:#666;font-size:14px">You can reply directly to this email to continue the conversation.</p>` : ""}`,
        },
        {
          kind: "doubt-reply",
          fromName: currentUser.name,
          contextUrl: `/dashboard/doubts/${doubt.id}`,
        },
        logSentEmail,
      )
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/doubts">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Inbox
        </Link>
      </Button>

      {doubt.guest && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-semibold">{doubt.guest.name}</p>
              <p className="text-xs text-muted-foreground">
                Pre-sale enquiry · <a className="hover:underline" href={`mailto:${doubt.guest.email}`}>{doubt.guest.email}</a>
                {course ? ` · about ${course.title}` : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`mailto:${doubt.guest.email}?subject=${encodeURIComponent(`Re: ${doubt.title}`)}`}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Reply by email
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <DoubtThread
        doubt={doubt}
        courseTitle={course?.title}
        authorName={askerName}
        getReplierName={(uid) => getUserById(uid)?.name ?? "Instructor"}
        onReply={onReply}
        onResolve={() => setDoubtStatus(doubt.id, doubt.status === "open" ? "resolved" : "open")}
        onDelete={async () => {
          const ok = await confirm({
            title: `Delete this question?`,
            description: `From ${askerName}: "${doubt.title}". The thread and every reply are removed. This can't be undone — resolve the doubt instead if you just want it off the active list.`,
            destructive: true,
            confirmLabel: "Delete doubt",
          })
          if (!ok) return
          const snapshot = { id: doubt.id, title: doubt.title }
          deleteDoubt(doubt.id)
          toastUndoableDelete({
            kind: "doubt",
            ids: snapshot.id,
            label: snapshot.title,
            itemNoun: "question",
          })
          router.push("/dashboard/doubts")
        }}
      />
    </div>
  )
}
