"use client"

// AgendaEditor — inline list editor for a class's pre-class agenda.
// Used on the class detail/edit page. Each row is a one-line title
// + optional minutes; teachers can reorder by drag, add via Enter,
// and clean up with the X icon.
//
// The schema lives on LiveSession.agenda — see lib/lms-store.tsx.
// We deliberately keep the editor tiny (no rich text, no nested
// children) because the agenda's value is in being scannable at a
// glance, not in being a full planning document. If a teacher needs
// nesting they can use multiple lines or put the detail in the
// summary later.

import { useState } from "react"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type AgendaItem = { title: string; minutes?: number }

interface Props {
  value: AgendaItem[]
  onChange: (next: AgendaItem[]) => void
  /** Hide the "Add item" trailing input when the parent surface is
   *  read-only (e.g. student waiting room). Defaults to false. */
  readOnly?: boolean
}

export function AgendaEditor({ value, onChange, readOnly = false }: Props) {
  // Local state for the new-item input so the parent doesn't have
  // to thread a separate draft prop through. Submitted via Enter
  // or the + button; cleared on commit.
  const [draftTitle, setDraftTitle] = useState("")
  const [draftMinutes, setDraftMinutes] = useState<string>("")

  const commit = () => {
    const t = draftTitle.trim()
    if (!t) return
    const m = parseInt(draftMinutes, 10)
    onChange([
      ...value,
      { title: t, minutes: Number.isFinite(m) && m > 0 ? m : undefined },
    ])
    setDraftTitle("")
    setDraftMinutes("")
  }

  const updateItem = (i: number, patch: Partial<AgendaItem>) => {
    onChange(value.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  const removeItem = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i))
  }

  // Up/down reorder. Pure index swap, no drag library — keeps the
  // bundle lean and keyboard nav viable.
  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir
    if (target < 0 || target >= value.length) return
    const next = value.slice()
    const [moved] = next.splice(i, 1)
    next.splice(target, 0, moved)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          No agenda yet. Add a few bullet points so students arrive knowing what&rsquo;s coming.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {value.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-2 py-1"
            >
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  className="text-muted-foreground/60 hover:text-foreground"
                  title="Move up"
                  aria-label="Move item up"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {i + 1}
              </span>
              <Input
                value={item.title}
                onChange={(e) => updateItem(i, { title: e.target.value })}
                placeholder="Agenda item…"
                className="h-7 flex-1 border-none bg-transparent px-1 text-sm focus-visible:ring-0"
                readOnly={readOnly}
              />
              <Input
                value={item.minutes != null ? String(item.minutes) : ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  updateItem(i, {
                    minutes: Number.isFinite(n) && n > 0 ? n : undefined,
                  })
                }}
                placeholder="—"
                className="h-7 w-14 px-1 text-center text-xs"
                inputMode="numeric"
                aria-label="Minutes"
                readOnly={readOnly}
              />
              <span className="text-[10px] text-muted-foreground">min</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Remove item"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commit()
              }
            }}
            placeholder="Add an agenda item — Enter to save"
            className="h-8 flex-1 text-sm"
          />
          <Input
            value={draftMinutes}
            onChange={(e) => setDraftMinutes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commit()
              }
            }}
            placeholder="min"
            className="h-8 w-16 text-center text-xs"
            inputMode="numeric"
            aria-label="Minutes for new item"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={commit}
            disabled={!draftTitle.trim()}
          >
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
      )}
    </div>
  )
}

// Read-only display for surfaces that just want to show the agenda
// (waiting room, in-class side panel, recap view). Returns null
// when the agenda is empty so the caller doesn't have to guard.
export function AgendaList({
  items,
  highlightIndex,
}: {
  items: AgendaItem[] | undefined
  /** Optional: mark a row as "you're here" — used in the in-class
   *  side panel once the teacher ticks through items. */
  highlightIndex?: number
}) {
  if (!items || items.length === 0) return null
  return (
    <ol className="space-y-1.5">
      {items.map((item, i) => {
        const active = i === highlightIndex
        return (
          <li
            key={i}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
              active
                ? "bg-primary/10 text-primary"
                : "text-foreground/80"
            }`}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            {item.minutes != null && (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {item.minutes}m
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
