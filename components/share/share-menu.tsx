"use client"

// ShareMenu — the canonical "share this artifact" surface for the
// platform. Opens a popover with one click and exposes every share
// pathway in one place:
//
//   • Copy link            — clipboard
//   • QR code              — auto-generated SVG, downloadable
//   • WhatsApp             — wa.me deep link with prefilled text
//   • Email                — mailto: with subject + body
//   • Embed                — iframe snippet (video kind only)
//   • Share to community   — opens a secondary dialog that posts
//                            a rich card into a chosen community
//                            + space
//
// Used by recordings, courses, certificates, lessons, posts —
// anywhere a user might want to push an artifact outwards. Items
// hide themselves when irrelevant (no embed for non-video, no
// "share to community" when the tenant has zero communities).
//
// Design note: this component is deliberately stateful inside but
// stateless to its caller. You pass an artifact descriptor; it
// figures out the rest. Avoid plumbing per-action callbacks
// through the consumer — that fragments behavior across surfaces
// and we end up with five subtly different "Share" buttons.

import { useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  QrCode,
  Send,
  Share2,
  Users as UsersIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useLMS, generateId, getBatchSpaces } from "@/lib/lms-store"

// Artifact descriptor — every consumer hands ShareMenu the minimum
// the various share targets need. `kind` drives which extras appear
// (Embed for video, etc.). `url` is the canonical public link; the
// component never tries to mint one — that's the caller's call.
export interface ShareArtifact {
  kind: "recording" | "course" | "certificate" | "lesson" | "post" | "page" | "testimonial"
  /** Short headline used in WhatsApp text, email subject, and the
   *  community post card. Keep under 80 chars. */
  title: string
  /** Optional one-line context that lands in the email body and the
   *  community post under the title. */
  description?: string
  /** Canonical public URL. Required — if you can't form one, don't
   *  render the share button. */
  url: string
  /** Optional thumbnail for the community post embed. */
  thumbnailUrl?: string
  /** Author/source label. "Anita Sharma" / "JavaScript 101" — shown
   *  as a footer in the community share card. */
  source?: string
}

interface ShareMenuProps {
  artifact: ShareArtifact
  /** Custom trigger element. Defaults to a "Share" outline button. */
  trigger?: React.ReactNode
  /** Skip the "Embed" item even for video kinds — useful on
   *  private-only courses where embedding leaks restricted content. */
  hideEmbed?: boolean
}

export function ShareMenu({ artifact, trigger, hideEmbed = false }: ShareMenuProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  // Two secondary dialogs share the menu — QR (visual) and "Share to
  // community" (composer). They're rendered alongside the popover so
  // closing the popover doesn't close them mid-flow.
  const [qrOpen, setQrOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)

  const copy = async (text: string, message?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(message ?? "Link copied to clipboard")
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Couldn't access clipboard — copy from the input below.")
    }
  }

  const whatsappHref = useMemo(() => {
    const text = `${artifact.title}\n${artifact.url}`
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }, [artifact])

  const mailtoHref = useMemo(() => {
    const subject = artifact.title
    const body = [
      artifact.description ?? "",
      "",
      artifact.url,
    ]
      .filter(Boolean)
      .join("\n")
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }, [artifact])

  const embedCode = useMemo(() => {
    // Generic iframe embed. Consumers that need a richer embed
    // (player skin, autoplay flag) can branch on kind later — this
    // matches what most platforms emit for now.
    return `<iframe src="${artifact.url}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
  }, [artifact])

  const showEmbed = !hideEmbed && (artifact.kind === "recording" || artifact.kind === "lesson")

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <div className="border-b border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Share
            </p>
            <p className="mt-0.5 truncate text-sm font-medium">{artifact.title}</p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-border">
            <ShareItem
              icon={copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              label={copied ? "Copied!" : "Copy link"}
              hint={artifact.url}
              onClick={() => void copy(artifact.url)}
            />
            <ShareItem
              icon={<QrCode className="h-4 w-4" />}
              label="QR code"
              hint="Pop a printable code on a slide"
              onClick={() => {
                setOpen(false)
                setQrOpen(true)
              }}
            />
            <ShareItem
              icon={<MessageCircle className="h-4 w-4" />}
              label="WhatsApp"
              hint="Opens WhatsApp with text pre-filled"
              href={whatsappHref}
            />
            <ShareItem
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              hint="Opens your mail app with the link"
              href={mailtoHref}
            />
            {showEmbed && (
              <ShareItem
                icon={<Send className="h-4 w-4" />}
                label="Embed code"
                hint="Paste an iframe into any site"
                onClick={() => {
                  void copy(embedCode, "Embed code copied")
                }}
              />
            )}
            <ShareItem
              icon={<UsersIcon className="h-4 w-4" />}
              label="Share to community"
              hint="Post into one of your cohorts"
              onClick={() => {
                setOpen(false)
                setCommunityOpen(true)
              }}
            />
          </div>
        </PopoverContent>
      </Popover>

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={artifact.url}
        title={artifact.title}
      />
      <ShareToCommunityDialog
        open={communityOpen}
        onOpenChange={setCommunityOpen}
        artifact={artifact}
      />
    </>
  )
}

// ───────────────────────────────────────────────────────────────────
// Internal building blocks below — kept in this file so consumers
// only need one import. Don't export them separately; the
// surfaces should stay consistent across share entry points.
// ───────────────────────────────────────────────────────────────────

function ShareItem({
  icon,
  label,
  hint,
  href,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  href?: string
  onClick?: () => void
}) {
  const cls =
    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{label}</span>
          {hint && (
            <span className="block truncate text-[11px] text-muted-foreground">
              {hint}
            </span>
          )}
        </span>
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && (
          <span className="block truncate text-[11px] text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
    </button>
  )
}

function QrDialog({
  open,
  onOpenChange,
  url,
  title,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  url: string
  title: string
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    // 320×320 PNG with high error correction — survives print +
    // partial occlusion (taped-over corner on a slide, projector
    // glare). Margin 2 modules = enough quiet zone for camera apps.
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#0f0f0f", light: "#ffffff" },
    })
      .then((data) => {
        if (!cancelled) setDataUrl(data)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [open, url])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={`QR code for ${title}`}
              className="h-64 w-64 rounded-md border border-border bg-white"
            />
          ) : (
            <div className="grid h-64 w-64 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
              Generating…
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Scan with any phone camera. Right-click the image to save
            for slides or print.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {dataUrl && (
            <Button asChild>
              <a download={`qr-${slugify(title)}.png`} href={dataUrl}>
                Download PNG
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ShareToCommunityDialog({
  open,
  onOpenChange,
  artifact,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  artifact: ShareArtifact
}) {
  const { studentGroups, addBatchPost, currentUser } = useLMS()
  const [batchId, setBatchId] = useState<string>("")
  const [spaceId, setSpaceId] = useState<string>("space-general")
  const [message, setMessage] = useState<string>("")

  // Reset state every time the dialog opens fresh so an old
  // selection doesn't leak across share targets.
  useEffect(() => {
    if (open) {
      setBatchId(studentGroups[0]?.id ?? "")
      setSpaceId("space-general")
      setMessage("")
    }
  }, [open, studentGroups])

  const activeBatch = studentGroups.find((g) => g.id === batchId)
  const spaces = activeBatch ? getBatchSpaces(activeBatch) : []

  const handleSend = () => {
    if (!currentUser) {
      toast.error("Sign in to share with a community.")
      return
    }
    if (!batchId) {
      toast.error("Pick a community first.")
      return
    }
    // The body combines the user's optional message with a card-
    // shaped block that previews the artifact. We use plain HTML
    // (matching RichTextEditor output) so the existing renderer
    // displays it without special-casing.
    const cardThumb = artifact.thumbnailUrl
      ? `<p><img src="${escapeAttr(artifact.thumbnailUrl)}" alt="${escapeAttr(artifact.title)}" /></p>`
      : ""
    const source = artifact.source
      ? `<p><em>From: ${escapeHtml(artifact.source)}</em></p>`
      : ""
    const description = artifact.description
      ? `<p>${escapeHtml(artifact.description)}</p>`
      : ""
    const messageHtml = message.trim()
      ? `<p>${escapeHtml(message.trim()).replace(/\n/g, "<br/>")}</p>`
      : ""
    const body = [
      messageHtml,
      `<blockquote><p><strong>${escapeHtml(artifact.title)}</strong></p>${description}${cardThumb}<p><a href="${escapeAttr(artifact.url)}" target="_blank" rel="noopener">Open</a></p>${source}</blockquote>`,
    ].join("")

    addBatchPost({
      id: generateId("post"),
      batchId,
      spaceId,
      authorId: currentUser.id,
      body,
      // Surface the underlying URL as the post's embedUrl so the
      // existing post renderer auto-detects video providers and
      // shows a real player above the body. Falls back gracefully
      // for non-video URLs.
      embedUrl:
        artifact.kind === "recording" || artifact.kind === "lesson"
          ? artifact.url
          : undefined,
      pinned: false,
      hidden: false,
      reactions: {},
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    toast.success(`Posted to ${activeBatch?.name ?? "community"}.`, {
      description: "Members will be notified.",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share to a community</DialogTitle>
        </DialogHeader>
        {studentGroups.length === 0 ? (
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              You haven&rsquo;t created any communities yet. Create one to
              start sharing artifacts with your cohort.
            </p>
            <Button asChild className="w-full">
              <a href="/dashboard/batches">Open communities</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Community
              </label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a community…" />
                </SelectTrigger>
                <SelectContent>
                  {studentGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {spaces.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Space
                </label>
                <Select value={spaceId} onValueChange={setSpaceId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.emoji ?? "💬"} {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Add a message (optional)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Why this is worth a watch…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <p className="font-medium">{artifact.title}</p>
              {artifact.description && (
                <p className="mt-0.5 text-muted-foreground">
                  {artifact.description}
                </p>
              )}
              <p className="mt-1 truncate text-[10px] font-mono text-muted-foreground">
                {artifact.url}
              </p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {studentGroups.length > 0 && (
            <Button onClick={handleSend} disabled={!batchId}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Post
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Tiny, scoped escape helpers — used only for building the
// community-post HTML body from user-provided strings. RichTextContent
// re-sanitizes on render so this is defense-in-depth, not the only
// guard.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
function escapeAttr(s: string): string {
  return escapeHtml(s)
}
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "share"
}
