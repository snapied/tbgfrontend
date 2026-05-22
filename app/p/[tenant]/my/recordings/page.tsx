"use client"

// "My recordings" — every recorded live class from a course the
// signed-in student is enrolled in. Watch in-place via the dialog,
// or click through to the live page for materials + transcript.

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { BookOpen, Film, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLMS } from "@/lib/lms-store"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { RecordingPlayerDialog } from "@/components/classes/recording-player-dialog"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import {
  STUDENT_RECORDINGS_TOUR,
  STUDENT_RECORDINGS_TOUR_ID,
} from "@/components/student/tours"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 1) return "—"
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function MyRecordingsPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  const { currentUser, enrollments, liveSessions, getCourseById } = useLMS()
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })

  const enrolledCourseIds = useMemo(() => {
    if (!currentUser) return new Set<string>()
    return new Set(
      enrollments
        .filter((e) => e.studentId === currentUser.id)
        .map((e) => e.courseId),
    )
  }, [currentUser, enrollments])

  const rows = useMemo(() => {
    const withRecording = liveSessions.filter(
      (s) => !!s.recordingUrl && enrolledCourseIds.has(s.courseId),
    )
    const hydrated = withRecording
      .map((session) => ({ session, course: getCourseById(session.courseId) }))
      .filter(
        (row): row is { session: typeof row.session; course: NonNullable<typeof row.course> } =>
          !!row.course,
      )
      .sort((a, b) =>
        (b.session.roomEndedAt ?? b.session.scheduledAt).localeCompare(
          a.session.roomEndedAt ?? a.session.scheduledAt,
        ),
      )
    return fuzzySearch(
      hydrated,
      search,
      (r) => `${r.session.title} ${r.course.title}`,
    )
  }, [liveSessions, enrolledCourseIds, getCourseById, search])

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to see your recordings.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_RECORDINGS_TOUR_ID} steps={STUDENT_RECORDINGS_TOUR} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Recordings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length === 0
              ? "Nothing here yet — your classes' recordings will appear after they're posted."
              : `${rows.length} recording${rows.length === 1 ? "" : "s"} from your enrolled courses.`}
          </p>
        </div>
        <TakeATourButton tourId={STUDENT_RECORDINGS_TOUR_ID} />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recordings…"
          className="pl-9"
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No recordings yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {enrolledCourseIds.size === 0
                ? "Enroll in a course to see its class recordings here."
                : "When your teachers post a recording, it'll show up on this page."}
            </p>
            {enrolledCourseIds.size === 0 && (
              <Button asChild className="mt-4" size="sm">
                <Link href={`/p/${slug}/courses`}>
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                  Browse catalog
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead className="hidden md:table-cell">Course</TableHead>
                  <TableHead className="hidden md:table-cell">Recorded</TableHead>
                  <TableHead className="hidden lg:table-cell">Duration</TableHead>
                  <TableHead className="text-right">Watch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ session, course }) => {
                  const lastRec =
                    session.recordings && session.recordings.length > 0
                      ? session.recordings[session.recordings.length - 1]
                      : undefined
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/p/${slug}/learn/${course.slug}`}
                          className="hover:text-primary"
                        >
                          {session.title}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {course.title}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {new Date(
                          session.roomEndedAt ?? session.scheduledAt,
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {formatDuration(lastRec?.durationSec)}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.recordingUrl && (
                          <RecordingPlayerDialog
                            url={session.recordingUrl}
                            title={session.title}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
