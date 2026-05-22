"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import {
  Search, MoreHorizontal, Eye, Mail, GraduationCap, Clock, Award,
  TrendingUp, Plus, Download, Sparkles, Send, BookOpen, Trash2, X, Users,
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
import { usePlan } from "@/lib/use-plan"
import { PlanLimitHint, PlanLimitWarning } from "@/components/dashboard/plan-lock"
import { fuzzyScore } from "@/lib/fuzzy-search"
import { useConfirm } from "@/lib/use-confirm"
import { MessageComposer } from "@/components/messages/message-composer"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

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
  } = useLMS()
  const confirm = useConfirm()
  // Plan-cap state for the "Add student" CTA. Counted against the
  // students limit (Starter 50 → ∞ on paid tiers). Same UX as the
  // courses + faculty + storefront gates: button flips to Upgrade.
  const allStudents = useMemo(() => users.filter((u) => u.role === "student"), [users])
  const { usageRemaining: planUsageRemaining, limits: planLimits } = usePlan()
  const studentsRemaining = planUsageRemaining("students", allStudents.length)
  const atStudentCap = studentsRemaining !== Infinity && studentsRemaining <= 0
  const studentCap = planLimits.students
  const [search, setSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [messageOpen, setMessageOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)

  const students = useMemo(() => users.filter((u) => u.role === "student"), [users])

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

  const filteredStudents = useMemo(() => {
    const activeGroup =
      groupFilter !== "all" ? studentGroups.find((g) => g.id === groupFilter) : null
    const groupMemberSet = activeGroup ? new Set(activeGroup.memberIds) : null
    const base = students.filter((student) => {
      if (groupMemberSet && !groupMemberSet.has(student.id)) return false
      if (courseFilter === "all") return true
      const studentEnrollments = enrollments.filter((e) => e.studentId === student.id)
      return studentEnrollments.some((e) => e.courseId === courseFilter)
    })
    if (!search.trim()) return base
    return base
      .map((s, idx) => {
        const score = Math.min(fuzzyScore(search, s.name), fuzzyScore(search, s.email))
        return { s, score, idx }
      })
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => (a.score === b.score ? a.idx - b.idx : a.score - b.score))
      .map(({ s }) => s)
  }, [students, enrollments, search, courseFilter, groupFilter, studentGroups])

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
    const csv = lines.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
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

  // Bulk-enroll: add every selected student to the chosen course.
  // No-op for students already enrolled; reports a clean count of new
  // enrollments via toast.
  const bulkEnroll = (courseId: string) => {
    const course = getCourseById(courseId)
    if (!course) return
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
          {/* <Button variant="outline" size="sm" asChild title="Bucket students into named segments for targeted messaging" data-tour="students-groups">
            <Link href="/dashboard/students/groups">
              <Users className="mr-1 h-4 w-4" /> Groups
            </Link>
          </Button> */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessageOpen(true)}
            title="Send a message to every student"
            data-tour="students-message"
          >
            <Send className="mr-1 h-4 w-4" />
            Message
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(students.map((s) => s.id))}
            title="Download every student as CSV in the batch format"
            data-tour="students-export"
          >
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateCertificates(students.map((s) => s.id))}
            title="Pre-fill the new-batch flow with every student"
            data-tour="students-certify"
          >
            <Sparkles className="mr-1 h-4 w-4" />
            Certify
          </Button>
          {/* Pre-warning chip — always visible when the plan caps
              students. Stays calm at low usage and switches to amber
              / red as the user approaches the limit. Sits next to
              the Add button so the cap is visible before the click. */}
          <PlanLimitHint
            metric="students"
            current={allStudents.length}
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
            <Button size="sm" asChild data-tour="students-add">
              <Link href="/dashboard/students/new">
                <Plus className="mr-1 h-4 w-4" /> Add student
              </Link>
            </Button>
          )}
        </div>
      </div>

      <PlanLimitWarning metric="students" current={allStudents.length} />

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
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-full sm:w-52">
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
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                <TableHead>Courses</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
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
                          <p className="truncate text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{stats.coursesEnrolled}</span>
                      <span className="text-muted-foreground"> enrolled</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={stats.averageProgress} className="w-20" />
                        <span className="text-sm text-muted-foreground">{stats.averageProgress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                        {stats.completed} completed
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
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
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" /> Send email
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

      {/* Bulk-message composer — recipients = selected students, or
          every student in the workspace when none are selected. */}
      <MessageComposer
        open={messageOpen}
        onOpenChange={setMessageOpen}
        recipients={
          selectedStudents.length > 0 ? selectedStudents : students
        }
      />

      <BulkEnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        count={selectedIds.length}
        courses={courses}
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
                  No courses yet. Create one first.
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

