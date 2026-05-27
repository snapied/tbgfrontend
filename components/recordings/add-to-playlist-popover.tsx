"use client"

// "Add to playlist" popover dropped on each recording row.
// Renders a list of the viewer's playlists with checkmarks for
// playlists already containing this recording. Inline "New playlist"
// input creates one on the fly.

import { useMemo, useState } from "react"
import { Check, ListPlus, Plus } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  addToPlaylist,
  createPlaylist,
  removeFromPlaylist,
  useRecordingPlaylists,
} from "@/lib/recording-playlists"
import { toast } from "sonner"

interface Props {
  userId: string | undefined
  recordingId: string
  recordingTitle?: string
}

export function AddToPlaylistPopover({ userId, recordingId, recordingTitle }: Props) {
  const playlists = useRecordingPlaylists(userId)
  const [newName, setNewName] = useState("")
  const [open, setOpen] = useState(false)

  // Derived — NOT stateful. `containing` is a pure function of `playlists`
  // and `recordingId`. Using useEffect+setState here caused an infinite loop:
  //   playlists changes (new array ref) → effect fires → setContaining(new Set)
  //   → re-render → playlists is new array ref again → repeat.
  // useMemo computes synchronously and never calls setState, so no loop.
  const containing = useMemo(
    () => new Set(playlists.filter((p) => p.recordingIds.includes(recordingId)).map((p) => p.id)),
    [playlists, recordingId],
  )

  const sorted = useMemo(
    () => [...playlists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [playlists],
  )

  function toggle(playlistId: string) {
    if (containing.has(playlistId)) {
      removeFromPlaylist(userId, playlistId, recordingId)
      toast.message(`Removed from playlist`)
    } else {
      addToPlaylist(userId, playlistId, recordingId)
      const pl = playlists.find((p) => p.id === playlistId)
      toast.success(`Added to ${pl?.name ?? "playlist"}`)
    }
  }

  function createAndAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const pl = createPlaylist(userId, trimmed)
    addToPlaylist(userId, pl.id, recordingId)
    setNewName("")
    toast.success(`Created “${pl.name}” and added`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          aria-label="Add to playlist"
          title="Add to playlist"
        >
          <ListPlus className="h-3 w-3" />
          Playlist
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {recordingTitle ? `Add “${recordingTitle.slice(0, 30)}…” to` : "Add to"}
        </p>
        {sorted.length === 0 ? (
          <p className="px-2 py-1 text-[11px] text-muted-foreground">
            No playlists yet. Create one below.
          </p>
        ) : (
          <ul className="max-h-48 space-y-0.5 overflow-y-auto">
            {sorted.map((pl) => {
              const isIn = containing.has(pl.id)
              return (
                <li key={pl.id}>
                  <button
                    type="button"
                    onClick={() => toggle(pl.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors ${
                      isIn ? "bg-primary/[0.06] font-semibold text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isIn ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      }`}
                    >
                      {isIn && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1 truncate">{pl.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {pl.recordingIds.length}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createAndAdd() }}
            placeholder="New playlist…"
            maxLength={60}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={createAndAdd}
            disabled={!newName.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Create playlist"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
        <p className="mt-2 px-2 text-[10px] text-muted-foreground">
          🔒 Playlists are private to you.
        </p>
      </PopoverContent>
    </Popover>
  )
}
