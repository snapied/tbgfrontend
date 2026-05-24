"use client"

// Enroll-in-courses widget. Lists the student's current enrolments
// with a remove action, plus a dropdown of courses they're NOT yet in
// for one-click enrollment.

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Award,
  BookOpen,
  Plus,
  TrendingUp,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLMS } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"

interface Props {
  studentId: string
}

export function StudentEnrollWidget({ studentId }: Props) {
  const {
    enrollments,
    courses,
    enrollStudent,
    unenrollStudent,
    getCourseById,
    getEnrollmentProgress,
  } = useLMS()
  const confirm = useConfirm()
  const [pendingCourseId, setPendingCourseId] = useState("")

  const myEnrollments = useMemo(
    () => enrollments.filter((e) => e.studentId === studentId),
    [enrollments, studentId],
  )
  // Memoize so it isn't reconstructed every render — was a fresh
  // Set per render, which busted the `availableCourses` memo below.
  const enrolledCourseIds = useMemo(
    () => new Set(myEnrollments.map((e) => e.courseId)),
    [myEnrollments],
  )
  // Only published courses are enrollable. Drafts / archived show in
  // the editor catalogue but can't have learners attached — enrolling
  // someone in a draft just means they hit a half-baked course.
  const availableCourses = useMemo(
    () =>
      courses.filter(
        (c) => !enrolledCourseIds.has(c.id) && c.status === "published",
      ),
    [courses, enrolledCourseIds],
  )

  const handleEnroll = () => {
    if (!pendingCourseId) return
    const course = courses.find((c) => c.id === pendingCourseId)
    if (!course || course.status !== "published") {
      toast.error("This course isn't published yet — pick a published one.")
      return
    }
    enrollStudent(pendingCourseId, studentId)
    setPendingCourseId("")
    toast.success(`Enrolled in "${course.title}".`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Enrolled courses
          </CardTitle>
          <CardDescription>
            {myEnrollments.length === 0
              ? "Not enrolled in anything yet."
              : `${myEnrollments.length} course${myEnrollments.length === 1 ? "" : "s"}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enroll-in form */}
        {availableCourses.length > 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3 sm:flex-row sm:items-center">
            <Select value={pendingCourseId} onValueChange={setPendingCourseId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pick a course to enroll the student in…" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleEnroll} disabled={!pendingCourseId}>
              <Plus className="mr-1.5 h-4 w-4" /> Enroll
            </Button>
          </div>
        )}

        {myEnrollments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-2">
            Pick a course above to enroll this student.
          </p>
        ) : (
          myEnrollments.map((e) => {
            const course = getCourseById(e.courseId)
            // Live progress recomputed from the course's CURRENT
            // lesson set, so stale denormalized totals or deleted
            // lessons don't show fictional 100%s.
            const liveProgress = getEnrollmentProgress(e.id)
            const currentLessonTotal = course
              ? course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
              : 0
            const currentLessonIds = new Set(
              (course?.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id)),
            )
            const liveCompleted = e.completedLessons.filter((id) =>
              currentLessonIds.has(id),
            ).length
            if (!course) {
              // Orphan enrollment — the course was deleted from
              // under this student. Surface it instead of silently
              // hiding so the teacher can unenroll cleanly.
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium italic text-muted-foreground">
                      Course removed
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Enrolled {new Date(e.enrolledAt).toLocaleDateString()} · last seen{" "}
                      {new Date(e.lastAccessedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      unenrollStudent(e.id)
                      toast.success("Removed orphan enrollment.")
                    }}
                    aria-label="Remove orphan enrollment"
                    title="Remove orphan enrollment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            }
            return (
              <div
                key={e.id}
                className="flex items-center gap-4 rounded-lg border border-border p-3"
              >
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-muted">
                  <img
                    src={course.thumbnail || "/placeholder.svg?height=400&width=600"}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/courses/${course.id}`}
                    className="line-clamp-1 font-semibold hover:text-primary"
                  >
                    {course.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress
                      value={liveProgress}
                      className="max-w-32 flex-1"
                      aria-label={`${liveProgress}% progress`}
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">{liveProgress}%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {liveCompleted}/{currentLessonTotal} lessons · Last seen{" "}
                    {new Date(e.lastAccessedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {liveProgress === 100 ? (
                    <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                      <Award className="mr-1 h-3 w-3" /> Completed
                    </span>
                  ) : liveProgress > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
                      <TrendingUp className="mr-1 h-3 w-3" /> In progress
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Not started
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Unenroll from "${course.title}"?`,
                        description: "Their progress on the course will be lost. They can be re-enrolled later.",
                        destructive: true,
                        confirmLabel: "Unenroll",
                      })
                      if (!ok) return
                      unenrollStudent(e.id)
                      toast.success(`Unenrolled from "${course.title}".`)
                    }}
                    title="Unenroll"
                    aria-label={`Unenroll from ${course.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
