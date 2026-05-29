"use client"

// Teacher detail page — tabbed layout with inline editing.
// Tabs: Overview | Profile | Courses & Commission | Feedback | Status

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BackButton } from "@/components/ui/back-button"
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  IndianRupee,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Save,
  Send,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useLMS } from "@/lib/lms-store"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import {
  getCommission,
  setCommission,
  deleteCommission,
  upsertEngagement,
  type CourseEngagement,
  type TeacherCommissionRecord,
} from "@/lib/teacher-commission-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(n)
}

function initials(n: string) {
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?"
}

const MODEL_LABELS: Record<string, string> = {
  percentage: "Percentage Split",
  per_student_fixed: "Per-Student Fixed",
  per_class_fixed: "Fixed Fee / Class",
  fixed_academy_commission: "Fixed Academy Commission",
}

export default function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { users, updateUser, deleteUser, courses, currentUser: me } = useLMS()

  const teacher = useMemo(() => users.find((u) => u.id === id), [users, id])

  const [commissionVersion, setCommissionVersion] = useState(0)
  const commission = useMemo(() => getCommission(id), [id, commissionVersion])

  // ── Profile edit state ────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false)
  const [name, setName] = useState(teacher?.name ?? "")
  const [email, setEmail] = useState(teacher?.email ?? "")
  const [phone, setPhone] = useState(teacher?.phone ?? "")
  const [bio, setBio] = useState(teacher?.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(teacher?.avatar ?? "")
  const [saving, setSaving] = useState(false)

  // ── Expertise (parsed from notes) ─────────────────────────────
  const [editingExpertise, setEditingExpertise] = useState(false)
  const [expertiseInput, setExpertiseInput] = useState("")
  const [expertiseTags, setExpertiseTags] = useState<string[]>(() => {
    const line = (teacher?.notes ?? "").split("\n").find((l) => l.startsWith("Expertise:"))
    return line ? line.replace("Expertise:", "").trim().split(",").map((t) => t.trim()).filter(Boolean) : []
  })
  const [usps, setUsps] = useState(() => {
    const line = (teacher?.notes ?? "").split("\n").find((l) => l.startsWith("USPs:"))
    return line ? line.replace("USPs:", "").trim() : ""
  })

  // ── Commission edit ───────────────────────────────────────────
  const [editingEngagementId, setEditingEngagementId] = useState<string | null>(null)
  const [addingEngagement, setAddingEngagement] = useState(false)
  const [newEngCourseId, setNewEngCourseId] = useState("")
  const [commModel, setCommModel] = useState<CourseEngagement["model"]>("percentage")
  const [commPct, setCommPct] = useState(70)
  const [commFixed, setCommFixed] = useState(500)
  const [commFeePerClass, setCommFeePerClass] = useState(1000)
  const [commTotalClasses, setCommTotalClasses] = useState(10)

  // ── Remove dialog ─────────────────────────────────────────────
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const assignedCourses = useMemo(() => {
    if (commission?.engagements?.length) {
      const engCourseIds = new Set(commission.engagements.map((e) => e.courseId))
      return courses.filter((c) => engCourseIds.has(c.id))
    }
    return courses.filter((c) => c.instructor?.id === id || c.coInstructorIds?.includes(id))
  }, [courses, id, commission])

  const bioPlainLength = bio.replace(/<[^>]*>/g, "").length

  // ── Admin guard ───────────────────────────────────────────────
  if (me?.role === "instructor") {
    return (
      <Card className="mx-auto mt-16 max-w-md border-dashed">
        <CardContent className="py-12 text-center">
          <p className="font-semibold">Admin access required</p>
          <p className="mt-1 text-sm text-muted-foreground">Only academy admins can manage teacher profiles.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!teacher) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/teachers"><ArrowLeft className="mr-1.5 h-4 w-4" /> Teachers</Link>
        </Button>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="font-semibold">Teacher not found</p>
            <BackButton label="Back" fallbackHref="/dashboard/teachers" className="mt-4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────

  function startEditProfile() {
    setName(teacher!.name)
    setEmail(teacher!.email)
    setPhone(teacher!.phone ?? "")
    setBio(teacher!.bio ?? "")
    setAvatarUrl(teacher!.avatar ?? "")
    setEditingProfile(true)
  }

  async function handleSaveProfile() {
    if (!name.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const notes = [
        expertiseTags.length > 0 ? `Expertise: ${expertiseTags.join(", ")}` : "",
        usps.trim() ? `USPs: ${usps.replace(/<[^>]*>/g, "").trim()}` : "",
      ].filter(Boolean).join("\n") || undefined

      updateUser(teacher!.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        bio: bio || undefined,
        avatar: avatarUrl || undefined,
        notes,
      })
      setEditingProfile(false)
      toast.success("Profile updated.", { description: `${name.trim()} will be notified.` })
    } finally {
      setSaving(false)
    }
  }

  function handleAddEngagement() {
    if (!newEngCourseId) { toast.error("Select a course"); return }
    const eng: CourseEngagement = {
      engagementId: `eng_${newEngCourseId}_${Date.now()}`,
      courseId: newEngCourseId,
      model: commModel,
      teacherPct: commModel === "percentage" ? commPct : undefined,
      fixedAmount: commModel === "per_student_fixed" ? commFixed : undefined,
      feePerClass: commModel === "per_class_fixed" ? commFeePerClass : undefined,
      totalClasses: commModel === "per_class_fixed" ? commTotalClasses : undefined,
      completedClasses: 0,
    }
    upsertEngagement(id, eng)
    setAddingEngagement(false)
    setNewEngCourseId("")
    setCommissionVersion((v) => v + 1)
    const courseName = courses.find((c) => c.id === newEngCourseId)?.title ?? "course"
    toast.success(`Commission added for ${courseName}.`)
  }

  function handleSaveCommission() {
    if (!editingEngagementId) return
    const existing = commission?.engagements.find((e) => e.engagementId === editingEngagementId)
    upsertEngagement(id, {
      engagementId: editingEngagementId,
      courseId: existing?.courseId ?? "",
      batchLabel: existing?.batchLabel,
      model: commModel,
      teacherPct: commModel === "percentage" ? commPct : undefined,
      fixedAmount: commModel === "per_student_fixed" ? commFixed : undefined,
      feePerClass: commModel === "per_class_fixed" ? commFeePerClass : undefined,
      totalClasses: commModel === "per_class_fixed" ? commTotalClasses : undefined,
      completedClasses: existing?.completedClasses ?? 0,
    })
    setEditingEngagementId(null)
    setCommissionVersion((v) => v + 1)
    toast.success("Commission terms updated.", { description: `${teacher!.name} must re-sign the agreement.` })
  }

  function handleRemove() {
    deleteUser(teacher!.id)
    deleteCommission(teacher!.id)
    toast.success(`${teacher!.name} has been removed.`, { description: "They will be notified by email." })
    router.push("/dashboard/teachers")
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/teachers"><ArrowLeft className="mr-1.5 h-4 w-4" /> Teachers</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRemoveDialogOpen(true)} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      </div>

      {/* Profile hero */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {teacher.avatar ? (
                <img src={teacher.avatar} alt={teacher.name} className="h-20 w-20 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                  {initials(teacher.name)}
                </div>
              )}
              {commission?.enabled && (
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white ring-2 ring-background">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold truncate">{teacher.name}</h1>
                <Button variant="ghost" size="sm" onClick={startEditProfile} className="shrink-0 gap-1 text-xs">
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{teacher.email}</span>
                {teacher.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{teacher.phone}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1"><GraduationCap className="h-3 w-3" /> Teacher</Badge>
                {commission?.enabled ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-100 gap-1">
                    <IndianRupee className="h-3 w-3" /> Commissioned
                  </Badge>
                ) : (
                  <Badge variant="secondary">Non-commissioned</Badge>
                )}
                <Badge variant="secondary" className="gap-1"><BookOpen className="h-3 w-3" /> {assignedCourses.length} course{assignedCourses.length === 1 ? "" : "s"}</Badge>
                {expertiseTags[0] && <Badge variant="secondary">{expertiseTags[0]}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="commission">Courses & Commission</TabsTrigger>
          <TabsTrigger value="status">Status & Actions</TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW TAB ═══════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Courses</p>
                  <p className="text-xl font-bold">{assignedCourses.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-xl font-bold">{commission?.enabled ? "Active" : "None"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Added</p>
                  <p className="text-sm font-semibold">{teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-course commission summary */}
          {commission?.enabled && commission.engagements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Commission Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {commission.engagements.map((eng) => {
                    const engCourse = courses.find((c) => c.id === eng.courseId)
                    const rate = eng.model === "percentage" ? `${eng.teacherPct}%`
                      : eng.model === "per_student_fixed" ? formatINR(eng.fixedAmount ?? 0)
                      : `${formatINR(eng.feePerClass ?? 0)}/class`
                    return (
                      <div key={eng.engagementId} className="flex items-center justify-between py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{engCourse?.title ?? "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">{MODEL_LABELS[eng.model]}{eng.batchLabel ? ` · ${eng.batchLabel}` : ""}</p>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0 ml-3">{rate}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expertise */}
          {expertiseTags.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Expertise</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {expertiseTags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ PROFILE TAB ════════════════════════════════════════ */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile Details</CardTitle>
                {!editingProfile && (
                  <Button variant="ghost" size="sm" onClick={startEditProfile} className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {editingProfile ? (
                <>
                  <div className="max-w-[200px]">
                    <Label className="mb-1.5 block">Photo</Label>
                    <ThumbnailField value={avatarUrl} onChange={setAvatarUrl} defaultTitle={name || "Teacher"} folder="faculty" compress={{ maxDim: 200, quality: 0.8 }} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Name <span className="text-destructive">*</span></Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label>Bio</Label>
                      <span className={cn("text-xs", bioPlainLength > 500 ? "text-destructive font-semibold" : "text-muted-foreground")}>{bioPlainLength}/500</span>
                    </div>
                    <RichTextEditor value={bio} onChange={setBio} placeholder="A short bio..." minHeight={100} error={bioPlainLength > 500} />
                  </div>

                  {/* Expertise tags (inline edit) */}
                  <div className="space-y-1.5">
                    <Label>Areas of Expertise</Label>
                    <div className="flex gap-2">
                      <Input placeholder="e.g. Organic Chemistry" value={expertiseInput} onChange={(e) => setExpertiseInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = expertiseInput.trim(); if (t && !expertiseTags.includes(t)) setExpertiseTags((prev) => [...prev, t]); setExpertiseInput("") } }} />
                      <Button type="button" variant="outline" size="sm" onClick={() => { const t = expertiseInput.trim(); if (t && !expertiseTags.includes(t)) setExpertiseTags((prev) => [...prev, t]); setExpertiseInput("") }} disabled={!expertiseInput.trim()}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                    {expertiseTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {expertiseTags.map((t) => (
                          <Badge key={t} variant="secondary" className="gap-1 pr-1">
                            {t}
                            <button type="button" onClick={() => setExpertiseTags((prev) => prev.filter((x) => x !== t))} className="ml-0.5 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* USPs */}
                  <div className="space-y-1.5">
                    <Label>Unique Selling Points</Label>
                    <RichTextEditor value={usps} onChange={setUsps} placeholder="Track record, credentials, achievements..." minHeight={80} />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
                    <Button onClick={handleSaveProfile} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Changes
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                      <p className="text-sm font-medium">{teacher.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <p className="text-sm font-medium">{teacher.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Phone</p>
                      <p className="text-sm font-medium">{teacher.phone || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Photo</p>
                      {teacher.avatar ? (
                        <img src={teacher.avatar} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <p className="text-sm text-muted-foreground">No photo</p>
                      )}
                    </div>
                  </div>
                  {teacher.bio && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Bio</p>
                      <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: teacher.bio }} />
                    </div>
                  )}
                  {expertiseTags.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Expertise</p>
                      <div className="flex flex-wrap gap-1.5">
                        {expertiseTags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                      </div>
                    </div>
                  )}
                  {usps && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Unique Selling Points</p>
                      <p className="text-sm text-muted-foreground">{usps.replace(/<[^>]*>/g, "")}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ COURSES & COMMISSION TAB ═══════════════════════════ */}
        <TabsContent value="commission" className="space-y-6">
          {/* Unified: Courses + Commission */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Courses & Commission</CardTitle>
                  <CardDescription>
                    Assign courses and set commission terms. Each course gets its own engagement with independent commission.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingEngagementId ? (
                /* Per-engagement edit form */
                (() => {
                  const eng = commission?.engagements.find((e) => e.engagementId === editingEngagementId)
                  const engCourse = courses.find((c) => c.id === eng?.courseId)
                  return (
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Editing: {engCourse?.title ?? "Unknown"}</p>
                        <Button variant="ghost" size="sm" onClick={() => setEditingEngagementId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Model</Label>
                        <Select value={commModel} onValueChange={(v) => setCommModel(v as typeof commModel)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Split</SelectItem>
                            <SelectItem value="per_student_fixed">Per-Student Fixed</SelectItem>
                            <SelectItem value="per_class_fixed">Fixed Fee / Class</SelectItem>
                            <SelectItem value="fixed_academy_commission">Fixed Academy Commission</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {commModel === "percentage" && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label className="text-xs">Teacher gets (%)</Label><Input type="number" min={0} max={100} value={commPct} onChange={(e) => setCommPct(Number(e.target.value))} /></div>
                            <div className="space-y-1"><Label className="text-xs">Academy keeps (%)</Label><Input value={100 - commPct} disabled className="bg-muted" /></div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Example: Student pays ₹5,000 → after gateway fees (~₹122) → teacher gets {formatINR(Math.round(4878 * commPct / 100))}, academy keeps {formatINR(Math.round(4878 * (100 - commPct) / 100))}</p>
                        </div>
                      )}
                      {commModel === "per_student_fixed" && (
                        <div className="space-y-2">
                          <div className="space-y-1"><Label className="text-xs">Fixed per enrollment (₹)</Label><Input type="number" min={0} value={commFixed} onChange={(e) => setCommFixed(Number(e.target.value))} /></div>
                          <p className="text-[10px] text-muted-foreground">Example: Each time a student enrolls → teacher gets {formatINR(commFixed)}, academy keeps the rest after gateway fees</p>
                        </div>
                      )}
                      {commModel === "per_class_fixed" && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label className="text-xs">Fee per class (₹)</Label><Input type="number" min={0} value={commFeePerClass} onChange={(e) => setCommFeePerClass(Number(e.target.value))} /></div>
                            <div className="space-y-1"><Label className="text-xs">Total classes</Label><Input type="number" min={1} value={commTotalClasses} onChange={(e) => setCommTotalClasses(Number(e.target.value))} /></div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Example: {commTotalClasses} classes × {formatINR(commFeePerClass)} = {formatINR(commFeePerClass * commTotalClasses)} total contract. Paid per class after admin marks it complete.</p>
                        </div>
                      )}
                      {commModel === "fixed_academy_commission" && (
                        <div className="space-y-2">
                          <div className="space-y-1"><Label className="text-xs">Academy keeps (₹)</Label><Input type="number" min={0} value={commFixed} onChange={(e) => setCommFixed(Number(e.target.value))} /></div>
                          <p className="text-[10px] text-muted-foreground">Example: Student pays ₹5,000 → academy keeps {formatINR(commFixed)} → teacher gets the rest after gateway fees (~{formatINR(Math.max(4878 - commFixed, 0))})</p>
                        </div>
                      )}
                      <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400">Changes apply to future transactions only. Past earnings are locked.</p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingEngagementId(null)}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveCommission} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Save</Button>
                      </div>
                    </div>
                  )
                })()
              ) : (
                /* Per-engagement list + add button */
                <>
                {(!commission || commission.engagements.length === 0) && !addingEngagement && (
                  <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
                    <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <div>
                      <p className="text-sm font-medium">No courses assigned yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Assign a course and set commission terms to start tracking payouts.</p>
                    </div>
                    <Button size="sm" onClick={() => { setCommModel("percentage"); setCommPct(70); setAddingEngagement(true) }} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Assign Course & Set Commission
                    </Button>
                  </div>
                )}
                <div className="space-y-3">
                  {(commission?.engagements ?? []).map((eng) => {
                    const engCourse = courses.find((c) => c.id === eng.courseId)
                    const rate = eng.model === "percentage" ? `${eng.teacherPct}%`
                      : eng.model === "per_student_fixed" ? formatINR(eng.fixedAmount ?? 0)
                      : eng.model === "per_class_fixed" ? `${formatINR(eng.feePerClass ?? 0)}/class`
                      : `${formatINR(eng.academyFixedCommission ?? 0)} academy keeps`
                    return (
                      <div key={eng.engagementId} className="rounded-lg border p-4 space-y-3 hover:border-primary/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{engCourse?.title ?? "Unknown"}</p>
                            {eng.batchLabel && <p className="text-[10px] text-muted-foreground">{eng.batchLabel}</p>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setCommModel(eng.model)
                            setCommPct(eng.teacherPct ?? 70)
                            setCommFixed(eng.fixedAmount ?? 500)
                            setCommFeePerClass(eng.feePerClass ?? 1000)
                            setCommTotalClasses(eng.totalClasses ?? 10)
                            setEditingEngagementId(eng.engagementId)
                          }} className="gap-1 shrink-0 text-xs">
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Model</p>
                            <p className="text-sm font-medium">{MODEL_LABELS[eng.model]}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Rate</p>
                            <p className="text-sm font-bold text-primary">{rate}</p>
                          </div>
                        </div>
                        {eng.model === "per_class_fixed" && (eng.totalClasses ?? 0) > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-semibold">{eng.completedClasses ?? 0} / {eng.totalClasses}</span>
                            </div>
                            <Progress value={((eng.completedClasses ?? 0) / (eng.totalClasses ?? 1)) * 100} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Add new engagement */}
                {addingEngagement ? (
                  <div className="mt-4 space-y-3 rounded-lg border border-primary/30 p-4">
                    <p className="text-sm font-semibold">Add Course Engagement</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Select Course</Label>
                      <select value={newEngCourseId} onChange={(e) => setNewEngCourseId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                        <option value="">Choose a course...</option>
                        {courses.filter((c) => c.status !== "archived").map((c) => (
                          <option key={c.id} value={c.id}>{c.title} ({c.price > 0 ? formatINR(c.price) : "Free"})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Commission Model</Label>
                      <select value={commModel} onChange={(e) => setCommModel(e.target.value as CourseEngagement["model"])} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                        <option value="percentage">Percentage Split</option>
                        <option value="per_student_fixed">Per-Student Fixed</option>
                        <option value="per_class_fixed">Fixed Fee / Class</option>
                        <option value="fixed_academy_commission">Fixed Academy Commission</option>
                      </select>
                    </div>
                    {commModel === "percentage" && (
                      <div className="space-y-2">
                        <div className="space-y-1"><Label className="text-xs">Teacher gets (%)</Label><Input type="number" min={0} max={100} value={commPct} onChange={(e) => setCommPct(Number(e.target.value))} /></div>
                        <div className="rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
                          <strong>Example:</strong> Student pays ₹5,000 → Razorpay deducts ~₹122 (2%+₹3+GST) → ₹4,878 base → Teacher gets {formatINR(Math.round(4878 * commPct / 100))} ({commPct}%) → Academy keeps {formatINR(Math.round(4878 * (100 - commPct) / 100))} ({100 - commPct}%)
                        </div>
                      </div>
                    )}
                    {commModel === "per_student_fixed" && (
                      <div className="space-y-2">
                        <div className="space-y-1"><Label className="text-xs">Fixed per enrollment (₹)</Label><Input type="number" min={0} value={commFixed} onChange={(e) => setCommFixed(Number(e.target.value))} /></div>
                        <div className="rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
                          <strong>Example:</strong> Each student enrollment → Teacher gets {formatINR(commFixed)} flat → Academy keeps the rest after Razorpay fees. Capped at the collected amount.
                        </div>
                      </div>
                    )}
                    {commModel === "per_class_fixed" && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><Label className="text-xs">Fee per class (₹)</Label><Input type="number" min={0} value={commFeePerClass} onChange={(e) => setCommFeePerClass(Number(e.target.value))} /></div>
                          <div className="space-y-1"><Label className="text-xs">Total classes</Label><Input type="number" min={1} value={commTotalClasses} onChange={(e) => setCommTotalClasses(Number(e.target.value))} /></div>
                        </div>
                        <div className="rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
                          <strong>Example:</strong> {commTotalClasses} classes × {formatINR(commFeePerClass)} = {formatINR(commFeePerClass * commTotalClasses)} contract. Teacher earns per class when admin marks it complete. Not tied to student payments.
                        </div>
                      </div>
                    )}
                    {commModel === "fixed_academy_commission" && (
                      <div className="space-y-2">
                        <div className="space-y-1"><Label className="text-xs">Academy keeps (₹)</Label><Input type="number" min={0} value={commFixed} onChange={(e) => setCommFixed(Number(e.target.value))} /></div>
                        <div className="rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
                          <strong>Example:</strong> Student pays ₹5,000 → Razorpay deducts ~₹122 → Academy keeps {formatINR(commFixed)} → Teacher gets {formatINR(Math.max(4878 - commFixed, 0))}
                        </div>
                      </div>
                    )}

                    {/* Razorpay integration note */}
                    <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">How payouts work with Razorpay</p>
                      <ul className="text-[10px] text-blue-600 dark:text-blue-400 space-y-0.5">
                        <li>• <strong>Percentage &amp; Per-Student:</strong> Calculated automatically when a student payment is captured via Razorpay webhook</li>
                        <li>• <strong>Per-Class Fixed:</strong> Accrued when admin marks a class complete — funded from academy&apos;s pooled revenue</li>
                        <li>• <strong>Gateway fees</strong> (Razorpay 2% + ₹3 + 18% GST) are deducted before commission split</li>
                        <li>• <strong>Payouts</strong> are batched monthly (15th) via Razorpay Route or manual bank transfer</li>
                      </ul>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setAddingEngagement(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleAddEngagement} disabled={!newEngCourseId} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="mt-4 w-full gap-1.5" onClick={() => { setCommModel("percentage"); setCommPct(70); setAddingEngagement(true) }}>
                    <Plus className="h-3.5 w-3.5" /> Add Course Engagement
                  </Button>
                )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ STATUS & ACTIONS TAB ═══════════════════════════════ */}
        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <Badge className="mt-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Active</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-sm font-medium mt-1">{commission?.enabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Added On</p>
                  <p className="text-sm font-medium mt-1">{teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigned Courses</p>
                  <p className="text-sm font-medium mt-1">{assignedCourses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
                <div>
                  <p className="text-sm font-medium">Remove this teacher</p>
                  <p className="text-xs text-muted-foreground">Permanently remove {teacher.name} from your workspace. Pending payouts will be honored.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setRemoveDialogOpen(true)} className="shrink-0 gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Remove Dialog ──────────────────────────────────────────── */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Remove Teacher
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{teacher.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
            <p><strong>What happens:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
              <li>Teacher loses all access immediately</li>
              <li>Course content stays published under your academy</li>
              <li>Pending payouts will still be honored</li>
              <li>The teacher will be notified by email</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setRemoveDialogOpen(false); handleRemove() }} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Remove {teacher.name.split(" ")[0]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
