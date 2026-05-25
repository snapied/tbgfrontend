"use client"

// Saved-Views chip rail. Drop into any list page to expose saved
// filter combinations as one-tap pills. The pattern:
//
//   1. The page owns its own filter state (search, chips, etc.).
//   2. The page passes its current filter snapshot to this rail via
//      `currentState`. Saving a view captures that snapshot.
//   3. Applying a saved view fires `onApply(view.state)` — the page
//      decodes its own state shape and restores filters.
//
// Generic / state-shape-agnostic so the same component fits every
// list (recordings, classes, students, courses, members, etc.).

import { useState } from "react"
import { Bookmark, BookmarkPlus, MoreHorizontal, Trash2, X } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  deleteView,
  saveView,
  useSavedViews,
  type SavedView,
} from "@/lib/list-views"
import { toast } from "sonner"

interface Props {
  userId: string | undefined
  pageId: string
  /** Snapshot of the current filter state. Saved verbatim when the
   *  user clicks Save view. */
  currentState: Record<string, unknown>
  /** Called when a user picks a saved view. Page restores filters. */
  onApply: (state: Record<string, unknown>) => void
  /** Optional: when the page can detect that no view matches the
   *  current state, it can pass undefined here. When the state
   *  matches a saved view, pass that view's id so the chip
   *  highlights. */
  activeViewId?: string
}

export function ListViewsRail({
  userId,
  pageId,
  currentState,
  onApply,
  activeViewId,
}: Props) {
  const views = useSavedViews(userId, pageId)
  const [saveOpen, setSaveOpen] = useState(false)
  const [newName, setNewName] = useState("")

  function commitSave() {
    const trimmed = newName.trim()
    if (!trimmed) return
    saveView(userId, pageId, { name: trimmed, state: currentState })
    setNewName("")
    setSaveOpen(false)
    toast.success(`Saved view “${trimmed}”`)
  }

  function remove(v: SavedView) {
    deleteView(userId, pageId, v.id)
    toast.message(`Deleted view “${v.name}”`)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {views.length > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Bookmark className="h-3 w-3" />
          Views
        </span>
      )}
      {views.map((v) => {
        const active = v.id === activeViewId
        return (
          <div
            key={v.id}
            className={`group inline-flex items-center gap-0.5 overflow-hidden rounded-full border transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <button
              type="button"
              onClick={() => onApply(v.state)}
              className="px-2.5 py-0.5 text-[11px] font-semibold"
              title={`Apply view: ${v.name}`}
            >
              {v.emoji && <span aria-hidden className="mr-1">{v.emoji}</span>}
              {v.name}
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="View actions"
                  className={`border-l border-current/20 px-1.5 py-0.5 transition-opacity ${
                    active ? "opacity-80 hover:opacity-100" : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-40 p-1">
                <button
                  type="button"
                  onClick={() => remove(v)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete view
                </button>
              </PopoverContent>
            </Popover>
          </div>
        )
      })}

      {/* Save current as a view */}
      <Popover open={saveOpen} onOpenChange={(v) => { setSaveOpen(v); if (!v) setNewName("") }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            title="Save the current filters as a view"
            aria-label="Save view"
          >
            <BookmarkPlus className="h-3 w-3" />
            Save view
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Save current filters as
          </p>
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitSave()
              if (e.key === "Escape") setSaveOpen(false)
            }}
            placeholder="e.g. JEE Maths · last 30 days"
            maxLength={40}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12.5px] outline-none focus:border-primary"
          />
          <div className="mt-2 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setSaveOpen(false)}
              className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={commitSave}
              disabled={!newName.trim()}
              className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
