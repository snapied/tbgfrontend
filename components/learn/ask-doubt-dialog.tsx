"use client"

// Student-facing "Ask a question" widget. Mounted in the lesson
// player so students can drop a question without leaving the lesson.
// On submit it writes a Doubt to lms-store and fires in-app +
// (best-effort) email notifications to the workspace owner / admins
// so the teacher sees it immediately.
//
// Guest path: when there's no signed-in student (e.g. a visitor
// reaching the lesson via a free-preview deep link), the dialog
// collects name + email + WhatsApp number before letting them
// submit. The question lands in the same dashboard inbox marked as
// a guest enquiry; the teacher's reply emails the captured address.
//
// Rate limit: 3 questions per 24 h per browser per course (shared
// helper at lib/enquiry-rate-limit). Once the budget is burned the
// dialog shows a countdown and disables Submit until the oldest
// entry ages out — no teacher action needed.

import { useEffect, useMemo, useState } from "react"
import { MessageCircleQuestion, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { isRichTextEmpty } from "@/components/editor/rich-text-content"
import { PhoneInput } from "@/components/forms/phone-input"
import { cn } from "@/lib/utils"
import {
  generateId,
  useLMS,
  type Doubt,
  type Notification,
} from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import {
  ENQUIRY_MAX_PER_DAY,
  ENQUIRY_WINDOW_MS,
  formatUnlock,
  pushRate,
  readRate,
} from "@/lib/enquiry-rate-limit"

interface Props {
  courseId?: string
  lessonId?: string
  defaultTitle?: string
  // Visual variant — "button" renders a regular Button; "inline" a
  // compact "Got a question?" pill suitable for embedding under
  // lesson content.
  variant?: "button" | "inline"
}

export function AskDoubtDialog({
  courseId,
  lessonId,
  defaultTitle = "",
  variant = "button",
}: Props) {
  const { currentUser, addDoubt, addNotifications, users } = useLMS()
  const { currentTenant } = useTenant()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(defaultTitle)
  const [body, setBody] = useState("")
  // Guest fields — only required when there's no currentUser.
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [guestPhoneValid, setGuestPhoneValid] = useState(false)
  const [sent, setSent] = useState(false)
  // Once-a-minute tick so the lock countdown stays accurate while
  // the dialog sits open across the 24h boundary.
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Rate-limit key. For logged-in students we key by user id so a
  // shared browser still gates per-account; for guests we key by
  // browser only (the email is what they typed, easily changed —
  // not a meaningful identity to rate-limit on).
  const rateKey = useMemo(() => {
    const scope = currentUser?.id ?? "guest"
    return `doubt:${scope}:${courseId ?? "any"}`
  }, [currentUser?.id, courseId])
  const rate = useMemo(
    () => readRate(rateKey, ENQUIRY_MAX_PER_DAY, ENQUIRY_WINDOW_MS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rateKey, open],
  )
  const rateLocked = rate.left === 0

  const reset = () => {
    setTitle(defaultTitle)
    setBody("")
    setGuestName("")
    setGuestEmail("")
    setGuestPhone("")
    setGuestPhoneValid(false)
    setSent(false)
  }

  const emailValid = !guestEmail || /^[^@]+@[^@]+\.[^@]+$/.test(guestEmail)
  const guestFieldsValid =
    !!currentUser ||
    (!!guestName.trim() && !!guestEmail.trim() && emailValid && guestPhoneValid)
  const canSubmit =
    !rateLocked && !!title.trim() && !isRichTextEmpty(body) && guestFieldsValid

  const submit = () => {
    if (!canSubmit) return
    const now = new Date().toISOString()

    // Identity for the doubt + downstream notifications.
    const isGuest = !currentUser
    const askerId = currentUser?.id ?? `guest-${Math.random().toString(36).slice(2, 10)}`
    const askerName = currentUser?.name ?? guestName.trim()
    const askerEmail = currentUser?.email ?? guestEmail.trim()

    const doubt: Doubt = {
      id: generateId("doubt"),
      studentId: askerId,
      courseId,
      lessonId,
      title: title.trim(),
      body,
      replies: [],
      status: "open",
      createdAt: now,
      updatedAt: now,
      ...(isGuest
        ? { guest: { name: askerName, email: askerEmail } }
        : {}),
    }
    addDoubt(doubt)

    // Notify the workspace owner + every admin so the question doesn't
    // sit in the inbox unread. Falls back to all instructors when no
    // admins exist.
    const ownerEmail = currentTenant?.ownerEmail?.toLowerCase()
    const recipients = users.filter((u) => {
      if (ownerEmail && u.email.toLowerCase() === ownerEmail) return true
      return u.role === "admin"
    })
    const finalRecipients =
      recipients.length > 0 ? recipients : users.filter((u) => u.role === "instructor")
    if (finalRecipients.length > 0) {
      const notifs: Notification[] = []
      for (const u of finalRecipients) {
        notifs.push({
          id: generateId("notif"),
          userId: u.id,
          channel: "in-app",
          type: "doubt.received",
          title: `${askerName} asked: ${doubt.title}`,
          body: stripTags(doubt.body).slice(0, 200),
          url: "/dashboard/doubts",
          createdAt: now,
          sentAt: now,
          status: "sent",
          meta: { doubtId: doubt.id, courseId, lessonId, guest: isGuest },
        })
        // WhatsApp goes through the existing notifications stub —
        // logs the payload to the dev console until a real provider
        // is wired in.
        if (u.phone) {
          notifs.push({
            id: generateId("notif"),
            userId: u.id,
            channel: "whatsapp",
            type: "doubt.received",
            title: `${askerName} asked about your course`,
            body: doubt.title,
            url: "/dashboard/doubts",
            createdAt: now,
            status: "queued",
            meta: { doubtId: doubt.id },
          })
        }
      }
      addNotifications(notifs)
    }

    // Email the workspace owner — best-effort. Reply-to is set so a
    // teacher can reply straight from their inbox.
    if (currentTenant?.ownerEmail) {
      const guestLine = isGuest
        ? `<p style="color:#666;font-size:13px">WhatsApp: ${escapeHtml(guestPhone)}</p>`
        : ""
      fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: currentTenant.ownerEmail,
          subject: `New question from ${askerName}: ${doubt.title}`,
          replyTo: askerEmail,
          html: `<p><strong>${escapeHtml(askerName)}</strong> (${escapeHtml(askerEmail)}) asked:</p>${guestLine}<blockquote style="border-left:3px solid #d4af37;padding:8px 12px;margin:12px 0;background:#fafaf7">${doubt.body}</blockquote><p><a href="/dashboard/doubts">Open in dashboard →</a></p>`,
        }),
      }).catch(() => {})
    }

    pushRate(rateKey, ENQUIRY_MAX_PER_DAY, ENQUIRY_WINDOW_MS)
    setSent(true)
    setTimeout(() => {
      setOpen(false)
      reset()
    }, 1500)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        setOpen(o)
      }}
    >
      <DialogTrigger asChild>
        {variant === "inline" ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-4 py-2 text-sm font-medium transition hover:bg-accent/20"
          >
            <MessageCircleQuestion className="h-4 w-4" />
            Got a question? Ask the teacher
          </button>
        ) : (
          <Button variant="outline" size="sm">
            <MessageCircleQuestion className="mr-1.5 h-4 w-4" />
            Ask a question
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask the teacher</DialogTitle>
          <DialogDescription>
            {currentUser
              ? "Your question goes to the teacher and shows up under your account. They'll reply here and you'll get a notification when they do."
              : "Tell us who you are so the teacher can get back to you. Your question goes straight to their dashboard."}
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="rounded-md border border-success/40 bg-success/5 p-4 text-center text-sm text-success">
            ✓ Question sent. The teacher will be notified.
          </div>
        ) : (
          <>
            <div className="space-y-3 pt-2">
              {/* Guest contact block — only when the visitor isn't
                  logged in. All three fields required so the teacher
                  always has a way to reply (email primary, WhatsApp
                  secondary). */}
              {!currentUser && (
                <div className="grid gap-3 rounded-md border border-accent/30 bg-accent/5 p-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ad-name">Your name *</Label>
                    <Input
                      id="ad-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ad-email">Email *</Label>
                    <Input
                      id="ad-email"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value.toLowerCase())}
                      placeholder="you@example.com"
                    />
                    {guestEmail && !emailValid && (
                      <p className="text-xs text-destructive">That doesn&apos;t look like a valid email.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp number *</Label>
                    <PhoneInput
                      value={guestPhone}
                      onChange={(e164, valid) => {
                        setGuestPhone(e164)
                        setGuestPhoneValid(valid)
                      }}
                      required
                      whatsapp
                      placeholder="98765 43210"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="One-line summary of your question"
                />
              </div>
              <div className="space-y-2">
                <Label>Question *</Label>
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  placeholder="Be specific — what did you try, where you got stuck, the bit you don't understand."
                  minHeight={160}
                />
              </div>
              <p
                className={cn(
                  "text-xs",
                  rateLocked ? "font-medium text-destructive" : "text-muted-foreground",
                )}
              >
                {rateLocked && rate.unlocksAt ? (
                  <>
                    You&apos;ve sent {ENQUIRY_MAX_PER_DAY} questions in the last 24 hours.
                    You can send another in <span className="font-semibold">{formatUnlock(rate.unlocksAt)}</span>.
                  </>
                ) : (
                  <>
                    {rate.left} of {ENQUIRY_MAX_PER_DAY} questions left in the next 24 h.
                  </>
                )}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!canSubmit}>
                <Send className="mr-1.5 h-4 w-4" />
                Send to teacher
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
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
