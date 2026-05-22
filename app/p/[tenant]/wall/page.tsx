"use client"

// Public Wall of Love — featured student wins, testimonials, demo
// videos. Sources from the same wall-store the dashboard uses. Only
// items marked `featured` show by default; everything visible to
// admins when ?all=1.

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { ExternalLink, Heart, Image as ImageIcon, Quote as QuoteIcon, Video } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWall, type WallEntry } from "@/lib/wall-store"
import { useLMS } from "@/lib/lms-store"
import { WallReactions, useReactionIdentity } from "@/components/wall/wall-reactions"

export default function PortalWallPage() {
  const { entries, reactToEntry } = useWall()
  const { courses, currentUser } = useLMS()
  const who = useReactionIdentity(currentUser?.id ?? null)
  const search = useSearchParams()
  const showAll = search?.get("all") === "1"

  const visible = useMemo(() => {
    const list = showAll ? entries : entries.filter((e) => e.featured)
    return list.slice().sort((a, b) => {
      const sa = a.featured ? 0 : 1
      const sb = b.featured ? 0 : 1
      if (sa !== sb) return sa - sb
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    })
  }, [entries, showAll])

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Heart className="h-3.5 w-3.5" />
            Wall of Love
          </div>
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            Wins, words, and proof
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
            Student outcomes, testimonials, demo videos — straight from the people who took the courses.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nothing on the wall yet — featured items will land here as the community grows.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((entry) => (
              <WallTile
                key={entry.id}
                entry={entry}
                courseTitle={courses.find((c) => c.id === entry.courseId)?.title}
                who={who}
                onReact={(emoji) => reactToEntry(entry.id, emoji, who)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function WallTile({
  entry,
  courseTitle,
  who,
  onReact,
}: {
  entry: WallEntry
  courseTitle?: string
  who: string
  onReact: (emoji: string) => void
}) {
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="space-y-3 p-0">
        {entry.kind === "image" && entry.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.url} alt={entry.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
        )}
        {entry.kind === "video" && entry.url && (
          <video src={entry.url} controls className="aspect-video w-full bg-black" />
        )}
        {entry.kind === "link" && entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border-b border-border bg-muted/40 p-4 text-sm font-medium text-primary hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" />
            Open link
          </a>
        )}
        <div className="space-y-2 p-4">
          {entry.kind === "quote" && (
            <QuoteIcon className="h-5 w-5 text-primary" />
          )}
          {entry.kind === "image" && !entry.caption && (
            <ImageIcon className="h-5 w-5 text-primary" />
          )}
          {entry.kind === "video" && !entry.caption && (
            <Video className="h-5 w-5 text-primary" />
          )}
          {entry.caption && (
            <p className="text-sm leading-relaxed text-foreground/90">{entry.caption}</p>
          )}
          {(entry.studentName || courseTitle || entry.vibe) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              {entry.studentName && <span className="font-medium text-foreground">{entry.studentName}</span>}
              {courseTitle && <Badge variant="outline">{courseTitle}</Badge>}
              {entry.vibe && <Badge variant="outline">{entry.vibe}</Badge>}
            </div>
          )}
          <div className="pt-2">
            <WallReactions
              reactions={entry.reactions}
              who={who}
              onToggle={onReact}
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
