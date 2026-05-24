"use client"

// ReviewPanel — slide-in side panel that surfaces a `useReviewThread`
// API as a Figma-style comments stream. The host page passes a list of
// `anchorOptions` so the "Add a note on" dropdown can pick a specific
// field/section (e.g. "Primary colour", "Header layout") OR a free-
// floating note.
//
// Resolved threads stay in the audit trail but collapse below an
// "N resolved" disclosure.

import { useState } from "react"
import {
  Check,
  CornerDownRight,
  MessageSquarePlus,
  Send,
  Trash2,
  Undo2,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type {
  ReviewAnchor,
  ReviewComment,
  UseReviewThreadApi,
} from "@/lib/review-store"

interface AnchorOption {
  /** Stable id (e.g. "primaryColor", "section-hero"). */
  target: string
  /** Display label ("Primary colour"). */
  label: string
  kind: "field" | "section"
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  api: UseReviewThreadApi
  /** Anchor options for the "Add comment on…" dropdown. */
  anchorOptions?: AnchorOption[]
  /** Title shown in the sheet header. */
  title?: string
  /** Description copy under the title. */
  description?: string
  /** Optional callback fired when the user clicks an anchored
   *  comment — host can scroll the field into view + highlight it. */
  onAnchorClick?: (anchor: ReviewAnchor) => void
}

export function ReviewPanel({
  open,
  onOpenChange,
  api,
  anchorOptions,
  title = "Reviews",
  description = "Threaded comments anchored to specific fields. Share the preview link to invite teammates.",
  onAnchorClick,
}: Props) {
  const [draft, setDraft] = useState("")
  const [anchorTarget, setAnchorTarget] = useState<string>("_free")
  const [showResolved, setShowResolved] = useState(false)

  const submitTop = () => {
    const anchor: ReviewAnchor =
      anchorTarget === "_free"
        ? { kind: "free" }
        : (() => {
            const opt = anchorOptions?.find((o) => o.target === anchorTarget)
            return opt
              ? { kind: opt.kind, target: opt.target, label: opt.label }
              : { kind: "free" }
          })()
    const added = api.add(draft, anchor)
    if (added) setDraft("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="pr-12">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            {title}
            {api.openCount > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                {api.openCount} open
              </span>
            )}
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        {/* Composer. Horizontal padding intentionally lives on the
            inner sections (composer + thread list) rather than the
            SheetContent so the bottom-most thread item bleeds to the
            edge of the scroll viewport without a phantom gap. */}
        <div className="mt-4 space-y-2 border-b border-border px-4 pb-4">
          {anchorOptions && anchorOptions.length > 0 && (
            <Select value={anchorTarget} onValueChange={setAnchorTarget}>
              <SelectTrigger className="text-[12px]">
                <SelectValue placeholder="Pick a field to anchor to" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_free">No specific anchor</SelectItem>
                {anchorOptions.map((o) => (
                  <SelectItem key={o.target} value={o.target}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Leave a note for the team…"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] text-muted-foreground">
              Cmd/Ctrl + Enter to send.
            </p>
            <Button
              size="sm"
              onClick={submitTop}
              disabled={!draft.trim()}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pt-4 pb-4">
          {api.open.length === 0 && api.resolved.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-[12px] text-muted-foreground">
              No comments yet. Share the preview link to invite teammates.
            </p>
          ) : (
            <>
              {api.open.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  api={api}
                  onAnchorClick={onAnchorClick}
                />
              ))}

              {api.resolved.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResolved((v) => !v)}
                    className="w-full text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    {showResolved ? "Hide" : "Show"} {api.resolved.length} resolved
                  </button>
                  {showResolved && (
                    <div className="mt-2 space-y-3">
                      {api.resolved.map((c) => (
                        <CommentCard
                          key={c.id}
                          comment={c}
                          api={api}
                          onAnchorClick={onAnchorClick}
                          collapsed
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CommentCard({
  comment,
  api,
  onAnchorClick,
  collapsed,
}: {
  comment: ReviewComment
  api: UseReviewThreadApi
  onAnchorClick?: (anchor: ReviewAnchor) => void
  collapsed?: boolean
}) {
  const [replyDraft, setReplyDraft] = useState("")
  const [replyOpen, setReplyOpen] = useState(false)
  const anchorLabel =
    comment.anchor.kind !== "free" ? comment.anchor.label ?? comment.anchor.target : null

  return (
    <div
      className={cn(
        "rounded-md border bg-card p-3",
        collapsed ? "border-border/50 opacity-75" : "border-border",
        comment.resolved && !collapsed && "opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {anchorLabel && (
            <button
              type="button"
              onClick={() => onAnchorClick?.(comment.anchor)}
              className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
            >
              {anchorLabel}
            </button>
          )}
          <p className="text-[12px] font-semibold">{comment.authorName}</p>
          <p className="text-[10.5px] text-muted-foreground">
            {formatTime(comment.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title={comment.resolved ? "Re-open" : "Resolve"}
            onClick={() => api.toggleResolve(comment.id)}
          >
            {comment.resolved ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Delete"
            className="text-destructive hover:text-destructive"
            onClick={() => api.remove(comment.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[12.5px]">{comment.body}</p>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-border/50 pl-3">
          {comment.replies.map((r) => (
            <div key={r.id} className="text-[12px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.authorName}</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {formatTime(r.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => api.removeReply(comment.id, r.id)}
                  title="Delete reply"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply composer */}
      {!comment.resolved && !collapsed && (
        <div className="mt-3">
          {replyOpen ? (
            <div className="space-y-2">
              <Textarea
                autoFocus
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Reply…"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    api.reply(comment.id, replyDraft)
                    setReplyDraft("")
                    setReplyOpen(false)
                  }
                }}
              />
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setReplyOpen(false); setReplyDraft("") }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!replyDraft.trim()}
                  onClick={() => {
                    api.reply(comment.id, replyDraft)
                    setReplyDraft("")
                    setReplyOpen(false)
                  }}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-[11px]"
              onClick={() => setReplyOpen(true)}
            >
              <CornerDownRight className="h-3 w-3" />
              Reply
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}
