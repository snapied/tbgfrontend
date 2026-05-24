"use client"

// Surfaces teacher-published announcements to enrolled students.
// Until now the dashboard authored them but no public surface
// rendered them — so they never reached students.
//
// Rules:
//   • status === "published" only (drafts and archived stay hidden)
//   • courseId match OR courseId unset (workspace-wide global)
//   • newest first, then by priority (urgent floats up within the
//     same day)
//   • per-student dismissal is local-only (localStorage), so an
//     announcement doesn't keep nagging a student who has read it
//
// Lives in components/learn so it can be reused by the lesson player
// (top of the main content area) and by the empty-canvas state.

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Bell, Megaphone, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLMS, type Announcement } from "@/lib/lms-store"

const DISMISSED_KEY = "thebigclass.announcements.dismissed.v1"

const PRIORITY_RANK: Record<Announcement["priority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
}

const PRIORITY_STYLES: Record<
  Announcement["priority"],
  { container: string; icon: string; iconComponent: React.ComponentType<{ className?: string }> }
> = {
  urgent: {
    container: "border-destructive/40 bg-destructive/5",
    icon: "text-destructive",
    iconComponent: AlertTriangle,
  },
  high: {
    container: "border-accent/50 bg-accent/5",
    icon: "text-accent",
    iconComponent: Bell,
  },
  normal: {
    container: "border-primary/30 bg-primary/5",
    icon: "text-primary",
    iconComponent: Megaphone,
  },
  low: {
    container: "border-border bg-muted/30",
    icon: "text-muted-foreground",
    iconComponent: Megaphone,
  },
}

interface Props {
  courseId: string
  // Visual variant — "card" is the full surface; "inline" is a
  // single-row compact pill suitable for embedding under a header.
  variant?: "card" | "inline"
}

export function CourseAnnouncements({ courseId, variant = "card" }: Props) {
  const { announcements, getUserById } = useLMS()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  // Hydrate dismissed ids from localStorage. SSR-safe: only runs in
  // the effect, never on server, so the initial render matches what
  // would be produced on the server.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISSED_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed)) setDismissed(new Set(parsed))
    } catch {
      /* ignore — bad JSON or quota error, treat as no dismissals */
    }
  }, [])

  const visible = useMemo(() => {
    return announcements
      .filter((a) => a.status === "published")
      .filter((a) => !a.courseId || a.courseId === courseId)
      .filter((a) => !dismissed.has(a.id))
      .sort((a, b) => {
        // Urgent / high first, then newest within same priority. Uses
        // publishedAt when set, falling back to createdAt so drafts
        // published immediately still sort correctly.
        const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        if (pr !== 0) return pr
        const at = new Date(a.publishedAt ?? a.createdAt).getTime()
        const bt = new Date(b.publishedAt ?? b.createdAt).getTime()
        return bt - at
      })
  }, [announcements, courseId, dismissed])

  if (visible.length === 0) return null

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      try {
        window.localStorage.setItem(
          DISMISSED_KEY,
          JSON.stringify(Array.from(next)),
        )
      } catch {
        /* ignore quota */
      }
      return next
    })
  }

  if (variant === "inline") {
    // Compact one-liner — surfaces the top-priority announcement only.
    // Used by sticky chrome bars where we can't afford much vertical
    // space; the full list is still reachable from the main canvas.
    const top = visible[0]
    const style = PRIORITY_STYLES[top.priority]
    const Icon = style.iconComponent
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
          style.container,
        )}
      >
        <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", style.icon)} />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{top.title}</span>
          {top.content && (
            <span className="text-muted-foreground"> — {top.content}</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => dismiss(top.id)}
          aria-label="Dismiss announcement"
          className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-background/60 hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Announcements
      </h2>
      <ul className="space-y-2">
        {visible.map((a) => {
          const style = PRIORITY_STYLES[a.priority]
          const Icon = style.iconComponent
          const author = getUserById(a.authorId)
          const when = new Date(a.publishedAt ?? a.createdAt)
          return (
            <li
              key={a.id}
              className={cn(
                "rounded-lg border p-4 transition",
                style.container,
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background/70",
                    style.icon,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="font-semibold">{a.title}</p>
                    {a.priority !== "normal" && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          a.priority === "urgent" && "bg-destructive text-destructive-foreground",
                          a.priority === "high" && "bg-accent text-accent-foreground",
                          a.priority === "low" && "bg-muted text-muted-foreground",
                        )}
                      >
                        {a.priority}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                    {a.content}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {author?.name ?? "Instructor"} · {when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {!a.courseId && " · Workspace announcement"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(a.id)}
                  aria-label={`Dismiss "${a.title}"`}
                  className="shrink-0 rounded-full p-1 text-muted-foreground/60 hover:bg-background/60 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
