"use client"

import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Film,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  Music,
  Trash2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { uploadAsset } from "@/lib/upload-asset"
import { compressImage, type CompressOptions } from "@/lib/image-compress"
import { formatBytes } from "@/lib/lesson-utils"

interface FileUploadFieldProps {
  value: string
  onChange: (url: string, meta?: UploadMeta) => void
  /** Standard HTML input "accept" string. */
  accept?: string
  /** Per-field soft cap. The backend has its own hard 200MB ceiling. */
  maxSizeMB?: number
  /** Override the placeholder shown in the URL field. */
  urlPlaceholder?: string
  /** Hint shown under the field. */
  hint?: string
  /** Show a thumbnail preview for image URLs. */
  showImagePreview?: boolean
  /** Compact variant — single inline row, no big dropzone. */
  variant?: "default" | "compact"
  /** Hide the URL paste alternative. */
  hideUrlInput?: boolean
  /**
   * If set and the uploaded file is an image, downscale + recompress it
   * client-side BEFORE handing it to uploadAsset. This is the only reason
   * a 4 MB avatar doesn't blow past localStorage's 5 MB origin quota.
   * Non-image files (PDF, video) bypass compression unconditionally.
   */
  compress?: CompressOptions
  className?: string
  /** R2 sub-folder for this upload. Defaults to "general". */
  folder?: import("@/lib/upload-asset").UploadFolder
}

export interface UploadMeta {
  filename?: string
  size?: number
  mime?: string
}

export function FileUploadField({
  value,
  onChange,
  accept,
  maxSizeMB = 50,
  urlPlaceholder = "Paste a URL (https://…)",
  hint,
  showImagePreview,
  variant = "default",
  hideUrlInput,
  compress,
  className,
  folder = "general",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Remember the original filename of the most-recently uploaded file *and*
  // which URL it belongs to. Without the URL pin, the displayed name would
  // stay stuck on the old upload after the user pastes/types a different URL.
  const [lastUpload, setLastUpload] = useState<{ filename: string; url: string } | null>(null)
  const [warnInline, setWarnInline] = useState(false)

  const hasValue = !!value
  const looksLikeImage = useMemo(() => showImagePreview && isImageUrl(value), [showImagePreview, value])

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const file = files[0]
      setError(null)
      setWarnInline(false)
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        setError(`That file is ${formatBytes(file.size)} — over the ${maxSizeMB} MB cap.`)
        return
      }
      setUploading(true)
      setProgress(0)
      try {
        const ticker = setInterval(
          () => setProgress((p) => (p === null ? 5 : Math.min(95, p + 5))),
          200,
        )
        // Compress images client-side when the caller asked us to. This
        // happens BEFORE uploadAsset so a 4 MB phone-camera photo becomes a
        // ~100 KB JPEG that actually fits in localStorage if uploadAsset
        // ends up falling back to a data: URL.
        let toUpload: File = file
        if (compress && file.type.startsWith("image/")) {
          try {
            const compressed = await compressImage(file, compress)
            const dataPart = compressed.url.split(",")[1] ?? ""
            const bin = atob(dataPart)
            const bytes = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
            const ext = compressed.mime === "image/webp" ? "webp" : "jpg"
            const renamed = file.name.replace(/\.[^.]+$/, "") + "." + ext
            toUpload = new File([bytes], renamed, { type: compressed.mime })
          } catch {
            // Compression failed for some reason — fall through with the
            // original file. uploadAsset will still try, and we'll only
            // hit quota issues for very large originals.
          }
        }
        const result = await uploadAsset(toUpload, folder)
        clearInterval(ticker)
        setProgress(100)
        setLastUpload({ filename: file.name, url: result.url })
        // uploadAsset now always returns a real CDN URL or throws — there's
        // no data-URL fallback anymore. Inline-warning is therefore dead.
        onChange(result.url, { filename: file.name, size: toUpload.size, mime: toUpload.type })
        setTimeout(() => {
          setUploading(false)
          setProgress(null)
        }, 400)
      } catch (err) {
        setUploading(false)
        setProgress(null)
        setError((err as Error).message ?? "Upload failed")
      }
    },
    [maxSizeMB, onChange, compress],
  )

  const onPick = () => inputRef.current?.click()
  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files)
    if (inputRef.current) inputRef.current.value = ""
  }
  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (!dragOver) setDragOver(true)
  }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    void handleFiles(e.dataTransfer.files)
  }

  const KindIcon = useMemo(() => iconFor(accept, value), [accept, value])

  return (
    <div className={cn("space-y-2", className)}>
      {/* Always-visible controlled URL + upload button row */}
      <div className="flex items-center gap-2">
        {!hideUrlInput && (
          <div className="relative flex-1">
            <LinkIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value}
              placeholder={urlPlaceholder}
              onChange={(e) => onChange(e.target.value)}
              className="pl-8"
            />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onPick}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading ? "Uploading…" : hasValue ? "Replace" : "Upload"}
        </Button>
        {hasValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onChange("")
              setWarnInline(false)
              setLastUpload(null)
            }}
            title="Clear"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all",
              progress === 100 ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Preview chip (filename, thumbnail) */}
      {hasValue && !uploading && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-2.5">
          {looksLikeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-12 w-16 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <KindIcon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {lastUpload?.url === value ? lastUpload.filename : prettyValue(value)}
            </p>
            <p className="truncate text-xs text-muted-foreground">{value}</p>
          </div>
          {isExternalUrl(value) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8"
              title="Open"
            >
              <a href={value} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      )}

      {/* Drop zone (only in default variant, only when empty + not uploading) */}
      {variant === "default" && !hasValue && !uploading && (
        <div
          onClick={onPick}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "group flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
          <p className="text-sm font-medium">
            {dragOver ? "Drop to upload" : "Drop a file or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxSizeMB} MB{accept ? ` · ${prettyAccept(accept)}` : ""}
          </p>
        </div>
      )}

      {/* Status row */}
      {error && (
        <p className="inline-flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      )}
      {!error && warnInline && (
        <p className="inline-flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          Backend isn&apos;t running — file was inlined and may not survive a reload. Start the API or paste a hosted URL.
        </p>
      )}
      {!error && !warnInline && hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {hasValue && progress === 100 && !warnInline && (
        <p className="inline-flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3 w-3" /> Uploaded
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onInputChange}
        className="hidden"
        aria-hidden
      />
    </div>
  )
}

function iconFor(accept: string | undefined, url: string) {
  if (isImageUrl(url) || accept?.includes("image")) return ImageIcon
  if (/\.(mp4|webm|mov|m4v|mkv)(\?|$)/i.test(url) || accept?.includes("video")) return Film
  if (/\.(mp3|wav|ogg|aac|m4a|flac)(\?|$)/i.test(url) || accept?.includes("audio")) return Music
  return FileText
}

function isImageUrl(url: string): boolean {
  if (!url) return false
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) || url.startsWith("data:image/")
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url)
}

function prettyValue(url: string): string {
  if (url.startsWith("data:")) return "Inline file"
  try {
    const u = new URL(url)
    const last = u.pathname.split("/").filter(Boolean).pop()
    return last || u.hostname
  } catch {
    return url
  }
}

function prettyAccept(accept: string): string {
  if (accept === "image/*") return "Images"
  if (accept === "video/*") return "Video"
  if (accept === "audio/*") return "Audio"
  return accept
    .split(",")
    .map((s) => s.trim().replace(/^\./, "").toUpperCase())
    .join(" · ")
}
