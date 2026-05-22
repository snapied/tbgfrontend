"use client"

// LinkedIn-style cover + avatar editor. Renders a wide banner with the
// avatar half-overlapping the bottom-left, edit/remove buttons floating
// on the cover, and a hint about recommended dimensions.
//
// Why custom (not just two ThumbnailFields): seeing the cover + avatar
// composed the way visitors will see them is the most important
// feedback when picking either. Two separate file inputs feel
// disconnected and the teacher has no idea how the avatar will sit
// inside the cover.

import { Camera, ImageIcon, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { FileUploadField } from "@/components/upload/file-upload-field"
import { cn } from "@/lib/utils"

interface Props {
  name: string
  avatar: string
  coverUrl: string
  onAvatarChange: (url: string) => void
  onCoverChange: (url: string) => void
  // Optional small subtitle under the name in the preview (role,
  // headline, anything). Helps the teacher see the composed effect.
  subtitle?: string
}

export function ProfileCoverEditor({
  name,
  avatar,
  coverUrl,
  onAvatarChange,
  onCoverChange,
  subtitle,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Composed preview */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Cover */}
        <div className="group relative h-44 w-full sm:h-56">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Cover banner"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--accent)) 100%)",
              }}
            />
          )}
          {/* Floating edit/remove for cover — visible always on touch,
              fade-in on hover for mouse users. */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-90 transition group-hover:opacity-100">
            <CoverInlineEditor value={coverUrl} onChange={onCoverChange} />
            {coverUrl && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={() => onCoverChange("")}
                title="Remove cover"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        {/* Avatar + name strip */}
        <div className="relative -mt-12 flex items-end gap-4 px-5 pb-5 sm:-mt-16 sm:px-6 sm:pb-6">
          <div className="relative shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={name}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-card shadow-sm sm:h-28 sm:w-28"
              />
            ) : (
              <div
                className={cn(
                  "flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground ring-4 ring-card shadow-sm sm:h-28 sm:w-28",
                )}
              >
                {(name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
            )}
            <AvatarInlineEditor value={avatar} onChange={onAvatarChange} />
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="truncate text-xl font-semibold sm:text-2xl">
              {name || "Your name"}
            </p>
            {subtitle && (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Recommended: cover 1600 × 400 (4:1), profile photo square and at least 400 × 400. Both are
        auto-compressed before saving — uploads land in <code className="rounded bg-muted px-1 font-mono">/uploads</code>,
        not browser storage, so big files are fine.
      </p>
    </div>
  )
}

// Floating circular "edit" button for the avatar — overlaps the
// bottom-right of the photo and opens the FileUploadField hidden
// behind it via a label.
function AvatarInlineEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  return (
    <div className="absolute -bottom-1 -right-1">
      <div className="rounded-full bg-card p-0.5 shadow-md">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Camera className="h-3.5 w-3.5" />
        </div>
      </div>
      {/* Hidden but full-area trigger that proxies through FileUploadField.
          Using a wrapper because FileUploadField is built around its own
          chrome — we hide that and capture clicks on this circle. */}
      <div className="absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-full opacity-0">
        <FileUploadField
          value={value}
          onChange={onChange}
          accept="image/png,image/jpeg,image/webp"
          maxSizeMB={8}
          variant="compact"
          hideUrlInput
          compress={{ maxDim: 400, quality: 0.85, mime: "image/jpeg" }}
        />
      </div>
    </div>
  )
}

// Cover photo editor — opens the full ThumbnailField dialog (with
// Upload / Unsplash / Design tabs) so the teacher who doesn't have a
// cover photo still has a way to ship a polished banner.
function CoverInlineEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  return (
    <div className="relative">
      <Button size="sm" variant="secondary" className="h-8">
        <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
        {value ? "Edit cover" : "Add cover"}
      </Button>
      <div className="absolute inset-0 cursor-pointer opacity-0">
        <ThumbnailField
          value={value}
          onChange={onChange}
          compress={{ maxDim: 1600, quality: 0.82, mime: "image/jpeg" }}
        />
      </div>
    </div>
  )
}
