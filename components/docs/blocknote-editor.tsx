"use client"

// Docs editor — TipTap-powered.
//
// The file + export name are kept ("BlocknoteDocEditor") so every
// callsite (editor page, public readers, dashboard widget) works
// without changes. The underlying engine is TipTap — the same
// editor that powers the platform's blog, announcement composer
// and course descriptions. Proven stable in this exact Next 16 +
// Turbopack + React 19 build.
//
// BlockNote was attempted but its compiled Prosemirror DOMSerializer
// throws "Invalid array passed to renderSpec" on mount inside this
// stack; the bug is below the layer we can patch. TipTap is the
// pragmatic, demo-stable choice.
//
// Persistence contract (unchanged):
//   • initialContent — string | unknown[] | undefined. Accepts:
//       - HTML string (new format)
//       - Our wrapper [{ type: "rich-text", data: { html } }]
//       - Legacy BlockNote JSON OR legacy DocBlock[]
//   • onChange(content: unknown[]) emits the wrapper so existing
//     updateDoc(id, { content: ... }) writes still work
//   • onStatusChange — "idle" | "saving" | "saved" | "error"

import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { EmbedPicker } from "@/components/docs/embed-picker"
import { type BlockType as DocBlockKind } from "@/lib/docs"
import { useLMS } from "@/lib/lms-store"
import { useDocs } from "@/lib/docs"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

interface Props {
  docId: string
  initialContent?: string | unknown[]
  onChange: (content: unknown[]) => void
  editable?: boolean
  onStatusChange?: (status: SaveStatus) => void
}

// ─── Public utility — pull HTML out of any saved shape ──────────
export function extractHtml(raw: string | unknown[] | undefined | null): string {
  if (raw == null) return ""
  if (typeof raw === "string") return raw
  if (!Array.isArray(raw)) return ""
  if (raw.length === 1) {
    const only = raw[0] as { type?: string; data?: { html?: string } } | undefined
    if (only && typeof only.data?.html === "string") return only.data.html
  }
  return toHtmlFromAnyShape(raw)
}

// ─── Initial-content normaliser ─────────────────────────────────
function toInitialHtml(raw: string | unknown[] | undefined): string {
  if (raw == null) return ""
  if (typeof raw === "string") return raw
  if (!Array.isArray(raw)) return ""

  // Fast-path: our save format = [{ type: "rich-text", data: { html } }]
  if (raw.length === 1) {
    const only = raw[0] as { type?: string; data?: { html?: string } } | undefined
    if (only && typeof only.data?.html === "string") return only.data.html
  }

  return toHtmlFromAnyShape(raw)
}

function toHtmlFromAnyShape(raw: unknown[]): string {
  const parts: string[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const b = item as {
      type?: string
      props?: { level?: number; url?: string; refId?: string }
      content?: unknown
      data?: { html?: string; text?: string; level?: number; url?: string; refId?: string }
    }

    // Legacy DocBlock shape (data.*)
    if (b.data && typeof b.data === "object") {
      switch (b.type) {
        case "rich-text":
          if (typeof b.data.html === "string") parts.push(b.data.html)
          break
        case "heading": {
          const lvl = b.data.level === 3 ? 3 : 2
          parts.push(`<h${lvl}>${escapeHtml(b.data.text ?? "")}</h${lvl}>`)
          break
        }
        case "callout":
          parts.push(`<blockquote>${b.data.html ?? ""}</blockquote>`)
          break
        case "divider":
          parts.push(`<hr />`)
          break
        case "image":
          if (b.data.url) parts.push(`<p><img src="${escapeAttr(b.data.url)}" alt="" /></p>`)
          break
        case "video":
          if (b.data.url) parts.push(`<p><a href="${escapeAttr(b.data.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(b.data.url)}</a></p>`)
          break
        case "embed-lesson":
        case "embed-recording":
        case "embed-whiteboard":
        case "embed-doc":
        case "embed-quiz": {
          const label = b.type.replace("embed-", "")
          parts.push(`<p>🔗 <strong>${escapeHtml(label)} embed</strong> — re-add from the Embed button above</p>`)
          break
        }
        default:
          if (typeof b.data.html === "string") parts.push(b.data.html)
      }
      continue
    }

    // BlockNote JSON shape (type + content[])
    if (typeof b.type !== "string") continue

    if (b.type === "heading" && Array.isArray(b.content)) {
      const lvl = b.props?.level === 3 ? 3 : b.props?.level === 1 ? 1 : 2
      parts.push(`<h${lvl}>${blockNoteInlinesToHtml(b.content)}</h${lvl}>`)
      continue
    }
    if (b.type === "bulletListItem" && Array.isArray(b.content)) {
      parts.push(`<ul><li>${blockNoteInlinesToHtml(b.content)}</li></ul>`)
      continue
    }
    if (b.type === "numberedListItem" && Array.isArray(b.content)) {
      parts.push(`<ol><li>${blockNoteInlinesToHtml(b.content)}</li></ol>`)
      continue
    }
    if (b.type === "quote" && Array.isArray(b.content)) {
      parts.push(`<blockquote>${blockNoteInlinesToHtml(b.content)}</blockquote>`)
      continue
    }
    if (b.type === "codeBlock" && Array.isArray(b.content)) {
      parts.push(`<pre><code>${escapeHtml(blockNoteInlinesPlain(b.content))}</code></pre>`)
      continue
    }
    if (b.type === "image" && b.props?.url) {
      parts.push(`<p><img src="${escapeAttr(b.props.url)}" alt="" /></p>`)
      continue
    }
    if (b.type === "paragraph") {
      const inner = Array.isArray(b.content) ? blockNoteInlinesToHtml(b.content) : ""
      parts.push(`<p>${inner}</p>`)
      continue
    }
    if (b.type.startsWith("embed-")) {
      const label = b.type.replace("embed-", "")
      parts.push(`<p>🔗 <strong>${escapeHtml(label)} embed</strong> — re-add from the Embed button above</p>`)
    }
  }
  return parts.join("\n")
}

function blockNoteInlinesToHtml(inlines: unknown): string {
  if (!Array.isArray(inlines)) return ""
  return inlines
    .map((seg) => {
      if (!seg || typeof seg !== "object") return ""
      const node = seg as { type?: string; text?: string; href?: string; content?: unknown; styles?: { bold?: boolean; italic?: boolean; code?: boolean } }
      if (node.type === "text" && typeof node.text === "string") {
        let t = escapeHtml(node.text)
        if (node.styles?.code) t = `<code>${t}</code>`
        if (node.styles?.italic) t = `<em>${t}</em>`
        if (node.styles?.bold) t = `<strong>${t}</strong>`
        return t
      }
      if (node.type === "link" && typeof node.href === "string") {
        const inner = Array.isArray(node.content) ? blockNoteInlinesToHtml(node.content) : escapeHtml(node.href)
        return `<a href="${escapeAttr(node.href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
      }
      return ""
    })
    .join("")
}

function blockNoteInlinesPlain(inlines: unknown): string {
  if (!Array.isArray(inlines)) return ""
  return inlines
    .map((seg) =>
      seg && typeof seg === "object" && typeof (seg as { text?: string }).text === "string"
        ? (seg as { text: string }).text
        : "",
    )
    .join("")
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
function escapeAttr(s: string): string { return escapeHtml(s) }

// ─── Top-level entry ─────────────────────────────────────────────

export function BlocknoteDocEditor(props: Props) {
  return (
    <EditorErrorBoundary fallback={<EditorCrashState />}>
      <DocEditor {...props} />
    </EditorErrorBoundary>
  )
}

function EditorCrashState() {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-6">
      <p className="text-sm font-bold text-destructive">Editor couldn&rsquo;t load.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Refresh the page. Your last save is intact — content is stored separately from the editor surface.
      </p>
    </div>
  )
}

class EditorErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: Error) {
    console.warn("[doc-editor] caught runtime error:", err.message)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// ─── The actual editor ──────────────────────────────────────────

function DocEditor({ docId, initialContent, onChange, editable = true, onStatusChange }: Props) {
  const { courses, liveSessions, whiteboards, quizzes } = useLMS()
  const { docs } = useDocs()
  const [picker, setPicker] = useState<{ open: boolean }>({ open: false })

  const initialHtml = useMemo(() => toInitialHtml(initialContent), [initialContent])
  const [html, setHtml] = useState<string>(initialHtml)
  const editorRef = useRef<Editor | null>(null)
  const lastSavedRef = useRef<string>(initialHtml)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    setHtml(initialHtml)
    lastSavedRef.current = initialHtml
  }, [initialHtml])

  const handleChange = useCallback(
    (next: string) => {
      setHtml(next)
      if (!editable) return
      if (next === lastSavedRef.current) return
      onStatusChange?.("saving")
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        try {
          onChange([
            { type: "rich-text", id: "tt-1", data: { html: next } },
          ])
          lastSavedRef.current = next
          onStatusChange?.("saved")
        } catch (err) {
          console.warn("[doc-editor] save failed:", err)
          onStatusChange?.("error")
        }
      }, 300)
    },
    [editable, onChange, onStatusChange],
  )

  useEffect(() => {
    return () => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
    }
  }, [])

  function insertEmbedAtCursor(kind: DocBlockKind, refId: string) {
    const editor = editorRef.current
    if (!editor) return
    const meta = describeEmbed(kind, refId, { courses, liveSessions, whiteboards, quizzes, docs })
    try {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",
          content: [
            { type: "text", text: `${meta.emoji} ${meta.label} — `, marks: [{ type: "bold" }] },
            {
              type: "text",
              text: meta.title,
              marks: [
                { type: "link", attrs: { href: meta.href, target: "_blank", rel: "noopener noreferrer nofollow" } },
              ],
            },
          ],
        })
        .run()
    } catch (err) {
      console.warn("[doc-editor] embed insert failed:", err)
    }
  }

  // Read-only path — public reader. Render the HTML directly. The
  // HTML originates from our own editor (TipTap StarterKit + Link +
  // Image + Youtube), not arbitrary external input, so this is a
  // controlled-source render path, not an XSS surface.
  if (!editable) {
    return (
      <div
        className="prose prose-tiptap max-w-none"
        dangerouslySetInnerHTML={{ __html: html || "<p>This page is being prepared. Check back soon.</p>" }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setPicker({ open: true })}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Embed an artifact
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Drop a live link to any lesson, recording, whiteboard, quiz or another doc.
        </span>
      </div>

      <RichTextEditor
        value={html}
        onChange={handleChange}
        placeholder="Start writing your doc — use the toolbar to format, or the Embed button above to insert links to your courses and recordings."
        minHeight={500}
        folder="general"
        onReady={(ed) => {
          editorRef.current = ed
        }}
      />

      <EmbedPicker
        open={picker.open}
        onOpenChange={(v) => setPicker((p) => ({ ...p, open: v }))}
        excludeDocId={docId}
        onPick={({ kind, refId }) => insertEmbedAtCursor(kind, refId)}
      />
    </div>
  )
}

// ─── Outline + stats (HTML-aware) ────────────────────────────────

export interface DocOutlineItem {
  id: string
  text: string
  level: 1 | 2 | 3
}

export function extractOutline(content: unknown): DocOutlineItem[] {
  const html = toInitialHtml(content as string | unknown[] | undefined)
  if (!html) return []
  const out: DocOutlineItem[] = []
  const re = /<h([123])[^>]*>([\s\S]*?)<\/h\1>/gi
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(html))) {
    const level = Number(m[1]) as 1 | 2 | 3
    const text = (m[2] ?? "").replace(/<[^>]+>/g, "").trim()
    if (!text) continue
    out.push({ id: `h-${i++}`, text, level })
  }
  return out
}

export function computeDocStats(content: unknown): { words: number; minutes: number } {
  const html = toInitialHtml(content as string | unknown[] | undefined)
  if (!html) return { words: 0, minutes: 0 }
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const words = text.split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 220))
  return { words, minutes }
}

// ─── Embed metadata resolver ─────────────────────────────────────

interface EmbedMeta {
  emoji: string
  label: string
  title: string
  href: string
}

function describeEmbed(
  kind: DocBlockKind,
  refId: string,
  stores: {
    courses: ReturnType<typeof useLMS>["courses"]
    liveSessions: ReturnType<typeof useLMS>["liveSessions"]
    whiteboards: ReturnType<typeof useLMS>["whiteboards"]
    quizzes: ReturnType<typeof useLMS>["quizzes"]
    docs: ReturnType<typeof useDocs>["docs"]
  },
): EmbedMeta {
  switch (kind) {
    case "embed-lesson": {
      for (const c of stores.courses) {
        for (const m of c.modules ?? []) {
          const l = m.lessons.find((x) => x.id === refId)
          if (l) {
            return {
              emoji: "🎓",
              label: "Lesson",
              title: `${l.title} · ${c.title}`,
              href: `/dashboard/courses/${c.id}`,
            }
          }
        }
      }
      return { emoji: "🎓", label: "Lesson", title: "(removed)", href: "#" }
    }
    case "embed-recording": {
      const s = stores.liveSessions.find((x) => x.id === refId)
      if (s) return { emoji: "🎬", label: "Recording", title: s.title, href: `/dashboard/recordings/${s.id}` }
      return { emoji: "🎬", label: "Recording", title: "(removed)", href: "#" }
    }
    case "embed-whiteboard": {
      const w = stores.whiteboards.find((x) => x.id === refId)
      if (w) return { emoji: "🎨", label: "Whiteboard", title: w.title, href: `/dashboard/whiteboards/${w.id}` }
      return { emoji: "🎨", label: "Whiteboard", title: "(removed)", href: "#" }
    }
    case "embed-quiz": {
      const q = stores.quizzes.find((x) => x.id === refId)
      if (q) return { emoji: "📝", label: "Quiz", title: q.title, href: `/dashboard/quizzes/${q.id}` }
      return { emoji: "📝", label: "Quiz", title: "(removed)", href: "#" }
    }
    case "embed-doc": {
      const d = stores.docs.find((x) => x.id === refId)
      if (d) return { emoji: d.icon ?? "📘", label: "Doc", title: d.title || "Untitled", href: `/dashboard/docs/${d.id}` }
      return { emoji: "📘", label: "Doc", title: "(removed)", href: "#" }
    }
    default:
      return { emoji: "🔗", label: "Link", title: "Reference", href: "#" }
  }
}
