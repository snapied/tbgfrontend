"use client"

// Standalone recording-player route.
//
// Why this exists: previously the player only opened as a modal from
// the list page, which meant the URL never changed and a viewer
// couldn't share "watch at minute 12:30" anywhere. This route gives
// the player a real address — `/dashboard/recordings/<id>?t=<sec>`.
//
// The route reads the recording out of the LMS store, finds its
// transcript (if any), and mounts the same RecordingPlayerDialog
// component that the list page uses — just with defaultOpen + a
// computed shareUrl + onClose that pops the user back to the list.
//
// Empty / not-found gets a friendly link back to the index rather
// than a hard 404, because in dev (or after a workspace export) a
// recording id can disappear out from under a bookmarked link.

import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/back-button"
import { useLMS } from "@/lib/lms-store"
import { RecordingPlayerDialog } from "@/components/classes/recording-player-dialog"

export default function RecordingDetailRoutePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const { liveSessions, currentUser } = useLMS()

  const session = useMemo(
    () => liveSessions.find((s) => s.id === params.id) ?? null,
    [liveSessions, params.id],
  )

  // ?t=<seconds> deep-link → number of seconds to seek to on load.
  const tParam = search.get("t")
  const initialSeekSec = tParam != null && Number.isFinite(Number(tParam))
    ? Math.max(0, Math.floor(Number(tParam)))
    : undefined

  if (!session || !session.recordingUrl) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">Recording not found, or this class has no recording yet.</p>
        <BackButton label="Back" fallbackHref="/dashboard/recordings" className="mt-4" />
      </div>
    )
  }

  // Transcript hookup is deferred: the list page hydrates VTT URL
  // via fetchRoomState() per-row; doing the same here would duplicate
  // that work. Player still renders chapters / captions when the
  // recording's egress sidecar is reachable via the same R2 prefix.
  return (
    <RecordingPlayerDialog
      url={session.recordingUrl}
      title={session.title}
      recordingId={session.id}
      userId={currentUser?.id}
      defaultOpen
      shareUrl={`/dashboard/recordings/${session.id}`}
      initialSeekSec={initialSeekSec}
      onClose={() => router.push("/dashboard/recordings")}
    />
  )
}
