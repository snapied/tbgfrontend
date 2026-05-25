"use client"

// In-memory transcript search index (R7).
//
// Recordings ship a VTT transcript sidecar from the egress
// pipeline. This lib lazily fetches the VTT for each recording on
// demand, parses cue text + start times, and exposes a search-
// across-all-transcripts hook for the recordings list.
//
// Why client-side: the POC backend doesn't have an FTS index
// (Postgres tsvector / Lucene / Meilisearch) wired up. For the
// realistic dataset of an Indian coaching centre (200-2000
// recordings × ~30KB each), an in-memory index built once per
// session is fine — total memory ≈ 60MB worst-case for 2k
// recordings, less if we cache aggressively.
//
// API:
//   prefetchTranscriptIndex(recordings)
//     Triggers lazy fetch + index build for any recordings we
//     haven't seen. No-op on already-indexed entries.
//   searchTranscripts(query) → Hit[]
//     Returns per-recording matches with timestamped snippets.
//   useTranscriptSearch(recordings, query, enabled) → SearchState
//
// Limitations:
//   • No stemming / fuzzy match — substring only. Good enough for
//     "useEffect cleanup" style queries; weak for "use-effect"
//     vs "useEffect". A future upgrade is to lowercase+strip on
//     both sides.
//   • Cross-origin transcripts need CORS. Same R2 caveat as
//     thumbnails — works with the right header config.

import { useEffect, useMemo, useState } from "react"

interface Cue {
  startSec: number
  text: string
  /** Lowercased cue text for cheap substring matching. */
  needle: string
}

interface IndexedRecording {
  recordingId: string
  fetchedAt: number
  cues: Cue[]
  /** All cue text concatenated, lowercased — for fast "does this
   *  recording contain the query at all" prefilter. */
  joined: string
}

export interface TranscriptHit {
  recordingId: string
  recordingTitle?: string
  matches: Array<{ startSec: number; snippet: string }>
}

const cache = new Map<string, IndexedRecording>()
const inflight = new Map<string, Promise<void>>()

function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = []
  const blocks = vtt.split(/\r?\n\r?\n/)
  for (const b of blocks) {
    const lines = b.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length === 0) continue
    // First or second line should contain the timestamp range.
    const tcLine = lines.find((l) => l.includes("-->"))
    if (!tcLine) continue
    const start = parseTimestamp(tcLine.split("-->")[0]?.trim() ?? "")
    if (!Number.isFinite(start)) continue
    const text = lines.filter((l) => !l.includes("-->") && !/^WEBVTT/i.test(l)).join(" ").trim()
    if (!text) continue
    cues.push({ startSec: start, text, needle: text.toLowerCase() })
  }
  return cues
}

function parseTimestamp(ts: string): number {
  // Accepts HH:MM:SS.mmm or MM:SS.mmm.
  const parts = ts.split(":")
  if (parts.length === 3) {
    const [h, m, s] = parts
    return Number(h) * 3600 + Number(m) * 60 + Number(s)
  }
  if (parts.length === 2) {
    const [m, s] = parts
    return Number(m) * 60 + Number(s)
  }
  return Number(ts)
}

export async function indexRecording(args: {
  recordingId: string
  transcriptUrl: string
}): Promise<void> {
  if (cache.has(args.recordingId)) return
  const existing = inflight.get(args.recordingId)
  if (existing) return existing

  const p = (async () => {
    try {
      const r = await fetch(args.transcriptUrl, { credentials: "include" })
      if (!r.ok) return
      const vtt = await r.text()
      const cues = parseVtt(vtt)
      cache.set(args.recordingId, {
        recordingId: args.recordingId,
        fetchedAt: Date.now(),
        cues,
        joined: cues.map((c) => c.needle).join(" "),
      })
    } catch { /* fetch failed — leave uncached so a retry can succeed */ }
    finally {
      inflight.delete(args.recordingId)
    }
  })()
  inflight.set(args.recordingId, p)
  return p
}

/** Search all indexed recordings. Returns timestamped snippets per
 *  recording, sorted by hit count (best matches first). */
export function searchTranscripts(query: string): TranscriptHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  const out: TranscriptHit[] = []
  for (const [id, idx] of cache) {
    if (!idx.joined.includes(q)) continue
    const matches: TranscriptHit["matches"] = []
    for (const c of idx.cues) {
      if (!c.needle.includes(q)) continue
      // Build a 60-char window around the hit so the UI can
      // render a snippet without showing the whole cue.
      const i = c.needle.indexOf(q)
      const start = Math.max(0, i - 30)
      const end = Math.min(c.text.length, i + q.length + 30)
      const snippet = (start > 0 ? "…" : "") + c.text.slice(start, end) + (end < c.text.length ? "…" : "")
      matches.push({ startSec: c.startSec, snippet })
      if (matches.length >= 5) break // cap per-recording hits
    }
    if (matches.length > 0) {
      out.push({ recordingId: id, matches })
    }
  }
  return out.sort((a, b) => b.matches.length - a.matches.length).slice(0, 20)
}

// React hook combining the prefetch + search lifecycle.
export interface UseTranscriptSearchResult {
  hits: TranscriptHit[]
  indexing: boolean
  indexed: number
  total: number
}

export function useTranscriptSearch(
  recordings: Array<{ id: string; transcriptUrl?: string | null; title?: string }>,
  query: string,
  enabled: boolean,
): UseTranscriptSearchResult {
  const [indexedCount, setIndexedCount] = useState(0)
  const [indexing, setIndexing] = useState(false)
  const q = query.trim()

  useEffect(() => {
    if (!enabled) return
    if (q.length < 3) return
    let cancelled = false
    setIndexing(true)
    const toIndex = recordings.filter((r) => r.transcriptUrl && !cache.has(r.id))
    if (toIndex.length === 0) {
      setIndexedCount(cache.size)
      setIndexing(false)
      return
    }
    void Promise.all(
      toIndex.map((r) =>
        r.transcriptUrl ? indexRecording({ recordingId: r.id, transcriptUrl: r.transcriptUrl }) : Promise.resolve(),
      ),
    ).then(() => {
      if (cancelled) return
      setIndexedCount(cache.size)
      setIndexing(false)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, q, recordings])

  const hits = useMemo(() => {
    if (!enabled || q.length < 3) return []
    const raw = searchTranscripts(q)
    return raw.map((h) => ({
      ...h,
      recordingTitle: recordings.find((r) => r.id === h.recordingId)?.title,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, enabled, indexedCount])

  return {
    hits,
    indexing,
    indexed: indexedCount,
    total: recordings.filter((r) => r.transcriptUrl).length,
  }
}
