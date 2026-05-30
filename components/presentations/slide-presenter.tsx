"use client"

// Presentation viewer — renders self-contained HTML in iframes.
// No reveal.js dependency, no CSS conflicts, always works.
//
// Two components:
//   PresenterView — full-screen iframe with the complete deck
//   SlideThumb    — single-slide thumbnail preview

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

// Full-screen presenter — just an iframe with the self-contained HTML
export function PresenterView({
  html,
  title,
  onClose,
}: {
  html: string
  title: string
  onClose?: () => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument
      if (!doc) return
      doc.open()
      doc.write(html)
      doc.close()
      iframe.focus()
    } catch {
      // Cross-origin or sandbox restriction — use srcdoc fallback
      iframe.srcdoc = html
    }
  }, [html])

  // Forward keyboard events from parent to iframe (for slide navigation)
  useEffect(() => {
    const forward = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End" || e.key === "f" || e.key === "F") {
        e.preventDefault()
        try {
          const iframeDoc = iframeRef.current?.contentDocument
          if (iframeDoc) {
            iframeDoc.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, bubbles: true }))
          }
        } catch { /* cross-origin */ }
      }
    }
    window.addEventListener("keydown", forward)
    return () => window.removeEventListener("keydown", forward)
  }, [])

  // Escape closes presenter (but not if iframe has fullscreen)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) {
        onClose?.()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Thin top bar — auto-hides */}
      <div className="group relative">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-black/80 px-4 py-2 opacity-0 transition-opacity duration-300 hover:opacity-100 group-hover:opacity-100"
          style={{ opacity: 1 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              ← Exit
            </button>
            <span className="text-xs text-slate-500 truncate max-w-[400px]">{title}</span>
          </div>
          <button
            onClick={() => {
              const iframe = iframeRef.current
              if (!iframe) return
              if (!document.fullscreenElement) {
                iframe.requestFullscreen().catch(() => {})
              } else {
                document.exitFullscreen().catch(() => {})
              }
            }}
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20"
          >
            Fullscreen (F)
          </button>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        className="flex-1 border-0 w-full"
        title={title}
        allow="fullscreen"
      />
    </div>
  )
}

// Single-slide thumbnail — sandboxed iframe for clean rendering
export function SlideThumb({
  previewHtml,
  className,
}: {
  previewHtml: string
  className?: string
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument
      if (!doc) return
      doc.open()
      doc.write(previewHtml)
      doc.close()
    } catch {
      iframe.srcdoc = previewHtml
    }
  }, [previewHtml])

  return (
    <iframe
      ref={iframeRef}
      className={cn("pointer-events-none border-0", className)}
      sandbox="allow-same-origin"
      title="Slide preview"
      tabIndex={-1}
    />
  )
}
