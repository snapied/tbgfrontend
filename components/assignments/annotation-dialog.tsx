"use client"

// Full-screen dialog for annotating a student's submission on an
// Excalidraw canvas. The student's uploaded file (image or PDF page 1)
// is rendered as a locked background element. The teacher draws
// corrections on top, then clicks "Save" to export as PNG, upload to
// /api/uploads, and store the URL on the submission.

import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { Download, Loader2, Pencil, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import "@excalidraw/excalidraw/index.css"
import type {
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types"

// Dynamic import — Excalidraw can't SSR.
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Loading annotation canvas...
      </div>
    ),
  },
)

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The URL of the student's submitted file (image or PDF). */
  contentUrl: string
  /** Student name — used in the dialog title. */
  studentName: string
  /** Assignment title — used in the dialog subtitle. */
  assignmentTitle: string
  /** Called after the annotated image is uploaded. */
  onSave: (annotatedUrl: string) => void
}

// Load an image URL as a data URL so we can embed it into Excalidraw.
async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  // For PDFs, render page 1 to canvas using the browser's built-in rendering
  // via an offscreen canvas. We use pdf.js for this.
  if (url.toLowerCase().endsWith(".pdf")) {
    return renderPdfFirstPage(url)
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = url
  })
}

async function renderPdfFirstPage(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  // Dynamically import pdfjs-dist. If not installed, fall back to
  // treating it as an image (the browser might handle it).
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = "pdfjs-dist"
    const pdfjsLib = await (import(/* webpackIgnore: true */ mod) as Promise<any>)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
    const doc = await pdfjsLib.getDocument(url).promise
    const page = await doc.getPage(1)
    const scale = 2 // Render at 2x for clarity
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext("2d")!
    await page.render({ canvasContext: ctx, viewport }).promise
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: viewport.width,
      height: viewport.height,
    }
  } catch {
    // pdfjs-dist not available — try loading as image
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        resolve({
          dataUrl: url,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
        })
      }
      img.onerror = () => reject(new Error("Could not render PDF — install pdfjs-dist for PDF annotation support"))
      img.src = url
    })
  }
}

export function AnnotationDialog({
  open,
  onOpenChange,
  contentUrl,
  studentName,
  assignmentTitle,
  onSave,
}: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bgImage, setBgImage] = useState<{
    dataUrl: string
    width: number
    height: number
  } | null>(null)

  // Load the background image when the dialog opens
  useEffect(() => {
    if (!open || !contentUrl) return
    setLoading(true)
    setError(null)
    setBgImage(null)
    loadImageAsDataUrl(contentUrl)
      .then((result) => {
        setBgImage(result)
        setLoading(false)
      })
      .catch((err) => {
        setError((err as Error).message)
        setLoading(false)
      })
  }, [open, contentUrl])

  const handleSave = useCallback(async () => {
    const api = apiRef.current
    if (!api) return

    setSaving(true)
    try {
      // Get the exportToBlob function from the library
      const { exportToBlob } = await import("@excalidraw/excalidraw")

      const elements = api.getSceneElements()
      const files = api.getFiles()

      const blob = await exportToBlob({
        elements,
        files,
        appState: {
          exportWithDarkMode: false,
          exportBackground: true,
          viewBackgroundColor: "#ffffff",
        },
        getDimensions: () => ({
          width: bgImage?.width ?? 1200,
          height: bgImage?.height ?? 900,
          scale: 1,
        }),
      })

      // Upload to /api/uploads
      const formData = new FormData()
      formData.append("file", blob, `annotation-${Date.now()}.png`)
      formData.append("tenant", "shared")

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      })
      const body = await res.json()
      if (!body.ok) throw new Error(body.error || "Upload failed")

      onSave(body.url)
      toast.success("Annotation saved")
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message || "Failed to save annotation")
    } finally {
      setSaving(false)
    }
  }, [bgImage, onSave, onOpenChange])

  // Build the initial scene with the background image as a locked element.
  // Excalidraw uses branded types (FileId) so we cast through `unknown`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialData: any = bgImage
    ? (() => {
        const fileId = "bg-submission"
        const w = Math.min(bgImage.width, 1200)
        const h = Math.round((w / bgImage.width) * bgImage.height)
        return {
          elements: [
            {
              id: "bg-image",
              type: "image",
              x: 0,
              y: 0,
              width: w,
              height: h,
              fileId,
              locked: true,
              opacity: 100,
              strokeColor: "transparent",
              backgroundColor: "transparent",
              fillStyle: "solid",
              strokeWidth: 1,
              strokeStyle: "solid",
              roughness: 0,
              roundness: null,
              seed: 1,
              version: 1,
              versionNonce: 1,
              isDeleted: false,
              groupIds: [],
              boundElements: null,
              link: null,
              status: "saved",
              scale: [1, 1],
              angle: 0,
              frameId: null,
              index: "a0",
              customData: undefined,
              crop: null,
            },
          ],
          files: {
            [fileId]: {
              id: fileId,
              mimeType: "image/png",
              dataURL: bgImage.dataUrl,
              created: Date.now(),
              lastRetrieved: Date.now(),
            },
          },
          appState: {
            viewBackgroundColor: "#ffffff",
            currentItemStrokeColor: "#e03131",
            currentItemStrokeWidth: 2,
          },
        }
      })()
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-[95vw] flex-col gap-0 p-0 sm:max-w-[95vw]">
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Pencil className="h-4 w-4 text-primary" />
              Annotate: {studentName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {assignmentTitle} — draw corrections on top of the submission
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || loading || !!error}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save annotation
            </Button>
          </div>
        </DialogHeader>

        <div className="relative flex-1 overflow-hidden">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-sm text-muted-foreground">
                Loading submission...
              </span>
            </div>
          )}

          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground">
                Make sure the submission URL points to an image or PDF.
              </p>
            </div>
          )}

          {!loading && !error && bgImage && initialData && (
            <Excalidraw
              excalidrawAPI={(api) => {
                apiRef.current = api
              }}
              initialData={initialData}
              UIOptions={{
                canvasActions: {
                  saveToActiveFile: false,
                  loadScene: false,
                  export: false,
                  saveAsImage: false,
                },
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Small preview component for showing annotated results
export function AnnotatedPreview({
  url,
  className,
}: {
  url: string
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div
        className={`group relative cursor-pointer overflow-hidden rounded-md border border-border ${className ?? ""}`}
        onClick={() => setExpanded(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Teacher's annotated feedback"
          className="w-full object-contain"
          style={{ maxHeight: 300 }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
            Click to expand
          </span>
        </div>
      </div>

      {/* Full-screen expanded view */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          onClick={() => setExpanded(false)}
        >
          <div className="relative max-h-full max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Teacher's annotated feedback (expanded)"
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            />
            <div className="absolute -top-10 right-0 flex gap-2">
              <a
                href={url}
                download="annotated-feedback.png"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => setExpanded(false)}
                className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
