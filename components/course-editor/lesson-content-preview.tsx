"use client"

// Lightweight inline preview shown under a lesson's content field so the
// teacher can verify the link / file works before saving. Branches on
// lesson type:
//   • video   → reuses VideoUrlPreview (YouTube/Vimeo/Loom/MP4)
//   • audio   → native <audio controls> with the URL
//   • embed   → sandboxed <iframe> for Canva/Notion/Figma/Slides/Loom
//   • pdf     → <iframe> of the PDF (browsers render natively)
//   • other   → small "Open file →" link card
//
// Returns null for empty content so callers can drop it under any field
// without managing empty-state spacing.

import { ExternalLink, FileText } from "lucide-react"
import { VideoUrlPreview } from "@/components/upload/video-url-preview"
import type { LessonType } from "@/lib/lms-store"

interface Props {
  type: LessonType
  url: string
  className?: string
}

export function LessonContentPreview({ type, url, className }: Props) {
  const value = url?.trim() ?? ""
  if (!value) return null

  if (type === "video") {
    return <VideoUrlPreview url={value} className={className} />
  }

  if (type === "audio") {
    return (
      <div className={className}>
        <audio src={value} controls preload="metadata" className="w-full" />
        <p className="mt-1 text-[11px] text-muted-foreground">Audio preview</p>
      </div>
    )
  }

  if (type === "pdf") {
    return (
      <div className={className}>
        <div className="overflow-hidden rounded-md border bg-muted">
          <iframe
            src={value}
            title="PDF preview"
            className="aspect-video w-full"
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">PDF preview</p>
      </div>
    )
  }

  if (type === "embed") {
    return (
      <div className={className}>
        <div className="overflow-hidden rounded-md border bg-muted">
          <iframe
            src={value}
            title="Embed preview"
            // Sandbox tightens what arbitrary 3rd-party iframes can do.
            // Most embed providers (Canva, Notion, Figma, Loom, Google
            // Slides) work with these flags; expand if a specific one
            // legitimately needs more.
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Embed preview</p>
      </div>
    )
  }

  // Documents (PDF/DOC/PPT/XLS), text — no clean inline preview. Surface a
  // clickable link so the teacher can verify the file opens.
  return (
    <div className={className}>
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs hover:bg-muted"
      >
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="max-w-[280px] truncate">{value.split("/").pop() || value}</span>
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </a>
    </div>
  )
}
