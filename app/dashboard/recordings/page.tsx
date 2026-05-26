"use client"

// All-recordings index.
//
// Every live class that has a recording_url lands in one place so the
// instructor (or a returning student bookmarking this page) can rewatch
// without first navigating to the specific class. Cuts the "where did
// I save that recording" friction in half.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { BookOpen, CalendarPlus, Captions, CheckCircle2, Circle, FileText, Play, Share2, Trash2, Video } from "lucide-react"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import { RECORDINGS_TOUR, RECORDINGS_TOUR_ID } from "@/components/dashboard/tours"
import { ShareMenu } from "@/components/share/share-menu"
import { AddRecordingToCourseDialog } from "@/components/recordings/add-to-course-dialog"
import { AddToPlaylistPopover } from "@/components/recordings/add-to-playlist-popover"
import { RecordingThumbnail } from "@/components/recordings/recording-thumbnail"
import { TranscriptSearchDialog } from "@/components/recordings/transcript-search-dialog"
import { ScanText } from "lucide-react"
import { ListViewsRail } from "@/components/dashboard/list-views-rail"
import { RecordingDetailsSheet } from "@/components/recordings/recording-details-sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SlidersHorizontal, X as XIcon } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BulkActionBar } from "@/components/dashboard/bulk-action-bar"
import { useConfirm } from "@/lib/use-confirm"
import { useLMS, type LiveSession } from "@/lib/lms-store"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { SearchInput } from "@/components/ui/search-input"
import { RecordingPlayerDialog } from "@/components/classes/recording-player-dialog"
import {
  getAllProgress,
  formatRemaining,
  type RecordingProgressEntry,
} from "@/lib/recording-progress"
import { canonicalRoomCode } from "@/lib/jitsi"
import { fetchRoomState, requestTranscription } from "@/lib/live-room-state"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { usePlan } from "@/lib/use-plan"
import { PlanLockIcon } from "@/components/dashboard/plan-lock"

export default function RecordingsPage() {
  const { liveSessions, courses, updateLiveSession, currentUser } = useLMS()
  // Per-user playback progress map. Read once per render — the
  // player writes back to the same store, but the listing snapshot
  // can be stale by up to one render cycle without consequence.
  const progressMap = useMemo(
    () => getAllProgress(currentUser?.id),
    [currentUser?.id, liveSessions],
  )
  const confirm = useConfirm()
  // Search synced to ?q= so a teacher who searched "algebra" can hit
  // refresh / share the link without losing the filter.
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })
  // Watch-state filter chips. URL-synced so a shared link to
  // "?state=unwatched" lands a teammate on the same pile of
  // backlog. Computed entirely from the in-memory progress map —
  // no additional backend fetch. Captions-ready is intentionally
  // omitted because that data lives behind a per-row /state
  // request that the list page doesn't have at filter time.
  type WatchState = "all" | "unwatched" | "in-progress" | "completed"
  const [watchState, setWatchState] = useUrlState<string>("state", { defaultValue: "all" })
  const stateFilter = (watchState as WatchState)
  // Visibility tier filter. LiveSession.recordingVisibility is one of
  // public / enrolled / community / link-only (defaults to "enrolled"
  // when unset). Lets a teacher slice "what's gated to which
  // audience" without opening every detail sheet. URL-synced so
  // links like ?tier=public are shareable.
  type TierFilter = "all" | "public" | "enrolled" | "community" | "link-only"
  const [tierState, setTierState] = useUrlState<string>("tier", { defaultValue: "all" })
  const tierFilter = (tierState as TierFilter)
  // Sort mode pill rail. Three modes:
  //   "newest"    — recording date desc (the historical default)
  //   "continue"  — only in-progress recordings, last-played-first.
  //                 Surfaces "what was I in the middle of?" at a glance.
  //   "recent"    — anything the viewer touched, last-played-first.
  //                 Lets a student find "that recording I watched 3
  //                 days ago" without scrolling the whole catalog.
  // Default sticks per browser via localStorage so a returning
  // student lands in the same mode they left in.
  type SortMode = "newest" | "continue" | "recent"
  const SORT_KEY = "thebigclass.recordings.sortMode.v1"
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    if (typeof window === "undefined") return "newest"
    try {
      const raw = window.localStorage.getItem(SORT_KEY)
      if (raw === "newest" || raw === "continue" || raw === "recent") return raw
    } catch { /* private mode — fall through */ }
    return "newest"
  })
  useEffect(() => {
    if (typeof window === "undefined") return
    try { window.localStorage.setItem(SORT_KEY, sortMode) } catch { /* ignore */ }
  }, [sortMode])

  // Transcript-search dialog (R7). Opens via a header button;
  // indexes visible recordings' VTT sidecars on mount and shows
  // timestamped snippet hits deep-linking to the player.
  const [transcriptSearchOpen, setTranscriptSearchOpen] = useState(false)

  // SearchInput owns the "/" focus shortcut now; no need for a manual
  // ref + usePageShortcut wiring here. No "n" shortcut on this page —
  // recordings are produced as a side-effect of running a live class,
  // there's nothing to "create" here.

  const recorded = useMemo(() => {
    // Base universe — only recordings exist on this page.
    const withRecordingRaw = liveSessions.filter((s) => !!s.recordingUrl)
    // Sort-mode application. "newest" stays the historical default
    // (most-recent class first). "continue" filters to in-progress
    // and sorts by progress.updatedAt desc. "recent" sorts the
    // whole catalog by last-played-first when the viewer has any
    // progress, otherwise falls back to scheduledAt.
    const withRecording = (() => {
      if (sortMode === "continue") {
        return withRecordingRaw
          .filter((s) => {
            const p = progressMap[s.id]
            return !!p && !p.completed && p.positionSec > 0
          })
          .sort((a, b) => {
            const pa = progressMap[a.id]?.updatedAt ?? ""
            const pb = progressMap[b.id]?.updatedAt ?? ""
            return pb.localeCompare(pa)
          })
      }
      if (sortMode === "recent") {
        return [...withRecordingRaw].sort((a, b) => {
          const pa = progressMap[a.id]?.updatedAt
          const pb = progressMap[b.id]?.updatedAt
          // Played > unplayed (so the user's history floats up).
          if (pa && pb) return pb.localeCompare(pa)
          if (pa && !pb) return -1
          if (!pa && pb) return 1
          return (b.roomEndedAt ?? b.scheduledAt).localeCompare(a.roomEndedAt ?? a.scheduledAt)
        })
      }
      return [...withRecordingRaw].sort((a, b) =>
        (b.roomEndedAt ?? b.scheduledAt).localeCompare(a.roomEndedAt ?? a.scheduledAt),
      )
    })()
    // Watch-state pre-filter applied before fuzzy search so the
    // search result count tracks the chip the user picked.
    const stateFiltered = stateFilter === "all"
      ? withRecording
      : withRecording.filter((s) => {
          const p = progressMap[s.id]
          if (stateFilter === "unwatched") return !p || p.positionSec <= 0
          if (stateFilter === "in-progress") return !!p && !p.completed && p.positionSec > 0
          if (stateFilter === "completed") return !!p && p.completed
          return true
        })
    // Visibility-tier pre-filter. "enrolled" is the default tier so
    // sessions without an explicit value match it; everything else
    // is exact-match.
    const tierFiltered = tierFilter === "all"
      ? stateFiltered
      : stateFiltered.filter((s) => {
          const tier = s.recordingVisibility ?? "enrolled"
          return tier === tierFilter
        })
    // Sprint C Recordings #2 — multi-field search. Title only was
    // too restrictive once teachers started writing recaps + adding
    // resource labels. Now we match across:
    //   • Title
    //   • Summary (the post-class recap text)
    //   • Course title
    //   • Material labels (slide deck names, etc.)
    //   • Agenda items (pre-class plan, also part of recap)
    // Transcript-aware search lands when the transcript service
    // ships — keep the field list extensible so adding it is just
    // one entry.
    return fuzzySearch(tierFiltered, search, (s) => {
      const fields: string[] = [s.title]
      if (s.summary) fields.push(s.summary)
      const courseTitle = courses.find((c) => c.id === s.courseId)?.title
      if (courseTitle) fields.push(courseTitle)
      for (const m of s.materials ?? []) {
        if (m.label) fields.push(m.label)
      }
      for (const a of s.agenda ?? []) {
        if (a.title) fields.push(a.title)
      }
      return fields
    })
  }, [liveSessions, search, courses, progressMap, stateFilter, tierFilter, sortMode])

  // Per-state counts so the chip rail shows live numbers ("Unwatched · 12").
  // Computed off the full recorded set (pre-search) so the counts
  // don't shift while the user types into search.
  const stateCounts = useMemo(() => {
    const all = liveSessions.filter((s) => !!s.recordingUrl)
    let unwatched = 0, inProgress = 0, completed = 0
    for (const s of all) {
      const p = progressMap[s.id]
      if (!p || p.positionSec <= 0) unwatched++
      else if (p.completed) completed++
      else inProgress++
    }
    return { all: all.length, unwatched, "in-progress": inProgress, completed }
  }, [liveSessions, progressMap])

  // Per-tier counts. Same "computed off pre-search universe" rule
  // as stateCounts so a teacher sees "5 public" even after they've
  // typed something that doesn't match any of them.
  const tierCounts = useMemo(() => {
    const all = liveSessions.filter((s) => !!s.recordingUrl)
    const counts = { all: all.length, public: 0, enrolled: 0, community: 0, "link-only": 0 }
    for (const s of all) {
      const tier = s.recordingVisibility ?? "enrolled"
      if (tier in counts) counts[tier as keyof typeof counts]++
    }
    return counts
  }, [liveSessions])

  // Sprint B Recordings #1 — grouping toggle. Two modes:
  //   "flat"   — current behaviour (newest-first table).
  //   "course" — group by course title; each group collapsible.
  // URL-synced so a teacher who shares "?group=course" lands on
  // the grouped view directly.
  const [groupMode, setGroupMode] = useUrlState<string>("group", { defaultValue: "flat" })
  const grouped = useMemo(() => {
    if (groupMode !== "course") return null
    const map = new Map<string, { courseTitle: string; sessions: LiveSession[] }>()
    for (const s of recorded) {
      const course = courses.find((c) => c.id === s.courseId)
      const key = course?.id ?? "__no-course"
      const entry = map.get(key) ?? {
        courseTitle: course?.title ?? "No course attached",
        sessions: [],
      }
      entry.sessions.push(s)
      map.set(key, entry)
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].courseTitle.localeCompare(b[1].courseTitle),
    )
  }, [groupMode, recorded, courses])

  // Bulk selection. Stores session ids (not recording ids — a session
  // has a single `recordingUrl` we clear, plus the `recordings` array
  // we wipe). Filter against the visible list at action time so stale
  // ids from a prior filter don't survive.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clearSelection = () => setSelected(new Set())

  const visibleIds = recorded.map((s) => s.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selected.has(id))
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id)
      } else {
        for (const id of visibleIds) next.add(id)
      }
      return next
    })
  }

  const bulkDeleteRecordings = async () => {
    const ids = Array.from(selected).filter((id) =>
      liveSessions.some((s) => s.id === id),
    )
    if (ids.length === 0) return
    const ok = await confirm({
      title: `Delete ${ids.length} recording${ids.length === 1 ? "" : "s"}?`,
      description:
        "The video URL is cleared from each class. The class itself stays — just the recording link goes.",
      destructive: true,
      confirmLabel: "Delete recordings",
    })
    if (!ok) return
    // Clearing both recordingUrl AND the recordings array — the recordings
    // page filters on recordingUrl, but the class detail page reads from
    // recordings[]. Without clearing both, the recording would silently
    // come back on the class detail view.
    ids.forEach((id) => updateLiveSession(id, { recordingUrl: undefined, recordings: [] }))
    clearSelection()
    toast.success(
      `Deleted ${ids.length} recording${ids.length === 1 ? "" : "s"}.`,
    )
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId={RECORDINGS_TOUR_ID} steps={RECORDINGS_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recordings</h1>
          <p className="text-muted-foreground">
            Every class recording in one place. Click watch to play inline — no jumping between class pages.
          </p>
        </div>
        <div className="flex items-center gap-2" data-tour="recordings-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTranscriptSearchOpen(true)}
            className="gap-1.5"
            title="Search every transcript for a spoken phrase"
          >
            <ScanText className="h-3.5 w-3.5" />
            Search transcripts
          </Button>
          <TakeATourButton tourId={RECORDINGS_TOUR_ID} />
        </div>
      </div>
      <TranscriptSearchDialog
        open={transcriptSearchOpen}
        onOpenChange={setTranscriptSearchOpen}
        recordings={recorded.map((s) => ({ id: s.id, title: s.title, recordingUrl: s.recordingUrl }))}
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[200px] flex-1" data-tour="recordings-search">
              <SearchInput
                pageId="recordings"
                value={search}
                onChange={setSearch}
                placeholder="Search by class title…"
                ariaLabel="Search recordings"
                shortcutDescription="Focus recording search"
              />
            </div>
          {/* Sprint B Recordings #1 — view mode toggle. Flat is the
              classic newest-first table; Course groups by the course
              the class belonged to, surfacing the "module-shaped"
              navigation teachers ask for. */}
          <div className="inline-flex overflow-hidden rounded-md border border-border bg-background">
            {(["flat", "course"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGroupMode(mode)}
                className={`px-3 py-1.5 text-[11.5px] font-semibold capitalize ${
                  groupMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {mode === "flat" ? "Flat list" : "By course"}
              </button>
            ))}
          </div>
          </div>
          {/* Unified filter surface. Replaces the two parallel chip
              rails (watch state + visibility tier) that previously
              ate ~80px of vertical space and forced the eye to parse
              two axes at once. Now: one Filters button with a count
              badge → popover with grouped checkboxes. Active filters
              render as removable pills inline so the operator always
              sees what's narrowing their results. */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Saved-views chip rail (Filters+Views retrofit) — saves
                the current (search + state + tier + sort) snapshot
                as a named view the operator can recall with one
                tap. First consumer of the new ListViewsRail; same
                pattern will roll across classes / students / courses
                / members list pages next. */}
            <ListViewsRail
              userId={currentUser?.id}
              pageId="recordings"
              currentState={{
                search,
                stateFilter,
                tierFilter,
                sortMode,
              }}
              onApply={(s) => {
                if (typeof s.search === "string") setSearch(s.search)
                if (typeof s.stateFilter === "string") setWatchState(s.stateFilter)
                if (typeof s.tierFilter === "string") setTierState(s.tierFilter)
                if (s.sortMode === "newest" || s.sortMode === "continue" || s.sortMode === "recent") {
                  setSortMode(s.sortMode)
                }
              }}
            />
            <RecordingsFilters
              stateFilter={stateFilter}
              setWatchState={setWatchState}
              stateCounts={stateCounts}
              tierFilter={tierFilter}
              setTierState={setTierState}
              tierCounts={tierCounts}
              tierFilterAvailable={tierCounts.public + tierCounts.community + tierCounts["link-only"] > 0}
            />
            {/* Sort-mode pills. Sits to the right of the filters
                button so the operator can switch between "newest"
                (the default for teachers) and "continue watching"
                (the default Netflix gesture for students) without
                opening a popover. Continue-watching count is
                surfaced inline so a student knows how big their
                in-progress pile is before they click. */}
            <div className="ml-auto inline-flex overflow-hidden rounded-full border border-border bg-card">
              {([
                { id: "newest" as const,   label: "Newest",   icon: "🆕" },
                { id: "continue" as const, label: "Continue", icon: "📺", count: stateCounts["in-progress"] },
                { id: "recent" as const,   label: "Recent",   icon: "🕒" },
              ]).map((p) => {
                const active = sortMode === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSortMode(p.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-pressed={active}
                  >
                    <span aria-hidden>{p.icon}</span>
                    {p.label}
                    {p.count != null && p.count > 0 && (
                      <span className={`tabular-nums ${active ? "opacity-80" : "text-muted-foreground"}`}>
                        {p.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <BulkActionBar
        selectedCount={selected.size}
        totalCount={recorded.length}
        onClear={clearSelection}
        actions={[
          {
            key: "delete",
            label: "Delete recording",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            destructive: true,
            onClick: bulkDeleteRecordings,
          },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          {recorded.length === 0 ? (
            // Recordings can't be authored from scratch — they're a
            // by-product of running a live class with recording on. So
            // instead of "Start from a template" (the pattern Quizzes /
            // Classes / Whiteboards use), this empty state shows a
            // ghosted preview of what a real row will look like, plus a
            // 3-step path to getting one.
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold">No recordings yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                When you record a live class, the link lands here automatically. Here&apos;s what a row will look like.
              </p>

              {/* Ghosted sample row — opacity-50 so it reads as a
                  preview, not a real entry. Same shape as the real
                  TableRow below so the teacher recognises the layout. */}
              <div className="mx-auto mt-6 max-w-2xl rounded-lg border border-dashed border-border bg-card/40 px-4 py-3 text-left opacity-70">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Algebra: solving quadratics</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Math 101 · Recorded 2 days ago · 47 min
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled className="gap-1.5">
                    <Play className="h-3.5 w-3.5" />
                    Watch
                  </Button>
                </div>
              </div>

              {/* Three-step path: schedule → record → it shows up here. */}
              <ol className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
                <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarPlus className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">1. Schedule a class</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Set time + duration on the Classes page.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Circle className="h-3.5 w-3.5 fill-current" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">2. Hit record live</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Click the red dot once you&apos;re in the room.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Video className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">3. It lands here</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Auto-saved with title + duration filled in.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button asChild size="sm">
                  <Link href="/dashboard/classes">
                    <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                    Go to live classes
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/classes/new">Schedule one now</Link>
                </Button>
              </div>
            </div>
          ) : groupMode === "course" && grouped ? (
            // Sprint B Recordings #1 — by-course view. Renders each
            // course as a labelled section with its own count. We
            // intentionally keep the existing table inside each
            // group so a teacher's column expectations (Class,
            // Recorded, Duration, Watch) stay consistent regardless
            // of the outer grouping.
            <div className="divide-y divide-border">
              {grouped.map(([key, group]) => (
                <div key={key}>
                  <div className="flex items-baseline justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2 text-[12.5px]">
                    <span className="font-semibold">{group.courseTitle}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {group.sessions.length} {group.sessions.length === 1 ? "recording" : "recordings"}
                    </span>
                  </div>
                  <Table>
                    <TableHeader className="sr-only">
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>Class</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Recorded</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Watch</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.sessions.map((s) => (
                        <RecordingRow
                          key={s.id}
                          session={s}
                          courseTitle={group.courseTitle}
                          isSelected={selected.has(s.id)}
                          onToggle={() => toggleOne(s.id)}
                          progress={progressMap[s.id]}
                          userId={currentUser?.id}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      aria-label="Select all visible recordings"
                      checked={
                        allVisibleSelected
                          ? true
                          : someVisibleSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleAllVisible}
                    />
                  </TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Watch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recorded.map((s, idx) => {
                  const course = courses.find((c) => c.id === s.courseId)
                  // "Up next" = next recording in the same sort order.
                  // Prefer same-course continuation, fall back to the
                  // next row in the current list. Skip rows without
                  // a recording URL (defensive — already filtered).
                  const nextInList = recorded[idx + 1]
                  const next = (() => {
                    const sameCourse = course
                      ? recorded.slice(idx + 1).find((r) => r.courseId === s.courseId)
                      : null
                    const target = sameCourse ?? nextInList
                    if (!target) return null
                    return {
                      id: target.id,
                      title: target.title,
                      courseTitle: courses.find((c) => c.id === target.courseId)?.title,
                      durationMin: target.durationMinutes,
                      href: `/dashboard/recordings/${target.id}`,
                    }
                  })()
                  return (
                    <RecordingRow
                      key={s.id}
                      session={s}
                      courseTitle={course?.title ?? "—"}
                      isSelected={selected.has(s.id)}
                      onToggle={() => toggleOne(s.id)}
                      progress={progressMap[s.id]}
                      userId={currentUser?.id}
                      nextRecording={next}
                    />
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Single row — fetches the backend LiveRoomState lazily so the
// player can render captions + transcript even though the rest of
// the page reads from the frontend lms-store. Without this fetch
// the .vtt sidecar produced by the egress poller is invisible.
// ────────────────────────────────────────────────────────────────────

function RecordingRow({
  session,
  courseTitle,
  isSelected,
  onToggle,
  progress,
  userId,
  nextRecording,
}: {
  session: LiveSession
  courseTitle: string
  isSelected: boolean
  onToggle: () => void
  progress?: RecordingProgressEntry
  userId?: string
  nextRecording?: {
    id: string
    title: string
    courseTitle?: string
    durationMin?: number
    href: string
  } | null
}) {
  // Watch-state derived display. Three reads:
  //   1. "Watched" badge when completed (>=90% threshold)
  //   2. "New" badge when no progress entry exists at all
  //   3. "X min left" + thin progress bar when partially watched
  const watchedRatio =
    progress && progress.durationSec > 0
      ? Math.min(1, progress.positionSec / progress.durationSec)
      : 0
  const remaining = progress ? formatRemaining(progress) : ""
  const { isAllowed } = usePlan()
  const transcriptsAllowed = isAllowed("transcripts")
  const lastRec = session.recordings?.[session.recordings.length - 1]
  const recordedAt = session.roomEndedAt ?? lastRec?.endedAt ?? session.scheduledAt
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null)
  const [transcriptText, setTranscriptText] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [addToCourseOpen, setAddToCourseOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // The roomCode helper falls back to a derived value when an older
  // session was created before roomCode existed, so this works for
  // every recording in the table.
  const roomCode = canonicalRoomCode({ id: session.id, roomCode: session.roomCode ?? null })

  useEffect(() => {
    let cancelled = false
    fetchRoomState(roomCode).then((state) => {
      if (cancelled || !state) return
      setTranscriptUrl(state.transcriptUrl ?? null)
      setTranscriptText(state.transcriptText ?? null)
    })
    return () => { cancelled = true }
  }, [roomCode])

  const hasCaptions = !!transcriptUrl || !!transcriptText

  const handleTranscribe = async () => {
    setTranscribing(true)
    const promise = requestTranscription(roomCode)
    toast.promise(promise, {
      loading: "Transcribing — this can take a couple of minutes for long classes…",
      success: (r) => "error" in r ? `Couldn't transcribe: ${r.error}` : "Transcript ready — open the player to see captions.",
      error: "Couldn't transcribe.",
    })
    const r = await promise
    setTranscribing(false)
    if ("error" in r) return
    setTranscriptUrl(r.transcriptUrl)
    setTranscriptText(r.transcriptText)
  }

  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell>
        <Checkbox
          aria-label={`Select recording for ${session.title}`}
          checked={isSelected}
          onCheckedChange={onToggle}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 group">
          <RecordingThumbnail
            recordingId={session.id}
            url={session.recordingUrl ?? ""}
            durationLabel={session.durationMinutes ? `${session.durationMinutes}m` : undefined}
          />
          <Link href={`/dashboard/classes/${session.id}`} className="font-medium hover:underline">
            {session.title}
          </Link>
          {progress?.completed && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success"
              title="You watched the whole thing"
            >
              <CheckCircle2 className="h-2.5 w-2.5" /> Watched
            </span>
          )}
          {!progress && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
              title="You haven't opened this recording yet"
            >
              New
            </span>
          )}
        </div>
        {session.summary && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{session.summary}</p>
        )}
        {progress && !progress.completed && watchedRatio > 0 && (
          <div
            className="mt-1.5 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-muted"
            aria-label={`Watched ${Math.round(watchedRatio * 100)}%`}
          >
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.max(2, Math.round(watchedRatio * 100))}%` }}
            />
          </div>
        )}
        {hasCaptions && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-success">
            <Captions className="h-3 w-3" /> Captions + transcript ready
          </p>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{courseTitle}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm tabular-nums">
          {recordedAt
            ? new Date(recordedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground tabular-nums">
          {lastRec ? `${Math.round(lastRec.durationSec / 60)} min` : "—"}
        </span>
        {remaining && (
          <p className="text-[10px] text-primary">{remaining}</p>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1.5">
          {!hasCaptions && (
            transcriptsAllowed ? (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-primary hover:bg-primary/5"
                onClick={handleTranscribe}
                disabled={transcribing}
                title="Run Whisper on this recording."
              >
                {transcribing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Transcribe
              </Button>
            ) : (
              <PlanLockIcon feature="transcripts" />
            )
          )}
          <RecordingPlayerDialog
            url={session.recordingUrl!}
            title={session.title}
            triggerLabel={progress && !progress.completed ? "Resume" : "Watch"}
            transcriptUrl={transcriptUrl}
            transcriptText={transcriptText}
            recordingId={session.id}
            userId={userId}
            // Enables the "Copy link to this moment" affordance in
            // the dialog. Pasted links open the standalone
            // /dashboard/recordings/<id> route which auto-seeks via
            // its ?t= query.
            shareUrl={`/dashboard/recordings/${session.id}`}
            // Up-next autoplay card — slides in at last 30s, promotes
            // to 10s countdown on end. Picks the next row in the
            // current sort order (same-course preferred).
            nextRecording={nextRecording}
          />
          <AddToPlaylistPopover
            userId={userId}
            recordingId={session.id}
            recordingTitle={session.title}
          />
          <ShareMenu
            artifact={{
              kind: "recording",
              title: session.title,
              description: session.summary?.replace(/<[^>]+>/g, " ").trim(),
              url: session.recordingUrl!,
              source: courseTitle !== "—" ? courseTitle : undefined,
            }}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                title="Share this recording"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setAddToCourseOpen(true)}
            title="Promote this recording into a course as a video lesson"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Add to course
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setDetailsOpen(true)}
            title="Edit description + linked resources"
          >
            <FileText className="h-3.5 w-3.5" />
            Details
          </Button>
          <AddRecordingToCourseDialog
            open={addToCourseOpen}
            onOpenChange={setAddToCourseOpen}
            session={session}
            transcriptText={transcriptText}
            defaultCourseId={session.courseId}
          />
          <RecordingDetailsSheet
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            session={session}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}


// ============================================================
// RecordingsFilters — unified filter surface
// ============================================================
//
// Replaces two parallel chip rails (watch state, visibility tier)
// with one Filters button + grouped popover + active-pill rail.
//
// Pattern: Linear-style. Filters button always renders. Active count
// badge appears when ≥1 filter is set. Active filters render as
// inline removable pills so the operator never has to open the
// popover to see what is narrowing the list. Each pill has an X to
// clear that one axis without touching the others.
function RecordingsFilters({
  stateFilter,
  setWatchState,
  stateCounts,
  tierFilter,
  setTierState,
  tierCounts,
  tierFilterAvailable,
}: {
  stateFilter: "all" | "unwatched" | "in-progress" | "completed"
  setWatchState: (v: string) => void
  stateCounts: Record<string, number>
  tierFilter: "all" | "public" | "enrolled" | "community" | "link-only"
  setTierState: (v: string) => void
  tierCounts: Record<string, number>
  tierFilterAvailable: boolean
}) {
  const activeCount = (stateFilter !== "all" ? 1 : 0) + (tierFilter !== "all" ? 1 : 0)
  const stateOptions = [
    { id: "all", label: "All" },
    { id: "unwatched", label: "Unwatched" },
    { id: "in-progress", label: "In progress" },
    { id: "completed", label: "Watched" },
  ] as const
  const tierOptions = [
    { id: "all", label: "All" },
    { id: "public", label: "Public" },
    { id: "enrolled", label: "Enrolled" },
    { id: "community", label: "Community" },
    { id: "link-only", label: "Link only" },
  ] as const

  const stateLabel = stateOptions.find((o) => o.id === stateFilter)?.label
  const tierLabel = tierOptions.find((o) => o.id === tierFilter)?.label

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
              activeCount > 0
                ? "border-primary bg-primary/[0.06] text-primary"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Watch state
              </p>
              <div className="space-y-0.5">
                {stateOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setWatchState(o.id)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] transition ${
                      stateFilter === o.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{o.label}</span>
                    <span className={`text-[10px] tabular-nums ${stateFilter === o.id ? "opacity-80" : "text-muted-foreground"}`}>
                      {stateCounts[o.id] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {tierFilterAvailable && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Visibility
                </p>
                <div className="space-y-0.5">
                  {tierOptions.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setTierState(o.id)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] transition ${
                        tierFilter === o.id
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{o.label}</span>
                      <span className={`text-[10px] tabular-nums ${tierFilter === o.id ? "opacity-80" : "text-muted-foreground"}`}>
                        {tierCounts[o.id] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWatchState("all")
                  setTierState("all")
                }}
                className="w-full rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                Clear all filters
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter pills — visible at all times once a filter is
          set, so the operator can read what is narrowing the list
          without re-opening the popover. */}
      {stateFilter !== "all" && (
        <button
          type="button"
          onClick={() => setWatchState("all")}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-semibold transition hover:bg-primary/90"
          aria-label={`Remove ${stateLabel} filter`}
        >
          {stateLabel}
          <XIcon className="h-3 w-3" />
        </button>
      )}
      {tierFilter !== "all" && (
        <button
          type="button"
          onClick={() => setTierState("all")}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-semibold transition hover:bg-primary/90"
          aria-label={`Remove ${tierLabel} filter`}
        >
          {tierLabel}
          <XIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
