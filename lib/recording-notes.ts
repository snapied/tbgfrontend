"use client"

// Per-(user, recording) notes with timestamps.
//
// Powers Sprint B Recordings #14 (notes panel) and indirectly #21
// (time-stamped comments — same shape, just author-public instead of
// per-user). The notes here are PRIVATE to each user — no peer
// visibility. Comments are a separate primitive when we build it.
//
// Storage:
//   `thebigclass.t.<slug>.user.<userId>.recordingNotes.<recordingId>` →
//     { entries: Array<{ id, tcSeconds, body, createdAt, updatedAt }> }

import { useCallback, useEffect, useMemo, useState } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

export interface RecordingNote {
  id: string
  tcSeconds: number
  body: string
  createdAt: string
  updatedAt: string
}

interface NotesRecord {
  entries: RecordingNote[]
}

function storageKey(userId: string | undefined, recordingId: string): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  const u = userId ?? "_anon"
  return `thebigclass.t.${slug}.user.${u}.recordingNotes.${recordingId}`
}

function readNotes(key: string): NotesRecord {
  if (typeof window === "undefined") return { entries: [] }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { entries: [] }
    const parsed = JSON.parse(raw) as Partial<NotesRecord>
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] }
  } catch {
    return { entries: [] }
  }
}

function writeNotes(key: string, record: NotesRecord): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(record))
    window.dispatchEvent(new CustomEvent("recording-notes-changed"))
  } catch {
    /* private browsing / quota — best-effort */
  }
}

export interface UseRecordingNotesApi {
  notes: RecordingNote[]
  add: (tcSeconds: number, body: string) => RecordingNote | null
  update: (id: string, body: string) => void
  remove: (id: string) => void
}

export function useRecordingNotes(
  userId: string | undefined,
  recordingId: string | undefined,
): UseRecordingNotesApi {
  const key = useMemo(
    () => (recordingId ? storageKey(userId, recordingId) : null),
    [userId, recordingId],
  )
  const [record, setRecord] = useState<NotesRecord>({ entries: [] })

  useEffect(() => {
    if (!key) return
    const refresh = () => setRecord(readNotes(key))
    refresh()
    window.addEventListener("recording-notes-changed", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("recording-notes-changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [key])

  const add = useCallback(
    (tcSeconds: number, body: string): RecordingNote | null => {
      const trimmed = body.trim()
      if (!trimmed || !key) return null
      const note: RecordingNote = {
        id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        tcSeconds: Math.max(0, Math.round(tcSeconds)),
        body: trimmed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const next: NotesRecord = {
        entries: [...record.entries, note].sort((a, b) => a.tcSeconds - b.tcSeconds),
      }
      writeNotes(key, next)
      setRecord(next)
      return note
    },
    [key, record],
  )

  const update = useCallback(
    (id: string, body: string) => {
      if (!key) return
      const trimmed = body.trim()
      const now = new Date().toISOString()
      const next: NotesRecord = {
        entries: record.entries.map((n) =>
          n.id === id ? { ...n, body: trimmed, updatedAt: now } : n,
        ),
      }
      writeNotes(key, next)
      setRecord(next)
    },
    [key, record],
  )

  const remove = useCallback(
    (id: string) => {
      if (!key) return
      const next: NotesRecord = {
        entries: record.entries.filter((n) => n.id !== id),
      }
      writeNotes(key, next)
      setRecord(next)
    },
    [key, record],
  )

  return { notes: record.entries, add, update, remove }
}
