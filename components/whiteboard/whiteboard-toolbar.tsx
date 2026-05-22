"use client"

// Custom Figjam/Apple-Freeform-style toolbar that sits on top of Excalidraw.
//
// Layout (left → right, three groups separated by dividers):
//   1. Navigation: Selection
//   2. Drawing:    Pen, Highlighter, Eraser
//   3. Structure:  Shapes (popover) → Rectangle | Ellipse | Diamond | Arrow | Line
//                  Frame, Sticky, Text, Image, Laser
//
// The Shapes group is "clubbed" behind a single Popover so we don't show
// five shape buttons in a row. The button's icon updates to the last-picked
// shape (Freeform behaviour). Click the button again to re-arm that shape.

import { useState } from "react"
import {
  MousePointer2,
  Pencil,
  Highlighter as HighlighterIcon,
  Eraser,
  Square,
  Circle as CircleIcon,
  Diamond,
  ArrowRight,
  Minus as LineIcon,
  Type,
  ImageIcon,
  Frame as FrameIcon,
  Crosshair,
  ChevronUp,
  MoreHorizontal,
} from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"

export type ToolKey =
  | "selection"
  | "pen"
  | "highlighter"
  | "eraser"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "line"
  | "text"
  | "image"
  | "frame"
  | "laser"

type ShapeKey = "rectangle" | "ellipse" | "diamond" | "arrow" | "line"

interface ToolDef {
  key: ToolKey
  label: string
  icon: React.ReactNode
  /** Background colour of the button when active (Freeform-style coding). */
  tint: string
  /** Coloured dot under the icon when inactive — gives the row personality. */
  accent?: string
  /** Keyboard shortcut (shown in the hover tooltip). */
  shortcut?: string
  /** When true, hide on small screens (<md) and surface inside the More popover. */
  collapseOnMobile?: boolean
}

// Shortcut hints reflect Excalidraw's default keymap. Hover any tool to see
// the key in parentheses (helpful for power users; ignored by everyone else).
const SELECTION: ToolDef = {
  key: "selection", label: "Select", icon: <MousePointer2 />,
  tint: "bg-slate-100 text-slate-700", accent: "bg-slate-300", shortcut: "V",
}

const DRAWING_TOOLS: ToolDef[] = [
  { key: "pen",         label: "Pen",         icon: <Pencil />,          tint: "bg-slate-900 text-white",       accent: "bg-slate-900",  shortcut: "P" },
  { key: "highlighter", label: "Highlighter", icon: <HighlighterIcon />, tint: "bg-yellow-200 text-yellow-900", accent: "bg-yellow-300" },
  { key: "eraser",      label: "Eraser",      icon: <Eraser />,          tint: "bg-pink-200 text-pink-900",     accent: "bg-pink-300",   shortcut: "E" },
]

const SHAPE_OPTIONS: { key: ShapeKey; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { key: "rectangle", label: "Rectangle", icon: <Square />,     shortcut: "R" },
  { key: "ellipse",   label: "Ellipse",   icon: <CircleIcon />, shortcut: "O" },
  { key: "diamond",   label: "Diamond",   icon: <Diamond />,    shortcut: "D" },
  { key: "arrow",     label: "Arrow",     icon: <ArrowRight />, shortcut: "A" },
  { key: "line",      label: "Line",      icon: <LineIcon />,   shortcut: "L" },
]
const STRUCTURE_AFTER_SHAPES: ToolDef[] = [
  { key: "text",   label: "Text",          icon: <Type />,        tint: "bg-slate-100 text-slate-700",   accent: "bg-slate-400",  shortcut: "T" },
  // Less frequently used — collapse into the "More" overflow on small screens.
  { key: "frame",  label: "Frame",         icon: <FrameIcon />,   tint: "bg-indigo-100 text-indigo-900", accent: "bg-indigo-300", shortcut: "F", collapseOnMobile: true },
  { key: "image",  label: "Image",         icon: <ImageIcon />,   tint: "bg-cyan-100 text-cyan-900",     accent: "bg-cyan-300",                   collapseOnMobile: true },
]

interface WhiteboardToolbarProps {
  api: ExcalidrawImperativeAPI | null
  activeTool: ToolKey
  onSelectTool: (tool: ToolKey) => void
  /**
   * Element to portal popovers into. Important for fullscreen: when the
   * canvas wrapper goes fullscreen, the browser only shows that subtree —
   * Radix's default `document.body` portal lands outside it and the popover
   * disappears. Passing the fullscreened element fixes that.
   */
  container?: HTMLElement | null
}

export function WhiteboardToolbar({ api, activeTool, onSelectTool, container }: WhiteboardToolbarProps) {
  // Last-picked shape — drives the icon shown on the Shapes button and what
  // gets re-armed when the user clicks the button without opening the popover.
  const [currentShape, setCurrentShape] = useState<ShapeKey>("rectangle")
  const [shapesOpen, setShapesOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const mobileCollapsed = STRUCTURE_AFTER_SHAPES.filter((t) => t.collapseOnMobile)
  const moreHasActive = mobileCollapsed.some((t) => t.key === activeTool)

  const handle = (tool: ToolKey) => {
    if (!api) return
    onSelectTool(tool)
    switch (tool) {
      case "selection":
        api.setActiveTool({ type: "selection" })
        break
      case "pen":
        api.setActiveTool({ type: "freedraw" })
        api.updateScene({
          appState: {
            currentItemStrokeColor: "#1e1e1e",
            currentItemStrokeWidth: 2,
            currentItemOpacity: 100,
          },
        })
        break
      case "highlighter":
        api.setActiveTool({ type: "freedraw" })
        api.updateScene({
          appState: {
            currentItemStrokeColor: "#facc15",
            currentItemStrokeWidth: 12,
            currentItemOpacity: 45,
          },
        })
        break
      case "eraser":     api.setActiveTool({ type: "eraser" }); break
      case "rectangle":  api.setActiveTool({ type: "rectangle" }); break
      case "ellipse":    api.setActiveTool({ type: "ellipse" }); break
      case "diamond":    api.setActiveTool({ type: "diamond" }); break
      case "arrow":      api.setActiveTool({ type: "arrow" }); break
      case "line":       api.setActiveTool({ type: "line" }); break
      case "text":       api.setActiveTool({ type: "text" }); break
      case "image":      api.setActiveTool({ type: "image" }); break
      case "frame":      api.setActiveTool({ type: "frame" }); break
      case "laser":      api.setActiveTool({ type: "laser" }); break
    }
  }

  const handleShapePick = (shape: ShapeKey) => {
    setCurrentShape(shape)
    setShapesOpen(false)
    handle(shape)
  }

  const shapeIsActive = (["rectangle", "ellipse", "diamond", "arrow", "line"] as ToolKey[]).includes(activeTool)
  const shapesTint = "bg-blue-100 text-blue-900"
  const shapesAccent = "bg-blue-300"
  const currentShapeIcon =
    SHAPE_OPTIONS.find((s) => s.key === currentShape)?.icon ?? <Square />

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25),0_4px_12px_-4px_rgba(15,23,42,0.10)]">
        {/* Group 1 — navigation */}
        <ToolButton tool={SELECTION} isActive={activeTool === "selection"} onClick={() => handle("selection")} />

        <Divider />

        {/* Group 2 — drawing */}
        {DRAWING_TOOLS.map((t) => (
          <ToolButton key={t.key} tool={t} isActive={activeTool === t.key} onClick={() => handle(t.key)} />
        ))}

        <Divider />

        {/* Group 3 — structure. Shapes popover first, then everything else.
            Raw Radix Popover so we can pass `container` to the Portal —
            otherwise the dropdown renders into document.body and disappears
            when the canvas is fullscreened on a child element. */}
        <PopoverPrimitive.Root open={shapesOpen} onOpenChange={setShapesOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              title="Shapes"
              className={[
                "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all",
                shapeIsActive
                  ? `${shapesTint} shadow-sm scale-105`
                  : "bg-transparent text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              <span className="[&_svg]:h-5 [&_svg]:w-5">{currentShapeIcon}</span>
              <ChevronUp className="absolute right-1 top-1 h-3 w-3 text-slate-400" />
              {!shapeIsActive && (
                <span className={`absolute bottom-1 h-1 w-5 rounded-full ${shapesAccent} opacity-60`} />
              )}
            </button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal container={container ?? undefined}>
            <PopoverPrimitive.Content
              side="top"
              sideOffset={8}
              className="z-[9999] w-auto rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25),0_4px_12px_-4px_rgba(15,23,42,0.10)] outline-none"
            >
              <div className="flex items-center gap-1">
                {SHAPE_OPTIONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    title={`${s.label} (${s.shortcut})`}
                    onClick={() => handleShapePick(s.key)}
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      activeTool === s.key
                        ? "bg-blue-100 text-blue-900"
                        : "text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    <span className="[&_svg]:h-4 [&_svg]:w-4">{s.icon}</span>
                  </button>
                ))}
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>

        {/* Always-visible structure tools (Sticky, Text). */}
        {STRUCTURE_AFTER_SHAPES.filter((t) => !t.collapseOnMobile).map((t) => (
          <ToolButton key={t.key} tool={t} isActive={activeTool === t.key} onClick={() => handle(t.key)} />
        ))}
        {/* Collapsible structure tools (Frame, Image, Laser) — visible on md+ only. */}
        {STRUCTURE_AFTER_SHAPES.filter((t) => t.collapseOnMobile).map((t) => (
          <div key={t.key} className="hidden md:flex">
            <ToolButton tool={t} isActive={activeTool === t.key} onClick={() => handle(t.key)} />
          </div>
        ))}

        {/* "More" overflow — only shown below md. Hosts the collapsed tools. */}
        {mobileCollapsed.length > 0 && (
          <div className="flex md:hidden">
            <PopoverPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
              <PopoverPrimitive.Trigger asChild>
                <button
                  type="button"
                  title="More tools"
                  className={[
                    "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all",
                    moreHasActive
                      ? "bg-slate-200 text-slate-900 shadow-sm scale-105"
                      : "bg-transparent text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal container={container ?? undefined}>
                <PopoverPrimitive.Content
                  side="top"
                  sideOffset={8}
                  className="z-[9999] w-auto rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25),0_4px_12px_-4px_rgba(15,23,42,0.10)] outline-none"
                >
                  <div className="flex items-center gap-1">
                    {mobileCollapsed.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        title={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
                        onClick={() => {
                          handle(t.key)
                          setMoreOpen(false)
                        }}
                        className={[
                          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                          activeTool === t.key
                            ? `${t.tint}`
                            : "text-slate-700 hover:bg-slate-100",
                        ].join(" ")}
                      >
                        <span className="[&_svg]:h-4 [&_svg]:w-4">{t.icon}</span>
                      </button>
                    ))}
                  </div>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          </div>
        )}
      </div>
    </div>
  )
}

function Divider() {
  return <div className="mx-1 h-9 w-px bg-slate-200" />
}

function ToolButton({ tool, isActive, onClick }: { tool: ToolDef; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
      onClick={onClick}
      className={[
        "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all",
        isActive
          ? `${tool.tint} shadow-sm scale-105`
          : "bg-transparent text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      <span className="[&_svg]:h-5 [&_svg]:w-5">{tool.icon}</span>
      {!isActive && tool.accent && (
        <span className={`absolute bottom-1 h-1 w-5 rounded-full ${tool.accent} opacity-60`} />
      )}
    </button>
  )
}
