"use client"

// Unified Inbox.
//
// Aggregates the signals that historically lived across 5 different pages
// (Doubts, Discussions, Leads, Batches, Blog comments) into a single
// triage view. Each row supports an inline Reply where applicable — no
// jumping to a separate page just to type two sentences back.
//
// Two viewing modes:
//   - Needs attention (default): open doubts, unresolved discussions,
//     new leads, fresh batch posts, unread blog comments.
//   - Show all: everything from the same sources, regardless of status.
//     Closed / resolved / contacted items still surface with a status
//     badge so the user can scroll back and reply if they missed something.
//
// Replies fan out: in-app notification + email stub + WhatsApp stub fire
// for the OP (or to the captured guest email when the OP isn't a User).

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  Inbox as InboxIcon,
  Loader2,
  MessageCircle,
  Reply,
  Send,
  Sparkles,
  Users2,
  X,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  generateId,
  useLMS,
  type Doubt,
  type Discussion,
  type SentEmail,
} from "@/lib/lms-store"
import { usePortal, type PortalLead } from "@/lib/portal-store"
import { buildNotifications } from "@/lib/notifications"
import { getMutedThreadIds } from "@/lib/community-post-prefs"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

const INBOX_TOUR: TourStep[] = [
  {
    placement: "center",
    title: "One front door for everything",
    body: "Replaces the routine of checking Doubts, Communities, and Leads separately. Hit Next to learn what shows up here.",
    emoji: "📬",
  },
  {
    target: "[data-tour='inbox-mode']",
    title: "Needs attention vs Show all",
    body: "Default view shows items still waiting on you. Flip to Show all to see resolved doubts, contacted leads, and earlier discussions — useful if you triaged something and want to find it again.",
    emoji: "👀",
  },
  {
    target: "[data-tour='inbox-filters']",
    title: "Filter pills",
    body: "Slice the feed by source — Questions (student doubts), Communities (recent posts in your cohorts), Leads (pre-sale enquiries from the public site), and Blog comments. The badge on each pill shows the count.",
    emoji: "🧭",
  },
  {
    target: "[data-tour='inbox-list']",
    title: "Reply inline, or open the source",
    body: "Click Reply on any row to type a response without leaving — your reply fires an in-app notification, email, and WhatsApp message to the original sender. Or click the row to jump to the source page for the full context.",
    emoji: "🎯",
  },
  {
    placement: "center",
    title: "Pre-sale signals are highlighted",
    body: "Guest doubts (questions from the public site) and new leads get an accent border because they're the highest revenue-sensitive items. You see those first.",
    emoji: "💸",
  },
]

type InboxKind = "question" | "discussion" | "batch" | "lead" | "blog" | "quiz" | "assignment"
type ItemStatus = "active" | "resolved"

interface InboxItem {
  id: string
  kind: InboxKind
  title: string
  preview: string
  who?: string
  createdAt: string
  href: string
  accent: "default" | "warm"
  status: ItemStatus
  // Reply payload — populated for kinds that support inline reply.
  // null when the row is purely a deep-link (batch posts, blog comments).
  replyContext?: ReplyContext | null
}

type ReplyContext =
  | { kind: "doubt"; doubt: Doubt }
  | { kind: "discussion"; discussion: Discussion }
  | { kind: "lead"; lead: PortalLead }

// Internal kind identifiers stay as-is (we still surface legacy
// "discussion" rows from the merged Discussions page), but visible
// labels reflect the new Communities-as-canonical naming. "batch"
// rows are posts inside a community feed; they show up as "Community".
const KIND_LABELS: Record<InboxKind, string> = {
  question: "Question",
  discussion: "Community",
  batch: "Community",
  lead: "Lead",
  blog: "Blog",
  quiz: "Quiz",
  assignment: "Assignment",
}

const KIND_ICONS: Record<InboxKind, typeof FileQuestion> = {
  question: FileQuestion,
  discussion: Users2,
  batch: Users2,
  lead: Briefcase,
  blog: MessageCircle,
  quiz: ClipboardCheck,
  assignment: ClipboardCheck,
}

// Filter pills — Discussions and Batches were two separate sources
// of the same thing; we collapse them into one "Communities" pill.
// The filter's id stays "batch" because that's what new posts use;
// the label tells the user what they're actually seeing.
const FILTERS: { id: "all" | InboxKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "question", label: "Questions" },
  { id: "batch", label: "Communities" },
  { id: "lead", label: "Leads" },
  { id: "blog", label: "Blog" },
  // Student quiz submissions surface here via the notification
  // fallback below — no separate source-row scan because there's no
  // inline-grade flow inside the inbox (clicking deep-links to the
  // quiz review page).
  { id: "quiz", label: "Quizzes" },
  // Assignments — same notification-fallback pattern as quizzes.
  // Covers three actionable events: assignment/project/test
  // published (visible to the publisher as confirmation),
  // assignment.submitted (teacher needs to grade), and
  // assignment.graded (student got their result). Clicking
  // deep-links to the assignment detail page where the row is
  // actionable. Without this pill assignment notifications
  // landed in the bell but never showed up in the unified inbox
  // teachers were trained to triage from.
  { id: "assignment", label: "Assignments" },
]

function strip(html: string, max = 140): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

function timeAgo(iso: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function InboxPage() {
  const {
    doubts,
    discussions,
    studentGroups,
    batchPosts,
    notifications,
    sentEmails,
    getUserById,
    currentUser,
    users,
    replyToDoubt,
    setDoubtStatus,
    addReply,
    addNotifications,
  } = useLMS()
  const { leads, posts, updateLead } = usePortal()
  const [filter, setFilter] = useState<"all" | InboxKind>("all")
  // Default to "needs attention" — that's the highest-signal view. The
  // user toggles to "all" when they're trying to find an old item they
  // already triaged (which would otherwise vanish from the feed).
  // Inbox modes:
  //   needs  → unresolved incoming items (default)
  //   all    → resolved/contacted incoming items too
  //   sent   → outbound emails we fired (replies, support acks, etc.)
  const [mode, setMode] = useState<"needs" | "all" | "sent">("needs")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Build the aggregated stream. Status filter applies based on `mode`.
  const items: InboxItem[] = useMemo(() => {
    const out: InboxItem[] = []
    const showAll = mode === "all"

    // 1. Doubts — open ones always; resolved ones only in "show all".
    for (const d of doubts) {
      const isOpen = d.status === "open"
      if (!isOpen && !showAll) continue
      const studentName = d.guest?.name ?? getUserById(d.studentId)?.name ?? "Student"
      out.push({
        id: `doubt-${d.id}`,
        kind: "question",
        title: d.title || "Untitled question",
        preview: strip(d.body) || "(no body)",
        who: studentName,
        createdAt: d.createdAt,
        href: `/dashboard/doubts`,
        accent: d.guest ? "warm" : "default",
        status: isOpen ? "active" : "resolved",
        replyContext: { kind: "doubt", doubt: d },
      })
    }

    // 2. Discussions — unresolved + needs-reply by default; everything
    // in show-all.
    for (const d of discussions) {
      const replies = d.replies ?? []
      const last = replies[replies.length - 1]
      const needsReply = !d.isResolved && (replies.length === 0 || last.authorId !== currentUser?.id)
      if (!needsReply && !showAll) continue
      out.push({
        id: `discussion-${d.id}`,
        kind: "discussion",
        title: d.title,
        preview: strip(d.content) || strip(last?.content ?? ""),
        who: getUserById(d.authorId)?.name,
        createdAt: last?.createdAt ?? d.createdAt,
        href: `/dashboard/discussions`,
        accent: "default",
        status: d.isResolved ? "resolved" : "active",
        replyContext: { kind: "discussion", discussion: d },
      })
    }

    // 3. Batch posts — last 7 days for admin/instructor, regardless of
    // mode (no "status" concept). Hidden posts excluded always.
    if (currentUser?.role === "admin" || currentUser?.role === "instructor") {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      for (const p of batchPosts) {
        if (p.hidden) continue
        if (new Date(p.createdAt).getTime() < sevenDaysAgo) continue
        if (p.authorId === currentUser?.id) continue
        const batch = studentGroups.find((b) => b.id === p.batchId)
        out.push({
          id: `batch-${p.id}`,
          kind: "batch",
          title: `New post in ${batch?.name ?? "a community"}`,
          preview: strip(p.body) || "(no text)",
          who: getUserById(p.authorId)?.name,
          createdAt: p.createdAt,
          href: batch ? `/dashboard/batches/${batch.id}` : `/dashboard/batches`,
          accent: "default",
          status: "active",
          // Replies on batch posts happen on the source page; we don't
          // duplicate the composer here.
          replyContext: null,
        })
      }
    }

    // 4. Leads — "new" status by default; everything in show-all. Warm
    // accent for new leads (highest revenue signal).
    for (const l of leads) {
      const isNew = l.status === "new"
      if (!isNew && !showAll) continue
      out.push({
        id: `lead-${l.id}`,
        kind: "lead",
        title: l.name ? `${l.name} reached out` : `New lead from ${l.pageSlug}`,
        preview: l.message ? strip(l.message) : l.email,
        who: l.email,
        createdAt: l.createdAt,
        href: "/dashboard/portal/leads",
        accent: isNew ? "warm" : "default",
        status: isNew ? "active" : "resolved",
        replyContext: { kind: "lead", lead: l },
      })
    }

    // 5. Blog comments — unread, based on each post's per-post review
    // marker. No "status" — once you visit the blog page the marker
    // updates and the row vanishes.
    for (const p of posts) {
      const reviewedAt = p.lastCommentsReviewedAt
        ? new Date(p.lastCommentsReviewedAt).getTime()
        : 0
      const unread = (p.comments ?? []).filter(
        (c) => new Date(c.createdAt).getTime() > reviewedAt,
      )
      if (unread.length === 0) continue
      const newest = unread[unread.length - 1]
      out.push({
        id: `blog-${p.id}`,
        kind: "blog",
        title: `${unread.length} new comment${unread.length === 1 ? "" : "s"} on "${p.title}"`,
        preview: strip(newest.body) || "(no body)",
        who: newest.authorName,
        createdAt: newest.createdAt,
        href: `/dashboard/portal/blog`,
        accent: "default",
        status: "active",
        replyContext: null,
      })
    }

    // 6. Notifications pulled through.
    //
    // The bell can show items the source-data scans above missed —
    // e.g. a doubt whose source row was deleted or whose status filter
    // excluded it. We surface those notifications as inbox rows so the
    // user never wonders "why is the bell loud but the inbox empty?".
    //
    // Dedup against existing rows by meta IDs so we don't double up
    // when both the notification AND the source exist.
    if (currentUser) {
      // Build lookup sets of source IDs already represented.
      const seenDoubtIds = new Set<string>()
      const seenLeadIds = new Set<string>()
      const seenDiscussionIds = new Set<string>()
      const seenPostIds = new Set<string>()
      for (const r of out) {
        if (r.replyContext?.kind === "doubt") seenDoubtIds.add(r.replyContext.doubt.id)
        if (r.replyContext?.kind === "lead") seenLeadIds.add(r.replyContext.lead.id)
        if (r.replyContext?.kind === "discussion") seenDiscussionIds.add(r.replyContext.discussion.id)
        if (r.id.startsWith("batch-")) seenPostIds.add(r.id.slice("batch-".length))
      }
      // Recent unread in-app notifications addressed to the current user.
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      // Per-user muted thread set — community comment notifications
      // for muted posts get hidden from the inbox so the mute action
      // actually quiets things. Mentions still pass through (loud
      // by definition). Read once per filter pass; the Set is O(1).
      const mutedPostIds = getMutedThreadIds(currentUser.id)
      const eligible = notifications.filter((n) => {
        if (n.userId !== currentUser.id) return false
        if (n.channel !== "in-app") return false
        // Show orphaned notifications even if they are read, so they don't disappear from the inbox if the source object is lost.
        // if (n.status === "read") return false
        if (new Date(n.createdAt).getTime() < cutoff) return false
        // Only types that look like something the user can act on.
        // Status pings ("X graded your assignment") stay in the bell.
        const t = n.type
        if (
          t === "batch-comment" &&
          typeof n.meta?.postId === "string" &&
          mutedPostIds.has(n.meta.postId as string)
        ) {
          return false
        }
        return (
          t === "doubt.received" ||
          t === "doubt.replied" ||
          t === "enquiry.received" ||
          t === "lead.received" ||
          t === "lead.replied" ||
          t === "discussion.replied" ||
          t === "discussion.received" ||
          t === "batch-post" ||
          t === "batch-comment" ||
          t === "batch-mention" ||
          // Student quiz submissions — added so teachers can triage
          // submissions from the same surface as questions/leads
          // instead of relying on the bell only. Fired by
          // submitQuizAttempt in lms-store via quizSubmittedNotification.
          t === "quiz.submitted" ||
          // Assignments / projects / tests — every actionable
          // event in the assignment lifecycle. `assignment.published`
          // (and the project/test variants) fires when the teacher
          // publishes one; `assignment.submitted` fires when a
          // student submits and the teacher needs to grade;
          // `assignment.graded` fires for the student. All three
          // belong in the inbox so the teacher (and student) can
          // triage from one place instead of hunting the bell.
          t === "assignment.published" ||
          t === "project.published" ||
          t === "test.published" ||
          t === "assignment.submitted" ||
          t === "assignment.graded" ||
          // Live poll launch + result broadcast — fanned out to
          // every enrolled student + invited co-instructor when
          // the host opens / closes a poll in the live class.
          // Lands in the bell *and* the inbox so visitors who
          // missed the in-call moment see what happened later.
          t === "live-poll.launched" ||
          t === "live-poll.closed"
        )
      })
      for (const n of eligible) {
        const meta = (n.meta ?? {}) as Record<string, unknown>
        const doubtId = typeof meta.doubtId === "string" ? meta.doubtId : null
        const leadId = typeof meta.leadId === "string" ? meta.leadId : null
        const discussionId = typeof meta.discussionId === "string" ? meta.discussionId : null
        const postId = typeof meta.postId === "string" ? meta.postId : null
        if (doubtId && seenDoubtIds.has(doubtId)) continue
        if (leadId && seenLeadIds.has(leadId)) continue
        if (discussionId && seenDiscussionIds.has(discussionId)) continue
        if (postId && seenPostIds.has(postId)) continue
        // Pick a kind based on the type. Default to "question" — most
        // notifications that surface here are doubt-related. Quiz
        // submissions get their own kind so the new "Quizzes" filter
        // pill can scope to them (and the icon picker renders a
        // ClipboardCheck instead of the question mark). Same for
        // assignments / projects / tests — all three normalise to
        // the "assignment" inbox kind so the new pill catches them.
        const kind: InboxKind = (n.type.startsWith("lead") || n.type === "enquiry.received")
          ? "lead"
          : n.type.startsWith("discussion")
            ? "discussion"
            : n.type.startsWith("batch")
              ? "batch"
              : n.type === "quiz.submitted"
                ? "quiz"
                : n.type === "assignment.published" ||
                  n.type === "project.published" ||
                  n.type === "test.published" ||
                  n.type === "assignment.submitted" ||
                  n.type === "assignment.graded"
                  ? "assignment"
                  // Polls share the "question" kind icon (the
                  // FileQuestion glyph reads as "something the
                  // teacher is asking") and slot into the
                  // Questions pill. Polls are conceptually a
                  // question the host put to the room.
                  : n.type === "live-poll.launched" || n.type === "live-poll.closed"
                    ? "question"
                    : "question"
        // If the notification IS for a doubt/lead that still exists in
        // the source data, attach replyContext so the inline Reply UI
        // works. This covers the case where the source exists but was
        // filtered out by the status check.
        let replyContext: ReplyContext | null = null
        if (doubtId) {
          const d = doubts.find((x) => x.id === doubtId)
          if (d) replyContext = { kind: "doubt", doubt: d }
        } else if (leadId) {
          const l = leads.find((x) => x.id === leadId)
          if (l) replyContext = { kind: "lead", lead: l }
        } else if (discussionId) {
          const d = discussions.find((x) => x.id === discussionId)
          if (d) replyContext = { kind: "discussion", discussion: d }
        }

        // If the source object is missing (e.g. deleted), we reconstruct a minimal fake context
        // so the user can still reply to the notification (which will send an email/whatsapp).
        if (!replyContext) {
          if (n.type === "enquiry.received" && doubtId && meta.guestEmail) {
            replyContext = {
              kind: "doubt",
              doubt: {
                id: doubtId,
                title: n.title,
                body: n.body,
                status: "open",
                courseId: typeof meta.courseId === "string" ? meta.courseId : "",
                studentId: "guest",
                createdAt: n.createdAt,
                updatedAt: n.createdAt,
                replies: [],
                guest: {
                  name: n.title.replace("Pre-sale question from ", ""),
                  email: meta.guestEmail as string,
                },
              },
            }
          } else if (n.type === "lead.received" && leadId) {
            const leadEmail = (meta.leadEmail as string) || (n.body.includes("@") ? n.body.split(" ")[0] : "unknown@guest.com")
            replyContext = {
              kind: "lead",
              lead: {
                id: leadId,
                email: leadEmail,
                formId: "synthetic",
                pageSlug: "/",
                status: "new",
                createdAt: n.createdAt,
                name: n.title.replace("New lead: ", "").replace(" reached out", ""),
              },
            }
          }
        }
        out.push({
          id: `notif-${n.id}`,
          kind,
          title: n.title,
          preview: n.body,
          createdAt: n.createdAt,
          href: n.url || "/dashboard",
          accent: kind === "lead" ? "warm" : "default",
          status: "active",
          replyContext,
        })
      }
    }

    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [doubts, discussions, batchPosts, studentGroups, leads, posts, notifications, getUserById, currentUser, mode])

  const visible = filter === "all" ? items : items.filter((i) => i.kind === filter)

  const counts = useMemo(() => {
    const c: Record<InboxKind | "all", number> = {
      all: items.length,
      question: 0,
      discussion: 0,
      batch: 0,
      lead: 0,
      blog: 0,
      quiz: 0,
      assignment: 0,
    }
    for (const i of items) c[i.kind]++
    return c
  }, [items])

  // Reply handler — dispatches to the right reply API + fans out a
  // notification across in-app + email + WhatsApp for the OP.
  function handleReply(item: InboxItem, replyBody: string): boolean {
    if (!item.replyContext || !replyBody.trim()) return false
    if (!currentUser) {
      toast.error("You need to be signed in to reply.")
      return false
    }
    const ctx = item.replyContext
    const trimmed = replyBody.trim()
    const now = new Date().toISOString()

    if (ctx.kind === "doubt") {
      replyToDoubt(ctx.doubt.id, {
        id: generateId("dr"),
        authorId: currentUser.id,
        body: trimmed,
        createdAt: now,
      })
      // Find the OP: a real user when student account, or a guest with
      // captured email + optional WhatsApp number.
      const opUser = ctx.doubt.guest
        ? // Synthesise a one-off User for the notification builder so
          // email + WhatsApp dispatch can still fire. The builder
          // expects `email` / `phone` on each user, which the guest
          // capture provides.
          {
            id: `guest:${ctx.doubt.id}`,
            name: ctx.doubt.guest.name,
            email: ctx.doubt.guest.email,
            phone: ctx.doubt.guest.whatsapp,
            role: "student" as const,
            createdAt: ctx.doubt.createdAt,
          }
        : users.find((u) => u.id === ctx.doubt.studentId)
      if (opUser) {
        addNotifications(
          buildNotifications([opUser], {
            type: "doubt.replied",
            title: `${currentUser.name} replied to your question`,
            body: strip(trimmed, 200) || "(see reply on the doubts page)",
            url: `/dashboard/doubts`,
            meta: { doubtId: ctx.doubt.id },
          }, { channels: ["in-app", "email", "whatsapp"] }),
        )
      }
      toast.success("Reply sent")
      return true
    }

    if (ctx.kind === "discussion") {
      addReply(ctx.discussion.id, {
        id: generateId("dr"),
        authorId: currentUser.id,
        content: trimmed,
        isAnswer: false,
        createdAt: now,
      })
      const opUser = users.find((u) => u.id === ctx.discussion.authorId)
      if (opUser) {
        addNotifications(
          buildNotifications([opUser], {
            type: "discussion.replied",
            title: `${currentUser.name} replied in "${ctx.discussion.title}"`,
            body: strip(trimmed, 200) || "(see the thread)",
            url: `/dashboard/discussions`,
            meta: { discussionId: ctx.discussion.id },
          }, { channels: ["in-app", "email", "whatsapp"] }),
        )
      }
      toast.success("Reply sent")
      return true
    }

    if (ctx.kind === "lead") {
      // Leads don't have a reply collection — we append a note and bump
      // status to "contacted" so the inbox naturally moves on.
      const existingNotes = ctx.lead.notes ? `${ctx.lead.notes}\n\n` : ""
      const stamp = new Date().toLocaleString()
      const noteBlock = `[${stamp} · ${currentUser.name} replied]\n${trimmed}`
      updateLead(ctx.lead.id, {
        notes: `${existingNotes}${noteBlock}`,
        status: ctx.lead.status === "new" ? "contacted" : ctx.lead.status,
      })
      // The lead is a guest — synthesise a User shape so the email +
      // WhatsApp stubs can fire. In-app channel is dropped because
      // they have no account.
      const guestUser = {
        id: `lead:${ctx.lead.id}`,
        name: ctx.lead.name || "Lead",
        email: ctx.lead.email,
        phone: ctx.lead.phone,
        role: "student" as const,
        createdAt: ctx.lead.createdAt,
      }
      addNotifications(
        buildNotifications([guestUser], {
          type: "lead.replied",
          title: `${currentUser.name} replied`,
          body: strip(trimmed, 200),
          url: `/dashboard/portal/leads`,
          meta: { leadId: ctx.lead.id },
        }, { channels: ["in-app", "email", "whatsapp"] }),
      )
      toast.success("Reply sent — lead marked as contacted")
      return true
    }

    return false
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <InboxIcon className="h-6 w-6 text-primary" />
            Inbox
          </h1>
          <p className="text-muted-foreground">
            Everything that needs your attention, in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <TakeATourButton tourId="inbox-v1" label="Take a tour" />
          {items.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {items.length} item{items.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
      </div>

      <ProductTour tourId="inbox-v1" steps={INBOX_TOUR} />

      {/* Mode switcher — Needs attention vs Show all vs Sent.
          Tracks the "where did my old item go" complaint by
          surfacing closed items too, plus a Sent view so admins
          can see every email we fired back out (replies, support
          acks, contact-form follow-ups). */}
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-border bg-card p-1" data-tour="inbox-mode">
        {(
          [
            { id: "needs", label: "Needs attention", hint: "Open + unresolved" },
            { id: "all", label: "Show all", hint: "Include resolved / contacted" },
            { id: "sent", label: "Sent", hint: "Outbound emails this workspace fired" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMode(opt.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              mode === opt.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
            title={opt.hint}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sent view — distinct render path from the incoming-inbox.
          Outbound emails carry their own shape (to/subject/preview/
          delivered) that doesn't fit the InboxItem type the rest of
          the page uses. Branch here to keep both renders simple. */}
      {mode === "sent" ? (
        <SentEmailsList sent={sentEmails} />
      ) : (
      <>
      {/* Kind filter pills */}
      <div className="flex flex-wrap gap-2" data-tour="inbox-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
            {counts[f.id] > 0 && (
              <span
                className={cn(
                  "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                  filter === f.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-foreground/70",
                )}
              >
                {counts[f.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="font-medium">All caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length === 0
                ? mode === "needs"
                  ? "Nothing needs your attention right now. Flip to Show all to see resolved items + handled leads."
                  : "No items at all yet. You'll see student questions, community posts, and new leads here as they come in."
                : "No items in this filter. Try selecting All to see the full inbox."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-tour="inbox-list">
          {visible.map((item) => (
            <InboxRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onReply={(body) => handleReply(item, body)}
              onMarkResolved={() => {
                if (item.replyContext?.kind === "doubt") {
                  setDoubtStatus(item.replyContext.doubt.id, "resolved")
                  toast.success("Marked resolved")
                }
              }}
            />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <p className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span>
            Click <span className="font-medium text-foreground">Reply</span> on any row to respond inline — your reply
            fires in-app + email + WhatsApp notifications to the original sender. Routine pings
            (reactions, milestones) still live in the bell.
          </span>
        </p>
      )}
      </>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Sent emails — what THIS workspace fired outward (replies, support
// acks, contact-form follow-ups). Different shape from InboxItem
// (outgoing has to/subject/preview/delivered, not author/kind/etc.)
// so it gets its own list renderer.
// ----------------------------------------------------------------
function SentEmailsList({ sent }: { sent: SentEmail[] }) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sent
    return sent.filter((s) => {
      if (s.subject.toLowerCase().includes(q)) return true
      if (s.preview.toLowerCase().includes(q)) return true
      const tos = Array.isArray(s.to) ? s.to.join(" ") : s.to
      if (tos.toLowerCase().includes(q)) return true
      if (s.fromName?.toLowerCase().includes(q)) return true
      return false
    })
  }, [sent, query])

  if (sent.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Send className="h-5 w-5" />
          </div>
          <p className="font-medium">No outbound emails yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Every email this workspace sends — doubt replies, support acknowledgements, contact-form follow-ups — will show up here as a clean audit log.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search sent — subject, recipient, body…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No sent emails match &ldquo;{query}&rdquo;.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const toLabel = Array.isArray(s.to) ? s.to.join(", ") : s.to
            const when = new Date(s.sentAt)
            return (
              <Card key={s.id} className="overflow-hidden">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Send className="h-3.5 w-3.5 text-primary" />
                        <p className="truncate text-sm font-semibold">{s.subject}</p>
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            s.delivered
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {s.delivered ? "Delivered" : "Stub / undelivered"}
                        </span>
                        {s.kind && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {s.kind}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">To:</span> {toLabel}
                        {s.fromName ? ` · from ${s.fromName}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                      {when.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                      {when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {s.preview && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.preview}</p>
                  )}
                  {s.contextUrl && (
                    <Link
                      href={s.contextUrl}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open source →
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Row component — handles its own expand/collapse + reply textarea.
// Kept inline (not memoised) because the list is small (<100 rows)
// and the parent re-renders any time the data changes anyway.
// ----------------------------------------------------------------
function InboxRow({
  item,
  expanded,
  onExpand,
  onReply,
  onMarkResolved,
}: {
  item: InboxItem
  expanded: boolean
  onExpand: () => void
  onReply: (body: string) => boolean
  onMarkResolved: () => void
}) {
  const Icon = KIND_ICONS[item.kind]
  const [replyBody, setReplyBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const canReply = !!item.replyContext

  function submit() {
    if (!replyBody.trim() || submitting) return
    setSubmitting(true)
    const ok = onReply(replyBody)
    setSubmitting(false)
    if (ok) {
      setReplyBody("")
      onExpand() // collapse after send
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        item.accent === "warm"
          ? "border-accent/40 bg-accent/[0.04]"
          : "border-border bg-card",
        item.status === "resolved" && "opacity-75",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            item.accent === "warm"
              ? "bg-accent/15 text-accent"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <Link
              href={item.href}
              className="truncate text-sm font-semibold hover:underline"
            >
              {item.title}
            </Link>
            <Badge variant="outline" className="text-[9px] uppercase tracking-wide">
              {KIND_LABELS[item.kind]}
            </Badge>
            {item.status === "resolved" && (
              <Badge variant="outline" className="border-success/40 bg-success/5 text-[9px] uppercase tracking-wide text-success">
                <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                Resolved
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">
              {item.who && `${item.who} · `}
              {timeAgo(item.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {item.preview}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canReply && (
            <Button
              variant={expanded ? "outline" : "ghost"}
              size="sm"
              onClick={onExpand}
              title={expanded ? "Hide reply box" : "Reply inline"}
            >
              {expanded ? (
                <>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Close
                </>
              ) : (
                <>
                  <Reply className="mr-1 h-3.5 w-3.5" />
                  Reply
                </>
              )}
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" title="Open source page">
            <Link href={item.href}>Open →</Link>
          </Button>
        </div>
      </div>

      {expanded && canReply && (
        <div className="space-y-2 border-t border-border/60 bg-muted/20 p-3">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={
              item.replyContext?.kind === "lead"
                ? "Reply by email + WhatsApp. The lead will be marked as contacted."
                : "Reply to the original poster. Fires in-app + email + WhatsApp."
            }
            rows={3}
            className="text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Sends to {item.who ?? "the original sender"} via{" "}
              {item.replyContext?.kind === "lead" ? "email + WhatsApp" : "in-app + email + WhatsApp"}.
            </p>
            <div className="flex items-center gap-2">
              {item.replyContext?.kind === "doubt" && item.status === "active" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkResolved}
                  title="Close the doubt without sending a reply"
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Mark resolved
                </Button>
              )}
              <Button
                size="sm"
                onClick={submit}
                disabled={!replyBody.trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                )}
                Send reply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
