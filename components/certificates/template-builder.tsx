"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Type, Square, Circle, QrCode, PenLine, Image as ImageIcon,
  Trash2, ArrowUp, ArrowDown, Copy, Save, ChevronLeft, Upload,
  X, LayoutTemplate, Eye, FilePlus, Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  TEMPLATE_CANVAS, TEMPLATE_VARIABLES, blankTemplate, trulyBlankTemplate, upsertCustomTemplate,
  type Block, type CustomTemplate, type TextBlock, type ShapeBlock, type ImageBlock,
  type SignatureBlock, type DecorationBlock, type QrBlock,
} from "@/lib/custom-templates"
import { CustomTemplateRenderer, type FieldValues } from "./custom-template-renderer"
import { DECORATION_PRESETS, DECORATION_CATEGORIES, DecorationSvg } from "./decoration-presets"
import { SNIPPETS, SNIPPET_CATEGORIES, type Snippet } from "@/lib/template-snippets"
import { uploadAsset } from "@/lib/upload-asset"
import { useConfirm } from "@/lib/use-confirm"

interface Props {
  initial?: CustomTemplate
  onSaved?: (t: CustomTemplate) => void
  onBack?: () => void
}

// Editor's font picker (categorised). Cursive fonts come from next/font in
// app/layout.tsx; the var(--font-*) reference resolves once the layout has
// loaded the font.
const FONT_FAMILIES: { label: string; value: string; category: string }[] = [
  { label: "Inter", value: "Inter, sans-serif", category: "Sans" },
  { label: "Manrope", value: "var(--font-manrope), Manrope, sans-serif", category: "Sans" },
  { label: "Outfit", value: "var(--font-outfit), Outfit, sans-serif", category: "Sans" },
  { label: "Georgia", value: "Georgia, serif", category: "Serif" },
  { label: "Playfair Display", value: "var(--font-playfair), Playfair Display, Georgia, serif", category: "Serif" },
  { label: "Cormorant Garamond", value: "var(--font-cormorant), Cormorant Garamond, Georgia, serif", category: "Serif" },
  { label: "EB Garamond", value: "var(--font-eb-garamond), EB Garamond, Georgia, serif", category: "Serif" },
  { label: "Cinzel", value: "var(--font-cinzel), Cinzel, Georgia, serif", category: "Display" },
  { label: "Fraunces", value: "var(--font-fraunces), Fraunces, Georgia, serif", category: "Serif" },
  { label: "Great Vibes", value: "var(--font-great-vibes), 'Great Vibes', cursive", category: "Signature" },
  { label: "Allura", value: "var(--font-allura), Allura, cursive", category: "Signature" },
  { label: "Sacramento", value: "var(--font-sacramento), Sacramento, cursive", category: "Signature" },
  { label: "Dancing Script", value: "var(--font-dancing-script), 'Dancing Script', cursive", category: "Signature" },
  { label: "Caveat", value: "var(--font-caveat), Caveat, cursive", category: "Signature" },
  { label: "Pacifico", value: "var(--font-pacifico), Pacifico, cursive", category: "Display" },
  { label: "Courier New", value: "Courier New, monospace", category: "Mono" },
  { label: "JetBrains Mono", value: "var(--font-geist-mono), JetBrains Mono, monospace", category: "Mono" },
]

function uid(prefix = "blk") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

// Where a freshly added block should land on the empty canvas. We
// anchor at the top-left corner with a generous left/top margin, then
// cascade-offset each subsequent add so consecutive inserts don't pile
// up at exactly the same coordinates. The cycle resets every 8 blocks
// so the cascade can't drift off-canvas.
function nextSpawnPos(blockCount: number): { x: number; y: number } {
  const step = 30
  const cycle = 8
  const offset = (blockCount % cycle) * step
  return { x: 40 + offset, y: 40 + offset }
}

// Cap on undo/redo history depth. 50 entries is more than enough for
// human-scale editing; older states drop off the front of the queue.
const HISTORY_MAX = 50

// Two consecutive mutations targeting the same "scope key" within this
// window collapse into a single history entry. Keeps a flurry of font-
// size arrow-clicks or text typing from creating one undo per keystroke.
const COALESCE_MS = 500

export function TemplateBuilder({ initial, onSaved, onBack }: Props) {
  const confirm = useConfirm()
  const [template, setTemplate] = useState<CustomTemplate>(() => initial ?? blankTemplate())
  // Multi-select. The last id added is treated as the "primary" selection
  // for the inspector panel; the whole set is what arrow-nudge, delete,
  // and duplicate operate on.
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const primarySelectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null
  // Back-compat shim — most call sites still call setSelectedId(id|null).
  // Routes through setSelectedIds so the new + old APIs stay in sync.
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIds(id ? [id] : [])
  }, [])
  const selectedId = primarySelectedId
  const [savedFlash, setSavedFlash] = useState(false)
  // When true (default), text blocks render their raw {{variable}} tokens
  // so the designer can SEE where data plugs in. When false, the tokens
  // resolve to the preview-as sample values.
  const [showVariables, setShowVariables] = useState(true)
  const selected = template.blocks.find((b) => b.id === primarySelectedId) ?? null

  // Undo / redo history. Stored in refs so writes don't trigger re-renders
  // — only the explicit setTemplate() call below does that. `past` holds
  // pre-edit snapshots; `future` is populated by undo() and consumed by
  // redo(). A new mutation clears `future`.
  const historyRef = useRef<{ past: CustomTemplate[]; future: CustomTemplate[] }>({
    past: [],
    future: [],
  })
  // Coalesce window — collapses rapid-fire same-target mutations (typing
  // in an input, hitting an arrow key on a font-size stepper) into one
  // history entry so undo doesn't go character-by-character.
  const coalesceRef = useRef<{ lastKey: string | null; lastTs: number }>({
    lastKey: null,
    lastTs: 0,
  })

  // Push `prev` onto the history stack. If `coalesceKey` matches the
  // previous push within COALESCE_MS, we keep only the older snapshot
  // (the one from before this run of edits started) — that's what undo
  // should rewind to.
  const pushHistory = useCallback((prev: CustomTemplate, coalesceKey?: string) => {
    const past = historyRef.current.past
    const now = Date.now()
    if (
      coalesceKey &&
      coalesceRef.current.lastKey === coalesceKey &&
      now - coalesceRef.current.lastTs < COALESCE_MS
    ) {
      coalesceRef.current.lastTs = now
      return
    }
    past.push(prev)
    if (past.length > HISTORY_MAX) past.shift()
    coalesceRef.current = { lastKey: coalesceKey ?? null, lastTs: now }
  }, [])

  // Wrap a setTemplate updater so it snapshots before mutating + clears
  // the redo stack. All structural edits funnel through this.
  const commit = useCallback(
    (updater: (t: CustomTemplate) => CustomTemplate, coalesceKey?: string) => {
      setTemplate((prev) => {
        pushHistory(prev, coalesceKey)
        historyRef.current.future = []
        return updater(prev)
      })
    },
    [pushHistory],
  )

  // After a history jump, prune selectedIds to only blocks that still
  // exist in the restored template — otherwise the inspector would
  // dangle on a deleted block.
  const reconcileSelection = useCallback((restored: CustomTemplate) => {
    const live = new Set(restored.blocks.map((b) => b.id))
    setSelectedIds((prev) => prev.filter((id) => live.has(id)))
  }, [])

  const undo = useCallback(() => {
    const past = historyRef.current.past
    if (past.length === 0) return
    setTemplate((prev) => {
      const prior = past.pop()!
      historyRef.current.future.push(prev)
      reconcileSelection(prior)
      return prior
    })
    // Break coalesce chain — the next mutation should always push fresh.
    coalesceRef.current = { lastKey: null, lastTs: 0 }
  }, [reconcileSelection])

  const redo = useCallback(() => {
    const future = historyRef.current.future
    if (future.length === 0) return
    setTemplate((prev) => {
      const next = future.pop()!
      historyRef.current.past.push(prev)
      reconcileSelection(next)
      return next
    })
    coalesceRef.current = { lastKey: null, lastTs: 0 }
  }, [reconcileSelection])

  // Preview-as: the editor renders {{variables}} with sample data the user
  // can edit so they see the cert looking how it'll look for their actual
  // recipients (instead of "Aanya Sharma / Dr. Priya Iyer" forever).
  const [previewFields, setPreviewFields] = useState<FieldValues>(() => {
    const f: Record<string, string> = {}
    for (const v of TEMPLATE_VARIABLES) f[v.key] = v.sample
    return f as unknown as FieldValues
  })

  // When showing raw variables, build a FieldValues where every key maps
  // to its own {{token}}. The renderer's interpolate() will then leave
  // the placeholders visible.
  const renderFields = useMemo<FieldValues>(() => {
    if (!showVariables) return previewFields
    const f: Record<string, string> = {}
    for (const v of TEMPLATE_VARIABLES) f[v.key] = `{{${v.key}}}`
    return f as unknown as FieldValues
  }, [showVariables, previewFields])

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [canvasScale, setCanvasScale] = useState(1)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    // Pull the ref into a local so a re-render between apply() and the
    // ResizeObserver callback can't nullify it mid-flight. Without
    // this guard, Turbopack HMR + Strict-Mode double-mount could fire
    // apply() after the canvas div unmounted, crashing with
    // "Cannot read properties of null (reading 'clientWidth')".
    const apply = () => {
      const w = el.clientWidth
      if (!w) return
      setCanvasScale(w / TEMPLATE_CANVAS.width)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const dragRef = useRef<{
    id: string
    mode: "move" | "resize"
    startX: number
    startY: number
    startBlock: Block
  } | null>(null)

  // Each property-edit on the same block within COALESCE_MS collapses
  // into a single undoable step. Different blocks always get their own
  // history entries so undo doesn't jump across them surprisingly.
  const updateBlock = useCallback((id: string, patch: Partial<Block>) => {
    commit(
      (t) => ({
        ...t,
        blocks: t.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
        updatedAt: new Date().toISOString(),
      }),
      `update:${id}`,
    )
  }, [commit])

  const removeBlock = useCallback((id: string) => {
    commit((t) => ({
      ...t,
      blocks: t.blocks.filter((b) => b.id !== id),
      updatedAt: new Date().toISOString(),
    }))
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }, [commit])

  const duplicateBlock = useCallback((id: string) => {
    commit((t) => {
      const src = t.blocks.find((b) => b.id === id)
      if (!src) return t
      const copy = { ...src, id: uid(src.type), x: src.x + 24, y: src.y + 24 } as Block
      return { ...t, blocks: [...t.blocks, copy], updatedAt: new Date().toISOString() }
    })
  }, [commit])

  const moveZ = useCallback((id: string, dir: 1 | -1) => {
    commit((t) => {
      const idx = t.blocks.findIndex((b) => b.id === id)
      if (idx === -1) return t
      const newIdx = Math.max(0, Math.min(t.blocks.length - 1, idx + dir))
      if (newIdx === idx) return t
      const next = [...t.blocks]
      const [moved] = next.splice(idx, 1)
      next.splice(newIdx, 0, moved)
      return { ...t, blocks: next, updatedAt: new Date().toISOString() }
    })
  }, [commit])

  const addBlock = useCallback((block: Block, select = true) => {
    commit((t) => ({
      ...t,
      blocks: [...t.blocks, block],
      updatedAt: new Date().toISOString(),
    }))
    if (select) setSelectedId(block.id)
  }, [commit, setSelectedId])

  const addText = useCallback(() => {
    const pos = nextSpawnPos(template.blocks.length)
    addBlock({
      id: uid("text"), type: "text",
      x: pos.x, y: pos.y, w: 600, h: 80,
      content: "Edit me",
      fontFamily: "Inter, sans-serif",
      fontSize: 28, fontWeight: 500,
      color: "#0f172a", align: "left",
    })
  }, [addBlock, template.blocks.length])

  const addShape = useCallback((shape: ShapeBlock["shape"]) => {
    const pos = nextSpawnPos(template.blocks.length)
    const base = { id: uid("shape"), type: "shape" as const, x: pos.x, y: pos.y, fill: "#0f172a" }
    if (shape === "rect")   addBlock({ ...base, shape, w: 300, h: 6 })
    if (shape === "circle") addBlock({ ...base, shape, w: 140, h: 140 })
    if (shape === "line")   addBlock({ ...base, shape: "rect", w: 300, h: 2 })
  }, [addBlock, template.blocks.length])

  const addSignature = useCallback((mode: "text" | "image" = "text") => {
    const pos = nextSpawnPos(template.blocks.length)
    addBlock({
      id: uid("sig"), type: "signature",
      x: pos.x, y: pos.y, w: 320, h: 116,
      mode,
      label: "Signing Authority",
      text: mode === "text" ? "Your Name Here" : undefined,
      fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive",
      fontSize: 44,
      textColor: "#0f172a", lineColor: "#0f172a",
    })
  }, [addBlock, template.blocks.length])

  const addQr = useCallback(() => {
    const pos = nextSpawnPos(template.blocks.length)
    addBlock({
      id: uid("qr"), type: "qr",
      x: pos.x, y: pos.y, w: 120, h: 120,
      padding: 8, fgColor: "#000000", bgColor: "#ffffff",
    })
  }, [addBlock, template.blocks.length])

  const addDecoration = useCallback((preset: typeof DECORATION_PRESETS[number]) => {
    const pos = nextSpawnPos(template.blocks.length)
    addBlock({
      id: uid("dec"), type: "decoration",
      variant: preset.variant,
      x: pos.x, y: pos.y,
      w: preset.w, h: preset.h,
      primary: preset.primary,
      accent: preset.accent,
      text: preset.text,
    } as DecorationBlock)
  }, [addBlock, template.blocks.length])

  // Drop a snippet: clones each block with a fresh id and anchors the
  // group at the top-left spawn point, preserving the snippet's
  // internal relative layout (the bounding-box top-left is what gets
  // anchored, not each block individually).
  const addSnippet = useCallback((snippet: Snippet) => {
    commit((t) => {
      const pos = nextSpawnPos(t.blocks.length)
      // Find the snippet's own bounding-box origin so we can translate
      // it as a group to the new spawn point rather than each block to
      // an absolute coord.
      const minX = Math.min(...snippet.blocks.map((b) => b.x))
      const minY = Math.min(...snippet.blocks.map((b) => b.y))
      const newBlocks = snippet.blocks.map((b) => ({
        ...b,
        id: uid(b.type),
        x: b.x - minX + pos.x,
        y: b.y - minY + pos.y,
      })) as Block[]
      return { ...t, blocks: [...t.blocks, ...newBlocks], updatedAt: new Date().toISOString() }
    })
  }, [commit])

  // Toolbox file picker (Image tool button → file picker opens immediately).
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const onPickImage = useCallback(() => fileInputRef.current?.click(), [])
  const onImageFile = useCallback(async (file: File) => {
    const { url } = await uploadAsset(file, "certificates")
    const pos = nextSpawnPos(template.blocks.length)
    addBlock({
      id: uid("img"), type: "image",
      x: pos.x, y: pos.y, w: 240, h: 240,
      src: url, objectFit: "contain",
    })
  }, [addBlock, template.blocks.length])

  // Pointer drag — translates screen px to canvas px via canvasScale.
  // Pointer-down on a block also seeds the selection: a bare click
  // replaces it, a shift-click toggles the block into / out of the
  // multi-select set without clearing the others.
  const onPointerDown = (e: React.PointerEvent, block: Block, mode: "move" | "resize") => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { id: block.id, mode, startX: e.clientX, startY: e.clientY, startBlock: { ...block } }
    if (e.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(block.id) ? prev.filter((x) => x !== block.id) : [...prev, block.id],
      )
    } else if (!selectedIds.includes(block.id)) {
      // Don't collapse a multi-select that already includes this block —
      // otherwise pointer-down on a member would drop the whole group.
      setSelectedIds([block.id])
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const { id, mode, startX, startY, startBlock } = dragRef.current
    const dx = (e.clientX - startX) / canvasScale
    const dy = (e.clientY - startY) / canvasScale
    if (mode === "move") {
      updateBlock(id, {
        x: Math.round(Math.max(0, Math.min(TEMPLATE_CANVAS.width - startBlock.w, startBlock.x + dx))),
        y: Math.round(Math.max(0, Math.min(TEMPLATE_CANVAS.height - startBlock.h, startBlock.y + dy))),
      })
    } else {
      updateBlock(id, {
        w: Math.round(Math.max(16, Math.min(TEMPLATE_CANVAS.width - startBlock.x, startBlock.w + dx))),
        h: Math.round(Math.max(16, Math.min(TEMPLATE_CANVAS.height - startBlock.y, startBlock.h + dy))),
      })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      dragRef.current = null
    }
  }

  // Group operations — work on every block currently in selectedIds, not
  // just the primary. Keeps "select 3 blocks, hit delete" working the way
  // a designer expects.
  const removeSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    commit((t) => ({
      ...t,
      blocks: t.blocks.filter((b) => !ids.has(b.id)),
      updatedAt: new Date().toISOString(),
    }))
    setSelectedIds([])
  }, [commit, selectedIds])

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    const newIds: string[] = []
    commit((t) => {
      const additions: Block[] = []
      for (const b of t.blocks) {
        if (ids.has(b.id)) {
          const id = uid(b.type)
          newIds.push(id)
          additions.push({ ...b, id, x: b.x + 24, y: b.y + 24 } as Block)
        }
      }
      return {
        ...t,
        blocks: [...t.blocks, ...additions],
        updatedAt: new Date().toISOString(),
      }
    })
    // Move selection to the freshly created copies — matches Figma /
    // Sketch behaviour where the new copies become the active set.
    setSelectedIds(newIds)
  }, [commit, selectedIds])

  // Translate every selected block by (dx, dy), clamping each to the
  // canvas bounds individually so the group stops at whichever edge
  // any member hits first (matches Figma's group-nudge behaviour).
  const nudgeSelected = useCallback((dx: number, dy: number) => {
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    commit(
      (t) => ({
        ...t,
        blocks: t.blocks.map((b) => {
          if (!ids.has(b.id)) return b
          return {
            ...b,
            x: Math.round(Math.max(0, Math.min(TEMPLATE_CANVAS.width - b.w, b.x + dx))),
            y: Math.round(Math.max(0, Math.min(TEMPLATE_CANVAS.height - b.h, b.y + dy))),
          } as Block
        }),
        updatedAt: new Date().toISOString(),
      }),
      `nudge:${[...ids].sort().join(",")}`,
    )
  }, [commit, selectedIds])

  // Single global keyboard handler. Splits into "always-on" shortcuts
  // (undo / redo / select-all) and "selection-required" shortcuts
  // (delete / duplicate / arrow nudge / escape). Skips when focus is
  // inside any editable surface so typing in the name field or the
  // inspector inputs doesn't trigger canvas commands.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const inEditable =
        tag === "INPUT" || tag === "TEXTAREA" || (target?.isContentEditable ?? false)
      const mod = e.metaKey || e.ctrlKey

      // Undo / redo — always active, even when focus is inside an input,
      // because users expect ⌘Z to work no matter where the cursor is.
      if (mod && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault()
        undo()
        return
      }
      if (
        (mod && e.shiftKey && (e.key === "z" || e.key === "Z")) ||
        (mod && (e.key === "y" || e.key === "Y"))
      ) {
        e.preventDefault()
        redo()
        return
      }

      // Everything below this point assumes the canvas, not an input,
      // owns the keystroke.
      if (inEditable) return

      // Select-all — pulls every block into the selection set.
      if (mod && (e.key === "a" || e.key === "A")) {
        e.preventDefault()
        setSelectedIds(template.blocks.map((b) => b.id))
        return
      }

      if (selectedIds.length === 0) return

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault()
        removeSelected()
        return
      }
      if (mod && (e.key === "d" || e.key === "D")) {
        e.preventDefault()
        duplicateSelected()
        return
      }
      if (e.key === "Escape") {
        setSelectedIds([])
        return
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        if (e.key === "ArrowLeft")  nudgeSelected(-step, 0)
        if (e.key === "ArrowRight") nudgeSelected( step, 0)
        if (e.key === "ArrowUp")    nudgeSelected(0, -step)
        if (e.key === "ArrowDown")  nudgeSelected(0,  step)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [
    selectedIds,
    template.blocks,
    removeSelected,
    duplicateSelected,
    nudgeSelected,
    undo,
    redo,
  ])

  const save = useCallback(() => {
    const saved: CustomTemplate = { ...template, updatedAt: new Date().toISOString() }
    upsertCustomTemplate(saved)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
    onSaved?.(saved)
  }, [template, onSaved])

  const clearTemplate = useCallback(async () => {
    // Wipes the canvas back to a blank white surface. Asks first
    // because this nukes the whole design — even with undo wired,
    // accidentally clicking Clear while distracted is too easy to
    // confuse with the Save button next to it.
    const ok = await confirm({
      title: "Clear the entire template?",
      description: "Every block and the background will be removed. ⌘Z will get it back, but save first if you want a hard checkpoint.",
      destructive: true,
      confirmLabel: "Clear",
    })
    if (!ok) return
    commit((t) => ({
      ...trulyBlankTemplate(t.name),
      id: t.id,            // preserve identity (still the same template record)
      createdAt: t.createdAt,
    }))
    setSelectedIds([])
  }, [confirm, commit])

  const setBackground = useCallback((patch: Partial<CustomTemplate["background"]>) => {
    commit(
      (t) => ({
        ...t,
        background: { ...t.background, ...patch },
        updatedAt: new Date().toISOString(),
      }),
      "background",
    )
  }, [commit])

  return (
    <div className="flex h-[calc(100vh-110px)] min-h-[680px] gap-4">
      {/* Toolbox (left) — keep tight: just the primitives that need direct
          insertion. Everything decorative lives in the Library popover. */}
      <div className="flex w-20 shrink-0 flex-col items-stretch gap-1 overflow-y-auto rounded-lg border bg-card p-2">
        <ToolButton icon={<Type className="h-5 w-5" />} label="Text" onClick={addText} />
        <ToolButton icon={<Square className="h-5 w-5" />} label="Rect" onClick={() => addShape("rect")} />
        <ToolButton icon={<Circle className="h-5 w-5" />} label="Circle" onClick={() => addShape("circle")} />
        <Separator className="my-1" />
        <ToolButton icon={<PenLine className="h-5 w-5" />} label="Signature" onClick={() => addSignature("text")} />
        <ToolButton icon={<QrCode className="h-5 w-5" />} label="QR" onClick={addQr} />
        <ToolButton icon={<ImageIcon className="h-5 w-5" />} label="Image" onClick={onPickImage} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImageFile(f)
            e.target.value = ""
          }}
        />
        <Separator className="my-1" />

        {/* Component Library — tabs for Snippets + Decorations + Background */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex flex-col items-center gap-0.5 rounded p-2 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Component library"
            >
              <LayoutTemplate className="h-5 w-5" />
              <span>Library</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-[420px] p-0">
            <Tabs defaultValue="snippets" className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-none">
                <TabsTrigger value="snippets">Components</TabsTrigger>
                <TabsTrigger value="decorations">Decorations</TabsTrigger>
                <TabsTrigger value="background">Background</TabsTrigger>
              </TabsList>

              <TabsContent value="snippets" className="m-0 border-t">
                <SnippetLibrary onPick={addSnippet} />
              </TabsContent>

              <TabsContent value="decorations" className="m-0 border-t">
                <DecorationLibrary onPick={addDecoration} />
              </TabsContent>

              <TabsContent value="background" className="m-0 space-y-3 border-t p-3">
                <BackgroundEditor template={template} setBackground={setBackground} />
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* Preview-as: change the sample data shown while editing */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex flex-col items-center gap-0.5 rounded p-2 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Preview as…"
            >
              <Eye className="h-5 w-5" />
              <span>Preview</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-72 p-3">
            <PreviewAsPanel fields={previewFields} setFields={setPreviewFields} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Canvas (center) */}
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <Input
            value={template.name}
            onChange={(e) => {
              const next = e.target.value
              commit(
                (t) => ({ ...t, name: next, updatedAt: new Date().toISOString() }),
                "name",
              )
            }}
            className="max-w-xs"
            placeholder="Template name"
          />
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Toggle between raw {{variable}} tokens and sample data in the canvas preview.">
              <input
                type="checkbox"
                checked={showVariables}
                onChange={(e) => setShowVariables(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Show variables
            </label>
            <Button onClick={clearTemplate} size="sm" variant="outline" className="gap-1" title="Clear all blocks + reset background to white">
              <FilePlus className="h-4 w-4" /> Clear
            </Button>
            <Button onClick={save} size="sm" className={cn("gap-1 transition-colors", savedFlash && "bg-emerald-600 hover:bg-emerald-700")}>
              <Save className="h-4 w-4" />
              {savedFlash ? "Saved!" : "Save template"}
            </Button>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-auto rounded-lg border bg-[#f1f3f7] p-6">
          <div
            ref={canvasRef}
            className="relative max-h-full"
            style={{
              aspectRatio: `${TEMPLATE_CANVAS.width} / ${TEMPLATE_CANVAS.height}`,
              width: "min(100%, 1100px)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.10)",
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onClick={() => setSelectedIds([])}
          >
            {/* Live preview underneath the interactive bbox layer */}
            <div className="pointer-events-none absolute inset-0">
              <CustomTemplateRenderer
                template={template}
                fields={renderFields}
                verificationUrl={typeof window !== "undefined" ? `${window.location.origin}/verify/${previewFields.certificate_id}` : undefined}
                fit
              />
            </div>
            <div
              className="absolute inset-0 origin-top-left"
              style={{
                width: TEMPLATE_CANVAS.width,
                height: TEMPLATE_CANVAS.height,
                transform: `scale(${canvasScale})`,
              }}
            >
              {template.blocks.map((b) => {
                const isSelected = selectedIds.includes(b.id)
                const isPrimary = primarySelectedId === b.id
                return (
                  <div
                    key={b.id}
                    onPointerDown={(e) => onPointerDown(e, b, "move")}
                    onClick={(e) => {
                      e.stopPropagation()
                      // Shift+click on a block: toggle it into / out of the
                      // multi-select set. Plain click: make it the single
                      // active selection.
                      if (e.shiftKey) {
                        setSelectedIds((prev) =>
                          prev.includes(b.id)
                            ? prev.filter((x) => x !== b.id)
                            : [...prev, b.id],
                        )
                      } else {
                        setSelectedIds([b.id])
                      }
                    }}
                    className={cn(
                      "absolute cursor-move border border-transparent hover:border-blue-300/60",
                      isSelected && !isPrimary && "border-2 border-blue-400/70",
                      isPrimary && "border-2 border-blue-500",
                    )}
                    style={{ left: b.x, top: b.y, width: b.w, height: b.h, zIndex: 10 }}
                    title={b.type}
                  >
                    {/* Secondary-selected blocks (part of a multi-select but
                        not the primary) get corner dots only — no resize
                        handle or action buttons, since those need a single
                        target to be meaningful. */}
                    {isSelected && !isPrimary && (
                      <>
                        <span className="absolute -left-1 -top-1 h-2 w-2 bg-blue-400" />
                        <span className="absolute -right-1 -top-1 h-2 w-2 bg-blue-400" />
                        <span className="absolute -bottom-1 -left-1 h-2 w-2 bg-blue-400" />
                        <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-blue-400" />
                      </>
                    )}
                    {isPrimary && (
                      <>
                        <span className="absolute -left-1 -top-1 h-2 w-2 bg-blue-500" />
                        <span className="absolute -right-1 -top-1 h-2 w-2 bg-blue-500" />
                        <span className="absolute -bottom-1 -left-1 h-2 w-2 bg-blue-500" />
                        <span
                          className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize bg-blue-500"
                          onPointerDown={(e) => onPointerDown(e, b, "resize")}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeBlock(b.id) }}
                          onPointerDown={(e) => e.stopPropagation()}
                          title="Delete block (Backspace)"
                          className="absolute -right-8 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); duplicateBlock(b.id) }}
                          onPointerDown={(e) => e.stopPropagation()}
                          title="Duplicate block (⌘D)"
                          className="absolute -right-8 top-7 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-700 shadow hover:bg-slate-100"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Click to select · Shift+click to multi-select · ⌘A select all · ⌘Z undo · ⌘⇧Z redo ·
          drag to move · blue corner to resize · ←↑↓→ nudge (shift = 10px) · Backspace deletes ·
          ⌘D duplicates.
        </p>
      </div>

      {/* Inspector (right) */}
      <div className="w-80 shrink-0 overflow-y-auto rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Inspector</h3>
        {selectedIds.length > 1 ? (
          // Multi-select panel — surfaces the actions that make sense on
          // a group (delete, duplicate, deselect) without offering per-
          // property editing, which only makes sense on a single block.
          <div className="space-y-3 text-xs">
            <div className="rounded-md border border-blue-500/30 bg-blue-500/[0.04] p-3">
              <p className="font-semibold text-foreground">
                {selectedIds.length} blocks selected
              </p>
              <p className="mt-1 text-muted-foreground">
                Drag the arrow keys to nudge the group. Backspace deletes them all. ⌘D duplicates.
                Pick a single block to edit its properties.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={duplicateSelected}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Duplicate
              </Button>
              <Button size="sm" variant="outline" onClick={removeSelected}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                Deselect
              </Button>
            </div>
          </div>
        ) : !selected ? (
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>Pick a tool from the left to add a block, or click any block on the canvas to edit it.</p>
            <Separator />
            <div>
              <Label className="text-xs">Available variables</Label>
              <ul className="mt-2 space-y-1">
                {TEMPLATE_VARIABLES.map((v) => (
                  <li key={v.key} className="flex items-center justify-between text-[11px]">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{`{{${v.key}}}`}</code>
                    <span>{v.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px]">Wrap any variable above in <code>{`{{ }}`}</code> inside any text/signature block — it'll be replaced with the recipient's real value when the cert is issued.</p>
            </div>
            <Separator />
            <div className="space-y-1 text-[11px]">
              <p className="font-semibold uppercase tracking-wider text-foreground/70">Shortcuts</p>
              <p>↑ ↓ ← → · nudge 1px (Shift = 10px)</p>
              <p>Shift+click · add to selection</p>
              <p>⌘A · select all · Esc · deselect</p>
              <p>⌘Z · undo · ⌘⇧Z / ⌘Y · redo</p>
              <p>Backspace · remove · ⌘D · duplicate</p>
            </div>
          </div>
        ) : (
          <SelectedInspector
            block={selected}
            onChange={(patch) => updateBlock(selected.id, patch)}
            onDelete={() => removeBlock(selected.id)}
            onDuplicate={() => duplicateBlock(selected.id)}
            onMoveUp={() => moveZ(selected.id, 1)}
            onMoveDown={() => moveZ(selected.id, -1)}
          />
        )}
      </div>
    </div>
  )
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex flex-col items-center gap-0.5 rounded p-2 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function SnippetLibrary({ onPick }: { onPick: (s: Snippet) => void }) {
  return (
    <Tabs defaultValue={SNIPPET_CATEGORIES[0]} className="w-full">
      <ScrollArea className="w-full">
        <TabsList className="m-2 inline-flex h-8">
          {SNIPPET_CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c} className="text-xs">{c}</TabsTrigger>
          ))}
        </TabsList>
      </ScrollArea>
      {SNIPPET_CATEGORIES.map((cat) => {
        const items = SNIPPETS.filter((s) => s.category === cat)
        return (
          <TabsContent key={cat} value={cat} className="m-0">
            <ScrollArea className="h-[420px]">
              <div className="space-y-2 p-3">
                {items.length === 0 && (
                  <p className="rounded border border-dashed p-4 text-center text-[11px] text-muted-foreground">
                    No {cat.toLowerCase()} snippets yet — build your own using the toolbox blocks.
                  </p>
                )}
                {items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onPick(s)}
                    className="group w-full rounded border bg-white p-3 text-left hover:border-primary"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-foreground">{s.label}</div>
                        {s.description && (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{s.description}</div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground group-hover:text-primary">+ insert</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}

function DecorationLibrary({ onPick }: { onPick: (p: typeof DECORATION_PRESETS[number]) => void }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const filtered = q
    ? DECORATION_PRESETS.filter(
        (p) => p.label.toLowerCase().includes(q) || p.variant.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      )
    : DECORATION_PRESETS

  return (
    <div className="flex flex-col">
      {/* Search across all decorations, regardless of which category tab is active. */}
      <div className="border-b p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search 58+ decorations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>
      {q ? (
        // When searching, ignore tabs and show flat result grid.
        <ScrollArea className="h-[420px]">
          <div className="grid grid-cols-3 gap-2 p-3">
            {filtered.length === 0 ? (
              <p className="col-span-3 rounded border border-dashed p-4 text-center text-[11px] text-muted-foreground">
                No decoration matches &ldquo;{query}&rdquo;.
              </p>
            ) : (
              filtered.map((p) => (
                <DecorationTile key={p.variant} p={p} onPick={onPick} />
              ))
            )}
          </div>
        </ScrollArea>
      ) : (
        <Tabs defaultValue={DECORATION_CATEGORIES[0]} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="m-2 inline-flex h-8">
              {DECORATION_CATEGORIES.map((c) => (
                <TabsTrigger key={c} value={c} className="text-xs">{c}</TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          {DECORATION_CATEGORIES.map((cat) => {
            const items = DECORATION_PRESETS.filter((d) => d.category === cat)
            return (
              <TabsContent key={cat} value={cat} className="m-0">
                <ScrollArea className="h-[420px]">
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {items.map((p) => <DecorationTile key={p.variant} p={p} onPick={onPick} />)}
                  </div>
                </ScrollArea>
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}

function DecorationTile({ p, onPick }: {
  p: typeof DECORATION_PRESETS[number]
  onPick: (p: typeof DECORATION_PRESETS[number]) => void
}) {
  return (
    <button
      onClick={() => onPick(p)}
      className="group flex flex-col items-center gap-1 rounded-md border bg-white p-2 hover:border-primary"
      title={`${p.label} · ${p.category}`}
    >
      <div className="flex h-16 w-full items-center justify-center overflow-hidden">
        <DecorationSvg
          variant={p.variant}
          primary={p.primary}
          accent={p.accent}
          text={p.text}
        />
      </div>
      <div className="text-center text-[10px] leading-tight text-muted-foreground group-hover:text-foreground">
        {p.label}
      </div>
    </button>
  )
}

function PreviewAsPanel({ fields, setFields }: { fields: FieldValues; setFields: (f: FieldValues) => void }) {
  const update = (k: keyof FieldValues, v: string) => setFields({ ...fields, [k]: v })
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview as</div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Sample values used in the editor preview. These never get saved — actual certs use the recipient's real data.
        </p>
      </div>
      {TEMPLATE_VARIABLES.map((v) => (
        <div key={v.key}>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{v.label}</Label>
          <Input
            value={(fields[v.key as keyof FieldValues] as string | undefined) ?? ""}
            onChange={(e) => update(v.key as keyof FieldValues, e.target.value)}
            className="mt-1 h-8 text-xs"
          />
        </div>
      ))}
    </div>
  )
}

function BackgroundEditor({
  template,
  setBackground,
}: {
  template: CustomTemplate
  setBackground: (patch: Partial<CustomTemplate["background"]>) => void
}) {
  const bg = template.background
  const onImage = async (file: File) => {
    const { url } = await uploadAsset(file, "certificates")
    setBackground({ image: { src: url, opacity: 1 } })
  }
  return (
    <>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Background
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Solid colour</Label>
        <input
          type="color"
          value={bg.color}
          onChange={(e) => setBackground({ color: e.target.value, gradient: undefined, image: undefined })}
          className="h-9 w-full cursor-pointer rounded border bg-transparent"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Gradient presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { from: "#fef3c7", via: "#fde68a", to: "#fbbf24" },
            { from: "#ff7eb3", via: "#7c5cff", to: "#2dd4bf" },
            { from: "#0f172a", via: "#1e293b", to: "#334155" },
            { from: "#6366f1", via: "#7c3aed", to: "#06b6d4" },
            { from: "#fde68a", via: "#fef3c7", to: "#fef9c3" },
            { from: "#fda4af", via: "#f9a8d4", to: "#c4b5fd" },
            { from: "#fbf5e7", via: "#fef3c7", to: "#fde68a" },
            { from: "#dcfce7", via: "#bbf7d0", to: "#86efac" },
            { from: "#e0f2fe", via: "#bae6fd", to: "#7dd3fc" },
          ].map((g, i) => (
            <button
              key={i}
              onClick={() => setBackground({ gradient: { ...g, angle: 135 }, image: undefined })}
              className="h-10 rounded border hover:ring-2 hover:ring-primary"
              style={{ background: `linear-gradient(135deg, ${g.from}, ${g.via}, ${g.to})` }}
              title="Apply gradient"
            />
          ))}
        </div>
        {bg.gradient && (
          <Button
            variant="ghost" size="sm"
            onClick={() => setBackground({ gradient: undefined })}
            className="w-full text-xs"
          >
            Clear gradient
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Background image</Label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted">
          <Upload className="h-3.5 w-3.5" />
          {bg.image ? "Replace image" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImage(f)
              e.target.value = ""
            }}
          />
        </label>
        {bg.image && (
          <Button
            variant="ghost" size="sm"
            onClick={() => setBackground({ image: undefined })}
            className="w-full text-xs"
          >
            Remove image
          </Button>
        )}
      </div>
    </>
  )
}

function SelectedInspector({
  block, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown,
}: {
  block: Block
  onChange: (patch: Partial<Block>) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {block.type}
        </span>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onMoveUp} title="Bring forward"><ArrowUp className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={onMoveDown} title="Send back"><ArrowDown className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={onDuplicate} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={onDelete} title="Delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumField label="X" value={block.x} onChange={(v) => onChange({ x: v } as Partial<Block>)} />
        <NumField label="Y" value={block.y} onChange={(v) => onChange({ y: v } as Partial<Block>)} />
        <NumField label="W" value={block.w} onChange={(v) => onChange({ w: v } as Partial<Block>)} />
        <NumField label="H" value={block.h} onChange={(v) => onChange({ h: v } as Partial<Block>)} />
      </div>
      <NumField label="Rotation°" value={block.rotation ?? 0} onChange={(v) => onChange({ rotation: v } as Partial<Block>)} />

      {block.type === "text" && <TextInspector block={block} onChange={(p) => onChange(p as Partial<Block>)} />}
      {block.type === "shape" && <ShapeInspector block={block} onChange={(p) => onChange(p as Partial<Block>)} />}
      {block.type === "image" && <ImageInspector block={block} onChange={(p) => onChange(p as Partial<Block>)} />}
      {block.type === "signature" && <SignatureInspector block={block} onChange={(p) => onChange(p as Partial<Block>)} />}
      {block.type === "decoration" && <DecorationInspector block={block} onChange={(p) => onChange(p as Partial<Block>)} />}
      {block.type === "qr" && <QrInspector block={block} onChange={(p) => onChange(p as Partial<Block>)} />}
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 text-xs"
      />
    </div>
  )
}

function TextInspector({ block, onChange }: { block: TextBlock; onChange: (p: Partial<TextBlock>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Content (supports {`{{variables}}`})</Label>
        <Textarea
          value={block.content}
          onChange={(e) => onChange({ content: e.target.value })}
          className="mt-1 min-h-20 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs">Font</Label>
        <Select value={block.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                <span style={{ fontFamily: f.value }}>{f.label}</span>
                <span className="ml-2 text-[9px] text-muted-foreground">{f.category}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Size" value={block.fontSize} onChange={(v) => onChange({ fontSize: v })} />
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Weight</Label>
          <Select value={String(block.fontWeight)} onValueChange={(v) => onChange({ fontWeight: Number(v) as TextBlock["fontWeight"] })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[300, 400, 500, 600, 700, 800, 900].map((w) => <SelectItem key={w} value={String(w)} className="text-xs">{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Color</Label>
          <input type="color" value={block.color} onChange={(e) => onChange({ color: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Align</Label>
          <Select value={block.align} onValueChange={(v) => onChange({ align: v as TextBlock["align"] })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left" className="text-xs">Left</SelectItem>
              <SelectItem value="center" className="text-xs">Center</SelectItem>
              <SelectItem value="right" className="text-xs">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={!!block.italic} onChange={(e) => onChange({ italic: e.target.checked })} />
          Italic
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={!!block.uppercase} onChange={(e) => onChange({ uppercase: e.target.checked })} />
          Uppercase
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Letter (em)" value={block.letterSpacing ?? 0} onChange={(v) => onChange({ letterSpacing: v })} />
        <NumField label="Line height" value={block.lineHeight ?? 1.2} onChange={(v) => onChange({ lineHeight: v })} />
      </div>
    </div>
  )
}

function ShapeInspector({ block, onChange }: { block: ShapeBlock; onChange: (p: Partial<ShapeBlock>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Shape</Label>
        <Select value={block.shape} onValueChange={(v) => onChange({ shape: v as ShapeBlock["shape"] })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rect" className="text-xs">Rectangle / line</SelectItem>
            <SelectItem value="circle" className="text-xs">Circle</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fill</Label>
          <input type="color" value={block.fill ?? "#000000"} onChange={(e) => onChange({ fill: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Stroke</Label>
          <input type="color" value={block.stroke ?? "#000000"} onChange={(e) => onChange({ stroke: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Stroke W" value={block.strokeWidth ?? 0} onChange={(v) => onChange({ strokeWidth: v })} />
        <NumField label="Corner R" value={block.borderRadius ?? 0} onChange={(v) => onChange({ borderRadius: v })} />
      </div>
    </div>
  )
}

function ImageInspector({ block, onChange }: { block: ImageBlock; onChange: (p: Partial<ImageBlock>) => void }) {
  const [busy, setBusy] = useState(false)
  const onFile = async (file: File) => {
    setBusy(true)
    try {
      const { url } = await uploadAsset(file, "certificates")
      onChange({ src: url })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Image</Label>
        <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted">
          <Upload className="h-3.5 w-3.5" />
          {busy ? "Uploading…" : block.src ? "Replace image" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.target.value = ""
            }}
          />
        </label>
        {block.src && (
          <div className="mt-2 overflow-hidden rounded border bg-muted">
            <img src={block.src} alt="" className="block max-h-24 w-full object-contain" />
          </div>
        )}
      </div>
      <div>
        <Label className="text-xs">Fit</Label>
        <Select value={block.objectFit ?? "contain"} onValueChange={(v) => onChange({ objectFit: v as ImageBlock["objectFit"] })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contain" className="text-xs">Contain</SelectItem>
            <SelectItem value="cover" className="text-xs">Cover</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={!!block.rounded} onChange={(e) => onChange({ rounded: e.target.checked })} />
        Circle crop (for logos / avatars)
      </label>
    </div>
  )
}

function SignatureInspector({ block, onChange }: { block: SignatureBlock; onChange: (p: Partial<SignatureBlock>) => void }) {
  const [busy, setBusy] = useState(false)
  const cursiveOptions = FONT_FAMILIES.filter((f) => f.category === "Signature")
  const onFile = async (file: File) => {
    setBusy(true)
    try {
      const { url } = await uploadAsset(file, "certificates")
      onChange({ imageSrc: url, mode: "image" })
    } finally {
      setBusy(false)
    }
  }
  const mode = block.mode ?? "text"

  // The three "sign as" intents the user might have. Bucketed so the UX
  // matches how they think rather than how the schema is shaped.
  type Intent = "custom" | "instructor" | "image"
  const currentIntent: Intent =
    mode === "image" ? "image" :
    block.text && block.text !== "{{instructor_name}}" ? "custom" :
    "instructor"

  const setIntent = (intent: Intent) => {
    if (intent === "image") {
      onChange({ mode: "image" })
    } else if (intent === "instructor") {
      onChange({ mode: "text", text: "{{instructor_name}}" })
    } else {
      // custom — keep the user's text or seed a friendly placeholder
      onChange({ mode: "text", text: block.text && block.text !== "{{instructor_name}}" ? block.text : "Your Name Here" })
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Sign as</Label>
        <div className="mt-1 grid grid-cols-3 gap-1 rounded-md border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setIntent("custom")}
            className={cn("rounded px-2 py-1.5 text-[11px] font-medium transition-colors",
              currentIntent === "custom" ? "bg-background shadow" : "text-muted-foreground hover:text-foreground")}
          >Custom name</button>
          <button
            type="button"
            onClick={() => setIntent("instructor")}
            className={cn("rounded px-2 py-1.5 text-[11px] font-medium transition-colors",
              currentIntent === "instructor" ? "bg-background shadow" : "text-muted-foreground hover:text-foreground")}
          >From CSV</button>
          <button
            type="button"
            onClick={() => setIntent("image")}
            className={cn("rounded px-2 py-1.5 text-[11px] font-medium transition-colors",
              currentIntent === "image" ? "bg-background shadow" : "text-muted-foreground hover:text-foreground")}
          >Upload image</button>
        </div>
      </div>

      {currentIntent === "custom" && (
        <>
          <div>
            <Label className="text-xs">Signing authority's name</Label>
            <Input
              value={block.text ?? ""}
              placeholder="e.g. Dr. Jane Doe"
              onChange={(e) => onChange({ text: e.target.value })}
              className="mt-1 h-8 text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Same name on every issued cert. Or use a {`{{variable}}`} to pull from the recipient row.
            </p>
          </div>
          <div>
            <Label className="text-xs">Cursive font</Label>
            <Select
              value={block.fontFamily ?? cursiveOptions[0].value}
              onValueChange={(v) => onChange({ fontFamily: v })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {cursiveOptions.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    <span style={{ fontFamily: f.value }}>{f.label} — Your Name</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumField label="Signature size" value={block.fontSize ?? 40} onChange={(v) => onChange({ fontSize: v })} />
        </>
      )}

      {currentIntent === "instructor" && (
        <>
          <div className="rounded border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
            Uses <code className="rounded bg-background px-1 font-mono text-foreground">{`{{instructor_name}}`}</code> from each recipient's CSV row.
          </div>
          <div>
            <Label className="text-xs">Cursive font</Label>
            <Select
              value={block.fontFamily ?? cursiveOptions[0].value}
              onValueChange={(v) => onChange({ fontFamily: v })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {cursiveOptions.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    <span style={{ fontFamily: f.value }}>{f.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumField label="Signature size" value={block.fontSize ?? 40} onChange={(v) => onChange({ fontSize: v })} />
        </>
      )}

      {currentIntent === "image" && (
        <div>
          <Label className="text-xs">Signature image (PNG with transparent background works best)</Label>
          <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted">
            <Upload className="h-3.5 w-3.5" />
            {busy ? "Uploading…" : block.imageSrc ? "Replace signature" : "Upload signature"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
                e.target.value = ""
              }}
            />
          </label>
          {block.imageSrc && (
            <div className="mt-2 overflow-hidden rounded border bg-white">
              <img src={block.imageSrc} alt="" className="block max-h-20 w-full object-contain" />
            </div>
          )}
        </div>
      )}

      <div>
        <Label className="text-xs">Label below the line</Label>
        <Input
          value={block.label ?? ""}
          placeholder="Instructor"
          onChange={(e) => onChange({ label: e.target.value })}
          className="mt-1 h-8 text-xs"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Text colour</Label>
          <input type="color" value={block.textColor ?? "#0f172a"} onChange={(e) => onChange({ textColor: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Line colour</Label>
          <input type="color" value={block.lineColor ?? "#0f172a"} onChange={(e) => onChange({ lineColor: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
        </div>
      </div>
    </div>
  )
}

function DecorationInspector({ block, onChange }: { block: DecorationBlock; onChange: (p: Partial<DecorationBlock>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Variant</Label>
        <Select value={block.variant} onValueChange={(v) => onChange({ variant: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-80">
            {DECORATION_CATEGORIES.map((cat) => (
              <div key={cat}>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</div>
                {DECORATION_PRESETS.filter((p) => p.category === cat).map((p) => (
                  <SelectItem key={p.variant} value={p.variant} className="text-xs">{p.label}</SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Primary</Label>
          <input type="color" value={block.primary} onChange={(e) => onChange({ primary: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Accent</Label>
          <input type="color" value={block.accent} onChange={(e) => onChange({ accent: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Caption (some variants)</Label>
        <Input
          value={block.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="e.g. HONOURED, EXCELLENCE"
          className="mt-1 h-8 text-xs"
        />
      </div>
      <NumField label="Opacity (0-1)" value={block.opacity ?? 1} onChange={(v) => onChange({ opacity: Math.max(0, Math.min(1, v)) })} />
    </div>
  )
}

function QrInspector({ block, onChange }: { block: QrBlock; onChange: (p: Partial<QrBlock>) => void }) {
  const [busy, setBusy] = useState(false)
  const onFile = async (file: File) => {
    setBusy(true)
    try {
      const { url } = await uploadAsset(file, "certificates")
      onChange({ centerSrc: url })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3">
      <div className="rounded border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
        QR encodes the verify URL <code className="rounded bg-background px-1 font-mono text-foreground">.../verify/{`{{certificate_id}}`}</code>. The quiet zone padding below must stay ≥ 4 for it to be scannable.
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">QR colour</Label>
          <input type="color" value={block.fgColor ?? "#000000"} onChange={(e) => onChange({ fgColor: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Background</Label>
          <input type="color" value={block.bgColor ?? "#ffffff"} onChange={(e) => onChange({ bgColor: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
        </div>
      </div>
      <NumField label="Quiet zone (≥ 4)" value={block.padding ?? 8} onChange={(v) => onChange({ padding: Math.max(0, v) })} />

      <div>
        <Label className="text-xs">Centre logo (optional)</Label>
        <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted">
          <Upload className="h-3.5 w-3.5" />
          {busy ? "Uploading…" : block.centerSrc ? "Replace centre logo" : "Add centre logo"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.target.value = ""
            }}
          />
        </label>
        {block.centerSrc && (
          <>
            <div className="mt-2 overflow-hidden rounded border bg-white">
              <img src={block.centerSrc} alt="" className="block max-h-16 w-full object-contain" />
            </div>
            <NumField label="Logo size (px)" value={block.centerSize ?? Math.round(Math.min(block.w, block.h) * 0.18)} onChange={(v) => onChange({ centerSize: v })} />
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!block.centerRounded} onChange={(e) => onChange({ centerRounded: e.target.checked })} />
              Round the centre logo
            </label>
            <Button variant="ghost" size="sm" onClick={() => onChange({ centerSrc: undefined })} className="mt-2 w-full text-xs">
              Remove centre logo
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
