"use client"

// Doc editor page — premium polish layer over the BlockNote editor.
//
// Header anatomy (left→right):
//   • Emoji-popover icon picker (replaces the raw <input> that
//     mangled multi-byte emoji)
//   • Inline title editable
//   • Save-status pill (idle / saving / saved / error)
//   • Audience + status button → opens PublishDialog
//   • Take-a-tour trigger
//   • More-actions menu — Duplicate · Export Markdown · Copy link · Delete
//
// Right rail has THREE tabs now: Comments · Backlinks · Outline.
// Outline reads headings live from the BlockNote document and
// scroll-targets them by data-heading-id.
//
// On <lg screens the rail collapses to a floating action button
// that opens a sheet from the right.

import { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Link2,
  List,
  Loader2,
  MoreVertical,
  Trash2,
  Type,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLMS } from "@/lib/lms-store"
import {
  audienceEmoji,
  audienceLabel,
  legacyBlocksToBlocknoteContent,
  useDocs,
} from "@/lib/docs"
import { DocSidebar } from "@/components/docs/doc-sidebar"
import {
  BlocknoteDocEditor,
  computeDocStats,
  extractOutline,
  type SaveStatus,
} from "@/components/docs/blocknote-editor"
import { PublishDialog } from "@/components/docs/publish-dialog"
import {
  buildNotifications,
  docPublishedNotification,
} from "@/lib/notifications"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { useConfirm } from "@/lib/use-confirm"
import { useTenant } from "@/lib/tenant-store"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import { DOC_EDITOR_TOUR, DOC_EDITOR_TOUR_ID } from "@/components/docs/docs-tour"

// ─── Page ────────────────────────────────────────────────────────

export default function DocEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { getDoc, updateDoc, deleteDoc, restoreDoc, duplicateDoc } = useDocs()
  const { currentUser, users, addNotifications } = useLMS()
  const { currentTenant } = useTenant()
  const confirm = useConfirm()

  const doc = getDoc(id)
  const [publishOpen, setPublishOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")

  // Effective initial content for the TipTap editor. Priority:
  //   1. doc.contentHtml (the modern HTML format — primary path)
  //   2. doc.content (legacy BlockNote JSON) — auto-converted to HTML
  //   3. doc.blocks (legacy DocBlock[]) — auto-converted to HTML
  //   4. nothing → undefined, editor shows placeholder
  // After the first save, contentHtml is populated and we never look
  // at the legacy fields again for this doc.
  const initialContent = useMemo<string | unknown[] | undefined>(() => {
    if (typeof doc?.contentHtml === "string" && doc.contentHtml.length > 0) {
      return doc.contentHtml
    }
    if (Array.isArray(doc?.content) && doc.content.length > 0) {
      return doc.content as unknown[]
    }
    const blocks = doc?.blocks ?? []
    const looksReal =
      blocks.length > 1 ||
      (blocks.length === 1 && blocks[0]?.type !== "rich-text") ||
      (blocks.length === 1 &&
        blocks[0]?.type === "rich-text" &&
        String((blocks[0]?.data as { html?: string } | undefined)?.html ?? "").trim() !== "")
    return looksReal ? legacyBlocksToBlocknoteContent(blocks) : undefined
  }, [doc?.contentHtml, doc?.content, doc?.blocks])

  // Outline + stats derive from the effective initial content. The
  // editor's own utility functions accept either HTML or array.
  const outline = useMemo(() => extractOutline(initialContent), [initialContent])
  const stats = useMemo(() => computeDocStats(initialContent), [initialContent])

  if (!doc) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Doc not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/docs">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            All docs
          </Link>
        </Button>
      </div>
    )
  }

  // ─── Actions ────────────────────────────────────────────────

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete "${doc?.title || "Untitled"}"?`,
      description:
        "Moved to trash for 30 days — restore any time. Backlinks from other docs will show a 'this doc was removed' stub until you restore or replace.",
      destructive: true,
      confirmLabel: "Move to trash",
    })
    if (!ok) return
    deleteDoc(id)
    router.push("/dashboard/docs")
    toast.success("Doc moved to trash", {
      action: {
        label: "Undo",
        onClick: () => {
          restoreDoc(id)
          toast.success("Doc restored", {
            action: { label: "Open", onClick: () => router.push(`/dashboard/docs/${id}`) },
          })
        },
      },
      duration: 8000,
    })
  }

  function handleDuplicate() {
    if (!currentUser) return
    const copy = duplicateDoc(id, currentUser.id)
    if (!copy) {
      toast.error("Couldn't duplicate this doc")
      return
    }
    toast.success("Duplicated", {
      action: { label: "Open", onClick: () => router.push(`/dashboard/docs/${copy.id}`) },
    })
  }

  function handleExportMarkdown() {
    try {
      const md = blockNoteToMarkdown(doc?.content)
      const filename = `${(doc?.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}.md`
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Markdown exported")
    } catch {
      toast.error("Export failed")
    }
  }

  // Resolve the share URL — tenant-scoped only. The platform-global
  // /k route was retired; if we don't know the tenant yet, return
  // null and the "Open public page" / "Copy link" controls hide or
  // fall back to the editor URL.
  function resolvePublicUrl(): string | null {
    if (!doc) return null
    if (doc.audience.kind !== "public") return null
    if (doc.status !== "published") return null
    if (!doc.publicSlug) return null
    if (typeof window === "undefined") return null
    const tenantSlug = currentTenant?.slug
    if (!tenantSlug) return null
    return `${window.location.origin}/p/${encodeURIComponent(tenantSlug)}/k/${doc.publicSlug}`
  }

  function handleCopyLink() {
    const url = resolvePublicUrl() ?? window.location.href
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied"),
      () => toast.error("Couldn't copy link"),
    )
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <div className="hidden lg:block">
        <DocSidebar activeDocId={id} onNewDoc={() => router.push("/dashboard/docs")} />
      </div>

      <main className="flex-1 overflow-y-auto">
        {/* Full-width single column — the right rail (Chat / Outline /
            Links) was removed per the demo brief; the editor now
            stretches to the full container width for a clean Notion-
            style writing surface. */}
        <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="min-w-0">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 -mx-2 mb-4 bg-background/95 px-2 py-2 backdrop-blur">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Link href="/dashboard/docs" className="inline-flex items-center gap-1 hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Docs
                </Link>
                <span aria-hidden>·</span>
                <span className="truncate">{doc.title || "Untitled"}</span>
                <span aria-hidden>·</span>
                <SaveStatusPill status={saveStatus} lastSavedAt={doc.updatedAt} />
              </div>
            </div>

            {/* Title row */}
            <div id="doc-header" className="mb-2 flex items-start gap-3">
              <EmojiPicker
                value={doc.icon ?? "📝"}
                onChange={(emoji) => updateDoc(id, { icon: emoji })}
              />
              <input
                value={doc.title}
                onChange={(e) => updateDoc(id, { title: e.target.value })}
                placeholder="Untitled"
                className="min-w-0 flex-1 bg-transparent font-serif text-3xl font-black tracking-tight outline-none placeholder:text-muted-foreground/30 sm:text-4xl"
              />
            </div>

            {/* Action row */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Button
                id="doc-publish-button"
                variant="outline"
                size="sm"
                onClick={() => setPublishOpen(true)}
                className="gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                {audienceEmoji(doc.audience)} {audienceLabel(doc.audience)}
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase">
                  {doc.status}
                </span>
              </Button>
              <TakeATourButton tourId={DOC_EDITOR_TOUR_ID} label="Tour" />
              <DocActionsMenu
                doc={doc}
                onCopyLink={handleCopyLink}
                onDuplicate={handleDuplicate}
                onExport={handleExportMarkdown}
                onDelete={handleDelete}
                publicUrl={resolvePublicUrl()}
              />
            </div>

            {/* Editor surface */}
            <div id="doc-editor-surface" className="rounded-lg">
              <BlocknoteDocEditor
                docId={id}
                initialContent={
                  initialContent as Parameters<typeof BlocknoteDocEditor>[0]["initialContent"]
                }
                onChange={(content) => updateDoc(id, { content: content as unknown[] })}
                onStatusChange={setSaveStatus}
              />
            </div>

            {/* Footer chips */}
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Type className="h-3 w-3" />
                {stats.words.toLocaleString()} {stats.words === 1 ? "word" : "words"}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {stats.minutes} min read
              </span>
              <span aria-hidden>·</span>
              <span>Last updated {formatRel(doc.updatedAt)}</span>
              {outline.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <List className="h-3 w-3" />
                    {outline.length} {outline.length === 1 ? "section" : "sections"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <ProductTour
        tourId={DOC_EDITOR_TOUR_ID}
        steps={DOC_EDITOR_TOUR}
        promptLabel="Tour the new editor"
      />

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        doc={doc}
        onSave={(patch) => {
          updateDoc(id, patch)
          toast.success("Saved")
          if (
            patch.audience.kind === "public" &&
            patch.status === "published" &&
            doc.status !== "published"
          ) {
            const recipients = users.filter(
              (u) =>
                u.id !== doc.ownerId && (u.role === "admin" || u.role === "instructor"),
            )
            if (recipients.length > 0) {
              addNotifications(
                buildNotifications(
                  recipients,
                  docPublishedNotification({
                    docId: id,
                    docTitle: doc.title,
                    by: currentUser?.name ?? "A teammate",
                    publicSlug: patch.publicSlug,
                  }),
                ),
              )
            }
          }
        }}
      />
    </div>
  )
}

// ─── Save status pill ────────────────────────────────────────────

function SaveStatusPill({
  status,
  lastSavedAt,
}: {
  status: SaveStatus
  /** ISO timestamp — used to render "Saved · 3m ago" in the idle
   *  state so the writer always knows persistence is working. */
  lastSavedAt?: string
}) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    )
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        ⚠ Couldn&rsquo;t save — your edits are local
      </span>
    )
  }
  // saved or idle — both show "Saved" with a timestamp so the
  // writer is never left wondering. The active save toast already
  // covers the transition state above.
  return (
    <span className="inline-flex items-center gap-1 text-success">
      <Check className="h-3 w-3" />
      Saved{lastSavedAt ? ` · ${formatRel(lastSavedAt)}` : ""}
    </span>
  )
}

// ─── Emoji picker popover ────────────────────────────────────────
// Curated grid of common doc emojis. No external dep; click closes
// the popover. Native emoji search engines wouldn't help our scale
// here and would add bundle weight.

const EMOJI_GRID = [
  "📝", "📘", "📚", "📕", "📗", "📙", "📔",
  "✏️", "🖊", "🖋", "📐", "📏", "📌", "📎",
  "💡", "🧠", "🎯", "🚀", "✨", "⭐", "🏆",
  "🎓", "🎬", "🎨", "🎮", "🎲", "🎤", "🎧",
  "💼", "🗂", "🗃", "📦", "📊", "📈", "📉",
  "✅", "⚠️", "❓", "❗", "🔥", "❤️", "👀",
  "🌐", "🔗", "🔒", "🔑", "🛡", "🧩", "🧪",
] as const

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-lg text-3xl transition-colors hover:bg-muted"
          aria-label="Change icon"
          title="Change icon"
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Pick an icon
        </p>
        <div className="grid grid-cols-7 gap-1">
          {EMOJI_GRID.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onChange(e)
                setOpen(false)
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted ${
                value === e ? "bg-primary/10 ring-1 ring-primary" : ""
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── More-actions menu ───────────────────────────────────────────

function DocActionsMenu({
  doc,
  onCopyLink,
  onDuplicate,
  onExport,
  onDelete,
  publicUrl,
}: {
  doc: { id: string; audience: { kind: string }; status: string; publicSlug?: string }
  onCopyLink: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
  /** Pre-resolved share URL (tenant-scoped when available, falls
   *  back to /k/<slug> on the global hub). Null when the doc isn't
   *  public + published, in which case the open-public item is hidden. */
  publicUrl: string | null
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Doc actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors hover:bg-muted"
          >
            <Link2 className="h-3.5 w-3.5" />
            Open public page
          </a>
        )}
        <button
          type="button"
          onClick={onCopyLink}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors hover:bg-muted"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy link
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors hover:bg-muted"
        >
          <FileText className="h-3.5 w-3.5" />
          Duplicate
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" />
          Export as Markdown
        </button>
        <div className="my-1 h-px bg-border" />
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Move to trash
        </button>
      </PopoverContent>
    </Popover>
  )
}

// ─── Markdown export (BlockNote JSON → markdown text) ────────────
// Naive converter — handles the common cases: paragraph, heading,
// bullet/numbered list, quote, code block, and our 5 typed embeds
// rendered as labelled links. Unknown block types degrade to plain
// text. Resilient to malformed shapes.

function blockNoteToMarkdown(content: unknown): string {
  if (!Array.isArray(content)) return ""

  const stringifyInlines = (nodes: unknown): string => {
    if (!Array.isArray(nodes)) return ""
    return nodes
      .map((n) => {
        if (!n || typeof n !== "object") return ""
        const node = n as { type?: string; text?: string; styles?: { bold?: boolean; italic?: boolean; code?: boolean } }
        if (node.type !== "text" || typeof node.text !== "string") return ""
        let t = node.text
        if (node.styles?.code) t = "`" + t + "`"
        if (node.styles?.bold) t = "**" + t + "**"
        if (node.styles?.italic) t = "*" + t + "*"
        return t
      })
      .join("")
  }

  const out: string[] = []
  for (const raw of content as Array<unknown>) {
    if (!raw || typeof raw !== "object") continue
    const b = raw as {
      type?: string
      props?: { level?: number; refId?: string; atSec?: string; url?: string }
      content?: unknown
    }
    const text = stringifyInlines(b.content)
    switch (b.type) {
      case "heading": {
        const level = b.props?.level === 1 ? "#" : b.props?.level === 3 ? "###" : "##"
        out.push(`${level} ${text}`)
        break
      }
      case "bulletListItem":
        out.push(`- ${text}`)
        break
      case "numberedListItem":
        out.push(`1. ${text}`)
        break
      case "quote":
        out.push(`> ${text}`)
        break
      case "codeBlock":
        out.push("```\n" + text + "\n```")
        break
      case "embed-lesson":
        out.push(`[Embedded lesson · ${b.props?.refId ?? ""}](#lesson)`)
        break
      case "embed-recording":
        out.push(
          `[Embedded recording · ${b.props?.refId ?? ""}${b.props?.atSec ? " @ " + b.props.atSec : ""}](#recording)`,
        )
        break
      case "embed-whiteboard":
        out.push(`[Embedded whiteboard · ${b.props?.refId ?? ""}](#whiteboard)`)
        break
      case "embed-doc":
        out.push(`[Embedded doc · ${b.props?.refId ?? ""}](#doc)`)
        break
      case "embed-quiz":
        out.push(`[Embedded quiz · ${b.props?.refId ?? ""}](#quiz)`)
        break
      case "paragraph":
      default:
        if (text) out.push(text)
        else out.push("")
        break
    }
  }
  return out.join("\n\n").trim() + "\n"
}

// ─── Tiny utility: relative time formatter ───────────────────────
function formatRel(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (Number.isNaN(ms) || ms < 0) return "just now"
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}
