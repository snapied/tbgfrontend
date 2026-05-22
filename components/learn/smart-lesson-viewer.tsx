"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Lock,
  Maximize2,
  Music,
  Paperclip,
  Radio,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLMS, type Lesson } from "@/lib/lms-store"
import { RichTextContent, isRichTextEmpty } from "@/components/editor/rich-text-content"
import { AttachmentList as SharedAttachmentList } from "@/components/learn/attachment-list"
import {
  computeSessionStatus,
  formatSessionWhen,
  providerLabel as livePlatformLabel,
} from "@/lib/live-session-utils"
import {
  detectDocumentKind,
  detectEmbedProvider,
  detectVideoProvider,
  embedUrl,
  formatBytes,
  officeViewerUrl,
  providerLabel,
  videoEmbedUrl,
} from "@/lib/lesson-utils"

interface SmartLessonViewerProps {
  lesson: Lesson
  // When true, hide the content and show an upgrade prompt instead.
  locked?: boolean
  onUnlockRequest?: () => void
}

export function SmartLessonViewer({ lesson, locked, onUnlockRequest }: SmartLessonViewerProps) {
  if (locked) {
    return <LockedShade onUnlockRequest={onUnlockRequest} />
  }

  return (
    <div className="space-y-4">
      <ContentArea lesson={lesson} />

      {/* Resources / attachments */}
      {(lesson.attachments?.length ?? 0) > 0 && (
        <AttachmentsList attachments={lesson.attachments ?? []} />
      )}
      {(lesson.resources?.length ?? 0) > 0 && (
        <ResourceLinks resources={lesson.resources ?? []} />
      )}
    </div>
  )
}

// ============================================================
// Content router — picks the right viewer
// ============================================================
function ContentArea({ lesson }: { lesson: Lesson }) {
  switch (lesson.type) {
    case "video":
      return <VideoViewer url={lesson.content} />
    case "audio":
      return <AudioViewer url={lesson.content} />
    case "pdf":
      return <PdfViewer url={lesson.content} />
    case "document":
      return <DocumentViewer url={lesson.content} />
    case "embed":
      return <EmbedViewer url={lesson.content} />
    case "text":
      return <TextViewer markdown={lesson.content} />
    case "live":
      return <LiveLessonViewer sessionId={lesson.content} />
    default:
      return (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Unsupported lesson type: {lesson.type}
          </CardContent>
        </Card>
      )
  }
}

// ============================================================
// Live lesson — resolves the referenced LiveSession (if any) and surfaces
// a Join button. Falls back to a placeholder when no session is linked yet.
// ============================================================
function LiveLessonViewer({ sessionId }: { sessionId: string }) {
  const { getLiveSessionById, currentUser, recordJoin } = useLMS()
  const session = sessionId ? getLiveSessionById(sessionId) : undefined

  if (!session) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Live session placeholder</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Once your instructor schedules a live class from the Live Classes
                dashboard, the Join button will appear here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const status = computeSessionStatus(session)
  const isLive = status === "live"
  const join = () => {
    if (currentUser) recordJoin(session.id, currentUser.id)
    window.open(session.meetingUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <Card className={cn(isLive && "border-destructive/30 bg-destructive/5")}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                isLive ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary",
              )}
            >
              {isLive ? <Radio className="h-5 w-5 animate-pulse" /> : <Video className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{session.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <Calendar className="mr-1 inline h-3 w-3" />
                {formatSessionWhen(session.scheduledAt)} · {session.durationMinutes} min · {livePlatformLabel(session.provider)}
              </p>
            </div>
          </div>
          {status !== "cancelled" && status !== "ended" ? (
            <Button onClick={join} variant={isLive ? "default" : "outline"}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {isLive ? "Join now" : "Open link"}
            </Button>
          ) : (
            <Badge variant="outline">{status === "ended" ? "Ended" : "Cancelled"}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Video
// ============================================================
function VideoViewer({ url }: { url: string }) {
  if (!url) return <EmptyState label="No video URL provided yet." />
  const provider = detectVideoProvider(url)
  const embed = videoEmbedUrl(url)

  if (provider === "file") {
    return (
      <div className="overflow-hidden rounded-lg bg-black">
        <video src={url} controls className="aspect-video w-full" controlsList="nodownload">
          Your browser doesn&apos;t support inline video.
        </video>
      </div>
    )
  }

  if (embed) {
    return (
      <ViewerFrame title={providerLabel(provider)} src={embed} sourceUrl={url} />
    )
  }

  return (
    <BrokenEmbed
      url={url}
      hint="We couldn't detect a player for this URL. Open the link in a new tab."
    />
  )
}

// ============================================================
// Audio
// ============================================================
function AudioViewer({ url }: { url: string }) {
  if (!url) return <EmptyState label="No audio URL provided yet." />
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Music className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <audio src={url} controls className="w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// PDF
// ============================================================
function PdfViewer({ url }: { url: string }) {
  const [fullscreen, setFullscreen] = useState(false)
  if (!url) return <EmptyState label="No PDF URL provided yet." />

  return (
    <ViewerFrame
      title="PDF"
      src={url}
      sourceUrl={url}
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen((v) => !v)}
      trailingActions={
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
          download
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      }
    />
  )
}

// ============================================================
// Documents (DOC/PPT/XLSX/TXT) via Microsoft Office Viewer
// ============================================================
function DocumentViewer({ url }: { url: string }) {
  if (!url) return <EmptyState label="No document URL provided yet." />
  const kind = detectDocumentKind(url)
  // PDFs render natively without the Office viewer.
  if (kind === "pdf") return <PdfViewer url={url} />
  if (kind === "txt") {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Plain text · open below or in a new tab
          </p>
          <iframe
            title="Document"
            src={url}
            className="h-[60vh] w-full rounded-md border border-border/60 bg-card"
          />
        </CardContent>
      </Card>
    )
  }

  // Office viewer requires a publicly-reachable URL.
  const viewer = officeViewerUrl(url)
  return (
    <ViewerFrame
      title={kindLabel(kind)}
      src={viewer}
      sourceUrl={url}
      trailingActions={
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
          download
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      }
    />
  )
}

// ============================================================
// Embeds (Canva / Gamma / Notion / Figma / Slides / Loom / Miro)
// ============================================================
function EmbedViewer({ url }: { url: string }) {
  if (!url) return <EmptyState label="No embed URL provided yet." />
  const provider = detectEmbedProvider(url)
  const src = embedUrl(url)
  return <ViewerFrame title={providerLabel(provider)} src={src} sourceUrl={url} />
}

// ============================================================
// Article / "text" lesson content
// ============================================================
// Lesson.content for `type === "text"` is HTML authored via the shared
// RichTextEditor (Tiptap output). Older lessons may still hold raw text
// or markdown — those render as plain text inside the prose container,
// which is degraded but readable.
function TextViewer({ markdown }: { markdown: string }) {
  if (isRichTextEmpty(markdown)) {
    return <EmptyState label="This lesson has no reading content yet." />
  }
  const looksLikeHtml = /<\w+/.test(markdown)
  return (
    <Card>
      <CardContent className="p-6">
        {looksLikeHtml ? (
          <RichTextContent html={markdown} />
        ) : (
          <div className="tiptap-content whitespace-pre-wrap">{markdown}</div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Shared chrome
// ============================================================
function ViewerFrame({
  title,
  src,
  sourceUrl,
  fullscreen,
  onToggleFullscreen,
  trailingActions,
}: {
  title: string
  src: string
  sourceUrl: string
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  trailingActions?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        fullscreen && "fixed inset-0 z-50 rounded-none",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="rounded-sm">{title}</Badge>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> Open
          </a>
        </div>
        <div className="flex items-center gap-1">
          {trailingActions}
          {onToggleFullscreen && (
            <Button variant="ghost" size="icon" onClick={onToggleFullscreen} className="h-7 w-7">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <iframe
        src={src}
        title={title}
        className={cn(
          "w-full bg-background",
          fullscreen ? "h-[calc(100vh-40px)]" : "aspect-video h-[60vh] min-h-[400px]",
        )}
        allow="autoplay; fullscreen; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

function AttachmentsList({ attachments }: { attachments: NonNullable<Lesson["attachments"]> }) {
  // Delegate to the shared AttachmentList — same click-to-preview +
  // download-still-available pattern the teacher's course view uses.
  return <SharedAttachmentList attachments={attachments} />
}

function ResourceLinks({ resources }: { resources: NonNullable<Lesson["resources"]> }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resources
        </p>
        <ul className="space-y-1.5">
          {resources.map((r, i) => (
            <li key={i}>
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {r.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function BrokenEmbed({ url, hint }: { url: string; hint: string }) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-2 text-sm font-medium">Can&apos;t preview this content</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open original
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

function LockedShade({ onUnlockRequest }: { onUnlockRequest?: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="aspect-video w-full bg-gradient-to-br from-muted via-muted/80 to-muted/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold">This lesson is locked</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Enroll in the course or unlock the paid content to continue.
          </p>
          {onUnlockRequest && (
            <Button onClick={onUnlockRequest} className="mt-2">
              Unlock
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function kindLabel(kind: ReturnType<typeof detectDocumentKind>) {
  if (kind === "ppt") return "Presentation"
  if (kind === "doc") return "Document"
  if (kind === "xlsx") return "Spreadsheet"
  if (kind === "pdf") return "PDF"
  if (kind === "txt") return "Text"
  return "Document"
}
