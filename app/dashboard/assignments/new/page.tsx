"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Briefcase, ClipboardList, FileText, Paperclip, Plus, RefreshCw, Send, Trash2, FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  generateId,
  useLMS,
  type Assignment,
  type AssignmentKind,
  type AssignmentResource,
  type BatchPost,
  type User,
} from "@/lib/lms-store"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import {
  assignmentPublishedAnnouncement,
  buildNotifications,
  type DispatchPayload,
} from "@/lib/notifications"
import { Bell, MessageSquare, Phone, Users2 } from "lucide-react"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiAssignmentDescription } from "@/lib/ai-client"
import { toast } from "sonner"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

const ASSIGNMENT_NEW_TOUR: TourStep[] = [
  {
    title: "Create new work",
    body: "Pick a kind, write a brief, set a due date, attach resources, publish. Notifications fire to enrolled students automatically.",
    emoji: "📋",
    placement: "center",
  },
  {
    target: "[data-tour='assignment-new-type']",
    title: "Pick the kind",
    body: "Assignment for short homework, Project for longer multi-step deliverables, Test for offline exams. Affects the default fields and student-facing label.",
    emoji: "🎛️",
    placement: "right",
  },
  {
    target: "[data-tour='assignment-new-details']",
    title: "Title + instructions",
    body: "Title is the headline students see. Instructions are rich-text — click 'Draft with AI' for a structured brief (Instructions / Submission / Grading) generated from the title.",
    emoji: "📝",
    placement: "right",
  },
  {
    target: "[data-tour='assignment-new-publish']",
    title: "Publish when ready",
    body: "Publishing schedules the in-app + email + WhatsApp notifications to every enrolled student. You can edit or unpublish later from the detail page.",
    emoji: "🚀",
    placement: "left",
  },
]

const KIND_OPTIONS: Array<{
  value: AssignmentKind
  label: string
  description: string
  icon: React.ReactNode
}> = [
  { value: "assignment", label: "Assignment", description: "Short homework or exercise.", icon: <ClipboardList className="h-4 w-4" /> },
  { value: "project", label: "Project", description: "Longer-form deliverable with a repo or doc.", icon: <Briefcase className="h-4 w-4" /> },
  { value: "test", label: "Test", description: "Offline exam graded out of N points.", icon: <FileText className="h-4 w-4" /> },
]

export default function NewAssignmentPage() {
  const router = useRouter()
  const {
    courses,
    enrollments,
    users,
    addAssignment,
    addNotifications,
    quizzes,
    refreshQuizzes,
    studentGroups,
    addBatchPost,
    currentUser,
  } = useLMS()

  const [kind, setKind] = useState<AssignmentKind>("assignment")
  const [courseId, setCourseId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueAt, setDueAt] = useState("")
  // Max score is OPTIONAL — leave blank for ungraded assignments
  // (reflection prompts, group projects, anything the creator just
  // wants submissions for without a numeric grade attached). Stored
  // as 0 on the Assignment row; reader UIs check for > 0 before
  // rendering the "/<n>" suffix or asking the grader for a number.
  const [maxScore, setMaxScore] = useState("")
  const [saving, setSaving] = useState(false)

  // Audience + channel panel (mirrors the quiz creator). Defaults to
  // "everyone enrolled" and on in-app + email so the existing default
  // experience is unchanged when a teacher just hits Publish.
  type Audience = "all" | "selected" | "community"
  const [audience, setAudience] = useState<Audience>("all")
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [communityId, setCommunityId] = useState<string>("")
  const [notifyInApp, setNotifyInApp] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false)
  const [postToCommunity, setPostToCommunity] = useState(false)
  // Attached resources — files the student needs to do the work
  // (worksheets, reference PDFs, starter code links). The
  // AssignmentResource type already supports file / link / video /
  // note kinds, so the editor here just lets the teacher add as many
  // rows as they want and the data flows through unchanged.
  const [resources, setResources] = useState<AssignmentResource[]>([])
  // Quizzes attached to the assignment. We surface them as a curated
  // list of quizIds that the assignment page renders as a follow-up
  // exercise. Picks from existing quizzes in the same course;
  // "+ Create new" opens the standalone quiz builder in a new tab
  // (the teacher can attach it back here when it's saved).
  const [attachedQuizIds, setAttachedQuizIds] = useState<string[]>([])

  const availableQuizzes = useMemo(
    () => (courseId ? quizzes.filter((q) => q.courseId === courseId) : quizzes),
    [quizzes, courseId],
  )

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const onFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const additions: AssignmentResource[] = Array.from(files).map((f) => {
      // Files persist as object-URLs for the demo session — a real
      // backend would upload to R2 and stamp the public URL here.
      const url = URL.createObjectURL(f)
      return {
        id: generateId("res"),
        type: "file",
        label: f.name,
        url,
        sizeBytes: f.size,
      }
    })
    setResources((prev) => [...prev, ...additions])
  }
  const addLinkResource = () => {
    setResources((prev) => [
      ...prev,
      { id: generateId("res"), type: "link", label: "", url: "" },
    ])
  }
  const removeResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id))
  }
  const updateResource = (id: string, patch: Partial<AssignmentResource>) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const enrolledStudents = useMemo<User[]>(() => {
    if (!courseId) return []
    const studentIds = enrollments.filter((e) => e.courseId === courseId).map((e) => e.studentId)
    return users.filter((u) => studentIds.includes(u.id))
  }, [courseId, enrollments, users])

  const targetStudents = useMemo<User[]>(() => {
    if (audience === "selected") {
      return enrolledStudents.filter((u) => selectedStudentIds.includes(u.id))
    }
    if (audience === "community") {
      const group = studentGroups.find((g) => g.id === communityId)
      if (!group) return []
      return enrolledStudents.filter((u) => group.memberIds.includes(u.id))
    }
    return enrolledStudents
  }, [audience, enrolledStudents, selectedStudentIds, communityId, studentGroups])

  const communityOptions = useMemo(() => {
    if (studentGroups.length === 0) return []
    const ranked = [...studentGroups]
    if (courseId) {
      ranked.sort((a, b) => {
        const aMatch = a.courseId === courseId ? 1 : 0
        const bMatch = b.courseId === courseId ? 1 : 0
        return bMatch - aMatch
      })
    }
    return ranked
  }, [studentGroups, courseId])

  // maxScore is OPTIONAL. Submit needs only a course + title. Empty
  // / blank maxScore means "ungraded" — saved as 0 below, downstream
  // readers branch on `maxScore > 0` for any "/N pts" rendering.
  const canSubmit = !!courseId && !!title.trim()

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    // Materialise attached quizzes into AssignmentResource rows so the
    // assignment renderer can show them inline ("Take the quiz") as
    // a single ordered list with the file/link attachments. Embedding
    // the quiz reference as a resource keeps the existing renderer
    // surface free of a separate quizzes field.
    const quizResources: AssignmentResource[] = attachedQuizIds.map((qid) => {
      const q = quizzes.find((qq) => qq.id === qid)
      return {
        id: generateId("res"),
        type: "link",
        label: q ? `Quiz: ${q.title}` : "Attached quiz",
        url: q ? `/dashboard/quizzes/${q.id}` : undefined,
        note: `quiz:${qid}`,
      }
    })
    const assignment: Assignment = {
      id: generateId("assign"),
      title,
      description,
      courseId,
      kind,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      // Blank / non-numeric input → 0 ("ungraded"). Negative values
      // get floored to 0 too — the grading UI uses 0 as the
      // "no marks" sentinel.
      maxScore: Math.max(0, parseInt(maxScore) || 0),
      resources: [...resources, ...quizResources],
      createdAt: new Date().toISOString(),
    }
    addAssignment(assignment)

    const channelList = [
      notifyInApp ? ("in-app" as const) : null,
      notifyEmail ? ("email" as const) : null,
      notifyWhatsApp ? ("whatsapp" as const) : null,
    ].filter(Boolean) as Array<"in-app" | "email" | "whatsapp">

    if (channelList.length > 0 && targetStudents.length > 0) {
      const course = courses.find((c) => c.id === courseId)
      const payload: DispatchPayload = assignmentPublishedAnnouncement({
        assignmentTitle: assignment.title,
        courseTitle: course?.title ?? "Coursework",
        kind: assignment.kind,
        dueAt: assignment.dueAt,
        assignmentId: assignment.id,
      })
      if (course) payload.url = `/learn/${course.slug}#assignment-${assignment.id}`
      const entries = buildNotifications(targetStudents, payload, {
        channels: channelList,
      })
      addNotifications(entries)
    }

    if (postToCommunity && communityId && currentUser) {
      const post: BatchPost = {
        id: generateId("post"),
        batchId: communityId,
        authorId: currentUser.id,
        body: `<p><strong>📋 New ${assignment.kind}: ${assignment.title}</strong></p>${
          description ? description : ""
        }<p><a href="/assignment/${assignment.shareToken ?? assignment.id}">Open assignment →</a></p>`,
        pinned: false,
        hidden: false,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addBatchPost(post)
    }

    const notifyCount = channelList.length > 0 ? targetStudents.length : 0
    if (notifyCount > 0) {
      toast.success(
        `${assignment.kind === "assignment" ? "Assignment" : assignment.kind === "project" ? "Project" : "Test"} published · notified ${notifyCount} student${notifyCount === 1 ? "" : "s"}${
          postToCommunity && communityId ? " · posted to community" : ""
        }.`,
      )
    } else {
      toast.success("Published.")
    }

    setSaving(false)
    router.push(`/dashboard/assignments/${assignment.id}`)
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId="assignments-new-v1" steps={ASSIGNMENT_NEW_TOUR} />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/assignments">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New work</h1>
            <p className="text-muted-foreground">Assignment, project, or offline test.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId="assignments-new-v1" />
          <Button onClick={handleSubmit} disabled={!canSubmit || saving} data-tour="assignment-new-publish">
            <Send className="mr-2 h-4 w-4" />
            {saving ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card data-tour="assignment-new-type">
            <CardHeader>
              <CardTitle>Type</CardTitle>
              <CardDescription>What kind of work is this?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {KIND_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKind(opt.value)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                      kind === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {opt.icon}
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-tour="assignment-new-details">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Build a todo app with React"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="desc">Instructions</Label>
                  {/* AI drafter — uses the dedicated assignment
                      endpoint so the prompt produces an actual
                      brief (Instructions / Submission / Grading)
                      rather than a generic course description. */}
                  <AIGenerateButton
                    size="xs"
                    label="Draft with AI"
                    disabled={!title.trim()}
                    onGenerate={async () => {
                      const r = await aiAssignmentDescription({ title })
                      if ("error" in r) {
                        toast.error(`Couldn't draft: ${r.error}`)
                        return
                      }
                      setDescription(r.content)
                      toast.success("Drafted — edit as needed.")
                    }}
                  />
                </div>
                {/* WYSIWYG — assignment briefs routinely contain
                    structure: numbered steps, link to a brief doc,
                    inline rubric tables, embedded video. Plain
                    Textarea forced everyone into raw text. */}
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="What students need to do, deliverables, links, rubric…"
                  minHeight={200}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="due">Due date &amp; time</Label>
                  <Input
                    id="due"
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Max score (optional)</Label>
                  <Input
                    id="max"
                    type="number"
                    min={0}
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="Leave blank for ungraded"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Skip if you just want submissions, not a numeric grade. You can add a score later.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments — files the student needs to download
              (worksheets, reference PDFs) or external links (Drive
              folder, GitHub repo). Multi-file upload + ad-hoc link
              add. Persists into Assignment.resources. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </CardTitle>
              <CardDescription>
                Files and links students need to start the work. Drop multiple files at once or paste a Drive / GitHub URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onFilesPicked(e.target.files)
                    e.target.value = ""
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                  Upload files
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addLinkResource}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add link
                </Button>
              </div>
              {resources.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No attachments yet. Upload files or add links so students have everything they need in one place.
                </p>
              ) : (
                <ul className="space-y-2">
                  {resources.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2 text-sm"
                    >
                      {r.type === "file" ? (
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <Input
                        value={r.label}
                        onChange={(e) => updateResource(r.id, { label: e.target.value })}
                        placeholder={r.type === "file" ? "File name" : "Display label"}
                        className="h-8 min-w-[160px] flex-1 text-sm"
                      />
                      {r.type === "link" && (
                        <Input
                          value={r.url ?? ""}
                          onChange={(e) => updateResource(r.id, { url: e.target.value })}
                          placeholder="https://"
                          className="h-8 min-w-[200px] flex-1 text-sm"
                        />
                      )}
                      {r.type === "file" && r.sizeBytes && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {(r.sizeBytes / 1024).toFixed(0)} KB
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeResource(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quizzes — attach existing quizzes from the same course,
              or jump to the quiz builder to create a new one. Useful
              for "submit your project AND take the rubric quiz".
              Attached quizzes show up on the assignment page as
              link resources the student can open. */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4" />
                    Quizzes
                  </CardTitle>
                  <CardDescription>
                    Optionally bundle quizzes — pick from existing ones in this course, or create a new quiz and come back to attach it.
                  </CardDescription>
                </div>
                {/* Refresh — the "Create new quiz" button below opens
                    the builder in a new tab. lms-store hydrates once
                    per tab from localStorage, so a quiz saved in the
                    other tab isn't visible here until we re-pull. */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refreshQuizzes()
                  }}
                  className="gap-1.5"
                  title="Pull the latest quizzes from storage — useful after creating a new quiz in the side tab"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableQuizzes.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  {courseId
                    ? "No quizzes in this course yet. Create one in the quiz builder, then come back here to attach it."
                    : "Pick a course above to see available quizzes."}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {availableQuizzes.map((q) => {
                    const on = attachedQuizIds.includes(q.id)
                    return (
                      <li key={q.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded-md border bg-card p-2.5 text-sm transition-colors",
                            on && "border-primary/40 bg-primary/5",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) =>
                              setAttachedQuizIds((prev) =>
                                e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id),
                              )
                            }
                            className="mt-1 h-3.5 w-3.5"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium leading-tight">{q.title}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {q.questions.length} question{q.questions.length === 1 ? "" : "s"}
                              {q.passingScore != null ? ` · pass ≥ ${q.passingScore}%` : ""}
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link
                  href={courseId ? `/dashboard/quizzes/new?course=${courseId}` : "/dashboard/quizzes/new"}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create new quiz
                </Link>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                The quiz builder opens in a new tab. Save the quiz, then come back to attach it here.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-4 w-4 text-muted-foreground" />
                Assign & notify
              </CardTitle>
              <CardDescription>Who receives this, and how they hear about it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!courseId ? (
                <p className="text-xs text-muted-foreground">
                  Pick a course above to see the eligible audience.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Audience</Label>
                    <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          Everyone enrolled ({enrolledStudents.length})
                        </SelectItem>
                        <SelectItem value="selected">Specific students…</SelectItem>
                        <SelectItem value="community" disabled={communityOptions.length === 0}>
                          A community / batch
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {audience === "selected" && (
                    <div className="space-y-2">
                      <Label>Pick students</Label>
                      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border/60 p-2">
                        {enrolledStudents.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No students enrolled yet.</p>
                        ) : (
                          enrolledStudents.map((s) => {
                            const checked = selectedStudentIds.includes(s.id)
                            return (
                              <label
                                key={s.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/60"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setSelectedStudentIds((prev) =>
                                      e.target.checked
                                        ? [...prev, s.id]
                                        : prev.filter((id) => id !== s.id),
                                    )
                                  }
                                />
                                <span className="truncate">{s.name}</span>
                                <span className="ml-auto truncate text-xs text-muted-foreground">
                                  {s.email}
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {audience === "community" && (
                    <div className="space-y-2">
                      <Label>Community</Label>
                      <Select value={communityId} onValueChange={setCommunityId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a community" />
                        </SelectTrigger>
                        <SelectContent>
                          {communityOptions.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                              {g.courseId === courseId ? " (this course)" : ""} · {g.memberIds.length} members
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                    <Users2 className="mr-1 inline-block h-3 w-3" />
                    <span className="font-medium text-foreground">
                      {targetStudents.length} student{targetStudents.length === 1 ? "" : "s"}
                    </span>{" "}
                    will receive this on publish.
                  </div>

                  <div className="space-y-2">
                    <Label>Notify via</Label>
                    <AssignChannelToggle
                      icon={<Bell className="h-4 w-4 text-muted-foreground" />}
                      label="In-app"
                      description="Shows in the student's inbox + bell."
                      checked={notifyInApp}
                      onChange={setNotifyInApp}
                    />
                    <AssignChannelToggle
                      icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                      label="Email"
                      description="Sends a transactional email per recipient."
                      checked={notifyEmail}
                      onChange={setNotifyEmail}
                    />
                    <AssignChannelToggle
                      icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                      label="WhatsApp"
                      description="Only fires for students with a phone on file."
                      checked={notifyWhatsApp}
                      onChange={setNotifyWhatsApp}
                    />
                  </div>

                  {communityOptions.length > 0 && (
                    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3">
                      <div>
                        <p className="text-sm font-medium">Post to community</p>
                        <p className="text-xs text-muted-foreground">
                          Drops a card into{" "}
                          {communityOptions.find((g) => g.id === communityId)?.name ?? "the picked community"}
                          &apos;s Common Room.
                        </p>
                      </div>
                      <Switch
                        checked={postToCommunity}
                        onCheckedChange={(v) => {
                          setPostToCommunity(v)
                          if (v && !communityId) {
                            const auto = communityOptions[0]?.id
                            if (auto) setCommunityId(auto)
                          }
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function AssignChannelToggle({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-2.5">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
