"use client"

// Standalone whiteboards dashboard.
//
// Instructors can create boards independent of any class — for lesson planning,
// design jams, ad-hoc explanations. Each card opens the full tldraw editor at
// /dashboard/whiteboards/[id]. Metadata is in lms-store; canvas state lives in
// IndexedDB via tldraw's persistenceKey.

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  PenSquare,
  Pencil,
  Trash2,
  ExternalLink,
  Presentation,
  Lightbulb,
  CalendarRange,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLMS, generateId, type Whiteboard } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { toast } from "sonner"
import { EmptyStateWithTemplates } from "@/components/dashboard/empty-state-templates"
import { usePageShortcut } from "@/components/dashboard/shortcuts-provider"

export default function WhiteboardsPage() {
  const router = useRouter()
  const { whiteboards, addWhiteboard, updateWhiteboard, deleteWhiteboard, currentUser } = useLMS()
  const confirm = useConfirm()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")

  const sorted = whiteboards
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  // `createBoardWithTitle` is the underlying creator — accepts an
  // optional title so template buttons can name the board upfront.
  // `handleCreate` is the no-arg click-handler wrapper used by the
  // existing UI (the +New tile, etc.), so MouseEvent isn't silently
  // coerced into a title string.
  const createBoardWithTitle = (title?: string) => {
    const id = generateId("wb")
    const board: Whiteboard = {
      id,
      title:
        title?.trim() ||
        `Whiteboard · ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.id ?? "unknown",
      // generateId("wb") already returns "wb-<...>", so reuse it directly
      // instead of double-prefixing.
      persistenceKey: id,
      // Whiteboards default to workspace-wide visibility — most boards
      // are shared brainstorms, not personal scratchpads. Teachers can
      // flip to private from the board's settings dropdown when they
      // genuinely want a solo canvas.
      visibility: "public",
    }
    addWhiteboard(board)
    router.push(`/dashboard/whiteboards/${id}`)
  }
  const handleCreate = () => createBoardWithTitle()

  // "n" creates a fresh blank board (same as the +New tile).
  usePageShortcut({
    id: "whiteboards:new",
    keys: "n",
    description: "New whiteboard",
    handler: handleCreate,
  })

  const handleDelete = async (b: Whiteboard) => {
    const ok = await confirm({
      title: `Delete "${b.title}"?`,
      description: "Moved to Trash — you can restore it within 7 days. The canvas content is preserved.",
      destructive: true,
      confirmLabel: "Delete",
    })
    if (!ok) return
    deleteWhiteboard(b.id)
    toastUndoableDelete({
      kind: "whiteboard",
      ids: b.id,
      label: b.title,
      itemNoun: "whiteboard",
    })
  }

  const handleRenameOpen = (b: Whiteboard) => {
    setRenamingId(b.id)
    setRenameDraft(b.title)
  }
  const handleRenameSave = () => {
    if (!renamingId) return
    const next = renameDraft.trim()
    if (!next) return
    updateWhiteboard(renamingId, { title: next })
    setRenamingId(null)
    toast.success("Renamed")
  }

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  // Soft dot-grid placeholder pattern colours — cycles through a palette
  const CARD_ACCENTS = [
    "from-violet-50 via-purple-50 to-indigo-100 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-indigo-900/40",
    "from-rose-50 via-pink-50 to-fuchsia-100 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-fuchsia-900/40",
    "from-emerald-50 via-teal-50 to-cyan-100 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-900/40",
    "from-amber-50 via-orange-50 to-yellow-100 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-900/40",
    "from-sky-50 via-blue-50 to-indigo-100 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-indigo-900/40",
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Whiteboards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Infinite canvas for lesson plans, design jams, and ad-hoc explanations.{" "}
            <span className="text-foreground/60">Auto-saves as you draw.</span>
          </p>
        </div>
        <Button onClick={handleCreate} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          New board
        </Button>
      </div>

      {sorted.length === 0 ? (
        // Empty state — three pre-named starting points + a blank
        // escape hatch. Each tile creates a board with the chosen
        // title (canvas is blank in every case); the benefit is the
        // teacher lands on a pre-named board instead of
        // "Whiteboard · Apr 12, 10:24".
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20">
          <EmptyStateWithTemplates
            icon={<PenSquare className="h-5 w-5" />}
            title="No boards yet"
            description="Sketch concepts, plan sessions, or brainstorm with shapes, arrows, and freehand drawing."
            templates={[
              {
                key: "lesson-plan",
                title: "Lesson plan",
                preview: "Pre-named for sketching today's lesson flow — objective, hook, practice, exit ticket.",
                icon: <Presentation className="h-4 w-4" />,
                accent: "sky",
                onSelect: () => createBoardWithTitle("Lesson plan"),
              },
              {
                key: "brainstorm",
                title: "Brainstorm",
                preview: "Open canvas tuned for ideation — drop sticky notes, branch arrows, connect ideas.",
                icon: <Lightbulb className="h-4 w-4" />,
                accent: "amber",
                onSelect: () => createBoardWithTitle("Brainstorm"),
              },
              {
                key: "weekly-plan",
                title: "Weekly schedule",
                preview: "Title-only board to map out the week — drop dates, swap blocks, share with the team.",
                icon: <CalendarRange className="h-4 w-4" />,
                accent: "emerald",
                onSelect: () => createBoardWithTitle("Weekly schedule"),
              },
            ]}
            blankAction={{
              label: "Start blank instead",
              onSelect: () => handleCreate(),
            }}
          />
        </div>
      ) : (
        /* Card grid — 2 → 3 → 4 col */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {/* ── New board tile (always first) ── */}
          <button
            onClick={handleCreate}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/40 py-6 text-center transition-all hover:border-primary/50 hover:bg-primary/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              New board
            </span>
          </button>

          {/* ── Existing board tiles ── */}
          {sorted.map((b, i) => (
            <div
              key={b.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
            >
              {/* Thumbnail */}
              <Link
                href={`/dashboard/whiteboards/${b.id}`}
                className="relative block overflow-hidden"
                aria-label={`Open ${b.title}`}
              >
                <div className={`aspect-[4/3] w-full bg-gradient-to-br ${CARD_ACCENTS[i % CARD_ACCENTS.length]}`}>
                  {b.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    /* Dot-grid placeholder */
                    <div
                      className="h-full w-full flex items-center justify-center"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
                        backgroundSize: "18px 18px",
                      }}
                    >
                      <PenSquare className="h-8 w-8 text-foreground/15" />
                    </div>
                  )}
                </div>

                {/* Hover overlay with "Open" cue */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/10">
                  <span className="scale-90 rounded-lg bg-background/90 px-3 py-1 text-xs font-semibold shadow opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                    Open board →
                  </span>
                </div>
              </Link>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight">{b.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Edited {relativeTime(b.updatedAt)}
                  </p>
                </div>

                {/* Action buttons — visible on hover (always accessible via focus) */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    onClick={() => handleRenameOpen(b)}
                    title="Rename"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    href={`/dashboard/whiteboards/${b.id}`}
                    title="Open in full screen"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(b)}
                    title="Delete"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={!!renamingId} onOpenChange={(o) => !o && setRenamingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename whiteboard</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSave()
            }}
            placeholder="Whiteboard title"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingId(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSave} disabled={!renameDraft.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
