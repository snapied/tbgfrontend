"use client"

// Floating zoom panel for the whiteboard. Sits bottom-right.
//
// Buttons (left to right):
//   −             zoom out
//   <current>%    click to reset to 100%
//   +             zoom in
//   ⛶             fit to content
//
// All wired through Excalidraw's imperative API + appState. Step size is
// 0.2× per click, which matches Figjam's keyboard zoom (Cmd-+).

import { Minus, Plus, Maximize } from "lucide-react"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"

const ZOOM_STEP = 0.2
const MIN_ZOOM = 0.1
const MAX_ZOOM = 30

interface ZoomPanelProps {
  api: ExcalidrawImperativeAPI | null
  /** Current zoom value (1 = 100%). */
  zoom: number
}

export function WhiteboardZoomPanel({ api, zoom }: ZoomPanelProps) {
  const setZoom = (next: number) => {
    if (!api) return
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next))
    api.updateScene({
      appState: { zoom: { value: clamped as never } },
    })
  }
  const zoomIn = () => setZoom(zoom + ZOOM_STEP)
  const zoomOut = () => setZoom(zoom - ZOOM_STEP)
  const resetZoom = () => setZoom(1)
  const fitToContent = () => {
    if (!api) return
    // scrollToContent with fitToContent: true zooms + pans so every element
    // fits the viewport. No-op when the canvas is empty.
    const elements = api.getSceneElements()
    if (elements.length === 0) {
      setZoom(1)
      return
    }
    api.scrollToContent(elements, { fitToContent: true, animate: true })
  }

  return (
    // Hidden below 1080 px to avoid crowding small windows (the bottom-centre
    // toolbar already collapses overflow there). Excalidraw's native pinch-
    // zoom + Cmd/Ctrl + scroll-wheel keep working without this panel.
    <div className="pointer-events-none absolute bottom-6 right-6 z-10 hidden min-[1080px]:block">
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.25),0_3px_8px_-3px_rgba(15,23,42,0.10)]">
        <ZoomBtn label="Zoom out" onClick={zoomOut} disabled={zoom <= MIN_ZOOM + 0.001}>
          <Minus className="h-4 w-4" />
        </ZoomBtn>
        <button
          type="button"
          onClick={resetZoom}
          title="Reset to 100%"
          className="min-w-[3.5rem] rounded-md px-2 py-1 text-center text-xs font-semibold tabular-nums text-slate-700 hover:bg-slate-100"
        >
          {Math.round(zoom * 100)}%
        </button>
        <ZoomBtn label="Zoom in" onClick={zoomIn} disabled={zoom >= MAX_ZOOM - 0.001}>
          <Plus className="h-4 w-4" />
        </ZoomBtn>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ZoomBtn label="Fit to screen" onClick={fitToContent}>
          <Maximize className="h-4 w-4" />
        </ZoomBtn>
      </div>
    </div>
  )
}

function ZoomBtn({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
