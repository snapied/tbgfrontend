"use client"

// CommunityBulkInviteDialog — Sprint B Communities #5.
//
// Replaces the "add students one at a time" model with three bulk
// channels:
//   1. Paste a list of emails (CSV or one-per-line) — already-known
//      users are added to the community immediately; unknowns are
//      surfaced as "send invite" rows that share the magic link
//      via mailto.
//   2. WhatsApp share — opens wa.me with the invite link pre-
//      filled so the admin picks contacts in WhatsApp.
//   3. Copy + paste channel — straight clipboard copy of the
//      formatted invite message for any channel we don't natively
//      support (Slack, Discord, email, etc.).
//
// Self-contained: takes the invite URL + an `onAddKnown` callback to
// handle the matched users. Doesn't manage the invite code itself —
// the parent already owns that lifecycle.

import { useMemo, useState } from "react"
import { Check, Copy, Mail, MessageCircle, Send, Users2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface KnownUserLite {
  id: string
  email: string
  name?: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Community name + invite URL for share messages. */
  communityName: string
  inviteUrl: string
  /** All known users in the workspace — used to match pasted emails
   *  to existing accounts so we can add them straight in. */
  knownUsers: KnownUserLite[]
  /** User ids already in the community — used to filter so we don't
   *  spam re-adds for existing members. */
  existingMemberIds: string[]
  /** Add matched users to the community. The parent persists via the
   *  store. */
  onAddKnown: (userIds: string[]) => void
}

export function CommunityBulkInviteDialog({
  open,
  onOpenChange,
  communityName,
  inviteUrl,
  knownUsers,
  existingMemberIds,
  onAddKnown,
}: Props) {
  const [emailsRaw, setEmailsRaw] = useState("")
  const [customMessage, setCustomMessage] = useState(
    `You're invited to join the ${communityName} community.`,
  )

  // Parse the textarea into a clean list of email strings on every
  // change. Accepts comma, newline, semicolon, whitespace as
  // separators. Lower-cases for match comparison. Capped at 200 to
  // keep UI + share targets sane.
  const parsedEmails = useMemo(() => {
    return Array.from(
      new Set(
        emailsRaw
          .split(/[,;\s\n]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => /.+@.+\..+/.test(e)),
      ),
    ).slice(0, 200)
  }, [emailsRaw])

  // Classify each parsed email into one of three buckets:
  //   • known + already a member  → skip
  //   • known + not a member       → addable
  //   • unknown                     → needs an invite link
  const buckets = useMemo(() => {
    const knownByEmail = new Map(knownUsers.map((u) => [u.email.toLowerCase(), u]))
    const memberSet = new Set(existingMemberIds)
    const addable: KnownUserLite[] = []
    const alreadyMembers: KnownUserLite[] = []
    const unknownEmails: string[] = []
    for (const e of parsedEmails) {
      const u = knownByEmail.get(e)
      if (u) {
        if (memberSet.has(u.id)) alreadyMembers.push(u)
        else addable.push(u)
      } else {
        unknownEmails.push(e)
      }
    }
    return { addable, alreadyMembers, unknownEmails }
  }, [parsedEmails, knownUsers, existingMemberIds])

  const inviteMessage = `${customMessage}\n\n${inviteUrl}`

  const doAddKnown = () => {
    if (buckets.addable.length === 0) {
      toast.info("No matched users to add — paste emails or check spelling.")
      return
    }
    onAddKnown(buckets.addable.map((u) => u.id))
    toast.success(
      `Added ${buckets.addable.length} ${buckets.addable.length === 1 ? "member" : "members"} to ${communityName}.`,
    )
    setEmailsRaw("")
  }

  const openMailtoAll = () => {
    if (buckets.unknownEmails.length === 0) {
      toast.info("No external addresses to invite — pasted emails are all known users.")
      return
    }
    // BCC the unknowns so recipients don't see each other's emails.
    // Subject keeps it short for mobile preview clarity.
    const subject = `Join ${communityName}`
    const body = inviteMessage
    const mailto = `mailto:?bcc=${encodeURIComponent(
      buckets.unknownEmails.join(","),
    )}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailto, "_blank")
  }

  const openWhatsApp = () => {
    // No phone targeting — wa.me/?text=... opens WhatsApp with the
    // message pre-filled so the admin picks contacts inside the app.
    // Web WhatsApp on desktop also handles this.
    const url = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const copyMessage = () => {
    void navigator.clipboard.writeText(inviteMessage)
    toast.success("Invite message copied — paste into Slack, Discord, email, etc.")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Invite people to {communityName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Email paste box */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold">
              Paste up to 200 emails
            </label>
            <Textarea
              value={emailsRaw}
              onChange={(e) => setEmailsRaw(e.target.value)}
              placeholder={"anita@example.com, priya@example.com\nrahul@example.com"}
              rows={4}
              className="font-mono text-[12.5px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Comma, semicolon, newline, or whitespace-separated. We&apos;ll match against your
              workspace users — known users are added straight in; unknowns get an invite link.
            </p>
          </div>

          {/* Classification rows — only render once there's something
              to act on. Reads as a tight three-stack: addable / already
              members / unknowns. */}
          {parsedEmails.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <BucketRow
                tone="ok"
                count={buckets.addable.length}
                label={`Workspace user${buckets.addable.length === 1 ? "" : "s"} ready to add`}
                action={
                  buckets.addable.length > 0 && (
                    <Button size="sm" onClick={doAddKnown}>
                      <Check className="mr-1 h-3 w-3" />
                      Add to community
                    </Button>
                  )
                }
              />
              <BucketRow
                tone="info"
                count={buckets.alreadyMembers.length}
                label={`Already a member`}
              />
              <BucketRow
                tone="warn"
                count={buckets.unknownEmails.length}
                label={`External — need an invite link`}
                action={
                  buckets.unknownEmails.length > 0 && (
                    <Button size="sm" variant="outline" onClick={openMailtoAll}>
                      <Mail className="mr-1 h-3 w-3" />
                      Email invites
                    </Button>
                  )
                }
              />
            </div>
          )}

          {/* Share message — used by WhatsApp / copy. Editable so the
              admin can tweak tone before sharing. */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold">Invite message</label>
            <Input
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              maxLength={200}
            />
            <p className="text-[11px] text-muted-foreground">
              The invite link gets appended automatically.
            </p>
          </div>

          {/* Channel buttons */}
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={openWhatsApp}>
              <MessageCircle className="mr-1.5 h-4 w-4 text-emerald-500" />
              WhatsApp
            </Button>
            <Button variant="outline" onClick={openMailtoAll} disabled={buckets.unknownEmails.length === 0}>
              <Mail className="mr-1.5 h-4 w-4 text-rose-500" />
              Email (BCC)
            </Button>
            <Button variant="outline" onClick={copyMessage}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copy message
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BucketRow({
  tone,
  count,
  label,
  action,
}: {
  tone: "ok" | "warn" | "info"
  count: number
  label: string
  action?: React.ReactNode
}) {
  if (count === 0) return null
  const Icon = tone === "ok" ? Check : tone === "warn" ? Send : X
  return (
    <div className="flex items-center gap-3 text-[12.5px]">
      <span
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          tone === "ok" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          tone === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
          tone === "info" && "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-3 w-3" />
      </span>
      <span className="flex-1">
        <span className="font-semibold tabular-nums">{count}</span> {label}
      </span>
      {action}
    </div>
  )
}
