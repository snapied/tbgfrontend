"use client"

import { use, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { BackButton } from "@/components/ui/back-button"
import {
  ArrowLeft,
  Award,
  Copy,
  Eye,
  Globe,
  Loader2,
  Lock,
  Plus,
  Save,
  Tag as TagIcon,
  Trash2,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  type Coupon,
  type Course,
  type CourseVisibility,
  type Module,
} from "@/lib/lms-store"
import { slugify } from "@/lib/lesson-utils"
import { CurriculumEditor } from "@/components/course-editor/curriculum-editor"
import { TagsInput } from "@/components/course-editor/tags-input"
import { FileUploadField } from "@/components/upload/file-upload-field"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { VideoUrlPreview } from "@/components/upload/video-url-preview"
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { uploadDataUrl } from "@/lib/upload-asset"
import { BUILTIN_TEMPLATES } from "@/lib/certificate-templates"
import { loadCustomTemplates } from "@/lib/custom-templates"
import { CertificateTemplatePicker } from "@/components/course-editor/certificate-template-picker"
import { CategoryCombobox } from "@/components/course-editor/category-combobox"
import { CATEGORY_TAG_SUGGESTIONS } from "@/lib/course-categories"
import { COURSE_LANGUAGES } from "@/lib/course-languages"
import { SUPPORTED_CURRENCIES, currencyInfo, formatMoney } from "@/lib/currency"
import { fireWebhookEvent } from "@/lib/event-dispatcher"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { AICourseBuilderDialog } from "@/components/ai/ai-course-builder-dialog"
import { aiCourseTitles, aiCourseDescription, type GeneratedCourse, type CourseBuilderInput } from "@/lib/ai-client"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

const COURSE_EDIT_TOUR: TourStep[] = [
  {
    title: "Edit your course",
    body: "Five tabs — Basics, Curriculum, Pricing, Access, SEO. Edits autosave every 2 seconds; the header shows the last save timestamp.",
    emoji: "📚",
    placement: "center",
  },
  {
    target: "[data-tour='course-edit-tabs']",
    title: "Five sections, one place",
    body: "Basics has title + thumbnail + description. Curriculum holds the lesson tree. Pricing is the SKU + currency. Access controls drip + visibility. SEO sets meta tags.",
    emoji: "🗂️",
    placement: "bottom",
  },
  {
    target: "[data-tour='course-edit-preview']",
    title: "Preview live",
    body: "Opens the public course page in a new tab so you can see what students will see — including unpublished draft changes.",
    emoji: "👁️",
    placement: "left",
  },
  {
    target: "[data-tour='course-edit-save']",
    title: "Manual save anytime",
    body: "Autosave runs every 2 seconds while you edit — but you can hit Save to force-flush before navigating away.",
    emoji: "💾",
    placement: "left",
  },
]
import { toast } from "sonner"

// Resolve a display label for either a built-in template id or a custom
// template id (custom-xxx) the Instructor designed. Used in the status row
// above the certificate picker.
function resolveTemplateLabel(id: string): string {
  const builtin = BUILTIN_TEMPLATES.find((t) => t.id === id)
  if (builtin) return `the "${builtin.name}" template`
  if (typeof window !== "undefined") {
    const custom = loadCustomTemplates().find((t) => t.id === id)
    if (custom) return `your custom template "${custom.name}"`
  }
  return `template "${id}"`
}

// Thin guard wrapper. The lms-store hydrates asynchronously
// (localStorage → server blob), so on a hard refresh `getCourseById`
// briefly returns undefined and every useState below would seed with
// blanks. We hold rendering of the form until both the store is
// hydrated AND the course resolves, then key the inner component on
// the course id so it remounts with fresh useState seeds.
export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getCourseById, hydrated: lmsHydrated } = useLMS()
  const course = getCourseById(id)
  if (!course && !lmsHydrated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!course) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Course not found</h2>
          <p className="mt-2 text-muted-foreground">
            The course you are looking for does not exist.
          </p>
          <BackButton label="Back" fallbackHref="/dashboard/courses" className="mt-4" />
        </div>
      </div>
    )
  }
  // Suspense wraps the inner page so `useSearchParams` (used inside
  // EditCoursePageInner to persist the active tab in the URL) can
  // be statically pre-rendered without Next yelling about a missing
  // boundary.
  return (
    <Suspense fallback={null}>
      <EditCoursePageInner course={course} key={course.id} />
    </Suspense>
  )
}

function EditCoursePageInner({ course }: { course: Course }) {
  const id = course.id
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  // Active tab tracked in the URL so a refresh / share-link lands
  // the visitor on the same tab. Accepts only known tab values.
  const TAB_VALUES = ["basics", "curriculum", "pricing", "access", "seo"] as const
  type EditTab = (typeof TAB_VALUES)[number]
  const tabFromUrl = (searchParams?.get("tab") ?? "") as EditTab | ""
  const activeTab: EditTab = (TAB_VALUES as readonly string[]).includes(tabFromUrl)
    ? (tabFromUrl as EditTab)
    : "basics"
  const setActiveTab = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    if (next === "basics") params.delete("tab")
    else params.set("tab", next)
    const q = params.toString()
    // `replace` so back-button doesn't pile up a stack of tab swaps.
    router.replace(q ? `${pathname}?${q}` : pathname)
  }
  const {
    updateCourse,
    users,
    getCourseById,
    saveCourseDraft,
    publishCourseDraft,
    discardCourseDraft,
  } = useLMS()
  // Faculty pool for the curriculum editor's per-module owner
  // picker + the course-level co-instructor picker. Computed once
  // here so both surfaces stay in sync with whoever's on the team
  // right now.
  const facultyPool = users.filter((u) => u.role === "admin" || u.role === "instructor")

  // Effective view of the course = canonical fields with the pending
  // `draft` overlaid. Editing happens against this view so the user
  // sees their unpublished edits; the public site continues to read
  // from the canonical fields until Publish is clicked.
  const seeded: Course = { ...course, ...(course.draft ?? {}) } as Course
  const hasDraft = !!course.draft && Object.keys(course.draft).length > 0

  // ---- Form state, seeded from course (draft overlaid) ----
  const [title, setTitle] = useState(seeded.title ?? "")
  const [subtitle, setSubtitle] = useState(seeded.subtitle ?? "")
  const [description, setDescription] = useState(seeded.description ?? "")
  const [thumbnail, setThumbnail] = useState(seeded.thumbnail ?? "")
  const [introVideoUrl, setIntroVideoUrl] = useState(seeded.introVideoUrl ?? "")
  const [category, setCategory] = useState(seeded.category ?? "")
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">(seeded.level ?? "beginner")
  const [language, setLanguage] = useState(seeded.language ?? "English")
  const [tags, setTags] = useState<string[]>(seeded.tags ?? [])
  const [coInstructorIds, setCoInstructorIds] = useState<string[]>(seeded.coInstructorIds ?? [])
  const [slug, setSlug] = useState(seeded.slug ?? "")
  // Treat the slug as "auto-derived" whenever it still matches the
  // slugified title — that way renaming a course keeps the URL in
  // sync until the user actually types a custom slug. The previous
  // `!!course?.slug` seeded `true` for every saved course, so a
  // course renamed from "Math 101" to "Math 201" kept slug
  // `math-101` forever unless the user clicked the wand.
  const [slugDirty, setSlugDirty] = useState<boolean>(
    !!course?.slug && course.slug !== slugify(course.title ?? ""),
  )
  // SEO fields — initialized from the saved override OR auto-derived from
  // the course's own fields so the form is never blank by default. The
  // Instructor sees the meta filled in with sensible values they can keep,
  // tweak, or clear. Whatever ends up in the input is what gets saved.
  //
  // Derived defaults:
  //   • title       → course title (truncated to 60 inside the input)
  //   • description → plain-text version of the rich description
  //   • keywords    → category first, then user tags
  //   • OG image    → course thumbnail
  //
  // A "Reset to course defaults" button below the form clears any overrides
  // back to the auto-derived values in one click.
  const autoDerivedSeo = useMemo(() => {
    const plainDescription = (course?.description ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    const keywordSeed = [course?.category, ...(course?.tags ?? [])].filter(Boolean) as string[]
    return {
      title: (course?.title ?? "").slice(0, 70),
      description: plainDescription.slice(0, 200),
      keywords: keywordSeed.join(", "),
      ogImage: course?.thumbnail ?? "",
    }
  }, [course?.title, course?.description, course?.category, course?.tags, course?.thumbnail])

  const [seoTitle, setSeoTitle] = useState(seeded.seoTitle ?? autoDerivedSeo.title)
  const [seoDescription, setSeoDescription] = useState(seeded.seoDescription ?? autoDerivedSeo.description)
  const [seoKeywords, setSeoKeywords] = useState(
    seeded.seoKeywords && seeded.seoKeywords.length > 0
      ? seeded.seoKeywords.join(", ")
      : autoDerivedSeo.keywords,
  )
  const [ogImage, setOgImage] = useState(seeded.ogImage ?? autoDerivedSeo.ogImage)

  const resetSeoToCourseDefaults = () => {
    setSeoTitle(autoDerivedSeo.title)
    setSeoDescription(autoDerivedSeo.description)
    setSeoKeywords(autoDerivedSeo.keywords)
    setOgImage(autoDerivedSeo.ogImage)
  }

  // Pricing
  const [price, setPrice] = useState((seeded.price ?? 0).toString())
  const [originalPrice, setOriginalPrice] = useState((seeded.originalPrice ?? "").toString())
  // INR-only on v1. Legacy courses created when USD was selectable
  // still load with their old currency, but new edits cannot switch
  // to a disabled currency through the picker.
  const [currency, setCurrency] = useState(seeded.currency ?? "INR")
  const [earlyBirdPrice, setEarlyBirdPrice] = useState((seeded.earlyBirdPrice ?? "").toString())
  const [earlyBirdUntil, setEarlyBirdUntil] = useState(seeded.earlyBirdUntil?.slice(0, 16) ?? "")
  const [coupons, setCoupons] = useState<Coupon[]>(seeded.coupons ?? [])

  // Lifecycle (operational — not part of the draft snapshot;
  // status/publishAt take effect immediately when toggled).
  const [status, setStatus] = useState<"draft" | "published" | "archived">(course?.status ?? "draft")
  const [publishAt, setPublishAt] = useState(course?.publishAt?.slice(0, 16) ?? "")
  // Visibility + password are operational gates too — flipping them
  // should bite immediately so a Instructor who wants to lock the door
  // doesn't have to think about Publish first.
  const [visibility, setVisibility] = useState<CourseVisibility>(course?.visibility ?? "public")
  const [accessPassword, setAccessPassword] = useState(course?.accessPassword ?? "")
  // Existing courses pre-date the explicit toggle, so we fall back to "has a
  // template" instead of a blanket `true` — that way legacy courses keep
  // their cert behaviour without us flipping the bit silently for any course
  // that genuinely shouldn't issue one.
  const [certificateEligible, setCertificateEligible] = useState<boolean>(
    seeded.certificateEligible ?? !!seeded.certificateTemplate,
  )
  const [certificateTemplate, setCertificateTemplate] = useState<string>(
    seeded.certificateTemplate ?? "modern",
  )

  // Curriculum
  const [modules, setModules] = useState<Module[]>(seeded.modules ?? [])

  // Save/auto-save state
  const [saving, setSaving] = useState(false)
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const firstRender = useRef(true)

  // Warn before navigating away with pending changes. Autosave runs 2s
  // after the last edit, so this only really fires during that gap or
  // when the network/save is mid-flight — but it's the difference
  // between losing work and not.
  const { confirmLeave } = useUnsavedChangesGuard(dirty || saving)

  const [regeneratingCover, setRegeneratingCover] = useState(false)
  const [regeneratingOg, setRegeneratingOg] = useState(false)

  // Build the CourseSeed used by the cover/OG image generator. Same
  // category → hue mapping the cover-regen used inline; extracting
  // it lets the OG generator and the autosave fallback both reuse
  // the result without duplicating the lookup table.
  const buildSeed = () => {
    const norm = (category || "").toLowerCase()
    let seedCat:
      | "math" | "yoga" | "coding" | "finance" | "language"
      | "exam-prep" | "creative" | "wellness" | "business" | "general" = "general"
    if (norm.includes("math") || norm.includes("edu")) seedCat = "math"
    else if (norm.includes("yoga") || norm.includes("fitness")) seedCat = "yoga"
    else if (norm.includes("cod") || norm.includes("tech")) seedCat = "coding"
    else if (norm.includes("fin") || norm.includes("money")) seedCat = "finance"
    else if (norm.includes("lang")) seedCat = "language"
    else if (norm.includes("exam") || norm.includes("prep")) seedCat = "exam-prep"
    else if (norm.includes("creat") || norm.includes("art")) seedCat = "creative"
    else if (norm.includes("well") || norm.includes("health")) seedCat = "wellness"
    else if (norm.includes("bus")) seedCat = "business"

    const CATEGORY_HUE = {
      math: 210, yoga: 265, coding: 150, finance: 45, language: 340,
      "exam-prep": 195, creative: 20, wellness: 170, business: 285, general: 230,
    }
    return {
      rawInput: title,
      topic: title,
      category: seedCat,
      audienceHint: subtitle || undefined,
      brandHue: CATEGORY_HUE[seedCat] || 230,
      modules: modules.map((m) => ({
        title: m.title,
        lessons: (m.lessons || []).map((l) => l.title),
      })),
      priceInr: parseFloat(price) || 0,
      promiseLines: [],
      sampleStudentName: "Student",
    }
  }

  const handleRegenerateCover = async () => {
    setRegeneratingCover(true)
    try {
      const { composeCoverPng } = await import("@/lib/cover-image-compose")
      const baked = await composeCoverPng(buildSeed())
      if (baked) {
        setThumbnail(baked)
        setDirty(true)
      }
    } catch (err) {
      console.error("Failed to regenerate designed cover:", err)
    } finally {
      setRegeneratingCover(false)
    }
  }

  // Generate a social-share image from the same seed used for the
  // course cover. Falls back to that machinery so the OG image and
  // the thumbnail look like they belong to the same course.
  const handleGenerateOgImage = async () => {
    setRegeneratingOg(true)
    try {
      const { composeCoverPng } = await import("@/lib/cover-image-compose")
      const baked = await composeCoverPng(buildSeed())
      if (baked) {
        // The composer returns a data: URL; the autosave path will
        // upload it to R2 alongside the thumbnail when the user
        // hits Save. Until then it renders inline in the preview.
        setOgImage(baked)
        setDirty(true)
        toast.success("Generated a social-share image. Tweak or replace anytime.")
      } else {
        toast.error("Couldn't generate one — try again or upload manually.")
      }
    } catch (err) {
      console.error("Failed to generate OG image:", err)
      toast.error("Couldn't generate one — try again or upload manually.")
    } finally {
      setRegeneratingOg(false)
    }
  }

  // One-tap fill: copy the current course thumbnail into the OG
  // image field. Useful when the cover is already on-brand and the
  // Instructor just hadn't gotten around to repeating it in SEO.
  const handleUseCoverAsOg = () => {
    if (!thumbnail) return
    setOgImage(thumbnail)
    setDirty(true)
    toast.success("Using the course cover as the social-share image.")
  }

  // Autosave fallback: when the Instructor publishes and ogImage is
  // still empty, automatically copy the cover (or generate a fresh
  // one if there's no cover either) so the social preview never
  // ships blank.
  const ensureSocialShareImage = async () => {
    if (ogImage.trim()) return
    if (thumbnail) {
      setOgImage(thumbnail)
      return
    }
    try {
      const { composeCoverPng } = await import("@/lib/cover-image-compose")
      const baked = await composeCoverPng(buildSeed())
      if (baked) setOgImage(baked)
    } catch {
      /* silent — OG image stays blank, public site falls back to title */
    }
  }

  // Mark form dirty whenever any controlled value changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setDirty(true)
  }, [
    title, subtitle, description, thumbnail, introVideoUrl, category, level, language,
    tags, coInstructorIds, slug, price, originalPrice, currency, earlyBirdPrice, earlyBirdUntil, coupons,
    status, publishAt, visibility, accessPassword, certificateEligible, certificateTemplate, modules,
    seoTitle, seoDescription, seoKeywords, ogImage,
  ])

  // Auto-derive slug from title (until the user manually edits the slug).
  useEffect(() => {
    if (!slugDirty) setSlug(slugify(title))
  }, [title, slugDirty])

  // Auto-save 2s after the last edit. Lightweight: just dispatches updateCourse.
  useEffect(() => {
    if (!dirty || !course) return
    const t = setTimeout(() => {
      void doSave({ silent: true })
    }, 2000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, subtitle, description, thumbnail, introVideoUrl, category, level,
      language, tags, coInstructorIds, slug, price, originalPrice, currency, earlyBirdPrice, earlyBirdUntil,
      coupons, status, publishAt, visibility, accessPassword, certificateEligible,
      certificateTemplate, modules, seoTitle, seoDescription, seoKeywords, ogImage])

  const coursePriced = parseFloat(price) > 0
  const totalLessons = useMemo(() => modules.reduce((a, m) => a + m.lessons.length, 0), [modules])
  const totalDuration = useMemo(
    () => modules.reduce((a, m) => a + m.lessons.reduce((la, l) => la + (l.duration || 0), 0), 0),
    [modules],
  )
  const previewLessons = useMemo(
    () => modules.reduce((a, m) => a + m.lessons.filter((l) => l.isPreview).length, 0),
    [modules],
  )

  if (!course) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Course not found</h2>
          <p className="mt-2 text-muted-foreground">The course you are looking for does not exist.</p>
          <BackButton label="Back" fallbackHref="/dashboard/courses" className="mt-4" />
        </div>
      </div>
    )
  }

  async function doSave(options: { silent?: boolean } = {}) {
    if (saving) return
    setSaving(true)
    let currentThumbnail = thumbnail
    if (thumbnail.startsWith("data:")) {
      try {
        currentThumbnail = await uploadDataUrl(thumbnail, "course-cover")
        setThumbnail(currentThumbnail)
      } catch (err) {
        console.error("Failed to upload designed thumbnail on save:", err)
      }
    }
    // Content fields go to the DRAFT — the public site keeps showing
    // the last-published version until the Instructor clicks Publish.
    // Operational fields (status, publishAt, visibility, password)
    // bypass the draft so they take effect immediately — those are
    // gates, not content.
    saveCourseDraft(id, {
      title,
      subtitle: subtitle || undefined,
      description,
      thumbnail: currentThumbnail,
      introVideoUrl: introVideoUrl || undefined,
      category,
      tags: tags.length > 0 ? tags : undefined,
      coInstructorIds: coInstructorIds.length > 0 ? coInstructorIds : undefined,
      level,
      language,
      slug: slug || slugify(title),
      price: parseFloat(price) || 0,
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      currency,
      earlyBirdPrice: earlyBirdPrice ? parseFloat(earlyBirdPrice) : undefined,
      earlyBirdUntil: earlyBirdUntil ? new Date(earlyBirdUntil).toISOString() : undefined,
      coupons: coupons.length > 0 ? coupons : undefined,
      certificateEligible,
      certificateTemplate,
      modules,
      totalLessons,
      totalDuration,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      seoKeywords: seoKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      ogImage: ogImage.trim() || undefined,
    })
    // Operational flips go straight to the canonical row.
    updateCourse(id, {
      status,
      publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
      visibility,
      accessPassword: visibility === "password" ? accessPassword : undefined,
    })
    setLastSavedAt(new Date())
    setDirty(false)
    // Settle the spinner briefly even on silent autosaves for nicer UX.
    setTimeout(() => setSaving(false), options.silent ? 250 : 400)
  }

  // Apply the current pending draft to the canonical fields so the
  // public site reflects the editor's state. Fires the
  // course.published webhook the first time a course actually
  // goes live. Records a new version snapshot — see
  // /dashboard/courses/[id]/versions for the history.
  async function doPublishChanges() {
    if (saving) return
    // Make sure the social-share image isn't blank before we commit
    // the publish — falls back to the cover, then generates one if
    // both are empty. Don't want shared links rendering bare titles.
    await ensureSocialShareImage()
    // Save the latest values to draft first so an unsaved-keystroke
    // doesn't get left behind.
    await doSave({ silent: true })
    const courseBefore = getCourseById(id)
    const wasPublished = courseBefore?.status === "published"
    publishCourseDraft(id)
    // If the course wasn't published yet, flip it now too.
    if (status !== "published") {
      setStatus("published")
      updateCourse(id, { status: "published" })
    }
    if (!wasPublished) {
      fireWebhookEvent("course.published", { id, title, slug: slug || slugify(title) })
    }
    toast.success("Published — your changes are now live for students.")
  }

  function doDiscardDraft() {
    discardCourseDraft(id)
    toast.success("Discarded unpublished changes. Reload to see the published version.")
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId="courses-edit-v1" steps={COURSE_EDIT_TOUR} />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirmLeave()) router.push(`/dashboard/courses/${id}`)
            }}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Course</h1>
            <p className="text-xs text-muted-foreground">
              {saving ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </span>
              ) : dirty ? (
                "Unsaved changes — autosave in 2s"
              ) : lastSavedAt ? (
                `Draft saved · ${lastSavedAt.toLocaleTimeString()}`
              ) : (
                "All changes saved as draft"
              )}
            </p>
            {(hasDraft || dirty) && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unpublished changes — students still see the last published version
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TakeATourButton tourId="courses-edit-v1" />
          <Button variant="outline" asChild data-tour="course-edit-preview">
            <Link href={`/learn/${slug || course.slug}`} target="_blank" rel="noreferrer">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => doSave()}
            disabled={saving || !dirty}
            data-tour="course-edit-save"
            title="Save changes to the draft (not yet visible to students)"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving…" : dirty ? "Save draft" : "Saved"}
          </Button>
          {(hasDraft || dirty) && (
            <>
              <Button
                onClick={() => void doPublishChanges()}
                disabled={saving}
                title="Apply the draft to the live course — students will see these changes."
              >
                <Globe className="mr-2 h-4 w-4" />
                Publish changes
              </Button>
              <Button
                variant="ghost"
                onClick={doDiscardDraft}
                disabled={saving}
                title="Throw away the pending draft and return to the published version."
              >
                Discard
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Main */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="min-w-0 space-y-4"
        >
          <TabsList className="w-full justify-start gap-1 overflow-x-auto" data-tour="course-edit-tabs">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="curriculum">
              Curriculum
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{totalLessons}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          {/* --- Basics --- */}
          <TabsContent value="basics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic information</CardTitle>
                <CardDescription>Title, subtitle, description, and intro media.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title">Course title *</Label>
                    <AIGenerateButton
                      label="Suggest titles"
                      size="xs"
                      disabled={!category && !title}
                      onGenerate={async () => {
                        const topic = title.trim() || category || ""
                        if (!topic) {
                          toast.error("Enter a category or any working title first so AI knows the topic.")
                          return
                        }
                        const r = await aiCourseTitles({ topic })
                        if ("error" in r) {
                          toast.error(r.error)
                          return
                        }
                        const picked = r.titles[0]
                        if (picked) {
                          setTitle(picked)
                          toast.success("Title suggested — review and edit as you like.", {
                            description: r.titles.slice(1).join(" · ") || undefined,
                          })
                        }
                      }}
                    />
                  </div>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Complete Full-Stack JavaScript Bootcamp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Master modern JS, React, Node, and MongoDB by shipping real apps."
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="desc">Description</Label>
                    <AIGenerateButton
                      label="Write with AI"
                      size="xs"
                      disabled={!title.trim()}
                      onGenerate={async () => {
                        if (!title.trim()) {
                          toast.error("Give the course a title first.")
                          return
                        }
                        const r = await aiCourseDescription({ title: title.trim(), topic: category || undefined })
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
                    placeholder="What students will learn, who it's for, and what makes it different. Format text, drop in images, embed YouTube previews."
                    minHeight={180}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Thumbnail</Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary"
                        onClick={handleRegenerateCover}
                        disabled={regeneratingCover}
                      >
                        {regeneratingCover ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          "Regenerate designed cover"
                        )}
                      </Button>
                    </div>
                    <ThumbnailField
                      value={thumbnail}
                      onChange={setThumbnail}
                      defaultTitle={title}
                      folder="courses"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Upload, search Unsplash, or design one. Recommended 1280×720.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Intro video</Label>
                    <FileUploadField
                      value={introVideoUrl}
                      onChange={setIntroVideoUrl}
                      accept="video/mp4,video/webm,video/quicktime"
                      maxSizeMB={100}
                      urlPlaceholder="YouTube, Vimeo, Loom, or MP4 link"
                      hint="Tip: host long videos on YouTube/Vimeo/Bunny and paste the link."
                    />
                    <VideoUrlPreview url={introVideoUrl} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discovery</CardTitle>
                <CardDescription>How students find and judge your course.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <CategoryCombobox
                      value={category}
                      onChange={setCategory}
                      placeholder="Pick a category"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select value={level} onValueChange={(v) => setLevel(v as "beginner" | "intermediate" | "advanced")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Same picker shape as the new-course page —
                            available 10 first, coming-soon 5 disabled
                            at the bottom. If the course already has a
                            language we no longer surface (legacy data
                            like "German"), we still render it as a
                            disabled option so the form doesn't show
                            an empty trigger. */}
                        {!COURSE_LANGUAGES.some((l) => l.name === language) && language && (
                          <SelectItem value={language} disabled>
                            {language}
                            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Legacy — pick a new one
                            </span>
                          </SelectItem>
                        )}
                        {COURSE_LANGUAGES.map((lang) => (
                          <SelectItem
                            key={lang.name}
                            value={lang.name}
                            disabled={!lang.available}
                          >
                            {lang.name}
                            {lang.native && (
                              <span className="ml-2 text-muted-foreground">({lang.native})</span>
                            )}
                            {!lang.available && (
                              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Coming soon
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <TagIcon className="h-3.5 w-3.5" /> Tags
                  </Label>
                  <TagsInput
                    value={tags}
                    onChange={setTags}
                    suggestions={CATEGORY_TAG_SUGGESTIONS[category]}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Curriculum --- */}
          <TabsContent value="curriculum" className="space-y-4">
            {/* Course-level co-instructors. The primary owner stays
                the headline Instructor (shown on the hero, signs the
                certificate); these are additional contributors. Only
                renders when there's another faculty member to
                actually pick. */}
            {facultyPool.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Co-instructors</CardTitle>
                  <CardDescription>
                    Additional teachers who can build and grade alongside the primary owner.
                    Tap a name to add or remove.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {facultyPool
                      .filter((u) => u.id !== course?.instructor?.id)
                      .map((u) => {
                        const selected = coInstructorIds.includes(u.id)
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() =>
                              setCoInstructorIds((prev) =>
                                prev.includes(u.id)
                                  ? prev.filter((x) => x !== u.id)
                                  : [...prev, u.id],
                              )
                            }
                            className={
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                              (selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5")
                            }
                          >
                            {u.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
                                {u.name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("")}
                              </span>
                            )}
                            {u.name}
                          </button>
                        )
                      })}
                    {facultyPool.filter((u) => u.id !== course?.instructor?.id).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No other faculty in this workspace yet — invite some from{" "}
                        <a className="font-medium text-primary hover:underline" href="/dashboard/faculty">
                          Faculty
                        </a>
                        .
                      </p>
                    )}
                  </div>
                  {coInstructorIds.length > 0 && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      {coInstructorIds.length} co-instructor{coInstructorIds.length === 1 ? "" : "s"} selected.
                      Set the per-module owner inside each module below if you want to split the syllabus.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Curriculum</CardTitle>
                  <CardDescription>
                    {modules.length} module{modules.length === 1 ? "" : "s"} · {totalLessons} lesson{totalLessons === 1 ? "" : "s"} · {totalDuration} min · {previewLessons} free preview
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <CurriculumEditor
                  modules={modules}
                  onChange={setModules}
                  coursePriced={coursePriced}
                  courseId={id}
                  faculty={facultyPool}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Pricing --- */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pricing model</CardTitle>
                <CardDescription>
                  {coursePriced
                    ? "This is a paid course. Lessons marked as free preview are accessible to everyone."
                    : "This course is free. Every lesson is accessible to enrolled students."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[140px_1fr_1fr]">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      {/* Trigger only renders the short value (₹ INR / $ USD);
                          the long label lives inside the dropdown so it doesn't
                          overflow into the adjacent Price input. */}
                      <SelectTrigger>
                        <SelectValue placeholder={currency}>
                          <span className="font-medium">
                            {currencyInfo(currency).symbol} {currency}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code} disabled={c.disabled}>
                            <span className="font-medium">{c.symbol} {c.code}</span>
                            <span className="ml-2 text-muted-foreground">— {c.label}</span>
                            {c.disabled && (
                              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                Coming soon
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price (0 = free)</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {currencyInfo(currency).symbol}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Original (strike-through)</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {currencyInfo(currency).symbol}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        placeholder="Optional"
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Early-bird price</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={earlyBirdPrice}
                      onChange={(e) => setEarlyBirdPrice(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Early-bird ends</Label>
                    <Input
                      type="datetime-local"
                      value={earlyBirdUntil}
                      onChange={(e) => setEarlyBirdUntil(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <CouponsCard coupons={coupons} onChange={setCoupons} />
          </TabsContent>

          {/* --- Access --- */}
          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
                <CardDescription>
                  Draft courses are invisible. Scheduled courses publish automatically at the set time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published" | "archived")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Auto-publish at</Label>
                    <Input
                      type="datetime-local"
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visibility</CardTitle>
                <CardDescription>Who can see this course once it&apos;s published?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      { key: "public", icon: <Globe className="h-4 w-4" />, label: "Public", desc: "Discoverable + open" },
                      { key: "unlisted", icon: <Eye className="h-4 w-4" />, label: "Unlisted", desc: "Only via link" },
                      { key: "password", icon: <Lock className="h-4 w-4" />, label: "Password", desc: "Gated by password" },
                      { key: "private", icon: <Lock className="h-4 w-4" />, label: "Private", desc: "Invite-only" },
                    ] as Array<{ key: CourseVisibility; icon: React.ReactNode; label: string; desc: string }>
                  ).map((v) => {
                    const active = visibility === v.key
                    return (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => setVisibility(v.key)}
                        className={cn(
                          "rounded-md border p-3 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          {v.icon}
                          {v.label}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{v.desc}</p>
                      </button>
                    )
                  })}
                </div>
                {visibility === "password" && (
                  <div className="space-y-2">
                    <Label>Access password</Label>
                    <Input
                      value={accessPassword}
                      onChange={(e) => setAccessPassword(e.target.value)}
                      placeholder="Anyone with this password can view the course"
                    />
                    <p className="text-xs text-muted-foreground">
                      Stored in plain text for the POC — hash this on the server before production.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-2">
                <CardTitle>Certification</CardTitle>
                <CardDescription>Auto-issue a certificate when students complete the course. Optional.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
                  <div className="flex items-start gap-2">
                    <Award className="mt-0.5 h-4 w-4 text-accent" />
                    <div>
                      <p className="text-sm font-medium">Issue a certificate on completion</p>
                      <p className="text-xs text-muted-foreground">
                        {certificateEligible
                          ? `Using ${resolveTemplateLabel(certificateTemplate)}.`
                          : "Students will not receive a certificate when they finish this course."}
                      </p>
                    </div>
                  </div>
                  <Switch checked={certificateEligible} onCheckedChange={setCertificateEligible} />
                </div>

                {certificateEligible && (
                  <CertificateTemplatePicker
                    value={certificateTemplate}
                    onSelect={setCertificateTemplate}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- SEO --- */}
          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>URL</CardTitle>
                <CardDescription>The path students will see in their browser.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center rounded-l-md border border-r-0 border-input bg-muted/50 px-3 text-xs text-muted-foreground">
                      /learn/
                    </div>
                    <Input
                      className="rounded-l-none"
                      value={slug}
                      onChange={(e) => {
                        setSlug(slugify(e.target.value))
                        setSlugDirty(true)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSlug(slugify(title))
                        setSlugDirty(false)
                      }}
                      title="Regenerate from title"
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {slug ? `Preview: /learn/${slug}` : "Will be generated from the title."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Search engine listing — pre-filled from the course's own
                title / description / category / thumbnail so the form is
                never blank. Instructor can edit any field, and the "Reset to
                course defaults" link below puts everything back. */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Search engine listing</CardTitle>
                    <CardDescription>
                      Pre-filled from the course details below. Edit anything you want — clearing a field uses the course default.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetSeoToCourseDefaults}
                    className="shrink-0 text-xs"
                    title="Restore meta title, description, keywords, and OG image from the course's own fields"
                  >
                    <Wand2 className="mr-1 h-3.5 w-3.5" />
                    Reset to course defaults
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="seo-title">Meta title</Label>
                    <span className={cn(
                      "text-[11px]",
                      seoTitle.length > 60 ? "text-destructive" : "text-muted-foreground",
                    )}>
                      {seoTitle.length}/60
                    </span>
                  </div>
                  <Input
                    id="seo-title"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || "Course title"}
                    maxLength={80}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Google truncates around 60 characters. Keep the keyword first.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="seo-description">Meta description</Label>
                    <span className={cn(
                      "text-[11px]",
                      seoDescription.length > 160 ? "text-destructive" : "text-muted-foreground",
                    )}>
                      {seoDescription.length}/160
                    </span>
                  </div>
                  <Textarea
                    id="seo-description"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="One or two sentences that pitch the course to a stranger."
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Google truncates around 160 characters.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo-keywords">Keywords</Label>
                  <Input
                    id="seo-keywords"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="comma, separated, phrases — e.g. JEE physics, NCERT, mock tests"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Lightly weighted by modern search engines but useful for your own analytics and site search.
                  </p>
                </div>

                {/* Live SERP preview — gives the Instructor a feel for what
                    a Google result will look like before they publish. */}
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Google preview
                  </p>
                  <p className="truncate text-xs text-emerald-700">
                    {process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com"}/learn/{slug || "slug"}
                  </p>
                  <p className="mt-0.5 truncate text-base text-[#1a0dab]">
                    {(seoTitle || title || "Course title").slice(0, 60)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {(seoDescription
                      || description.replace(/<[^>]*>/g, "").trim()
                      || "Add a meta description to control what Google shows here."
                    ).slice(0, 160)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Social share card — separate image because the course
                thumbnail (16:9) often doesn't have the right safe area
                for OG (1.91:1). Falls back to the thumbnail if blank,
                and on publish we auto-generate one when both are
                missing so links never ship without a preview. */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Social share image</CardTitle>
                    <CardDescription>
                      Shown on Twitter, LinkedIn, WhatsApp, Slack, etc. We fall back to the cover if blank, and auto-generate one on publish if both are missing.
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {thumbnail && thumbnail !== ogImage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUseCoverAsOg}
                        title="Reuse the course cover as the social-share image."
                      >
                        Use course cover
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateOgImage}
                      disabled={regeneratingOg}
                      title="Generate a fresh share image with your title + brand colours."
                    >
                      {regeneratingOg ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-3.5 w-3.5" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <FileUploadField
                  value={ogImage}
                  onChange={setOgImage}
                  accept="image/png,image/jpeg,image/webp"
                  maxSizeMB={4}
                  urlPlaceholder="https://…/social-card.png"
                  showImagePreview
                  hint="Recommended 1200×630, under 1 MB. Keep text in the centre 60%."
                />
                {!ogImage && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {thumbnail
                      ? "No share image yet — we'll use the course cover automatically when you publish."
                      : "No share image and no course cover — we'll auto-generate one on publish."}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sidebar summary */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <SummaryRow label="Modules" value={`${modules.length}`} />
              <SummaryRow label="Lessons" value={`${totalLessons}`} />
              <SummaryRow label="Total duration" value={`${totalDuration} min`} />
              <SummaryRow label="Free preview" value={`${previewLessons}`} />
              <SummaryRow
                label="Price"
                value={coursePriced ? formatMoney(parseFloat(price), currency) : "Free"}
              />
              <SummaryRow label="Status" value={status} />
              <SummaryRow label="Visibility" value={visibility} />
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Sticky save bar — the editor's source of truth for the
          publish state. Mirrors the header buttons but stays visible
          regardless of scroll position so the Instructor never has to
          hunt for Publish/Discard after a long curriculum edit.
          Renders only when there's something unpublished to act on,
          so a fresh-loaded course doesn't get a permanent footer. */}
      {(hasDraft || dirty) && (
        <>
          {/* Spacer so the fixed bar doesn't cover the bottom of
              the form. Height matches the bar so scrolling to the
              very last field still reveals it. */}
          <div className="h-20" aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.15)]">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span className="font-semibold">Unpublished changes</span>
                <span className="hidden text-muted-foreground sm:inline">
                  · Students still see the last published version
                </span>
                <span className="hidden text-xs text-muted-foreground md:inline">
                  {saving
                    ? "Saving draft…"
                    : dirty
                      ? "Autosave in 2s"
                      : lastSavedAt
                        ? `Draft saved · ${lastSavedAt.toLocaleTimeString()}`
                        : "Draft saved"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={doDiscardDraft}
                  disabled={saving}
                  title="Throw away the pending draft and return to the published version."
                >
                  Discard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  title="Open the public lesson player with the draft applied — see what students will see."
                >
                  <Link
                    href={`/learn/${slug || course.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => void doPublishChanges()}
                  disabled={saving}
                  title="Apply the draft to the live course — students will see these changes."
                >
                  <Globe className="mr-1.5 h-3.5 w-3.5" />
                  Publish changes
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      {/* AI Course Builder Dialog */}
      <AICourseBuilderDialog
        open={aiBuilderOpen}
        onOpenChange={setAiBuilderOpen}
        initialTitle={title}
        onCourseGenerated={(generated) => {
          // Apply AI-generated content to the current course being edited
          if (generated.title) setTitle(generated.title)
          if (generated.subtitle) setSubtitle(generated.subtitle)
          if (generated.description) setDescription(generated.description)
          if (generated.category) setCategory(generated.category)
          if (generated.level) setLevel(generated.level)
          if (generated.language) setLanguage(generated.language)
          if (generated.seoTitle) setSeoTitle(generated.seoTitle)
          if (generated.seoDescription) setSeoDescription(generated.seoDescription)
          if (generated.seoKeywords?.length) setSeoKeywords(generated.seoKeywords.join(", "))
          toast.success("AI content applied! Review the changes across all tabs.")
        }}
      />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  )
}

function CouponsCard({
  coupons,
  onChange,
}: {
  coupons: Coupon[]
  onChange: (next: Coupon[]) => void
}) {
  const [code, setCode] = useState("")
  const [discount, setDiscount] = useState("10")
  const [validUntil, setValidUntil] = useState("")
  const [maxUses, setMaxUses] = useState("")

  const add = () => {
    if (!code.trim()) return
    const c: Coupon = {
      id: generateId("coup"),
      code: code.trim().toUpperCase(),
      discountPercent: Math.min(100, Math.max(0, parseInt(discount) || 0)),
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      uses: 0,
      createdAt: new Date().toISOString(),
    }
    onChange([...coupons, c])
    setCode("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coupons</CardTitle>
        <CardDescription>Time-limited discounts students can apply at checkout.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {coupons.length > 0 && (
          <ul className="space-y-2">
            {coupons.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-md border border-border/60 p-3">
                <code className="rounded bg-muted px-2 py-0.5 text-xs font-bold tracking-wide">{c.code}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Copy code"
                  onClick={() => navigator.clipboard?.writeText(c.code).catch(() => {})}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <span className="text-sm tabular-nums">{c.discountPercent}% off</span>
                <span className="text-xs text-muted-foreground">
                  {c.uses}{c.maxUses ? `/${c.maxUses}` : ""} uses
                  {c.validUntil ? ` · until ${new Date(c.validUntil).toLocaleDateString()}` : ""}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onChange(coupons.filter((x) => x.id !== c.id))}
                  aria-label="Delete coupon"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1.2fr_1fr_auto]">
          <Input
            placeholder="CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono uppercase"
          />
          <Input
            type="number"
            placeholder="% off"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <Input
            type="datetime-local"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max uses"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
          <Button onClick={add} disabled={!code.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
