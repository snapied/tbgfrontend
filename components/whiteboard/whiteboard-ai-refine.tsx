"use client"

// Floating "AI refine" pill that operates on the currently-selected
// text elements on the Excalidraw canvas. Hidden when no text element
// is selected. Click → POST /api/ai/refine with the selected text →
// updateScene with the refined string written back into each element.
//
// Modes (dropdown): improve | shorten | expand | grammar. Default is
// improve. Each mode maps to the same `/api/ai/refine` route with a
// different `mode` argument; the backend swaps the system prompt.
//
// The component is plan-gated implicitly: the underlying /api/ai/refine
// requires Pro+, and isAIAvailable() (which the AIGenerateButton
// elsewhere also uses) returns false on Starter — we hide the pill
// entirely in that case to avoid offering a button that always errors.

import { useEffect, useRef, useState } from "react"
import { Loader2, Sparkles, ChevronDown } from "lucide-react"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { isAIAvailable, aiRefineText } from "@/lib/ai-client"

type Mode = "improve" | "shorten" | "expand" | "grammar"

const MODE_LABEL: Record<Mode, string> = {
  improve: "Improve",
  shorten: "Shorten",
  expand: "Expand",
  grammar: "Fix grammar",
}

interface Props {
  api: ExcalidrawImperativeAPI | null
}

export function WhiteboardAIRefineButton({ api }: Props) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [selectedTextIds, setSelectedTextIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  // Re-render every 200ms to track Excalidraw's selection. Excalidraw
  // doesn't expose an "onSelectionChange" event for our binding;
  // polling here is cheap and only watches the appState slice.
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    void isAIAvailable().then((v) => {
      if (!cancelled) setAvailable(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!api) return
    const tick = () => {
      const appState = api.getAppState()
      const elements = api.getSceneElements()
      const sel = appState.selectedElementIds || {}
      const textIds = elements
        .filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (el: any) => sel[el.id] && el.type === "text" && typeof el.text === "string" && el.text.trim().length > 0,
        )
        .map((el) => el.id)
      setSelectedTextIds((prev) =>
        prev.length === textIds.length && prev.every((id, i) => id === textIds[i]) ? prev : textIds,
      )
    }
    tick()
    tickRef.current = setInterval(tick, 250)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [api])

  if (available === false) return null
  if (!api) return null
  if (selectedTextIds.length === 0) return null

  const run = async (mode: Mode) => {
    if (busy) return
    setBusy(true)
    try {
      // Concatenate all selected text elements so a multi-line note
      // refines as a single coherent block. If we refined each text
      // element separately, voice + flow would diverge.
      const elements = api.getSceneElements()
      const selected = elements.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (el: any) => selectedTextIds.includes(el.id) && el.type === "text",
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combined = selected.map((el: any) => el.text).join("\n\n")
      const result = await aiRefineText({ text: combined, mode })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      // Split the refined text back across the selected elements by
      // paragraph. If counts don't match (model returned different
      // shape) we drop the whole refined text into the first element
      // and leave the rest untouched — better than corrupting layout.
      const parts = result.text.split(/\n\n+/)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any[] = elements.map((el: any) => {
        if (!selectedTextIds.includes(el.id) || el.type !== "text") return el
        const idx = selected.findIndex((s) => s.id === el.id)
        const next =
          parts.length === selected.length ? parts[idx] : idx === 0 ? result.text : el.text
        return { ...el, text: next, originalText: next, version: (el.version ?? 0) + 1 }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(api as any).updateScene({ elements: updates })
      toast.success(`Refined ${selected.length} text element${selected.length === 1 ? "" : "s"}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI call failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30">
      <div className="pointer-events-auto inline-flex items-center gap-0 overflow-hidden rounded-full border border-primary/30 bg-card shadow-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => run("improve")}
          disabled={busy}
          className="h-8 gap-1.5 rounded-none border-r border-border/60 px-3 text-xs text-primary"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {busy ? "Refining…" : "AI refine"}
          <span className="text-muted-foreground">
            ({selectedTextIds.length})
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              className="h-8 rounded-none px-2"
              title="Pick a refine mode"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <DropdownMenuItem key={m} onClick={() => run(m)}>
                <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                {MODE_LABEL[m]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
