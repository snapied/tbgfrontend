"use client"

// Presentations dashboard — list all decks (standalone + class recaps),
// create new presentations from scratch, and open the slide presenter.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"

import {
  Download,
  FileText,
  Loader2,
  Play,
  Plus,
  Presentation as PresentationIcon,
  RefreshCw,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { apiBase } from "@/lib/jitsi"
import { toast } from "sonner"
import { useConfirm } from "@/lib/use-confirm"
import { cn } from "@/lib/utils"
import { SlideThumb } from "@/components/presentations/slide-presenter"
import { pushToTrash } from "@/lib/trash"
import { toastUndoableDelete } from "@/lib/toast-undo"

interface PresentationInfo {
  id: number
  roomCode: string | null
  title: string
  status: "pending" | "generating" | "ready" | "failed"
  fileUrl: string | null
  fileSizeBytes: number | null
  slideCount: number | null
  slides: {
    previews?: string[]
    fullHtml?: string
  } | null
  meta: {
    sources: string[]
    generatedAt: string
    conceptCount: number
    hasTranscript: boolean
    hasWhiteboards: boolean
  } | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

const CARD_ACCENTS = [
  "from-violet-50 via-purple-50 to-indigo-100 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-indigo-900/40",
  "from-rose-50 via-pink-50 to-fuchsia-100 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-fuchsia-900/40",
  "from-emerald-50 via-teal-50 to-cyan-100 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-900/40",
  "from-amber-50 via-orange-50 to-yellow-100 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-900/40",
  "from-sky-50 via-blue-50 to-indigo-100 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-indigo-900/40",
]

export default function PresentationsPage() {
  const confirm = useConfirm()
  const [search, setSearch] = useState("")
  const [presentations, setPresentations] = useState<PresentationInfo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      const res = await fetch(`${apiBase()}/api/presentations/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
      if (!res.ok) {
        if (res.status === 401) toast.error("Session expired — please log in again")
        setLoading(false)
        return
      }
      const data = await res.json()
      setPresentations(data.presentations ?? [])
    } catch {
      // Network error — backend might be down. Don't show error on initial load.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Poll while any presentation is generating
  useEffect(() => {
    const hasGenerating = presentations.some(
      (p) => p.status === "generating",
    )
    if (!hasGenerating) return
    const interval = setInterval(fetchAll, 4000)
    return () => clearInterval(interval)
  }, [presentations, fetchAll])

  const filtered = useMemo(
    () => fuzzySearch(presentations, search, (p) => [p.title]),
    [presentations, search],
  )


  const handleDelete = async (p: PresentationInfo) => {
    const ok = await confirm({
      title: `Delete "${p.title}"?`,
      description: "Moved to Trash — you can restore it within 7 days.",
      destructive: true,
      confirmLabel: "Delete",
    })
    if (!ok) return

    // Soft delete — push to trash first for undo
    pushToTrash({
      id: String(p.id),
      kind: "presentation",
      label: p.title,
      payload: p,
    })
    setPresentations((prev) => prev.filter((x) => x.id !== p.id))
    toastUndoableDelete({
      kind: "presentation",
      ids: String(p.id),
      label: p.title,
      itemNoun: "presentation",
    })

    // Hard delete from backend (async, non-blocking)
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      await fetch(`${apiBase()}/api/presentations/by-id/${p.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
    } catch { /* trash has the backup */ }
  }

  const readyCount = presentations.filter((p) => p.status === "ready").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            Presentations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-generated slide decks.{" "}
            {readyCount > 0 && (
              <span className="text-foreground/60">
                {readyCount} presentation{readyCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/presentations/new">
            <Plus className="h-4 w-4" />
            New presentation
          </Link>
        </Button>
      </div>

      {/* Search */}
      {presentations.length > 0 && (
        <SearchInput
          pageId="presentations"
          value={search}
          onChange={setSearch}
          placeholder="Search presentations..."
          ariaLabel="Search presentations"
          shortcutDescription="Focus search"
          className="max-w-md"
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : presentations.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/30">
            <PresentationIcon className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-lg font-bold">No presentations yet</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Create a professional slide deck in seconds. Just enter a
            topic and AI builds the entire presentation — title slide,
            key concepts, takeaways, and closing.
          </p>
          <Button asChild className="mt-6 gap-2">
            <Link href="/dashboard/presentations/new">
              <Sparkles className="h-4 w-4" />
              Create your first presentation
            </Link>
          </Button>
        </div>
      ) : (
        /* Card grid */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* New tile */}
          <Link
            href="/dashboard/presentations/new"
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/40 py-6 text-center transition-all hover:border-primary/50 hover:bg-primary/[0.04]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              New presentation
            </span>
          </Link>

          {filtered.map((p, i) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
            >
              {/* Slide previews strip */}
              <Link
                href={`/dashboard/presentations/${p.id}`}
                className="relative block overflow-hidden"
              >
                {p.status === "ready" && p.slides?.previews && p.slides.previews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-0.5 overflow-hidden bg-slate-900 p-1">
                    {p.slides.previews.slice(0, 4).map((previewHtml, si) => (
                      <div
                        key={si}
                        className="relative aspect-video overflow-hidden rounded-[2px] bg-slate-800"
                      >
                        <SlideThumb previewHtml={previewHtml} className="w-full h-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "aspect-[4/3] w-full bg-gradient-to-br flex items-center justify-center",
                      CARD_ACCENTS[i % CARD_ACCENTS.length],
                    )}
                  >
                    {p.status === "generating" ? (
                      <Loader2 className="h-8 w-8 animate-spin text-foreground/20" />
                    ) : p.status === "failed" ? (
                      <PresentationIcon className="h-8 w-8 text-destructive/30" />
                    ) : (
                      <PresentationIcon className="h-8 w-8 text-foreground/15" />
                    )}
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                  <span className="scale-90 rounded-lg bg-background/90 px-3 py-1 text-xs font-semibold shadow opacity-0 backdrop-blur-sm transition-all group-hover:scale-100 group-hover:opacity-100">
                    {p.status === "ready" ? "Open & present →" : "View →"}
                  </span>
                </div>
              </Link>

              {/* Footer */}
              <div className="flex items-start justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-[13px] font-semibold leading-tight">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {p.status === "generating" && (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-violet-500/40 bg-violet-500/5 text-violet-600"
                      >
                        Generating...
                      </Badge>
                    )}
                    {p.status === "failed" && (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-destructive/40 text-destructive"
                      >
                        Failed
                      </Badge>
                    )}
                    {p.status === "ready" && (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-success/40 bg-success/5 text-success"
                      >
                        {p.slideCount} slides
                      </Badge>
                    )}
                    {p.roomCode && (
                      <span className="text-[10px] text-muted-foreground">
                        Class recap
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {relativeTime(p.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {p.status === "ready" && p.fileUrl && (
                    <a
                      href={p.fileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download .pptx"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(p)}
                    title="Delete"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

