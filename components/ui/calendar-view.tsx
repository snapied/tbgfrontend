"use client"

// CalendarView — generic month / week / day calendar that takes a flat
// list of CalendarEvent objects and renders them in the chosen layout.
//
// Why hand-roll instead of pulling FullCalendar / react-big-calendar:
//   • Bundle weight: those libs add 150+ KB; our needs (live classes,
//     publish dates, milestones) are simple enough that ~300 LOC here
//     beats the dependency surface.
//   • Style cohesion: we render with shadcn primitives + Tailwind so
//     the calendar matches the rest of the dashboard chrome.
//   • Multi-source events: aggregation lives outside the component;
//     callers compose events from any number of stores.
//
// The component is intentionally controlled — month/week navigation
// and view mode live in the parent so users can deep-link to a
// specific week (calendar?view=week&date=2026-05-23). Self-contained
// state is one prop change away if a consumer doesn't need that.

import { useMemo } from "react"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CalendarViewMode = "month" | "week" | "day"

export interface CalendarEvent {
  id: string
  /** ISO date or datetime. Events with no time component render as
   *  all-day chips at the top of their day. */
  startAt: string
  /** Optional end ISO. When present + same-day, week/day views block
   *  out the duration. Month view ignores duration (chips don't fit). */
  endAt?: string
  title: string
  /** Optional sub-label (e.g. course name under a class title). */
  subtitle?: string
  /** Colour token — picks a chip background. We map to a small
   *  palette rather than accept free-form hex so the calendar stays
   *  readable. Defaults to "blue". */
  tone?: "blue" | "green" | "amber" | "purple" | "rose" | "slate"
  /** Click handler — typically links to the artifact detail page. */
  onClick?: () => void
  /** Optional icon component (lucide). */
  Icon?: React.ComponentType<{ className?: string }>
  /** Right-side meta string (e.g. "75 enrolled"). */
  meta?: string
}

interface Props {
  /** ISO date string of the focused day. Month uses just the month +
   *  year; week uses the week containing this date; day uses this
   *  exact date. */
  date: string
  view: CalendarViewMode
  events: CalendarEvent[]
  onDateChange: (iso: string) => void
  onViewChange: (view: CalendarViewMode) => void
  /** Optional "today" handler — defaults to setting date to new Date(). */
  onToday?: () => void
  /** Week start: 0 = Sunday, 1 = Monday. Default Monday — matches
   *  the LMS audience expectations across India + Europe. US
   *  preference can be set per-tenant later. */
  weekStartsOn?: 0 | 1
}

// ---------- Date helpers ----------

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function startOfWeek(d: Date, weekStartsOn: 0 | 1): Date {
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  const out = new Date(d)
  out.setDate(d.getDate() - diff)
  out.setHours(0, 0, 0, 0)
  return out
}
function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(d.getDate() + n)
  return out
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function iso(d: Date): string {
  // Local-time YYYY-MM-DD for date-only storage. Avoids the
  // toISOString() "off-by-one in IST" trap on month boundaries.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}
function parseIsoLocal(s: string): Date {
  // Accept both YYYY-MM-DD and full ISO. For date-only we parse
  // explicitly to avoid the UTC midnight trap.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(s)
}

// ---------- Tone → class mapping ----------

const TONE_CLASSES: Record<NonNullable<CalendarEvent["tone"]>, string> = {
  blue: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  green: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  purple: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-300",
  rose: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300",
  slate: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
}

// ---------- Main component ----------

export function CalendarView({
  date,
  view,
  events,
  onDateChange,
  onViewChange,
  onToday,
  weekStartsOn = 1,
}: Props) {
  const focused = useMemo(() => parseIsoLocal(date), [date])

  // Compute the chunk of dates the view needs.
  const days: Date[] = useMemo(() => {
    if (view === "day") return [focused]
    if (view === "week") {
      const start = startOfWeek(focused, weekStartsOn)
      return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }
    // Month: grid starts on the weekStartsOn before (or on) the first
    // of the month, runs until we have a full 6-row grid (42 cells)
    // so the layout never reflows mid-month.
    const first = startOfMonth(focused)
    const last = endOfMonth(focused)
    const gridStart = startOfWeek(first, weekStartsOn)
    const len = Math.ceil(
      (last.getTime() - gridStart.getTime()) / (24 * 3600 * 1000) + 1,
    )
    const cells = Math.max(42, Math.ceil(len / 7) * 7)
    return Array.from({ length: cells }, (_, i) => addDays(gridStart, i))
  }, [focused, view, weekStartsOn])

  // Bucket events per day key for O(1) lookup during render.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const k = iso(parseIsoLocal(e.startAt))
      const list = map.get(k) ?? []
      list.push(e)
      map.set(k, list)
    }
    // Sort within each day by start time (events without a time
    // sort first as all-day).
    for (const list of map.values()) {
      list.sort((a, b) => {
        const at = a.startAt.includes("T") ? new Date(a.startAt).getTime() : 0
        const bt = b.startAt.includes("T") ? new Date(b.startAt).getTime() : 0
        return at - bt
      })
    }
    return map
  }, [events])

  const headerLabel = (() => {
    if (view === "month") {
      return focused.toLocaleString(undefined, { month: "long", year: "numeric" })
    }
    if (view === "week") {
      const start = days[0]
      const end = days[days.length - 1]
      const sameMonth = start.getMonth() === end.getMonth()
      return sameMonth
        ? `${start.toLocaleString(undefined, { month: "short" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
        : `${start.toLocaleString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleString(undefined, { month: "short", day: "numeric" })}, ${start.getFullYear()}`
    }
    return focused.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  })()

  const stepDate = (dir: -1 | 1) => {
    const next = new Date(focused)
    if (view === "month") next.setMonth(focused.getMonth() + dir)
    else if (view === "week") next.setDate(focused.getDate() + 7 * dir)
    else next.setDate(focused.getDate() + dir)
    onDateChange(iso(next))
  }
  const goToday = () => {
    if (onToday) {
      onToday()
      return
    }
    onDateChange(iso(new Date()))
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => stepDate(-1)} title="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => stepDate(1)} title="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="ml-2 font-serif text-lg font-bold tracking-tight">{headerLabel}</p>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-border bg-card">
          {(["month", "week", "day"] as CalendarViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={cn(
                "px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {view === "month" && (
        <MonthGrid
          days={days}
          eventsByDay={eventsByDay}
          focusedMonth={focused.getMonth()}
          weekStartsOn={weekStartsOn}
        />
      )}
      {view === "week" && <WeekGrid days={days} eventsByDay={eventsByDay} />}
      {view === "day" && <DayList day={days[0]} eventsByDay={eventsByDay} />}
    </div>
  )
}

// ---------- Month view ----------

function MonthGrid({
  days,
  eventsByDay,
  focusedMonth,
  weekStartsOn,
}: {
  days: Date[]
  eventsByDay: Map<string, CalendarEvent[]>
  focusedMonth: number
  weekStartsOn: 0 | 1
}) {
  const dayNames = useMemo(() => {
    const base = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return [...base.slice(weekStartsOn), ...base.slice(0, weekStartsOn)]
  }, [weekStartsOn])
  const today = new Date()
  // Max chips per cell before we render "+ N more". Tuned for the
  // ~110 px cell height that fits a 6-row grid in a 720 px viewport.
  const MAX_PER_CELL = 3

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {dayNames.map((n) => (
          <div key={n} className="px-2 py-1.5 text-center">{n}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const inMonth = d.getMonth() === focusedMonth
          const dayKey = iso(d)
          const list = eventsByDay.get(dayKey) ?? []
          const isToday = isSameDay(d, today)
          return (
            <div
              key={dayKey}
              className={cn(
                "min-h-[100px] border-b border-r border-border p-1.5 last:border-r-0",
                !inMonth && "bg-muted/20 text-muted-foreground/60",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {d.getDate()}
                </span>
                {list.length > 0 && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    {list.length}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {list.slice(0, MAX_PER_CELL).map((e) => (
                  <EventChipCompact key={e.id} event={e} />
                ))}
                {list.length > MAX_PER_CELL && (
                  <p className="px-1 text-[10px] font-semibold text-muted-foreground">
                    + {list.length - MAX_PER_CELL} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventChipCompact({ event }: { event: CalendarEvent }) {
  const tone = event.tone ?? "blue"
  const time = event.startAt.includes("T")
    ? new Date(event.startAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null
  return (
    <button
      type="button"
      onClick={event.onClick}
      className={cn(
        "w-full truncate rounded border px-1 py-0.5 text-left text-[10.5px] font-medium",
        TONE_CLASSES[tone],
        event.onClick && "hover:brightness-95",
      )}
      title={`${event.title}${event.subtitle ? ` · ${event.subtitle}` : ""}${time ? ` · ${time}` : ""}`}
    >
      {time && <span className="mr-1 font-bold tabular-nums">{time}</span>}
      {event.title}
    </button>
  )
}

// ---------- Week view ----------

function WeekGrid({
  days,
  eventsByDay,
}: {
  days: Date[]
  eventsByDay: Map<string, CalendarEvent[]>
}) {
  const today = new Date()
  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {days.map((d) => {
        const dayKey = iso(d)
        const list = eventsByDay.get(dayKey) ?? []
        const isToday = isSameDay(d, today)
        return (
          <div
            key={dayKey}
            className={cn(
              "min-h-[140px] rounded-lg border border-border bg-card p-2",
              isToday && "border-primary/40 bg-primary/[0.03]",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  {d.toLocaleString(undefined, { weekday: "short" })}
                </p>
                <p
                  className={cn(
                    "text-base font-bold tabular-nums",
                    isToday && "text-primary",
                  )}
                >
                  {d.getDate()}
                </p>
              </div>
              {list.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                  {list.length}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {list.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-muted-foreground/70">—</p>
              ) : (
                list.map((e) => <EventChipFull key={e.id} event={e} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EventChipFull({ event }: { event: CalendarEvent }) {
  const tone = event.tone ?? "blue"
  const time = event.startAt.includes("T")
    ? new Date(event.startAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null
  const Icon = event.Icon
  return (
    <button
      type="button"
      onClick={event.onClick}
      className={cn(
        "w-full rounded-md border p-1.5 text-left text-[11.5px]",
        TONE_CLASSES[tone],
        event.onClick && "hover:brightness-95",
      )}
    >
      <div className="flex items-start gap-1.5">
        {Icon && <Icon className="mt-0.5 h-3 w-3 shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{event.title}</p>
          {event.subtitle && <p className="truncate text-[10.5px] opacity-80">{event.subtitle}</p>}
          {time && (
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold opacity-80">
              <Clock className="h-2.5 w-2.5" />
              <span className="tabular-nums">{time}</span>
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

// ---------- Day view ----------

function DayList({
  day,
  eventsByDay,
}: {
  day: Date
  eventsByDay: Map<string, CalendarEvent[]>
}) {
  const list = eventsByDay.get(iso(day)) ?? []
  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Nothing scheduled for {day.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric" })}.
      </div>
    )
  }
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      {list.map((e) => {
        const tone = e.tone ?? "blue"
        const time = e.startAt.includes("T")
          ? new Date(e.startAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
          : "All-day"
        const Icon = e.Icon
        return (
          <button
            key={e.id}
            type="button"
            onClick={e.onClick}
            className={cn(
              "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
              TONE_CLASSES[tone],
              e.onClick && "hover:brightness-95",
            )}
          >
            <span className="w-20 shrink-0 text-[11px] font-bold uppercase tracking-wider opacity-80 tabular-nums">
              {time}
            </span>
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{e.title}</p>
              {e.subtitle && <p className="truncate text-[11.5px] opacity-80">{e.subtitle}</p>}
            </div>
            {e.meta && <span className="shrink-0 text-[11px] font-semibold opacity-80">{e.meta}</span>}
          </button>
        )
      })}
    </div>
  )
}
