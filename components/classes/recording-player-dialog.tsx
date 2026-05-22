"use client"

// Inline video-player dialog for recording playback.
//
// Used on the post-class wrap screen + anywhere else we want to surface a
// class recording. Handles three URL shapes:
//
//   - Direct file URLs (.mp4 / .webm / R2 CDN, etc.) → native <video> tag.
//   - Embeddable providers (YouTube, Loom, Vimeo, Wistia, ...) → iframe via
//     the same videoEmbedUrl helper the recap editor uses.
//   - Anything else → falls back to a plain "Open in new tab" link.

import { useState } from "react"
import { ExternalLink, Play } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { detectVideoProvider, videoEmbedUrl } from "@/lib/lesson-utils"

interface RecordingPlayerDialogProps {
  url: string
  title?: string
  /**
   * Custom trigger element. Falls back to a "Watch" outline button if omitted.
   * Pass `triggerLabel` to keep the default button shape but change its text.
   */
  trigger?: React.ReactNode
  triggerLabel?: string
  /** Public URL of the WebVTT captions sidecar, if available. */
  transcriptUrl?: string | null
  /** Plain-text transcript for the "Transcript" panel. */
  transcriptText?: string | null
}

export function RecordingPlayerDialog({
  url,
  title = "Class recording",
  trigger,
  triggerLabel = "Watch",
  transcriptUrl,
  transcriptText,
}: RecordingPlayerDialogProps) {
  const [open, setOpen] = useState(false)
  const provider = detectVideoProvider(url)
  const embed = videoEmbedUrl(url)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{title}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              Open in new tab
            </a>
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {provider === "file" ? (
            // Native player: gives us playback controls, fullscreen, picture-in-picture.
            // `preload="metadata"` keeps initial bandwidth low until the user hits play.
            // When a VTT sidecar exists, browsers expose the CC button
            // automatically — no extra UI work.
            <video
              src={url}
              controls
              preload="metadata"
              autoPlay
              crossOrigin={transcriptUrl ? "anonymous" : undefined}
              className="aspect-video w-full rounded-md bg-black"
            >
              {transcriptUrl && (
                <track
                  kind="captions"
                  src={transcriptUrl}
                  srcLang="en"
                  label="Auto-generated"
                  default
                />
              )}
            </video>
          ) : embed ? (
            <iframe
              src={embed}
              title={title}
              className="aspect-video w-full rounded-md border border-border/60"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-border/60 bg-muted/40 p-12 text-center">
              <p className="text-sm text-muted-foreground">
                This recording can&apos;t be inlined here.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open recording
                </a>
              </Button>
            </div>
          )}
          {transcriptText && (
            <details className="mt-4 rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Transcript
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Auto-generated · Whisper
                </span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {transcriptText}
              </p>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
