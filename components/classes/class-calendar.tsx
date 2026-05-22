"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Paperclip,
  Radio,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LiveSession } from "@/lib/lms-store"
import {
  computeSessionStatus,
  formatSessionWhen,
  providerLabel,
} from "@/lib/live-session-utils"

type CalendarView = "month" | "week" | "day"

interface ClassCalendarProps {
  sessions: LiveSession[]
  /** Optional course title lookup for chip sublines. */
  courseTitle?: (courseId: string) => string | undefined
}

// Hour-axis bounds (6 AM - 10 PM). Sessions outside this range still render
// but get pinned to the edges so the grid stays readable.
const DAY_START_HOUR = 6
const DAY_END_HOUR = 22
const HOUR_PX = 48  // each hour row is this tall

export function ClassCalendar({ sessions, courseTitle }: ClassCalendarProps) {
  const today = new Date()
  const [view, setView] = useState<CalendarView>("month")
  const [cursor, setCursor] = useState<Date>(today)

  // Index sessions by yyyy-mm-dd for fast per-day lookup across all views.
  const byDay = useMemo(() => {
    const m = new Map<string, LiveSession[]>()
    for (const s of sessions) {
      const k = dayKey(new Date(s.scheduledAt))
      const arr = m.get(k) ?? []
      arr.push(s)
      m.set(k, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    return m
  }, [sessions])

  const navigate = (dir: -1 | 0 | 1) => {
    if (dir === 0) { setCursor(new Date()); return }
    const d = new Date(cursor)
    if (view === "month") d.setMonth(d.getMonth() + dir)
    else if (view === "week") d.setDate(d.getDate() + 7 * dir)
    else d.setDate(d.getDate() + dir)
    setCursor(d)
  }

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        {/* Header: title + view toggle + prev/today/next */}
        <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold tabular-nums">
            {headerLabel(view, cursor)}
          </h2>
          <div className="flex items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => navigate(0)}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </header>

        {view === "month" && (
          <MonthGrid cursor={cursor} byDay={byDay} courseTitle={courseTitle} onJumpToDay={(d) => { setCursor(d); setView("day") }} />
        )}
        {view === "week" && (
          <HourGrid days={weekDays(cursor)} byDay={byDay} courseTitle={courseTitle} highlightToday />
        )}
        {view === "day" && (
          <HourGrid days={[stripTime(cursor)]} byDay={byDay} courseTitle={courseTitle} fullWidth />
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// View toggle
// ============================================================
function ViewToggle({ value, onChange }: { value: CalendarView; onChange: (v: CalendarView) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      {(["month", "week", "day"] as const).map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
            value === v
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/40",
            v !== "month" && "border-l border-border",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Month grid (6 rows × 7 cols, with a right rail for the selected day)
// ============================================================
function MonthGrid({
  cursor, byDay, courseTitle, onJumpToDay,
}: {
  cursor: Date
  byDay: Map<string, LiveSession[]>
  courseTitle?: (id: string) => string | undefined
  onJumpToDay: (d: Date) => void
}) {
  const today = new Date()
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const cells = useMemo(() => buildMonthCells(monthStart), [monthStart])
  const monthCount = cells.reduce((acc, c) => acc + (c.inMonth ? (byDay.get(dayKey(c.date))?.length ?? 0) : 0), 0)
  const selectedSessions = byDay.get(dayKey(selectedDate)) ?? []

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          {monthCount} session{monthCount === 1 ? "" : "s"} this month
        </p>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            const k = dayKey(cell.date)
            const items = byDay.get(k) ?? []
            const isToday = sameDay(cell.date, today)
            const isSelected = sameDay(cell.date, selectedDate)
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(cell.date)}
                onDoubleClick={() => onJumpToDay(cell.date)}
                className={cn(
                  "flex min-h-[78px] flex-col items-stretch gap-0.5 rounded-md border p-1 text-left transition-colors",
                  !cell.inMonth && "opacity-40",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:bg-muted/40",
                )}
                title="Click to select · double-click to open day view"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums",
                      isToday && "bg-primary font-bold text-primary-foreground",
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                  {items.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{items.length - 3}</span>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {items.slice(0, 3).map(s => <li key={s.id}><ChipPill session={s} /></li>)}
                </ul>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day */}
      <div className="h-fit lg:sticky lg:top-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {sameDay(selectedDate, today) ? "Today" : ""}
          </p>
          <h3 className="text-base font-semibold">
            {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </h3>
        </div>
        <div className="mt-2 space-y-2">
          {selectedSessions.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
              No classes scheduled.
            </p>
          ) : (
            selectedSessions.map(s => (
              <SessionMiniCard key={s.id} session={s} courseTitle={courseTitle?.(s.courseId)} />
            ))
          )}
        </div>
        <div className="mt-3">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onJumpToDay(selectedDate)}>
            Open hour view →
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Hour grid (used for both week and day views)
// ============================================================
function HourGrid({
  days, byDay, courseTitle, highlightToday, fullWidth,
}: {
  days: Date[]
  byDay: Map<string, LiveSession[]>
  courseTitle?: (id: string) => string | undefined
  highlightToday?: boolean
  fullWidth?: boolean
}) {
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i)
  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX
  const today = new Date()

  // "Now" line — only show on days that include today.
  const nowMinutesFromStart = (today.getHours() - DAY_START_HOUR) * 60 + today.getMinutes()
  const nowY = (nowMinutesFromStart / 60) * HOUR_PX
  const nowVisible = nowMinutesFromStart >= 0 && nowMinutesFromStart <= (DAY_END_HOUR - DAY_START_HOUR) * 60

  return (
    <div className="overflow-auto rounded-md border border-border">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `52px repeat(${days.length}, ${fullWidth ? "1fr" : "minmax(120px, 1fr)"})`,
        }}
      >
        {/* Top-left blank corner */}
        <div className="sticky top-0 z-10 h-10 border-b border-r border-border bg-card" />
        {/* Day headers */}
        {days.map((d) => {
          const isToday = sameDay(d, today)
          return (
            <div
              key={dayKey(d)}
              className={cn(
                "sticky top-0 z-10 flex h-10 items-center justify-center gap-1.5 border-b border-r border-border bg-card text-xs font-medium",
                highlightToday && isToday && "bg-primary/5",
              )}
            >
              <span className={cn(
                "uppercase tracking-wide text-muted-foreground",
                isToday && "text-primary",
              )}>
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full tabular-nums",
                  isToday && "bg-primary font-bold text-primary-foreground",
                )}
              >
                {d.getDate()}
              </span>
            </div>
          )
        })}

        {/* Hour label column */}
        <div className="border-r border-border" style={{ height: totalHeight }}>
          {hours.slice(0, -1).map((h) => (
            <div
              key={h}
              className="flex h-12 items-start justify-end pr-1.5 pt-0.5 text-[10px] text-muted-foreground"
            >
              {formatHour(h)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d) => {
          const items = byDay.get(dayKey(d)) ?? []
          const isToday = sameDay(d, today)
          return (
            <div
              key={dayKey(d)}
              className={cn("relative border-r border-border", isToday && highlightToday && "bg-primary/[0.03]")}
              style={{ height: totalHeight }}
            >
              {/* Hour lines */}
              {hours.slice(0, -1).map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-b border-border/50"
                  style={{ top: i * HOUR_PX + HOUR_PX, height: 0 }}
                />
              ))}
              {/* Half-hour ticks */}
              {hours.slice(0, -1).map((_, i) => (
                <div
                  key={`half-${i}`}
                  className="absolute inset-x-0 border-b border-dashed border-border/30"
                  style={{ top: i * HOUR_PX + HOUR_PX / 2, height: 0 }}
                />
              ))}

              {/* Sessions placed by time */}
              {items.map(s => <SessionBlock key={s.id} session={s} courseTitle={courseTitle?.(s.courseId)} />)}

              {/* "Now" line */}
              {isToday && nowVisible && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10"
                  style={{ top: nowY }}
                >
                  <div className="relative h-px bg-destructive">
                    <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SessionBlock({ session, courseTitle }: { session: LiveSession; courseTitle?: string }) {
  const start = new Date(session.scheduledAt)
  const startMin = (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes()
  const clampedStart = Math.max(0, Math.min(startMin, (DAY_END_HOUR - DAY_START_HOUR) * 60))
  const endMin = startMin + session.durationMinutes
  const clampedEnd = Math.max(0, Math.min(endMin, (DAY_END_HOUR - DAY_START_HOUR) * 60))
  const top = (clampedStart / 60) * HOUR_PX
  const height = Math.max(24, ((clampedEnd - clampedStart) / 60) * HOUR_PX - 2)

  const status = computeSessionStatus(session)
  const cancelled = session.status === "cancelled"
  const isLive = status === "live"
  const ended = status === "ended"
  const wasHeld = session.wasHeld === true || (ended && !cancelled)

  return (
    <Link
      href={`/dashboard/classes/${session.id}`}
      className={cn(
        "absolute left-1 right-1 overflow-hidden rounded-md border px-1.5 py-1 text-[10px] font-medium leading-tight transition-shadow hover:shadow-md",
        cancelled && "border-border bg-muted text-muted-foreground line-through",
        !cancelled && isLive && "border-destructive bg-destructive text-destructive-foreground",
        !cancelled && !isLive && wasHeld && "border-success/40 bg-success/15 text-foreground",
        !cancelled && !isLive && !wasHeld && "border-primary/40 bg-primary/10 text-foreground",
      )}
      style={{ top, height, zIndex: 5 }}
      title={`${session.title} · ${formatSessionWhen(session.scheduledAt)} · ${session.durationMinutes} min`}
    >
      <div className="flex items-center gap-1">
        {isLive && <Radio className="h-2.5 w-2.5 shrink-0 animate-pulse" />}
        <span className="truncate">
          {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {session.title}
        </span>
      </div>
      {height >= 40 && courseTitle && (
        <div className="mt-0.5 truncate text-[9px] opacity-70">{courseTitle}</div>
      )}
    </Link>
  )
}

// ============================================================
// Chips / mini cards (month view)
// ============================================================
function ChipPill({ session }: { session: LiveSession }) {
  const status = computeSessionStatus(session)
  const isLive = status === "live"
  const cancelled = session.status === "cancelled"
  const wasHeld = session.wasHeld === true || (status === "ended" && !cancelled)
  const time = new Date(session.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  return (
    <span
      className={cn(
        "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium",
        cancelled
          ? "bg-muted text-muted-foreground line-through"
          : isLive
            ? "bg-destructive text-destructive-foreground"
            : wasHeld
              ? "bg-success/15 text-success"
              : "bg-primary/10 text-primary",
      )}
      title={`${session.title} · ${formatSessionWhen(session.scheduledAt)}`}
    >
      {isLive && <Radio className="h-2.5 w-2.5 shrink-0 animate-pulse" />}
      <span className="truncate">{time} {session.title}</span>
    </span>
  )
}

function SessionMiniCard({ session, courseTitle }: { session: LiveSession; courseTitle?: string }) {
  const status = computeSessionStatus(session)
  const cancelled = session.status === "cancelled"
  const ended = status === "ended"
  const live = status === "live"
  const wasHeld = session.wasHeld === true || (ended && !cancelled)
  const hasRecap = !!(session.summary || session.recordingUrl || (session.materials && session.materials.length > 0))
  const materialCount = session.materials?.length ?? 0

  return (
    <Link
      href={`/dashboard/classes/${session.id}`}
      className="block rounded-md border border-border/60 p-3 hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{session.title}</p>
          {courseTitle && (
            <p className="truncate text-[11px] text-muted-foreground">{courseTitle}</p>
          )}
        </div>
        {cancelled ? (
          <Badge variant="outline">Cancelled</Badge>
        ) : live ? (
          <Badge className="gap-1 bg-destructive text-destructive-foreground">
            <Radio className="h-3 w-3 animate-pulse" />
            Live
          </Badge>
        ) : wasHeld ? (
          <Badge className="gap-1 bg-success text-success-foreground">
            <CheckCircle2 className="h-3 w-3" />
            Held
          </Badge>
        ) : ended ? (
          <Badge variant="outline">Ended</Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Upcoming
          </Badge>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>{new Date(session.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {session.durationMinutes} min</span>
        <span>{providerLabel(session.provider)}</span>
        {session.recordingUrl && (
          <span className="inline-flex items-center gap-1 text-success"><Film className="h-3 w-3" />Recording</span>
        )}
        {materialCount > 0 && (
          <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{materialCount}</span>
        )}
        {hasRecap && (ended || wasHeld) && !session.recordingUrl && materialCount === 0 && session.summary && (
          <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />Notes</span>
        )}
      </div>
    </Link>
  )
}

// ============================================================
// Date helpers
// ============================================================
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function weekDays(cursor: Date): Date[] {
  // Sunday-anchored 7-day window containing `cursor`.
  const start = new Date(cursor)
  start.setDate(cursor.getDate() - cursor.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return stripTime(d)
  })
}
function formatHour(h: number): string {
  if (h === 0) return "12 AM"
  if (h === 12) return "Noon"
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}
function headerLabel(view: CalendarView, cursor: Date): string {
  if (view === "month") return cursor.toLocaleString(undefined, { month: "long", year: "numeric" })
  if (view === "day") {
    return cursor.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  }
  // week
  const week = weekDays(cursor)
  const a = week[0], b = week[6]
  if (a.getMonth() === b.getMonth()) {
    return `${a.toLocaleString(undefined, { month: "long" })} ${a.getDate()}–${b.getDate()}, ${a.getFullYear()}`
  }
  return `${a.toLocaleString(undefined, { month: "short", day: "numeric" })} – ${b.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
}

interface MonthCell { date: Date; inMonth: boolean }
function buildMonthCells(monthStart: Date): MonthCell[] {
  const out: MonthCell[] = []
  const firstDow = monthStart.getDay() // 0=Sun
  for (let i = firstDow; i > 0; i--) {
    const d = new Date(monthStart); d.setDate(monthStart.getDate() - i)
    out.push({ date: d, inMonth: false })
  }
  const month = monthStart.getMonth()
  const cursor = new Date(monthStart)
  while (cursor.getMonth() === month) {
    out.push({ date: new Date(cursor), inMonth: true })
    cursor.setDate(cursor.getDate() + 1)
  }
  while (out.length < 42) {
    const d = new Date(monthStart); d.setDate(monthStart.getDate() + (out.length - firstDow))
    out.push({ date: d, inMonth: false })
  }
  return out
}

