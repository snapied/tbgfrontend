"use client"

// Pre-sale enquiry composer. Surfaces on public course pages so a
// visitor who isn't enrolled yet can still ask the teacher a question
// without leaving the page. Where AskDoubtDialog assumes a current
// student account, this one captures guest name + email so the
// teacher knows who to reply to.
//
// What happens on submit:
//   1. Persist as a guest-flagged Doubt so it lands in the same
//      dashboard inbox the teacher already knows. Guest enquiries
//      show a "guest" badge there so support work and pre-sale leads
//      stay distinguishable inside one queue.
//   2. Fan out an in-app notification to the workspace owner and any
//      admins so they see it the moment they open the dashboard.
//   3. Best-effort email to the workspace owner (via /api/email/send
//      → ZeptoMail) with a reply-to set to the guest's email so the
//      teacher can reply straight from their inbox if they want.
//   4. Best-effort WhatsApp through the existing notifications stub.
//      Logs the payload to the dev console for now — the transport
//      itself ships once a WhatsApp Business provider is wired.
//
// Rate limit: 3 enquiries per 24h per browser per course. Stored in
// localStorage as a rolling window of ISO timestamps (same shape as
// the review-edit limiter). When the budget is burned, the dialog
// shows a countdown and disables Submit until the oldest entry ages
// out — no support ticket needed.

import { useEffect, useMemo, useState } from "react"
import { Mail, MessageCircleQuestion, Send } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
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
  courseId: string
  courseTitle: string
  instructor: {
    id?: string
    name: string
    email?: string
  }
  // Visual variant for the trigger button:
  //   • "prominent" — the big top-of-hero CTA
  //   • "ghost"     — a quieter secondary entry beside other actions
  variant?: "prominent" | "ghost"
}

// Strip HTML tags from a Tiptap body for plain-text fallback +
// notification previews. Lightweight — no parser, just regex.
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Rate-limit helpers + cap constants are imported from
// lib/enquiry-rate-limit so this dialog and AskDoubtDialog share a
// single window across the browser.

export function EmailTeacherDialog({
  courseId,
  courseTitle,
  instructor,
  variant = "prominent",
}: Props) {
  const { addDoubt, addNotifications, users } = useLMS()
  const { currentTenant } = useTenant()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneValid, setPhoneValid] = useState(false)
  const [subject, setSubject] = useState(`Question about "${courseTitle}"`)
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Re-tick once a minute so the countdown stays accurate while the
  // dialog sits open across the boundary.
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const rateKey = `enquiry:${courseId}`
  const rate = useMemo(
    () => readRate(rateKey, ENQUIRY_MAX_PER_DAY, ENQUIRY_WINDOW_MS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rateKey, open],
  )
  const locked = rate.left === 0

  const reset = () => {
    setName("")
    setEmail("")
    setPhone("")
    setPhoneValid(false)
    setSubject(`Question about "${courseTitle}"`)
    setMessage("")
    setSent(false)
    setSubmitting(false)
  }

  const submit = () => {
    if (
      submitting ||
      locked ||
      !name.trim() ||
      !email.trim() ||
      !phoneValid ||
      !subject.trim() ||
      !message.trim()
    ) {
      return
    }
    setSubmitting(true)

    const now = new Date().toISOString()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    // Persist as a guest-flagged doubt.
    const guestId = `guest-${Math.random().toString(36).slice(2, 10)}`
    const doubt: Doubt = {
      id: generateId("doubt"),
      studentId: guestId,
      courseId,
      title: subject.trim(),
      // Wrap message text in a <p> so the dashboard's RichTextContent
      // renderer doesn't show it as a bare string. Append the asker's
      // WhatsApp so the teacher has both reply channels visible right
      // on the thread, not just in the email metadata.
      body: `<p>${escapeHtml(message.trim()).replace(/\n/g, "<br />")}</p><p style="color:#666;font-size:13px"><strong>WhatsApp:</strong> ${escapeHtml(trimmedPhone)}</p>`,
      replies: [],
      status: "open",
      createdAt: now,
      updatedAt: now,
      guest: { name: trimmedName, email: trimmedEmail },
    }
    addDoubt(doubt)

    // In-app notifications. Recipient set, in order of fallback:
    //   1. The course's named instructor (if their userId is known)
    //   2. The workspace owner
    //   3. Any admins
    //   4. Any instructors
    // First match populates the recipient list; we don't union to
    // avoid flooding every inbox in larger workspaces.
    const ownerEmail = currentTenant?.ownerEmail?.toLowerCase()
    const recipients = (() => {
      if (instructor.id) {
        const inst = users.find((u) => u.id === instructor.id)
        if (inst) return [inst]
      }
      const owner = users.find((u) => ownerEmail && u.email.toLowerCase() === ownerEmail)
      if (owner) return [owner]
      const admins = users.filter((u) => u.role === "admin")
      if (admins.length > 0) return admins
      return users.filter((u) => u.role === "instructor")
    })()

    if (recipients.length > 0) {
      const notifs: Notification[] = []
      for (const u of recipients) {
        // In-app — always.
        notifs.push({
          id: generateId("notif"),
          userId: u.id,
          channel: "in-app",
          type: "enquiry.received",
          title: `Pre-sale question from ${trimmedName}`,
          body: `${subject.trim()} — ${stripTags(doubt.body).slice(0, 160)}`,
          url: "/dashboard/doubts",
          createdAt: now,
          sentAt: now,
          status: "sent",
          meta: { doubtId: doubt.id, courseId, guestEmail: trimmedEmail },
        })
        // WhatsApp — best-effort via the existing stub. The stub
        // currently logs to the dev console; swapping in a real
        // provider (Twilio, WhatsApp Cloud API) wires this up for
        // production without touching this call site.
        if (u.phone) {
          notifs.push({
            id: generateId("notif"),
            userId: u.id,
            channel: "whatsapp",
            type: "enquiry.received",
            title: `Pre-sale question from ${trimmedName}`,
            body: `${subject.trim()} — open the dashboard to reply.`,
            url: "/dashboard/doubts",
            createdAt: now,
            status: "queued",
            meta: { doubtId: doubt.id, courseId, guestEmail: trimmedEmail },
          })
        }
      }
      addNotifications(notifs)
    }

    // Email the workspace owner — best-effort. Reply-to is the guest
    // email so the teacher can reply directly from their inbox if they
    // prefer that over the dashboard.
    if (currentTenant?.ownerEmail) {
      const replyHref = "/dashboard/doubts"
      fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: currentTenant.ownerEmail,
          subject: `Course enquiry: ${subject.trim()}`,
          replyTo: trimmedEmail,
          html: `
            <p><strong>${escapeHtml(trimmedName)}</strong> (<a href="mailto:${escapeHtml(trimmedEmail)}">${escapeHtml(trimmedEmail)}</a>) asked about <em>${escapeHtml(courseTitle)}</em>:</p>
            <p style="color:#666;font-size:13px"><strong>WhatsApp:</strong> ${escapeHtml(trimmedPhone)}</p>
            <blockquote style="border-left:3px solid #d4af37;padding:8px 12px;margin:12px 0;background:#fafaf7">${escapeHtml(message.trim()).replace(/\n/g, "<br />")}</blockquote>
            <p><a href="${replyHref}">Open in dashboard →</a></p>
          `,
        }),
      }).catch(() => { /* swallowed — UI already confirmed */ })
    }

    // Best-effort acknowledgement to the asker so they know it
    // actually went somewhere. Same /api/email/send route.
    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: trimmedEmail,
        subject: `We got your question about "${courseTitle}"`,
        html: `
          <p>Hi ${escapeHtml(trimmedName.split(" ")[0] || trimmedName)},</p>
          <p>Thanks for reaching out about <strong>${escapeHtml(courseTitle)}</strong>. ${escapeHtml(instructor.name) || "The teacher"} will reply to this email as soon as they can.</p>
          <p style="color:#666;font-size:14px"><strong>Your question:</strong><br/>${escapeHtml(message.trim()).replace(/\n/g, "<br />")}</p>
        `,
      }),
    }).catch(() => {})

    pushRate(rateKey, ENQUIRY_MAX_PER_DAY, ENQUIRY_WINDOW_MS)
    setSent(true)
    setSubmitting(false)
    setTimeout(() => {
      setOpen(false)
      reset()
    }, 2000)
  }

  // Prominent variant lives on the dark hero of the course detail
  // page. Was amber (text-accent) which read as a warning/error
  // pill against the navy hero — a hesitant buyer should not feel
  // like emailing the teacher is a "risky" action. Switched to a
  // calm frosted-white pill that reads as a friendly secondary CTA.
  const trigger =
    variant === "prominent" ? (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/20 hover:shadow-md"
      >
        <Mail className="h-4 w-4" />
        Have a question? Email the teacher
      </button>
    ) : (
      <Button variant="ghost" size="sm">
        <MessageCircleQuestion className="mr-2 h-4 w-4" />
        Have a question? Email the teacher
      </Button>
    )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        setOpen(o)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email {instructor.name || "the teacher"}</DialogTitle>
          <DialogDescription>
            Your question goes straight to the teacher. They&apos;ll reply to the
            email you give below — usually within a day.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="rounded-md border border-success/30 bg-success/5 p-4 text-sm">
            <p className="font-medium text-success">Sent — check your inbox for a confirmation.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {instructor.name || "The teacher"} has been notified and will reply to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="enq-name" className="text-xs">
                  Your name
                </Label>
                <Input
                  id="enq-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  disabled={locked || submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enq-email" className="text-xs">
                  Your email
                </Label>
                <Input
                  id="enq-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={locked || submitting}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">WhatsApp number *</Label>
              <PhoneInput
                value={phone}
                onChange={(e164, valid) => {
                  setPhone(e164)
                  setPhoneValid(valid)
                }}
                required
                whatsapp
                placeholder="98765 43210"
              />
              <p className="text-[11px] text-muted-foreground">
                We&apos;ll use this if the teacher prefers to follow up on WhatsApp.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enq-subject" className="text-xs">
                Subject
              </Label>
              <Input
                id="enq-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={locked || submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enq-message" className="text-xs">
                Your question
              </Label>
              <Textarea
                id="enq-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Hi ${instructor.name?.split(" ")[0] || "there"}, I'm considering "${courseTitle}" and have a quick question…`}
                disabled={locked || submitting}
              />
            </div>

            <p
              className={cn(
                "text-xs",
                locked ? "font-medium text-destructive" : "text-muted-foreground",
              )}
            >
              {locked && rate.unlocksAt ? (
                <>
                  You&apos;ve sent {ENQUIRY_MAX_PER_DAY} questions about this course in the last 24 hours.
                  You can send another in <span className="font-semibold">{formatUnlock(rate.unlocksAt)}</span>.
                </>
              ) : (
                <>
                  {rate.left} of {ENQUIRY_MAX_PER_DAY} questions left for this course in the next 24 h.
                </>
              )}
            </p>
          </div>
        )}

        {!sent && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={
                locked ||
                submitting ||
                !name.trim() ||
                !email.trim() ||
                !phoneValid ||
                !subject.trim() ||
                !message.trim()
              }
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Sending…" : "Send to teacher"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
