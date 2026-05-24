"use client"

// Course version history. Every "Publish changes" click on the
// edit page snapshots the canonical course state and the result
// is appended here. Instructors can:
//   • diff the version's snapshot vs the current canonical state
//     (we summarise the most-visible content differences)
//   • preview a version inline (modules + lessons)
//   • restore an old version — that copies the snapshot back onto
//     the canonical fields and itself becomes a new version so the
//     restore is undoable.
//
// Plan gate: snapshots are always written (so an upgrade reveals
// the history captured during the trial), but the UI here is gated
// behind `courseVersioning`. Starter sees an upgrade card.

import { use, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  RotateCcw,
  User as UserIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLMS, type CourseVersion } from "@/lib/lms-store"
import { usePlan } from "@/lib/use-plan"
import { PlanGatedCard } from "@/components/dashboard/plan-lock"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"

export default function CourseVersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getCourseById, restoreCourseVersion, getUserById } = useLMS()
  const { isAllowed, hydrated } = usePlan()
  const confirm = useConfirm()
  const course = getCourseById(id)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold">Course not found</h1>
        <Button asChild className="mt-4">
          <Link href="/dashboard/courses">Back to courses</Link>
        </Button>
      </div>
    )
  }

  // Wait for the plan store to hydrate before deciding what to show.
  // Otherwise paid users would see the upgrade card flash on every
  // reload while the plan rehydrates from localStorage.
  if (hydrated && !isAllowed("courseVersioning")) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/courses/${course.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to course
          </Link>
        </Button>
        <div className="mx-auto max-w-xl">
          <PlanGatedCard feature="courseVersioning" />
        </div>
      </div>
    )
  }

  const versions = course.versions ?? []

  const toggleExpanded = (vid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(vid)) next.delete(vid)
      else next.add(vid)
      return next
    })

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/courses/${course.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to course
        </Link>
      </Button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <History className="h-6 w-6 text-primary" />
          Version history
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every time you publish changes to{" "}
          <span className="font-medium text-foreground">{course.title}</span>, a snapshot lands here.
          Preview an old version inline, or restore it as the live course.
        </p>
      </div>

      {versions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No published versions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Hit <span className="font-medium">Publish changes</span> on the editor and the first snapshot will appear here.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/dashboard/courses/${course.id}/edit`}>Open the editor</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {versions.map((v, idx) => {
            const isLatest = idx === 0
            const open = expanded.has(v.id)
            const publishedBy = v.publishedById ? getUserById(v.publishedById) : null
            return (
              <Card key={v.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(v.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    aria-expanded={open}
                  >
                    <span className="mt-0.5 text-muted-foreground">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        Version {v.version}
                        {isLatest && (
                          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Live
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(v.publishedAt).toLocaleString()}
                        </span>
                        {publishedBy?.name && (
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {publishedBy.name}
                          </span>
                        )}
                        {v.note && (
                          <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
                            {v.note}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {!isLatest && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Restore version ${v.version}?`,
                            description:
                              "The current published state will be saved as a new version first, so this is undoable. Any pending draft is discarded.",
                            confirmLabel: "Restore",
                          })
                          if (!ok) return
                          restoreCourseVersion(course.id, v.id)
                          toast.success(`Restored to v${v.version}.`)
                        }}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Restore
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {open && (
                  <CardContent className="border-t border-border pt-4">
                    <VersionSnapshotPreview snapshot={v.snapshot} />
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VersionSnapshotPreview({ snapshot }: { snapshot: CourseVersion["snapshot"] }) {
  const lessonCount = (snapshot.modules ?? []).reduce(
    (acc, m) => acc + (m.lessons?.length ?? 0),
    0,
  )
  const totalMinutes = (snapshot.modules ?? []).reduce(
    (acc, m) =>
      acc + (m.lessons ?? []).reduce((la, l) => la + (l.duration || 0), 0),
    0,
  )
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <SnapshotStat label="Title" value={snapshot.title || "—"} />
        <SnapshotStat label="Price" value={formatPriceish(snapshot.price, snapshot.currency)} />
        <SnapshotStat
          label="Curriculum"
          value={`${(snapshot.modules ?? []).length} modules · ${lessonCount} lessons`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatMinutes(totalMinutes)}
        </span>
        {snapshot.category && <span>Category: {snapshot.category}</span>}
        {snapshot.level && <span className="capitalize">Level: {snapshot.level}</span>}
        {snapshot.visibility && (
          <span className="capitalize">Visibility: {snapshot.visibility}</span>
        )}
      </div>
      {snapshot.subtitle && (
        <p className="text-sm italic text-muted-foreground">{snapshot.subtitle}</p>
      )}
      {(snapshot.modules ?? []).length > 0 && (
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Module list
          </p>
          <ol className="space-y-1.5 text-sm">
            {(snapshot.modules ?? []).map((m, idx) => (
              <li key={m.id ?? idx} className="flex items-start gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.title || "Untitled module"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(m.lessons ?? []).length} lesson
                    {(m.lessons ?? []).length === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function SnapshotStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-semibold" title={value}>{value}</p>
    </div>
  )
}

function formatPriceish(price?: number, currency?: string): string {
  if (price === undefined || price === null) return "—"
  if (price === 0) return "Free"
  const cur = currency ?? "INR"
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(price)
  } catch {
    return `${cur} ${price}`
  }
}

function formatMinutes(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "0m"
  const h = Math.floor(total / 60)
  const m = Math.round(total % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
