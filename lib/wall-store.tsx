"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { readCurrentTenantSlug } from "./tenant-store"
import { pushToTrash, registerRestoreHandler } from "./trash"

// Wall of Love — a curated showcase of student work and praise that
// teachers post manually after a great class. Each entry is one piece
// of media (image, video, link) or a quote, optionally credited to a
// student. Lives publicly at `/wall` so the tenant can share it with
// prospects to demonstrate community vibe.
export type WallKind = "image" | "video" | "quote" | "link"

export interface WallEntry {
  id: string
  kind: WallKind
  // For image/video/link: the resource URL. For quote: empty.
  url?: string
  // Short caption shown under the media. For quote: this is the quote text.
  caption: string
  // Optional attribution.
  studentId?: string
  studentName?: string
  // Optional course tag.
  courseId?: string
  // Sentiment chip — drives the colour accent of the card.
  vibe?: "love" | "win" | "creative" | "milestone"
  // Featured items float to the top of the wall.
  featured?: boolean
  addedBy: string  // userId of the teacher who posted
  createdAt: string
  // Emoji reactions. Same shape as blog/batch posts: emoji → list of
  // user/visitor ids that reacted. Visitors who aren't signed in get
  // a stable anon id from sessionStorage so their toggle is sticky
  // within a session (handled at call site).
  reactions?: Record<string, string[]>
}

interface WallStore {
  entries: WallEntry[]
  addEntry: (entry: WallEntry) => void
  updateEntry: (id: string, patch: Partial<WallEntry>) => void
  deleteEntry: (id: string) => void
  toggleFeatured: (id: string) => void
  /** Toggle an emoji reaction on an entry. If `who` has already
   *  reacted with that emoji, the reaction is removed; otherwise
   *  it's added. */
  reactToEntry: (id: string, emoji: string, who: string) => void
}

const WallContext = createContext<WallStore | null>(null)

function storageKey(slug: string) {
  return `thebigclass.t.${slug}.wall.v1`
}

function loadFromStorage(): WallEntry[] {
  if (typeof window === "undefined") return []
  try {
    const slug = readCurrentTenantSlug()
    const raw = window.localStorage.getItem(storageKey(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as WallEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(entries: WallEntry[]): void {
  if (typeof window === "undefined") return
  try {
    const slug = readCurrentTenantSlug()
    window.localStorage.setItem(storageKey(slug), JSON.stringify(entries))
  } catch {
    /* ignore */
  }
}

export function WallProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<WallEntry[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setEntries(loadFromStorage())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveToStorage(entries)
  }, [entries, hydrated])

  const addEntry = useCallback((entry: WallEntry) => {
    setEntries((prev) => [entry, ...prev])
  }, [])

  const updateEntry = useCallback((id: string, patch: Partial<WallEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === id)
      if (target) {
        pushToTrash({
          id: target.id,
          kind: "wall-entry",
          label: target.caption?.slice(0, 60) || `${target.kind} entry`,
          sublabel: target.studentName,
          payload: target,
        })
      }
      return prev.filter((e) => e.id !== id)
    })
  }, [])

  const toggleFeatured = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, featured: !e.featured } : e)),
    )
  }, [])

  const reactToEntry = useCallback(
    (id: string, emoji: string, who: string) => {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e
          const reactions = { ...(e.reactions ?? {}) }
          const current = reactions[emoji] ?? []
          if (current.includes(who)) {
            const next = current.filter((u) => u !== who)
            if (next.length === 0) delete reactions[emoji]
            else reactions[emoji] = next
          } else {
            reactions[emoji] = [...current, who]
          }
          return { ...e, reactions }
        }),
      )
    },
    [],
  )

  // Restore handler — re-imports the entry into the wall.
  useEffect(() => {
    return registerRestoreHandler(["wall-entry"], (entry) => {
      const e = entry.payload as WallEntry
      setEntries((prev) => (prev.some((x) => x.id === e.id) ? prev : [e, ...prev]))
      return true
    })
  }, [])

  return (
    <WallContext.Provider value={{ entries, addEntry, updateEntry, deleteEntry, toggleFeatured, reactToEntry }}>
      {children}
    </WallContext.Provider>
  )
}

export function useWall(): WallStore {
  const ctx = useContext(WallContext)
  if (!ctx) throw new Error("useWall must be used within a WallProvider")
  return ctx
}
