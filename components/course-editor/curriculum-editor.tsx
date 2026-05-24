"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Lock,
  type LucideIcon,
  Music,
  Paperclip,
  Plus,
  Radio,
  Share2,
  Sparkles,
  Trash2,
  Type,
  Video,
  Webhook,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { LessonContentPreview } from "@/components/course-editor/lesson-content-preview"
import { QuickQuizDialog } from "@/components/course-editor/quick-quiz-dialog"
import { QuickLiveSessionDialog } from "@/components/course-editor/quick-live-session-dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  type Lesson,
  type LessonType,
  type Module,
  type Quiz,
} from "@/lib/lms-store"
import {
  detectEmbedProvider,
  detectVideoProvider,
  inferLessonType,
  providerLabel,
} from "@/lib/lesson-utils"
import { FileUploadField } from "@/components/upload/file-upload-field"
import { uploadAsset } from "@/lib/upload-asset"
import { AssignmentComposer } from "@/components/assignments/assignment-composer"
import { AssignmentShareDialog } from "@/components/assignments/assignment-share-dialog"
import { useConfirm } from "@/lib/use-confirm"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiLessonContent } from "@/lib/ai-client"
import { toast } from "sonner"

interface CurriculumEditorProps {
  modules: Module[]
  onChange: (modules: Module[]) => void
  coursePriced: boolean  // affects defaults for lock toggle
  // Optional — when present, lessons gain a "Post follow-up" button that
  // creates an assignment bound to that lesson.
  courseId?: string
  // Faculty list — passed to each module row so a co-taught course
  // can assign an owner per module. Pass-through only; the editor
  // itself doesn't render the picker. Hidden when ≤ 1 candidate.
  faculty?: Array<{ id: string; name: string; role?: string }>
}

const TYPE_META: Record<LessonType, { label: string; icon: LucideIcon }> = {
  video: { label: "Video", icon: Video },
  text: { label: "Reading", icon: Type },
  pdf: { label: "PDF", icon: FileText },
  document: { label: "Document", icon: FileText },
  embed: { label: "Embed", icon: Webhook },
  audio: { label: "Audio", icon: Music },
  quiz: { label: "Quiz", icon: Sparkles },
  live: { label: "Live class", icon: Radio },
  // Sprint C Recordings #34 — lesson type that references an
  // existing recording from the library. Reuses Video as the
  // picker icon (same visual category) but the lesson player
  // resolves a session id rather than a raw URL.
  recording: { label: "Recording", icon: Video },
}

// ============================================================
// Top-level component
// ============================================================
export function CurriculumEditor({ modules, onChange, coursePriced, courseId, faculty }: CurriculumEditorProps) {
  const confirm = useConfirm()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(modules.map((m) => [m.id, true])),
  )
  const [openLesson, setOpenLesson] = useState<string | null>(null)

  // Drag-drop refs. We use HTML5 DnD so there's no new dependency.
  const dragModuleId = useRef<string | null>(null)
  const dragLesson = useRef<{ moduleId: string; lessonId: string } | null>(null)

  // Authoritative copy of the latest modules array — the prop `modules`
  // is captured per-render, so back-to-back update helpers (e.g. an
  // onValueChange that fires `type` + `content` patches in the same tick)
  // would otherwise read stale state and lose one of the writes. Reading
  // from the ref instead lets each helper see the previous helper's
  // result without waiting for the parent re-render.
  const modulesRef = useRef(modules)
  useEffect(() => { modulesRef.current = modules }, [modules])

  const toggleModule = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }))

  const addModule = () => {
    const cur = modulesRef.current
    const mod: Module = {
      id: generateId("mod"),
      title: `Module ${cur.length + 1}`,
      description: "",
      lessons: [],
      order: cur.length + 1,
    }
    const next = [...cur, mod]
    modulesRef.current = next
    onChange(next)
    setExpanded((s) => ({ ...s, [mod.id]: true }))
  }

  const updateModule = (id: string, patch: Partial<Module>) => {
    const next = modulesRef.current.map((m) => (m.id === id ? { ...m, ...patch } : m))
    modulesRef.current = next
    onChange(next)
  }

  const deleteModule = async (id: string) => {
    const target = modulesRef.current.find((m) => m.id === id)
    if (!target) return
    // Always confirm — even an empty module is the wrong thing to
    // lose to a stray click. Body copy adapts to whether it has
    // lessons under it so the cost is named explicitly.
    const ok = await confirm({
      title: `Delete "${target.title}"?`,
      description:
        target.lessons.length > 0
          ? `This removes the module and its ${target.lessons.length} lesson${target.lessons.length === 1 ? "" : "s"}. You can restore it from Trash within 7 days.`
          : "This removes the module. You can restore it from Trash within 7 days.",
      destructive: true,
      confirmLabel: "Delete module",
    })
    if (!ok) return
    const next = modulesRef.current.filter((m) => m.id !== id)
    modulesRef.current = next
    onChange(next)
  }

  const reorderModules = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const cur = modulesRef.current
    const fromIdx = cur.findIndex((m) => m.id === sourceId)
    const toIdx = cur.findIndex((m) => m.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...cur]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    const reordered = next.map((m, i) => ({ ...m, order: i + 1 }))
    modulesRef.current = reordered
    onChange(reordered)
  }

  // ---- Lessons ----

  const addLesson = (moduleId: string) => {
    const mod = modulesRef.current.find((m) => m.id === moduleId)
    if (!mod) return
    const lesson: Lesson = {
      id: generateId("les"),
      title: "Untitled lesson",
      description: "",
      type: "video",
      content: "",
      duration: 10,
      order: mod.lessons.length + 1,
      isPreview: false,
      isLocked: coursePriced,
    }
    updateModule(moduleId, { lessons: [...mod.lessons, lesson] })
    setOpenLesson(lesson.id)
  }

  const updateLesson = (moduleId: string, lessonId: string, patch: Partial<Lesson>) => {
    const mod = modulesRef.current.find((m) => m.id === moduleId)
    if (!mod) return
    updateModule(moduleId, {
      lessons: mod.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
    })
  }

  const deleteLesson = async (moduleId: string, lessonId: string) => {
    const mod = modulesRef.current.find((m) => m.id === moduleId)
    if (!mod) return
    const target = mod.lessons.find((l) => l.id === lessonId)
    const ok = await confirm({
      title: `Delete "${target?.title ?? "lesson"}"?`,
      description: "This removes the lesson from the module. Student progress on it stays in your records.",
      destructive: true,
    })
    if (!ok) return
    updateModule(moduleId, { lessons: mod.lessons.filter((l) => l.id !== lessonId) })
  }

  // Clone an existing lesson and insert it directly after the source so a
  // Instructor can spin up a near-identical lesson (same template / type /
  // content URL pattern) without re-typing the form. New attachments get
  // fresh ids so the clone doesn't share refs with the original.
  const duplicateLesson = (moduleId: string, lessonId: string) => {
    const mod = modulesRef.current.find((m) => m.id === moduleId)
    if (!mod) return
    const source = mod.lessons.find((l) => l.id === lessonId)
    if (!source) return
    const copy: Lesson = {
      ...source,
      id: generateId("les"),
      title: source.title ? `${source.title} (copy)` : "Untitled lesson",
      attachments: (source.attachments ?? []).map((a) => ({ ...a, id: generateId("att") })),
    }
    const sourceIdx = mod.lessons.findIndex((l) => l.id === lessonId)
    const next = [...mod.lessons]
    next.splice(sourceIdx + 1, 0, copy)
    updateModule(moduleId, { lessons: next.map((l, i) => ({ ...l, order: i + 1 })) })
    setOpenLesson(copy.id)
  }

  const reorderLessonsWithinModule = (moduleId: string, sourceLessonId: string, targetLessonId: string) => {
    if (sourceLessonId === targetLessonId) return
    const mod = modulesRef.current.find((m) => m.id === moduleId)
    if (!mod) return
    const fromIdx = mod.lessons.findIndex((l) => l.id === sourceLessonId)
    const toIdx = mod.lessons.findIndex((l) => l.id === targetLessonId)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...mod.lessons]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    updateModule(moduleId, { lessons: next.map((l, i) => ({ ...l, order: i + 1 })) })
  }

  const moveLessonToModule = (sourceModuleId: string, lessonId: string, targetModuleId: string) => {
    if (sourceModuleId === targetModuleId) return
    const cur = modulesRef.current
    const sourceMod = cur.find((m) => m.id === sourceModuleId)
    const targetMod = cur.find((m) => m.id === targetModuleId)
    if (!sourceMod || !targetMod) return
    const lesson = sourceMod.lessons.find((l) => l.id === lessonId)
    if (!lesson) return
    const next = cur.map((m) => {
      if (m.id === sourceModuleId) {
        return { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId).map((l, i) => ({ ...l, order: i + 1 })) }
      }
      if (m.id === targetModuleId) {
        return { ...m, lessons: [...m.lessons, { ...lesson, order: m.lessons.length + 1 }] }
      }
      return m
    })
    modulesRef.current = next
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {modules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-8 text-center bg-muted/30">
          <p className="text-sm text-muted-foreground">No modules yet.</p>
          <Button onClick={addModule} className="mt-3">
            <Plus className="mr-2 h-4 w-4" />
            Add first module
          </Button>
        </div>
      ) : (
        modules.map((mod, idx) => (
          <ModuleCard
            key={mod.id}
            module={mod}
            index={idx}
            expanded={!!expanded[mod.id]}
            openLessonId={openLesson}
            coursePriced={coursePriced}
            courseId={courseId}
            faculty={faculty}
            onToggle={() => toggleModule(mod.id)}
            onUpdate={(patch) => updateModule(mod.id, patch)}
            onDelete={() => deleteModule(mod.id)}
            onAddLesson={() => addLesson(mod.id)}
            onUpdateLesson={(lid, patch) => updateLesson(mod.id, lid, patch)}
            onDeleteLesson={(lid) => deleteLesson(mod.id, lid)}
            onDuplicateLesson={(lid) => duplicateLesson(mod.id, lid)}
            onReorderLessons={(src, tgt) => reorderLessonsWithinModule(mod.id, src, tgt)}
            onSetOpenLesson={setOpenLesson}
            // Module drag handlers
            onDragStart={() => (dragModuleId.current = mod.id)}
            onDragOver={(e) => {
              if (dragModuleId.current && dragModuleId.current !== mod.id) e.preventDefault()
            }}
            onDrop={() => {
              if (dragModuleId.current) reorderModules(dragModuleId.current, mod.id)
              dragModuleId.current = null
            }}
            // Cross-module lesson drop target
            onLessonDropFromOther={(srcModuleId, lessonId) =>
              moveLessonToModule(srcModuleId, lessonId, mod.id)
            }
            // Per-lesson drag context
            onLessonDragStart={(lessonId) => (dragLesson.current = { moduleId: mod.id, lessonId })}
            onLessonDragEnd={() => (dragLesson.current = null)}
            dragLesson={dragLesson}
          />
        ))
      )}

      <Button onClick={addModule} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Module
      </Button>
    </div>
  )
}

// ============================================================
// Module
// ============================================================
function ModuleCard(props: {
  module: Module
  index: number
  expanded: boolean
  openLessonId: string | null
  coursePriced: boolean
  courseId?: string
  onToggle: () => void
  onUpdate: (patch: Partial<Module>) => void
  onDelete: () => void
  onAddLesson: () => void
  onUpdateLesson: (lessonId: string, patch: Partial<Lesson>) => void
  onDeleteLesson: (lessonId: string) => void
  onDuplicateLesson: (lessonId: string) => void
  onReorderLessons: (sourceLessonId: string, targetLessonId: string) => void
  onSetOpenLesson: (id: string | null) => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onLessonDropFromOther: (sourceModuleId: string, lessonId: string) => void
  onLessonDragStart: (lessonId: string) => void
  onLessonDragEnd: () => void
  // Faculty list — pass-through for the per-module owner picker.
  // The picker only appears when there's more than one Instructor to
  // choose from, so empty / single-faculty workspaces don't see
  // noise in the UI.
  faculty?: Array<{ id: string; name: string; role?: string }>
  dragLesson: React.MutableRefObject<{ moduleId: string; lessonId: string } | null>
}) {
  const { module: mod, expanded } = props
  const totalDuration = mod.lessons.reduce((acc, l) => acc + (l.duration || 0), 0)
  // `isPreview` is the canonical "publicly viewable" flag on a lesson —
  // labelled "Public" in the UI. We count it here for the module summary.
  const publicCount = mod.lessons.filter((l) => l.isPreview).length

  return (
    <div
      // NOTE: `draggable` lives on the grip handle below, not the row.
      // If the whole row were draggable, every mousedown inside the
      // title input or a rich-text editor would start a drag and break
      // text selection. The row is still a drop target.
      onDragOver={(e) => {
        // Only act as a module drop target when no lesson is being dragged.
        if (props.dragLesson.current) {
          e.preventDefault()
          return
        }
        props.onDragOver(e)
      }}
      onDrop={(e) => {
        // If a lesson from another module was dropped here, move it.
        const dragged = props.dragLesson.current
        if (dragged && dragged.moduleId !== mod.id) {
          e.preventDefault()
          props.onLessonDropFromOther(dragged.moduleId, dragged.lessonId)
          props.onLessonDragEnd()
          return
        }
        props.onDrop()
      }}
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      {/* Module header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", `module:${mod.id}`)
            props.onDragStart()
          }}
          aria-label="Drag module"
          className="cursor-grab text-muted-foreground/60 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={props.onToggle}
          className="text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse module" : "Expand module"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Input
          value={mod.title}
          onChange={(e) => props.onUpdate({ title: e.target.value.slice(0, 80) })}
          placeholder={`Module ${props.index + 1}`}
          maxLength={80}
          className="h-8 min-w-0 flex-1 border-transparent bg-transparent font-medium shadow-none focus-visible:border-border focus-visible:bg-background"
        />
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span>{mod.lessons.length} lesson{mod.lessons.length === 1 ? "" : "s"}</span>
          <span>·</span>
          <span>{totalDuration} min</span>
          {publicCount > 0 && (
            <>
              <span>·</span>
              <span className="text-success">{publicCount} public</span>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={props.onDelete}
          className="text-destructive hover:text-destructive"
          aria-label="Delete module"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Lessons */}
      {expanded && (
        <div className="space-y-3 p-3">
          {/* Module description — optional short blurb. Used to be a
              full rich-text editor but the student-facing surfaces
              (sidebar in the lesson player, accordion sub-line on the
              course detail page) only have room for ~one line, so a
              plain 180-char textarea matches reality and keeps the
              editor light. Existing rich-text values still render fine
              because every display site strips tags before showing
              the text. */}
          {(() => {
            // Strip any legacy HTML so the count + textarea reflect
            // what the student will actually see. Slice keeps users
            // from going wildly over the cap on legacy data.
            const MAX = 180
            const plain = stripRichTextTags(mod.description ?? "").slice(0, MAX)
            const remaining = MAX - plain.length
            return (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Label className="text-xs text-muted-foreground">
                    Module description (optional)
                  </Label>
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      remaining < 20 ? "text-amber-600" : "text-muted-foreground",
                    )}
                  >
                    {remaining}
                  </span>
                </div>
                <Textarea
                  value={plain}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, MAX)
                    props.onUpdate({ description: next })
                  }}
                  maxLength={MAX}
                  rows={2}
                  placeholder="One-line takeaway — what will students walk away knowing?"
                  className="resize-none text-sm"
                />
              </div>
            )
          })()}

          {/* Drip unlock (Phase 3B). Number of days after enrollment
              before this module's lessons become viewable. 0 / blank
              = available immediately. The lesson player surfaces a
              "Unlocks on <date>" card for locked modules so students
              know when to come back. Use this for cohort courses
              that want to gate Module 2 a week after Module 1. */}
          {(() => {
            const offset = mod.unlockOffsetDays ?? 0
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Drip — unlock days after enrollment
                  </Label>
                  {offset > 0 && (
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">
                      Module locked for first {offset} day{offset === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={365}
                  value={offset || ""}
                  placeholder="0 — available immediately"
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10)
                    const next =
                      !Number.isFinite(raw) || raw <= 0
                        ? undefined
                        : Math.min(365, raw)
                    props.onUpdate({ unlockOffsetDays: next })
                  }}
                  className="h-9 max-w-[230px] text-sm"
                />
              </div>
            )
          })()}

          {/* Per-module instructor. Overrides the course's primary
              instructor so co-taught courses can hand off ownership
              of individual modules (e.g. Module 1 → Faculty A,
              Module 2 → Faculty B). Empty = inherit course owner. */}
          {props.faculty && props.faculty.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Module owner (optional)
              </Label>
              <Select
                value={mod.instructorId ?? "__inherit__"}
                onValueChange={(v) =>
                  props.onUpdate({
                    instructorId: v === "__inherit__" ? undefined : v,
                  })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__inherit__">
                    Inherit from course owner
                  </SelectItem>
                  {props.faculty.map((f: { id: string; name: string; role?: string }) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                      {f.role === "admin" ? " · Admin" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
          {mod.lessons.length === 0 && (
            <div
              className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground"
              onDragOver={(e) => {
                if (props.dragLesson.current && props.dragLesson.current.moduleId !== mod.id) {
                  e.preventDefault()
                }
              }}
              onDrop={(e) => {
                const dragged = props.dragLesson.current
                if (dragged && dragged.moduleId !== mod.id) {
                  e.preventDefault()
                  props.onLessonDropFromOther(dragged.moduleId, dragged.lessonId)
                  props.onLessonDragEnd()
                }
              }}
            >
              No lessons yet. Click <span className="font-medium">Add Lesson</span> below.
            </div>
          )}

          {mod.lessons.map((lesson, lessonIdx) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              lessonIndex={lessonIdx}
              courseId={props.courseId}
              open={props.openLessonId === lesson.id}
              onToggleOpen={() =>
                props.onSetOpenLesson(props.openLessonId === lesson.id ? null : lesson.id)
              }
              onUpdate={(patch) => props.onUpdateLesson(lesson.id, patch)}
              onDelete={() => props.onDeleteLesson(lesson.id)}
              onDuplicate={() => props.onDuplicateLesson(lesson.id)}
              onDragStart={() => props.onLessonDragStart(lesson.id)}
              onDragOver={(e) => {
                const dragged = props.dragLesson.current
                if (dragged && dragged.moduleId === mod.id && dragged.lessonId !== lesson.id) {
                  e.preventDefault()
                }
              }}
              onDrop={() => {
                const dragged = props.dragLesson.current
                if (dragged && dragged.moduleId === mod.id) {
                  props.onReorderLessons(dragged.lessonId, lesson.id)
                }
                props.onLessonDragEnd()
              }}
            />
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={props.onAddLesson}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lesson
          </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Lesson row
// ============================================================
function LessonRow({
  lesson,
  lessonIndex,
  courseId,
  open,
  onToggleOpen,
  onUpdate,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  lesson: Lesson
  lessonIndex: number
  courseId?: string
  open: boolean
  onToggleOpen: () => void
  onUpdate: (patch: Partial<Lesson>) => void
  onDelete: () => void
  onDuplicate: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}) {
  const meta = TYPE_META[lesson.type] ?? TYPE_META.video
  const Icon = meta.icon
  const { getCourseById, getAssignmentsForLesson } = useLMS()
  const course = courseId ? getCourseById(courseId) : undefined
  const followUps = getAssignmentsForLesson(lesson.id)
  const [composerOpen, setComposerOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [lastPublished, setLastPublished] = useState<Assignment | null>(null)
  // Local quiz dialog — opens when the Instructor picks the "Quiz" tile
  // in the follow-up composer. Lets us reuse the same builder used by
  // the curriculum editor's lesson-level "Add quiz" surface without
  // creating a second mounting point.
  const [followUpQuizOpen, setFollowUpQuizOpen] = useState(false)

  return (
    <div
      // Drag source moved to the grip handle so text selection inside the
      // title input or rich-text editor doesn't initiate a row drag.
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "min-w-0 overflow-hidden rounded-md border bg-background transition-shadow",
        open ? "border-primary/30 shadow-sm" : "border-border",
      )}
    >
      <div className="flex min-w-0 items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", `lesson:${lesson.id}`)
            onDragStart()
          }}
          aria-label="Drag lesson"
          className="cursor-grab text-muted-foreground/60 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
        >
          <span className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            "bg-primary/10 text-primary",
          )}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {lessonIndex + 1}. {lesson.title || "Untitled lesson"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {meta.label} · {lesson.duration || 0} min
            </span>
          </span>
        </button>
        <div className="hidden items-center gap-1 sm:flex">
          {lesson.isPreview ? (
            <Badge variant="secondary" className="gap-1 border-success/30 bg-success/10 text-success">
              <Eye className="h-3 w-3" />
              Public
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Private
            </Badge>
          )}
          {(lesson.attachments?.length ?? 0) > 0 && (
            <Badge variant="outline" className="gap-1">
              <Paperclip className="h-3 w-3" />
              {lesson.attachments?.length}
            </Badge>
          )}
          {followUps.length > 0 && (
            <Badge variant="outline" className="gap-1 border-accent/30 text-accent">
              <ClipboardList className="h-3 w-3" />
              {followUps.length} follow-up{followUps.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        {course && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setComposerOpen(true)}
            className="text-accent hover:text-accent"
            aria-label="Post follow-up assignment"
            title="Post follow-up — assignment, resources, or notes for after this lesson"
          >
            <ClipboardList className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDuplicate}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Duplicate lesson"
          title="Duplicate this lesson"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
          aria-label="Delete lesson"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <LessonEditor
          lesson={lesson}
          onUpdate={onUpdate}
          courseId={courseId}
          followUps={followUps}
          courseAvailable={!!course}
          onCreateFollowUp={() => setComposerOpen(true)}
          onShareFollowUp={(a) => { setLastPublished(a); setShareOpen(true) }}
        />
      )}

      {course && (
        <AssignmentComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          course={course}
          lesson={lesson}
          onPublished={(a) => { setLastPublished(a); setShareOpen(true) }}
          // Picking the "Quiz" tile in the composer routes here — we
          // close the composer and open the quiz builder so the
          // Instructor has a single follow-up entry point for any kind.
          onCreateQuiz={() => setFollowUpQuizOpen(true)}
        />
      )}
      {course && (
        <QuickQuizDialog
          open={followUpQuizOpen}
          onOpenChange={setFollowUpQuizOpen}
          courseId={course.id}
          defaultTitle={lesson.title || undefined}
          onCreated={() => setFollowUpQuizOpen(false)}
        />
      )}
      {lastPublished && (
        <AssignmentShareDialog
          assignment={lastPublished}
          open={shareOpen}
          onOpenChange={(o) => { setShareOpen(o); if (!o) setLastPublished(null) }}
        />
      )}
    </div>
  )
}

// ============================================================
// Lesson editor body (smart fields per type)
// ============================================================
function LessonEditor({
  lesson,
  onUpdate,
  courseId,
  followUps = [],
  courseAvailable = false,
  onCreateFollowUp,
  onShareFollowUp,
}: {
  lesson: Lesson
  onUpdate: (patch: Partial<Lesson>) => void
  // The course this lesson belongs to. Used to scope the live-session
  // picker so the dropdown only shows sessions for *this* course rather
  // than every session on the workspace.
  courseId?: string
  followUps?: Assignment[]
  courseAvailable?: boolean
  onCreateFollowUp?: () => void
  onShareFollowUp?: (a: Assignment) => void
}) {
  const { quizzes, liveSessions, getCourseById } = useLMS()
  const parentCourse = courseId ? getCourseById(courseId) : undefined
  // Inline-creator dialog state. Each lesson editor has its own pair of
  // open flags so opening one doesn't close another lesson's dialog.
  const [quickQuizOpen, setQuickQuizOpen] = useState(false)
  const [quickSessionOpen, setQuickSessionOpen] = useState(false)
  // Sessions for the current course, soonest-first. Falls back to all
  // sessions when no courseId is in scope (e.g. brand-new course where
  // sessions haven't been bound yet).
  const courseSessions = useMemo(() => {
    const list = courseId
      ? liveSessions.filter((s) => s.courseId === courseId)
      : liveSessions
    return [...list].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
  }, [liveSessions, courseId])

  // Sprint C Recordings #34 — recorded sessions a Instructor can
  // attach as a lesson. We surface ALL recorded sessions in this
  // workspace (not just this course's) because cross-course reuse
  // is the common case: an Intro session recorded for one cohort
  // gets reused as a lesson inside the next cohort's curriculum.
  // Sort by recency descending — the most-recent recording is
  // almost always what the author wants to grab.
  const recordedSessions = useMemo(() => {
    return [...liveSessions]
      .filter((s) => !!s.recordingUrl)
      .sort(
        (a, b) =>
          new Date(b.roomEndedAt ?? b.scheduledAt).getTime() -
          new Date(a.roomEndedAt ?? a.scheduledAt).getTime(),
      )
  }, [liveSessions])

  // Course-scoped quizzes. Quizzes are stored globally with a courseId,
  // so we filter to this course's quizzes (and fall back to all if no
  // course is in scope yet).
  const courseQuizzes = useMemo(() => {
    if (!courseId) return quizzes
    return quizzes.filter((q) => q.courseId === courseId)
  }, [quizzes, courseId])

  // Auto-detect type as the instructor pastes a URL. We only auto-set when the
  // user hasn't intentionally chosen one we'd never infer (text/quiz/live).
  const handleContentChange = (value: string) => {
    onUpdate({ content: value })
    if (lesson.type === "text" || lesson.type === "quiz" || lesson.type === "live") return
    const inferred = inferLessonType(value)
    if (inferred !== lesson.type) onUpdate({ type: inferred })
  }

  const provider = useMemo(() => {
    if (lesson.type === "video") return providerLabel(detectVideoProvider(lesson.content))
    if (lesson.type === "embed") return providerLabel(detectEmbedProvider(lesson.content))
    return null
  }, [lesson.type, lesson.content])

  return (
    <div className="space-y-4 border-t border-border  px-3 py-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_100px]">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input
            value={lesson.title}
            onChange={(e) => onUpdate({ title: e.target.value.slice(0, 100) })}
            placeholder="Lesson title"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select
            value={lesson.type}
            onValueChange={(v) => {
              const nextType = v as LessonType
              // CRITICAL: build a single patch and call onUpdate once.
              // Calling onUpdate twice in a row reads stale state on the
              // second call — the parent reducer hasn't re-rendered yet —
              // so the second update reverts the first, and the user
              // sees the dropdown snap back to the previous type. This
              // looked like "I can't pick Reading/Quiz/Live" because
              // those branches all triggered the second call.
              const patch: Partial<Lesson> = { type: nextType }
              if (nextType === "text" && !isMarkdownish(lesson.content)) patch.content = ""
              if (nextType === "quiz") patch.content = ""
              if (nextType === "live") patch.content = ""
              onUpdate(patch)
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_META) as LessonType[]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Minutes</Label>
          <Input
            type="number"
            min={0}
            value={lesson.duration}
            onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          value={lesson.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Short description shown to students"
        />
      </div>

      {/* Type-specific content field */}
      {lesson.type === "text" ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">Reading content</Label>
            {/* AI draft button — disabled until the lesson has a
                title (the model needs *something* to write about).
                Generated content overwrites whatever's there, with a
                toast warning if the field already had text. */}
            <AIGenerateButton
              size="xs"
              label="Draft with AI"
              disabled={!lesson.title?.trim()}
              onGenerate={async () => {
                const r = await aiLessonContent({
                  lessonTitle: lesson.title,
                  courseTitle: parentCourse?.title || "this course",
                  context: lesson.description || undefined,
                })
                if ("error" in r) {
                  toast.error(`Couldn't draft: ${r.error}`)
                  return
                }
                onUpdate({ content: r.content })
                toast.success("Drafted — edit freely.")
              }}
            />
          </div>
          <RichTextEditor
            value={lesson.content}
            onChange={(html) => onUpdate({ content: html })}
            placeholder="Write the lesson. Format text, drop in images, embed YouTube videos."
            minHeight={160}
          />
        </div>
      ) : lesson.type === "quiz" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Quiz</Label>
          {!courseId ? (
            // No courseId yet — quizzes are course-scoped, so the inline
            // creator can't run. Tell the author plainly.
            <div className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
              Save your course first (any field, then <span className="font-medium text-foreground">Create Course</span> at the top) to attach quizzes inline. Quizzes are scoped per course.
            </div>
          ) : courseQuizzes.length === 0 ? (
            <div className="space-y-2 rounded-md border border-dashed border-border/60 p-3">
              <p className="text-xs text-muted-foreground">
                No quizzes for this course yet. Build one in seconds:
              </p>
              <Button type="button" size="sm" onClick={() => setQuickQuizOpen(true)}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Create quick quiz
              </Button>
            </div>
          ) : (
            <>
              <Select value={lesson.content} onValueChange={(v) => onUpdate({ content: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a quiz…" /></SelectTrigger>
                <SelectContent>
                  {courseQuizzes.map((q: Quiz) => (
                    <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setQuickQuizOpen(true)}
                >
                  <Plus className="mr-1 h-3 w-3" /> New quiz
                </Button>
                <Link
                  href="/dashboard/quizzes"
                  target="_blank"
                  className="font-medium text-primary hover:underline"
                >
                  Manage all →
                </Link>
              </div>
            </>
          )}
          {courseId && (
            <QuickQuizDialog
              open={quickQuizOpen}
              onOpenChange={setQuickQuizOpen}
              courseId={courseId}
              defaultTitle={lesson.title}
              onCreated={(quizId) => onUpdate({ content: quizId })}
            />
          )}
        </div>
      ) : lesson.type === "live" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">
            <Radio className="mr-1.5 inline h-3.5 w-3.5" />
            Live session
          </Label>
          {!courseId ? (
            <div className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
              Save your course first (any field, then <span className="font-medium text-foreground">Create Course</span> at the top) to schedule live sessions inline. Sessions are scoped per course.
            </div>
          ) : courseSessions.length === 0 ? (
            <div className="space-y-2 rounded-md border border-dashed border-border/60 p-3">
              <p className="text-xs text-muted-foreground">
                No live sessions scheduled for this course yet.
              </p>
              <Button type="button" size="sm" onClick={() => setQuickSessionOpen(true)}>
                <Radio className="mr-1.5 h-3.5 w-3.5" /> Schedule new session
              </Button>
            </div>
          ) : (
            <>
              <Select value={lesson.content} onValueChange={(v) => onUpdate({ content: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a session…" /></SelectTrigger>
                <SelectContent>
                  {courseSessions.map((s) => {
                    const when = new Date(s.scheduledAt)
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title} · {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {s.status === "cancelled" ? " · cancelled" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setQuickSessionOpen(true)}
                >
                  <Plus className="mr-1 h-3 w-3" /> New session
                </Button>
                <Link
                  href="/dashboard/classes"
                  target="_blank"
                  className="font-medium text-primary hover:underline"
                >
                  Manage all →
                </Link>
              </div>
            </>
          )}
          {courseId && (
            <QuickLiveSessionDialog
              open={quickSessionOpen}
              onOpenChange={setQuickSessionOpen}
              courseId={courseId}
              defaultTitle={lesson.title}
              onCreated={(sessionId) => onUpdate({ content: sessionId })}
            />
          )}
        </div>
          ) : lesson.type === "recording" ? (
            // Sprint C Recordings #34 — recording picker. Lesson.content
            // holds the LiveSession id; the lesson player resolves the
            // URL + visibility + chapters from the session at render
            // time, so the lesson tracks the recording (rename a class
            // → the lesson title doesn't auto-rename but the playback
            // metadata stays correct).
            <div className="space-y-1.5">
              <Label className="text-xs">
                <Video className="mr-1.5 inline h-3.5 w-3.5" />
                Pick a recording
              </Label>
              {recordedSessions.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                  No recorded classes yet. Record a live class with the in-call REC button — it lands
                  in your{" "}
                  <Link
                    href="/dashboard/recordings"
                    target="_blank"
                    className="font-medium text-primary hover:underline"
                  >
                    recordings library
                  </Link>{" "}
                  and you can attach it here in two clicks.
                </div>
              ) : (
                <>
                  <Select
                    value={lesson.content}
                    onValueChange={(v) => onUpdate({ content: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a recorded class…" />
                    </SelectTrigger>
                    <SelectContent>
                      {recordedSessions.map((s) => {
                        const when = new Date(s.roomEndedAt ?? s.scheduledAt)
                        const dur = s.durationMinutes ? ` · ${s.durationMinutes} min` : ""
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title} · {when.toLocaleDateString()}
                            {dur}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>
                      Resolves to the recording&apos;s URL + chapters at playback.
                    </span>
                    <Link
                      href="/dashboard/recordings"
                      target="_blank"
                      className="font-medium text-primary hover:underline"
                    >
                      Manage all →
                    </Link>
                  </div>
                </>
              )}
            </div>
      ) : lesson.type === "embed" ? (
        // Embeds are URL-only (Canva/Notion/Figma/Slides don't upload — you
        // share their link). Keep the bare input so we don't tempt people
        // into uploading their whole Canva file.
        <div className="space-y-1.5">
          <Label className="text-xs">Embed URL (Canva, Gamma, Notion, Figma, Slides…)</Label>
          <Input
            value={lesson.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="https://…"
          />
          {provider && lesson.content && (
            <p className="text-xs text-muted-foreground">
              Detected: <span className="font-medium text-foreground">{provider}</span>
            </p>
          )}
          <LessonContentPreview type={lesson.type} url={lesson.content} className="mt-2" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs">
            {lesson.type === "document"
              ? "Document (PDF, DOC, PPT, XLSX)"
              : lesson.type === "audio"
                ? "Audio (MP3, WAV…)"
                : lesson.type === "pdf"
                  ? "PDF"
                  : "Video — upload or paste YouTube/Vimeo/Loom/Bunny link"}
          </Label>
          <FileUploadField
            value={lesson.content}
            onChange={(url) => handleContentChange(url)}
            accept={acceptForType(lesson.type)}
            maxSizeMB={maxSizeFor(lesson.type)}
            urlPlaceholder={placeholderFor(lesson.type)}
            hint={lesson.type === "video" ? "Large videos? Host on YouTube/Vimeo/Bunny and paste the link." : undefined}
            showImagePreview={false}
          />
          {provider && lesson.content && (
            <p className="text-xs text-muted-foreground">
              Detected: <span className="font-medium text-foreground">{provider}</span>
            </p>
          )}
          <LessonContentPreview type={lesson.type} url={lesson.content} className="mt-2" />
        </div>
      )}

      {/* Visibility + attachments */}
      {/* Single Public/Private toggle, backed by `isPreview`. When ON the
          lesson is viewable by anyone (overrides any paywall on the
          course). When OFF the lesson is members-only — the course's
          pricing decides whether unenrolled visitors can see it. We
          dropped the legacy "Paid (locked)" toggle: it overlapped with
          this one and just confused authors. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <ToggleChip
          active={lesson.isPreview}
          onClick={() => onUpdate({ isPreview: !lesson.isPreview })}
          icon={lesson.isPreview ? Eye : EyeOff}
          label={lesson.isPreview ? "Public — anyone can view" : "Private — members only"}
          activeClass="bg-success/10 text-success border-success/30"
        />
      </div>

      <AttachmentsEditor
        attachments={lesson.attachments ?? []}
        onChange={(a) => onUpdate({ attachments: a })}
      />

      {/* Follow-ups affordance. Creators routinely ask "how do
          students get nudged about this lesson?" while they're
          still building the curriculum — answer it here, where the
          question lives, instead of hiding the answer in docs. The
          actual attachment of quizzes / assignments / live sessions
          happens from the lesson's detail page once the course
          exists; this block just sets expectations + names the
          delivery channels. */}
      <div className="rounded-md border border-border/60 bg-background p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Follow-ups after this lesson
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Attach a quiz, assignment, or live class to this lesson once the course is saved. We notify enrolled students automatically.
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Notified via in-app, email, and WhatsApp on publish.</span>
          {" "}Channels honour each student&apos;s notification preferences.
        </p>
      </div>

      {/* Transcript — optional. Surfaced as a <details> so it stays
          collapsed by default (only ~5% of lessons get one) but is one
          click away when a Instructor wants to add captions / a written
          version for accessibility + SEO. */}
      {(lesson.type === "video" || lesson.type === "audio") && (
        <details className="rounded-md border border-border/60 bg-background p-3 [&[open]>summary]:mb-2">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Transcript (optional)</span>
            {lesson.transcript && (
              <span className="font-normal normal-case text-[11px] text-success">
                {lesson.transcript.length.toLocaleString()} chars
              </span>
            )}
          </summary>
          <Textarea
            value={lesson.transcript ?? ""}
            onChange={(e) => onUpdate({ transcript: e.target.value })}
            placeholder="Paste or write the transcript. Boosts accessibility, search, and lets students skim before watching."
            rows={6}
            className="text-sm"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Stored on the lesson and shown under the player to enrolled students.
          </p>
        </details>
      )}

      {/* Follow-ups: assignments/projects/tests handed out after this lesson */}
      {courseAvailable && (
        <div className="rounded-md border border-border/60 bg-background p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Follow-ups after this lesson
              </p>
              <p className="text-[11px] text-muted-foreground">
                Notified via in-app, email, and WhatsApp on publish.
              </p>
            </div>
            {onCreateFollowUp && (
              <Button size="sm" variant="outline" onClick={onCreateFollowUp}>
                <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                Post follow-up
              </Button>
            )}
          </div>
          {followUps.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {followUps.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-xs"
                >
                  <ClipboardList className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                  <span className="capitalize text-muted-foreground">{a.kind}</span>
                  {a.dueAt && (
                    <span className="text-muted-foreground">
                      · due {new Date(a.dueAt).toLocaleDateString()}
                    </span>
                  )}
                  {onShareFollowUp && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => onShareFollowUp(a)}
                      title="Share link / resend"
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// "Looks like prose, not a media URL." Used when switching a lesson's
// type to/from "text" to decide whether to preserve the existing content
// or wipe it (a YouTube URL becomes garbage prose, but an existing
// article — markdown OR HTML from the rich-text editor — should survive).
function isMarkdownish(s: string) {
  if (!s) return false
  if (s.startsWith("http")) return false
  // HTML from the rich-text editor or markdown-style hints.
  return /<\w+|\n|#|\*|\[/.test(s)
}

function acceptForType(t: LessonType): string {
  if (t === "video") return "video/mp4,video/webm,video/quicktime,video/x-matroska"
  if (t === "audio") return "audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/aac,audio/flac,audio/webm"
  if (t === "pdf") return "application/pdf"
  if (t === "document") return ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
  return ""
}
function maxSizeFor(t: LessonType): number {
  if (t === "video") return 100
  if (t === "audio") return 50
  return 25
}
function placeholderFor(t: LessonType): string {
  if (t === "video") return "YouTube, Vimeo, Loom, Bunny, or MP4 URL"
  if (t === "audio") return "https://…/lesson.mp3"
  if (t === "document" || t === "pdf") return "https://…/handout.pdf"
  return "https://…"
}

function ToggleChip({
  active,
  onClick,
  icon: Icon,
  label,
  disabled,
  activeClass,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  label: string
  disabled?: boolean
  activeClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        disabled && "cursor-not-allowed opacity-40",
        active ? activeClass : "border-border bg-background text-muted-foreground hover:bg-muted/50",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

// ============================================================
// Attachments
// ============================================================
function AttachmentsEditor({
  attachments,
  onChange,
}: {
  attachments: NonNullable<Lesson["attachments"]>
  onChange: (a: NonNullable<Lesson["attachments"]>) => void
}) {
  // Local draft for the "add new" row. We intentionally don't reuse
  // FileUploadField here because it's controlled — typing a URL would fire
  // onChange on every keystroke and create a new attachment per character.
  const [draftUrl, setDraftUrl] = useState("")
  const [draftFilename, setDraftFilename] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const remove = (id: string) => onChange(attachments.filter((a) => a.id !== id))
  const update = (id: string, patch: Partial<NonNullable<Lesson["attachments"]>[number]>) =>
    onChange(attachments.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const append = (att: NonNullable<Lesson["attachments"]>[number]) => {
    onChange([...attachments, att])
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadAsset(file, "courses")
      append({
        id: generateId("att"),
        filename: file.name,
        url: result.url,
        sizeBytes: file.size,
        downloadable: true,
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const addByUrl = () => {
    const url = draftUrl.trim()
    if (!url) return
    append({
      id: generateId("att"),
      filename: draftFilename.trim() || url.split("/").pop() || "attachment",
      url,
      downloadable: true,
    })
    setDraftUrl("")
    setDraftFilename("")
  }

  return (
    <div className="rounded-md border border-border/60 bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Attachments &amp; resources
      </p>
      {attachments.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {attachments.map((a) => (
            // Two-row layout per attachment. The earlier single-row
            // version overflowed horizontally on narrow lesson panels:
            // a long file URL + fixed-width filename input + three
            // pills + a trash button add up to a minimum row width
            // wider than the column, and even truncate + min-w-0 on the
            // URL anchor couldn't fix it once the sibling pills exceeded
            // the available space.
            //
            // Layout now:
            //   row 1 — Paperclip · filename input · pills · trash
            //   row 2 — URL anchor on its own line, full-width truncate
            // Wrap is `min-w-0 overflow-hidden` so nothing inside can
            // push the page sideways.
            <li
              key={a.id}
              className="min-w-0 overflow-hidden rounded-md border border-border/60 px-2 py-1.5"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Input
                  value={a.filename}
                  onChange={(e) => update(a.id, { filename: e.target.value })}
                  className="h-7 min-w-0 flex-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => update(a.id, { mandatory: !a.mandatory })}
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    a.mandatory ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground",
                  )}
                  title="Toggle mandatory"
                >
                  {a.mandatory ? "Required" : "Optional"}
                </button>
                <button
                  type="button"
                  onClick={() => update(a.id, { downloadable: !a.downloadable })}
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    a.downloadable !== false ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                  title="Toggle downloadable"
                >
                  {a.downloadable !== false ? "Downloadable" : "View only"}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(a.id)}
                  className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                  aria-label="Remove attachment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* URL on its own row. `min-w-0` + `block truncate` makes
                  the anchor clip rather than expand to fit the full
                  string — important for `data:` URLs and signed-S3
                  URLs that can be 500+ chars. */}
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 block min-w-0 truncate rounded border border-border/60 bg-muted/40 px-2 py-1 text-xs leading-5 text-muted-foreground hover:bg-muted"
                title={a.url.startsWith("data:") ? "Inline data URL — click to open in a new tab" : a.url}
              >
                {a.url.startsWith("data:")
                  ? `data:${a.url.slice(5, a.url.indexOf(";"))} · inline upload`
                  : a.url}
              </a>
            </li>
          ))}
        </ul>
      )}
      {/* Two-row add layout — same min-w-0 / overflow-hidden defence
          as the existing-attachment rows above. Row 1: Upload button
          + the small "Name" hint input. Row 2: the URL paste field
          + Add button. Wrapping the whole block in min-w-0 +
          overflow-hidden guarantees a long pasted URL can never push
          the page sideways. */}
      <div className="mt-2 min-w-0 space-y-2 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0"
          >
            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload file"}
          </Button>
          <Input
            value={draftFilename}
            onChange={(e) => setDraftFilename(e.target.value)}
            placeholder="Name (optional)"
            className="h-8 min-w-0 flex-1 text-xs"
          />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addByUrl()}
            placeholder="or paste a URL (Drive, S3…)"
            className="h-8 min-w-0 flex-1 text-xs"
          />
          <Button size="sm" onClick={addByUrl} disabled={!draftUrl.trim()} className="shrink-0">
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,image/*,audio/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}

