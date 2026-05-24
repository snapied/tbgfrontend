"use client"

// Universal review/comments primitive — used by Brand, Pages,
// Profile, Testimonials, Blog. The mental model is "Figma comments"
// adapted to a flat artifact: threaded annotations tied to either
// the whole document or a specific named anchor (a field id, a
// section id, a free-floating note).
//
// Storage shape:
//   `thebigclass.t.<slug>.reviews.<kind>.<artifactId>`
//   → ReviewComment[]
//
// Each comment can have replies. Resolved comments stay in storage
// but render collapsed so the audit trail survives.

import { useCallback, useEffect, useMemo, useState } from "react"

export type ReviewKind =
  | "brand"
  | "page"
  | "profile"
  | "testimonial"
  | "blog-post"
  | "course"

/** Where in the artifact the comment is anchored. `free` = no anchor. */
export type ReviewAnchor =
  | { kind: "free" }
  | { kind: "field"; target: string; label?: string }
  | { kind: "section"; target: string; label?: string }

export interface ReviewReply {
  id: string
  authorId?: string
  authorName: string
  body: string
  createdAt: string
}

export interface ReviewComment {
  id: string
  anchor: ReviewAnchor
  authorId?: string
  authorName: string
  body: string
  createdAt: string
  resolved?: boolean
  resolvedAt?: string
  resolvedByName?: string
  replies?: ReviewReply[]
}

function storageKey(tenantSlug: string, kind: ReviewKind, artifactId: string) {
  return `thebigclass.t.${tenantSlug || "default"}.reviews.${kind}.${artifactId}`
}

function loadReviews(key: string): ReviewComment[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ReviewComment[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveReviews(key: string, comments: ReviewComment[]): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(key, JSON.stringify(comments))
    return true
  } catch {
    return false
  }
}

export interface UseReviewThreadOptions {
  tenantSlug: string
  kind: ReviewKind
  artifactId: string
  actor?: { id?: string; name?: string }
}

export interface UseReviewThreadApi {
  /** All comments, sorted newest-first. */
  comments: ReviewComment[]
  /** Open (unresolved) count — drives the "Reviews (N)" badge. */
  openCount: number
  /** Filter helpers. */
  open: ReviewComment[]
  resolved: ReviewComment[]
  /** Add a new top-level comment. */
  add: (body: string, anchor?: ReviewAnchor) => ReviewComment | null
  /** Reply to a comment. */
  reply: (commentId: string, body: string) => ReviewReply | null
  /** Resolve / un-resolve a comment. */
  toggleResolve: (commentId: string) => void
  /** Delete a comment. */
  remove: (commentId: string) => void
  /** Delete a reply. */
  removeReply: (commentId: string, replyId: string) => void
  /** Wipe everything. */
  clear: () => void
}

export function useReviewThread({
  tenantSlug,
  kind,
  artifactId,
  actor,
}: UseReviewThreadOptions): UseReviewThreadApi {
  const key = useMemo(
    () => storageKey(tenantSlug, kind, artifactId),
    [tenantSlug, kind, artifactId],
  )
  const [comments, setComments] = useState<ReviewComment[]>([])

  useEffect(() => {
    setComments(loadReviews(key))
  }, [key])

  const add = useCallback(
    (body: string, anchor: ReviewAnchor = { kind: "free" }): ReviewComment | null => {
      const text = body.trim()
      if (!text) return null
      const entry: ReviewComment = {
        id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        anchor,
        authorId: actor?.id,
        authorName: actor?.name || "Anonymous",
        body: text,
        createdAt: new Date().toISOString(),
      }
      setComments((prev) => {
        const next = [entry, ...prev]
        saveReviews(key, next)
        return next
      })
      return entry
    },
    [actor, key],
  )

  const reply = useCallback(
    (commentId: string, body: string): ReviewReply | null => {
      const text = body.trim()
      if (!text) return null
      let added: ReviewReply | null = null
      setComments((prev) => {
        const next = prev.map((c) => {
          if (c.id !== commentId) return c
          const r: ReviewReply = {
            id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            authorId: actor?.id,
            authorName: actor?.name || "Anonymous",
            body: text,
            createdAt: new Date().toISOString(),
          }
          added = r
          return { ...c, replies: [...(c.replies ?? []), r] }
        })
        saveReviews(key, next)
        return next
      })
      return added
    },
    [actor, key],
  )

  const toggleResolve = useCallback(
    (commentId: string) => {
      setComments((prev) => {
        const next = prev.map((c) => {
          if (c.id !== commentId) return c
          const nowResolved = !c.resolved
          return {
            ...c,
            resolved: nowResolved,
            resolvedAt: nowResolved ? new Date().toISOString() : undefined,
            resolvedByName: nowResolved ? actor?.name : undefined,
          }
        })
        saveReviews(key, next)
        return next
      })
    },
    [actor, key],
  )

  const remove = useCallback(
    (commentId: string) => {
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== commentId)
        saveReviews(key, next)
        return next
      })
    },
    [key],
  )

  const removeReply = useCallback(
    (commentId: string, replyId: string) => {
      setComments((prev) => {
        const next = prev.map((c) =>
          c.id !== commentId
            ? c
            : { ...c, replies: (c.replies ?? []).filter((r) => r.id !== replyId) },
        )
        saveReviews(key, next)
        return next
      })
    },
    [key],
  )

  const clear = useCallback(() => {
    setComments([])
    saveReviews(key, [])
  }, [key])

  const open = comments.filter((c) => !c.resolved)
  const resolved = comments.filter((c) => c.resolved)

  return {
    comments,
    openCount: open.length,
    open,
    resolved,
    add,
    reply,
    toggleResolve,
    remove,
    removeReply,
    clear,
  }
}
