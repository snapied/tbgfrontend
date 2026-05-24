"use client"

// AddRecordingToCourseDialog — turn a class recording into a
// curriculum lesson without leaving the recordings page.
//
// Why this exists: teachers run a live class, the recording lands
// in the recordings list, then they go to the course editor,
// manually add a video lesson, copy the URL in, paste the
// transcript… that's 6 steps for what should be one click. This
// dialog wraps the whole flow.
//
// Pick course → pick module (or create a fresh module) →
// optionally edit lesson title (defaults to class title) → submit.
// We create a "video" Lesson, plug in the recording URL as
// `content`, carry the transcript text into the `transcript`
// field, and append it to the chosen module.

import { useEffect, useMemo, useState } from "react"
import { BookOpen, Loader2, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  useLMS,
  generateId,
  type LiveSession,
  type Course,
  type Lesson,
  type Module,
} from "@/lib/lms-store"

interface AddRecordingToCourseDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** The session whose recording is being added. We pull the URL,
   *  title, and transcript metadata from it. */
  session: LiveSession
  /** Pre-fetched transcript text + URL for the recording. Optional
   *  but encouraged — promoted lessons that include a transcript
   *  win on search and accessibility. */
  transcriptText?: string | null
  /** Hint for which course to preselect. Usually the session's own
   *  courseId; falls back to the workspace's first published course. */
  defaultCourseId?: string
}

const NEW_MODULE_VALUE = "__new__"

export function AddRecordingToCourseDialog({
  open,
  onOpenChange,
  session,
  transcriptText,
  defaultCourseId,
}: AddRecordingToCourseDialogProps) {
  const { courses, updateCourse } = useLMS()
  // Restrict the picker to courses the teacher can actually edit —
  // archived courses get filtered out so a recording doesn't slip
  // into a dead curriculum. Drafts are fine (most cohorts iterate
  // their curriculum while the course is still draft).
  const eligibleCourses = useMemo(
    () => courses.filter((c) => c.status !== "archived"),
    [courses],
  )
  const [courseId, setCourseId] = useState<string>("")
  const [moduleId, setModuleId] = useState<string>("")
  const [newModuleTitle, setNewModuleTitle] = useState<string>("")
  const [lessonTitle, setLessonTitle] = useState<string>(session.title)
  const [submitting, setSubmitting] = useState(false)

  // Seed the picker fresh on every open so a previous attempt's
  // choices don't leak into the next session's promotion.
  useEffect(() => {
    if (!open) return
    const preferred =
      defaultCourseId && eligibleCourses.some((c) => c.id === defaultCourseId)
        ? defaultCourseId
        : session.courseId && eligibleCourses.some((c) => c.id === session.courseId)
          ? session.courseId
          : eligibleCourses[0]?.id ?? ""
    setCourseId(preferred)
    const firstModule =
      eligibleCourses.find((c) => c.id === preferred)?.modules?.[0]?.id ?? ""
    setModuleId(firstModule || NEW_MODULE_VALUE)
    setNewModuleTitle("")
    setLessonTitle(session.title)
  }, [open, defaultCourseId, session.id, session.title, session.courseId, eligibleCourses])

  // When the user swaps courses, fall back to that course's first
  // module — the previous moduleId no longer applies.
  const activeCourse = eligibleCourses.find((c) => c.id === courseId)
  useEffect(() => {
    if (!activeCourse) {
      setModuleId(NEW_MODULE_VALUE)
      return
    }
    const stillValid = activeCourse.modules.some((m) => m.id === moduleId)
    if (!stillValid) {
      setModuleId(activeCourse.modules[0]?.id ?? NEW_MODULE_VALUE)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const handleSubmit = async () => {
    if (!activeCourse) {
      toast.error("Pick a course first.")
      return
    }
    const trimmedLessonTitle = lessonTitle.trim()
    if (!trimmedLessonTitle) {
      toast.error("Lesson needs a title.")
      return
    }
    if (moduleId === NEW_MODULE_VALUE && !newModuleTitle.trim()) {
      toast.error("New module needs a title.")
      return
    }
    setSubmitting(true)
    try {
      // Build the lesson. Duration comes from the recording's
      // metadata (rounded to minutes); we leave isPreview false by
      // default so the recording inherits the course's paid state.
      const lastRec = session.recordings?.[session.recordings.length - 1]
      const durationMinutes = lastRec
        ? Math.max(1, Math.round(lastRec.durationSec / 60))
        : session.durationMinutes ?? 30
      const newLesson: Lesson = {
        id: generateId("lesson"),
        title: trimmedLessonTitle,
        description: session.summary?.replace(/<[^>]+>/g, " ").trim() ?? "",
        type: "video",
        content: session.recordingUrl ?? "",
        duration: durationMinutes,
        order: 0,
        isPreview: false,
        transcript: transcriptText ?? undefined,
      }
      let modulesNext: Module[]
      if (moduleId === NEW_MODULE_VALUE) {
        // Append a fresh module containing only this lesson. Order
        // is set to the next available slot so it lands at the end
        // of the curriculum.
        const nextOrder = (activeCourse.modules[activeCourse.modules.length - 1]?.order ?? 0) + 1
        const freshModule: Module = {
          id: generateId("module"),
          title: newModuleTitle.trim(),
          description: "",
          lessons: [{ ...newLesson, order: 1 }],
          order: nextOrder,
        }
        modulesNext = [...activeCourse.modules, freshModule]
      } else {
        // Append to the chosen module, updating order so the new
        // lesson lands at the end.
        modulesNext = activeCourse.modules.map((m) => {
          if (m.id !== moduleId) return m
          const nextLessonOrder =
            (m.lessons[m.lessons.length - 1]?.order ?? 0) + 1
          return {
            ...m,
            lessons: [...m.lessons, { ...newLesson, order: nextLessonOrder }],
          }
        })
      }
      updateCourse(activeCourse.id, { modules: modulesNext })
      toast.success("Added to course.", {
        description: `${trimmedLessonTitle} → ${activeCourse.title}`,
      })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Add recording to a course
          </DialogTitle>
        </DialogHeader>
        {eligibleCourses.length === 0 ? (
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              No editable courses yet. Create a course first, then
              come back to promote this recording into it.
            </p>
            <Button asChild className="w-full">
              <a href="/dashboard/courses/new">Create a course</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <p className="font-medium">{session.title}</p>
              {transcriptText && (
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-success">
                  <Sparkles className="h-2.5 w-2.5" />
                  Transcript will carry over
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                      {c.status === "draft" && (
                        <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                          Draft
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Module</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeCourse?.modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {m.lessons.length} lesson{m.lessons.length === 1 ? "" : "s"}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_MODULE_VALUE}>
                    + Create a new module…
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {moduleId === NEW_MODULE_VALUE && (
              <div className="space-y-1.5">
                <Label htmlFor="new-module-title">New module title</Label>
                <Input
                  id="new-module-title"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Recorded sessions"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="lesson-title">Lesson title</Label>
              <Input
                id="lesson-title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Lesson appears at the end of the module. Edit it
                further in the course editor.
              </p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {eligibleCourses.length > 0 && (
            <Button onClick={handleSubmit} disabled={submitting || !courseId}>
              {submitting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              )}
              Add to course
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Tiny inline-only Course import so the type re-exports cleanly
// from lms-store. Re-export shielding keeps this file from
// dragging in the entire store when imported.
type _CourseShape = Course
void (null as unknown as _CourseShape)
