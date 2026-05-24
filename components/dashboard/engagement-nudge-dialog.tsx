"use client"

// Engagement nudge preview dialog. Shown when the teacher clicks
// "Send check-in" or "Send come-back" on the engagement page. The
// previous behaviour was a one-click send — the teacher had no idea
// what the email said, what channels were used, or who exactly got
// it. Now they preview, edit subject + body if they want, pick
// channels, and then send.
//
// The two presets ("check-in" / "comeback") seed default copy that
// the teacher can tweak before sending. The dispatcher honours each
// recipient's per-channel preferences, so disabling Email here
// effectively turns off email for everyone in this batch — without
// touching the global toggle.

import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { User } from "@/lib/lms-store"

export type NudgeKind = "checkin" | "comeback"

export interface NudgePayload {
  type: string
  title: string
  body: string
  url: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  kind: NudgeKind
  recipients: User[]
  /** Deep-link the nudge points students at (e.g. /p/<tenant>/my). */
  destinationUrl: string
  /** Tenant / instructor name surfaced inside the preview body so
   *  the teacher sees what students will actually read. */
  fromName?: string
  onSend: (payload: NudgePayload & { channels: { inApp: boolean; email: boolean; whatsApp: boolean } }) => void
}

// Defaults the dialog opens with. The teacher can edit any of these
// before sending; the templates are intentionally short and warm so
// they don't read as automation.
function defaultsFor(kind: NudgeKind): { title: string; body: string } {
  if (kind === "checkin") {
    return {
      title: "Quick check-in from your instructor",
      body:
        "Hey — just checking in. Wanted to make sure you have what you need to keep going.\n\n" +
        "If you're stuck on anything, hit reply and tell me what's blocking you. " +
        "Even one sentence helps me unblock you faster.\n\n" +
        "And if you're cruising, ignore this and keep going!",
    }
  }
  return {
    title: "We miss you in class",
    body:
      "Hey — it's been a minute since you last opened the course.\n\n" +
      "Your progress is saved, so you can pick up exactly where you left off. " +
      "Even fifteen minutes today will get the momentum back.\n\n" +
      "Open the course any time — link below. And if life got in the way, no judgement, " +
      "just hit reply and let me know what's going on.",
  }
}

// Maps the kind to a notification.type string the dispatcher uses
// for analytics / preference matching.
function notificationTypeFor(kind: NudgeKind): string {
  return kind === "checkin" ? "engagement.check-in" : "engagement.comeback"
}

export function NudgePreviewDialog({
  open,
  onOpenChange,
  kind,
  recipients,
  destinationUrl,
  fromName,
  onSend,
}: Props) {
  const seed = useMemo(() => defaultsFor(kind), [kind])
  const [subject, setSubject] = useState(seed.title)
  const [body, setBody] = useState(seed.body)
  const [inApp, setInApp] = useState(true)
  const [email, setEmail] = useState(true)
  const [whatsApp, setWhatsApp] = useState(true)
  const [sending, setSending] = useState(false)

  // Re-seed every time the dialog opens or the kind changes so a
  // previous draft on the other nudge doesn't leak over.
  useEffect(() => {
    if (!open) return
    const next = defaultsFor(kind)
    setSubject(next.title)
    setBody(next.body)
    setInApp(true)
    setEmail(true)
    setWhatsApp(true)
    setSending(false)
  }, [open, kind])

  const recipientsWithEmail = recipients.filter((r) => !!r.email?.trim()).length
  const recipientsWithPhone = recipients.filter((r) => !!r.phone?.trim()).length
  const anyChannelOn = inApp || email || whatsApp
  const ableToSend =
    !sending &&
    recipients.length > 0 &&
    anyChannelOn &&
    !!subject.trim() &&
    !!body.trim()

  const handleSend = () => {
    if (!ableToSend) return
    setSending(true)
    onSend({
      type: notificationTypeFor(kind),
      title: subject.trim(),
      body: body.trim(),
      url: destinationUrl,
      channels: { inApp, email, whatsApp },
    })
  }

  // Light-weight HTML mail preview. We don't actually render the
  // production email template here — the recipient sees the real
  // template through the email worker — but this gives the teacher
  // a faithful "what does this read like" view (subject + body +
  // CTA + sender). Plain-text bodies are line-broken via
  // whitespace-pre-line so paragraph breaks survive.
  const previewSender = fromName ?? "Your instructor"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind === "checkin" ? (
              <>
                <MessageCircle className="h-5 w-5 text-primary" /> Send a check-in
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5 text-primary" /> Send a come-back
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {kind === "checkin"
              ? "A warm hello to active students — keeps the conversation open without nagging."
              : "A nudge for students who've gone quiet — reminds them their progress is saved."}
            {" "}Previewed below — edit anything before you send.
          </DialogDescription>
        </DialogHeader>

        {/* Recipients strip */}
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
          <p className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
            </Badge>
            <span className="text-muted-foreground">
              {recipientsWithEmail} with email · {recipientsWithPhone} with WhatsApp number
            </span>
          </p>
          {recipients.length > 0 && (
            <p className="mt-1.5 line-clamp-2 text-muted-foreground">
              {recipients
                .slice(0, 6)
                .map((r) => r.name)
                .join(", ")}
              {recipients.length > 6 && ` … and ${recipients.length - 6} more`}
            </p>
          )}
        </div>

        {/* Subject + body editors */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nudge-subject">Subject</Label>
            <Input
              id="nudge-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={140}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nudge-body">Message</Label>
            <Textarea
              id="nudge-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={1500}
            />
            <p className="text-[11px] text-muted-foreground">
              Plain text. Paragraph breaks are preserved. {body.length}/1500
            </p>
          </div>
        </div>

        {/* Live preview — looks like a stripped-down mail. Updates as
            the teacher types so they see the result in real time. */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preview — what your students will see
          </p>
          <div className="overflow-hidden rounded-md border border-border bg-background">
            <div className="border-b border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">From:</span>{" "}
                {previewSender}
              </p>
              <p className="mt-0.5">
                <span className="font-semibold text-foreground">Subject:</span>{" "}
                {subject.trim() || "—"}
              </p>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Hi {"{First name}"},</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {body.trim() || "—"}
              </p>
              <div className="mt-4">
                <a
                  href={destinationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  Open the course
                </a>
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                You're getting this because you&apos;re enrolled in{" "}
                {previewSender}&apos;s course. Reply to opt out.
              </p>
            </div>
          </div>
        </div>

        {/* Channels — defaults all on, teacher mutes per-batch. */}
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Send through
          </p>
          <ChannelRow
            icon={<Bell className="h-4 w-4 text-primary" />}
            label="In-app notification"
            sublabel={`${recipients.length} recipient${recipients.length === 1 ? "" : "s"} (every student)`}
            checked={inApp}
            onCheckedChange={setInApp}
          />
          <ChannelRow
            icon={<Mail className="h-4 w-4 text-primary" />}
            label="Email"
            sublabel={`${recipientsWithEmail} recipient${recipientsWithEmail === 1 ? "" : "s"} with email on file`}
            checked={email}
            onCheckedChange={setEmail}
            disabled={recipientsWithEmail === 0}
          />
          <ChannelRow
            icon={<MessageSquare className="h-4 w-4 text-primary" />}
            label="WhatsApp"
            sublabel={`${recipientsWithPhone} recipient${recipientsWithPhone === 1 ? "" : "s"} with a phone number`}
            checked={whatsApp}
            onCheckedChange={setWhatsApp}
            disabled={recipientsWithPhone === 0}
          />
          {!anyChannelOn && (
            <p className="text-[11px] text-destructive">
              Pick at least one channel — nothing happens with all three off.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!ableToSend}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending…" : `Send to ${recipients.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChannelRow({
  icon,
  label,
  sublabel,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  sublabel: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[11px] text-muted-foreground">{sublabel}</p>
        </div>
      </div>
      <Switch checked={checked && !disabled} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
