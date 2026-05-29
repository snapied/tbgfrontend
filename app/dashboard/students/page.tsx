"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import {
  Search, MoreHorizontal, Eye, Mail, GraduationCap, Clock, Award,
  TrendingUp, Plus, Download, Sparkles, Send, BookOpen, Trash2, X, Users,
  ArrowDownAZ, ArrowUpAZ, ArrowDown01, ArrowUp01,
  MessageSquare, ChevronDown, FileSpreadsheet, Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLMS } from "@/lib/lms-store"
import { maskEmail } from "@/lib/masking"
import { usePlan } from "@/lib/use-plan"
import { PlanLimitHint, PlanLimitWarning } from "@/components/dashboard/plan-lock"
import { fuzzyScore } from "@/lib/fuzzy-search"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { getRecentStudentIds, clearRecentStudents } from "@/lib/recently-viewed-students"
import { StudentTagChips } from "@/components/students/student-tags"
import {
  classifyStudents,
  STAGE_META,
  type EngagementRow,
} from "@/lib/engagement-score"
import { SearchInput } from "@/components/ui/search-input"
import { useConfirm } from "@/lib/use-confirm"
import { MessageComposer } from "@/components/messages/message-composer"
import { NudgePreviewDialog, type NudgeKind } from "@/components/dashboard/engagement-nudge-dialog"
import { buildNotifications, type DispatchPayload } from "@/lib/notifications"
import {
  partitionByCooldown,
  markNudged,
  relativeFromNow,
} from "@/lib/nudge-cooldown"
import { useTenant } from "@/lib/tenant-store"
import { tenantPublicUrl } from "@/lib/tenant-resolver"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { ModuleTrashButton } from "@/components/dashboard/module-trash-button"

const STUDENTS_TOUR: TourStep[] = [
  {
    title: "Your student roster",
    body: "Add learners individually, in bulk, or by invite link. Track enrollment, progress and completions at a glance.",
    emoji: "🎓",
    placement: "center",
  },
  {
    target: "[data-tour='students-add']",
    title: "Add students",
    body: "One-by-one form, or jump to invite links / CSV import from inside this flow.",
    emoji: "➕",
    placement: "left",
  },
  {
    target: "[data-tour='students-groups']",
    title: "Groups",
    body: "Bucket students into communities — cohorts, alumni, beta testers — and use them as filters or message audiences. Each community has its own feed + access settings.",
    emoji: "🪣",
    placement: "bottom",
  },
  {
    target: "[data-tour='students-message']",
    title: "Bulk messaging",
    body: "Select students (or send to all) and message across email, in-app, and WhatsApp. Attach files. Track delivery.",
    emoji: "✉️",
    placement: "bottom",
  },
  {
    target: "[data-tour='students-certify']",
    title: "Generate certificates",
    body: "Pre-fills the new batch flow with the selected students so you can issue certificates in a few clicks.",
    emoji: "🏆",
    placement: "bottom",
  },
  {
    target: "[data-tour='students-export']",
    title: "Export CSV",
    body: "Download the visible roster in the same CSV format the certificate generator accepts.",
    emoji: "📤",
    placement: "bottom",
  },
  {
    title: "Click a student to dive in",
    body: "From a student's page you can update details, send a 1:1 message, see their doubts, issue invoices and view activity.",
    emoji: "✨",
    placement: "center",
  },
]

// Key the students page uses to hand pre-filled batch rows to the
// /dashboard/new-batch flow without going through the upload step.
// Tenant-scoped so the staging area can't leak between workspaces.
import { readCurrentTenantSlug } from "@/lib/tenant-store"
function pendingBatchKey(): string {
  return `thebigclass.t.${readCurrentTenantSlug()}.pendingBatchRows.v1`
}

// Columns the new-batch CSV upload step requires. Order is fixed because
// the consumer parses by column NAME, but keeping the order stable makes
// the exported file readable in Excel/Sheets.
const CSV_COLUMNS = [
  "student_name", "email", "course_name", "completion_date", "grade", "instructor_name",
] as const

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function StudentsPage() {
  const router = useRouter()
  const {
    users, enrollments, courses, getCourseById, deleteUser,
    studentGroups, enrollStudent, updateStudentGroup,
    addNotifications,
    attendance, quizAttempts, submissions, doubts,
    currentUser,
  } = useLMS()
  const { currentTenant } = useTenant()
  const confirm = useConfirm()
  // Single source of truth — the prior code memoized "students" twice
  // (allStudents + students), wasting renders and risking divergence.
  const students = useMemo(() => users.filter((u) => u.role === "student"), [users])
  // Plan-cap state for the "Add student" CTA. Counted against the
  // students limit (Starter 50 → ∞ on paid tiers). Same UX as the
  // courses + faculty + storefront gates: button flips to Upgrade.
  const { usageRemaining: planUsageRemaining, limits: planLimits } = usePlan()
  const studentsRemaining = planUsageRemaining("students", students.length)
  const atStudentCap = studentsRemaining !== Infinity && studentsRemaining <= 0
  const studentCap = planLimits.students
  const [search, setSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"joinedDesc" | "joinedAsc" | "nameAsc" | "nameDesc" | "progressDesc">("joinedDesc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [messageOpen, setMessageOpen] = useState(false)
  // Nudge state — mirrors the engagement page's wiring. The bar at
  // the bottom of the roster operates on the same selection-or-
  // visible cohort precedence: ticked rows win, else the filtered
  // list, so the same buttons work for "send to these 4" and
  // "send to everyone matching my filters."
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [nudgeKind, setNudgeKind] = useState<NudgeKind>("checkin")
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  // Recipient override for single-row "Send email" — when set, the
  // MessageComposer opens with just that student instead of the
  // selection / whole roster. Cleared on close.
  const [messageOverride, setMessageOverride] = useState<typeof students[number] | null>(null)

  const getStudentStats = (studentId: string) => {
    const studentEnrollments = enrollments.filter((e) => e.studentId === studentId)
    const coursesEnrolled = studentEnrollments.length
    const completed = studentEnrollments.filter((e) => e.progress === 100).length
    const inProgress = studentEnrollments.filter((e) => e.progress > 0 && e.progress < 100).length
    const averageProgress = studentEnrollments.length > 0
      ? Math.round(studentEnrollments.reduce((acc, e) => acc + e.progress, 0) / studentEnrollments.length)
      : 0
    return { coursesEnrolled, completed, inProgress, averageProgress }
  }

  // Recently-viewed strip. Reads localStorage on mount + every time
  // the bumper increments (set by the Clear button). Filters against
  // the current students array so stale ids — students deleted after
  // being viewed — disappear gracefully.
  const [recentsBumper, setRecentsBumper] = useState(0)
  const recentStudents = useMemo(() => {
    if (typeof window === "undefined") return []
    const ids = getRecentStudentIds(currentUser?.id)
    return ids
      .map((id) => students.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .slice(0, 6)
    // Re-eval when the visiting user, the roster, or the local
    // bumper changes.
  }, [students, currentUser?.id, recentsBumper])

  // Lifecycle stage + last-active lookup per student, computed from
  // the same signals the engagement page uses. Memoised across all
  // students rather than per-row so the cost stays O(N + signals)
  // not O(N × signals). Built once whenever any input array changes.
  const engagementByStudent = useMemo(() => {
    const rows = classifyStudents({
      students,
      enrollments,
      attendance,
      attempts: quizAttempts,
      submissions,
      doubts,
    })
    const m = new Map<string, EngagementRow>()
    for (const r of rows) m.set(r.student.id, r)
    return m
  }, [students, enrollments, attendance, quizAttempts, submissions, doubts])

  // Avg-progress lookup used by both the table cell and the
  // progress-sort. Pre-compute once per render so we don't run the
  // O(N) filter inside the sort comparator.
  const progressByStudent = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of students) {
      const enrs = enrollments.filter((e) => e.studentId === s.id)
      m.set(
        s.id,
        enrs.length > 0
          ? Math.round(enrs.reduce((acc, e) => acc + e.progress, 0) / enrs.length)
          : 0,
      )
    }
    return m
  }, [students, enrollments])

  const filteredStudents = useMemo(() => {
    const activeGroup =
      groupFilter !== "all" ? studentGroups.find((g) => g.id === groupFilter) : null
    const groupMemberSet = activeGroup ? new Set(activeGroup.memberIds) : null
    const base = students.filter((student) => {
      if (groupMemberSet && !groupMemberSet.has(student.id)) return false
      if (courseFilter === "all") return true
      if (courseFilter === "__none__") {
        // Special filter: students with no enrollments at all.
        return !enrollments.some((e) => e.studentId === student.id)
      }
      const studentEnrollments = enrollments.filter((e) => e.studentId === student.id)
      return studentEnrollments.some((e) => e.courseId === courseFilter)
    })
    const searched = !search.trim()
      ? base
      : base
          .map((s, idx) => {
            const score = Math.min(fuzzyScore(search, s.name), fuzzyScore(search, s.email))
            return { s, score, idx }
          })
          .filter(({ score }) => Number.isFinite(score))
          .sort((a, b) => (a.score === b.score ? a.idx - b.idx : a.score - b.score))
          .map(({ s }) => s)
    // Fuzzy-search ranking already imposes an order — only apply the
    // explicit sort when there's no active search, so the search
    // relevance order isn't clobbered.
    if (search.trim()) return searched
    const sorted = [...searched]
    const cmpName = (a: typeof students[number], b: typeof students[number]) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    const cmpJoined = (a: typeof students[number], b: typeof students[number]) =>
      a.createdAt.localeCompare(b.createdAt)
    switch (sortBy) {
      case "nameAsc":      sorted.sort(cmpName); break
      case "nameDesc":     sorted.sort((a, b) => cmpName(b, a)); break
      case "joinedAsc":    sorted.sort(cmpJoined); break
      case "joinedDesc":   sorted.sort((a, b) => cmpJoined(b, a)); break
      case "progressDesc": sorted.sort((a, b) => (progressByStudent.get(b.id) ?? 0) - (progressByStudent.get(a.id) ?? 0)); break
    }
    return sorted
  }, [students, enrollments, search, courseFilter, groupFilter, studentGroups, sortBy, progressByStudent])

  const hasActiveFilter =
    !!search.trim() || courseFilter !== "all" || groupFilter !== "all"
  const clearAllFilters = () => {
    setSearch("")
    setCourseFilter("all")
    setGroupFilter("all")
  }

  // Summary stats
  const totalStudents = students.length
  const activeStudents = students.filter((s) => {
    const enr = enrollments.filter((e) => e.studentId === s.id)
    return enr.some((e) => e.progress > 0 && e.progress < 100)
  }).length
  const completedCount = enrollments.filter((e) => e.progress === 100).length
  const averageCompletion = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length)
    : 0

  // Build batch-CSV-shaped rows for the currently-selected students.
  // For each selected student we emit one row per enrollment, OR a single
  // empty-course row if they have no enrollments (so the user can still
  // export them and edit the course manually).
  const buildBatchRows = (studentIds: string[]) => {
    const rows: Record<string, string>[] = []
    for (const id of studentIds) {
      const s = students.find((u) => u.id === id)
      if (!s) continue
      const enrs = enrollments.filter((e) => e.studentId === id)
      if (enrs.length === 0) {
        rows.push({
          student_name: s.name, email: s.email,
          course_name: "", completion_date: todayIso(),
          grade: "", instructor_name: "",
        })
        continue
      }
      for (const e of enrs) {
        const course = getCourseById(e.courseId)
        const completed = e.progress === 100 && e.completedAt
        rows.push({
          student_name: s.name,
          email: s.email,
          course_name: course?.title ?? "",
          completion_date: completed ? new Date(e.completedAt!).toISOString().slice(0, 10) : todayIso(),
          grade: "",
          instructor_name: course?.instructor?.name ?? "",
        })
      }
    }
    return rows
  }

  const exportCsv = (studentIds: string[]) => {
    const rows = buildBatchRows(studentIds)
    if (rows.length === 0) {
      toast.info("No students to export — select at least one first.")
      return
    }
    const lines = [CSV_COLUMNS.join(","), ...rows.map((r) => CSV_COLUMNS.map((c) => escapeCsv(r[c] ?? "")).join(","))]
    // Use CRLF — Excel on Windows treats lone LF as a continuation
    // inside a quoted field, mangling exports with multi-line cells.
    const csv = lines.join("\r\n")
    // BOM prefix lets Excel auto-detect UTF-8 so non-ASCII names
    // (e.g. Devanagari, accents) don't render as mojibake.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `students-${todayIso()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Generate certificates: stash pre-filled batch rows in localStorage and
  // jump to /dashboard/new-batch, which detects the stash and skips the
  // upload step.
  const generateCertificates = (studentIds: string[]) => {
    const rows = buildBatchRows(studentIds)
    if (rows.length === 0) {
      toast.info("Select at least one student first.")
      return
    }
    try {
      window.localStorage.setItem(pendingBatchKey(), JSON.stringify({
        rows, filename: `selected-students-${todayIso()}.csv`, createdAt: new Date().toISOString(),
      }))
    } catch {
      toast.error("Couldn't stash the selection. Try exporting CSV and uploading the file instead.")
      return
    }
    router.push("/dashboard/new-batch")
  }

  // Selection helpers
  const allOnPageSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selected.has(s.id))
  const toggleAll = () => {
    setSelected((prev) => {
      if (allOnPageSelected) {
        const next = new Set(prev)
        for (const s of filteredStudents) next.delete(s.id)
        return next
      } else {
        const next = new Set(prev)
        for (const s of filteredStudents) next.add(s.id)
        return next
      }
    })
  }
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const selectedIds = [...selected]
  const selectedStudents = students.filter((s) => selected.has(s.id))
  const clearSelection = () => setSelected(new Set())

  // Nudge: open the preview dialog, scoped to selection (if any)
  // else the currently-filtered roster. fireNudgeConfirmed runs
  // after the teacher hits Send.
  const openNudge = (kind: NudgeKind) => {
    setNudgeKind(kind)
    setNudgeOpen(true)
  }
  const studentHomeUrl = currentTenant
    ? `${tenantPublicUrl(currentTenant.slug)}/my`
    : "/my"
  const fireNudgeConfirmed = async (payload: {
    type: string
    title: string
    body: string
    url: string
    channels: { inApp: boolean; email: boolean; whatsApp: boolean }
  }) => {
    const recipients =
      selected.size > 0
        ? selectedStudents
        : filteredStudents
    if (recipients.length === 0) {
      setNudgeOpen(false)
      return
    }
    // Cooldown gate — shared logic with the engagement page so the
    // 48h guard rail is consistent no matter where the teacher
    // initiates the nudge from.
    const kind = payload.type as "checkin" | "comeback"
    const { fresh, recent } = partitionByCooldown(
      kind,
      recipients.map((r) => r.id),
    )
    let finalRecipients = recipients
    if (recent.length > 0) {
      const labelForKind = kind === "checkin" ? "check-in" : "come-back"
      if (recent.length === 1 && recipients.length === 1) {
        const stamp = relativeFromNow(recent[0].lastNudgedAt)
        const ok = await confirm({
          title: `Send another ${labelForKind}?`,
          description: `You already sent ${recipients[0].name} a ${labelForKind} ${stamp}. Sending again now risks looking like spam.`,
          confirmLabel: "Send anyway",
          cancelLabel: "Don't send",
        })
        if (!ok) {
          setNudgeOpen(false)
          return
        }
      } else {
        const ok = await confirm({
          title: `${recent.length} ${recent.length === 1 ? "student was" : "students were"} nudged recently`,
          description: `${recent.length} of your ${recipients.length} recipients got a ${labelForKind} in the last 48 hours. Pick one: send only to the ${fresh.length} who haven't been nudged, or override and send to all ${recipients.length}.`,
          confirmLabel: `Send to ${fresh.length} fresh only`,
          cancelLabel: `Send to all ${recipients.length}`,
        })
        finalRecipients = ok
          ? recipients.filter((r) => fresh.includes(r.id))
          : recipients
        if (ok && fresh.length === 0) {
          toast.message("Nothing sent — everyone is on cooldown.", {
            description: "Try again in a day or two, or hit 'send to all' next time to override.",
          })
          setNudgeOpen(false)
          return
        }
      }
    }
    const dispatch: DispatchPayload = {
      type: payload.type,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      meta: { kind: payload.type },
    }
    const channels: ("in-app" | "email" | "whatsapp")[] = []
    if (payload.channels.inApp) channels.push("in-app")
    if (payload.channels.email) channels.push("email")
    if (payload.channels.whatsApp) channels.push("whatsapp")
    const entries = buildNotifications(finalRecipients, dispatch, { channels })
    addNotifications(entries)
    markNudged(kind, finalRecipients.map((r) => r.id))
    toast.success(
      `Sent to ${finalRecipients.length} student${finalRecipients.length === 1 ? "" : "s"}.`,
      { description: `Via ${channels.join(" · ") || "no channels"}` },
    )
    setNudgeOpen(false)
    clearSelection()
  }

  // Bulk-enroll: add every selected student to the chosen course.
  // No-op for students already enrolled; reports a clean count of new
  // enrollments via toast. Refuses to enroll into a non-published
  // course — the bulk dialog already filters its dropdown to
  // published ones, but the call site sanity-checks too in case a
  // course flipped status between dialog open and submit.
  const bulkEnroll = (courseId: string) => {
    const course = getCourseById(courseId)
    if (!course) return
    if (course.status !== "published") {
      toast.error(`"${course.title}" isn't published — finish it before enrolling students.`)
      return
    }
    let added = 0
    let already = 0
    for (const id of selectedIds) {
      const has = enrollments.some((e) => e.studentId === id && e.courseId === courseId)
      if (has) { already++; continue }
      enrollStudent(courseId, id)
      added++
    }
    setEnrollOpen(false)
    if (added > 0) {
      toast.success(`Enrolled ${added} student${added === 1 ? "" : "s"} in "${course.title}"${already ? ` (${already} already enrolled)` : ""}.`)
    } else {
      toast.info(`All ${already} selected student${already === 1 ? " was" : "s were"} already enrolled in "${course.title}".`)
    }
  }

  // Bulk-add to a group. Group membership lives on the StudentGroup
  // record itself (memberIds), so we de-dupe before writing.
  const bulkAddToGroup = (groupId: string) => {
    const group = studentGroups.find((g) => g.id === groupId)
    if (!group) return
    const before = new Set(group.memberIds)
    const after = new Set([...before, ...selectedIds])
    const added = after.size - before.size
    updateStudentGroup(groupId, { memberIds: [...after] })
    setGroupOpen(false)
    if (added > 0) {
      toast.success(`Added ${added} student${added === 1 ? "" : "s"} to "${group.name}".`)
    } else {
      toast.info(`All selected students were already in "${group.name}".`)
    }
  }

  // Bulk-delete: confirm once for the whole batch, then remove. We
  // also drop them from the selection so the UI doesn't try to act on
  // ghost ids on the next pass.
  const bulkDelete = async () => {
    const ok = await confirm({
      title: `Remove ${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"}?`,
      description:
        "Moved to Trash — you can restore them within 7 days. Enrollments and certificates already issued stay in your records.",
      destructive: true,
      confirmLabel: "Remove",
    })
    if (!ok) return
    for (const id of selectedIds) deleteUser(id)
    clearSelection()
    toastUndoableDelete({ kind: "user", ids: selectedIds, itemNoun: "student" })
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId="students-v1" steps={STUDENTS_TOUR} />
      {/* Header. Labels are intentionally short — six action buttons
          on a sidebar layout will wrap to two rows the moment any one
          of them gets verbose. The bulk-action drawer below carries
          the count-aware variants and the new bulk actions (enroll,
          group, delete). */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Students</h1>
          <p className="text-muted-foreground">Add students, track progress, export, certify.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <TakeATourButton tourId="students-v1" label="Tour" />
          <ModuleTrashButton kinds={["user"]} noun="student" />
          {/* <Button variant="outline" size="sm" asChild title="Bucket students into named segments for targeted messaging" data-tour="students-groups">
            <Link href="/dashboard/students/groups">
              <Users className="mr-1 h-4 w-4" /> Groups
            </Link>
          </Button> */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessageOpen(true)}
            title="Send a message — to the selection if any, else to every visible student"
            data-tour="students-message"
          >
            <Send className="mr-1 h-4 w-4" />
            Message
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(filteredStudents.map((s) => s.id))}
            title={
              hasActiveFilter
                ? `Download the ${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"} currently visible`
                : "Download every student as CSV in the batch format"
            }
            data-tour="students-export"
          >
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateCertificates(filteredStudents.map((s) => s.id))}
            title={
              hasActiveFilter
                ? `Pre-fill the new-batch flow with the ${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"} currently visible`
                : "Pre-fill the new-batch flow with every student"
            }
            data-tour="students-certify"
          >
            <Sparkles className="mr-1 h-4 w-4" />
            Certify
          </Button>
          {/* Nudge buttons — same selection-or-visible recipient
              precedence as the bulk action drawer. Lives inline next
              to Certify so the cohort actions stay together in one
              row instead of being parked at the bottom of the page. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => openNudge("checkin")}
            title={
              selected.size > 0
                ? `Send a warm check-in to ${selected.size} selected student${selected.size === 1 ? "" : "s"}`
                : `Send a warm check-in to ${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"} currently visible`
            }
            disabled={filteredStudents.length === 0}
          >
            <Mail className="mr-1 h-4 w-4" />
            Check-in
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openNudge("comeback")}
            title={
              selected.size > 0
                ? `Send a come-back nudge to ${selected.size} selected student${selected.size === 1 ? "" : "s"}`
                : `Send a come-back nudge to ${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"} currently visible`
            }
            disabled={filteredStudents.length === 0}
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            Come-back
          </Button>
          {/* Pre-warning chip — always visible when the plan caps
              students. Stays calm at low usage and switches to amber
              / red as the user approaches the limit. Sits next to
              the Add button so the cap is visible before the click. */}
          <PlanLimitHint
            metric="students"
            current={students.length}
            noun="Student"
          />
          {atStudentCap ? (
            <Button
              size="sm"
              asChild
              variant="outline"
              data-tour="students-add"
              title={`You're at the ${studentCap}-student cap on your current plan. Upgrade to add more.`}
            >
              <Link href="/dashboard/billing">
                <Plus className="mr-1 h-4 w-4" /> Upgrade to add students
              </Link>
            </Button>
          ) : (
            // Split button: primary action stays the most-used path
            // (manual add), but Invite link + Import CSV are one
            // click away via the dropdown caret. Avoids a wall of
            // three buttons in the header while still making the
            // bulk paths discoverable from the main roster view.
            <div className="flex" data-tour="students-add">
              <Button size="sm" asChild className="rounded-r-none">
                <Link href="/dashboard/students/new">
                  <Plus className="mr-1 h-4 w-4" /> Add student
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="rounded-l-none border-l border-primary-foreground/20 px-2"
                    aria-label="More ways to add students"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/students/invite">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share invite link
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/students/import">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Import CSV
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <PlanLimitWarning metric="students" current={students.length} />

      {/* Bulk-action drawer. Only appears once at least one student is
          ticked, so the regular header above stays clean. Carries the
          count and surfaces everything that operates ON the selection
          (existing: message / export / certify; new: enroll-in-course,
          add-to-group, delete). */}
      {selectedIds.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 shadow-sm backdrop-blur">
          <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-semibold">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {selectedIds.length}
            </span>
            selected
          </span>
          <Button variant="outline" size="sm" onClick={() => setMessageOpen(true)}>
            <Send className="mr-1 h-3.5 w-3.5" /> Message
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCsv(selectedIds)}>
            <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => generateCertificates(selectedIds)}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Certify
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEnrollOpen(true)}>
            <BookOpen className="mr-1 h-3.5 w-3.5" /> Enroll in course
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGroupOpen(true)}>
            <Users className="mr-1 h-3.5 w-3.5" /> Add to community
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={bulkDelete}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={clearSelection} title="Clear selection">
              <X className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<GraduationCap className="h-6 w-6 text-primary" />} label="Total students" value={totalStudents} />
        <StatCard icon={<TrendingUp className="h-6 w-6 text-emerald-600" />} label="Active learners" value={activeStudents} />
        <StatCard icon={<Award className="h-6 w-6 text-amber-600" />} label="Course completions" value={completedCount} />
        <StatCard icon={<Clock className="h-6 w-6 text-blue-600" />} label="Avg completion" value={`${averageCompletion}%`} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput
              pageId="students"
              value={search}
              onChange={setSearch}
              placeholder="Search by name or email…"
              ariaLabel="Search students"
              shortcutDescription="Focus student search"
              className="flex-1"
            />
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-full sm:w-52" aria-label="Filter by group">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {studentGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} ({g.memberIds.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-64" aria-label="Filter by course">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                <SelectItem value="__none__">Not enrolled in anything</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="joinedDesc">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowDown01 className="h-3.5 w-3.5" /> Newest first
                  </span>
                </SelectItem>
                <SelectItem value="joinedAsc">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowUp01 className="h-3.5 w-3.5" /> Oldest first
                  </span>
                </SelectItem>
                <SelectItem value="nameAsc">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowDownAZ className="h-3.5 w-3.5" /> Name A–Z
                  </span>
                </SelectItem>
                <SelectItem value="nameDesc">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowUpAZ className="h-3.5 w-3.5" /> Name Z–A
                  </span>
                </SelectItem>
                <SelectItem value="progressDesc">
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Progress (high → low)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Active-filter chips — give the user a one-glance view
              of what's narrowing the table + a single click to drop
              each constraint. Hidden when nothing is filtering. */}
          {hasActiveFilter && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Filtering by:</span>
              {search.trim() && (
                <FilterChip label={`"${search.trim()}"`} onClear={() => setSearch("")} />
              )}
              {groupFilter !== "all" && (
                <FilterChip
                  label={`Group: ${studentGroups.find((g) => g.id === groupFilter)?.name ?? "—"}`}
                  onClear={() => setGroupFilter("all")}
                />
              )}
              {courseFilter !== "all" && (
                <FilterChip
                  label={
                    courseFilter === "__none__"
                      ? "Not enrolled in anything"
                      : `Course: ${courses.find((c) => c.id === courseFilter)?.title ?? "—"}`
                  }
                  onClear={() => setCourseFilter("all")}
                />
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently-viewed strip. Shows the teacher's last 6
          opened students as avatar pills for one-tap return.
          Renders only when there are recents AND there's at
          least one student in the roster — empty rosters skip
          straight to the empty-state below. */}
      {recentStudents.length > 0 && students.length > 0 && (
        <Card>
          <CardContent className="flex items-center gap-2 overflow-x-auto p-3">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recently viewed
            </span>
            <div className="flex flex-1 items-center gap-1">
              {recentStudents.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/students/${s.id}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs transition-colors hover:border-primary/50 hover:bg-primary/[0.04]"
                  title={`Open ${s.name}`}
                >
                  {s.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.avatar}
                      alt=""
                      className="h-4 w-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                      {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  )}
                  <span className="max-w-[120px] truncate font-medium">{s.name}</span>
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                clearRecentStudents(currentUser?.id)
                // Bump the recents memo so the strip disappears
                // immediately. No toast — clearing recents is
                // intentionally quiet, just remove the strip.
                setRecentsBumper((n) => n + 1)
              }}
              className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
              title="Clear the recently-viewed list"
            >
              Clear
            </button>
          </CardContent>
        </Card>
      )}

      {/* Truly-empty-workspace branch: skip the table chrome
          entirely and show the universal empty-state scaffold with
          three paths to first student. Filter-empty (where students
          exist but none match) still falls through to the table so
          the user can adjust filters in place. */}
      {students.length === 0 ? (
        <EmptyState
          icon={<span>🎓</span>}
          title="No students yet"
          description="Three ways to start. Most teachers paste an invite link in WhatsApp + watch the roster fill in."
          paths={[
            {
              id: "invite",
              label: "Share an invite link",
              hint: "Students self-onboard via email",
              icon: <Send className="h-4 w-4" />,
              href: "/dashboard/students/invite",
              primary: true,
            },
            {
              id: "csv",
              label: "Import CSV",
              hint: "Bulk-add a whole cohort at once",
              icon: <Download className="h-4 w-4" />,
              href: "/dashboard/students/import",
            },
            {
              id: "manual",
              label: "Add one manually",
              hint: "Quick name + email form",
              icon: <Plus className="h-4 w-4" />,
              href: "/dashboard/students/new",
            },
          ]}
          footerLink={{ label: "How student onboarding works", href: "/help/students" }}
        />
      ) : (
      <>
      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>
            {filteredStudents.length} students found
            {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden lg:table-cell">Stage</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="hidden xl:table-cell">Last seen</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    No students match your filters.
                    {students.length === 0 && (
                      <> <Link href="/dashboard/students/new" className="text-primary underline">Add your first student</Link> to get going.</>
                    )}
                  </TableCell>
                </TableRow>
              ) : filteredStudents.map((student) => {
                const stats = getStudentStats(student.id)
                const isSelected = selected.has(student.id)
                return (
                  <TableRow key={student.id} className={isSelected ? "bg-primary/5" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(student.id)}
                        aria-label={`Select ${student.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {student.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                            {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{student.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{currentUser?.role === "admin" ? student.email : maskEmail(student.email)}</p>
                          <StudentTagChips studentId={student.id} className="mt-1" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {(() => {
                        const row = engagementByStudent.get(student.id)
                        if (!row) return <span className="text-xs text-muted-foreground">—</span>
                        const meta = STAGE_META[row.stage]
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              stageRosterChip(meta.tone),
                            )}
                            title={meta.hint}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            {meta.label}
                          </span>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{stats.coursesEnrolled}</span>
                      <span className="text-muted-foreground"> enrolled</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={stats.averageProgress}
                          className="w-20 max-w-[6rem] min-w-[3rem]"
                          aria-label={`${stats.averageProgress}% average progress`}
                        />
                        <span className="text-sm text-muted-foreground tabular-nums">{stats.averageProgress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {stats.completed === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          {stats.completed} completed
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                      {(() => {
                        const row = engagementByStudent.get(student.id)
                        if (!row?.lastActiveAt) {
                          return <span className="italic text-muted-foreground/60">Never</span>
                        }
                        return formatLastSeen(row.daysSinceLastActive)
                      })()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Actions for ${student.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/students/${student.id}`}>
                              <Eye className="mr-2 h-4 w-4" /> View profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateCertificates([student.id])}>
                            <Sparkles className="mr-2 h-4 w-4" /> Issue cert
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setMessageOverride(student)
                              setMessageOpen(true)
                            }}
                          >
                            <Mail className="mr-2 h-4 w-4" /> Send message
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={async () => {
                              const ok = await confirm({
                                title: `Remove ${student.name}?`,
                                description: "Moved to Trash — you can restore them within 7 days. Enrollments and certificates already issued stay in your records.",
                                destructive: true,
                                confirmLabel: "Remove",
                              })
                              if (!ok) return
                              deleteUser(student.id)
                              setSelected((prev) => {
                                const next = new Set(prev); next.delete(student.id); return next
                              })
                              toastUndoableDelete({
                                kind: "user",
                                ids: student.id,
                                label: student.name,
                                itemNoun: "student",
                              })
                            }}
                          >
                            Remove student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </>
      )}

      <NudgePreviewDialog
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        kind={nudgeKind}
        recipients={
          selected.size > 0 ? selectedStudents : filteredStudents
        }
        destinationUrl={studentHomeUrl}
        fromName={currentTenant?.name}
        onSend={(p) =>
          fireNudgeConfirmed({
            type: p.type,
            title: p.title,
            body: p.body,
            url: p.url,
            channels: p.channels,
          })
        }
      />

      {/* Bulk-message composer. Priority:
          1) Single-student dropdown action (messageOverride).
          2) Bulk selection.
          3) Currently-visible (filtered) roster — sending to every
             student in the workspace by accident was too easy when
             the table was filtered to one course. */}
      <MessageComposer
        open={messageOpen}
        onOpenChange={(o) => {
          setMessageOpen(o)
          if (!o) setMessageOverride(null)
        }}
        recipients={
          messageOverride
            ? [messageOverride]
            : selectedStudents.length > 0
              ? selectedStudents
              : filteredStudents
        }
      />

      <BulkEnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        count={selectedIds.length}
        courses={courses.filter((c) => c.status === "published")}
        onConfirm={bulkEnroll}
      />

      <BulkGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        count={selectedIds.length}
        groups={studentGroups}
        onConfirm={bulkAddToGroup}
      />
    </div>
  )
}

// Pick a course → enroll every selected student in it. The store's
// enrollStudent is per-student; we loop in the caller (bulkEnroll)
// so we can de-dupe and report a clean count.
function BulkEnrollDialog({
  open, onOpenChange, count, courses, onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  count: number
  courses: ReturnType<typeof useLMS>["courses"]
  onConfirm: (courseId: string) => void
}) {
  const [courseId, setCourseId] = useState<string>("")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll {count} student{count === 1 ? "" : "s"} in a course</DialogTitle>
          <DialogDescription>
            They&apos;ll get immediate access. Already-enrolled students are skipped.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="bulk-enroll-course">Course</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger id="bulk-enroll-course">
              <SelectValue placeholder="Pick a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  No published courses yet. Publish one before enrolling students.
                </div>
              ) : courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onConfirm(courseId)} disabled={!courseId}>
            <BookOpen className="mr-2 h-4 w-4" /> Enroll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BulkGroupDialog({
  open, onOpenChange, count, groups, onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  count: number
  groups: ReturnType<typeof useLMS>["studentGroups"]
  onConfirm: (groupId: string) => void
}) {
  const [groupId, setGroupId] = useState<string>("")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {count} student{count === 1 ? "" : "s"} to a group</DialogTitle>
          <DialogDescription>
            Groups are great for targeted messaging and filtering. Students already in the group are skipped.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="bulk-add-group">Group</Label>
          {groups.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              No groups yet.{" "}
              <Link href="/dashboard/students/groups" className="font-medium text-primary hover:underline">
                Create one
              </Link>{" "}
              first.
            </div>
          ) : (
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger id="bulk-add-group">
                <SelectValue placeholder="Pick a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} ({g.memberIds.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onConfirm(groupId)} disabled={!groupId}>
            <Users className="mr-2 h-4 w-4" /> Add to community
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Small pill used in the active-filter strip. One label + one
// dismiss button. Stays in this file because it's a tiny, page-
// specific affordance.
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium">
      <span className="max-w-[200px] truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Lifecycle stage chip palette for the roster. Lifted from the
// engagement page's chip class but tighter (single border weight, no
// background fill) so the chip reads as metadata rather than a primary
// status. Tone tokens come from STAGE_META.
function stageRosterChip(tone: string): string {
  switch (tone) {
    case "emerald":
      return "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
    case "blue":
      return "border-blue-500/40 text-blue-700 dark:text-blue-300"
    case "slate":
      return "border-slate-500/40 text-slate-700 dark:text-slate-300"
    case "amber":
      return "border-amber-500/40 text-amber-700 dark:text-amber-300"
    case "rose":
      return "border-rose-500/40 text-rose-700 dark:text-rose-300"
    case "destructive":
      return "border-destructive/50 text-destructive"
    default:
      return "border-border text-muted-foreground"
  }
}

// Relative-time formatter for the "Last seen" column. Rounded to a
// human granularity so we never display "13 days 4 hours 27 minutes
// ago" — that's information, not insight. Anything older than 30d
// flattens to the exact date so cohorts that ran a year ago still
// show readable context.
function formatLastSeen(days: number | null): string {
  if (days === null) return "Never"
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

