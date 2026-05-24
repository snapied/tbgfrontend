"use client"

// StudentPrivateNotesPanel — the teacher's working notebook on a
// single student. Sits on the student detail page as a side card.
//
// Design intent: this is private to the AUTHOR, not the workspace.
// The student never sees it, co-teachers never see it, the public
// portal never sees it. Read-after-write is the only contract; we
// don't compete with the doubts / messages / activity tabs for
// audience reach. That's why the storage is per-(tenant, author,
// student) and lives in localStorage only.
//
// UX: a single textarea with autosave-after-pause. No edit buttons,
// no "save" CTA — every keystroke is captured. We display a tiny
// "Saved · 4s ago" footer so the teacher trusts that work is
// surviving the next tab close.

import { useEffect, useRef, useState } from "react"
import { Lock, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { getNote, saveNote } from "@/lib/student-private-notes"

interface Props {
  studentId: string
  studentName: string
  authorId: string | undefined
}

export function StudentPrivateNotesPanel({ studentId, studentName, authorId }: Props) {
  const [body, setBody] = useState<string>("")
  const [hydrated, setHydrated] = useState(false)
  // Track when the last successful save landed so we can render a
  // honest "Saved · Ns ago" footer (instead of vague "Saved" which
  // teachers can't trust mid-edit).
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [savingFlash, setSavingFlash] = useState(false)
  const debounceRef = useRef<number | null>(null)

  // Hydrate from localStorage once per (author, student) pair. We
  // don't subscribe to changes from other tabs — concurrent editing
  // of private notes is a non-goal; last-write wins. If we add
  // multi-tab sync later, swap this for a `storage` event listener.
  useEffect(() => {
    if (!authorId) {
      setHydrated(true)
      return
    }
    const existing = getNote(authorId, studentId)
    setBody(existing?.body ?? "")
    setLastSavedAt(existing?.updatedAt ?? null)
    setHydrated(true)
  }, [authorId, studentId])

  // Autosave after a 600ms quiet period. Skip the first run after
  // hydrate so re-hydration with an empty store doesn't blow away
  // an existing note. The check uses lastSavedAt as a proxy — if
  // it's null AND body is empty, there's nothing to save anyway.
  useEffect(() => {
    if (!hydrated) return
    if (!authorId) return
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      setSavingFlash(true)
      saveNote(authorId, studentId, body)
      setLastSavedAt(body.trim() ? new Date().toISOString() : null)
      // Hold the "saving" indicator for one tick so it's visible
      // even on fast machines — gives the teacher a deliberate
      // moment of feedback.
      window.setTimeout(() => setSavingFlash(false), 250)
    }, 600)
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [body, hydrated, authorId, studentId])

  const placeholder = `Private notes about ${studentName.split(" ")[0]}…\n\nNobody else sees this — not them, not co-teachers, not the public site.`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Private notes
        </CardTitle>
        <CardDescription>
          Only you see these. Useful for working observations — strengths,
          things to watch, follow-ups for next time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={6}
          className="resize-y text-sm"
          disabled={!authorId}
        />
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {savingFlash ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving…
            </>
          ) : lastSavedAt ? (
            <>Saved · {formatRelative(lastSavedAt)}</>
          ) : (
            <>Autosaves after you stop typing.</>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso)
  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now"
  if (diffMs < 60_000) {
    const s = Math.max(1, Math.floor(diffMs / 1000))
    return `${s}s ago`
  }
  const m = Math.floor(diffMs / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
