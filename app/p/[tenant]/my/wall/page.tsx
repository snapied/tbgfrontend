"use client"

// Student-side Wall of Love. Read-only (students don't post here —
// only the teacher curates) but every card has emoji reactions so
// the cohort can cheer each other on. Reactions persist via the
// wall-store's reactToEntry mutation; the same reactions render on
// the public /p/<slug>/wall page.

import { useMemo } from "react"
import {
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Quote as QuoteIcon,
  Sparkles,
  Video,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWall, type WallEntry } from "@/lib/wall-store"
import { useLMS } from "@/lib/lms-store"
import { WallReactions, useReactionIdentity } from "@/components/wall/wall-reactions"

export default function MyWallPage() {
  const { entries, reactToEntry } = useWall()
  const { courses, currentUser } = useLMS()
  const who = useReactionIdentity(currentUser?.id ?? null)

  const visible = useMemo(
    () =>
      entries
        .slice()
        .sort((a, b) => {
          const sa = a.featured ? 0 : 1
          const sb = b.featured ? 0 : 1
          if (sa !== sb) return sa - sb
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
        }),
    [entries],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            <Heart className="h-3 w-3" />
            Wall of Love
          </div>
          <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight">
            Wins from the cohort
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What other students made, said, and pulled off. React to cheer them on.
          </p>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">Nothing on the wall yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your teacher highlights wins here — check back after the first round.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((entry) => (
            <StudentWallTile
              key={entry.id}
              entry={entry}
              courseTitle={courses.find((c) => c.id === entry.courseId)?.title}
              who={who}
              onReact={(emoji) => reactToEntry(entry.id, emoji, who)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StudentWallTile({
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
          <img
            src={entry.url}
            alt={entry.caption ?? ""}
            className="aspect-[4/3] w-full object-cover"
          />
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
          {entry.kind === "quote" && <QuoteIcon className="h-5 w-5 text-primary" />}
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
              {entry.studentName && (
                <span className="font-medium text-foreground">{entry.studentName}</span>
              )}
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
