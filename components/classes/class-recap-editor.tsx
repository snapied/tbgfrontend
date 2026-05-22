"use client"

import { useEffect, useRef, useState } from "react"
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  NotebookPen,
  Paperclip,
  Plus,
  StickyNote,
  Video,
  Webhook,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { SavedIndicator, type SaveStatus } from "@/components/dashboard/saved-indicator"
import Link from "next/link"
import {
  generateId,
  useLMS,
  type LiveSession,
  type SessionMaterial,
  type SessionMaterialType,
} from "@/lib/lms-store"
import {
  detectEmbedProvider,
  detectVideoProvider,
  embedUrl,
  providerLabel,
  videoEmbedUrl,
} from "@/lib/lesson-utils"
import { uploadAsset } from "@/lib/upload-asset"

interface ClassRecapEditorProps {
  session: LiveSession
}

/**
 * The teacher's post-class panel. Shown on the live session detail. Lets
 * the teacher mark the class as held (or not), drop a written summary of
 * what was covered, paste a recording URL, and attach any number of
 * materials: files, links, embeds (Canva / Gamma / Slides / Notion /
 * Figma / Miro / Loom), images, plain notes.
 *
 * Autosaves to the LiveSession record. No "save" button needed for the
 * materials list — each change persists immediately so the teacher can
 * keep adding things during/right after the class without losing work.
 * Summary + recording URL save on blur.
 */
export function ClassRecapEditor({ session }: ClassRecapEditorProps) {
  const { updateLiveSession } = useLMS()

  const [wasHeld, setWasHeld] = useState<boolean>(session.wasHeld ?? false)
  const [summary, setSummary] = useState(session.summary ?? "")
  const [recordingUrl, setRecordingUrl] = useState(session.recordingUrl ?? "")
  const [materials, setMaterials] = useState<SessionMaterial[]>(session.materials ?? [])
  // Autosave indicator state. Every store write below funnels through
  // `markSaving` → `markSaved` so the indicator reflects the actual
  // persistence path the user just triggered.
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const markSaving = () => setSaveStatus("saving")
  const markSaved = () => {
    setSaveStatus("saved")
    setLastSavedAt(new Date().toISOString())
    // updateLiveSession is synchronous on the store side; the brief
    // "Saving…" state collapses to "Saved" on the next tick. Reset
    // the pulse so future edits trigger it again.
    setTimeout(() => setSaveStatus("idle"), 1500)
  }

  // Sync down if the session is refreshed externally.
  useEffect(() => {
    setWasHeld(session.wasHeld ?? false)
    setSummary(session.summary ?? "")
    setRecordingUrl(session.recordingUrl ?? "")
    setMaterials(session.materials ?? [])
  }, [session.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // Materials autosave — every change.
  useEffect(() => {
    if (materials === (session.materials ?? [])) return
    markSaving()
    updateLiveSession(session.id, { materials })
    markSaved()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials])

  const toggleHeld = (next: boolean) => {
    setWasHeld(next)
    markSaving()
    updateLiveSession(session.id, { wasHeld: next })
    markSaved()
  }

  const saveSummary = () => {
    if (summary === (session.summary ?? "")) return
    markSaving()
    updateLiveSession(session.id, { summary: summary || undefined })
    markSaved()
  }
  const saveRecording = () => {
    if (recordingUrl === (session.recordingUrl ?? "")) return
    markSaving()
    updateLiveSession(session.id, { recordingUrl: recordingUrl || undefined })
    markSaved()
  }

  return (
    <div className="space-y-4">
      {/* Autosave indicator — sits at the top of the recap editor so
          the teacher can see saves landing as they edit. Every field
          below funnels its store-write through markSaving / markSaved. */}
      <div className="flex justify-end">
        <SavedIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
      </div>
      {/* Held toggle + summary */}
      <div className="rounded-md border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Did this class happen?</p>
            <p className="text-xs text-muted-foreground">
              Marks the class as held so it shows up in attendance + completed-class history.
            </p>
          </div>
          <Switch checked={wasHeld} onCheckedChange={toggleHeld} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">What we covered today</Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onBlur={saveSummary}
            rows={4}
            placeholder="A short recap students will see in the calendar and on their lesson page."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Recording link</Label>
          <div className="flex gap-2">
            <Input
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              onBlur={saveRecording}
              placeholder="YouTube / Vimeo / Loom / Zoom cloud share / MP4"
              className="font-mono"
            />
            {recordingUrl && (
              <Button variant="ghost" size="icon" asChild title="Open">
                <a href={recordingUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          {recordingUrl && (
            <RecordingPreview url={recordingUrl} />
          )}
        </div>
      </div>

      {/* Materials */}
      <MaterialsComposer
        materials={materials}
        onChange={setMaterials}
        courseId={session.courseId}
      />
    </div>
  )
}

// ============================================================
// Materials composer — paste link / upload / note / embed
// ============================================================

function MaterialsComposer({
  materials,
  onChange,
  courseId,
}: {
  materials: SessionMaterial[]
  onChange: (m: SessionMaterial[]) => void
  courseId: string
}) {
  const { quizzes } = useLMS()
  const courseQuizzes = quizzes.filter((q) => q.courseId === courseId)
  const otherQuizzes = quizzes.filter((q) => q.courseId !== courseId)

  const [linkLabel, setLinkLabel] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [embedLabel, setEmbedLabel] = useState("")
  const [embedUrlInput, setEmbedUrlInput] = useState("")
  const [noteText, setNoteText] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  // Quiz attach
  const [pickedQuizId, setPickedQuizId] = useState("")

  const remove = (id: string) => onChange(materials.filter(m => m.id !== id))
  const append = (m: Omit<SessionMaterial, "id">) =>
    onChange([...materials, { ...m, id: generateId("mat") }])
  const update = (id: string, patch: Partial<SessionMaterial>) =>
    onChange(materials.map(m => m.id === id ? { ...m, ...patch } : m))

  const addLink = () => {
    const url = linkUrl.trim()
    if (!url) return
    append({ type: "link", label: linkLabel.trim() || url, url })
    setLinkLabel(""); setLinkUrl("")
  }
  const addEmbed = () => {
    const url = embedUrlInput.trim()
    if (!url) return
    const provider = providerLabel(detectEmbedProvider(url))
    append({ type: "embed", label: embedLabel.trim() || provider, url, provider })
    setEmbedLabel(""); setEmbedUrlInput("")
  }
  const addNote = () => {
    const note = noteText.trim()
    if (!note) return
    append({ type: "note", label: "Note", note })
    setNoteText("")
  }
  const addFileOrImage = async (file: File | undefined, asImage: boolean) => {
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadAsset(file)
      append({
        type: asImage ? "image" : "file",
        label: file.name,
        url: result.url,
        sizeBytes: file.size,
      })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
      if (imageRef.current) imageRef.current.value = ""
    }
  }

  const addQuiz = () => {
    if (!pickedQuizId) return
    const quiz = quizzes.find((q) => q.id === pickedQuizId)
    if (!quiz) return
    append({
      type: "quiz",
      label: quiz.title,
      quizId: quiz.id,
      url: `/quiz/${quiz.id}`,
    })
    setPickedQuizId("")
  }

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold">Class materials</p>
        <p className="text-xs text-muted-foreground">
          Slides, PDFs, embedded Canva / Gamma / Slides / Notion / Figma / Miro, images, links, plain notes — anything students should see after the class.
        </p>
      </div>

      {/* Existing materials */}
      {materials.length > 0 && (
        <ul className="space-y-1.5">
          {materials.map(m => (
            <li key={m.id} className="rounded-md border border-border/60 bg-background p-2">
              <div className="flex items-start gap-2">
                <span className="mt-1 text-muted-foreground">{iconFor(m.type)}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <Input
                    value={m.label}
                    onChange={(e) => update(m.id, { label: e.target.value })}
                    className="h-7 text-xs"
                  />
                  {m.type === "note" ? (
                    <Textarea
                      value={m.note ?? ""}
                      onChange={(e) => update(m.id, { note: e.target.value })}
                      rows={2}
                      className="text-xs"
                    />
                  ) : m.type === "quiz" ? (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Quiz · students take it via the recap card
                    </p>
                  ) : m.type === "homework" || m.type === "assignment" ? (
                    <div className="space-y-1">
                      {m.url && (
                        <p className="truncate font-mono text-[11px] text-muted-foreground" title={m.url}>
                          {m.url}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Due</Label>
                        <Input
                          type="date"
                          value={m.dueAt ? m.dueAt.slice(0, 10) : ""}
                          onChange={(e) => update(m.id, {
                            dueAt: e.target.value
                              ? new Date(e.target.value + "T23:59:59").toISOString()
                              : undefined,
                          })}
                          className="h-7 w-40 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="truncate font-mono text-[11px] text-muted-foreground" title={m.url}>
                      {m.url}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="capitalize">
                  {m.type === "embed" && m.provider ? m.provider : m.type}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => remove(m.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add controls */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* File */}
        <AddCard
          title="Upload a file"
          hint="PDF, slides, audio, video, ZIP…"
          icon={<Paperclip className="h-4 w-4" />}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Choose file"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,audio/*,video/*"
            onChange={(e) => void addFileOrImage(e.target.files?.[0], false)}
          />
        </AddCard>

        {/* Image */}
        <AddCard
          title="Upload an image"
          hint="Whiteboard photo, diagram, screenshot…"
          icon={<ImageIcon className="h-4 w-4" />}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => imageRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Choose image"}
          </Button>
          <input
            ref={imageRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => void addFileOrImage(e.target.files?.[0], true)}
          />
        </AddCard>

        {/* Link */}
        <AddCard
          title="Paste a link"
          hint="Reference, article, repo…"
          icon={<LinkIcon className="h-4 w-4" />}
        >
          <Input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Label (optional)"
            className="h-8 text-xs"
          />
          <div className="flex gap-1">
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
              placeholder="https://…"
              className="h-8 flex-1 font-mono text-xs"
            />
            <Button size="sm" variant="outline" onClick={addLink} disabled={!linkUrl.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </AddCard>

        {/* Embed */}
        <AddCard
          title="Embed Canva / Gamma / Slides / Notion / Figma / Miro / Loom"
          hint="Renders inline on the class page."
          icon={<Webhook className="h-4 w-4" />}
        >
          <Input
            value={embedLabel}
            onChange={(e) => setEmbedLabel(e.target.value)}
            placeholder="Label (optional)"
            className="h-8 text-xs"
          />
          <div className="flex gap-1">
            <Input
              value={embedUrlInput}
              onChange={(e) => setEmbedUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmbed()}
              placeholder="https://canva.com/design/…  or  https://gamma.app/…"
              className="h-8 flex-1 font-mono text-xs"
            />
            <Button size="sm" variant="outline" onClick={addEmbed} disabled={!embedUrlInput.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </AddCard>

        {/* Note */}
        <AddCard
          title="Drop a note"
          hint="A bullet of context students should remember."
          icon={<StickyNote className="h-4 w-4" />}
          full
        >
          <div className="flex gap-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              placeholder="e.g. 'Don't forget — homework due Friday.'"
              className="flex-1 text-xs"
            />
            <Button size="sm" variant="outline" onClick={addNote} disabled={!noteText.trim()} className="self-start">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </AddCard>

        {/* Quiz */}
        <AddCard
          title="Attach a quiz"
          hint="Pick from quizzes you've already authored. Students take it from this class."
          icon={<ClipboardCheck className="h-4 w-4" />}
        >
          {quizzes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No quizzes yet.{" "}
              <Link href="/dashboard/quizzes/new" className="text-primary hover:underline">
                Create one
              </Link>{" "}
              and come back.
            </p>
          ) : (
            <div className="flex gap-1">
              <Select value={pickedQuizId} onValueChange={setPickedQuizId}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Choose a quiz…" />
                </SelectTrigger>
                <SelectContent>
                  {courseQuizzes.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        This course
                      </div>
                      {courseQuizzes.map((q) => (
                        <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                      ))}
                    </>
                  )}
                  {otherQuizzes.length > 0 && (
                    <>
                      <div className="mt-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Other courses
                      </div>
                      {otherQuizzes.map((q) => (
                        <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={addQuiz} disabled={!pickedQuizId}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </AddCard>

      </div>

      <p className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
        Need to assign work? Use <strong className="font-medium text-foreground">Post follow-up</strong> at the top of the page — it handles assignments, projects, tests, and quizzes in one place and notifies students.
      </p>
    </div>
  )
}

function AddCard({
  title, hint, icon, children, full,
}: {
  title: string
  hint: string
  icon: React.ReactNode
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={cn("rounded-md border border-border/60 p-3 space-y-2", full && "sm:col-span-2")}>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-primary">{icon}</span>
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      {children}
    </div>
  )
}

function RecordingPreview({ url }: { url: string }) {
  const provider = detectVideoProvider(url)
  const embed = videoEmbedUrl(url)
  if (provider === "file") {
    return (
      <video src={url} controls className="aspect-video w-full rounded-md bg-black" />
    )
  }
  if (embed) {
    return (
      <iframe
        src={embed}
        title="Recording"
        className="aspect-video w-full rounded-md border border-border/60"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    )
  }
  return (
    <p className="text-[11px] text-muted-foreground">
      Can&apos;t inline-preview this URL. Students will see an &quot;Open recording&quot; link.
    </p>
  )
}

function iconFor(t: SessionMaterialType) {
  if (t === "file")       return <Paperclip      className="h-3.5 w-3.5" />
  if (t === "image")      return <ImageIcon      className="h-3.5 w-3.5" />
  if (t === "video")      return <Film           className="h-3.5 w-3.5" />
  if (t === "link")       return <LinkIcon       className="h-3.5 w-3.5" />
  if (t === "embed")      return <Webhook        className="h-3.5 w-3.5" />
  if (t === "quiz")       return <ClipboardCheck className="h-3.5 w-3.5" />
  if (t === "homework" || t === "assignment") return <NotebookPen className="h-3.5 w-3.5" />
  return <StickyNote className="h-3.5 w-3.5" />
}

// ============================================================
// Public viewer — used on the session detail page (read-only),
// the student learn page, and the calendar's right rail.
// ============================================================

export function ClassRecapView({ session }: { session: LiveSession }) {
  const hasAnything = !!(session.summary || session.recordingUrl || (session.materials && session.materials.length > 0))
  if (!hasAnything) return null

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {session.wasHeld && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
          <CheckCircle2 className="h-3 w-3" />
          Class held · {new Date(session.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </div>
      )}

      {session.summary && (
        <div className="rounded-md border border-border/60 bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What we covered</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{session.summary}</p>
        </div>
      )}

      {session.recordingUrl && (
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-md border border-border/60">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Film className="h-3.5 w-3.5 text-primary" />
              Recording
            </span>
            <a
              href={session.recordingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> Open
            </a>
          </div>
          <RecordingViewer url={session.recordingUrl} />
        </div>
      )}

      {(session.materials?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Materials</p>
          {session.materials!.map(m => <MaterialViewer key={m.id} material={m} />)}
        </div>
      )}
    </div>
  )
}

function RecordingViewer({ url }: { url: string }) {
  const provider = detectVideoProvider(url)
  const embed = videoEmbedUrl(url)
  if (provider === "file") {
    return <video src={url} controls className="aspect-video w-full bg-black" />
  }
  if (embed) {
    return (
      <iframe
        src={embed}
        title="Recording"
        className="aspect-video w-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block px-4 py-6 text-center text-sm text-primary hover:underline"
    >
      Open recording <ExternalLink className="ml-1 inline h-3 w-3" />
    </a>
  )
}

function MaterialViewer({ material }: { material: SessionMaterial }) {
  if (material.type === "quiz" && material.quizId) {
    return (
      <Link
        href={`/quiz/${material.quizId}`}
        className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <ClipboardCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{material.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">Take this quiz</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
          <BookOpen className="h-3 w-3" /> Take quiz
        </span>
      </Link>
    )
  }
  if (material.type === "homework" || material.type === "assignment") {
    const overdue = material.dueAt ? new Date(material.dueAt).getTime() < Date.now() : false
    const Icon = material.type === "homework" ? NotebookPen : ClipboardCheck
    return (
      <div className="rounded-md border border-border/60 bg-card p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-medium">{material.label}</span>
              <Badge variant="secondary" className="text-[10px] capitalize">{material.type}</Badge>
              {material.dueAt && (
                <Badge
                  variant={overdue ? "destructive" : "outline"}
                  className="text-[10px]"
                >
                  Due {new Date(material.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </Badge>
              )}
            </div>
            {material.url && (
              <a
                href={material.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 truncate text-[11px] text-primary hover:underline"
                title={material.url}
              >
                <ExternalLink className="h-3 w-3" /> Open brief
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }
  if (material.type === "note") {
    return (
      <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{material.label}</p>
        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{material.note}</p>
      </div>
    )
  }
  if (material.type === "embed" && material.url) {
    return (
      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-md border border-border/60">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Webhook className="h-3.5 w-3.5 text-primary" />
            {material.label}
            {material.provider && <Badge variant="secondary" className="ml-1">{material.provider}</Badge>}
          </span>
          <a
            href={material.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> Open
          </a>
        </div>
        <iframe
          src={embedUrl(material.url)}
          title={material.label}
          className="aspect-video w-full bg-background"
          allow="autoplay; fullscreen; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  if (material.type === "image" && material.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={material.url}
        alt={material.label}
        className="block h-auto max-w-full rounded-md border border-border/60"
      />
    )
  }
  // file / video / link
  const Icon = material.type === "file" ? FileText : material.type === "video" ? Video : LinkIcon
  return (
    <a
      href={material.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-md border border-border/60 bg-card p-3 hover:bg-muted/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{material.label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{material.url}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
    </a>
  )
}

