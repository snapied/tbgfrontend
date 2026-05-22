"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  Copy,
  Link as LinkIcon,
  Loader2,
  Mail,
  MessageSquare,
  QrCode,
  Send,
  Share2,
} from "lucide-react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLMS, type Assignment } from "@/lib/lms-store"
import {
  assignmentPublishedAnnouncement,
  buildNotifications,
  type DispatchOptions,
} from "@/lib/notifications"

interface AssignmentShareDialogProps {
  assignment: Assignment
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignmentShareDialog({ assignment, open, onOpenChange }: AssignmentShareDialogProps) {
  const { enrollments, users, getCourseById, addNotifications } = useLMS()
  const course = getCourseById(assignment.courseId)
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [resending, setResending] = useState<DispatchOptions["channels"] | null>(null)
  const [resentFlash, setResentFlash] = useState<string | null>(null)

  const shareUrl = useMemo(() => {
    const tokenOrId = assignment.shareToken ?? assignment.id
    if (typeof window === "undefined") return `/assignment/${tokenOrId}`
    return `${window.location.origin}/assignment/${tokenOrId}`
  }, [assignment.shareToken, assignment.id])

  const recipients = useMemo(() => {
    const ids = enrollments.filter((e) => e.courseId === assignment.courseId).map((e) => e.studentId)
    return users.filter((u) => ids.includes(u.id))
  }, [enrollments, users, assignment.courseId])
  const withEmail = recipients.filter((u) => !!u.email).length
  const withPhone = recipients.filter((u) => !!u.phone).length

  useEffect(() => {
    if (!open) {
      setCopied(false)
      setResending(null)
      setResentFlash(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 200,
      color: { dark: "#0a3024", light: "#ffffff" },
    })
      .then((url) => { if (!cancelled) setQrUrl(url) })
      .catch(() => { if (!cancelled) setQrUrl(null) })
    return () => { cancelled = true }
  }, [open, shareUrl])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const nativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      void copy()
      return
    }
    try {
      await navigator.share({
        title: assignment.title,
        text: `Follow-up from ${course?.title ?? "your course"} — ${assignment.title}`,
        url: shareUrl,
      })
    } catch { /* dismissed */ }
  }

  const resend = (channel: "in-app" | "email" | "whatsapp") => {
    setResending([channel])
    const payload = assignmentPublishedAnnouncement({
      assignmentTitle: assignment.title,
      courseTitle: course?.title ?? "Coursework",
      kind: assignment.kind,
      dueAt: assignment.dueAt,
      assignmentId: assignment.id,
    })
    payload.url = `/assignment/${assignment.shareToken ?? assignment.id}`
    payload.title = `Reminder: ${payload.title}`
    addNotifications(buildNotifications(recipients, payload, { channels: [channel] }))
    setResentFlash(channel)
    setTimeout(() => {
      setResending(null)
      setResentFlash(null)
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share &amp; track
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{assignment.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR */}
          <div className="flex items-center justify-center rounded-lg border border-border/60 bg-muted/40 p-3">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt="QR code" className="h-36 w-36 rounded-md bg-white p-2" />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center text-muted-foreground">
                <QrCode className="h-10 w-10" />
              </div>
            )}
          </div>

          {/* Link */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <LinkIcon className="h-3.5 w-3.5" />
              Shareable link
            </label>
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
              <Button
                type="button"
                variant={copied ? "default" : "outline"}
                onClick={copy}
                className="shrink-0"
              >
                {copied ? <><Check className="mr-1.5 h-4 w-4" />Copied</> : <><Copy className="mr-1.5 h-4 w-4" />Copy</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can open the follow-up. Submissions still go through the student&apos;s account.
            </p>
          </div>

          {/* Per-channel resend */}
          <div className="space-y-2 rounded-md border border-border/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Send a reminder
            </p>
            <ResendRow
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              label="In-app"
              count={recipients.length}
              loading={resending?.includes("in-app") ?? false}
              done={resentFlash === "in-app"}
              onClick={() => resend("in-app")}
            />
            <ResendRow
              icon={<Mail className="h-3.5 w-3.5" />}
              label="Email"
              count={withEmail}
              disabled={withEmail === 0}
              loading={resending?.includes("email") ?? false}
              done={resentFlash === "email"}
              onClick={() => resend("email")}
            />
            <ResendRow
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              label="WhatsApp"
              count={withPhone}
              disabled={withPhone === 0}
              loading={resending?.includes("whatsapp") ?? false}
              done={resentFlash === "whatsapp"}
              onClick={() => resend("whatsapp")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={nativeShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share…
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResendRow({
  icon,
  label,
  count,
  loading,
  done,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  count: number
  loading: boolean
  done: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-primary">{icon}</span>
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">· {count} recipient{count === 1 ? "" : "s"}</span>
      </div>
      <Button
        size="sm"
        variant={done ? "default" : "outline"}
        onClick={onClick}
        disabled={disabled || loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : done ? (
          <><Check className="mr-1 h-3.5 w-3.5" />Sent</>
        ) : (
          <><Send className="mr-1 h-3.5 w-3.5" />Resend</>
        )}
      </Button>
    </div>
  )
}
