"use client"

// Doubts inbox — every student question across every course in one
// place. Each row expands inline to show the full thread + reply box.
// Navigating to the detail page is optional (link in the expanded view).

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ExternalLink,
  Filter,
  Inbox,
  MessageCircleQuestion,
  Send,
  Search,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { RichTextContent, isRichTextEmpty } from "@/components/editor/rich-text-content"
import { cn } from "@/lib/utils"
import {
  generateId,
  useLMS,
  type Doubt,
  type DoubtReply,
  type Notification,
} from "@/lib/lms-store"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Columns3, List } from "lucide-react"
import { KanbanBoard, KanbanCard, type KanbanColumn } from "@/components/kanban/kanban-board"
import { useStickyView } from "@/lib/use-sticky-view"

const DOUBTS_TOUR: TourStep[] = [
  {
    title: "All student questions in one inbox",
    body: "Doubts asked from any course lesson land here. Click a row to expand and reply inline.",
    emoji: "❓",
    placement: "center",
  },
  {
    target: "[data-tour='doubts-status']",
    title: "Filter by status",
    body: "Default view is the Open queue. Switch to Resolved or All when you want to revisit a thread.",
    emoji: "🎛️",
    placement: "bottom",
  },
  {
    target: "[data-tour='doubts-search']",
    title: "Fuzzy search",
    body: "Search across question text and student name — typos welcome.",
    emoji: "🔍",
    placement: "bottom",
  },
  {
    title: "Reply right from the list",
    body: "Click any row to expand the thread and reply inline. No need to navigate away unless you want to see the full student profile.",
    emoji: "✨",
    placement: "center",
  },
]

const STATUS_COLOR: Record<Doubt["status"], string> = {
  open: "bg-accent/15 text-accent",
  resolved: "bg-success/15 text-success",
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim()
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

export default function DoubtsInboxPage() {
  const {
    doubts, getUserById, getCourseById, replyToDoubt, setDoubtStatus,
    deleteDoubt, addNotifications, currentUser,
  } = useLMS()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("open")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyBodies, setReplyBodies] = useState<Record<string, string>>({})
  // Persisted list ↔ kanban toggle, scoped to this surface so it
  // doesn't bleed into the student-side board.
  const [view, setView] = useStickyView("teacher.doubts", "list")

  const filtered = useMemo(() => {
    const base = doubts.filter((d) => statusFilter === "all" || d.status === statusFilter)
    return fuzzySearch(base, search, (d) => [
      d.title,
      stripRichTextTags(d.body).slice(0, 200),
      getUserById(d.studentId)?.name ?? "",
    ])
  }, [doubts, search, statusFilter, getUserById])

  const counts = useMemo(
    () => ({
      open: doubts.filter((d) => d.status === "open").length,
      resolved: doubts.filter((d) => d.status === "resolved").length,
    }),
    [doubts],
  )

  const handleReply = async (doubt: Doubt) => {
    const body = replyBodies[doubt.id] ?? ""
    if (!currentUser || isRichTextEmpty(body)) return

    const reply: DoubtReply = {
      id: generateId("dreply"),
      authorId: currentUser.id,
      body,
      createdAt: new Date().toISOString(),
    }
    replyToDoubt(doubt.id, reply)
    setReplyBodies((prev) => ({ ...prev, [doubt.id]: "" }))
    toast.success("Reply sent.")

    const student = getUserById(doubt.studentId)
    const recipientEmail = doubt.guest?.email ?? student?.email
    const recipientName = doubt.guest?.name ?? student?.name ?? "there"

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
    if (recipientEmail) {
      try {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail,
            subject: `New reply on your question: ${doubt.title}`,
            replyTo: currentUser.email,
            html: `<p>Hi ${escapeHtml(recipientName.split(" ")[0] || recipientName)},</p><p>${escapeHtml(currentUser.name) || "Your instructor"} replied to your question <strong>"${escapeHtml(doubt.title)}"</strong>:</p><blockquote style="border-left:3px solid #d4af37;padding:8px 12px;margin:12px 0;background:#fafaf7">${body}</blockquote>`,
          }),
        })
      } catch { /* fine */ }
    }
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId="doubts-v1" steps={DOUBTS_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Doubts &amp; questions</h1>
          <p className="text-muted-foreground">
            Everything students have asked across every course. {counts.open} open ·{" "}
            {counts.resolved} resolved.
          </p>
        </div>
        <TakeATourButton tourId="doubts-v1" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1" data-tour="doubts-search">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search questions, students — typos OK"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44" data-tour="doubts-status">
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={(v) => setView(v as "list" | "kanban")}>
          <TabsList>
            <TabsTrigger value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="kanban" aria-label="Kanban view">
              <Columns3 className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "kanban" && filtered.length > 0 ? (
        <TeacherDoubtsKanban
          rows={filtered}
          getUserById={getUserById}
          getCourseById={getCourseById}
        />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              {statusFilter === "open" ? "No open questions" : "No matches"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter === "open"
                ? "Students can ask questions from their lesson player. They'll show up here for you to reply."
                : "Try clearing the search or switching filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((d) => {
            const student = getUserById(d.studentId)
            const course = d.courseId ? getCourseById(d.courseId) : undefined
            const askerName = d.guest?.name ?? student?.name ?? "Student"
            const isExpanded = expandedId === d.id
            const detailHref = d.guest
              ? `/dashboard/doubts/${d.id}`
              : `/dashboard/students/${d.studentId}`
            const replyBody = replyBodies[d.id] ?? ""

            return (
              <li key={d.id}>
                <div
                  className={cn(
                    "rounded-xl border border-border bg-card transition-all duration-200",
                    isExpanded && "border-primary/30 shadow-sm",
                  )}
                >
                  {/* ── Row header — always visible, click to expand ── */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    className="flex w-full items-start gap-3 p-4 text-left"
                  >
                    <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold leading-snug">{d.title}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            STATUS_COLOR[d.status],
                          )}
                        >
                          {d.status}
                        </span>
                        {d.guest && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                            Pre-sale
                          </span>
                        )}
                      </div>
                      {/* Preview — hidden when expanded */}
                      {!isExpanded && (
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                          {stripRichTextTags(d.body).slice(0, 160)}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {askerName}
                        {d.guest?.email && ` (${d.guest.email})`}
                        {course ? ` · ${course.title}` : ""}
                        {" · "}{new Date(d.createdAt).toLocaleDateString()}
                        {d.replies.length > 0 && ` · ${d.replies.length} ${d.replies.length === 1 ? "reply" : "replies"}`}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  {/* ── Expanded: thread + reply box ── */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                      {/* Question body */}
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                          {askerName} · {new Date(d.createdAt).toLocaleString()}
                        </p>
                        <RichTextContent html={d.body} className="text-sm" />
                      </div>

                      {/* Existing replies */}
                      {d.replies.length > 0 && (
                        <div className="space-y-2 border-l-2 border-primary/30 pl-3">
                          {d.replies.map((r) => {
                            const replier = getUserById(r.authorId)
                            return (
                              <div key={r.id} className="rounded-lg bg-primary/5 p-3">
                                <p className="text-[11px] font-semibold text-muted-foreground">
                                  {replier?.name ?? "Instructor"} · {new Date(r.createdAt).toLocaleString()}
                                </p>
                                <RichTextContent html={r.body} className="mt-1 text-sm" />
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Reply box */}
                      {d.status === "open" && (
                        <div className="space-y-2">
                          <RichTextEditor
                            value={replyBody}
                            onChange={(val) =>
                              setReplyBodies((prev) => ({ ...prev, [d.id]: val }))
                            }
                            placeholder="Write your reply…"
                            minHeight={100}
                          />
                          <div className="flex items-center justify-between gap-2">
                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDoubtStatus(d.id, d.status === "open" ? "resolved" : "open")
                                }
                              >
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                Mark resolved
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  deleteDoubt(d.id)
                                  setExpandedId(null)
                                  toastUndoableDelete({
                                    kind: "doubt",
                                    ids: d.id,
                                    label: d.title,
                                    itemNoun: "question",
                                  })
                                }}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Delete
                              </Button>
                              <Link
                                href={detailHref}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View details
                              </Link>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleReply(d)}
                              disabled={isRichTextEmpty(replyBody)}
                            >
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                              Send reply
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Resolved state — still show resolve/reopen + details link */}
                      {d.status === "resolved" && (
                        <div className="flex items-center justify-between rounded-lg bg-success/5 px-3 py-2">
                          <p className="text-xs text-success font-medium">✓ This question is resolved.</p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDoubtStatus(d.id, "open")}
                            >
                              <CircleDot className="mr-1.5 h-3.5 w-3.5" />
                              Reopen
                            </Button>
                            <Link
                              href={detailHref}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View details
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// Two-column board for the teacher inbox: Open / Resolved. Mirrors
// the same columns the student-side kanban uses so a teacher viewing
// the question and the student looking at their own thread see the
// same shape. Click jumps to the student-detail or the standalone
// doubt page (guest doubts).
function TeacherDoubtsKanban({
  rows,
  getUserById,
  getCourseById,
}: {
  rows: Doubt[]
  getUserById: (id: string) => { name?: string } | undefined
  getCourseById: (id: string) => { title?: string } | undefined
}) {
  const columns: Array<KanbanColumn<Doubt>> = [
    {
      key: "open",
      label: "Open",
      tone: "amber",
      rows: rows.filter((d) => d.status === "open"),
    },
    {
      key: "resolved",
      label: "Resolved",
      tone: "emerald",
      rows: rows.filter((d) => d.status === "resolved"),
    },
  ]
  return (
    <KanbanBoard
      columns={columns}
      keyOf={(d) => d.id}
      renderCard={(doubt) => {
        const student = getUserById(doubt.studentId)
        const course = doubt.courseId ? getCourseById(doubt.courseId) : undefined
        const askerName = doubt.guest?.name ?? student?.name ?? "Student"
        const detailHref = doubt.guest
          ? `/dashboard/doubts/${doubt.id}`
          : `/dashboard/students/${doubt.studentId}`
        return (
          <KanbanCard
            href={detailHref}
            title={doubt.title}
            subtitle={`${askerName}${course?.title ? ` · ${course.title}` : ""}`}
            meta={
              <span>
                {doubt.replies.length} repl
                {doubt.replies.length === 1 ? "y" : "ies"} ·{" "}
                {new Date(doubt.updatedAt).toLocaleDateString()}
              </span>
            }
          />
        )
      }}
    />
  )
}
