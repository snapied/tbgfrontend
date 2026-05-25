"use client"

// Threaded comments for a Doc. Top-level + single-depth replies
// (Slack pattern, covers ~95% of real threading). Resolve/unresolve.
// Reactions on top-level comments. Mentions fire notifications via
// the existing dispatcher (wired at parent).

import { useState } from "react"
import { Check, MessageSquarePlus, Reply, RotateCcw, Smile, Trash2 } from "lucide-react"
import { useLMS } from "@/lib/lms-store"
import { useDocs, type DocComment } from "@/lib/docs"

interface Props {
  docId: string
  /** Called whenever a fresh comment / reply is posted so the parent
   *  can fire mention notifications. */
  onCommentPosted?: (comment: DocComment) => void
}

function formatRel(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  const sec = Math.max(1, Math.floor(ms / 1000))
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  return `${day}d`
}

export function DocCommentsPanel({ docId, onCommentPosted }: Props) {
  const { getDoc, addComment, updateComment, removeComment } = useDocs()
  const { currentUser, getUserById } = useLMS()
  const doc = getDoc(docId)
  const [showResolved, setShowResolved] = useState(false)
  const [draft, setDraft] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState("")

  if (!doc) return null

  const all = doc.comments ?? []
  const visible = showResolved ? all : all.filter((c) => !c.resolved)

  function postTop() {
    if (!draft.trim() || !currentUser) return
    const c: DocComment = {
      id: `dcm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId: currentUser.id,
      body: draft.trim(),
      resolved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addComment(docId, c)
    onCommentPosted?.(c)
    setDraft("")
  }

  function postReply(parent: DocComment) {
    if (!replyDraft.trim() || !currentUser) return
    const reply = {
      id: `dcm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId: currentUser.id,
      body: replyDraft.trim(),
      createdAt: new Date().toISOString(),
    }
    updateComment(docId, parent.id, {
      replies: [...(parent.replies ?? []), reply],
    })
    // Surface the reply as a comment-shaped payload for notifications.
    onCommentPosted?.({
      ...parent,
      body: replyDraft.trim(),
      replies: undefined,
    })
    setReplyDraft("")
    setReplyTo(null)
  }

  function toggleReaction(c: DocComment, emoji: string) {
    if (!currentUser) return
    const current = c.reactions ?? {}
    const ids = new Set(current[emoji] ?? [])
    if (ids.has(currentUser.id)) ids.delete(currentUser.id)
    else ids.add(currentUser.id)
    const next: Record<string, string[]> = { ...current }
    if (ids.size === 0) delete next[emoji]
    else next[emoji] = [...ids]
    updateComment(docId, c.id, { reactions: next })
  }

  return (
    <div className="space-y-3">
      {/* New top-level comment */}
      {currentUser && (
        <div className="rounded-lg border border-border bg-card p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Comment on this doc… @mention to ping someone"
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            maxLength={1500}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") postTop()
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter to post</p>
            <button
              type="button"
              onClick={postTop}
              disabled={!draft.trim()}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageSquarePlus className="h-3 w-3" />
              Post
            </button>
          </div>
        </div>
      )}

      {/* Toggle: resolved comments */}
      {all.length > 0 && (
        <div className="flex items-center justify-between text-[11px]">
          <p className="font-semibold text-muted-foreground">
            {visible.length} {visible.length === 1 ? "comment" : "comments"}
            {all.length > visible.length && (
              <span className="ml-1 text-muted-foreground/60">
                · {all.length - visible.length} resolved
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setShowResolved((v) => !v)}
            className="text-primary hover:underline"
          >
            {showResolved ? "Hide resolved" : "Show all"}
          </button>
        </div>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-[11px] text-muted-foreground">
          No comments yet. Highlight a passage with your cursor or post above.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => {
            const author = getUserById(c.authorId)
            return (
              <li
                key={c.id}
                className={`rounded-lg border bg-card p-3 ${c.resolved ? "border-success/30 opacity-70" : "border-border"}`}
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {(author?.name ?? "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-[12.5px] font-semibold">{author?.name ?? "Unknown"}</p>
                      <span className="text-[10px] text-muted-foreground">· {formatRel(c.createdAt)}</span>
                      {c.resolved && (
                        <span className="ml-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed">{c.body}</p>

                    {/* Reactions row */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {Object.entries(c.reactions ?? {}).map(([emoji, ids]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => toggleReaction(c, emoji)}
                          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[11px] transition-colors ${
                            currentUser && ids.includes(currentUser.id)
                              ? "border-primary bg-primary/[0.08] text-primary"
                              : "border-border bg-background hover:bg-muted/40"
                          }`}
                        >
                          {emoji}
                          <span className="tabular-nums">{ids.length}</span>
                        </button>
                      ))}
                      {currentUser && (
                        <details className="relative">
                          <summary className="cursor-pointer list-none rounded-full border border-border bg-background px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted/40">
                            <Smile className="h-3 w-3" />
                          </summary>
                          <div className="absolute left-0 top-full z-10 mt-1 flex gap-0.5 rounded-md border border-border bg-card p-1 shadow-md">
                            {["👍", "❤️", "🎉", "🤔", "👀", "✅"].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => toggleReaction(c, emoji)}
                                className="rounded p-1 hover:bg-muted"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    {/* Replies */}
                    {(c.replies?.length ?? 0) > 0 && (
                      <ul className="mt-2.5 space-y-2 border-l-2 border-border pl-3">
                        {c.replies?.map((r) => {
                          const rAuthor = getUserById(r.authorId)
                          return (
                            <li key={r.id} className="text-[12px]">
                              <div className="flex items-baseline gap-1.5">
                                <p className="font-semibold">{rAuthor?.name ?? "Unknown"}</p>
                                <span className="text-[10px] text-muted-foreground">· {formatRel(r.createdAt)}</span>
                              </div>
                              <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    {/* Reply composer */}
                    {replyTo === c.id ? (
                      <div className="mt-2 border-l-2 border-primary pl-3">
                        <textarea
                          autoFocus
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          placeholder="Reply…"
                          rows={2}
                          className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                          maxLength={1500}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") postReply(c)
                            if (e.key === "Escape") { setReplyTo(null); setReplyDraft("") }
                          }}
                        />
                        <div className="mt-1 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setReplyTo(null); setReplyDraft("") }}
                            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => postReply(c)}
                            disabled={!replyDraft.trim()}
                            className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground disabled:opacity-50"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                        {currentUser && (
                          <button
                            type="button"
                            onClick={() => setReplyTo(c.id)}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Reply className="h-2.5 w-2.5" /> Reply
                          </button>
                        )}
                        {currentUser && (currentUser.id === c.authorId || currentUser.role === "admin" || currentUser.role === "instructor") && (
                          <button
                            type="button"
                            onClick={() => updateComment(docId, c.id, { resolved: !c.resolved })}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            {c.resolved ? (
                              <><RotateCcw className="h-2.5 w-2.5" /> Re-open</>
                            ) : (
                              <><Check className="h-2.5 w-2.5" /> Resolve</>
                            )}
                          </button>
                        )}
                        {currentUser && currentUser.id === c.authorId && (
                          <button
                            type="button"
                            onClick={() => removeComment(docId, c.id)}
                            className="inline-flex items-center gap-1 hover:text-destructive"
                          >
                            <Trash2 className="h-2.5 w-2.5" /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
