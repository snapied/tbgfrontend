"use client"

// Per-user notes panel for the recording player dialog.
//
// Press N anywhere in the player to focus the input. Each note is
// stamped with the current playhead time. Notes are private to the
// viewer (per-user, per-recording in localStorage via lib/recording-
// notes). Clicking a note seeks the video to its timestamp.
//
// Surfaces:
//   • Compact panel below the chapter rail in the player dialog
//   • Future: scrubber-chip overlays on the progress bar (lib ready)
//   • Future: Export-as-Markdown button

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Pencil, Plus, StickyNote, Trash2, X } from "lucide-react"
import { useRecordingNotes, type RecordingNote } from "@/lib/recording-notes"

interface Props {
  recordingId: string
  userId?: string
  /** Ref to the parent <video> element so we can stamp + seek. */
  videoRef: React.RefObject<HTMLVideoElement | null>
}

function formatTC(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
  return `${m}:${String(r).padStart(2, "0")}`
}

export function RecordingNotesPanel({ recordingId, userId, videoRef }: Props) {
  const { notes, add, update, remove } = useRecordingNotes(userId, recordingId)
  const [open, setOpen] = useState(true)
  const [draft, setDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Press N anywhere in the dialog (when not already typing) to
  // focus the composer. Stops bubbling so the player's J/K/L
  // shortcuts don't fight us.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      e.preventDefault()
      setOpen(true)
      // Defer focus so the panel finishes its open transition.
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  function submitNew(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    const ts = videoRef.current?.currentTime ?? 0
    const created = add(ts, draft)
    if (created) setDraft("")
  }

  function seekTo(n: RecordingNote) {
    const v = videoRef.current
    if (!v) return
    try { v.currentTime = n.tcSeconds } catch { /* ignore */ }
    v.play().catch(() => {})
  }

  function startEdit(n: RecordingNote) {
    setEditingId(n.id)
    setEditingDraft(n.body)
  }
  function saveEdit() {
    if (editingId) update(editingId, editingDraft)
    setEditingId(null)
    setEditingDraft("")
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5">
          <StickyNote className="h-3 w-3 text-primary" />
          My notes
          {notes.length > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              {notes.length}
            </span>
          )}
          <span className="ml-1 hidden text-[9px] font-normal normal-case tracking-normal text-muted-foreground/60 sm:inline">
            Press <kbd className="rounded border border-border bg-muted px-1 font-mono">N</kbd> to add
          </span>
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border/60 p-3">
          {/* New note composer */}
          <form onSubmit={submitNew} className="flex items-center gap-2">
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] tabular-nums font-bold text-primary">
              {formatTC(videoRef.current?.currentTime ?? 0)}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Note at this moment…"
              maxLength={280}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[12.5px] outline-none transition-colors focus:border-primary"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-[11px] font-bold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Save note"
            >
              <Plus className="h-3 w-3" />
              Save
            </button>
          </form>

          {/* Notes list */}
          {notes.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
              📝 No notes yet. Press <kbd className="rounded border border-border bg-card px-1 font-mono">N</kbd> any time to add one stamped with the current moment. Only you see these.
            </p>
          ) : (
            <ol className="mt-3 space-y-1">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="group rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-muted/30"
                >
                  {editingId === n.id ? (
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums font-bold text-primary">
                        {formatTC(n.tcSeconds)}
                      </span>
                      <input
                        type="text"
                        value={editingDraft}
                        onChange={(e) => setEditingDraft(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit()
                          if (e.key === "Escape") { setEditingId(null); setEditingDraft("") }
                        }}
                        className="min-w-0 flex-1 rounded-md border border-primary bg-background px-2 py-1 text-[12.5px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setEditingDraft("") }}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                        aria-label="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => seekTo(n)}
                        className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                        title="Seek to this moment"
                      >
                        {formatTC(n.tcSeconds)}
                      </button>
                      <button
                        type="button"
                        onClick={() => seekTo(n)}
                        className="min-w-0 flex-1 text-left text-[12.5px] leading-snug"
                      >
                        {n.body}
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEdit(n)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Edit note"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(n.id)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          <p className="mt-3 inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
            🔒 Only you can see these notes. Stored locally to your browser.
          </p>
        </div>
      )}
    </div>
  )
}
