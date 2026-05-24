"use client"

// SearchInput — the canonical search field used by every list page in
// the dashboard. Bundles:
//
//   • the Search icon (left)
//   • the controlled <Input/> with consistent left/right padding
//   • an X clear button (right) that appears when the value is non-empty
//   • a "/" kbd hint that fades out while the field is focused
//   • a global "/" hotkey that focuses this input from anywhere on the
//     page (unless another input/textarea is already focused) — wires
//     through usePageShortcut so it also appears in the ? overlay
//
// Pages just say:
//
//   <SearchInput
//     pageId="students"
//     value={q}
//     onChange={setQ}
//     placeholder="Search students by name, email…"
//   />
//
// and everything else (focus, clear, hotkey, kbd hint) is handled.

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { usePageShortcut } from "@/components/dashboard/shortcuts-provider"

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  /** Page-unique id used by usePageShortcut so the overlay can list
   *  the shortcut and we don't collide with other pages that also
   *  bind "/" on a different mount. */
  pageId: string
  /** Override the description shown in the ? overlay. */
  shortcutDescription?: string
  /** Disable the "/" focus shortcut (rare — set false if a parent
   *  already binds "/" to something else, e.g. a modal). */
  enableSlashShortcut?: boolean
  /** aria-label override. Defaults to the placeholder. */
  ariaLabel?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  pageId,
  shortcutDescription,
  enableSlashShortcut = true,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  usePageShortcut({
    id: `search:${pageId}`,
    keys: "/",
    description: shortcutDescription ?? "Focus search",
    handler: () => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.select()
    },
    enabled: enableSlashShortcut,
  })

  // Defensive: if some other "/" handler swallows the event before our
  // hook fires (shouldn't happen — useKeyboardShortcuts skips when
  // focused on an input), fall back to a local listener as a backup.
  // Cheap because we only react when not focused.
  useEffect(() => {
    if (!enableSlashShortcut) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t) {
        const tag = t.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
        if (t.isContentEditable) return
      }
      const el = ref.current
      if (!el || document.activeElement === el) return
      e.preventDefault()
      el.focus()
      el.select()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enableSlashShortcut])

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // Append a "(press /)" hint so the keyboard shortcut is
        // discoverable even for users who don't read the visible kbd
        // badge on the right. Strip the hint once the user has focused
        // the field — at that point the badge has already done its job.
        placeholder={
          focused || enableSlashShortcut === false
            ? placeholder
            : `${placeholder}   (press /)`
        }
        aria-label={ariaLabel ?? placeholder}
        className="pl-9 pr-16"
      />
      {/* Right-side adornments — either the clear button (when there's
          a query) or the "/" kbd hint (when idle). They occupy the same
          spot so the layout doesn't shift. */}
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("")
            ref.current?.focus()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
          title="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd
          className={cn(
            "pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground sm:inline-block",
            focused && "opacity-0",
          )}
          aria-hidden
        >
          /
        </kbd>
      )}
    </div>
  )
}
