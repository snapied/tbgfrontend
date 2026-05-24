"use client"

// CourseAnnouncementDialog — push an announcement to every enrolled
// student of a course in one composer.
//
// Three fan-outs happen on submit (all opt-in via channel toggles):
//   1. In-app notification (always available, hits the bell + inbox)
//   2. Email — uses the existing notifications dispatcher
//   3. WhatsApp — same pipeline, gated by user prefs + phone presence
//
// If the course has a linked community (defaultBatchId), we also
// post the announcement into that community's General space so the
// message lives somewhere visible after the notification timer
// expires. Optional — teachers can untick the community mirror.
//
// Why this isn't using the standalone Announcements module: the
// announcements page is workspace-wide. This is the per-course
// equivalent — narrower audience, tighter scope, no priority
// taxonomy to wade through. The bell-icon outcome is identical;
// the affordance lives where the work is.

import { useEffect, useMemo, useState } from "react"
import { Megaphone, Loader2, Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  useLMS,
  generateId,
  type Course,
} from "@/lib/lms-store"
import {
  buildNotifications,
  type DispatchPayload,
} from "@/lib/notifications"

interface CourseAnnouncementDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  course: Course
}

export function CourseAnnouncementDialog({
  open,
  onOpenChange,
  course,
}: CourseAnnouncementDialogProps) {
  const {
    users,
    enrollments,
    studentGroups,
    addNotifications,
    addBatchPost,
    currentUser,
  } = useLMS()

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [channels, setChannels] = useState({
    inApp: true,
    email: true,
    whatsApp: false,
    community: true,
  })
  const [submitting, setSubmitting] = useState(false)

  // Reset on every open so a previous draft doesn't leak into a
  // new announcement. We intentionally don't autosave drafts here
  // — announcement is a high-intent action; if the teacher closes
  // it accidentally, they're more upset about it sending stale
  // content than about retyping a few lines.
  useEffect(() => {
    if (!open) return
    setTitle("")
    setMessage("")
    setChannels({
      inApp: true,
      email: true,
      whatsApp: false,
      community: !!course.defaultBatchId,
    })
  }, [open, course.defaultBatchId])

  // Resolve the enrolled-student set once per open. We pull through
  // the users table so the dispatcher gets full User shapes
  // (channels prefs, email, phone) — not just ids.
  const recipients = useMemo(() => {
    if (!open) return []
    const studentIds = new Set(
      enrollments
        .filter((e) => e.courseId === course.id)
        .map((e) => e.studentId),
    )
    return users.filter((u) => studentIds.has(u.id))
  }, [open, enrollments, users, course.id])

  const linkedCommunity = course.defaultBatchId
    ? studentGroups.find((g) => g.id === course.defaultBatchId)
    : undefined

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Give your announcement a headline.")
      return
    }
    if (!message.trim()) {
      toast.error("Add the message body.")
      return
    }
    if (recipients.length === 0 && !channels.community) {
      toast.error("Nobody's enrolled yet — nothing to announce.")
      return
    }
    setSubmitting(true)
    try {
      // 1. Notifications fan-out.
      const channelList: ("in-app" | "email" | "whatsapp")[] = []
      if (channels.inApp) channelList.push("in-app")
      if (channels.email) channelList.push("email")
      if (channels.whatsApp) channelList.push("whatsapp")
      if (channelList.length > 0 && recipients.length > 0) {
        const dispatch: DispatchPayload = {
          type: "course.announcement",
          title: title.trim(),
          body: message.trim(),
          url: `/learn/${course.slug}`,
          meta: { courseId: course.id, kind: "course.announcement" },
        }
        const entries = buildNotifications(recipients, dispatch, {
          channels: channelList,
        })
        addNotifications(entries)
      }
      // 2. Community mirror. Posts under the General space with a
      //    📣 prefix so members can tell announcements apart from
      //    regular chatter. Skipped when the toggle is off or no
      //    community is linked.
      if (channels.community && linkedCommunity && currentUser) {
        const bodyHtml = `<p><strong>📣 ${escapeHtml(title.trim())}</strong></p>${message
          .trim()
          .split(/\n{2,}/)
          .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
          .join("")}<p><em>— Course-wide announcement</em></p>`
        addBatchPost({
          id: generateId("post"),
          batchId: linkedCommunity.id,
          spaceId: "space-general",
          authorId: currentUser.id,
          body: bodyHtml,
          pinned: true,
          hidden: false,
          reactions: {},
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      const sentChannels = [
        channels.inApp && "in-app",
        channels.email && "email",
        channels.whatsApp && "WhatsApp",
        channels.community && linkedCommunity && "community",
      ].filter(Boolean) as string[]
      toast.success(`Announcement sent to ${recipients.length} student${recipients.length === 1 ? "" : "s"}.`, {
        description:
          sentChannels.length > 0
            ? `Via ${sentChannels.join(" · ")}`
            : "No channels selected — nothing dispatched.",
      })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Announce to your students
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
            <p>
              <span className="font-medium">{course.title}</span>
              <span className="ml-2 text-muted-foreground">
                · {recipients.length} enrolled student
                {recipients.length === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Headline</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New module just dropped"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea
              id="ann-body"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hey everyone — Module 3 is live with 4 new lessons + a hands-on project. Take a look when you can…"
              rows={5}
              className="resize-y"
            />
            <p className="text-[11px] text-muted-foreground">
              Plain text. Empty lines become paragraphs. The community
              post and email versions are auto-formatted from this.
            </p>
          </div>
          <div className="space-y-2 rounded-md border border-border/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Channels
            </p>
            <Channel
              checked={channels.inApp}
              onCheckedChange={(v) => setChannels((c) => ({ ...c, inApp: v }))}
              label="In-app notification"
              hint="Bell + inbox · students see it next time they open the dashboard"
            />
            <Channel
              checked={channels.email}
              onCheckedChange={(v) => setChannels((c) => ({ ...c, email: v }))}
              label="Email"
              hint="Hits inboxes of students with email on file"
            />
            <Channel
              checked={channels.whatsApp}
              onCheckedChange={(v) => setChannels((c) => ({ ...c, whatsApp: v }))}
              label="WhatsApp"
              hint="Loudest channel — use sparingly · students with phone + opt-in only"
            />
            <Channel
              checked={channels.community && !!linkedCommunity}
              disabled={!linkedCommunity}
              onCheckedChange={(v) => setChannels((c) => ({ ...c, community: v }))}
              label={
                linkedCommunity
                  ? `Pin to community: ${linkedCommunity.name}`
                  : "Pin to community (no community linked)"
              }
              hint={
                linkedCommunity
                  ? "Posts to the General space and pins for 24 hours so it stays visible"
                  : "Link a community on this course to enable a permanent home for announcements"
              }
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting || !title.trim() || !message.trim()}
          >
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            {recipients.length > 0
              ? `Send to ${recipients.length}`
              : "Send (no recipients yet)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Channel({
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: string
  hint: string
  disabled?: boolean
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2 transition-colors hover:bg-muted/40 ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
