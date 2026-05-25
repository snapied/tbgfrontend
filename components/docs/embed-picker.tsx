"use client"

// EmbedPicker — searches across every embeddable artifact in the
// workspace and inserts a typed embed block when picked.
//
// Why one component instead of five separate pickers: a creator
// thinks "embed something about useEffect cleanup", not "embed a
// recording specifically." Fuzzy search across all types is the
// faster path to insertion. We tag each result with its kind so the
// picker output writes the right block type.

import { useMemo, useState } from "react"
import {
  Film,
  GraduationCap,
  PenSquare,
  Search,
  Sparkles,
  StickyNote,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLMS } from "@/lib/lms-store"
import { useDocs, type BlockType } from "@/lib/docs"

interface EmbedTarget {
  kind: BlockType  // one of the embed-* types
  refId: string
  label: string
  detail?: string
  icon: React.ReactNode
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Don't include this doc id in results (avoid embedding a doc in itself). */
  excludeDocId?: string
  onPick: (target: { kind: BlockType; refId: string }) => void
}

export function EmbedPicker({ open, onOpenChange, excludeDocId, onPick }: Props) {
  const { courses, liveSessions, whiteboards, quizzes } = useLMS()
  const { docs } = useDocs()
  const [query, setQuery] = useState("")

  // Flatten everything embeddable into one list with a typed `kind`.
  const targets = useMemo<EmbedTarget[]>(() => {
    const out: EmbedTarget[] = []

    // Lessons
    for (const c of courses) {
      for (const m of c.modules ?? []) {
        for (const l of m.lessons ?? []) {
          out.push({
            kind: "embed-lesson",
            refId: l.id,
            label: l.title,
            detail: `${c.title} · ${m.title}`,
            icon: <GraduationCap className="h-3.5 w-3.5 text-primary" />,
          })
        }
      }
    }

    // Recordings (live sessions with a recording URL)
    for (const s of liveSessions) {
      if (!s.recordingUrl) continue
      out.push({
        kind: "embed-recording",
        refId: s.id,
        label: s.title,
        detail: s.summary ? s.summary.replace(/<[^>]+>/g, " ").slice(0, 60) : "Recording",
        icon: <Film className="h-3.5 w-3.5 text-rose-700" />,
      })
    }

    // Whiteboards
    for (const w of whiteboards) {
      out.push({
        kind: "embed-whiteboard",
        refId: w.id,
        label: w.title,
        detail: "Whiteboard",
        icon: <PenSquare className="h-3.5 w-3.5 text-amber-700" />,
      })
    }

    // Quizzes
    for (const q of quizzes) {
      out.push({
        kind: "embed-quiz",
        refId: q.id,
        label: q.title,
        detail: `${q.questions?.length ?? 0} questions`,
        icon: <Sparkles className="h-3.5 w-3.5 text-violet-700" />,
      })
    }

    // Other Docs (skip self + soft-deleted)
    for (const d of docs) {
      if (d.deletedAt) continue
      if (d.id === excludeDocId) continue
      out.push({
        kind: "embed-doc",
        refId: d.id,
        label: d.title,
        detail: "Doc",
        icon: <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />,
      })
    }

    return out
  }, [courses, liveSessions, whiteboards, quizzes, docs, excludeDocId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return targets.slice(0, 30)
    return targets
      .filter((t) =>
        t.label.toLowerCase().includes(q) ||
        (t.detail?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 30)
  }, [targets, query])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Embed an artifact
          </DialogTitle>
          <DialogDescription>
            Insert a live reference to a lesson, recording, whiteboard, quiz, or another doc. Picks render as cards in your doc and stay in sync with the source.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons, recordings, whiteboards, quizzes, docs…"
            className="w-full rounded-md border border-border bg-background px-9 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <ul className="max-h-[55vh] divide-y divide-border/60 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches. Try a different word.
            </li>
          ) : (
            filtered.map((t) => (
              <li key={`${t.kind}-${t.refId}`}>
                <button
                  type="button"
                  onClick={() => {
                    onPick({ kind: t.kind, refId: t.refId })
                    onOpenChange(false)
                    setQuery("")
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    {t.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{t.label}</span>
                    {t.detail && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {t.detail}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <p className="text-[10px] text-muted-foreground">
          Embeds are live — they render the artifact&rsquo;s current state, not a snapshot.
        </p>
      </DialogContent>
    </Dialog>
  )
}
