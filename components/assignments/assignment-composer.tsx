"use client"

import { useMemo, useRef, useState } from "react"
import {
  Briefcase,
  ClipboardList,
  FileQuestion,
  FileText,
  Link as LinkIcon,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Video,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  generateId,
  useLMS,
  type Assignment,
  type AssignmentKind,
  type AssignmentResource,
  type AssignmentResourceType,
  type Course,
  type Lesson,
  type LiveSession,
  type User,
} from "@/lib/lms-store"
import {
  assignmentPublishedAnnouncement,
  buildNotifications,
} from "@/lib/notifications"
import { uploadAsset } from "@/lib/upload-asset"
import { formatBytes } from "@/lib/lesson-utils"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiAssignmentDescription } from "@/lib/ai-client"
import { toast } from "sonner"

interface AssignmentComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Optional: when an instructor schedules an instant class without picking a
  // course, follow-ups can still be created — they're just not bound to course
  // enrollments. We notify the session's host + any enrolled students if a
  // course exists.
  course?: Course
  lesson?: Lesson
  session?: LiveSession
  /** Called after a successful publish — receives the new assignment. */
  onPublished?: (assignment: Assignment) => void
  /**
   * Optional. When set, picking the "Quiz" tile in the kind picker
   * closes this composer and calls this callback — letting the parent
   * open the QuickQuizDialog. We don't model quizzes as assignments
   * because they have their own QuizQuestion shape + a dedicated
   * builder; this just gives the teacher one entry point for "post
   * something for after this lesson".
   */
  onCreateQuiz?: () => void
}

// Kind picker tiles. "quiz" isn't an AssignmentKind — it's a sentinel
// that means "delegate to the parent's quiz builder". We dispatch on
// it in the click handler instead of stuffing it into the form state.
type KindTile = AssignmentKind | "quiz"
const KIND_OPTIONS: Array<{ value: KindTile; label: string; icon: React.ReactNode }> = [
  { value: "assignment", label: "Assignment", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { value: "project",    label: "Project",    icon: <Briefcase     className="h-3.5 w-3.5" /> },
  { value: "test",       label: "Test",       icon: <FileText      className="h-3.5 w-3.5" /> },
  { value: "quiz",       label: "Quiz",       icon: <FileQuestion  className="h-3.5 w-3.5" /> },
]

export function AssignmentComposer({
  open,
  onOpenChange,
  course,
  lesson,
  session,
  onPublished,
  onCreateQuiz,
}: AssignmentComposerProps) {
  const { enrollments, users, currentUser, addAssignment, addNotifications } = useLMS()

  const [kind, setKind] = useState<AssignmentKind>("assignment")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [maxScore, setMaxScore] = useState("100")
  const [resources, setResources] = useState<AssignmentResource[]>([])
  const [notifyInApp, setNotifyInApp] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true)
  const [publishing, setPublishing] = useState(false)

  const enrolledStudents: User[] = useMemo(() => {
    if (!course) return []
    const ids = enrollments.filter(e => e.courseId === course.id).map(e => e.studentId)
    return users.filter(u => ids.includes(u.id))
  }, [enrollments, users, course])
  const recipientsWithEmail = enrolledStudents.filter(u => !!u.email).length
  const recipientsWithPhone = enrolledStudents.filter(u => !!u.phone).length

  const canSubmit = !!title.trim() && parseInt(maxScore) > 0

  const reset = () => {
    setKind("assignment")
    setTitle("")
    setDescription("")
    setDueAt("")
    setMaxScore("100")
    setResources([])
    setNotifyInApp(true)
    setNotifyEmail(true)
    setNotifyWhatsApp(true)
  }

  const handlePublish = async () => {
    if (!canSubmit) return
    setPublishing(true)
    const assignment: Assignment = {
      id: generateId("assign"),
      title: title.trim(),
      description: description.trim(),
      // Course is optional — instant classes don't have one. Leaving courseId
      // empty signals "not tied to a course"; the public assignment page still
      // renders fine via shareToken.
      courseId: course?.id ?? "",
      lessonId: lesson?.id,
      sessionId: session?.id,
      kind,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      maxScore: parseInt(maxScore) || 100,
      resources: resources.length > 0 ? resources : undefined,
      // Token in the URL is short + non-guessable enough for casual sharing
      // without exposing the internal assignment id.
      shareToken: `${generateId("a").replace("a-", "")}`.slice(0, 16),
      createdAt: new Date().toISOString(),
    }
    addAssignment(assignment)

    const channels: ("in-app" | "email" | "whatsapp")[] = []
    if (notifyInApp) channels.push("in-app")
    if (notifyEmail) channels.push("email")
    if (notifyWhatsApp) channels.push("whatsapp")

    if (channels.length > 0) {
      const payload = assignmentPublishedAnnouncement({
        assignmentTitle: assignment.title,
        courseTitle: course?.title ?? (session?.title ? `Live class · ${session.title}` : "Live class"),
        kind: assignment.kind,
        dueAt: assignment.dueAt,
        assignmentId: assignment.id,
      })
      // Deep-link to the public assignment page so the recipient can open
      // the follow-up immediately from email / WhatsApp / the bell.
      payload.url = `/assignment/${assignment.shareToken ?? assignment.id}`
      addNotifications(buildNotifications(enrolledStudents, payload, { channels }))
    }

    setPublishing(false)
    onPublished?.(assignment)
    reset()
    onOpenChange(false)
    void currentUser  // intentionally consume for lint
  }

  const contextLabel = lesson
    ? `Follow-up to lesson: ${lesson.title}`
    : session
      ? `Follow-up to live class: ${session.title}`
      : course
        ? `Course-wide follow-up · ${course.title}`
        : "Follow-up"

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Post follow-up
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{contextLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Kind picker. Quiz is a passthrough — picking it closes
              this composer and lets the parent open the dedicated
              quiz builder, so teachers have one entry point for any
              kind of follow-up. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KIND_OPTIONS.map((opt) => {
              const active = opt.value !== "quiz" && kind === opt.value
              const isQuiz = opt.value === "quiz"
              const disabled = isQuiz && !onCreateQuiz
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (opt.value === "quiz") {
                      if (onCreateQuiz) {
                        onCreateQuiz()
                        onOpenChange(false)
                      }
                      return
                    }
                    setKind(opt.value)
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                      : isQuiz
                      ? "border-dashed border-accent/40 text-accent hover:bg-accent/5"
                      : "border-border text-muted-foreground hover:bg-muted/40",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                  title={isQuiz ? "Opens the quiz builder" : undefined}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Title + due + score */}
          <div className="space-y-2">
            <Label htmlFor="ac-title">Title *</Label>
            <Input
              id="ac-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                lesson ? `Practice from "${lesson.title}"` :
                session ? `Recap exercise from ${session.title}` :
                "e.g., Hooks deep-dive — build a custom hook"
              }
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="ac-desc">Instructions / notes</Label>
              <AIGenerateButton
                size="xs"
                label="Draft with AI"
                disabled={!title.trim()}
                onGenerate={async () => {
                  const r = await aiAssignmentDescription({
                    title,
                    courseTitle: lesson?.title || session?.title,
                  })
                  if ("error" in r) {
                    toast.error(`Couldn't draft: ${r.error}`)
                    return
                  }
                  setDescription(r.content)
                  toast.success("Drafted — edit as needed.")
                }}
              />
            </div>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="What students need to do, deliverables, links, rubric…"
              minHeight={160}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ac-due">Due date &amp; time</Label>
              <Input
                id="ac-due"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-max">Max score</Label>
              <Input
                id="ac-max"
                type="number"
                min={1}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
          </div>

          {/* Resources editor */}
          <ResourcesEditor resources={resources} onChange={setResources} />

          {/* Distribution — collapsed by default. The 3 toggle rows
              ship enabled; clicking "Customize channels" reveals them
              so a teacher can mute (say) WhatsApp for a quiet release.
              Saves ~120px of vertical space + 3 toggle decisions for
              the 90% case. */}
          <ChannelsSection
            enrolled={enrolledStudents.length}
            withEmail={recipientsWithEmail}
            withPhone={recipientsWithPhone}
            notifyInApp={notifyInApp}
            setNotifyInApp={setNotifyInApp}
            notifyEmail={notifyEmail}
            setNotifyEmail={setNotifyEmail}
            notifyWhatsApp={notifyWhatsApp}
            setNotifyWhatsApp={setNotifyWhatsApp}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={!canSubmit || publishing}>
            {publishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish &amp; share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===================== Resources editor =====================

function ResourcesEditor({
  resources,
  onChange,
}: {
  resources: AssignmentResource[]
  onChange: (next: AssignmentResource[]) => void
}) {
  const [linkLabel, setLinkLabel] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [noteText, setNoteText] = useState("")
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useFileInputRef()

  const remove = (id: string) => onChange(resources.filter((r) => r.id !== id))
  const update = (id: string, patch: Partial<AssignmentResource>) =>
    onChange(resources.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const append = (r: Omit<AssignmentResource, "id">) =>
    onChange([...resources, { ...r, id: generateId("res") }])

  const addLink = () => {
    const url = linkUrl.trim()
    if (!url) return
    append({ type: "link", label: linkLabel.trim() || url, url })
    setLinkLabel("")
    setLinkUrl("")
  }
  const addVideo = () => {
    const url = videoUrl.trim()
    if (!url) return
    append({ type: "video", label: "Video", url })
    setVideoUrl("")
  }
  const addNote = () => {
    const text = noteText.trim()
    if (!text) return
    append({ type: "note", label: "Note", note: text })
    setNoteText("")
  }
  const addFile = async (file: File | undefined) => {
    if (!file) return
    setUploadingFile(true)
    try {
      const result = await uploadAsset(file, "assignments")
      append({
        type: "file",
        label: file.name,
        url: result.url,
        sizeBytes: file.size,
      })
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="rounded-md border border-border/60 p-3 space-y-3">
      <div>
        <p className="text-sm font-medium">Resources for students</p>
        <p className="text-xs text-muted-foreground">
          Attach files, paste links, embed videos, or leave a note. Mix and match.
        </p>
      </div>

      {/* Existing resources */}
      {resources.length > 0 && (
        <ul className="space-y-1.5">
          {resources.map((r) => (
            <li key={r.id} className="flex items-start gap-2 rounded-md border border-border/60 px-2 py-1.5">
              <span className="mt-0.5 text-muted-foreground">
                {iconFor(r.type)}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <Input
                  value={r.label}
                  onChange={(e) => update(r.id, { label: e.target.value })}
                  className="h-7 text-xs"
                />
                {r.type === "note" ? (
                  <Textarea
                    value={r.note ?? ""}
                    onChange={(e) => update(r.id, { note: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                ) : (
                  <p className="truncate text-[11px] text-muted-foreground" title={r.url}>
                    {r.url}
                    {r.sizeBytes ? ` · ${formatBytes(r.sizeBytes)}` : ""}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="capitalize">{r.type}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(r.id)}
                className="h-7 w-7 text-destructive hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Add controls */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* File upload */}
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">File</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
          >
            {uploadingFile ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="mr-2 h-3.5 w-3.5" />
            )}
            {uploadingFile ? "Uploading…" : "Upload PDF, DOCX, image…"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,image/*,audio/*,video/*"
            onChange={(e) => void addFile(e.target.files?.[0])}
          />
        </div>

        {/* Video URL */}
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Video</Label>
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Video className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addVideo()}
                placeholder="YouTube, Vimeo, Loom…"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={addVideo} disabled={!videoUrl.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Link */}
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Link</Label>
          <div className="flex gap-1">
            <Input
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="Label (optional)"
              className="h-8 max-w-[180px] text-xs"
            />
            <div className="relative flex-1">
              <LinkIcon className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
                placeholder="https://… (Drive, GitHub, article…)"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={addLink} disabled={!linkUrl.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Note</Label>
          <div className="flex gap-1">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              placeholder="A short instruction — e.g. 'Read pages 12-30 first'"
              className="flex-1 text-xs"
            />
            <Button type="button" size="sm" variant="ghost" onClick={addNote} disabled={!noteText.trim()} className="self-start">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function iconFor(t: AssignmentResourceType) {
  if (t === "file")  return <Paperclip className="h-3.5 w-3.5" />
  if (t === "video") return <Video     className="h-3.5 w-3.5" />
  if (t === "link")  return <LinkIcon  className="h-3.5 w-3.5" />
  return <FileText className="h-3.5 w-3.5" />
}

function ChannelsSection({
  enrolled,
  withEmail,
  withPhone,
  notifyInApp,
  setNotifyInApp,
  notifyEmail,
  setNotifyEmail,
  notifyWhatsApp,
  setNotifyWhatsApp,
}: {
  enrolled: number
  withEmail: number
  withPhone: number
  notifyInApp: boolean
  setNotifyInApp: (v: boolean) => void
  notifyEmail: boolean
  setNotifyEmail: (v: boolean) => void
  notifyWhatsApp: boolean
  setNotifyWhatsApp: (v: boolean) => void
}) {
  // Default-collapsed. The summary line tells the user what's about
  // to happen ("X students via In-app, Email, WhatsApp"); the toggles
  // only appear if they expand.
  const [expanded, setExpanded] = useState(false)

  // Short summary of the channels that are currently ENABLED so the
  // collapsed state is honest about what will fire on publish.
  const activeLabels: string[] = []
  if (notifyInApp) activeLabels.push("In-app")
  if (notifyEmail) activeLabels.push("Email")
  if (notifyWhatsApp) activeLabels.push("WhatsApp")
  const channelsSummary = activeLabels.length
    ? activeLabels.join(" · ")
    : "Silent — no channel selected"

  return (
    <div className="rounded-md border border-border/60 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Notify {enrolled} student{enrolled === 1 ? "" : "s"}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{channelsSummary}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Hide channels" : "Customize"}
        </button>
      </div>
      {expanded && (
        <div className="space-y-2 pt-1">
          <ChannelRow
            icon={<ClipboardList className="h-4 w-4 text-primary" />}
            label="In-app notification"
            count={enrolled}
            checked={notifyInApp}
            onChange={setNotifyInApp}
          />
          <ChannelRow
            icon={<Mail className="h-4 w-4 text-primary" />}
            label="Email"
            count={withEmail}
            checked={notifyEmail}
            onChange={setNotifyEmail}
          />
          <ChannelRow
            icon={<MessageSquare className="h-4 w-4 text-primary" />}
            label="WhatsApp"
            count={withPhone}
            checked={notifyWhatsApp}
            onChange={setNotifyWhatsApp}
          />
        </div>
      )}
    </div>
  )
}

function ChannelRow({
  icon,
  label,
  count,
  checked,
  onChange,
  hint,
}: {
  icon: React.ReactNode
  label: string
  count: number
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {count} recipient{count === 1 ? "" : "s"}
            {hint && <> · {hint}</>}
          </p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function useFileInputRef() {
  return useRef<HTMLInputElement>(null)
}
