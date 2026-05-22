"use client"

// Inline scheduler for a one-off live session. Opens from a `live` lesson
// so a teacher can create the session record without bouncing to the Live
// Classes dashboard. Once saved we hand the new session id back to the
// caller so it slots straight into the lesson.
//
// The dialog needs a courseId — sessions are scoped per course. The
// caller is responsible for only mounting this when one is available.

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLMS, generateId, type LiveSession, type LiveProvider } from "@/lib/lms-store"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  // Pre-fills the session title — usually the lesson's title.
  defaultTitle?: string
  onCreated: (sessionId: string) => void
}

// Returns "YYYY-MM-DDTHH:MM" for the local time exactly `hoursAhead` from
// now, suitable for a <input type="datetime-local"> default. Uses local
// time on purpose so the placeholder feels right to the teacher.
function defaultWhen(hoursAhead = 24): string {
  const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const PROVIDERS: { value: LiveProvider; label: string; urlHint: string }[] = [
  { value: "google-meet", label: "Google Meet", urlHint: "https://meet.google.com/abc-defg-hij" },
  { value: "zoom",        label: "Zoom",        urlHint: "https://zoom.us/j/1234567890" },
  { value: "ms-teams",    label: "Microsoft Teams", urlHint: "https://teams.microsoft.com/l/meetup-join/..." },
  { value: "other",       label: "Other",       urlHint: "https://your-meeting-link" },
]

export function QuickLiveSessionDialog({
  open,
  onOpenChange,
  courseId,
  defaultTitle,
  onCreated,
}: Props) {
  const { addLiveSession, currentUser } = useLMS()
  const [title, setTitle] = useState(defaultTitle ?? "Live session")
  const [scheduledAt, setScheduledAt] = useState(defaultWhen(24))
  const [duration, setDuration] = useState(60)
  const [provider, setProvider] = useState<LiveProvider>("google-meet")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle(defaultTitle ?? "Live session")
    setScheduledAt(defaultWhen(24))
    setDuration(60)
    setProvider("google-meet")
    setMeetingUrl("")
    setSaving(false)
  }

  const ready =
    title.trim().length > 0 &&
    scheduledAt.length > 0 &&
    duration > 0 &&
    meetingUrl.trim().length > 0

  const providerHint = PROVIDERS.find((p) => p.value === provider)?.urlHint ?? ""

  const save = () => {
    if (!ready) return
    setSaving(true)
    const id = generateId("sess")
    const session: LiveSession = {
      id,
      courseId,
      title: title.trim(),
      provider,
      meetingUrl: meetingUrl.trim(),
      // datetime-local is in the user's local time; toISOString normalises
      // it to UTC for storage.
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes: duration,
      hostId: currentUser?.id ?? "unknown",
      status: "scheduled",
      createdAt: new Date().toISOString(),
    }
    addLiveSession(session)
    onCreated(id)
    setSaving(false)
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a live session</DialogTitle>
          <DialogDescription>
            Drops straight onto this lesson and into the Live Classes dashboard. You can edit it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qls-title">Title</Label>
            <Input
              id="qls-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the session about?"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label htmlFor="qls-when">When</Label>
              <Input
                id="qls-when"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qls-duration">Duration (min)</Label>
              <Input
                id="qls-duration"
                type="number"
                min={5}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qls-provider">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as LiveProvider)}>
              <SelectTrigger id="qls-provider"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qls-url">Meeting URL</Label>
            <Input
              id="qls-url"
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder={providerHint}
            />
            <p className="text-[11px] text-muted-foreground">
              Generate this in your meeting tool, then paste it here. Students see it on the lesson page when the session starts.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!ready || saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            Schedule session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
