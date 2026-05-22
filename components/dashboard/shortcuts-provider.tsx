"use client"

// Two things in one file (tightly coupled, easier to read together):
//
//   1. ShortcutsProvider — context that lets ANY component in the
//      dashboard subtree register its own shortcuts at mount and have
//      them appear in the discoverable overlay. The provider also owns
//      the global shortcuts (g h, g q, ?, etc.) and the overlay's open
//      state.
//
//   2. ShortcutsOverlay — the modal opened by `?`. Groups the registered
//      shortcuts and renders each as <kbd> chips so the user can browse
//      what's available without guessing.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  useKeyboardShortcuts,
  type KeyboardShortcut,
} from "@/lib/use-keyboard-shortcuts"

interface RegisteredShortcut {
  /** Stable id so a page can re-register (useEffect cleanup) safely. */
  id: string
  keys: string
  description: string
  group: string
}

interface ShortcutsContextValue {
  /** Page-local shortcuts call this in a useEffect; the cleanup
   *  function deregisters on unmount. The returned function is the
   *  cleanup. */
  register: (s: RegisteredShortcut) => () => void
  /** Imperative open — useful if we wire a "Keyboard shortcuts" link
   *  from the user menu later. */
  openOverlay: () => void
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null)

export function useShortcutsContext(): ShortcutsContextValue {
  const ctx = useContext(ShortcutsContext)
  if (!ctx) {
    throw new Error("useShortcutsContext must be used inside <ShortcutsProvider>")
  }
  return ctx
}

interface ProviderProps {
  children: ReactNode
}

export function ShortcutsProvider({ children }: ProviderProps) {
  const router = useRouter()
  const [registered, setRegistered] = useState<RegisteredShortcut[]>([])
  const [open, setOpen] = useState(false)

  const register = useCallback((s: RegisteredShortcut) => {
    setRegistered((prev) => {
      // Replace any prior entry with the same id (re-render after route
      // change or props change). Avoids duplicates in the overlay.
      const filtered = prev.filter((p) => p.id !== s.id)
      return [...filtered, s]
    })
    return () => {
      setRegistered((prev) => prev.filter((p) => p.id !== s.id))
    }
  }, [])

  // Global shortcuts (always live, regardless of page). Page-local
  // shortcuts bind themselves with their own useKeyboardShortcuts in
  // their components — they don't need to go through this list.
  const globalShortcuts: KeyboardShortcut[] = useMemo(
    () => [
      {
        keys: "?",
        group: "Help",
        description: "Show keyboard shortcuts",
        handler: () => setOpen(true),
      },
      // Allow Esc to close the overlay even when focus is somewhere
      // inside the dialog — Radix handles this for us, but having an
      // explicit allow lets us tweak later.
      {
        keys: "g h",
        group: "Navigation",
        description: "Go home (dashboard)",
        handler: () => router.push("/dashboard"),
      },
      {
        keys: "g c",
        group: "Navigation",
        description: "Go to Classes",
        handler: () => router.push("/dashboard/classes"),
      },
      {
        keys: "g q",
        group: "Navigation",
        description: "Go to Quizzes",
        handler: () => router.push("/dashboard/quizzes"),
      },
      {
        keys: "g w",
        group: "Navigation",
        description: "Go to Whiteboards",
        handler: () => router.push("/dashboard/whiteboards"),
      },
      {
        keys: "g r",
        group: "Navigation",
        description: "Go to Recordings",
        handler: () => router.push("/dashboard/recordings"),
      },
      {
        keys: "g s",
        group: "Navigation",
        description: "Go to Students",
        handler: () => router.push("/dashboard/students"),
      },
    ],
    [router],
  )

  useKeyboardShortcuts(globalShortcuts)

  // Mirror global shortcuts into the registered list so the overlay
  // sees them. Done with a useEffect (not at construction time) so
  // we don't churn React state during render.
  useEffect(() => {
    setRegistered((prev) => {
      // Drop any prior global entries (ids prefixed with "global:").
      const local = prev.filter((s) => !s.id.startsWith("global:"))
      const next = globalShortcuts.map((s, i) => ({
        id: `global:${i}`,
        keys: s.keys,
        description: s.description,
        group: s.group ?? "Other",
      }))
      return [...local, ...next]
    })
  }, [globalShortcuts])

  const ctx = useMemo<ShortcutsContextValue>(
    () => ({ register, openOverlay: () => setOpen(true) }),
    [register],
  )

  return (
    <ShortcutsContext.Provider value={ctx}>
      {children}
      <ShortcutsOverlay
        open={open}
        onOpenChange={setOpen}
        shortcuts={registered}
      />
    </ShortcutsContext.Provider>
  )
}

// Hook for individual pages: declares a shortcut, makes it appear in
// the overlay, and runs the handler when pressed. Wraps both the
// registration and the binding so callers only need one line.
export function usePageShortcut({
  id,
  keys,
  description,
  group = "This page",
  handler,
  enabled = true,
}: {
  id: string
  keys: string
  description: string
  group?: string
  handler: () => void
  enabled?: boolean
}): void {
  const ctx = useContext(ShortcutsContext)

  // Bind the actual key listener.
  useKeyboardShortcuts(
    [
      {
        keys,
        description,
        group,
        handler,
      },
    ],
    enabled,
  )

  // Register with the overlay.
  useEffect(() => {
    if (!ctx || !enabled) return
    return ctx.register({ id, keys, description, group })
    // We intentionally exclude `handler` from deps — it's almost
    // always a fresh closure, and the overlay only needs the static
    // text. The listener has its own ref to the latest handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, id, keys, description, group, enabled])
}

// ─────────────────────────────────────────────────────────────────────
// Overlay
// ─────────────────────────────────────────────────────────────────────

function ShortcutsOverlay({
  open,
  onOpenChange,
  shortcuts,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  shortcuts: RegisteredShortcut[]
}) {
  // Group + sort. Stable within a group: first-seen order. Across
  // groups: a fixed priority list (Navigation first, then This page,
  // then everything else alphabetically).
  const grouped = useMemo(() => {
    const map = new Map<string, RegisteredShortcut[]>()
    for (const s of shortcuts) {
      const list = map.get(s.group) ?? []
      list.push(s)
      map.set(s.group, list)
    }
    const priority = ["This page", "Navigation", "Actions", "Help"]
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = priority.indexOf(a)
      const bi = priority.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })
  }, [shortcuts])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Press the keys outside of any input. Press{" "}
          <Kbd>?</Kbd> anytime to reopen this list.
        </p>

        <div className="mt-2 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {grouped.map(([group, entries]) => (
            <section key={group}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </h3>
              <ul className="space-y-1.5">
                {entries.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm hover:bg-muted/40"
                  >
                    <span>{s.description}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.split(/\s+/).map((k, i) => (
                        <Kbd key={`${s.id}-${i}`}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No shortcuts registered yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  )
}
