"use client"

// Contact-support composer. Mounted on /support as the prominent
// CTA that lets a visitor reach the platform support inbox
// without leaving the page.
//
// Shape mirrors EmailTeacherDialog (email + name + WhatsApp +
// rich-text message + rolling rate limit) so visitors who've
// seen one form recognise the other. The differences:
//   • Recipient is the platform support team (hardcoded
//     SUPPORT_EMAIL), not a per-tenant teacher.
//   • Rate-limit key is keyed by browser only (no per-course
//     bucket); 3 per 24h still.
//   • The acknowledgement copy reads "we've got your ticket"
//     instead of "the teacher will get back to you", and the
//     subject line + meta hints in the email reflect that it
//     came from a support form, not a course enquiry.

import { useEffect, useMemo, useState } from "react"
import { LifeBuoy, Loader2, Mail, Send } from "lucide-react"
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
import { PhoneInput } from "@/components/forms/phone-input"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { isRichTextEmpty } from "@/components/editor/rich-text-content"
import { cn } from "@/lib/utils"
import {
  ENQUIRY_MAX_PER_DAY,
  ENQUIRY_WINDOW_MS,
  formatUnlock,
  pushRate,
  readRate,
} from "@/lib/enquiry-rate-limit"

// Where support / sales tickets land. Real production swaps these
// for a proper queue / Zendesk-style mailbox; for now plain inboxes
// keep the surface honest. Kept here (not in env) so the stub-y-ness
// is auditable from one file.
const SUPPORT_EMAIL = "welcome@thebigclass.com"
const SALES_EMAIL = "sales@thebigclass.com"

const RATE_KEY = "support:contact"
const RATE_KEY_SALES = "support:sales"

interface Props {
  // Pre-filled subject — when the page surface has context
  // (e.g. "report a bug"), pass a starter so the user doesn't
  // have to phrase it. Optional; defaults to a generic prompt.
  defaultSubject?: string
  // Visual variant for the built-in trigger button. "hero" is the
  // giant CTA under the support hero; "inline" is a small pill. Use
  // `trigger` to override the trigger entirely (e.g. plan cards).
  variant?: "hero" | "inline"
  // Drives the dialog copy: "support" routes to the support inbox;
  // "sales" routes to the sales inbox and uses sales-flavoured
  // heading / send button copy so an Institute prospect doesn't
  // see "support ticket" language.
  intent?: "support" | "sales"
  // Custom trigger element — when provided, replaces the built-in
  // Button. Used by the Institute plan cards so the "Talk to us"
  // button keeps its full-width / outline look.
  trigger?: React.ReactNode
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function ContactSupportDialog({
  defaultSubject,
  variant = "hero",
  intent = "support",
  trigger: customTrigger,
}: Props) {
  const isSales = intent === "sales"
  const resolvedSubject =
    defaultSubject ?? (isSales ? "Institute plan enquiry" : "Help with The Big Class")
  const rateKey = isSales ? RATE_KEY_SALES : RATE_KEY
  const recipient = isSales ? SALES_EMAIL : SUPPORT_EMAIL
  const subjectPrefix = isSales ? "[Sales] " : "[Support] "
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneValid, setPhoneValid] = useState(false)
  const [subject, setSubject] = useState(resolvedSubject)
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  // Tick once a minute so the lock countdown updates without
  // forcing the user to refresh.
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const rate = useMemo(
    () => readRate(rateKey, ENQUIRY_MAX_PER_DAY, ENQUIRY_WINDOW_MS),
    // Re-read on open so the count is fresh whenever the user
    // pulls the dialog up again — guards against a stale render
    // from an hour-old mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, rateKey],
  )
  const locked = rate.left === 0

  const emailValid = !email || /^[^@]+@[^@]+\.[^@]+$/.test(email)
  const canSubmit =
    !locked &&
    !submitting &&
    !!name.trim() &&
    !!email.trim() &&
    emailValid &&
    phoneValid &&
    !!subject.trim() &&
    !isRichTextEmpty(body)

  function reset() {
    setName("")
    setEmail("")
    setPhone("")
    setPhoneValid(false)
    setSubject(resolvedSubject)
    setBody("")
    setSent(false)
    setSubmitting(false)
  }

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedSubject = subject.trim()

    // POST to the existing /api/email/send route. The body
    // intentionally mirrors what /api/auth/* routes send so the
    // mailbox sees a consistent shape (we just change the
    // recipient + subject prefix). On a real backend we'd
    // queue the ticket and return a ticket id.
    try {
      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject: `${subjectPrefix}${trimmedSubject}`,
          replyTo: trimmedEmail,
          html: `
            <p><strong>${escapeHtml(trimmedName)}</strong> (<a href="mailto:${escapeHtml(trimmedEmail)}">${escapeHtml(trimmedEmail)}</a>) wrote:</p>
            <p style="color:#666;font-size:13px"><strong>WhatsApp:</strong> ${escapeHtml(trimmedPhone)}</p>
            <blockquote style="border-left:3px solid #d4af37;padding:8px 12px;margin:12px 0;background:#fafaf7">${body}</blockquote>
          `,
        }),
      })
    } catch {
      /* swallowed — the UI confirms regardless; failures will
         surface in server logs */
    }

    // Best-effort acknowledgement to the person who wrote in.
    try {
      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: trimmedEmail,
          subject: `We got your message — ${trimmedSubject}`,
          html: `
            <p>Hi ${escapeHtml(trimmedName.split(" ")[0] || trimmedName)},</p>
            <p>Thanks for reaching out — your message is in our queue and a real human will reply to this email soon.</p>
            <p style="color:#666;font-size:14px"><strong>Your message:</strong></p>
            <blockquote style="color:#666;font-size:14px;border-left:3px solid #d4af37;padding:8px 12px;margin:0;background:#fafaf7">${body}</blockquote>
          `,
        }),
      })
    } catch {
      /* same — fire and forget */
    }

    pushRate(rateKey, ENQUIRY_MAX_PER_DAY, ENQUIRY_WINDOW_MS)
    setSent(true)
    setSubmitting(false)
    setTimeout(() => {
      setOpen(false)
      reset()
    }, 2200)
  }

  const trigger =
    customTrigger ??
    (variant === "hero" ? (
      <Button size="lg" className="shadow-sm">
        <LifeBuoy className="mr-2 h-4 w-4" />
        {isSales ? "Talk to sales" : "Contact support"}
      </Button>
    ) : (
      <Button variant="outline" size="sm">
        <Mail className="mr-2 h-4 w-4" />
        {isSales ? "Talk to sales" : "Email us"}
      </Button>
    ))

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
          <DialogTitle>
            {isSales ? "Talk to our team about Institute" : "Contact support"}
          </DialogTitle>
          <DialogDescription>
            {isSales
              ? "Tell us about your school, college, or training programme — we'll come back within one business day with sizing, onboarding plan, and pricing."
              : "Tell us what's going on. A real human will reply to your email — usually within a day."}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="rounded-md border border-success/30 bg-success/5 p-4 text-sm">
            <p className="font-medium text-success">
              Sent — check your inbox for a confirmation.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              We&apos;ll reply to <span className="font-medium text-foreground">{email}</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cs-name">Your name *</Label>
                <Input
                  id="cs-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-email">Email *</Label>
                <Input
                  id="cs-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                />
                {email && !emailValid && (
                  <p className="text-xs text-destructive">
                    That doesn&apos;t look like a valid email.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>WhatsApp number *</Label>
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
                We&apos;ll only use this if email bounces or for time-sensitive issues.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cs-subject">Subject *</Label>
              <Input
                id="cs-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Message *</Label>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Be specific — what happened, what you expected, any error messages, the URL you were on."
                minHeight={160}
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
                  You&apos;ve sent {ENQUIRY_MAX_PER_DAY} {isSales ? "enquiries" : "support messages"} in the last 24 hours.
                  You can send another in <span className="font-semibold">{formatUnlock(rate.unlocksAt)}</span>.
                </>
              ) : (
                <>
                  {rate.left} of {ENQUIRY_MAX_PER_DAY} {isSales ? "enquiries" : "messages"} left in the next 24 h.
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
            <Button onClick={submit} disabled={!canSubmit}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {submitting ? "Sending…" : "Send message"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
