"use client"

// Floating "you have unpublished changes" bar shown on the dashboard
// portal editor surfaces. Two modes:
//
//   - Clean: nothing rendered. The bar sits idle and out of the way.
//   - Dirty: a sticky-bottom card with a Publish button + version
//            history side-drawer trigger.
//
// Versioning is a paid feature — Starter can publish (otherwise their
// changes would never go live), but cannot browse history or restore
// past snapshots. We surface that with a small "Pro" pill on the
// History button which opens the lock popover on click.

import { useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  History,
  Lock,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { usePortal } from "@/lib/portal-store"
import { usePlan } from "@/lib/use-plan"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { flushTenantStateSync } from "@/lib/tenant-state-sync"
import { uploadDataUrl } from "@/lib/upload-asset"

export function PublishBar() {
  const {
    slug,
    config,
    hasUnpublishedChanges,
    lastPublishedAt,
    versions,
    publishDraft,
    restoreVersion,
    deleteVersion,
    updateConfig,
  } = usePortal()
  const { isAllowed } = usePlan()
  const confirm = useConfirm()
  const versioningAllowed = isAllowed("marketingTools") // paid-only proxy
  const [showPublish, setShowPublish] = useState(false)
  const [label, setLabel] = useState("")
  const [busy, setBusy] = useState(false)

  const onPublish = async () => {
    setBusy(true)
    try {
      // If the share card is still a base64 data URL (generated before
      // the CDN upload flow existed), push it to R2 first so the
      // public site serves a real CDN URL, not a bloated data string.
      // We build the updated config directly here rather than calling
      // updateConfig() (which triggers stampEdited and an async React
      // state update) — then pass the patched config to publishDraft
      // via the store's updateConfig+tick pattern below.
      const ogImg = config.brand?.ogImage
      if (ogImg && ogImg.startsWith("data:")) {
        try {
          const ogSlug = (config.brand?.siteName || "share")
            .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)
          const cdnUrl = await uploadDataUrl(ogImg, `${ogSlug}-og`, "workspace")
          // Update config via store so it persists, then wait two ticks
          // for React to flush the state update before publishDraft captures
          // the snapshot — otherwise publishDraft still sees the data: URL.
          updateConfig({ brand: { ...config.brand, ogImage: cdnUrl } })
          await new Promise((r) => setTimeout(r, 50))
        } catch {
          // Non-fatal — publish proceeds with the data URL.
        }
      }
      const version = publishDraft(label || undefined)
      await flushTenantStateSync(slug)
      toast.success("Changes published.", {
        description: version.label,
      })
      setShowPublish(false)
      setLabel("")
    } finally {
      setBusy(false)
    }
  }

  const onRestore = async (id: string, niceLabel: string) => {
    const ok = await confirm({
      title: `Restore to "${niceLabel}"?`,
      description:
        "Both your draft and the public site will be set to this version. Your current draft will be overwritten — publish first if you want to keep it.",
      confirmLabel: "Restore",
    })
    if (!ok) return
    restoreVersion(id)
    await flushTenantStateSync(slug)
    toast.success("Restored.")
  }

  const onDelete = async (id: string, niceLabel: string) => {
    const ok = await confirm({
      title: `Delete "${niceLabel}" from history?`,
      description:
        "Removes this snapshot. Doesn't change what's currently live.",
      destructive: true,
      confirmLabel: "Delete",
    })
    if (!ok) return
    deleteVersion(id)
    await flushTenantStateSync(slug)
    toast.success("Version removed.")
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-3xl items-center gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur transition-all",
          hasUnpublishedChanges
            ? "border-amber-500/40 ring-1 ring-amber-500/20"
            : "border-border/60",
        )}
      >
        {/* Status icon + text */}
        <div className="flex flex-1 items-center gap-2 text-sm">
          {hasUnpublishedChanges ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
              <span className="font-medium">Unpublished changes</span>
              <span className="hidden text-muted-foreground sm:inline">
                — visitors still see {lastPublishedAt ? "the last published version" : "the default"}.
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-medium">Up to date</span>
              {lastPublishedAt && (
                <span className="hidden text-muted-foreground sm:inline">
                  · last published {timeAgo(lastPublishedAt)}
                </span>
              )}
            </>
          )}
        </div>

        {/* History trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
              {!versioningAllowed && (
                <span className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                  <Lock className="h-2.5 w-2.5" /> Pro
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Publish history</SheetTitle>
              <SheetDescription>
                The last 3 months of published versions. Restore to roll
                the public site back, or delete to clean up.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 overflow-y-auto px-4 pb-12">
              {!versioningAllowed && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    Version history is a Pro feature
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Starter can publish, but only paid plans can browse
                    past versions and restore. Upgrade to keep a 3-month
                    safety net on every change.
                  </p>
                  <Button asChild size="sm" className="mt-2 w-full gap-1.5">
                    <Link href="/dashboard/billing">
                      Upgrade <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )}
              {versions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No published versions yet.
                </div>
              ) : (
                versions.map((v, i) => (
                  <div
                    key={v.id}
                    className={cn(
                      "rounded-lg border bg-card p-3",
                      i === 0 ? "border-success/40 ring-1 ring-success/20" : "border-border/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{v.label}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(v.takenAt).toLocaleString()}
                          {i === 0 && (
                            <span className="ml-1 rounded-full bg-success/15 px-1.5 py-0 text-[9px] font-bold uppercase text-success">
                              Live
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!versioningAllowed || i === 0}
                        onClick={() => onRestore(v.id, v.label)}
                        className="gap-1"
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!versioningAllowed}
                        onClick={() => onDelete(v.id, v.label)}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Publish button */}
        <Button
          size="sm"
          onClick={() => setShowPublish(true)}
          disabled={!hasUnpublishedChanges}
          className="gap-1.5"
        >
          {hasUnpublishedChanges && <Upload className="h-4 w-4" />}
          {hasUnpublishedChanges ? "Publish changes" : "Published"}
        </Button>
      </div>

      <Dialog open={showPublish} onOpenChange={setShowPublish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish to your public site?</DialogTitle>
            <DialogDescription>
              Your draft will replace what visitors see at your portal.
              You can restore from history within 3 months if anything
              looks wrong.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="version-label">Version label (optional)</Label>
              <Input
                id="version-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Summer 2026 launch"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Shows up in history so you can find this version later.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span className="text-muted-foreground">
                This is live the moment you publish. Your students may
                start seeing the new content right away.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublish(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={onPublish} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Publish now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function timeAgo(iso: string): string {
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`
  return `${Math.round(sec / 86400)}d ago`
}
