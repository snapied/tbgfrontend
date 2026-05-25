"use client"

// DocBlock — the renderer for a single typed block. Used by both
// the editor (with onChange + drag handle) and the read-only viewer
// (just renders). Same component, different mode.

import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  Film,
  GraduationCap,
  Info,
  Lightbulb,
  PenSquare,
  Play,
  Quote,
  Sparkles,
  Video as VideoIcon,
} from "lucide-react"
import { useLMS } from "@/lib/lms-store"
import { useDocs, type DocBlock as DocBlockType } from "@/lib/docs"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { RichTextContent } from "@/components/editor/rich-text-content"

interface Props {
  block: DocBlockType
  /** When true, render an inline editor; when false, render-only. */
  editable: boolean
  onChange?: (patch: Partial<DocBlockType>) => void
  onFocus?: () => void
}

export function DocBlock({ block, editable, onChange, onFocus }: Props) {
  switch (block.type) {
    case "rich-text":
      return <RichTextBlock block={block} editable={editable} onChange={onChange} onFocus={onFocus} />
    case "heading":
      return <HeadingBlock block={block} editable={editable} onChange={onChange} />
    case "callout":
      return <CalloutBlock block={block} editable={editable} onChange={onChange} />
    case "divider":
      return <hr className="my-4 border-border" />
    case "image":
      return <ImageBlock block={block} editable={editable} onChange={onChange} />
    case "video":
      return <VideoBlock block={block} editable={editable} onChange={onChange} />
    case "embed-lesson":
      return <LessonEmbed refId={String(block.data.refId ?? "")} />
    case "embed-recording":
      return <RecordingEmbed refId={String(block.data.refId ?? "")} atSec={typeof block.data.atSec === "number" ? block.data.atSec : undefined} />
    case "embed-whiteboard":
      return <WhiteboardEmbed refId={String(block.data.refId ?? "")} />
    case "embed-doc":
      return <DocEmbed refId={String(block.data.refId ?? "")} />
    case "embed-quiz":
      return <QuizEmbed refId={String(block.data.refId ?? "")} />
    default:
      return null
  }
}

// ────────────────────────────────────────────────────────────────
// Content blocks
// ────────────────────────────────────────────────────────────────

function RichTextBlock({
  block, editable, onChange, onFocus,
}: { block: DocBlockType; editable: boolean; onChange?: (p: Partial<DocBlockType>) => void; onFocus?: () => void }) {
  const html = String(block.data.html ?? "")
  if (!editable) {
    return <RichTextContent html={html} />
  }
  return (
    <div onFocus={onFocus}>
      <RichTextEditor
        value={html}
        onChange={(v) => onChange?.({ data: { html: v } })}
        placeholder="Type / for commands, or just start writing…"
        minHeight={48}
      />
    </div>
  )
}

function HeadingBlock({
  block, editable, onChange,
}: { block: DocBlockType; editable: boolean; onChange?: (p: Partial<DocBlockType>) => void }) {
  const level = (block.data.level === 3 ? 3 : 2) as 2 | 3
  const text = String(block.data.text ?? "")
  const cls = level === 2
    ? "font-serif text-2xl font-bold tracking-tight"
    : "font-serif text-lg font-bold tracking-tight"
  if (!editable) {
    if (level === 2) return <h2 className={cls}>{text}</h2>
    return <h3 className={cls}>{text}</h3>
  }
  return (
    <input
      value={text}
      onChange={(e) => onChange?.({ data: { text: e.target.value } })}
      placeholder={level === 2 ? "Section heading" : "Sub-section"}
      className={`w-full bg-transparent outline-none placeholder:text-muted-foreground/30 ${cls}`}
    />
  )
}

function CalloutBlock({
  block, editable, onChange,
}: { block: DocBlockType; editable: boolean; onChange?: (p: Partial<DocBlockType>) => void }) {
  const tone = (block.data.tone ?? "info") as "info" | "warn" | "success" | "tip"
  const html = String(block.data.html ?? "")
  const styles = {
    info:    { ring: "border-blue-500/30   bg-blue-500/[0.06]",   icon: <Info className="h-4 w-4 text-blue-600" /> },
    warn:    { ring: "border-amber-500/40  bg-amber-500/[0.06]",  icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
    success: { ring: "border-success/40    bg-success/[0.06]",    icon: <CheckCircle2 className="h-4 w-4 text-success" /> },
    tip:     { ring: "border-primary/30    bg-primary/[0.05]",    icon: <Lightbulb className="h-4 w-4 text-primary" /> },
  }[tone]
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${styles.ring}`}>
      <span className="mt-0.5 shrink-0">{styles.icon}</span>
      <div className="min-w-0 flex-1">
        {editable ? (
          <RichTextEditor
            value={html}
            onChange={(v) => onChange?.({ data: { html: v } })}
            placeholder="Callout content…"
            minHeight={36}
          />
        ) : (
          <RichTextContent html={html} />
        )}
      </div>
      {editable && (
        <select
          value={tone}
          onChange={(e) => onChange?.({ data: { tone: e.target.value } })}
          className="shrink-0 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          aria-label="Callout tone"
        >
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="success">Success</option>
          <option value="tip">Tip</option>
        </select>
      )}
    </div>
  )
}

function ImageBlock({
  block, editable, onChange,
}: { block: DocBlockType; editable: boolean; onChange?: (p: Partial<DocBlockType>) => void }) {
  const url = String(block.data.url ?? "")
  const alt = String(block.data.alt ?? "")
  const caption = String(block.data.caption ?? "")
  return (
    <figure className="space-y-1.5">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="w-full rounded-lg border border-border" />
      ) : editable ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Paste an image URL below to render
        </div>
      ) : null}
      {editable && (
        <>
          <input
            value={url}
            onChange={(e) => onChange?.({ data: { url: e.target.value } })}
            placeholder="Image URL"
            className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs"
          />
          <input
            value={caption}
            onChange={(e) => onChange?.({ data: { caption: e.target.value } })}
            placeholder="Caption (optional)"
            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-xs italic text-muted-foreground placeholder:text-muted-foreground/40 focus:border-border"
          />
        </>
      )}
      {!editable && caption && (
        <figcaption className="text-xs italic text-muted-foreground">{caption}</figcaption>
      )}
    </figure>
  )
}

function VideoBlock({
  block, editable, onChange,
}: { block: DocBlockType; editable: boolean; onChange?: (p: Partial<DocBlockType>) => void }) {
  const url = String(block.data.url ?? "")
  const caption = String(block.data.caption ?? "")
  return (
    <figure className="space-y-1.5">
      {url ? (
        url.endsWith(".mp4") || url.endsWith(".webm") ? (
          <video src={url} controls className="w-full rounded-lg border border-border" />
        ) : (
          <iframe
            src={normaliseEmbedUrl(url)}
            className="aspect-video w-full rounded-lg border border-border"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )
      ) : editable ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          <VideoIcon className="mx-auto h-5 w-5" />
          <p className="mt-1">Paste a video URL (MP4, YouTube, Vimeo, Loom, Wistia)</p>
        </div>
      ) : null}
      {editable && (
        <>
          <input
            value={url}
            onChange={(e) => onChange?.({ data: { url: e.target.value } })}
            placeholder="Video URL"
            className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs"
          />
          <input
            value={caption}
            onChange={(e) => onChange?.({ data: { caption: e.target.value } })}
            placeholder="Caption (optional)"
            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-xs italic text-muted-foreground placeholder:text-muted-foreground/40 focus:border-border"
          />
        </>
      )}
      {!editable && caption && (
        <figcaption className="text-xs italic text-muted-foreground">{caption}</figcaption>
      )}
    </figure>
  )
}

function normaliseEmbedUrl(url: string): string {
  // Very light shim — embed YouTube via /embed; Vimeo + Loom via player.
  if (/youtube\.com\/watch\?v=([\w-]+)/.test(url)) {
    const m = url.match(/youtube\.com\/watch\?v=([\w-]+)/)
    return m ? `https://www.youtube.com/embed/${m[1]}` : url
  }
  if (/youtu\.be\/([\w-]+)/.test(url)) {
    const m = url.match(/youtu\.be\/([\w-]+)/)
    return m ? `https://www.youtube.com/embed/${m[1]}` : url
  }
  return url
}

// ────────────────────────────────────────────────────────────────
// Typed embeds — pull from the live LMS / Docs store
// ────────────────────────────────────────────────────────────────

function MissingEmbed({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
      ⚠️ This embed pointed to a {label} that no longer exists.
    </div>
  )
}

function LessonEmbed({ refId }: { refId: string }) {
  const { courses } = useLMS()
  const found = (() => {
    for (const c of courses) {
      for (const m of c.modules ?? []) {
        const l = m.lessons.find((x) => x.id === refId)
        if (l) return { course: c, module: m, lesson: l }
      }
    }
    return null
  })()
  if (!found) return <MissingEmbed label="lesson" />
  return (
    <Link
      href={`/dashboard/courses/${found.course.id}`}
      className="group block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Lesson · {found.course.title}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{found.lesson.title}</p>
          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            {found.lesson.description}
          </p>
        </div>
      </div>
    </Link>
  )
}

function RecordingEmbed({ refId, atSec }: { refId: string; atSec?: number }) {
  const { liveSessions } = useLMS()
  const s = liveSessions.find((x) => x.id === refId)
  if (!s || !s.recordingUrl) return <MissingEmbed label="recording" />
  const href = atSec != null
    ? `/dashboard/recordings/${s.id}?t=${Math.floor(atSec)}`
    : `/dashboard/recordings/${s.id}`
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-700">
          <Film className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
            Recording {atSec != null && `· starts at ${formatTC(atSec)}`}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{s.title}</p>
          <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Play className="h-2.5 w-2.5" /> Open in player
          </p>
        </div>
      </div>
    </Link>
  )
}

function formatTC(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
  return `${m}:${String(r).padStart(2, "0")}`
}

function WhiteboardEmbed({ refId }: { refId: string }) {
  const { whiteboards } = useLMS()
  const w = whiteboards.find((x) => x.id === refId)
  if (!w) return <MissingEmbed label="whiteboard" />
  return (
    <Link
      href={`/dashboard/whiteboards/${w.id}`}
      className="group block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        {w.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={w.thumbnail} alt="" className="h-12 w-16 shrink-0 rounded border border-border object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
            <PenSquare className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Whiteboard
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{w.title}</p>
          <p className="text-[11px] text-muted-foreground">Open the canvas →</p>
        </div>
      </div>
    </Link>
  )
}

function DocEmbed({ refId }: { refId: string }) {
  const { getDoc } = useDocs()
  const d = getDoc(refId)
  if (!d || d.deletedAt) return <MissingEmbed label="doc" />
  return (
    <Link
      href={`/dashboard/docs/${d.id}`}
      className="group block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl">
          {d.icon ?? "📝"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Doc
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{d.title}</p>
          <p className="text-[11px] text-muted-foreground">Open doc →</p>
        </div>
      </div>
    </Link>
  )
}

function QuizEmbed({ refId }: { refId: string }) {
  const { quizzes } = useLMS()
  const q = quizzes.find((x) => x.id === refId)
  if (!q) return <MissingEmbed label="quiz" />
  return (
    <Link
      href={`/dashboard/quizzes/${q.id}`}
      className="group block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
            Quiz · {q.questions?.length ?? 0} questions
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{q.title}</p>
          <p className="text-[11px] text-muted-foreground">Open quiz →</p>
        </div>
      </div>
    </Link>
  )
}

// Suppress unused-import noise for shared icons
void Quote
