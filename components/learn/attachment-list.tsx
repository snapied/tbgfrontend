"use client"

// Lesson attachments — click a row to preview the file in a modal
// (images render as <img>, PDFs/docs in an iframe, audio/video in their
// native players, unknown types show an "Open in new tab" fallback).
// The download button stays available as a quick alternative.

import { useState } from "react"
import { Download, ExternalLink, FileText, Image as ImageIcon, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LessonAttachment } from "@/lib/lms-store"
import { cn } from "@/lib/utils"

interface Props {
  attachments: LessonAttachment[]
  className?: string
  // Hide the section heading when this list is nested inside another card
  // that already has its own header.
  hideHeading?: boolean
}

export function AttachmentList({ attachments, className, hideHeading }: Props) {
  const [open, setOpen] = useState<LessonAttachment | null>(null)
  if (attachments.length === 0) return null

  return (
    <div className={cn("rounded-md border border-border bg-card p-3", className)}>
      {!hideHeading && (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Attachments
        </p>
      )}
      <ul className={cn(!hideHeading && "mt-1.5", "space-y-1")}>
        {attachments.map((a) => {
          const kind = detectKind(a.url, a.filename)
          const Icon = kind === "image" ? ImageIcon : kind === "pdf" ? FileText : Paperclip
          return (
            <li key={a.id} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/40">
              <button
                type="button"
                onClick={() => setOpen(a)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-primary hover:underline"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{a.filename}</span>
              </button>
              {a.mandatory && (
                <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  Required
                </span>
              )}
              {a.downloadable !== false && (
                <a
                  href={a.url}
                  download={a.filename}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Download"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
            </li>
          )
        })}
      </ul>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span className="truncate text-base">{open?.filename}</span>
              {open && (
                <div className="flex shrink-0 gap-1.5">
                  {open.downloadable !== false && (
                    <Button asChild variant="outline" size="sm">
                      <a href={open.url} download={open.filename}>
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <a href={open.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Open
                    </a>
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30">
            {open && <Preview attachment={open} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Preview({ attachment }: { attachment: LessonAttachment }) {
  const kind = detectKind(attachment.url, attachment.filename)

  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.url}
        alt={attachment.filename}
        className="mx-auto block max-h-[75vh] object-contain"
      />
    )
  }
  if (kind === "audio") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <audio src={attachment.url} controls className="w-full max-w-xl" />
      </div>
    )
  }
  if (kind === "video") {
    return (
      <video src={attachment.url} controls className="block w-full" />
    )
  }
  if (kind === "pdf" || kind === "office" || kind === "html") {
    // PDFs render natively; Office docs work if a viewer is configured
    // server-side OR if the URL is from Drive/SharePoint (which already
    // returns an embeddable view). For .docx etc. without a server-side
    // converter, the iframe will offer to download — still better than
    // nothing because the teacher can verify the file exists.
    return (
      <iframe
        src={attachment.url}
        title={attachment.filename}
        className="block h-[75vh] w-full"
      />
    )
  }
  // Unknown / archive — no inline preview, just guide the user out.
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
      <Paperclip className="h-8 w-8" />
      <p>We can&apos;t preview this file type inline. Use the buttons above to open or download it.</p>
    </div>
  )
}

type FileKind = "image" | "pdf" | "audio" | "video" | "office" | "html" | "other"
function detectKind(url: string, filename?: string): FileKind {
  const lower = (filename || url).toLowerCase().split("?")[0]
  if (/\.(png|jpe?g|gif|webp|svg|avif|bmp|heic)$/.test(lower) || url.startsWith("data:image/")) return "image"
  if (/\.pdf$/.test(lower) || url.startsWith("data:application/pdf")) return "pdf"
  if (/\.(mp3|wav|m4a|ogg|aac|flac)$/.test(lower)) return "audio"
  if (/\.(mp4|webm|mov|m4v)$/.test(lower)) return "video"
  if (/\.(docx?|pptx?|xlsx?|odt|ods|odp|txt|csv)$/.test(lower)) return "office"
  if (/\.html?$/.test(lower)) return "html"
  return "other"
}
