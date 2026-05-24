"use client"

// StudentTags + StudentTagsEditor — display + edit affordances for
// the tenant-shared student-tag store.
//
// Two surfaces:
//
//   <StudentTagChips studentId /> — read-only display of a
//   student's tags. Used on the roster row + detail page header.
//
//   <StudentTagsEditor studentId /> — full add/remove control with
//   autocomplete against existing tenant tags. Used on the detail
//   page sidebar.
//
// Both pull from the same localStorage-backed store
// (lib/student-tags) so changes from the editor are reflected on
// the chips on the next render.

import { useEffect, useMemo, useRef, useState } from "react"
import { Tag, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  colorForTag,
  getAllUniqueTags,
  getTagsForStudent,
  setTagsForStudent,
} from "@/lib/student-tags"

// ─── Read-only chips, for list rows + headers ───────────────────────

export function StudentTagChips({
  studentId,
  max = 3,
  className,
}: {
  studentId: string
  /** Cap the visible chips; overflow renders as "+N". Defaults to 3
   *  so a roster row doesn't get visually noisy. */
  max?: number
  className?: string
}) {
  const [tags, setTags] = useState<string[]>([])
  useEffect(() => {
    setTags(getTagsForStudent(studentId))
  }, [studentId])
  if (tags.length === 0) return null
  const shown = tags.slice(0, max)
  const overflow = tags.length - shown.length
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {shown.map((t) => {
        const c = colorForTag(t)
        return (
          <span
            key={t}
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
              c.bg,
              c.text,
            )}
          >
            {t}
          </span>
        )
      })}
      {overflow > 0 && (
        <span
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          title={tags.slice(max).join(" · ")}
        >
          +{overflow}
        </span>
      )}
    </span>
  )
}

// ─── Full editor, for the detail-page sidebar ──────────────────────

interface EditorProps {
  studentId: string
  studentName: string
}

export function StudentTagsEditor({ studentId, studentName }: EditorProps) {
  const [tags, setTags] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [showPicker, setShowPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Hydrate from store. We don't subscribe to cross-tab updates
  // here — tags are a slow-moving slice and live-syncing them
  // would just churn re-renders. Local writes update both store
  // and state in lockstep below.
  useEffect(() => {
    setTags(getTagsForStudent(studentId))
  }, [studentId])

  // Autocomplete pool — every tag used anywhere in the tenant.
  // Filter against the draft + drop tags the student already has.
  const existingTagPool = useMemo(() => {
    const all = getAllUniqueTags()
    const set = new Set(tags.map((t) => t.toLowerCase()))
    return all.filter((t) => !set.has(t.toLowerCase()))
  }, [tags])
  const filteredSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase()
    if (!q) return existingTagPool.slice(0, 8)
    return existingTagPool.filter((t) => t.toLowerCase().includes(q)).slice(0, 8)
  }, [draft, existingTagPool])

  const commit = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const next = Array.from(new Set([...tags, trimmed]))
    setTags(next)
    setTagsForStudent(studentId, next)
    setDraft("")
    setShowPicker(false)
    inputRef.current?.focus()
  }

  const remove = (tag: string) => {
    const next = tags.filter((t) => t !== tag)
    setTags(next)
    setTagsForStudent(studentId, next)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.length === 0 && (
          <span className="text-xs text-muted-foreground">
            No tags yet — add a few to make {studentName.split(" ")[0]} easier to find.
          </span>
        )}
        {tags.map((t) => {
          const c = colorForTag(t)
          return (
            <span
              key={t}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                c.bg,
                c.text,
              )}
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                className="-mr-0.5 rounded p-0.5 hover:bg-black/10"
                aria-label={`Remove ${t}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )
        })}
      </div>
      <div className="relative">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setShowPicker(true)
          }}
          onFocus={() => setShowPicker(true)}
          onBlur={() => {
            // Defer close so a click on a suggestion still lands.
            window.setTimeout(() => setShowPicker(false), 100)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit(draft)
            } else if (e.key === "," || e.key === "Tab") {
              if (draft.trim()) {
                e.preventDefault()
                commit(draft)
              }
            } else if (
              e.key === "Backspace" &&
              draft === "" &&
              tags.length > 0
            ) {
              // Backspace on empty input removes the last tag —
              // matches every chip-input pattern users know.
              remove(tags[tags.length - 1])
            }
          }}
          placeholder="Add a tag — Enter to save"
          className="h-8 text-sm"
        />
        {showPicker && filteredSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
            {filteredSuggestions.map((t) => {
              const c = colorForTag(t)
              return (
                <button
                  key={t}
                  type="button"
                  onMouseDown={(e) => {
                    // mousedown (not click) so the input's blur
                    // doesn't close the picker before we commit.
                    e.preventDefault()
                    commit(t)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      c.bg,
                      c.text,
                    )}
                  >
                    {t}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Used elsewhere
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        <Tag className="mr-1 inline h-3 w-3" />
        Tags are shared — every teacher in this workspace sees them.
        Type to add, press Enter, or pick from existing tags.
      </p>
    </div>
  )
}
