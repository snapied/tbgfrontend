"use client"

// Add Teacher Wizard — 2-step flow.
//
// Step 1: Profile & Role (name, email, phone, bio via WYSIWYG,
//         expertise tags, USPs via WYSIWYG, avatar, course
//         assignment with fuzzy search + create-new + AI builder).
// Step 2: Commission Setup (course-aware — pulls prices from
//         assigned courses, pre-fills amounts, warns on override).

import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  IndianRupee,
  Loader2,
  Plus,
  Search,
  Sparkles,
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { useLMS, generateId, type Course, type Module } from "@/lib/lms-store"
import { slugify } from "@/lib/lesson-utils"
import { fuzzyMatch } from "@/lib/fuzzy-search"
import { AICourseBuilderDialog } from "@/components/ai/ai-course-builder-dialog"
import type { GeneratedCourse, CourseBuilderInput } from "@/lib/ai-client"
import { setCommission, type CourseEngagement, type TeacherCommissionRecord } from "@/lib/teacher-commission-store"
import { cn } from "@/lib/utils"

// ── Helpers ─────────────────────────────────────────────────────

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

// ── Step indicator ──────────────────────────────────────────────

function Stepper({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition",
              done ? "border-primary bg-primary text-primary-foreground"
                : active ? "border-primary text-primary"
                  : "border-muted text-muted-foreground",
            )}>
              {done ? <Check className="h-4 w-4" /> : step}
            </div>
            <span className={cn("text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>
              {step === 1 ? "Profile & Role" : "Commission Setup"}
            </span>
            {step < totalSteps && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

// ── Tag input (for expertise) ───────────────────────────────────

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState("")

  function add() {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput("")
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!input.trim()}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="ml-0.5 rounded-full p-0.5 hover:bg-muted">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ── New course dialog (asks for title + price) ──────────────────

function NewCourseDialog({
  open,
  onOpenChange,
  initialTitle,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initialTitle: string
  onCreated: (course: Course) => void
}) {
  const { addCourse, currentUser } = useLMS()
  const [title, setTitle] = useState(initialTitle)
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("")

  // Reset when dialog opens with new title
  const prevTitle = useRef(initialTitle)
  if (initialTitle !== prevTitle.current) {
    prevTitle.current = initialTitle
    setTitle(initialTitle)
    setPrice("")
    setCategory("")
  }

  function handleCreate() {
    if (!title.trim()) { toast.error("Course title is required"); return }
    const newCourse: Course = {
      id: generateId("course"),
      title: title.trim(),
      slug: slugify(title.trim()),
      description: "",
      thumbnail: "/placeholder.svg?height=400&width=600",
      instructor: currentUser!,
      price: parseFloat(price) || 0,
      currency: "INR",
      category: category.trim(),
      level: "beginner",
      language: "English",
      modules: [],
      totalDuration: 0,
      totalLessons: 0,
      enrolledCount: 0,
      rating: 0,
      reviewCount: 0,
      status: "draft",
      visibility: "private",
      features: [],
      requirements: [],
      whatYouLearn: [],
      certificateEligible: false,
      certificateTemplate: "modern",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addCourse(newCourse)
    onCreated(newCourse)
    onOpenChange(false)
    toast.success(`Created "${title.trim()}" — ${parseFloat(price) ? formatINR(parseFloat(price)) : "Free"}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>This will create a private draft course and assign it to the teacher.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-course-title">Course Title <span className="text-destructive">*</span></Label>
            <Input id="new-course-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-course-price">Price (₹) <span className="text-xs text-muted-foreground font-normal">— 0 or blank = Free</span></Label>
            <Input id="new-course-price" type="number" min="0" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-course-category">Category <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="new-course-category" placeholder="e.g. Chemistry, Mathematics" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim()}>Create & Assign</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Course search dropdown ──────────────────────────────────────

function CourseSearchPicker({
  allCourses,
  selectedIds,
  onSelect,
  onCreateNew,
  onAIGenerate,
}: {
  allCourses: Course[]
  selectedIds: string[]
  onSelect: (course: Course) => void
  onCreateNew: (title: string) => void
  onAIGenerate: () => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    return allCourses
      .filter((c) => c.status !== "archived")
      .filter((c) => !selectedIds.includes(c.id))
      .filter((c) => fuzzyMatch(query, `${c.title} ${c.category}`))
      .slice(0, 8)
  }, [allCourses, selectedIds, query])

  const trimmedQuery = query.trim()
  const exactMatch = allCourses.some((c) => c.title.toLowerCase() === trimmedQuery.toLowerCase())

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search courses or type a new name..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="pl-9"
        />
      </div>
      {open && (query || filtered.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                onClick={() => { onSelect(c); setQuery(""); setOpen(false) }}
              >
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.category || "Uncategorized"} &middot; {c.status}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold">
                  {c.price > 0 ? formatINR(c.price) : "Free"}
                </span>
              </button>
            ))}
            {filtered.length === 0 && trimmedQuery && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No matching courses.</p>
            )}
          </div>
          <div className="border-t border-border p-1 space-y-0.5">
            {trimmedQuery && !exactMatch && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                onClick={() => { onCreateNew(trimmedQuery); setQuery(""); setOpen(false) }}
              >
                <Plus className="h-4 w-4" />
                Create &ldquo;{trimmedQuery}&rdquo; as a new course
              </button>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
              onClick={() => { onAIGenerate(); setOpen(false); setQuery("") }}
            >
              <Sparkles className="h-4 w-4" />
              Generate a course with AI
            </button>
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}

// ── Live calculator ─────────────────────────────────────────────

function CommissionCalculator({
  model,
  teacherPct,
  fixedAmount,
  feePerClass,
  totalClasses,
  coursePrice,
  academyFixedCommission = 500,
}: {
  model: string
  teacherPct: number
  fixedAmount: number
  feePerClass: number
  totalClasses: number
  coursePrice: number
  academyFixedCommission?: number
}) {
  // For per-class-fixed, show contract value instead of per-payment math
  if (model === "per_class_fixed") {
    const contractTotal = feePerClass * totalClasses
    return (
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="h-4 w-4 text-primary" />
          Contract Summary
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-lg font-bold text-primary">{formatINR(feePerClass)}</p>
            <p className="text-[10px] text-muted-foreground">Per class</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-lg font-bold">{totalClasses}</p>
            <p className="text-[10px] text-muted-foreground">Total classes</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-lg font-bold text-green-600">{formatINR(contractTotal)}</p>
            <p className="text-[10px] text-muted-foreground">Contract value</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Teacher gets {formatINR(feePerClass)} after each class is marked complete by admin.
          Paid from the academy&apos;s pooled revenue — not tied to individual student payments.
        </p>
      </div>
    )
  }

  // For percentage and per-student-fixed, show per-payment breakdown
  const samplePrices = coursePrice > 0
    ? [coursePrice, Math.round(coursePrice * 0.5)] // full price + 50% discounted
    : [2000, 5000, 10000]

  function calc(gross: number) {
    if (gross <= 0) return { gross: 0, gatewayFee: 0, gatewayTax: 0, base: 0, teacher: 0, academy: 0, negative: false }
    const gatewayFee = Math.round((gross * 0.02 + 3) * 100) / 100
    const gatewayTax = Math.round(gatewayFee * 0.18 * 100) / 100
    const base = Math.round((gross - gatewayFee - gatewayTax) * 100) / 100
    let teacher = 0
    if (model === "percentage") teacher = Math.round(base * teacherPct / 100 * 100) / 100
    else if (model === "per_student_fixed") teacher = Math.round(Math.min(fixedAmount, Math.max(base, 0)) * 100) / 100
    else if (model === "fixed_academy_commission") {
      const academyCut = Math.round(Math.min(academyFixedCommission, Math.max(base, 0)) * 100) / 100
      teacher = Math.round((base - academyCut) * 100) / 100
    }
    const academy = Math.round((base - teacher) * 100) / 100
    return { gross, gatewayFee, gatewayTax, base, teacher, academy, negative: academy < 0 }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="h-4 w-4 text-primary" />
        Live Calculator
        {coursePrice > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            — based on course price {formatINR(coursePrice)}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-1 pr-3">Student Pays</th>
              <th className="pb-1 pr-3">Gateway (2%+₹3)</th>
              <th className="pb-1 pr-3">GST (18%)</th>
              <th className="pb-1 pr-3">Net Base</th>
              <th className="pb-1 pr-3 text-primary">Teacher Gets</th>
              <th className="pb-1">Academy Gets</th>
            </tr>
          </thead>
          <tbody>
            {samplePrices.map((p, i) => {
              const r = calc(p)
              return (
                <tr key={p} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 pr-3 font-medium">
                    {formatINR(r.gross)}
                    {coursePrice > 0 && i === 1 && (
                      <span className="ml-1 text-[9px] text-muted-foreground">(50% off)</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground">-{formatINR(r.gatewayFee)}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">-{formatINR(r.gatewayTax)}</td>
                  <td className="py-1.5 pr-3">{formatINR(r.base)}</td>
                  <td className="py-1.5 pr-3 font-semibold text-primary">{formatINR(r.teacher)}</td>
                  <td className={cn("py-1.5", r.negative && "text-destructive font-semibold")}>
                    {formatINR(r.academy)}
                    {r.negative && <span className="ml-1 text-[9px]">loss</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Gateway: Razorpay 2% + ₹3 per txn &middot; GST: 18% on gateway fee &middot; All amounts in INR
        {model === "per_student_fixed" && " · Teacher payout capped at net base (never exceeds what was collected)"}
      </p>
    </div>
  )
}

// ── Main wizard ─────────────────────────────────────────────────

export default function AddTeacherWizardPage() {
  const router = useRouter()
  const { courses, addCourse, updateCourse, currentUser, users, addUser, updateUser } = useLMS()

  const [step, setStep] = useState(1)

  // Step 1
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [expertiseTags, setExpertiseTags] = useState<string[]>([])
  const [usps, setUsps] = useState("")
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([])
  const [commissionEnabled, setCommissionEnabled] = useState(false)

  // Track created user ID for Step 2 commission save
  const [createdUserId, setCreatedUserId] = useState<string | null>(null)

  // New course dialog
  const [newCourseDialogOpen, setNewCourseDialogOpen] = useState(false)
  const [newCourseTitle, setNewCourseTitle] = useState("")

  // AI course builder
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false)

  // Step 2 — per-course engagements (one card per assigned course)
  const [engagements, setEngagements] = useState<Record<string, CourseEngagement>>({})

  // Per-course overrides — tracks if admin changed prices from this wizard
  const [coursePriceOverrides, setCoursePriceOverrides] = useState<Record<string, number>>({})

  const [submitting, setSubmitting] = useState(false)

  const bioPlainLength = useMemo(() => bio.replace(/<[^>]*>/g, "").length, [bio])
  const uspsPlainLength = useMemo(() => usps.replace(/<[^>]*>/g, "").length, [usps])

  // ── Course handlers ──────────────────────────────────────────

  function handleSelectCourse(course: Course) {
    if (!selectedCourses.some((c) => c.id === course.id)) {
      setSelectedCourses((prev) => [...prev, course])
    }
  }

  function handleRemoveCourse(courseId: string) {
    setSelectedCourses((prev) => prev.filter((c) => c.id !== courseId))
    setCoursePriceOverrides((prev) => { const n = { ...prev }; delete n[courseId]; return n })
  }

  function handleCourseCreatedFromDialog(course: Course) {
    setSelectedCourses((prev) => [...prev, course])
  }

  function handleCoursePriceChange(courseId: string, newPrice: number) {
    setCoursePriceOverrides((prev) => ({ ...prev, [courseId]: newPrice }))
  }

  const handleAICourseGenerated = useCallback(
    (generated: GeneratedCourse, builderInput: CourseBuilderInput) => {
      const mappedModules: Module[] = generated.modules.map((mod, mi) => ({
        id: generateId("module"),
        title: mod.title,
        description: mod.description,
        order: mi,
        lessons: mod.lessons.map((lesson, li) => ({
          id: generateId("lesson"),
          title: lesson.title,
          description: "",
          type: "text" as const,
          content: lesson.content,
          duration: lesson.estimatedMinutes || 10,
          order: li,
          isPreview: mi === 0 && li === 0,
        })),
      }))
      const newCourse: Course = {
        id: generateId("course"),
        title: generated.title,
        subtitle: generated.subtitle || undefined,
        slug: slugify(generated.title),
        description: generated.description,
        thumbnail: "/placeholder.svg?height=400&width=600",
        instructor: currentUser!,
        price: builderInput.price ?? 0,
        originalPrice: builderInput.originalPrice,
        currency: "INR",
        category: generated.category || "",
        tags: generated.tags,
        level: generated.level,
        language: generated.language || "English",
        modules: mappedModules,
        totalDuration: mappedModules.reduce((s, m) => s + m.lessons.reduce((ls, l) => ls + l.duration, 0), 0),
        totalLessons: mappedModules.reduce((s, m) => s + m.lessons.length, 0),
        enrolledCount: 0,
        rating: 0,
        reviewCount: 0,
        status: "draft",
        visibility: "private",
        features: generated.features,
        requirements: generated.requirements,
        whatYouLearn: generated.whatYouLearn,
        certificateEligible: false,
        certificateTemplate: "modern",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addCourse(newCourse)
      setSelectedCourses((prev) => [...prev, newCourse])
      toast.success(`AI course "${generated.title}" created and assigned!`)
    },
    [addCourse, currentUser],
  )

  // ── Step 1 submit ─────────────────────────────────────────────

  async function handleStep1Submit() {
    if (!name.trim()) { toast.error("Name is required"); return }
    if (!email.trim()) { toast.error("Email is required"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("Please enter a valid email address"); return }
    if (bioPlainLength > 500) { toast.error("Bio must be under 500 characters"); return }

    setSubmitting(true)
    try {
      // Apply any price overrides to the actual courses
      for (const [courseId, newPrice] of Object.entries(coursePriceOverrides)) {
        const course = courses.find((c) => c.id === courseId)
        if (course && course.price !== newPrice) {
          updateCourse(courseId, { price: newPrice, updatedAt: new Date().toISOString() })
        }
      }

      // Prevent duplicate user creation if admin clicks Back then Save again
      let userId = createdUserId
      const notes = [
        expertiseTags.length > 0 ? `Expertise: ${expertiseTags.join(", ")}` : "",
        usps ? `USPs: ${usps.replace(/<[^>]*>/g, "").trim()}` : "",
      ].filter(Boolean).join("\n") || undefined

      if (userId) {
        // User already exists from a previous Step 1 save — update instead
        updateUser(userId, {
          name: name.trim(),
          email: email.trim(),
          avatar: avatarUrl || undefined,
          bio: bio || undefined,
          phone: phone.trim() || undefined,
          notes,
        })
      } else {
        // First time — create
        userId = generateId("user")
        setCreatedUserId(userId)

        // Check for duplicate email
        const existingUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
        if (existingUser) {
          toast.error(`A user with email ${email.trim()} already exists (${existingUser.name})`)
          setSubmitting(false)
          return
        }

        addUser({
          id: userId,
          name: name.trim(),
          email: email.trim(),
          avatar: avatarUrl || undefined,
          role: "instructor" as const,
          bio: bio || undefined,
          phone: phone.trim() || undefined,
          notes,
          createdAt: new Date().toISOString(),
        })
      }

      if (commissionEnabled) {
        // Initialize per-course engagements for Step 2
        const initial: Record<string, CourseEngagement> = {}
        for (const c of selectedCourses) {
          initial[c.id] = {
            engagementId: `eng_${c.id}_${Date.now()}`,
            courseId: c.id,
            model: "percentage",
            teacherPct: 70,
          }
        }
        setEngagements(initial)
        toast.success("Profile saved. Now set up commission per course.")
        setStep(2)
      } else {
        // Save commission as disabled
        setCommission(userId, {
          enabled: false,
          engagements: [],
        })
        toast.success("Teacher added successfully!")
        router.push("/dashboard/teachers")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create teacher")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step 2 submit ─────────────────────────────────────────────

  async function handleStep2Submit() {
    if (!createdUserId) { toast.error("Teacher profile must be saved first"); return }
    setSubmitting(true)
    try {
      const record: TeacherCommissionRecord = {
        enabled: true,
        engagements: Object.values(engagements),
        createdAt: new Date().toISOString(),
      }
      setCommission(createdUserId, record)
      toast.success("Commission saved! Invitation will be sent to the teacher.")
      router.push("/dashboard/teachers")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save commission")
    } finally {
      setSubmitting(false)
    }
  }

  // Helper to update one engagement field
  function updateEngagement(courseId: string, updates: Partial<CourseEngagement>) {
    setEngagements((prev) => ({
      ...prev,
      [courseId]: { ...prev[courseId], ...updates },
    }))
  }

  // Copy first course's settings to all others
  function copySettingsToAll() {
    const firstId = selectedCourses[0]?.id
    if (!firstId || !engagements[firstId]) return
    const source = engagements[firstId]
    setEngagements((prev) => {
      const next = { ...prev }
      for (const c of selectedCourses) {
        if (c.id === firstId) continue
        next[c.id] = {
          ...next[c.id],
          model: source.model,
          teacherPct: source.teacherPct,
          fixedAmount: source.fixedAmount,
          feePerClass: source.feePerClass,
          totalClasses: source.totalClasses,
          academyFixedCommission: source.academyFixedCommission,
        }
      }
      return next
    })
    toast.success("Settings copied to all courses")
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/teachers">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Teachers
        </Link>
      </Button>

      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Add a Teacher</h1>
        <p className="text-muted-foreground">
          {step === 1
            ? "Fill in their profile and choose whether to enable paid engagement."
            : "Configure how this teacher earns from the assigned courses."}
        </p>
      </div>

      {commissionEnabled && <Stepper currentStep={step} totalSteps={2} />}

      {/* ═══ STEP 1 ═══════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Basic information about the teacher</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar — compact height */}
              <div className="space-y-1.5">
                <Label>Photo</Label>
                <div className="max-w-[200px]">
                  <ThumbnailField
                    value={avatarUrl}
                    onChange={setAvatarUrl}
                    defaultTitle={name || "Teacher"}
                    folder="faculty"
                    compress={{ maxDim: 200, quality: 0.8 }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                  <Input id="name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input id="email" type="email" placeholder="teacher@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              {/* Bio WYSIWYG */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Bio</Label>
                  <span className={cn("text-xs", bioPlainLength > 500 ? "text-destructive font-semibold" : "text-muted-foreground")}>
                    {bioPlainLength}/500
                  </span>
                </div>
                <RichTextEditor
                  value={bio}
                  onChange={setBio}
                  placeholder="A short introduction — who they are, what they teach, their teaching style..."
                  minHeight={100}
                  error={bioPlainLength > 500}
                />
              </div>
            </CardContent>
          </Card>

          {/* Expertise & USPs */}
          <Card>
            <CardHeader>
              <CardTitle>What makes them stand out?</CardTitle>
              <CardDescription>Help students understand why this teacher is the right fit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Areas of Expertise</Label>
                <TagInput
                  value={expertiseTags}
                  onChange={setExpertiseTags}
                  placeholder="e.g. Organic Chemistry — press Enter or click Add"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Unique Selling Points</Label>
                  <span className={cn("text-xs", uspsPlainLength > 500 ? "text-destructive font-semibold" : "text-muted-foreground")}>
                    {uspsPlainLength}/500
                  </span>
                </div>
                <RichTextEditor
                  value={usps}
                  onChange={setUsps}
                  placeholder="What makes this teacher unique? Track record, teaching style, credentials, achievements..."
                  minHeight={80}
                  error={uspsPlainLength > 500}
                />
              </div>
            </CardContent>
          </Card>

          {/* Course Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assign Courses</CardTitle>
              <CardDescription>Search existing courses, create a new one, or generate one with AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CourseSearchPicker
                allCourses={courses}
                selectedIds={selectedCourses.map((c) => c.id)}
                onSelect={handleSelectCourse}
                onCreateNew={(title) => { setNewCourseTitle(title); setNewCourseDialogOpen(true) }}
                onAIGenerate={() => setAiBuilderOpen(true)}
              />

              {selectedCourses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {selectedCourses.length} course{selectedCourses.length === 1 ? "" : "s"} assigned
                  </p>
                  <div className="space-y-2">
                    {selectedCourses.map((c) => {
                      const overridePrice = coursePriceOverrides[c.id]
                      const displayPrice = overridePrice ?? c.price
                      const hasOverride = overridePrice !== undefined && overridePrice !== c.price
                      return (
                        <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                          <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{c.title}</p>
                            <p className="text-xs text-muted-foreground">{c.category || "Uncategorized"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <IndianRupee className="h-3 w-3 text-muted-foreground" />
                              <Input
                                type="number"
                                min="0"
                                className="h-8 w-24 text-right text-sm"
                                value={displayPrice}
                                onChange={(e) => handleCoursePriceChange(c.id, Number(e.target.value))}
                              />
                            </div>
                            {hasOverride && (
                              <span className="text-[10px] text-amber-600 font-medium">changed</span>
                            )}
                            <button type="button" onClick={() => handleRemoveCourse(c.id)} className="rounded p-1 hover:bg-muted">
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {Object.keys(coursePriceOverrides).length > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        You&apos;ve changed course prices here. These changes will also update the actual course price on the main course page.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commission toggle — prominent */}
          <Card className={cn("border-2 transition-colors", commissionEnabled ? "border-primary bg-primary/5" : "border-border")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Paid Engagement
              </CardTitle>
              <CardDescription>
                Will this teacher earn commission or a fixed fee from course sales?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCommissionEnabled(true)}
                  className={cn(
                    "rounded-lg border-2 p-4 text-left transition-all",
                    commissionEnabled ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <p className="text-sm font-semibold">{commissionEnabled ? "✓ " : ""}Yes — Paid Teacher</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Track commissions per course. Set percentage splits, fixed fees per class, or per-student amounts. Automate payouts.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setCommissionEnabled(false)}
                  className={cn(
                    "rounded-lg border-2 p-4 text-left transition-all",
                    !commissionEnabled ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <p className="text-sm font-semibold">{!commissionEnabled ? "✓ " : ""}No — Volunteer / Staff</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Teacher gets access to assigned courses but no commission tracking or automated payouts.
                  </p>
                </button>
              </div>

              {commissionEnabled && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold text-primary">What happens next?</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• You&apos;ll set commission terms <strong>per course</strong> in the next step</li>
                    <li>• Choose from: <strong>Percentage Split</strong> (e.g. 70/30), <strong>Fixed Fee per Class</strong> (e.g. ₹1,500 × 10 classes), or <strong>Fixed per Student</strong> (e.g. ₹500 per enrollment)</li>
                    <li>• Each course can have its own model and rate</li>
                    <li>• A live calculator shows the exact math before you save</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleStep1Submit} disabled={submitting} size="lg">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {commissionEnabled ? <>Save & Continue <ArrowRight className="ml-2 h-4 w-4" /></> : "Save & Invite"}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2 — Per-course commission cards ════════════════ */}
      {step === 2 && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Commission Setup</CardTitle>
                  <CardDescription>Configure commission for each assigned course independently</CardDescription>
                </div>
                {selectedCourses.length > 1 && (
                  <Button variant="outline" size="sm" onClick={copySettingsToAll} className="text-xs">
                    Copy first to all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCourses.map((course, idx) => {
                const eng = engagements[course.id]
                if (!eng) return null
                const coursePrice = coursePriceOverrides[course.id] ?? course.price
                const academyPct = eng.model === "percentage" ? 100 - (eng.teacherPct ?? 0) : 0
                const contractValue = eng.model === "per_class_fixed" ? (eng.feePerClass ?? 0) * (eng.totalClasses ?? 0) : 0

                return (
                  <div key={course.id} className="rounded-lg border p-4 space-y-4">
                    {/* Course header */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{course.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {course.category || "Uncategorized"} &middot; {coursePrice > 0 ? formatINR(coursePrice) : "Free"}
                        </p>
                      </div>
                    </div>

                    {/* Model selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Commission Model</Label>
                      <select
                        value={eng.model}
                        onChange={(e) => updateEngagement(course.id, { model: e.target.value as CourseEngagement["model"] })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="percentage">Percentage Split</option>
                        <option value="per_student_fixed">Per-Student Fixed</option>
                        <option value="per_class_fixed">Fixed Fee / Class</option>
                        <option value="fixed_academy_commission">Fixed Academy Commission</option>
                      </select>
                    </div>

                    {/* Model-specific fields */}
                    {eng.model === "percentage" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Teacher gets (%)</Label>
                          <Input type="number" min={0} max={100} value={eng.teacherPct ?? 70}
                            onChange={(e) => updateEngagement(course.id, { teacherPct: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Academy keeps (%)</Label>
                          <Input value={academyPct} disabled className="bg-muted" />
                        </div>
                      </div>
                    )}

                    {eng.model === "per_student_fixed" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Fixed amount per enrollment (₹)</Label>
                        <Input type="number" min={0} value={eng.fixedAmount ?? 500}
                          onChange={(e) => updateEngagement(course.id, { fixedAmount: Number(e.target.value) })} />
                      </div>
                    )}

                    {eng.model === "per_class_fixed" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Fee per class (₹)</Label>
                            <Input type="number" min={0} value={eng.feePerClass ?? 1000}
                              onChange={(e) => updateEngagement(course.id, { feePerClass: Number(e.target.value) })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Total classes</Label>
                            <Input type="number" min={1} value={eng.totalClasses ?? 10}
                              onChange={(e) => updateEngagement(course.id, { totalClasses: Number(e.target.value) })} />
                          </div>
                        </div>
                        {contractValue > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Contract value: <span className="font-semibold text-foreground">{formatINR(contractValue)}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {eng.model === "fixed_academy_commission" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Fixed Academy Commission (₹)</Label>
                        <Input type="number" min={0} value={eng.academyFixedCommission ?? 500}
                          onChange={(e) => updateEngagement(course.id, { academyFixedCommission: Number(e.target.value) })} />
                        <p className="text-xs text-muted-foreground">
                          Academy keeps this fixed ₹ amount. Teacher gets the rest after gateway fees.
                        </p>
                      </div>
                    )}

                    {/* Per-course calculator */}
                    <CommissionCalculator
                      model={eng.model}
                      teacherPct={eng.teacherPct ?? 70}
                      fixedAmount={eng.fixedAmount ?? 500}
                      feePerClass={eng.feePerClass ?? 1000}
                      totalClasses={eng.totalClasses ?? 10}
                      coursePrice={coursePrice}
                      academyFixedCommission={eng.academyFixedCommission ?? 500}
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleStep2Submit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Send Invitation
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <NewCourseDialog
        open={newCourseDialogOpen}
        onOpenChange={setNewCourseDialogOpen}
        initialTitle={newCourseTitle}
        onCreated={handleCourseCreatedFromDialog}
      />
      <AICourseBuilderDialog
        open={aiBuilderOpen}
        onOpenChange={setAiBuilderOpen}
        onCourseGenerated={handleAICourseGenerated}
      />
    </div>
  )
}
