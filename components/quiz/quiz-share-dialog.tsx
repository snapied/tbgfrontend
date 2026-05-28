"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  Copy,
  Hourglass,
  ListChecks,
  Link as LinkIcon,
  QrCode,
  RotateCcw,
  Share2,
  Trophy,
} from "lucide-react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Quiz } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"

interface QuizShareDialogProps {
  quiz: Quiz
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuizShareDialog({ quiz, open, onOpenChange }: QuizShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const { currentTenant, tenants } = useTenant()

  // Always use subdomain format: tenant.thebigclass.com/quiz/{id}
  // Try currentTenant first, then first active tenant from the array.
  const shareUrl = useMemo(() => {
    const slug = currentTenant?.slug
      ?? tenants.find((t) => t.status === "active")?.slug
      ?? tenants[0]?.slug
    if (slug) return `https://${slug}.thebigclass.com/quiz/${quiz.id}`
    if (typeof window === "undefined") return `/quiz/${quiz.id}`
    return `${window.location.origin}/quiz/${quiz.id}`
  }, [quiz.id, currentTenant?.slug, tenants])

  useEffect(() => {
    if (!open) {
      setCopied(false)
      return
    }
    let cancelled = false

    // Publish the quiz to the server so guests on other devices can access it
    fetch(`/api/public-quiz/${quiz.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz }),
    }).catch(() => { /* non-fatal */ })

    QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 240,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [open, shareUrl, quiz])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      handleCopy()
      return
    }
    try {
      await navigator.share({
        title: quiz.title,
        text: quiz.description || `Take the "${quiz.title}" quiz`,
        url: shareUrl,
      })
    } catch {
      /* user dismissed */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Quiz
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{quiz.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code */}
          <div className="flex items-center justify-center rounded-lg border border-border/60 bg-muted/40 p-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR code for ${quiz.title}`}
                className="h-44 w-44 rounded-md bg-white p-2"
              />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-md bg-white text-muted-foreground">
                <QrCode className="h-10 w-10" />
              </div>
            )}
          </div>

          {/* Link */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <LinkIcon className="h-3.5 w-3.5" />
              Shareable link
            </label>
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
              <Button
                type="button"
                variant={copied ? "default" : "outline"}
                onClick={handleCopy}
                className="shrink-0"
                aria-live="polite"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can take the quiz as a guest.
            </p>
          </div>

          {/* Settings preview */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-card p-3 text-sm">
            <SettingRow
              icon={<ListChecks className="h-3.5 w-3.5" />}
              label="Questions"
              value={`${quiz.questions.length}`}
            />
            <SettingRow
              icon={<Hourglass className="h-3.5 w-3.5" />}
              label="Time"
              value={quiz.timeLimit ? `${quiz.timeLimit} min` : "No limit"}
            />
            <SettingRow
              icon={<Trophy className="h-3.5 w-3.5" />}
              label="Pass"
              value={`${quiz.passingScore}%`}
            />
            <SettingRow
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              label="Attempts"
              value={!quiz.maxAttempts || quiz.maxAttempts <= 0 ? "Unlimited" : `${quiz.maxAttempts}`}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleNativeShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share…
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SettingRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
