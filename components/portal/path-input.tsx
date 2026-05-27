"use client"

// Input that opens an autocomplete popover of the tenant's pages when
// the user is typing an internal path (starts with "/"). Picks include
// every PortalPage by slug plus the built-in routes (/courses,
// /instructors, /blog, /contact) the SiteHeader auto-wires.
//
// Free text still works — typing "https://…" or "mailto:…" just closes
// the popover. The picker is helpful, never blocking.

import { useEffect, useMemo, useRef, useState } from "react"
import { Globe, FileText, Mail, ExternalLink, LogIn, ShoppingBag, User as UserIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { usePortal } from "@/lib/portal-store"

interface Props {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  className?: string
}

interface PathOption {
  slug: string
  label: string
  hint?: string
  source: "page" | "built-in"
}

// Built-in destinations the portal router knows about. These ALL
// resolve cleanly without the teacher having to know exact paths —
// typing "/lo" → /login surfaces in autocomplete, click it, done.
// The previous list missed auth + student-portal routes; the
// "Sign in" CTA placeholder hinted at "/login" but typing exactly
// "/login" required the teacher to know that's the path. Now it's
// a suggested completion.
const BUILT_INS: PathOption[] = [
  { slug: "/courses", label: "Courses", hint: "Course catalog", source: "built-in" },
  { slug: "/instructors", label: "Instructors", hint: "Faculty showcase", source: "built-in" },
  { slug: "/blog", label: "Blog", hint: "Blog index", source: "built-in" },
  { slug: "/contact", label: "Contact", hint: "Contact form", source: "built-in" },
  { slug: "/store", label: "Shop", hint: "Storefront catalogue", source: "built-in" },
  { slug: "/pricing", label: "Pricing", hint: "Plan + pricing page", source: "built-in" },
  // Auth + student-portal routes — required for "Sign in" / "Open
  // dashboard" style CTAs. Typing /lo → /login, /si → /signup, /my
  // → /my (student home).
  { slug: "/login", label: "Sign in", hint: "Login page", source: "built-in" },
  { slug: "/signup", label: "Sign up", hint: "Tenant registration", source: "built-in" },
  { slug: "/my", label: "My account", hint: "Student dashboard", source: "built-in" },
]

export function PathInput({
  value,
  onChange,
  placeholder = "/about  or  https://...  or  mailto:hello@example.com",
  className,
}: Props) {
  const { pages } = usePortal()
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [localValue, setLocalValue] = useState(value)
  const blurredAtRef = useRef<number>(0)
  const BLUR_LOCK_MS = 1500

  // Sync prop value -> localValue when it changes externally
  useEffect(() => {
    if (focused) return
    if (Date.now() - blurredAtRef.current < BLUR_LOCK_MS) return
    if (value !== localValue) setLocalValue(value)
  }, [value, focused, localValue])

  // Pages from the portal store. Drop duplicates of built-ins so a
  // user-created /contact (theirs would win) doesn't double-list.
  const options = useMemo<PathOption[]>(() => {
    const fromPages: PathOption[] = pages.map((p) => ({
      slug: p.slug,
      label: p.title,
      hint: p.slug === "/" ? "Home" : p.status === "published" ? undefined : "Draft",
      source: "page",
    }))
    const pageSlugs = new Set(fromPages.map((p) => p.slug))
    const builtIns = BUILT_INS.filter((b) => !pageSlugs.has(b.slug))
    return [...fromPages, ...builtIns]
  }, [pages])

  // Filter as the user types. We only filter when the value looks like
  // an internal path so external URLs don't accidentally hide the
  // dropdown noise. Empty value = show everything.
  const looksInternal = !localValue || localValue.startsWith("/")
  const filtered = useMemo(() => {
    if (!looksInternal) return []
    const q = localValue.toLowerCase().trim()
    if (!q || q === "/") return options
    return options.filter(
      (o) =>
        o.slug.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q),
    )
  }, [options, localValue, looksInternal])

  // Open the popover when the field gets focus AND the value looks
  // like an internal path (or is empty). Typing a URL closes it.
  useEffect(() => {
    if (!focused) {
      setOpen(false)
      return
    }
    setOpen(looksInternal && filtered.length > 0)
  }, [focused, looksInternal, filtered.length])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const pick = (option: PathOption) => {
    setLocalValue(option.slug)
    onChange(option.slug)
    setOpen(false)
    setFocused(false)
  }

  // A bit of decoration for the input's left adornment depending on
  // whether the value is internal, external, or email. Special-case
  // a few known paths so /login renders with a sign-in icon, /store
  // with a bag, /my with a person — the iconography hints at the
  // destination type at a glance.
  const KindIcon = (() => {
    if (localValue.startsWith("mailto:")) return Mail
    if (localValue.startsWith("http")) return ExternalLink
    if (localValue === "/login" || localValue === "/signup") return LogIn
    if (localValue === "/store") return ShoppingBag
    if (localValue.startsWith("/my")) return UserIcon
    return Globe
  })()

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <KindIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.currentTarget.value)}
        onBlur={() => {
          setFocused(false)
          blurredAtRef.current = Date.now()
          onChange(localValue)
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false)
            setFocused(false)
          }
          // The user explicitly wanted "press / to see pages" — make
          // sure starting fresh with / opens the popover too. The
          // useEffect above handles the open state from the next
          // keystroke; this just guarantees the focus path covers it
          // when the input already had non-internal text.
          if (e.key === "/" && (localValue === "" || !localValue.startsWith("/"))) {
            setFocused(true)
          }
        }}
        placeholder={placeholder}
        className={cn("pl-8 font-mono text-sm", className)}
      />

      {/* Popover */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          <div className="border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your pages
          </div>
          <ul className="py-1">
            {filtered.map((o) => (
              <li key={`${o.source}-${o.slug}`}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // mousedown (not click) so the Input's blur
                    // doesn't fire first and close the popover before
                    // the pick lands.
                    e.preventDefault()
                    pick(o)
                  }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  {o.source === "built-in" ? (
                    <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{o.label}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {o.slug}
                    </span>
                  </span>
                  {o.hint && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {o.hint}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            Or type a full URL (<code className="rounded bg-muted px-1 font-mono text-[10px]">https://…</code>)
            or email (<code className="rounded bg-muted px-1 font-mono text-[10px]">mailto:…</code>).
          </div>
        </div>
      )}
    </div>
  )
}
