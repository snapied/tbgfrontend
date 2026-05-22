"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { fuzzyScore } from "@/lib/fuzzy-search"

interface TagsInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  suggestions?: string[]
}

export function TagsInput({
  value,
  onChange,
  placeholder = "Add a tag and press Enter…",
  className,
  suggestions,
}: TagsInputProps) {
  const [draft, setDraft] = useState("")

  const commit = (raw?: string) => {
    const candidate = (raw ?? draft).trim().replace(/,$/, "").trim()
    if (!candidate) return
    const lower = candidate.toLowerCase()
    if (value.some((t) => t.toLowerCase() === lower)) {
      setDraft("")
      return
    }
    onChange([...value, candidate])
    setDraft("")
  }

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (!draft.trim()) return
      e.preventDefault()
      commit()
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  const filteredSuggestions = (suggestions || [])
    .filter((s) => !value.some((t) => t.toLowerCase() === s.toLowerCase()))
    .map((s) => ({ s, score: fuzzyScore(draft, s) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => a.score - b.score)
    .map(({ s }) => s)
    .slice(0, 6)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring/30">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-primary/70 hover:text-primary"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => draft.trim() && commit()}
          placeholder={value.length === 0 ? placeholder : ""}
          className="h-7 min-w-[120px] flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      {filteredSuggestions && filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Suggested:</span>
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
