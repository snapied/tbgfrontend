"use client"

// Student testimonial submission flow.
//
// What students do here:
//   • Write a short quote + optional star rating.
//   • Tag the course it's about (optional but recommended).
//   • Attach ONE piece of media (image, video, audio, or a file) to
//     back up the testimonial. Media is uploaded via the existing
//     uploadAsset helper (Cloudflare R2 in prod, local stub in dev).
//
// What happens on submit:
//   1. A `PortalTestimonial` is upserted with status="pending".
//   2. An in-app + email + WhatsApp notification fires to the course's
//      instructor (falls back to every staff member when the
//      testimonial isn't course-scoped).
//   3. The student sees their own pending submissions on this page so
//      they know it's in the queue.
//
// Instructor publish / reject happens at /dashboard/portal/testimonials.

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Star,
  X,
  XCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePortal, type PortalTestimonial } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { uploadAsset } from "@/lib/upload-asset"
import { buildNotifications, type DispatchPayload } from "@/lib/notifications"
import { toast } from "sonner"

const COURSE_NONE = "__none__"

function classifyMedia(file: File): "image" | "video" | "audio" | "file" {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  if (file.type.startsWith("audio/")) return "audio"
  return "file"
}

export default function MyTestimonialsPage() {
  const {
    currentUser,
    courses,
    enrollments,
    users,
    getCourseById,
    addNotifications,
  } = useLMS()
  const { testimonials, upsertTestimonial } = usePortal()

  // Form state
  const [quote, setQuote] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Enrolled courses for the picker — students should only attribute
  // a testimonial to a course they actually took.
  const myCourses = useMemo(() => {
    if (!currentUser) return []
    const ids = new Set(
      enrollments
        .filter((e) => e.studentId === currentUser.id)
        .map((e) => e.courseId),
    )
    return courses.filter((c) => ids.has(c.id))
  }, [currentUser, enrollments, courses])

  // The student's own submissions across all states.
  const myTestimonials = useMemo<PortalTestimonial[]>(() => {
    if (!currentUser) return []
    return testimonials
      .filter((t) => t.submittedByUserId === currentUser.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [testimonials, currentUser])

  const canSubmit = quote.trim().length >= 8 && !submitting

  const submit = async () => {
    if (!currentUser || !canSubmit) return
    setSubmitting(true)
    try {
      let mediaUrl: string | undefined
      let mediaKind: PortalTestimonial["mediaKind"] | undefined
      let mediaFilename: string | undefined
      if (file) {
        try {
          const res = await uploadAsset(file, "faculty")
          mediaUrl = res.url
          mediaKind = classifyMedia(file)
          mediaFilename = file.name
        } catch (err) {
          // Upload failed — let the student submit text-only rather
          // than block them entirely. They can re-submit with media
          // if they want to retry.
          // eslint-disable-next-line no-console
          console.warn("[testimonial submit] upload failed", err)
          toast.warning(
            "Couldn't upload the file. Submitting text only — re-submit if you want to attach again.",
          )
        }
      }

      const submission: PortalTestimonial = {
        id: `tst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        authorName: currentUser.name,
        avatar: currentUser.avatar,
        courseId: courseId || undefined,
        rating: rating ?? undefined,
        quote: quote.trim(),
        source: "student-submission",
        status: "pending",
        createdAt: new Date().toISOString(),
        mediaUrl,
        mediaKind,
        mediaFilename,
        submittedByUserId: currentUser.id,
      }
      upsertTestimonial(submission)

      // Notify the course's instructor (+ co-instructors). Fall back
      // to all admin/instructor users when the submission isn't
      // course-scoped.
      const recipients = (() => {
        if (courseId) {
          const course = getCourseById(courseId)
          if (course) {
            const ids = new Set<string>()
            ids.add(course.instructor.id)
            course.coInstructorIds?.forEach((i) => ids.add(i))
            const matched = users.filter((u) => ids.has(u.id))
            if (matched.length > 0) return matched
          }
        }
        return users.filter(
          (u) => u.role === "admin" || u.role === "instructor",
        )
      })()
      const payload: DispatchPayload = {
        type: "testimonial.pending-review",
        title: `New testimonial from ${currentUser.name}`,
        body: submission.quote.slice(0, 120),
        url: "/dashboard/portal/testimonials",
        meta: { testimonialId: submission.id, courseId },
      }
      const entries = buildNotifications(recipients, payload)
      addNotifications(entries)

      toast.success("Thanks — sent for review. Your teacher will decide what to publish.")
      setQuote("")
      setRating(null)
      setCourseId("")
      setFile(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to leave a testimonial.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Leave a testimonial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share what worked for you. Your teacher reviews submissions before publishing — yours land in the queue immediately.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-quote">Your testimonial</Label>
            <Textarea
              id="t-quote"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="What worked? Be specific — outcomes, moments, things that surprised you."
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground">
              Minimum 8 characters. Yours will appear on the workspace&apos;s public Wall of Love and any page that surfaces testimonials, once your teacher approves it.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rating (optional)</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = rating != null && n <= rating
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(rating === n ? null : n)}
                      className="rounded-md p-1 transition-colors hover:bg-muted"
                      aria-label={`${n} stars`}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          active
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  )
                })}
                {rating != null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRating(null)}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Course (optional)</Label>
              <Select
                value={courseId || COURSE_NONE}
                onValueChange={(v) => setCourseId(v === COURSE_NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={COURSE_NONE}>
                    General — no specific course
                  </SelectItem>
                  {myCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-file">Attach media (optional)</Label>
            {file ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · {classifyMedia(file)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="t-file"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-6 text-sm text-muted-foreground hover:bg-muted/40"
              >
                <Paperclip className="h-4 w-4" />
                Click to attach an image / video / audio / file
              </label>
            )}
            <input
              id="t-file"
              type="file"
              accept="image/*,video/*,audio/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setFile(f)
                e.target.value = ""
              }}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit}>
              {submitting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Submit for review
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-serif text-lg font-semibold">My submissions</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pending ones are waiting on your teacher. Published ones are live on the workspace.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {myTestimonials.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">Nothing submitted yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your first one above — it takes 30 seconds.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {myTestimonials.map((t) => {
                const StatusIcon =
                  t.status === "rejected"
                    ? XCircle
                    : t.status === "pending"
                      ? Clock3
                      : CheckCircle2
                const statusVariant =
                  t.status === "rejected"
                    ? "destructive"
                    : t.status === "pending"
                      ? "secondary"
                      : "default"
                const courseTitle = t.courseId
                  ? getCourseById(t.courseId)?.title
                  : undefined
                return (
                  <li key={t.id} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant} className="capitalize">
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {t.status ?? "published"}
                      </Badge>
                      {t.rating && (
                        <span className="text-xs text-amber-600">
                          {"★".repeat(t.rating)}
                        </span>
                      )}
                      {courseTitle && (
                        <Badge variant="outline" className="text-[10px]">
                          {courseTitle}
                        </Badge>
                      )}
                      {t.mediaKind && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          <Paperclip className="mr-1 h-3 w-3" />
                          {t.mediaKind}
                        </Badge>
                      )}
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{t.quote}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
