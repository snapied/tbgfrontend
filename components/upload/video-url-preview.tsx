"use client"

// Inline preview for a course intro / preview video URL.
//
// Detects the source from the URL and renders the right embed:
//   • YouTube  → youtube.com/embed/<id>
//   • Vimeo    → player.vimeo.com/video/<id>
//   • Loom     → loom.com/embed/<id>
//   • MP4/WebM → native <video controls>
//   • Other    → small "Open in new tab" link
//
// Returns null for an empty URL so callers can drop it under any input
// without worrying about empty layout space.

import { ExternalLink, FileVideo } from "lucide-react"

interface Props {
  url: string
  className?: string
}

interface ParsedVideo {
  kind: "youtube" | "vimeo" | "loom" | "file"
  embedSrc?: string
  fileSrc?: string
}

function parseVideoUrl(raw: string): ParsedVideo | null {
  const url = raw.trim()
  if (!url) return null

  // YouTube — covers youtu.be/<id>, youtube.com/watch?v=<id>, /shorts/<id>,
  // and the already-embedded /embed/<id> form so paste-ins from anywhere
  // work.
  const ytMatch =
    url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i)
  if (ytMatch) {
    return { kind: "youtube", embedSrc: `https://www.youtube.com/embed/${ytMatch[1]}` }
  }

  // Vimeo — vimeo.com/<id> or player.vimeo.com/video/<id>.
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i)
  if (vimeoMatch) {
    return { kind: "vimeo", embedSrc: `https://player.vimeo.com/video/${vimeoMatch[1]}` }
  }

  // Loom — loom.com/share/<id> or loom.com/embed/<id>.
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/i)
  if (loomMatch) {
    return { kind: "loom", embedSrc: `https://www.loom.com/embed/${loomMatch[1]}` }
  }

  // Direct video file (covers MP4 / WebM / MOV).
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) {
    return { kind: "file", fileSrc: url }
  }

  return null
}

export function VideoUrlPreview({ url, className }: Props) {
  if (!url.trim()) return null
  const parsed = parseVideoUrl(url)

  if (!parsed) {
    // Unknown source — give them a way to verify the link works without
    // pretending we can play it inline.
    return (
      <div className={className}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3" />
          Preview link in a new tab
        </a>
        <p className="mt-1 text-[11px] text-muted-foreground">
          We couldn&apos;t auto-embed this URL — students will see it as a clickable link.
        </p>
      </div>
    )
  }

  if (parsed.kind === "file" && parsed.fileSrc) {
    return (
      <div className={className}>
        <div className="overflow-hidden rounded-md border bg-black">
          <video
            src={parsed.fileSrc}
            controls
            preload="metadata"
            className="aspect-video w-full"
          />
        </div>
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <FileVideo className="h-3 w-3" /> Direct video file
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-md border bg-black">
        <iframe
          src={parsed.embedSrc}
          title="Intro video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
      </div>
      <p className="mt-1 text-[11px] capitalize text-muted-foreground">
        {parsed.kind} preview
      </p>
    </div>
  )
}
