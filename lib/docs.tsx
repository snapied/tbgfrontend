"use client"

// Docs — the knowledge layer of the platform.
//
// One primitive (Doc), one container (Space), one unit (Block).
// Lives in tenant-scoped localStorage today; same shape will move
// server-side without consumer changes.
//
// Design rules (the part that keeps this from becoming Notion-bloat):
//   • Three primitives, no more. Anything that wants a fourth gets
//     redirected to a typed embed block instead.
//   • Permissions are document-level only. No per-block ACLs.
//   • Blocks are typed JSON. Each block kind has a known shape; the
//     renderer dispatches on `type`. No discriminated unions buried
//     in tiptap node-views; we own the data.
//   • Embeds are LIVE references via id, not snapshots. A doc that
//     embeds a recording renders the recording's *current* state.
//     If the recording is deleted, the embed renders a graceful
//     "this artifact was removed" stub.
//   • The ReferenceEdge table is a separate concern (lib/doc-references.ts).
//     This file persists Docs + Spaces only.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

// ────────────────────────────────────────────────────────────────
// Block schema
// ────────────────────────────────────────────────────────────────

export type BlockType =
  | "rich-text"          // tiptap HTML body
  | "heading"            // level: 2 | 3
  | "callout"            // tone: info | warn | success | tip
  | "divider"
  | "image"
  | "video"              // raw url (youtube/loom/vimeo/mp4)
  | "embed-lesson"
  | "embed-recording"
  | "embed-whiteboard"
  | "embed-doc"
  | "embed-quiz"

export interface DocBlock {
  id: string
  type: BlockType
  /** Body content. Shape depends on `type`:
   *    rich-text       → { html: string }
   *    heading         → { level: 2 | 3; text: string }
   *    callout         → { tone: "info"|"warn"|"success"|"tip"; html: string }
   *    divider         → {}
   *    image           → { url: string; alt?: string; caption?: string }
   *    video           → { url: string; caption?: string }
   *    embed-lesson    → { refId: string }
   *    embed-recording → { refId: string; atSec?: number }
   *    embed-whiteboard→ { refId: string }
   *    embed-doc       → { refId: string }
   *    embed-quiz      → { refId: string }
   */
  data: Record<string, unknown>
}

// ────────────────────────────────────────────────────────────────
// Audience / publish state
// ────────────────────────────────────────────────────────────────

export type DocAudience =
  | { kind: "private" }
  | { kind: "workspace-admin" }
  | { kind: "workspace-everyone" }
  | { kind: "community"; communityId: string }
  | { kind: "course"; courseId: string }
  | { kind: "public" }

export type DocPublishStatus = "draft" | "published"

// ────────────────────────────────────────────────────────────────
// Comments (reusing the same shape pattern as BatchPostComment)
// ────────────────────────────────────────────────────────────────

export interface DocComment {
  id: string
  authorId: string
  /** Optional anchor — when set, the comment is pinned to a
   *  specific block. Unset = top-level doc comment. */
  blockId?: string
  body: string
  resolved: boolean
  reactions?: Record<string, string[]>
  /** Threaded replies. Flat single-level for MVP — Slack does the
   *  same and it covers ~95% of real-world threading. */
  replies?: Array<{
    id: string
    authorId: string
    body: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

// ────────────────────────────────────────────────────────────────
// Doc + Space schemas
// ────────────────────────────────────────────────────────────────

export interface Doc {
  id: string
  /** Author user id — defaults to ownership. */
  ownerId: string
  /** Optional space — null = "loose doc" living only in the
   *  owner's private tree. */
  spaceId?: string
  /** Optional parent doc for nesting. Max depth-2 enforced in UI. */
  parentDocId?: string
  /** Page emoji/icon. Defaults to 📝 if unset. */
  icon?: string
  title: string
  /** TipTap HTML — the current source of truth for the doc body.
   *  Written by the editor on every save. Read by the editor and
   *  public reader. */
  contentHtml?: string
  /** Legacy BlockNote JSON — read-only fallback. New docs save to
   *  `contentHtml`; this stays for unmigrated docs until they're
   *  opened and re-saved. */
  content?: unknown[]
  /** Legacy block list — read-only fallback for pre-BlockNote docs.
   *  Newest path is contentHtml; this is the second-fallback. */
  blocks: DocBlock[]
  /** Audience + publish status drive who can see it + where. */
  audience: DocAudience
  status: DocPublishStatus
  /** Public slug — required iff audience.kind === "public" and
   *  status === "published". Validated for collision against
   *  reserved-slugs.ts at save time. */
  publicSlug?: string
  /** SEO bundle — only honored when publicly published. */
  seo?: {
    title?: string
    description?: string
    ogImage?: string
    noindex?: boolean
  }
  /** Comments — threaded. Reuses doc-level storage so a single
   *  read pulls the doc + every comment in one go. */
  comments?: DocComment[]
  /** Explicit collaborators (Phase 2 — wiki mode). Reserved field. */
  collaboratorIds?: string[]
  /** Soft-delete marker. */
  deletedAt?: string
  createdAt: string
  updatedAt: string
  /** Increments on every save. Cheap version counter for the
   *  Phase-2 version history surface. */
  version: number
}

export interface Space {
  id: string
  name: string
  icon?: string
  ownerId: string
  /** Default audience inherited by docs created inside. Author can
   *  override per-doc. */
  defaultAudience: DocAudience
  /** Optional human description shown on the space card. */
  description?: string
  createdAt: string
  updatedAt: string
}

// ────────────────────────────────────────────────────────────────
// Storage
// ────────────────────────────────────────────────────────────────

const DOCS_KEY = (slug: string) => `thebigclass.t.${slug}.docs.v1`
const SPACES_KEY = (slug: string) => `thebigclass.t.${slug}.docs.spaces.v1`

function loadDocs(): Doc[] {
  if (typeof window === "undefined") return []
  const slug = readCurrentTenantSlug()
  if (!slug) return []
  try {
    const raw = window.localStorage.getItem(DOCS_KEY(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Doc[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistDocs(docs: Doc[]): void {
  if (typeof window === "undefined") return
  const slug = readCurrentTenantSlug()
  if (!slug) return
  try {
    window.localStorage.setItem(DOCS_KEY(slug), JSON.stringify(docs))
  } catch { /* quota — best-effort */ }
}

function loadSpaces(): Space[] {
  if (typeof window === "undefined") return []
  const slug = readCurrentTenantSlug()
  if (!slug) return []
  try {
    const raw = window.localStorage.getItem(SPACES_KEY(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Space[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistSpaces(spaces: Space[]): void {
  if (typeof window === "undefined") return
  const slug = readCurrentTenantSlug()
  if (!slug) return
  try {
    window.localStorage.setItem(SPACES_KEY(slug), JSON.stringify(spaces))
  } catch { /* ignore */ }
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

export function generateDocId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function generateSpaceId(): string {
  return `space-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function generateBlockId(): string {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Build an empty rich-text block. Used as the seed of every new doc. */
export function emptyRichTextBlock(): DocBlock {
  return {
    id: generateBlockId(),
    type: "rich-text",
    data: { html: "" },
  }
}

/** Convert legacy DocBlock[] (rich-text HTML + headings + callouts + …)
 *  to BlockNote PartialBlock[] JSON so a doc created from a template
 *  (which still emits the legacy shape) renders correctly inside the
 *  new editor. HTML is reduced to plain text — templates are short
 *  scaffolds, formatting fidelity isn't critical. Embeds carry their
 *  refId through as a typed BlockNote block. */
export function legacyBlocksToBlocknoteContent(blocks: DocBlock[]): unknown[] {
  const out: unknown[] = []
  const textOf = (html: unknown): string =>
    typeof html === "string" ? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : ""

  for (const b of blocks) {
    switch (b.type) {
      case "heading": {
        const level = (b.data.level === 3 ? 3 : 2) as 2 | 3
        const text = typeof b.data.text === "string" ? b.data.text : ""
        out.push({
          type: "heading",
          props: { level },
          content: text ? [{ type: "text", text, styles: {} }] : [],
        })
        break
      }
      case "callout": {
        // BlockNote has no callout by default — render as a quote.
        const text = textOf(b.data.html)
        out.push({
          type: "quote",
          content: text ? [{ type: "text", text, styles: {} }] : [],
        })
        break
      }
      case "divider":
        // BlockNote calls this "separator"; on older versions it's
        // "horizontalRule". Fall back to an empty paragraph if neither
        // is present — won't crash, just won't render the line.
        out.push({ type: "paragraph", content: [] })
        break
      case "image": {
        const url = typeof b.data.url === "string" ? b.data.url : ""
        if (url) {
          out.push({ type: "image", props: { url } })
        } else {
          out.push({ type: "paragraph", content: [] })
        }
        break
      }
      case "video": {
        const url = typeof b.data.url === "string" ? b.data.url : ""
        if (url) {
          out.push({ type: "video", props: { url } })
        } else {
          out.push({ type: "paragraph", content: [] })
        }
        break
      }
      case "embed-lesson":
      case "embed-recording":
      case "embed-whiteboard":
      case "embed-doc":
      case "embed-quiz": {
        // Custom embed blocks are not registered in the editor's
        // schema right now — convert them to a paragraph that names
        // what was here, so the writer can re-add via the slash menu.
        const refId = typeof b.data.refId === "string" ? b.data.refId : ""
        const label = b.type.replace("embed-", "")
        const text = refId
          ? `🔗 ${label} embed (${refId}) — re-add from the slash menu`
          : `🔗 ${label} embed — re-add from the slash menu`
        out.push({
          type: "paragraph",
          content: [{ type: "text", text, styles: {} }],
        })
        break
      }
      case "rich-text":
      default: {
        const text = textOf(b.data.html)
        out.push({
          type: "paragraph",
          content: text ? [{ type: "text", text, styles: {} }] : [],
        })
        break
      }
    }
  }
  return out
}

export function audienceLabel(a: DocAudience): string {
  switch (a.kind) {
    case "private":             return "Private"
    case "workspace-admin":     return "Admins + instructors"
    case "workspace-everyone":  return "Everyone in workspace"
    case "community":           return "Community members"
    case "course":              return "Enrolled in course"
    case "public":              return "Public on the web"
  }
}

export function audienceEmoji(a: DocAudience): string {
  switch (a.kind) {
    case "private":             return "🔒"
    case "workspace-admin":     return "🛡"
    case "workspace-everyone":  return "🏢"
    case "community":           return "👥"
    case "course":              return "🎓"
    case "public":              return "🌐"
  }
}

/** Visibility predicate. Given a doc + a viewer, return whether the
 *  viewer can see it. Course/community membership comes from the
 *  caller passing in enrolled course ids + member community ids so
 *  this stays a pure function. */
export function viewerCanSeeDoc(
  doc: Doc,
  viewer:
    | {
        userId: string
        role: "admin" | "instructor" | "student" | undefined
        enrolledCourseIds: Set<string>
        memberCommunityIds: Set<string>
      }
    | null,
): boolean {
  if (doc.deletedAt) return false
  if (doc.status === "draft") {
    return !!viewer && viewer.userId === doc.ownerId
  }
  if (!viewer) {
    return doc.audience.kind === "public"
  }
  // Owner can always see their own.
  if (viewer.userId === doc.ownerId) return true
  switch (doc.audience.kind) {
    case "private":
      return false
    case "workspace-admin":
      return viewer.role === "admin" || viewer.role === "instructor"
    case "workspace-everyone":
      return true
    case "community":
      return viewer.memberCommunityIds.has(doc.audience.communityId)
    case "course":
      return viewer.enrolledCourseIds.has(doc.audience.courseId)
    case "public":
      return true
  }
}

// ────────────────────────────────────────────────────────────────
// Store / React provider
// ────────────────────────────────────────────────────────────────

interface DocsStoreApi {
  docs: Doc[]
  spaces: Space[]
  getDoc: (id: string) => Doc | undefined
  getDocBySlug: (slug: string) => Doc | undefined
  createDoc: (input: Partial<Doc> & { ownerId: string }) => Doc
  updateDoc: (id: string, patch: Partial<Doc>) => void
  deleteDoc: (id: string) => void
  restoreDoc: (id: string) => void
  hardDeleteDoc: (id: string) => void
  duplicateDoc: (id: string, ownerId: string) => Doc | null
  // Block ops — convenience over updateDoc(blocks: [...]).
  addBlock: (docId: string, block: DocBlock, atIndex?: number) => void
  updateBlock: (docId: string, blockId: string, patch: Partial<DocBlock>) => void
  removeBlock: (docId: string, blockId: string) => void
  moveBlock: (docId: string, blockId: string, toIndex: number) => void
  // Comments
  addComment: (docId: string, c: DocComment) => void
  updateComment: (docId: string, commentId: string, patch: Partial<DocComment>) => void
  removeComment: (docId: string, commentId: string) => void
  // Spaces
  createSpace: (s: Omit<Space, "id" | "createdAt" | "updatedAt">) => Space
  updateSpace: (id: string, patch: Partial<Space>) => void
  deleteSpace: (id: string) => void
}

const DocsCtx = createContext<DocsStoreApi | null>(null)

export function DocsProvider({ children }: { children: ReactNode }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setDocs(loadDocs())
    setSpaces(loadSpaces())
    setHydrated(true)
  }, [])

  // Persist on change (post-hydration so we don't clobber on first mount).
  useEffect(() => { if (hydrated) persistDocs(docs) }, [docs, hydrated])
  useEffect(() => { if (hydrated) persistSpaces(spaces) }, [spaces, hydrated])

  const getDoc = useCallback(
    (id: string) => docs.find((d) => d.id === id),
    [docs],
  )

  const getDocBySlug = useCallback(
    (slug: string) => docs.find((d) => d.publicSlug === slug && d.audience.kind === "public" && d.status === "published" && !d.deletedAt),
    [docs],
  )

  const createDoc = useCallback((input: Partial<Doc> & { ownerId: string }): Doc => {
    const nowIso = new Date().toISOString()
    const doc: Doc = {
      id: input.id ?? generateDocId(),
      ownerId: input.ownerId,
      spaceId: input.spaceId,
      parentDocId: input.parentDocId,
      icon: input.icon ?? "📝",
      title: input.title?.trim() || "Untitled",
      contentHtml: input.contentHtml,
      content: input.content,
      blocks: input.blocks && input.blocks.length > 0 ? input.blocks : [emptyRichTextBlock()],
      audience: input.audience ?? { kind: "private" },
      status: input.status ?? "draft",
      publicSlug: input.publicSlug,
      seo: input.seo,
      comments: input.comments,
      collaboratorIds: input.collaboratorIds,
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
    }
    setDocs((prev) => [doc, ...prev])
    return doc
  }, [])

  const updateDoc = useCallback((id: string, patch: Partial<Doc>) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              ...patch,
              updatedAt: new Date().toISOString(),
              version: d.version + 1,
            }
          : d,
      ),
    )
  }, [])

  const deleteDoc = useCallback((id: string) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, deletedAt: new Date().toISOString() } : d,
      ),
    )
  }, [])

  const restoreDoc = useCallback((id: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, deletedAt: undefined } : d)),
    )
  }, [])

  const hardDeleteDoc = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const duplicateDoc = useCallback(
    (id: string, ownerId: string): Doc | null => {
      const src = docs.find((d) => d.id === id)
      if (!src) return null
      const nowIso = new Date().toISOString()
      const copy: Doc = {
        ...src,
        id: generateDocId(),
        ownerId,
        title: `${src.title} (copy)`,
        contentHtml: src.contentHtml,
        // BlockNote JSON copies cleanly via deep-spread of the array
        content: src.content ? JSON.parse(JSON.stringify(src.content)) as unknown[] : undefined,
        blocks: src.blocks.map((b) => ({ ...b, id: generateBlockId() })),
        publicSlug: undefined,        // never collide on slug
        audience: { kind: "private" }, // duplicates start private
        status: "draft",
        comments: undefined,
        deletedAt: undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        version: 1,
      }
      setDocs((prev) => [copy, ...prev])
      return copy
    },
    [docs],
  )

  // Block ops
  const addBlock = useCallback((docId: string, block: DocBlock, atIndex?: number) => {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d
        const next = [...d.blocks]
        const i = atIndex ?? next.length
        next.splice(Math.max(0, Math.min(next.length, i)), 0, block)
        return { ...d, blocks: next, updatedAt: new Date().toISOString(), version: d.version + 1 }
      }),
    )
  }, [])

  const updateBlock = useCallback(
    (docId: string, blockId: string, patch: Partial<DocBlock>) => {
      setDocs((prev) =>
        prev.map((d) => {
          if (d.id !== docId) return d
          const next = d.blocks.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  ...patch,
                  // Shallow-merge data so partial-data patches keep
                  // other keys.
                  data: { ...b.data, ...(patch.data ?? {}) },
                }
              : b,
          )
          return { ...d, blocks: next, updatedAt: new Date().toISOString(), version: d.version + 1 }
        }),
      )
    },
    [],
  )

  const removeBlock = useCallback((docId: string, blockId: string) => {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d
        // Never let a doc become empty — leave a single empty rich-text
        // block so the editor always has something to edit.
        const filtered = d.blocks.filter((b) => b.id !== blockId)
        const next = filtered.length > 0 ? filtered : [emptyRichTextBlock()]
        return { ...d, blocks: next, updatedAt: new Date().toISOString(), version: d.version + 1 }
      }),
    )
  }, [])

  const moveBlock = useCallback((docId: string, blockId: string, toIndex: number) => {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d
        const from = d.blocks.findIndex((b) => b.id === blockId)
        if (from < 0) return d
        const next = [...d.blocks]
        const [removed] = next.splice(from, 1)
        if (!removed) return d
        const clamped = Math.max(0, Math.min(next.length, toIndex))
        next.splice(clamped, 0, removed)
        return { ...d, blocks: next, updatedAt: new Date().toISOString(), version: d.version + 1 }
      }),
    )
  }, [])

  // Comments
  const addComment = useCallback((docId: string, c: DocComment) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, comments: [...(d.comments ?? []), c], updatedAt: new Date().toISOString() }
          : d,
      ),
    )
  }, [])

  const updateComment = useCallback(
    (docId: string, commentId: string, patch: Partial<DocComment>) => {
      setDocs((prev) =>
        prev.map((d) => {
          if (d.id !== docId) return d
          const next = (d.comments ?? []).map((c) =>
            c.id === commentId ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
          )
          return { ...d, comments: next, updatedAt: new Date().toISOString() }
        }),
      )
    },
    [],
  )

  const removeComment = useCallback((docId: string, commentId: string) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, comments: (d.comments ?? []).filter((c) => c.id !== commentId) }
          : d,
      ),
    )
  }, [])

  // Spaces
  const createSpace = useCallback(
    (s: Omit<Space, "id" | "createdAt" | "updatedAt">): Space => {
      const nowIso = new Date().toISOString()
      const space: Space = {
        ...s,
        id: generateSpaceId(),
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      setSpaces((prev) => [space, ...prev])
      return space
    },
    [],
  )

  const updateSpace = useCallback((id: string, patch: Partial<Space>) => {
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
      ),
    )
  }, [])

  const deleteSpace = useCallback((id: string) => {
    setSpaces((prev) => prev.filter((s) => s.id !== id))
    // Orphan docs inside this space — move them to "loose" (spaceId undefined).
    setDocs((prev) =>
      prev.map((d) => (d.spaceId === id ? { ...d, spaceId: undefined } : d)),
    )
  }, [])

  const api: DocsStoreApi = useMemo(
    () => ({
      docs,
      spaces,
      getDoc,
      getDocBySlug,
      createDoc,
      updateDoc,
      deleteDoc,
      restoreDoc,
      hardDeleteDoc,
      duplicateDoc,
      addBlock,
      updateBlock,
      removeBlock,
      moveBlock,
      addComment,
      updateComment,
      removeComment,
      createSpace,
      updateSpace,
      deleteSpace,
    }),
    [
      docs, spaces, getDoc, getDocBySlug, createDoc, updateDoc,
      deleteDoc, restoreDoc, hardDeleteDoc, duplicateDoc, addBlock,
      updateBlock, removeBlock, moveBlock, addComment, updateComment,
      removeComment, createSpace, updateSpace, deleteSpace,
    ],
  )

  return <DocsCtx.Provider value={api}>{children}</DocsCtx.Provider>
}

export function useDocs(): DocsStoreApi {
  const ctx = useContext(DocsCtx)
  if (!ctx) throw new Error("useDocs must be used inside <DocsProvider>")
  return ctx
}
