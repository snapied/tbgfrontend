"use client"

// ListToolbar — single horizontal row that owns the search/filter/sort
// chrome on every dashboard list page. Subcomponents are exported
// individually so each page can compose only what it needs:
//
//   <ListToolbar>
//     <ListSearch value={list.search} onChange={list.setSearch} placeholder="…" />
//     <ListFilterPopover
//       label="Status"
//       value={list.getFilter("status")}
//       onChange={(v) => list.setFilter("status", v)}
//       options={[{ value: "all", label: "All" }, ...]}
//     />
//     <ListSort
//       value={list.sort}
//       onChange={list.setSort}
//       options={list.sortOptions}
//     />
//     <ListCount visible={list.visibleCount} total={list.totalCount} />
//   </ListToolbar>
//
// All controls stretch to fill on mobile and stack vertically; on
// desktop they sit on one line with search expanding to fill.
// Selection-aware bulk actions live below the toolbar via the existing
// <BulkActionBar /> component — not part of this shell, so the page
// can render it conditionally without re-flowing the toolbar.

import { ReactNode, useState } from "react"
import { Search as SearchIcon, Filter as FilterIcon, ArrowUpDown, X, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ───── Layout shell ─────────────────────────────────────────────────

interface ToolbarProps {
  children: ReactNode
  className?: string
}

export function ListToolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center",
        className,
      )}
    >
      {children}
    </div>
  )
}

// ───── Search input ─────────────────────────────────────────────────

interface SearchProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** Hides the "/" hint kbd pill. */
  hideShortcutHint?: boolean
  /** Stretches to fill (default). Set false to render inline at content width. */
  grow?: boolean
}

export function ListSearch({
  value,
  onChange,
  placeholder = "Search — press / to focus",
  hideShortcutHint,
  grow = true,
}: SearchProps) {
  return (
    <div className={cn("relative", grow && "flex-1")}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-12"
      />
      {!value && !hideShortcutHint && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          /
        </kbd>
      )}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ───── Filter popover ───────────────────────────────────────────────

export interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterPopoverProps {
  /** Header label (e.g. "Status", "Subject"). Also the trigger label
   *  when value is at default. */
  label: string
  /** Current value. */
  value: string
  /** The value treated as "no filter" — drives the active styling on
   *  the trigger. Defaults to "all". */
  defaultValue?: string
  onChange: (v: string) => void
  options: FilterOption[]
  /** Aria-label override for the trigger when active. */
  triggerAriaLabel?: string
}

export function ListFilterPopover({
  label,
  value,
  defaultValue = "all",
  onChange,
  options,
  triggerAriaLabel,
}: FilterPopoverProps) {
  const active = value !== defaultValue
  const activeOption = options.find((o) => o.value === value)
  const [open, setOpen] = useStateLikeOpen()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={active ? "default" : "outline"}
          size="sm"
          className="shrink-0 gap-2"
          aria-label={triggerAriaLabel ?? `Filter by ${label}`}
        >
          <FilterIcon className="h-4 w-4" />
          <span className="hidden sm:inline">
            {active ? activeOption?.label ?? label : label}
          </span>
          <span className="sm:hidden">{label}</span>
          {active && activeOption?.count !== undefined && (
            <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-bold">
              {activeOption.count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Filter by {label.toLowerCase()}
        </div>
        {options.map((opt) => (
          <FilterRow
            key={opt.value}
            label={opt.label}
            count={opt.count}
            active={value === opt.value}
            onClick={() => {
              onChange(opt.value)
              setOpen(false)
            }}
          />
        ))}
      </PopoverContent>
    </Popover>
  )
}

function FilterRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
      )}
    >
      <span className="flex items-center gap-2">
        {active ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
        {label}
      </span>
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-bold",
            active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// Tiny adapter so we can use Popover's open/onOpenChange without
// repeating useState in every consumer. Returns [open, setOpen]
// just like useState but with a stable signature.
function useStateLikeOpen(): [boolean, (v: boolean) => void] {
  // We could keep this as a local useState — kept separate so future
  // upgrades (e.g. close on Escape, close on outside-click default
  // behaviours) can hook here once.
  const [open, setOpen] = useState(false)
  return [open, setOpen]
}

// ───── Sort dropdown ────────────────────────────────────────────────

interface SortProps<Key extends string> {
  value: Key
  onChange: (v: Key) => void
  options: Array<{ key: Key; label: string }>
}

export function ListSort<Key extends string>({
  value,
  onChange,
  options,
}: SortProps<Key>) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Key)}>
      <SelectTrigger className="w-auto shrink-0 gap-2">
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((opt) => (
          <SelectItem key={opt.key} value={opt.key}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ───── Count badge ──────────────────────────────────────────────────

interface CountProps {
  visible: number
  total: number
  noun?: string
}

export function ListCount({ visible, total, noun = "items" }: CountProps) {
  return (
    <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
      <span className="font-semibold text-foreground">{visible}</span>
      {visible !== total && (
        <span>
          {" "}
          of <span className="font-semibold text-foreground">{total}</span>
        </span>
      )}{" "}
      {noun}
    </span>
  )
}

// ───── Reset all chip ───────────────────────────────────────────────

interface ResetProps {
  onClick: () => void
}

export function ListReset({ onClick }: ResetProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="gap-1.5 text-muted-foreground">
      <X className="h-3.5 w-3.5" />
      Reset filters
    </Button>
  )
}
