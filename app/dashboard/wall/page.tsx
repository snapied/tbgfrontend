"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ExternalLink,
  Eye,
  Heart,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Pin,
  Plus,
  Quote as QuoteIcon,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Video,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"
import { useWall, type WallEntry, type WallKind } from "@/lib/wall-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-store"
import { uploadAsset } from "@/lib/upload-asset"
import { detectVideoProvider, videoEmbedUrl } from "@/lib/lesson-utils"

const VIBE_OPTIONS: Array<{ value: NonNullable<WallEntry["vibe"]>; label: string; icon: React.ReactNode; cls: string }> = [
  { value: "love",       label: "Love",        icon: <Heart className="h-3 w-3" />,    cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  { value: "win",        label: "Win",         icon: <Trophy className="h-3 w-3" />,   cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { value: "creative",   label: "Creative",    icon: <Sparkles className="h-3 w-3" />, cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  { value: "milestone",  label: "Milestone",   icon: <Pin className="h-3 w-3" />,      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
]

export default function WallOfLovePage() {
  const { entries, addEntry, deleteEntry, toggleFeatured } = useWall()
  const confirm = useConfirm()
  const { users, courses, currentUser } = useLMS()
  const { currentTenant } = useTenant()
  const [search, setSearch] = useState("")
  const [vibeFilter, setVibeFilter] = useState<"all" | NonNullable<WallEntry["vibe"]>>("all")
  const [composerOpen, setComposerOpen] = useState(false)

  const sorted = useMemo(() => {
    return [...entries]
      .sort((a, b) => {
        if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1
        return b.createdAt.localeCompare(a.createdAt)
      })
      .filter((e) => {
        if (vibeFilter !== "all" && e.vibe !== vibeFilter) return false
        if (!search) return true
        const q = search.toLowerCase()
        return (
          e.caption.toLowerCase().includes(q) ||
          (e.studentName?.toLowerCase().includes(q) ?? false)
        )
      })
  }, [entries, vibeFilter, search])

  const publicUrl = currentTenant ? `/wall?tenant=${currentTenant.slug}` : "/wall"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wall of Love</h1>
          <p className="text-muted-foreground">
            Celebrate student wins, artwork, drawings, videos, and shoutouts. Visible publicly so prospects can feel the vibe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={publicUrl} target="_blank">
              <Eye className="mr-2 h-4 w-4" /> View public wall
            </Link>
          </Button>
          <Button onClick={() => setComposerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add to wall
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search captions or students…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={vibeFilter} onValueChange={(v) => setVibeFilter(v as typeof vibeFilter)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vibes</SelectItem>
                {VIBE_OPTIONS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <Heart className="mx-auto h-10 w-10 text-rose-400" />
            <h3 className="mt-3 font-semibold">Nothing on the wall yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Drop a screenshot, photo, drawing, or quote from a student — every entry helps build social proof.
            </p>
            <Button onClick={() => setComposerOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" /> Add the first one
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {sorted.map((entry) => (
            <WallCard
              key={entry.id}
              entry={entry}
              courseTitle={courses.find((c) => c.id === entry.courseId)?.title}
              onToggleFeatured={() => toggleFeatured(entry.id)}
              onDelete={async () => {
                const ok = await confirm({
                  title: "Remove this from the wall?",
                  destructive: true,
                  confirmLabel: "Remove",
                })
                if (!ok) return
                deleteEntry(entry.id)
                toast.success("Removed from the wall.")
              }}
            />
          ))}
        </div>
      )}

      <ComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onAdd={(entry) => addEntry({
          ...entry,
          id: `wall-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          addedBy: currentUser?.id ?? "unknown",
          createdAt: new Date().toISOString(),
        })}
        students={users.filter((u) => u.role === "student")}
        courses={courses}
      />
    </div>
  )
}

function WallCard({
  entry, courseTitle, onToggleFeatured, onDelete,
}: {
  entry: WallEntry
  courseTitle?: string
  onToggleFeatured: () => void
  onDelete: () => void
}) {
  const vibe = VIBE_OPTIONS.find((v) => v.value === entry.vibe)
  return (
    <div
      className={cn(
        "mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-card shadow-sm",
        entry.featured ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
      )}
    >
      <WallMedia entry={entry} />
      <div className="space-y-2 p-3">
        <div className="flex items-start gap-2">
          {entry.kind === "quote" ? (
            <QuoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          ) : null}
          <p className={cn("flex-1 text-sm leading-relaxed", entry.kind === "quote" && "italic")}>
            {entry.caption}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {vibe && (
            <Badge variant="outline" className={cn("gap-1 border-0", vibe.cls)}>
              {vibe.icon}
              {vibe.label}
            </Badge>
          )}
          {entry.studentName && (
            <Badge variant="secondary" className="text-[10px]">— {entry.studentName}</Badge>
          )}
          {courseTitle && (
            <Badge variant="secondary" className="text-[10px]">{courseTitle}</Badge>
          )}
          {entry.featured && (
            <Badge className="gap-1 bg-primary text-primary-foreground text-[10px]">
              <Pin className="h-2.5 w-2.5" /> Featured
            </Badge>
          )}
          <span className="ml-auto inline-flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onToggleFeatured}
              title={entry.featured ? "Unfeature" : "Feature"}
            >
              <Pin className={cn("h-3.5 w-3.5", entry.featured && "fill-current text-primary")} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </span>
        </div>
      </div>
    </div>
  )
}

function WallMedia({ entry }: { entry: WallEntry }) {
  if (entry.kind === "image" && entry.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.url}
        alt={entry.caption}
        className="block h-auto w-full max-w-full"
        loading="lazy"
      />
    )
  }
  if (entry.kind === "video" && entry.url) {
    const provider = detectVideoProvider(entry.url)
    const embed = videoEmbedUrl(entry.url)
    if (provider === "file") {
      return <video src={entry.url} controls className="block aspect-video w-full bg-black" />
    }
    if (embed) {
      return (
        <iframe
          src={embed}
          title={entry.caption}
          className="block aspect-video w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      )
    }
    return null
  }
  if (entry.kind === "link" && entry.url) {
    return (
      <a
        href={entry.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <LinkIcon className="h-3.5 w-3.5" />
        <span className="truncate">{entry.url}</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    )
  }
  return null
}

// ============================================================
// Composer dialog
// ============================================================

function ComposerDialog({
  open,
  onOpenChange,
  onAdd,
  students,
  courses,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (entry: Omit<WallEntry, "id" | "addedBy" | "createdAt">) => void
  students: ReturnType<typeof useLMS>["users"]
  courses: ReturnType<typeof useLMS>["courses"]
}) {
  const [kind, setKind] = useState<WallKind>("image")
  const [url, setUrl] = useState("")
  const [caption, setCaption] = useState("")
  const [studentId, setStudentId] = useState<string>("none")
  const [courseId, setCourseId] = useState<string>("none")
  const [vibe, setVibe] = useState<NonNullable<WallEntry["vibe"]>>("love")
  const [featured, setFeatured] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setKind("image"); setUrl(""); setCaption(""); setStudentId("none"); setCourseId("none")
    setVibe("love"); setFeatured(false)
  }

  const canSubmit = !!caption.trim() && (kind === "quote" || !!url.trim())

  const submit = () => {
    if (!canSubmit) return
    const student = studentId !== "none" ? students.find((s) => s.id === studentId) : undefined
    onAdd({
      kind,
      url: kind === "quote" ? undefined : url.trim(),
      caption: caption.trim(),
      studentId: student?.id,
      studentName: student?.name,
      courseId: courseId !== "none" ? courseId : undefined,
      vibe,
      featured,
    })
    reset()
    onOpenChange(false)
  }

  const onPickFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadAsset(file)
      setUrl(result.url)
      if (file.type.startsWith("video/")) setKind("video")
      else setKind("image")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to the Wall of Love</DialogTitle>
          <DialogDescription>
            Photos, videos, artwork, or a quote from a student. Everything posted here shows publicly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Kind picker */}
          <div className="flex flex-wrap gap-1.5">
            {(["image", "video", "quote", "link"] as WallKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  kind === k
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/40",
                )}
              >
                {k === "image"  && <ImageIcon className="h-3.5 w-3.5" />}
                {k === "video"  && <Video className="h-3.5 w-3.5" />}
                {k === "quote"  && <QuoteIcon className="h-3.5 w-3.5" />}
                {k === "link"   && <LinkIcon className="h-3.5 w-3.5" />}
                {k}
              </button>
            ))}
          </div>

          {/* URL / upload */}
          {kind !== "quote" && (
            <div className="space-y-1.5">
              <Label htmlFor="wall-url">
                {kind === "image" ? "Image" : kind === "video" ? "Video (YouTube / Vimeo / Loom / MP4)" : "URL"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="wall-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={kind === "video" ? "https://youtu.be/…" : "Paste URL or upload"}
                  className="flex-1 font-mono text-xs"
                />
                {kind !== "link" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept={kind === "image" ? "image/*" : "video/*,image/*"}
                  onChange={(e) => void onPickFile(e.target.files?.[0])}
                />
              </div>
            </div>
          )}

          {/* Caption / quote */}
          <div className="space-y-1.5">
            <Label htmlFor="wall-caption">
              {kind === "quote" ? "What did they say?" : "Caption"}
            </Label>
            <Textarea
              id="wall-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={kind === "quote" ? 4 : 2}
              placeholder={
                kind === "quote"
                  ? "\"This bootcamp changed how I think about design.\""
                  : "What's special about this?"
              }
            />
          </div>

          {/* Attribution */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wall-student">Student (optional)</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="wall-student"><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wall-course">Course (optional)</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="wall-course"><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vibe + featured */}
          <div className="space-y-1.5">
            <Label>Vibe</Label>
            <div className="flex flex-wrap gap-1.5">
              {VIBE_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVibe(v.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                    vibe === v.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                  )}
                >
                  {v.icon}
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4"
            />
            <Pin className="h-3.5 w-3.5" /> Pin to top of the wall
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit || uploading}>
            <Heart className="mr-2 h-4 w-4" /> Add to wall
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
