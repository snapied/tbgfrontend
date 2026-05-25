"use client"

// Transcript search dialog (R7).
//
// Opens from the recordings page header. On mount, fetches transcript
// URLs for every visible recording via fetchRoomState() and builds
// an in-memory index. Search box at top, snippet results below;
// each hit deep-links to /dashboard/recordings/<id>?t=<sec> so the
// player auto-seeks to the matched moment.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Loader2, Search, ScanText, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fetchRoomState } from "@/lib/live-room-state"
import {
  indexRecording,
  searchTranscripts,
  type TranscriptHit,
} from "@/lib/transcript-search"

interface RecordingForSearch {
  id: string
  title: string
  recordingUrl?: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  recordings: RecordingForSearch[]
}

function formatTC(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
  return `${m}:${String(r).padStart(2, "0")}`
}

export function TranscriptSearchDialog({ open, onOpenChange, recordings }: Props) {
  const [query, setQuery] = useState("")
  const [indexed, setIndexed] = useState(0)
  const [indexing, setIndexing] = useState(false)
  const [withTranscript, setWithTranscript] = useState(0)

  // On open, fetch each recording's transcript URL via the existing
  // room-state lazy fetcher, then hand to the transcript index.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setIndexing(true)
    setIndexed(0)
    setWithTranscript(0)
    void (async () => {
      let countWith = 0
      let countIndexed = 0
      // Limit concurrent fetches to avoid hammering the backend.
      const queue = [...recordings]
      const WORKERS = 4
      async function worker() {
        while (queue.length > 0) {
          const r = queue.shift()
          if (!r) break
          try {
            const state = await fetchRoomState(r.id)
            const t = state?.transcriptUrl
            if (t) {
              countWith++
              setWithTranscript(countWith)
              await indexRecording({ recordingId: r.id, transcriptUrl: t })
              countIndexed++
              if (!cancelled) setIndexed(countIndexed)
            }
          } catch { /* skip on error */ }
        }
      }
      await Promise.all(Array.from({ length: WORKERS }, worker))
      if (!cancelled) setIndexing(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open, recordings])

  const hits: TranscriptHit[] = useMemo(() => {
    const q = query.trim()
    if (q.length < 3) return []
    return searchTranscripts(q).map((h) => ({
      ...h,
      recordingTitle: recordings.find((r) => r.id === h.recordingId)?.title,
    }))
  }, [query, indexed, recordings])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="h-4 w-4 text-primary" />
            Search what was said
          </DialogTitle>
          <DialogDescription>
            We&rsquo;ve indexed the transcripts of {withTranscript} of {recordings.length} recordings.
            Type a phrase to find every moment it was spoken.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "useEffect cleanup" or "Vedic squaring"'
            className="pl-9"
          />
          {indexing && (
            <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Indexing {indexed}/{withTranscript}…
            </span>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length < 3 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Type at least 3 characters to search.{" "}
              {!indexing && withTranscript === 0 && recordings.length > 0 && (
                <span className="block mt-1 text-[11px] text-amber-700">
                  None of these recordings has a transcript yet — run transcription from a recording row to enable search.
                </span>
              )}
            </p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches{indexing ? " yet — still indexing" : ""}.
            </p>
          ) : (
            <ul className="space-y-3">
              {hits.map((h) => (
                <li key={h.recordingId} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-sm font-semibold leading-snug">
                    {h.recordingTitle ?? "Recording"}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      · {h.matches.length} match{h.matches.length === 1 ? "" : "es"}
                    </span>
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {h.matches.map((m) => (
                      <li key={`${h.recordingId}-${m.startSec}`}>
                        <Link
                          href={`/dashboard/recordings/${h.recordingId}?t=${Math.floor(m.startSec)}`}
                          onClick={() => onOpenChange(false)}
                          className="group flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-muted/40"
                        >
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums font-bold text-primary">
                            {formatTC(m.startSec)}
                          </span>
                          <span className="min-w-0 flex-1 text-[12.5px] leading-snug">
                            &ldquo;{m.snippet}&rdquo;
                          </span>
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          🔒 Index lives in your browser. Search runs locally — no transcript leaves your machine.
        </p>
      </DialogContent>
    </Dialog>
  )
}

// Suppress unused-imports for icons reserved for future variants
void X
