"use client"

// Batches list — every cohort in the workspace, surfaced as a top-
// level concept (not buried under students). Each card links into
// the batch detail page with two tabs: Members + Common Room.
//
// Internally a "Batch" is a StudentGroup with optional `courseId`
// and `description` — the rename is cosmetic to avoid a giant
// codebase migration, but every UI surface here calls them Batches.

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Plus,
  Search,
  Users2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiCourseDescription } from "@/lib/ai-client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLMS, generateId } from "@/lib/lms-store"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { PlanLimitHint } from "@/components/dashboard/plan-lock"
import { CommunityTooltip } from "@/components/dashboard/community-tooltip"

// Curated colour palette for batch tag dots. Hand-picked so each
// batch in a row reads as visually distinct without the admin having
// to pick a hex value. New batches cycle through them.
const BATCH_COLORS = [
  "#0a3024", // primary
  "#d4af37", // accent
  "#5b8def", // sky
  "#e26a52", // terracotta
  "#7c5cff", // violet
  "#21a179", // mint
  "#c2185b", // rose
  "#0288d1", // teal
]

export default function BatchesPage() {
  const {
    studentGroups,
    addStudentGroup,
    courses,
    getPostsForBatch,
    currentUser,
  } = useLMS()
  const [search, setSearch] = useState("")
  const [openCreate, setOpenCreate] = useState(false)

  const filtered = useMemo(() => {
    return fuzzySearch(studentGroups, search, (g) => [
      g.name,
      g.purpose ?? "",
      g.description ?? "",
    ])
  }, [studentGroups, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Communities</h1>
          <p className="text-muted-foreground">
            Cohorts, staff rooms, alumni circles, peer groups — any space where members talk,
            share, and learn together. Each community has its own feed, members, and access
            settings (open, closed, invite-link, or tag-gated).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pre-warning chip — calm at low usage, amber/red as the
              user approaches the per-plan community cap. The backend
              gates community creation; this is the friendly heads-up. */}
          <PlanLimitHint
            metric="batches"
            current={studentGroups.length}
            noun="Community"
          />
          <CommunityTooltip>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New community
            </Button>
          </CommunityTooltip>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search communities — typos OK"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users2 className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              {studentGroups.length === 0 ? "No communities yet" : "No communities match"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {studentGroups.length === 0
                ? "Spin up your first community — a cohort around a course, a staff room, an alumni circle, anything where members talk. Each one gets its own feed + member roster + access controls."
                : "Try a different search term."}
            </p>
            {studentGroups.length === 0 && (
              <Button className="mt-4" onClick={() => setOpenCreate(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Create your first community
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((batch) => {
            const course = batch.courseId
              ? courses.find((c) => c.id === batch.courseId)
              : undefined
            const postCount = getPostsForBatch(batch.id).length
            return (
              <Link
                key={batch.id}
                href={`/dashboard/batches/${batch.id}`}
                className="group block"
              >
                <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg">
                  {/* Coloured top stripe — visual anchor for the batch
                      so a row of cards reads as a distinct lineup, not
                      one identical card seven times. */}
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: batch.color ?? BATCH_COLORS[0] }}
                  />
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-serif text-lg font-bold leading-tight">
                          {batch.name}
                        </h3>
                        {(batch.purpose || batch.description) && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {batch.description || batch.purpose}
                          </p>
                        )}
                      </div>
                      <span
                        className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: batch.color ?? BATCH_COLORS[0] }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-semibold tabular-nums">
                          {batch.memberIds.length}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Posts</span>
                        <span className="font-semibold tabular-nums">{postCount}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Course</span>
                        <span className="truncate font-semibold" title={course?.title}>
                          {course?.title ?? "—"}
                        </span>
                      </div>
                    </div>
                    <p className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Open batch <ArrowRight className="h-3 w-3" />
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <CreateBatchDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreate={(payload) => {
          const id = generateId("batch")
          const color = BATCH_COLORS[studentGroups.length % BATCH_COLORS.length]
          addStudentGroup({
            id,
            name: payload.name,
            description: payload.description,
            purpose: payload.description, // keep `purpose` in sync for legacy reads
            courseId: payload.courseId,
            color,
            memberIds: [],
            createdBy: currentUser?.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }}
      />
    </div>
  )
}

function CreateBatchDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (payload: { name: string; description?: string; courseId?: string }) => void
}) {
  const { courses } = useLMS()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [courseId, setCourseId] = useState<string>("none")

  function submit() {
    if (!name.trim()) return
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      courseId: courseId !== "none" ? courseId : undefined,
    })
    setName("")
    setDescription("")
    setCourseId("none")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New community</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="batch-name">Name *</Label>
            <Input
              id="batch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vedic Maths · January Cohort"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="batch-desc">Description</Label>
              <AIGenerateButton
                label="Draft with AI"
                size="xs"
                disabled={!name.trim()}
                onGenerate={async () => {
                  const topic = name.trim()
                  if (!topic) {
                    toast.error("Give the community a name first.")
                    return
                  }
                  const r = await aiCourseDescription({ title: topic })
                  if ("error" in r) {
                    toast.error(r.error)
                    return
                  }
                  setDescription(r.description)
                  toast.success("Description drafted. Edit anything you don't love.")
                }}
              />
            </div>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="What is this community for? Who should join? What will members get?"
              minHeight={120}
            />
            <p className="text-[11px] text-muted-foreground">
              Tip: click <em>Draft with AI</em> to write the description from the community name.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="batch-course">Course (optional)</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="batch-course">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No course</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Connects the community to a course so members see related lessons + announcements.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            <Plus className="mr-1.5 h-4 w-4" /> Create community
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

