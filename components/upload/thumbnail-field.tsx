"use client"

// Course thumbnail picker with three modes:
//   • Upload — file from disk (via uploadAsset) or paste a URL.
//   • Unsplash — search the public Unsplash library and pick a photo.
//   • Design — render a quick gradient + title card to a canvas data URL.
//
// All three feed the same `value` (a thumbnail URL — remote or data:). The
// surrounding form just receives onChange(url). No knowledge of mode is
// retained — once a thumbnail is set, the source is irrelevant.
//
// The Unsplash key is exposed to the browser via NEXT_PUBLIC_UNSPLASH_ACCESS_KEY.
// That's fine for a POC (Unsplash rate-limits per IP); for production proxy
// the search through the backend to keep the key off the page and to enforce
// per-tenant quotas.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  ExternalLink,
  ImageIcon,
  Loader2,
  Search as SearchIcon,
  Sparkles,
  Trash2,
  Type as TypeIcon,
  Upload,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { uploadAsset, uploadDataUrl } from "@/lib/upload-asset"
import { compressImage, COMPRESS_PRESETS, type CompressOptions } from "@/lib/image-compress"

interface Props {
  value: string
  onChange: (url: string) => void
  // Optional course title — used as the default headline on the Design tab
  // so the user doesn't have to retype it. Falls back to "Your course".
  defaultTitle?: string
  // Compression target. Defaults to COMPRESS_PRESETS.cover (1600 px wide
  // JPEG at q=0.82) since the dominant caller is a cover image and the
  // raw localStorage path silently drops anything over ~5 MB.
  compress?: CompressOptions
  // Which R2 sub-folder this image belongs to. Lets the backend bucket assets
  // by source — blog/, faculty/, courses/, etc. Default "general".
  folder?: import("@/lib/upload-asset").UploadFolder
}

// 16:9 reference dimensions for canvas output. Matches the aspect ratio
// course cards expect and is large enough to look sharp on retina screens
// without ballooning the data URL size.
const CANVAS_W = 1280
const CANVAS_H = 720

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ?? ""

// Preset gradients for the Design tab. Curated for course-card vibes:
// energetic, scholarly, calm, premium. Each entry is the CSS background
// string AND the matching canvas stops so the live preview and the
// rendered output stay in sync.
const DESIGN_PRESETS: { id: string; label: string; css: string; stops: [string, string] }[] = [
  { id: "indigo",   label: "Indigo",   css: "linear-gradient(135deg, #4f46e5, #1e1b4b)", stops: ["#4f46e5", "#1e1b4b"] },
  { id: "forest",   label: "Forest",   css: "linear-gradient(135deg, #0a3024, #134e3d)", stops: ["#0a3024", "#134e3d"] },
  { id: "sunset",   label: "Sunset",   css: "linear-gradient(135deg, #f97316, #be185d)", stops: ["#f97316", "#be185d"] },
  { id: "ocean",    label: "Ocean",    css: "linear-gradient(135deg, #0ea5e9, #1e3a8a)", stops: ["#0ea5e9", "#1e3a8a"] },
  { id: "rose",     label: "Rose",     css: "linear-gradient(135deg, #e11d48, #831843)", stops: ["#e11d48", "#831843"] },
  { id: "emerald",  label: "Emerald",  css: "linear-gradient(135deg, #10b981, #064e3b)", stops: ["#10b981", "#064e3b"] },
  { id: "amber",    label: "Amber",    css: "linear-gradient(135deg, #f59e0b, #7c2d12)", stops: ["#f59e0b", "#7c2d12"] },
  { id: "slate",    label: "Slate",    css: "linear-gradient(135deg, #475569, #0f172a)", stops: ["#475569", "#0f172a"] },
  { id: "violet",   label: "Violet",   css: "linear-gradient(135deg, #8b5cf6, #4c1d95)", stops: ["#8b5cf6", "#4c1d95"] },
  { id: "teal",     label: "Teal",     css: "linear-gradient(135deg, #14b8a6, #134e4a)", stops: ["#14b8a6", "#134e4a"] },
  { id: "cocoa",    label: "Cocoa",    css: "linear-gradient(135deg, #78350f, #292524)", stops: ["#78350f", "#292524"] },
  { id: "midnight", label: "Midnight", css: "linear-gradient(135deg, #1e293b, #020617)", stops: ["#1e293b", "#020617"] },
]

interface UnsplashPhoto {
  id: string
  alt_description: string | null
  description: string | null
  urls: { regular: string; small: string; thumb: string }
  links: { html: string; download_location: string }
  user: { name: string; links: { html: string } }
}

export function ThumbnailField({ value, onChange, defaultTitle, compress, folder = "general" }: Props) {
  const [open, setOpen] = useState(false)
  // Local "draft" — the user can browse without committing until they hit
  // "Use this thumbnail". Reset on every open so cancelling truly cancels.
  const [draft, setDraft] = useState<string>(value)
  const [committing, setCommitting] = useState(false)
  useEffect(() => { if (open) setDraft(value) }, [open, value])

  const commit = async () => {
    if (draft.startsWith("data:")) {
      setCommitting(true)
      try {
        const uploadedUrl = await uploadDataUrl(draft, "course-cover", folder)
        onChange(uploadedUrl)
        setOpen(false)
      } catch (err) {
        console.error("Failed to upload designed thumbnail:", err)
        onChange(draft)
        setOpen(false)
      } finally {
        setCommitting(false)
      }
    } else {
      onChange(draft)
      setOpen(false)
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-md border bg-muted">
          <img
            src={value}
            alt="Course thumbnail"
            className="aspect-video w-full object-cover"
          />
          <div className="absolute right-2 top-2 flex gap-1">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" disabled={committing}>Edit</Button>
              </DialogTrigger>
              <ThumbnailDialogBody
                draft={draft}
                setDraft={setDraft}
                onCancel={() => setOpen(false)}
                onCommit={commit}
                defaultTitle={defaultTitle}
                compress={compress}
                committing={committing}
                folder={folder}
              />
            </Dialog>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onChange("")}
              title="Remove thumbnail"
              disabled={committing}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition hover:border-primary/60 hover:bg-muted/50 hover:text-foreground"
              disabled={committing}
            >
              <ImageIcon className="h-8 w-8" />
              <p className="mt-2 text-sm font-medium">Add a thumbnail</p>
              <p className="text-xs">Upload, search Unsplash, or design one</p>
            </button>
          </DialogTrigger>
          <ThumbnailDialogBody
            draft={draft}
            setDraft={setDraft}
            onCancel={() => setOpen(false)}
            onCommit={commit}
            defaultTitle={defaultTitle}
            compress={compress}
            committing={committing}
            folder={folder}
          />
        </Dialog>
      )}
    </div>
  )
}

function ThumbnailDialogBody({
  draft,
  setDraft,
  onCancel,
  onCommit,
  defaultTitle,
  compress,
  committing,
  folder,
}: {
  draft: string
  setDraft: (url: string) => void
  onCancel: () => void
  onCommit: () => void
  defaultTitle?: string
  compress?: CompressOptions
  committing: boolean
  folder: import("@/lib/upload-asset").UploadFolder
}) {
  return (
    <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
      <DialogHeader>
        <DialogTitle>Course thumbnail</DialogTitle>
        <DialogDescription>
          Upload your own, pick a free Unsplash photo, or design one in seconds.
        </DialogDescription>
      </DialogHeader>

      {/* flex-1 + min-h-0 so the inner tab panels scroll while the footer
          and Snapied CTA stay pinned at the bottom — otherwise the
          Unsplash overlay editor or a tall Design preview pushes the
          "Use this thumbnail" button below the viewport. */}
      <Tabs defaultValue="upload" className="mt-2 flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-full shrink-0 grid-cols-3">
          <TabsTrigger value="upload" disabled={committing}><Upload className="mr-1.5 h-3.5 w-3.5" /> Upload</TabsTrigger>
          <TabsTrigger value="unsplash" disabled={committing}><SearchIcon className="mr-1.5 h-3.5 w-3.5" /> Unsplash</TabsTrigger>
          <TabsTrigger value="design" disabled={committing}><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Design</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <TabsContent value="upload">
            <UploadTab draft={draft} setDraft={setDraft} compress={compress} folder={folder} />
          </TabsContent>

          <TabsContent value="unsplash">
            <UnsplashTab draft={draft} setDraft={setDraft} defaultTitle={defaultTitle} />
          </TabsContent>

          <TabsContent value="design">
            <DesignTab draft={draft} setDraft={setDraft} defaultTitle={defaultTitle} />
          </TabsContent>
        </div>
      </Tabs>

      {/* External-design CTA. Snapied is a sister product purpose-built for
          marketing visuals; far better than what a basic in-app designer
          can offer for teachers who want a polished, branded thumbnail.
          Surfacing it here costs us nothing and helps the user when our
          three built-in modes don't quite cut it. */}
      <div className="mt-4 flex shrink-0 items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-xs">
        <div className="flex items-start gap-2">
          <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>
            Want a polished, branded thumbnail? Design one on{" "}
            <a
              href="https://snapied.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent-foreground underline hover:opacity-80"
            >
              snapied.com
            </a>{" "}
            and come back to upload.
          </span>
        </div>
        <a
          href="https://snapied.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 font-medium text-accent-foreground hover:underline"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <DialogFooter className="mt-4 shrink-0">
        <Button variant="outline" onClick={onCancel} disabled={committing}>Cancel</Button>
        <Button onClick={onCommit} disabled={!draft || committing}>
          {committing ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Check className="mr-1.5 h-4 w-4" /> Use this thumbnail
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// ---------- Upload tab ----------

function UploadTab({
  draft,
  setDraft,
  compress,
  folder,
}: {
  draft: string
  setDraft: (url: string) => void
  compress?: CompressOptions
  folder: import("@/lib/upload-asset").UploadFolder
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.")
      return
    }
    setUploading(true)
    setError(null)
    try {
      // Compress before storing — without this, a 4 MB phone photo blows
      // past localStorage's 5 MB origin quota and silently disappears on
      // reload. Defaults to the cover preset since this field's dominant
      // caller is cover banners; callers override via the `compress` prop.
      const preset = compress ?? COMPRESS_PRESETS.cover
      let toUpload: File = file
      try {
        const result = await compressImage(file, preset)
        const dataPart = result.url.split(",")[1] ?? ""
        const bin = atob(dataPart)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const ext = result.mime === "image/webp" ? "webp" : "jpg"
        const renamed = file.name.replace(/\.[^.]+$/, "") + "." + ext
        toUpload = new File([bytes], renamed, { type: result.mime })
      } catch {
        // Compression failed — fall through with the original file.
      }
      const { url } = await uploadAsset(toUpload, folder)
      setDraft(url)
    } catch (err) {
      setError((err as Error).message ?? "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f) void handleFile(f)
        }}
        className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 transition hover:border-primary/60 hover:bg-muted/50"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : draft ? (
          <img src={draft} alt="" className="h-full w-full rounded-md object-cover" />
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Click or drop an image</p>
            <p className="text-xs text-muted-foreground">PNG / JPG / WebP — up to ~5MB recommended</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="paste-url" className="text-xs">…or paste a URL</Label>
        <Input
          id="paste-url"
          placeholder="https://example.com/your-thumbnail.jpg"
          value={draft.startsWith("data:") ? "" : draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ---------- Unsplash tab ----------

function UnsplashTab({
  draft,
  setDraft,
  defaultTitle,
}: {
  draft: string
  setDraft: (url: string) => void
  defaultTitle?: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UnsplashPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The Unsplash photo the user clicked. Distinct from `draft` because
  // text-overlay mode replaces `draft` with a canvas data URL while still
  // wanting to remember which photo we're decorating.
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null)
  // Text-overlay state. When `withText` is on we render a canvas (photo +
  // dark gradient + headline) and set `draft` to its data URL. Otherwise
  // `draft` is the bare photo URL.
  const [withText, setWithText] = useState(false)
  const [title, setTitle] = useState(defaultTitle || "")
  const [subtitle, setSubtitle] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Debounced search so we don't hit Unsplash on every keystroke.
  useEffect(() => {
    if (!UNSPLASH_KEY) return
    const q = query.trim()
    if (!q) { setResults([]); return }
    const handle = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `https://api.unsplash.com/search/photos?per_page=18&content_filter=high&query=${encodeURIComponent(q)}&client_id=${UNSPLASH_KEY}`,
        )
        if (!res.ok) {
          throw new Error(`Unsplash returned ${res.status}`)
        }
        const json = (await res.json()) as { results: UnsplashPhoto[] }
        setResults(json.results ?? [])
      } catch (err) {
        setError((err as Error).message ?? "Search failed.")
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [query])

  const pick = (photo: UnsplashPhoto) => {
    setSelectedPhoto(photo)
    // If overlay mode is already on, the render effect below will rebuild
    // the canvas. Otherwise we commit the bare photo URL right now so the
    // dialog's "Use this thumbnail" button enables immediately.
    if (!withText) setDraft(photo.urls.regular)
    // Per Unsplash guidelines — ping the download_location endpoint when a
    // photo is "used". Fire-and-forget; failure doesn't affect the UX.
    if (UNSPLASH_KEY && photo.links.download_location) {
      void fetch(`${photo.links.download_location}?client_id=${UNSPLASH_KEY}`)
    }
  }

  // Render the chosen photo + text overlay to a canvas data URL whenever
  // any of the inputs change. Skips when overlay is off or no photo picked.
  useEffect(() => {
    if (!withText || !selectedPhoto) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H

    const img = new Image()
    // Unsplash CDN serves CORS, so we can read pixels back without taint.
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Cover-fit the photo into the canvas (crop, don't squash).
      const targetAR = CANVAS_W / CANVAS_H
      const srcAR = img.width / img.height
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (srcAR > targetAR) {
        sw = img.height * targetAR
        sx = (img.width - sw) / 2
      } else {
        sh = img.width / targetAR
        sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H)

      // Bottom-up dark gradient so text always has contrast against any
      // photo, even bright ones.
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      grad.addColorStop(0, "rgba(0,0,0,0.05)")
      grad.addColorStop(0.5, "rgba(0,0,0,0.35)")
      grad.addColorStop(1, "rgba(0,0,0,0.75)")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Headline + subtitle stacked bottom-left with a generous gutter.
      ctx.textAlign = "left"
      ctx.textBaseline = "alphabetic"
      ctx.fillStyle = "#ffffff"
      ctx.font = "700 80px Inter, system-ui, sans-serif"
      const headlineY = subtitle ? CANVAS_H - 140 : CANVAS_H - 80
      wrapText(ctx, title || defaultTitle || "Your course", 80, headlineY, CANVAS_W - 160, 90, "top")
      if (subtitle) {
        ctx.font = "500 34px Inter, system-ui, sans-serif"
        ctx.fillStyle = "rgba(255,255,255,0.9)"
        ctx.fillText(subtitle, 80, CANVAS_H - 60, CANVAS_W - 160)
      }

      setDraft(canvas.toDataURL("image/jpeg", 0.85))
    }
    img.onerror = () => {
      // If CORS or load fails, fall back to the plain photo URL so the user
      // still gets a thumbnail rather than a broken state.
      setDraft(selectedPhoto.urls.regular)
    }
    img.src = selectedPhoto.urls.regular
  }, [withText, selectedPhoto, title, subtitle, defaultTitle, setDraft])

  // Toggling overlay off → revert to the bare photo URL.
  const onToggleOverlay = (checked: boolean) => {
    setWithText(checked)
    if (!checked && selectedPhoto) setDraft(selectedPhoto.urls.regular)
  }

  if (!UNSPLASH_KEY) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Unsplash search is unavailable — set <code className="rounded bg-muted px-1 font-mono text-xs">NEXT_PUBLIC_UNSPLASH_ACCESS_KEY</code> in <code className="rounded bg-muted px-1 font-mono text-xs">.env</code> to enable it.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search Unsplash — try 'coding', 'classroom', 'design'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selected-photo + overlay editor. Only shown after a photo is
          picked — keeps the search-first flow clean and lets the user pick
          again without committing to overlay text. */}
      {selectedPhoto && (
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">Add text on this photo</span>
            </div>
            <Switch checked={withText} onCheckedChange={onToggleOverlay} />
          </div>
          {withText && (
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="overflow-hidden rounded border bg-muted">
                {draft && draft.startsWith("data:image") ? (
                  <img src={draft} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-xs text-muted-foreground">
                    Rendering…
                  </div>
                )}
              </div>
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <Label htmlFor="unsplash-overlay-title" className="text-xs">Title</Label>
                  <Input
                    id="unsplash-overlay-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={defaultTitle || "Your course"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unsplash-overlay-subtitle" className="text-xs">Subtitle (optional)</Label>
                  <Input
                    id="unsplash-overlay-subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Beginner-friendly · 6 weeks"
                  />
                </div>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <div className="max-h-[24rem] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        ) : results.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {query.trim() ? "No photos found. Try a different keyword." : "Type a keyword above to search."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map((p) => {
              const selected = p.id === selectedPhoto?.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  className={cn(
                    "group relative overflow-hidden rounded-md border bg-muted text-left transition",
                    selected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40",
                  )}
                  aria-pressed={selected}
                >
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <img
                    src={p.urls.small}
                    alt={p.alt_description ?? p.description ?? ""}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                  <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">
                    Photo by{" "}
                    <a
                      href={`${p.user.links.html}?utm_source=thebigclass&utm_medium=referral`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.user.name}
                    </a>{" "}
                    on{" "}
                    <a
                      href="https://unsplash.com/?utm_source=thebigclass&utm_medium=referral"
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Unsplash
                    </a>
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Design tab ----------

function DesignTab({
  draft,
  setDraft,
  defaultTitle,
}: {
  draft: string
  setDraft: (url: string) => void
  defaultTitle?: string
}) {
  const [presetId, setPresetId] = useState<string>(DESIGN_PRESETS[0].id)
  const [title, setTitle] = useState<string>(defaultTitle || "Your course")
  const [subtitle, setSubtitle] = useState<string>("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const preset = useMemo(
    () => DESIGN_PRESETS.find((p) => p.id === presetId) ?? DESIGN_PRESETS[0],
    [presetId],
  )

  // Render the canvas any time the inputs change, then push the data URL
  // into `draft`. We do the work off the React tree so the canvas itself
  // can stay invisible and only the rendered preview <img> shows up.
  const render = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    c.width = CANVAS_W
    c.height = CANVAS_H

    // Background gradient — diagonal to match the CSS preview.
    const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
    grad.addColorStop(0, preset.stops[0])
    grad.addColorStop(1, preset.stops[1])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Subtle vignette so the centred text reads on busy gradients.
    const vignette = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.2,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7,
    )
    vignette.addColorStop(0, "rgba(0,0,0,0)")
    vignette.addColorStop(1, "rgba(0,0,0,0.35)")
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Headline.
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = "700 88px Inter, system-ui, sans-serif"
    wrapText(ctx, title || "Your course", CANVAS_W / 2, subtitle ? CANVAS_H / 2 - 40 : CANVAS_H / 2, CANVAS_W - 160, 100)

    if (subtitle) {
      ctx.font = "500 36px Inter, system-ui, sans-serif"
      ctx.fillStyle = "rgba(255,255,255,0.85)"
      ctx.fillText(subtitle, CANVAS_W / 2, CANVAS_H / 2 + 90, CANVAS_W - 160)
    }

    // Export. JPEG keeps the data URL ~150KB instead of ~1MB for PNG.
    setDraft(c.toDataURL("image/jpeg", 0.85))
  }, [preset, title, subtitle, setDraft])

  useEffect(() => { render() }, [render])

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
      {/* Live preview — uses the data URL via draft so what you see is
          exactly what gets saved. */}
      <div className="space-y-3">
        <div className="overflow-hidden rounded-md border bg-muted">
          {draft && draft.startsWith("data:image") ? (
            <img src={draft} alt="Designed thumbnail preview" className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
              Rendering…
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="design-title" className="text-xs">Title</Label>
          <Input
            id="design-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your course"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="design-subtitle" className="text-xs">Subtitle (optional)</Label>
          <Input
            id="design-subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. Beginner-friendly · 8 weeks"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Background</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {DESIGN_PRESETS.map((p) => {
              const selected = p.id === presetId
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() => setPresetId(p.id)}
                  style={{ background: p.css }}
                  className={cn(
                    "aspect-square rounded-md border-2 transition",
                    selected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border",
                  )}
                  aria-pressed={selected}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Word-wrap helper for canvas. Splits on whitespace and lays out lines,
// stopping after maxWidth is exceeded. Caller controls horizontal align by
// setting ctx.textAlign before calling. Vertical placement is anchored to
// `y`: "center" treats y as the middle of the block (used by the Design
// tab), "top" treats y as the baseline of the *last* line (used by the
// Unsplash overlay where text sits at the bottom of the canvas).
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  vAlign: "center" | "top" = "center",
) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const tentative = current ? `${current} ${word}` : word
    if (ctx.measureText(tentative).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = tentative
    }
  }
  if (current) lines.push(current)
  // Cap at 3 lines so the headline never crowds the subtitle.
  const visible = lines.slice(0, 3)
  const startY =
    vAlign === "center"
      ? y - ((visible.length - 1) * lineHeight) / 2
      : y - (visible.length - 1) * lineHeight
  visible.forEach((line, i) => {
    ctx.fillText(line, x, startY + i * lineHeight)
  })
}
