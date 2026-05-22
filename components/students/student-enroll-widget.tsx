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
  const { enrollments, courses, enrollStudent, unenrollStudent, getCourseById } = useLMS()
  const confirm = useConfirm()
  const [pendingCourseId, setPendingCourseId] = useState("")

  const myEnrollments = useMemo(
    () => enrollments.filter((e) => e.studentId === studentId),
    [enrollments, studentId],
  )
  const enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseId))
  const availableCourses = useMemo(
    () => courses.filter((c) => !enrolledCourseIds.has(c.id)),
    [courses, enrolledCourseIds],
  )

  const handleEnroll = () => {
    if (!pendingCourseId) return
    enrollStudent(pendingCourseId, studentId)
    setPendingCourseId("")
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
            if (!course) return null
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
                    <Progress value={e.progress} className="max-w-32 flex-1" />
                    <span className="text-xs text-muted-foreground">{e.progress}%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {e.completedLessons.length}/{course.totalLessons} lessons · Last seen{" "}
                    {new Date(e.lastAccessedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {e.progress === 100 ? (
                    <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                      <Award className="mr-1 h-3 w-3" /> Completed
                    </span>
                  ) : e.progress > 0 ? (
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
