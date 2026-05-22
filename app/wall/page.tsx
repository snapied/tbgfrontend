"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ExternalLink, Heart, Link as LinkIcon, Pin, Quote as QuoteIcon, Sparkles, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useWall, type WallEntry } from "@/lib/wall-store"
import { useTenant } from "@/lib/tenant-store"
import { useLMS } from "@/lib/lms-store"
import { detectVideoProvider, videoEmbedUrl } from "@/lib/lesson-utils"
import { Logo } from "@/components/brand/logo"

const VIBE: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  love:      { icon: <Heart className="h-3 w-3" />,    cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300",       label: "Love" },
  win:       { icon: <Trophy className="h-3 w-3" />,   cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",    label: "Win" },
  creative:  { icon: <Sparkles className="h-3 w-3" />, cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300", label: "Creative" },
  milestone: { icon: <Pin className="h-3 w-3" />,      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", label: "Milestone" },
}

export default function PublicWallPage() {
  const { entries } = useWall()
  const { currentTenant } = useTenant()
  const { courses } = useLMS()

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [entries])

  const tenantName = currentTenant?.name ?? "The Big Class"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex">
            <Logo size="sm" />
          </Link>
          <Link
            href={currentTenant ? `/?tenant=${currentTenant.slug}` : "/"}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to {tenantName}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <Heart className="h-3 w-3 fill-current" /> Wall of Love
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            What students are making at <span className="text-primary">{tenantName}</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            A living showcase of student work, wins, and words. No filters, no edits — just the good stuff.
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
            <Heart className="mx-auto h-10 w-10 text-rose-400" />
            <p className="mt-3 font-semibold">The wall is just getting started.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Come back soon — teachers are about to share what the students have been creating.
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {sorted.map((e) => (
              <PublicCard
                key={e.id}
                entry={e}
                courseTitle={courses.find((c) => c.id === e.courseId)?.title}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function PublicCard({ entry, courseTitle }: { entry: WallEntry; courseTitle?: string }) {
  const vibe = entry.vibe ? VIBE[entry.vibe] : undefined
  return (
    <div
      className={cn(
        "mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        entry.featured ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
      )}
    >
      <Media entry={entry} />
      <div className="space-y-2 p-4">
        <div className="flex items-start gap-2">
          {entry.kind === "quote" && (
            <QuoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          )}
          <p className={cn("flex-1 text-sm leading-relaxed", entry.kind === "quote" && "italic")}>
            {entry.caption}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {vibe && (
            <Badge variant="outline" className={cn("gap-1 border-0", vibe.cls)}>
              {vibe.icon}{vibe.label}
            </Badge>
          )}
          {entry.studentName && (
            <span className="text-muted-foreground">— {entry.studentName}</span>
          )}
          {courseTitle && (
            <Badge variant="secondary" className="text-[10px]">{courseTitle}</Badge>
          )}
          {entry.featured && (
            <Badge className="gap-1 bg-primary text-primary-foreground text-[10px]">
              <Pin className="h-2.5 w-2.5" /> Featured
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

function Media({ entry }: { entry: WallEntry }) {
  if (entry.kind === "image" && entry.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={entry.url} alt={entry.caption} loading="lazy" className="block h-auto w-full max-w-full" />
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
