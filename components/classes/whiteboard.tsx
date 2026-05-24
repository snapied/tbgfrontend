"use client"

import { useEffect, useRef, useState } from "react"
import { Eraser, Pencil, Trash2, Undo } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WhiteboardProps {
  className?: string
  readOnly?: boolean
}

const COLORS = [
  { value: "#0d1117", name: "Charcoal", class: "bg-slate-900 border-slate-700" },
  { value: "#2563eb", name: "Blue", class: "bg-blue-600 border-blue-400" },
  { value: "#10b981", name: "Green", class: "bg-emerald-500 border-emerald-300" },
  { value: "#ef4444", name: "Red", class: "bg-rose-500 border-rose-300" },
]

const WIDTHS = [2, 4, 8]

export function Whiteboard({ className, readOnly = false }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState("#2563eb")
  const [lineWidth, setLineWidth] = useState(4)
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil")
  const [isDrawing, setIsDrawing] = useState(false)

  // Configure high-DPI scaling on mount & resize
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      const rect = c.parentElement?.getBoundingClientRect()
      const width = rect?.width ?? 800
      const height = rect?.height ?? 450
      
      c.width = width * window.devicePixelRatio
      c.height = height * window.devicePixelRatio
      c.style.width = `${width}px`
      c.style.height = `${height}px`
      
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      
      // Paint initial clean white background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return

    const rect = c.getBoundingClientRect()
    let clientX, clientY
    
    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color
    ctx.lineWidth = lineWidth
    
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return

    const rect = c.getBoundingClientRect()
    let clientX, clientY
    
    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return

    const rect = c.getBoundingClientRect()
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, rect.width, rect.height)
  }

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white text-slate-800 ${className}`}>
      {/* Board toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-slate-55 px-4 py-2 text-xs">
        <div className="flex items-center gap-4">
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setColor(c.value)
                  setTool("pencil")
                }}
                disabled={readOnly}
                className={`h-5 w-5 rounded-full border-2 transition-all ${c.class} ${
                  color === c.value && tool === "pencil" ? "scale-110 ring-2 ring-primary/40" : "opacity-80 hover:opacity-100"
                }`}
                title={c.name}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Tools */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={tool === "pencil" ? "default" : "ghost"}
              onClick={() => setTool("pencil")}
              disabled={readOnly}
              className="h-7 px-2"
              title="Pencil"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={tool === "eraser" ? "default" : "ghost"}
              onClick={() => setTool("eraser")}
              disabled={readOnly}
              className="h-7 px-2"
              title="Eraser"
            >
              <Eraser className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Widths */}
          <div className="flex items-center gap-1.5">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setLineWidth(w)}
                disabled={readOnly}
                className={`flex h-5 w-5 items-center justify-center rounded transition-all hover:bg-slate-100 ${
                  lineWidth === w ? "bg-slate-150 font-bold" : "text-slate-500"
                }`}
                title={`${w}px brush`}
              >
                <span
                  className="rounded-full bg-slate-800"
                  style={{ width: `${w}px`, height: `${w}px` }}
                />
              </button>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={clearCanvas}
          disabled={readOnly}
          className="h-7 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          title="Clear Board"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
        </Button>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 bg-white cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 block h-full w-full"
        />
        {readOnly && (
          <div className="absolute right-3 top-3 pointer-events-none rounded-md bg-slate-900/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
            Instructor screen (view-only)
          </div>
        )}
      </div>
    </div>
  )
}
