"use client"

// "My doubts" — every question I've asked (across courses), with the
// reply thread and a "Mark resolved" button. Reuses the role-agnostic
// DoubtThread so the experience matches the teacher inbox visually,
// just scoped to my doubts only.

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Columns3, List, MessageCircleQuestion, Plus, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useLMS,
  generateId,
  type Doubt,
  type DoubtReply,
} from "@/lib/lms-store"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { DoubtThread } from "@/components/students/student-doubts"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import {
  STUDENT_DOUBTS_TOUR,
  STUDENT_DOUBTS_TOUR_ID,
} from "@/components/student/tours"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { buildNotifications, type DispatchPayload } from "@/lib/notifications"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { KanbanBoard, KanbanCard, type KanbanColumn } from "@/components/kanban/kanban-board"
import { useStickyView } from "@/lib/use-sticky-view"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

export default function MyDoubtsPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  void slug
  const {
    currentUser,
    doubts,
    users,
    courses,
    enrollments,
    getCourseById,
    addDoubt,
    addNotifications,
    replyToDoubt,
    setDoubtStatus,
    deleteDoubt,
  } = useLMS()
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })
  const [tab, setTab] = useState<"all" | "open" | "resolved">("open")
  const [askOpen, setAskOpen] = useState(false)
  const [view, setView] = useStickyView("student.doubts", "list")

  const myDoubts = useMemo(() => {
    if (!currentUser) return []
    return doubts
      .filter((d) => d.studentId === currentUser.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [currentUser, doubts])

  const counts = useMemo(
    () => ({
      all: myDoubts.length,
      open: myDoubts.filter((d) => d.status === "open").length,
      resolved: myDoubts.filter((d) => d.status === "resolved").length,
    }),
    [myDoubts],
  )

  const visible = useMemo(() => {
    const byTab = myDoubts.filter((d) => {
      if (tab === "open") return d.status === "open"
      if (tab === "resolved") return d.status === "resolved"
      return true
    })
    return fuzzySearch(byTab, search, (d) => d.title)
  }, [myDoubts, tab, search])

  const getReplierName = (id: string) => {
    if (currentUser && id === currentUser.id) return "You"
    return users.find((u) => u.id === id)?.name ?? "Instructor"
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to see your doubts.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_DOUBTS_TOUR_ID} steps={STUDENT_DOUBTS_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">My doubts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.all} total · {counts.open} open · {counts.resolved} resolved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId={STUDENT_DOUBTS_TOUR_ID} />
          <Button size="sm" onClick={() => setAskOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Ask new doubt
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search my doubts…"
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="kanban" aria-label="Kanban view">
              <Columns3 className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircleQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {myDoubts.length === 0 ? "You haven't asked any doubts yet" : "Nothing in this view"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {myDoubts.length === 0
                ? "Click “Ask new doubt” up top to send your first question — your teacher gets pinged immediately."
                : "Switch tabs or clear search to see more."}
            </p>
            {myDoubts.length === 0 && (
              <Button className="mt-4" onClick={() => setAskOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Ask new doubt
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <KanbanBoard
          columns={
            [
              {
                key: "open",
                label: "Open",
                tone: "amber",
                rows: visible.filter((d) => d.status === "open"),
              },
              {
                key: "resolved",
                label: "Resolved",
                tone: "emerald",
                rows: visible.filter((d) => d.status === "resolved"),
              },
            ] as Array<KanbanColumn<(typeof visible)[number]>>
          }
          keyOf={(d) => d.id}
          renderCard={(doubt) => {
            const course = doubt.courseId ? getCourseById(doubt.courseId) : undefined
            return (
              <KanbanCard
                title={doubt.title}
                subtitle={`${course?.title ?? "General"} · ${doubt.replies.length} repl${
                  doubt.replies.length === 1 ? "y" : "ies"
                }`}
              />
            )
          }}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((doubt) => {
            const course = doubt.courseId ? getCourseById(doubt.courseId) : undefined
            return (
              <DoubtThread
                key={doubt.id}
                doubt={doubt}
                courseTitle={course?.title}
                authorName="You"
                getReplierName={getReplierName}
                onReply={(body) => {
                  const reply: DoubtReply = {
                    id: generateId("reply"),
                    authorId: currentUser.id,
                    body,
                    createdAt: new Date().toISOString(),
                  }
                  replyToDoubt(doubt.id, reply)
                }}
                onResolve={() =>
                  setDoubtStatus(
                    doubt.id,
                    doubt.status === "open" ? "resolved" : "open",
                  )
                }
                onDelete={() => {
                  deleteDoubt(doubt.id)
                  toastUndoableDelete({
                    kind: "doubt",
                    ids: doubt.id,
                    label: doubt.title || "Doubt",
                    itemNoun: "doubt",
                    recoverPath: `/p/${slug}/my/trash`,
                  })
                }}
              />
            )
          })}
        </div>
      )}

      <AskDoubtDialog
        open={askOpen}
        onOpenChange={setAskOpen}
        myEnrollments={enrollments.filter((e) => e.studentId === currentUser.id)}
        courses={courses}
        users={users}
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
        onSubmit={(payload) => {
          // Persist the doubt + ping the right people. We pick
          // teacher recipients by walking the course's lead +
          // co-instructors, falling back to every admin/instructor
          // in the workspace when no course is selected — better to
          // over-notify than to drop a question on the floor.
          const doubt: Doubt = {
            id: generateId("doubt"),
            studentId: currentUser.id,
            courseId: payload.courseId || undefined,
            title: payload.title,
            body: payload.body,
            replies: [],
            status: "open",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          addDoubt(doubt)

          const recipients = (() => {
            if (payload.courseId) {
              const course = getCourseById(payload.courseId)
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

          const dispatch: DispatchPayload = {
            type: "doubt.created",
            title: `New doubt from ${currentUser.name}`,
            body: payload.title,
            url: `/dashboard/doubts/${doubt.id}`,
            meta: { doubtId: doubt.id, courseId: payload.courseId },
          }
          const entries = buildNotifications(recipients, dispatch)
          addNotifications(entries)

          toast.success("Doubt sent · your teacher just got pinged.")
        }}
      />
    </div>
  )
}

// Radix Select forbids "" as an item value (empty string is reserved
// for the "no selection" state on the trigger). Use this sentinel for
// the "no course" option and translate at the boundary.
const COURSE_NONE_SENTINEL = "__none__"

interface AskDoubtPayload {
  title: string
  body: string
  courseId: string
}

function AskDoubtDialog({
  open,
  onOpenChange,
  myEnrollments,
  courses,
  users,
  currentUserId,
  currentUserName,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  myEnrollments: { courseId: string }[]
  courses: Array<{ id: string; title: string }>
  users: Array<{ id: string; role: string }>
  currentUserId: string
  currentUserName: string
  onSubmit: (payload: AskDoubtPayload) => void
}) {
  void users
  void currentUserId
  void currentUserName
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [courseId, setCourseId] = useState<string>("")
  const enrolledCourses = useMemo(
    () => {
      const ids = new Set(myEnrollments.map((e) => e.courseId))
      return courses.filter((c) => ids.has(c.id))
    },
    [myEnrollments, courses],
  )
  const canSubmit = title.trim().length > 0 && body.trim().length > 0
  const reset = () => {
    setTitle("")
    setBody("")
    setCourseId("")
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Ask a new doubt</DialogTitle>
          <DialogDescription>
            Your teacher hears about this immediately via in-app, email, and WhatsApp (when configured). Tie it to a course so the right teacher sees it first.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="doubt-title">Title</Label>
            <Input
              id="doubt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="One-line summary"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Question</Label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Walk through what you're stuck on. Paste code, links, screenshots — whatever helps."
              minHeight={140}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Course (optional)</Label>
            {/* Radix Select rejects "" as an item value, so we use a
                sentinel for "no course" and translate it on read/write. */}
            <Select
              value={courseId || COURSE_NONE_SENTINEL}
              onValueChange={(v) =>
                setCourseId(v === COURSE_NONE_SENTINEL ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COURSE_NONE_SENTINEL}>
                  General — no specific course
                </SelectItem>
                {enrolledCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tying a course routes the ping to that course&apos;s teacher. Leave blank for a general question and every workspace teacher will see it.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              onSubmit({ title: title.trim(), body, courseId })
              onOpenChange(false)
              reset()
            }}
          >
            Send doubt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
