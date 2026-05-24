"use client"

// "Use this board in…" dialog.
//
// Whiteboards used to be a dead-end — planning happened on the canvas
// and then the teacher had to manually replicate the outcome into a
// lesson, a community post, or a discussion thread. This dialog
// closes that loop with two surfaces:
//
//   1. **Attach to a lesson** — adds the board to the lesson's
//      resource list so students viewing the lesson see the canvas
//      embedded. The board ↔ lesson link is stored on the board's
//      `attachedToLessons` array; the lesson page reads it in reverse
//      via `getWhiteboardsForLesson`.
//   2. **Post to a community** — posts a `BatchPost` into the chosen
//      community's feed with the teacher's caption + the board URL.
//      We track the post on the board side via `postedToBatches` so
//      the card can show a "posted to N communities" indicator.
//
// Both surfaces live in one Tabs container because they're the same
// "what should this board feed into?" decision — a tab keeps each
// flow simple and avoids forcing a generic "connect" abstraction.

import { useEffect, useMemo, useState } from "react"
import { Link2, MessageSquarePlus, Check, Loader2, BookOpen, Users2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  useLMS,
  generateId,
  type Whiteboard,
  type BatchPost,
} from "@/lib/lms-store"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  board: Whiteboard
}

export function WhiteboardConnectDialog({ open, onOpenChange, board }: Props) {
  const {
    courses,
    studentGroups,
    addBatchPost,
    updateWhiteboard,
    currentUser,
  } = useLMS()

  const [tab, setTab] = useState<"lesson" | "community">("lesson")
  const [courseId, setCourseId] = useState<string>("")
  const [lessonId, setLessonId] = useState<string>("")
  const [batchId, setBatchId] = useState<string>("")
  const [caption, setCaption] = useState<string>(
    `Just put together this whiteboard — ${board.title}. Take a look and share thoughts 👇`,
  )
  const [submitting, setSubmitting] = useState(false)

  // Reset to a clean slate whenever the dialog reopens so a previous
  // session's pick doesn't pre-fill into the wrong board.
  useEffect(() => {
    if (!open) return
    setTab("lesson")
    setCourseId(courses[0]?.id ?? "")
    setLessonId("")
    setBatchId(studentGroups[0]?.id ?? "")
    setCaption(
      `Just put together this whiteboard — ${board.title}. Take a look and share thoughts 👇`,
    )
  }, [open, board.title, courses, studentGroups])

  // Lessons in the currently-selected course, flattened across modules
  // with a "Module · Lesson" label so the picker reads naturally.
  const lessonOptions = useMemo(() => {
    const course = courses.find((c) => c.id === courseId)
    if (!course) return []
    return course.modules.flatMap((m) =>
      m.lessons.map((l) => ({
        id: l.id,
        label: `${m.title} · ${l.title}`,
      })),
    )
  }, [courses, courseId])

  // Which lessons / communities is THIS board already connected to?
  // We use this to show a confirmation chip ("Already attached") so a
  // teacher doesn't accidentally duplicate the connection.
  const alreadyAttached = useMemo(
    () => new Set(board.attachedToLessons ?? []),
    [board.attachedToLessons],
  )
  const alreadyPosted = useMemo(
    () => new Set(board.postedToBatches ?? []),
    [board.postedToBatches],
  )

  const handleAttachLesson = () => {
    if (!lessonId) {
      toast.error("Pick a lesson first.")
      return
    }
    if (alreadyAttached.has(lessonId)) {
      toast.info("Already attached to that lesson.")
      return
    }
    setSubmitting(true)
    const next = Array.from(new Set([...(board.attachedToLessons ?? []), lessonId]))
    updateWhiteboard(board.id, { attachedToLessons: next })
    const course = courses.find((c) => c.id === courseId)
    const lessonLabel = lessonOptions.find((l) => l.id === lessonId)?.label
    toast.success("Attached to lesson", {
      description: course && lessonLabel ? `${course.title} · ${lessonLabel}` : undefined,
    })
    setSubmitting(false)
    onOpenChange(false)
  }

  const handlePostToCommunity = () => {
    if (!batchId) {
      toast.error("Pick a community first.")
      return
    }
    if (alreadyPosted.has(batchId)) {
      toast.info("Already posted to that community.")
      return
    }
    const body = caption.trim()
    if (!body) {
      toast.error("Add a caption so members know what they're looking at.")
      return
    }
    setSubmitting(true)
    // We assemble a BatchPost with the board URL as the embed. The
    // post body links to /dashboard/whiteboards/<id> so a member can
    // click into the canvas directly from the community feed.
    const boardUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard/whiteboards/${board.id}`
        : `/dashboard/whiteboards/${board.id}`
    const post: BatchPost = {
      id: generateId("post"),
      batchId,
      authorId: currentUser?.id ?? "unknown",
      body: `${body}\n\n${boardUrl}`,
      embedUrl: boardUrl,
      pinned: false,
      hidden: false,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addBatchPost(post)
    // Mirror the link onto the board side so the card can render a
    // "posted to N communities" pill without iterating posts.
    const next = Array.from(new Set([...(board.postedToBatches ?? []), batchId]))
    updateWhiteboard(board.id, { postedToBatches: next })
    const community = studentGroups.find((g) => g.id === batchId)
    toast.success("Posted to community", {
      description: community ? community.name : undefined,
    })
    setSubmitting(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Link2 className="h-5 w-5 text-primary" />
            Use this whiteboard in…
          </DialogTitle>
          <DialogDescription>
            Connect <span className="font-medium text-foreground">{board.title}</span> to
            a course lesson or share it into a community feed.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "lesson" | "community")} className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lesson" className="gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              Attach to a lesson
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-2">
              <Users2 className="h-3.5 w-3.5" />
              Post to a community
            </TabsTrigger>
          </TabsList>

          {/* ── Lesson tab ────────────────────────────────────────── */}
          <TabsContent value="lesson" className="space-y-3 pt-3">
            {courses.length === 0 ? (
              <EmptyHint
                title="No courses yet"
                body="Create a course first so the whiteboard has a home. Each course → module → lesson can host any number of boards."
              />
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="wbc-course">Course</Label>
                  <Select value={courseId} onValueChange={(v) => { setCourseId(v); setLessonId("") }}>
                    <SelectTrigger id="wbc-course">
                      <SelectValue placeholder="Pick a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wbc-lesson">Lesson</Label>
                  <Select
                    value={lessonId}
                    onValueChange={setLessonId}
                    disabled={lessonOptions.length === 0}
                  >
                    <SelectTrigger id="wbc-lesson">
                      <SelectValue placeholder={lessonOptions.length === 0 ? "This course has no lessons yet" : "Pick a lesson"} />
                    </SelectTrigger>
                    <SelectContent>
                      {lessonOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          <span className="flex items-center gap-2">
                            {l.label}
                            {alreadyAttached.has(l.id) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-700">
                                <Check className="h-2.5 w-2.5" />
                                attached
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Students viewing this lesson will see the whiteboard embedded as a resource.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAttachLesson}
                    disabled={!lessonId || submitting}
                    className="gap-1.5"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    Attach
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Community tab ─────────────────────────────────────── */}
          <TabsContent value="community" className="space-y-3 pt-3">
            {studentGroups.length === 0 ? (
              <EmptyHint
                title="No communities yet"
                body="Spin up a community first — it's where the post will land. Cohorts, staff rooms, alumni circles all work."
              />
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="wbc-batch">Community</Label>
                  <Select value={batchId} onValueChange={setBatchId}>
                    <SelectTrigger id="wbc-batch">
                      <SelectValue placeholder="Pick a community" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <span className="flex items-center gap-2">
                            {g.name}
                            {alreadyPosted.has(g.id) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-700">
                                <Check className="h-2.5 w-2.5" />
                                posted
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wbc-caption">Caption</Label>
                  <Textarea
                    id="wbc-caption"
                    rows={4}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="What should members notice about this board?"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The post links back to the board, so members can open it and discuss in the comments.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePostToCommunity}
                    disabled={!batchId || !caption.trim() || submitting}
                    className="gap-1.5"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
                    Post
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <div className={cn("rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center")}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{body}</p>
    </div>
  )
}
