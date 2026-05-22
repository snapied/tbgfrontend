"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Calendar,
  Clock,
  ExternalLink,
  Radio,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"
import {
  computeSessionStatus,
  formatSessionWhen,
  providerLabel,
} from "@/lib/live-session-utils"

interface LiveClassesBannerProps {
  courseId: string
  studentId: string
}

export function LiveClassesBanner({ courseId, studentId }: LiveClassesBannerProps) {
  const { getSessionsForCourse, recordJoin } = useLMS()
  // Re-render once a minute so "live now" / "starts in" labels stay fresh.
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const sessions = useMemo(() => {
    const all = getSessionsForCourse(courseId)
    return all
      .filter((s) => {
        const status = computeSessionStatus(s)
        return status === "live" || status === "upcoming"
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 3)
  }, [getSessionsForCourse, courseId])

  if (sessions.length === 0) return null

  const handleJoin = (sessionId: string, url: string) => {
    // Write attendance first so the click is captured even if the popup
    // is blocked. Then open the meeting in a new tab.
    recordJoin(sessionId, studentId)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <section id="live-classes" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Live Classes
        </h2>
      </div>
      <div className="space-y-2">
        {sessions.map((s) => {
          const status = computeSessionStatus(s)
          const isLive = status === "live"
          return (
            <div
              key={s.id}
              id={`live-${s.id}`}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between",
                isLive
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isLive
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {isLive ? <Radio className="h-5 w-5 animate-pulse" /> : <Video className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{s.title}</p>
                    {isLive ? (
                      <Badge className="gap-1 bg-destructive text-destructive-foreground">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                        Live now
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Upcoming
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    {formatSessionWhen(s.scheduledAt)} · {s.durationMinutes} min · {providerLabel(s.provider)}
                  </p>
                  {s.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{s.description}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => handleJoin(s.id, s.meetingUrl)}
                variant={isLive ? "default" : "outline"}
                className="shrink-0"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {isLive ? "Join now" : "Open link"}
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
