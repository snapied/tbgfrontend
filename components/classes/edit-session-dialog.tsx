"use client"

import { useEffect, useState } from "react"
import { Link as LinkIcon, Save, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useLMS, type LiveSession } from "@/lib/lms-store"
import { detectProvider } from "@/lib/notifications"

const PROVIDER_OPTIONS: Array<{ value: LiveSession["provider"]; label: string }> = [
  { value: "google-meet", label: "Google Meet" },
  { value: "zoom",        label: "Zoom" },
  { value: "ms-teams",    label: "Microsoft Teams" },
  { value: "other",       label: "Other" },
]

/**
 * Convert an ISO string into the `YYYY-MM-DDTHH:mm` format that
 * <input type="datetime-local"> expects, in the browser's local timezone.
 */
function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface EditSessionDialogProps {
  session: LiveSession | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSessionDialog({ session, open, onOpenChange }: EditSessionDialogProps) {
  const { courses, updateLiveSession } = useLMS()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [providerOverride, setProviderOverride] = useState<LiveSession["provider"] | null>(null)
  const [scheduledAt, setScheduledAt] = useState("")
  const [duration, setDuration] = useState("60")
  const [courseId, setCourseId] = useState("")
  const [saving, setSaving] = useState(false)

  // Re-seed the form whenever a new session is opened.
  useEffect(() => {
    if (!session) return
    setTitle(session.title)
    setDescription(session.description ?? "")
    setMeetingUrl(session.meetingUrl)
    setProviderOverride(null)
    setScheduledAt(toLocalDatetime(session.scheduledAt))
    setDuration(String(session.durationMinutes))
    setCourseId(session.courseId)
  }, [session])

  if (!session) return null

  const detectedProvider = detectProvider(meetingUrl)
  const provider = providerOverride ?? detectedProvider

  const isValidUrl = (() => {
    try {
      const u = new URL(meetingUrl)
      return u.protocol === "https:" || u.protocol === "http:"
    } catch {
      return false
    }
  })()

  // In-house live classes don't need an external meetingUrl (students join
  // via /p/<tenant>/live/<roomCode>) and don't always have a courseId
  // (instant classes are created without one). Relax the gates accordingly
  // — external providers (Zoom/Meet) still need a valid URL.
  const isInHouse = session.provider === "in-house"
  const canSave =
    !!title.trim() &&
    !!scheduledAt &&
    parseInt(duration) > 0 &&
    (isInHouse || (isValidUrl && !!courseId))

  const save = () => {
    if (!canSave) return
    setSaving(true)
    try {
      updateLiveSession(session.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        meetingUrl: isInHouse ? "" : meetingUrl,
        // Preserve in-house provider; otherwise honour the detected/overridden one.
        provider: isInHouse ? "in-house" : provider,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: parseInt(duration) || 60,
        // Don't clobber courseId with an empty string when the user didn't
        // pick one — leave whatever was there.
        ...(courseId ? { courseId } : {}),
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit class</DialogTitle>
          <DialogDescription>
            Changes apply to this instance only. Series siblings are not touched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Course is meaningful for course-bound sessions; instant in-house
              classes don't have one. We show the picker when the workspace
              has courses AND the session isn't an empty-coursed instant class. */}
          {courses.length > 0 && (!isInHouse || courseId) && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-course">Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="edit-course">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Meeting URL + provider picker only matter for external providers.
              In-house rooms render at /p/<tenant>/live/<roomCode> — no URL to set. */}
          {!isInHouse && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="edit-url">Meeting link</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="edit-url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {meetingUrl && !isValidUrl && (
                  <p className="text-xs text-destructive">That doesn&apos;t look like a valid URL.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Provider</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PROVIDER_OPTIONS.map((opt) => {
                    const isAuto = providerOverride === null && detectedProvider === opt.value
                    const isManual = providerOverride === opt.value
                    const active = isAuto || isManual
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setProviderOverride(isManual ? null : opt.value)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                          active
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        <Video className="h-3 w-3" />
                        {opt.label}
                        {isAuto && (
                          <span className="ml-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                            auto
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-when">Date &amp; time</Label>
              <Input
                id="edit-when"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dur">Duration (min)</Label>
              <Input
                id="edit-dur"
                type="number"
                min={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
