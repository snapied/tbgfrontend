"use client"

// RecordingDetailsSheet — inline editor for a recording's
// description + linked resources, accessible directly from the
// recordings list row. The fields it edits already exist on the
// underlying LiveSession:
//
//   • session.summary   — rich-text "what was covered" body
//   • session.materials — array of links/files/embeds attached
//
// Both have always been editable from the class detail page; this
// sheet just brings them into the recordings hub so a teacher
// curating their recording library doesn't have to bounce out and
// back per row. Writes go through the same updateLiveSession
// action the recap editor uses, so changes show up everywhere the
// session is rendered.

import { useEffect, useMemo, useState } from "react"
import {
  FileText,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  requestAutoCaption,
  checkCaptionStatus,
  requestOfflineDownload,
  triggerNativeDownload,
} from "@/lib/recording-services"
import { Captions, Download } from "lucide-react"
import {
  useLMS,
  generateId,
  type LiveSession,
  type SessionMaterial,
} from "@/lib/lms-store"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  session: LiveSession
}

export function RecordingDetailsSheet({ open, onOpenChange, session }: Props) {
  const { updateLiveSession } = useLMS()

  // Local edit buffers — only persisted on Save so the teacher can
  // bail without writing partial state. Rehydrate on open in case
  // the session changed (another tab edited the recap).
  const [summary, setSummary] = useState<string>(session.summary ?? "")
  const [materials, setMaterials] = useState<SessionMaterial[]>(
    session.materials ?? [],
  )
  // Sprint B Recordings #25 — visibility tier. Default = "enrolled"
  // matches existing behaviour (rewatch is gated to enrolment).
  type Vis = NonNullable<LiveSession["recordingVisibility"]>
  const [visibility, setVisibility] = useState<Vis>(
    (session.recordingVisibility as Vis) ?? "enrolled",
  )
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => {
    if (!open) return
    setSummary(session.summary ?? "")
    setMaterials(session.materials ?? [])
    setVisibility((session.recordingVisibility as Vis) ?? "enrolled")
  }, [open, session.summary, session.materials, session.recordingVisibility])

  // Dirty flag — disables Save when there's nothing to write.
  const dirty = useMemo(() => {
    if ((session.summary ?? "") !== summary) return true
    if (((session.recordingVisibility as Vis) ?? "enrolled") !== visibility) return true
    const a = session.materials ?? []
    const b = materials
    if (a.length !== b.length) return true
    for (let i = 0; i < a.length; i++) {
      if (a[i].id !== b[i].id) return true
      if (a[i].label !== b[i].label) return true
      if (a[i].url !== b[i].url) return true
      if (a[i].type !== b[i].type) return true
    }
    return false
  }, [summary, materials, visibility, session.summary, session.materials, session.recordingVisibility])

  const addLink = () => {
    setMaterials((prev) => [
      ...prev,
      {
        id: generateId("mat"),
        type: "link",
        label: "",
        url: "",
      },
    ])
  }

  const updateMaterial = (i: number, patch: Partial<SessionMaterial>) => {
    setMaterials((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    )
  }

  const removeMaterial = (i: number) => {
    setMaterials((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = () => {
    // Strip empty rows so the saved state stays clean.
    const cleanMaterials = materials.filter(
      (m) => (m.label?.trim().length ?? 0) > 0 || (m.url?.trim().length ?? 0) > 0,
    )
    setSubmitting(true)
    try {
      updateLiveSession(session.id, {
        summary: summary.trim() || undefined,
        materials: cleanMaterials,
        recordingVisibility: visibility,
      })
      toast.success("Recording updated.")
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  // Sprint C Recordings #18 — auto-caption job state. Three
  // visual states: idle (Generate button), queued/running (spinner
  // + status text), ready (success + reminder it'll show on the
  // player). We poll status every 8s while running.
  const [captionStatus, setCaptionStatus] = useState<
    | { kind: "idle" }
    | { kind: "queued"; pollingKey: string }
    | { kind: "running"; pollingKey: string }
    | { kind: "ready" }
    | { kind: "failed" }
  >({ kind: "idle" })
  useEffect(() => {
    if (captionStatus.kind !== "queued" && captionStatus.kind !== "running") return
    const pollingKey = captionStatus.pollingKey
    let cancelled = false
    const tick = async () => {
      const next = await checkCaptionStatus(pollingKey)
      if (cancelled) return
      if (next === "ready") {
        setCaptionStatus({ kind: "ready" })
        toast.success("Captions ready — they'll appear on the player.")
      } else if (next === "failed") {
        setCaptionStatus({ kind: "failed" })
      } else {
        setCaptionStatus({ kind: next, pollingKey })
      }
    }
    const id = window.setInterval(tick, 8000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [captionStatus])

  // Sprint C Recordings #28 — download UI state. We show a brief
  // "preparing…" pill while the backend mints the signed URL, then
  // hand off to native download. Errors land in a toast — the
  // teacher should retry, not stare at a stuck spinner.
  const [downloading, setDownloading] = useState(false)

  // Sprint B Recordings #26 — copy-link-at-timecode helper. Pulls
  // the current viewer's last known position from the progress
  // entry (if any) and appends `?t=<seconds>` so the recipient
  // lands at the same spot. Falls back to the bare share URL when
  // no progress exists. The Recordings page renders the result in
  // a toast.
  const copyLinkAtCurrent = (currentSec?: number) => {
    const base = session.recordingUrl ?? ""
    if (!base) {
      toast.error("No recording URL available to share.")
      return
    }
    const url = typeof currentSec === "number" && currentSec > 5
      ? `${base}${base.includes("?") ? "&" : "?"}t=${Math.round(currentSec)}`
      : base
    void navigator.clipboard.writeText(url)
    toast.success(
      currentSec && currentSec > 5
        ? `Link copied — jumps to ${formatTc(currentSec)}`
        : "Link copied",
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recording details
          </SheetTitle>
          <SheetDescription className="line-clamp-2">
            {session.title}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 overflow-y-auto px-1 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="rec-summary">Description</Label>
            <Textarea
              id="rec-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={`What was covered in "${session.title}"…`}
              rows={6}
              className="resize-y"
            />
            <p className="text-[11px] text-muted-foreground">
              Shows on the recording row + the class recap page.
              Searchable on the recordings hub.
            </p>
          </div>

          {/* Sprint B Recordings #25 — visibility tier. Four-option
              radio. Each option carries a one-line caveat so the
              teacher picks the right tier without reading a doc. */}
          <div className="space-y-2">
            <Label>Who can watch this recording?</Label>
            <div className="grid gap-1.5">
              {(
                [
                  {
                    id: "enrolled" as const,
                    label: "Enrolled students",
                    hint: "Default. Anyone enrolled in the linked course.",
                  },
                  {
                    id: "community" as const,
                    label: "Community members",
                    hint: "Members of the community attached to the course.",
                  },
                  {
                    id: "public" as const,
                    label: "Public",
                    hint: "Anyone with the link — surfaces in search engines.",
                  },
                  {
                    id: "link-only" as const,
                    label: "Unlisted (link only)",
                    hint: "Anyone with the link; never surfaces in search.",
                  },
                ]
              ).map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-[12.5px] transition-colors ${
                    visibility === opt.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="rec-vis"
                    checked={visibility === opt.id}
                    onChange={() => setVisibility(opt.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">{opt.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Sprint B Recordings #26 — quick share buttons. Two
              variants: bare link (the URL as-is) and link-at-time
              (uses the per-user progress entry's last position). */}
          {session.recordingUrl && (
            <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2.5">
              <Label className="text-[11.5px]">Share</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyLinkAtCurrent()}
                >
                  Copy link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // No live player here; use the last progress
                    // position from the per-user record. Fetched
                    // by passing undefined: the helper will fall
                    // back to the bare link.
                    const slug = (typeof window !== "undefined" && window.localStorage)
                      ? window.localStorage.getItem(`recording-progress-tc:${session.id}`)
                      : null
                    const sec = slug ? Number(slug) : undefined
                    copyLinkAtCurrent(sec)
                  }}
                >
                  Copy link at last position
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Time-stamped links jump to where you left off (uses your last watch position).
              </p>
            </div>
          )}

          {/* Sprint C Recordings #18 + #28 — caption + download
              actions. Both UI surfaces consume the recording-services
              primitives; the network round-trips are stubbed on the
              backend but the optimistic states + polling are real,
              so a teacher gets a tight loop the moment the server
              hook lands. Each affordance hides itself when there's
              no recording URL — pointless without media. */}
          {session.recordingUrl && (
            <div className="space-y-2.5 rounded-md border border-border bg-muted/30 p-2.5">
              <Label className="text-[11.5px]">Tools</Label>

              {/* Auto-caption — three visual states. The "ready" /
                  "failed" badges stay visible so a teacher who
                  closed + reopened the sheet sees the result. */}
              <div className="flex flex-wrap items-center gap-2">
                {captionStatus.kind === "idle" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const job = await requestAutoCaption(session.id)
                      if (!job) {
                        toast.error("Couldn't queue captions — try again in a minute.")
                        return
                      }
                      setCaptionStatus({ kind: "queued", pollingKey: job.pollingKey })
                      toast.success("Captions queued. We'll ping you when they're ready.")
                    }}
                  >
                    <Captions className="mr-1 h-3.5 w-3.5" />
                    Generate captions
                  </Button>
                )}
                {(captionStatus.kind === "queued" || captionStatus.kind === "running") && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[11.5px] font-semibold text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {captionStatus.kind === "queued" ? "Queued…" : "Transcribing…"}
                  </span>
                )}
                {captionStatus.kind === "ready" && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <Captions className="h-3 w-3" />
                    Captions ready
                  </span>
                )}
                {captionStatus.kind === "failed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const job = await requestAutoCaption(session.id)
                      if (!job) {
                        toast.error("Couldn't queue captions — try again later.")
                        return
                      }
                      setCaptionStatus({ kind: "queued", pollingKey: job.pollingKey })
                    }}
                  >
                    <Captions className="mr-1 h-3.5 w-3.5" />
                    Retry captions
                  </Button>
                )}

                {/* Offline download — fires the native browser
                    download once the signed URL is back. We disable
                    the button during the round-trip so a teacher
                    doesn't fire 5 mints in a row. */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloading}
                  onClick={async () => {
                    setDownloading(true)
                    try {
                      const dl = await requestOfflineDownload(session.id)
                      if (!dl) {
                        toast.error("Download not available for this recording.")
                        return
                      }
                      triggerNativeDownload(dl)
                      toast.success("Download starting…")
                    } finally {
                      setDownloading(false)
                    }
                  }}
                >
                  {downloading ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3.5 w-3.5" />
                  )}
                  Download
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Captions are auto-generated from the audio. Downloads use a 24-hour signed URL.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Resources</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addLink}
              >
                <Plus className="mr-1 h-3 w-3" /> Add link
              </Button>
            </div>
            {materials.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                Drop the slide deck, a follow-up reading, or any link
                students should see alongside the recording.
              </p>
            ) : (
              <ul className="space-y-2">
                {materials.map((m, i) => (
                  <li
                    key={m.id}
                    className="rounded-md border border-border/60 bg-card p-2"
                  >
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <Input
                        value={m.label}
                        onChange={(e) =>
                          updateMaterial(i, { label: e.target.value })
                        }
                        placeholder="Label (e.g. Slides)"
                        className="h-7 flex-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeMaterial(i)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Remove resource"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <Input
                      value={m.url ?? ""}
                      onChange={(e) =>
                        updateMaterial(i, { url: e.target.value })
                      }
                      placeholder="https://…"
                      className="mt-1.5 h-7 text-xs"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <SheetFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!dirty || submitting}>
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** mm:ss formatter for share-link timestamps. Returns h:mm:ss for
 *  long recordings. */
function formatTc(sec: number): string {
  const total = Math.max(0, Math.round(sec))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
