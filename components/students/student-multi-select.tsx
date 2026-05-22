"use client"

// Reusable "pick many students" widget. Built to stay usable at 1000+
// students: typeahead with fuzzy match, virtualized-ish behavior (we
// cap rendered results to 50 + a "load more" link), and a chip
// surface showing the current selection separately so the user always
// sees who's in the group even when they're typing a new search.
//
// API mirrors a controlled input — pass the current set of selected
// ids and a setter. Drop in anywhere a teacher needs to bucket users.

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { fuzzySearch } from "@/lib/fuzzy-search"
import type { User } from "@/lib/lms-store"

interface Props {
  students: User[]
  value: Set<string>
  onChange: (next: Set<string>) => void
  // Optional: hide students who are already in another set (e.g. when
  // adding to a group, hide existing members so the picker shows
  // only candidates). Defaults to "show everyone".
  exclude?: Set<string>
  // Maximum number of result rows rendered before "Load 50 more".
  pageSize?: number
}

export function StudentMultiSelect({
  students,
  value,
  onChange,
  exclude,
  pageSize = 50,
}: Props) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const candidates = useMemo(
    () => (exclude ? students.filter((s) => !exclude.has(s.id)) : students),
    [students, exclude],
  )

  const filtered = useMemo(
    () => fuzzySearch(candidates, query, (s) => [s.name, s.email, s.phone ?? ""]),
    [candidates, query],
  )

  const visible = filtered.slice(0, pageSize * page)
  const more = filtered.length - visible.length

  const toggle = (id: string) => {
    const next = new Set(value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  const remove = (id: string) => {
    const next = new Set(value)
    next.delete(id)
    onChange(next)
  }

  const addAllVisible = () => {
    const next = new Set(value)
    for (const s of visible) next.add(s.id)
    onChange(next)
  }

  // Look up the User objects for the current selection so we can
  // render chips even if the student no longer matches the search.
  const selectedUsers = useMemo(() => {
    return [...value]
      .map((id) => students.find((s) => s.id === id))
      .filter((u): u is User => !!u)
  }, [students, value])

  return (
    <div className="space-y-3">
      {/* Selected chips — always visible, easy to remove individuals
          without having to find them in the result list. */}
      {selectedUsers.length > 0 && (
        <div className="rounded-md border border-border bg-card p-2">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Selected ({selectedUsers.length})
            </p>
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-0.5 pl-2 pr-1 text-xs font-medium text-primary"
              >
                {u.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold">
                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                )}
                <span className="max-w-[160px] truncate">{u.name}</span>
                <button
                  type="button"
                  onClick={() => remove(u.id)}
                  className="rounded-full p-0.5 text-primary/70 hover:bg-primary/20 hover:text-primary"
                  aria-label={`Remove ${u.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder={`Search ${candidates.length} students — typos OK`}
          className="pl-9"
        />
      </div>

      {/* Results header with quick "select all matching" affordance */}
      {query.trim() && filtered.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {filtered.length} match{filtered.length === 1 ? "" : "es"}
          </span>
          <button
            type="button"
            onClick={addAllVisible}
            className="font-medium text-primary hover:underline"
          >
            Select all {visible.length} on screen
          </button>
        </div>
      )}

      {/* Results list — capped at pageSize*page rows so a 1000-student
          workspace doesn't render 1000 DOM nodes at once. */}
      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {query.trim() ? "No students match." : "No students yet."}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {visible.map((s) => {
                const checked = value.has(s.id)
                return (
                  <li key={s.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40",
                        checked && "bg-primary/[0.04]",
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(s.id)} />
                      {s.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{s.email}</p>
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
            {more > 0 && (
              <div className="border-t border-border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Load {Math.min(more, pageSize)} more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
