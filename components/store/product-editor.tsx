"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Key,
  Loader2,
  Package,
  Paperclip,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { slugify } from "@/lib/lesson-utils"
import { uploadAsset } from "@/lib/upload-asset"
import { useOrgSettings } from "@/lib/org-settings"
import { SUPPORTED_CURRENCIES, currencyInfo } from "@/lib/currency"
import { FileUploadField } from "@/components/upload/file-upload-field"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiProductDescription } from "@/lib/ai-client"
import { generateCoverDataUrl, dataUrlToFile } from "@/lib/generate-cover"
import { Wand2, Shuffle } from "lucide-react"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

const PRODUCT_NEW_TOUR: TourStep[] = [
  {
    title: "List a new product",
    body: "Pick a kind (course, download, bundle, membership, session, webinar), set the price, add the delivery details. Save draft until ready to publish.",
    emoji: "🛍️",
    placement: "center",
  },
  {
    target: "[data-tour='product-kind']",
    title: "Pick what you're selling",
    body: "The kind controls what buyers receive — file downloads, course access, recurring memberships, 1:1 sessions, live webinars. Each surfaces its own delivery fields below.",
    emoji: "📦",
    placement: "right",
  },
  {
    target: "[data-tour='product-description'] textarea, [data-tour='product-description']",
    title: "Sales copy",
    body: "Click 'Draft with AI' next to the description to generate a real sales blurb from the name + kind + price — not generic filler.",
    emoji: "✍️",
    placement: "right",
  },
  {
    target: "[data-tour='product-save']",
    title: "Save draft or publish",
    body: "Save draft keeps it private. Publish lists it on your storefront immediately. View live opens the public listing in a new tab.",
    emoji: "🚀",
    placement: "left",
  },
]

const PRODUCT_EDIT_TOUR: TourStep[] = [
  {
    title: "Edit your product",
    body: "Every field stays editable. Edits autosave every couple of seconds; the header shows the last save timestamp.",
    emoji: "✏️",
    placement: "center",
  },
  {
    target: "[data-tour='product-kind']",
    title: "Change the kind",
    body: "Switching kinds preserves your other fields. The delivery section auto-swaps to match the new kind's settings.",
    emoji: "📦",
    placement: "right",
  },
  {
    target: "[data-tour='product-description']",
    title: "Refresh the description",
    body: "Draft with AI regenerates a fresh sales blurb from the current product name + kind + price.",
    emoji: "✨",
    placement: "right",
  },
  {
    target: "[data-tour='product-save']",
    title: "Publish or keep draft",
    body: "Toggle between draft and published any time. Published items show on your storefront; drafts are invisible to buyers.",
    emoji: "🚀",
    placement: "left",
  },
]
import { VideoUrlPreview } from "@/components/upload/video-url-preview"
import { TagsInput } from "@/components/course-editor/tags-input"
import { useLMS, generateId } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { useStorageError } from "@/lib/storage-error"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import {
  formatPrice,
  money,
  useStore,
  type PricingModel,
  type Product,
  type ProductDelivery,
  type ProductFile,
  type ProductKind,
} from "@/lib/store-store"

// ============================================================
// One scrollable page. No tabs. Sections from top to bottom.
// Order matches the teacher's mental model:
//   1. What am I selling?  (Type)
//   2. The basics          (Title + content)
//   3. How much?           (Price)
//   4. Polish              (Sales-page bells & whistles — collapsed by default)
// ============================================================

const KIND_OPTIONS: Array<{
  value: ProductKind
  label: string
  hint: string
  icon: React.ReactNode
}> = [
  { value: "course",     label: "Course access",   hint: "Sell access to a course you've built.",        icon: <BookOpen className="h-4 w-4" /> },
  { value: "download",   label: "Digital download", hint: "PDF, audio, video, ZIP — one or many files.",  icon: <Download className="h-4 w-4" /> },
  { value: "bundle",     label: "Bundle",           hint: "Combine products at a special price.",         icon: <Package className="h-4 w-4" /> },
  { value: "membership", label: "Membership",       hint: "Recurring access to a set of products.",       icon: <Sparkles className="h-4 w-4" /> },
  { value: "session",    label: "1-on-1 session",   hint: "Coaching call with a booking link.",           icon: <CalendarClock className="h-4 w-4" /> },
  { value: "webinar",    label: "Paid webinar",     hint: "Charge for a live class.",                     icon: <Video className="h-4 w-4" /> },
  { value: "license",    label: "License key",      hint: "Templates / software with serial keys.",       icon: <Key className="h-4 w-4" /> },
]

interface ProductEditorProps {
  productId?: string
  /** When set on the /new route, the editor opens with this kind
   *  pre-selected — the quick-start cards on /dashboard/store
   *  deep-link with ?kind= so beginners skip the picker. Ignored
   *  on edit (we always trust the saved product). */
  initialKind?: ProductKind
}

export function ProductEditor({ productId, initialKind }: ProductEditorProps) {
  const { hydrated } = useStore()
  // Gate the form behind hydration. The state below derives its
  // initial values from `existing` via useState(...); if we mount
  // before the StoreProvider has finished reading localStorage,
  // `existing` is undefined for the first render and every field
  // captures "". The user later presses Save and we overwrite the
  // real product with blanks. We avoid that entirely by waiting
  // until hydrated before mounting the form.
  if (productId && !hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading product…
      </div>
    )
  }
  return <ProductEditorForm productId={productId} initialKind={initialKind} />
}

function ProductEditorForm({ productId, initialKind }: ProductEditorProps) {
  const router = useRouter()
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    isSlugAvailable,
  } = useStore()
  const { courses } = useLMS()
  // Store now lives inside the tenant portal only — build a
  // workspace-prefixed "view live" URL when we know the slug;
  // fall back to the legacy /store path (which redirects to the
  // tenant store) otherwise.
  const { currentTenant } = useTenant()
  const confirm = useConfirm()

  const existing = productId ? products.find(p => p.id === productId) : undefined
  const isNew = !existing

  // ---- form state ----
  // Edit always trusts the saved product. New trusts ?kind= when the
  // caller passed one (quick-start cards); otherwise we default to
  // "download" because it's the lowest-friction first product
  // (upload a file, set a price, done — no course-builder dependency).
  const [kind, setKind] = useState<ProductKind>(existing?.kind ?? initialKind ?? "download")
  const [title, setTitle] = useState(existing?.title ?? "")
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? "")
  const [slug, setSlug] = useState(existing?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(!!existing)
  const [description, setDescription] = useState(existing?.description ?? "")
  const [coverImageUrl, setCoverImageUrl] = useState(existing?.coverImageUrl ?? "")
  const [previewVideoUrl, setPreviewVideoUrl] = useState(existing?.previewVideoUrl ?? "")
  const [features, setFeatures] = useState<string[]>(existing?.features ?? [])
  const [outcomes, setOutcomes] = useState<string[]>(existing?.outcomes ?? [])
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [refundPolicy, setRefundPolicy] = useState(existing?.refundPolicy ?? "")
  const [inventoryLimit, setInventoryLimit] = useState(existing?.inventoryLimit?.toString() ?? "")
  const [status, setStatus] = useState<"draft" | "published" | "archived">(existing?.status ?? "draft")

  // Pricing — single form with the type as a radio.
  type PricingType = PricingModel["type"]
  const [pricingType, setPricingType] = useState<PricingType>(existing?.pricing.type ?? "one-time")
  const [amount, setAmount] = useState(
    existing?.pricing.type === "one-time" || existing?.pricing.type === "subscription"
      ? String(existing.pricing.amount)
      : existing?.pricing.type === "pay-what-you-want"
        ? String(existing.pricing.minAmount)
        : "29",
  )
  const { settings: orgSettings } = useOrgSettings()
  const [currency, setCurrency] = useState(
    existing && existing.pricing.type !== "free"
      ? existing.pricing.currency
      : (orgSettings.defaultCurrency ?? "USD"),
  )
  const [comparePrice, setComparePrice] = useState(
    existing?.pricing.type === "one-time" && existing.pricing.comparePrice
      ? String(existing.pricing.comparePrice) : "",
  )
  const [intervalDays, setIntervalDays] = useState<30 | 90 | 180 | 365>(
    existing?.pricing.type === "subscription" ? existing.pricing.intervalDays : 30,
  )
  const [trialDays, setTrialDays] = useState(
    existing?.pricing.type === "subscription" && existing.pricing.trialDays ? String(existing.pricing.trialDays) : "",
  )
  const [pwywSuggested, setPwywSuggested] = useState(
    existing?.pricing.type === "pay-what-you-want" && existing.pricing.suggestedAmount
      ? String(existing.pricing.suggestedAmount) : "",
  )

  // Delivery — separate state per kind so toggling kind doesn't drop work.
  const [courseId, setCourseId] = useState(existing?.delivery.kind === "course-access" ? existing.delivery.courseId : "")
  const [files, setFiles] = useState<ProductFile[]>(existing?.delivery.kind === "file-download" ? existing.delivery.files : [])
  const [childProductIds, setChildProductIds] = useState<string[]>(existing?.delivery.kind === "bundle" ? existing.delivery.childProductIds : [])
  const [includedProductIds, setIncludedProductIds] = useState<string[]>(existing?.delivery.kind === "membership" ? existing.delivery.includedProductIds : [])
  const [sessionMinutes, setSessionMinutes] = useState(existing?.delivery.kind === "session" ? String(existing.delivery.durationMinutes) : "30")
  const [bookingUrl, setBookingUrl] = useState(existing?.delivery.kind === "session" ? existing.delivery.bookingUrl ?? "" : "")
  const [webinarMeetingUrl, setWebinarMeetingUrl] = useState(existing?.delivery.kind === "webinar" ? existing.delivery.meetingUrl ?? "" : "")
  const [webinarScheduledAt, setWebinarScheduledAt] = useState(existing?.delivery.kind === "webinar" ? existing.delivery.scheduledAt?.slice(0, 16) ?? "" : "")
  const [licenseKeyPool, setLicenseKeyPool] = useState<string[]>(existing?.delivery.kind === "license" ? existing.delivery.keyPool ?? [] : [])
  const [licenseTemplate, setLicenseTemplate] = useState(existing?.delivery.kind === "license" ? existing.delivery.keyTemplate ?? "TBC-XXXX-XXXX-XXXX" : "TBC-XXXX-XXXX-XXXX")

  // UX state
  const [showPolish, setShowPolish] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  // Cover-image generator state. variantSeed cycles when the user
  // clicks "Shuffle" — the cover lib hashes it to pick a palette, so
  // re-clicking with the same product produces predictable but
  // distinct variants. Buster forces a re-render of the cover preview
  // when the data URL is the same length as before but different.
  const [generatingCover, setGeneratingCover] = useState(false)
  const [coverSeed, setCoverSeed] = useState(0)
  // Bubble up storage warnings. We distinguish two cases:
  //   • recovered=true → save SUCCEEDED but we had to drop the cover
  //     image / preview video because they were too large for browser
  //     storage. Soft amber warning; the rest of the product (title,
  //     description, pricing, license keys, etc) is on disk.
  //   • recovered=false → save FAILED outright. Destructive red banner.
  // Either way, only show the warning for errors that happened during
  // OR after the most recent save attempt — old errors from a prior
  // session shouldn't haunt this one.
  const storageErr = useStorageError("store.products")
  const [saveStartedAt, setSaveStartedAt] = useState(0)
  const relevantErr = storageErr && storageErr.at >= saveStartedAt ? storageErr : null
  const persistWarning = relevantErr?.recovered
    ? "Saved — but the cover image or preview video was too large for browser storage and wasn't kept. Re-upload a smaller file (or wait for backend image hosting)."
    : null
  const persistError = relevantErr && !relevantErr.recovered
    ? relevantErr.quotaExceeded
      ? "Your changes didn't persist — too much data for browser storage."
      : "Your changes didn't persist. Browser storage rejected the write."
    : null
  const [dirty, setDirty] = useState(false)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setDirty(true)
  }, [kind, title, subtitle, slug, description, coverImageUrl, previewVideoUrl, features, outcomes, tags, refundPolicy, inventoryLimit, status, pricingType, amount, currency, comparePrice, intervalDays, trialDays, pwywSuggested, courseId, files, childProductIds, includedProductIds, sessionMinutes, bookingUrl, webinarMeetingUrl, webinarScheduledAt, licenseKeyPool, licenseTemplate])

  // Auto-slug from title
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title))
  }, [title, slugTouched])

  const slugError = useMemo(() => {
    if (!slug) return null
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) return "Lowercase letters, numbers, hyphens only."
    if (!isSlugAvailable(slug, existing?.id)) return "Already taken — pick another."
    return null
  }, [slug, isSlugAvailable, existing?.id])

  // Build typed pricing + delivery from form state.
  const pricing: PricingModel = useMemo(() => {
    if (pricingType === "free") return { type: "free" }
    if (pricingType === "subscription") return {
      type: "subscription", amount: parseFloat(amount) || 0, currency, intervalDays,
      trialDays: trialDays ? parseInt(trialDays) : undefined,
    }
    if (pricingType === "pay-what-you-want") return {
      type: "pay-what-you-want", minAmount: parseFloat(amount) || 0,
      suggestedAmount: pwywSuggested ? parseFloat(pwywSuggested) : undefined, currency,
    }
    return {
      type: "one-time", amount: parseFloat(amount) || 0, currency,
      comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
    }
  }, [pricingType, amount, currency, comparePrice, intervalDays, trialDays, pwywSuggested])

  const delivery: ProductDelivery = useMemo(() => {
    switch (kind) {
      case "course":     return { kind: "course-access", courseId }
      case "download":   return { kind: "file-download", files }
      case "bundle":     return { kind: "bundle", childProductIds }
      case "membership": return { kind: "membership", includedProductIds }
      case "session":    return { kind: "session", durationMinutes: parseInt(sessionMinutes) || 30, bookingUrl: bookingUrl || undefined }
      case "webinar":    return { kind: "webinar", meetingUrl: webinarMeetingUrl || undefined, scheduledAt: webinarScheduledAt ? new Date(webinarScheduledAt).toISOString() : undefined }
      case "license":    return { kind: "license", keyPool: licenseKeyPool, keyTemplate: licenseTemplate }
    }
  }, [kind, courseId, files, childProductIds, includedProductIds, sessionMinutes, bookingUrl, webinarMeetingUrl, webinarScheduledAt, licenseKeyPool, licenseTemplate])

  const missing: string[] = []
  if (!title.trim()) missing.push("title")
  if (!slug || slugError) missing.push("URL")
  if (!deliveryValid(kind, delivery)) missing.push(deliveryFieldName(kind))

  const canSubmit = missing.length === 0

  const handleSave = async (publish?: boolean) => {
    if (!canSubmit) return
    // Mark when this save started so persistWarning/persistError can
    // ignore stale errors from previous attempts.
    setSaveStartedAt(Date.now())
    setSaving(true)
    // Yield one frame so React commits saving=true and the button
    // shows its spinner before we run the (still mostly synchronous)
    // write. Without this the loader never paints on a fast machine.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const finalStatus = publish ? "published" : status
    const now = new Date().toISOString()
    if (existing) {
      updateProduct(existing.id, {
        kind, title, subtitle, slug, description,
        coverImageUrl: coverImageUrl || undefined,
        previewVideoUrl: previewVideoUrl || undefined,
        pricing, delivery,
        features: features.length > 0 ? features : undefined,
        outcomes: outcomes.length > 0 ? outcomes : undefined,
        tags: tags.length > 0 ? tags : undefined,
        refundPolicy: refundPolicy || undefined,
        inventoryLimit: inventoryLimit ? parseInt(inventoryLimit) : undefined,
        status: finalStatus,
        publishedAt: finalStatus === "published" ? (existing.publishedAt ?? now) : existing.publishedAt,
      })
      setLastSavedAt(new Date())
      setDirty(false)
      setSaving(false)
    } else {
      const product: Product = {
        id: generateId("prod"),
        kind, title, subtitle, slug, description,
        coverImageUrl: coverImageUrl || undefined,
        previewVideoUrl: previewVideoUrl || undefined,
        pricing, delivery,
        features: features.length > 0 ? features : undefined,
        outcomes: outcomes.length > 0 ? outcomes : undefined,
        tags: tags.length > 0 ? tags : undefined,
        refundPolicy: refundPolicy || undefined,
        inventoryLimit: inventoryLimit ? parseInt(inventoryLimit) : undefined,
        status: finalStatus,
        publishedAt: finalStatus === "published" ? now : undefined,
        inventorySold: 0,
        createdAt: now,
        updatedAt: now,
      }
      addProduct(product)
      setSaving(false)
      router.push(`/dashboard/store/${product.id}`)
    }
  }

  // Duplicate the current product into a fresh draft. We deep-copy
  // every editable field but reset the storefront-visible bits that
  // shouldn't carry over: status → draft, sales counters → zero,
  // publishedAt → null, slug → "<slug>-copy" (so the link doesn't
  // collide with the original). The user lands in the new editor
  // immediately so they can tweak before publishing.
  const handleDuplicate = async () => {
    if (!existing) return
    const baseSlug = existing.slug ? `${existing.slug}-copy` : ""
    // Bump the suffix (-copy, -copy-2, -copy-3, ...) until we hit an
    // unused slug. Cheap loop — collisions are rare and bounded by
    // the product count.
    let candidate = baseSlug
    let n = 2
    while (candidate && !isSlugAvailable(candidate)) {
      candidate = `${existing.slug}-copy-${n}`
      n++
    }
    const now = new Date().toISOString()
    const copy: Product = {
      ...existing,
      id: generateId("prod"),
      title: `${existing.title} (copy)`,
      slug: candidate,
      status: "draft",
      publishedAt: undefined,
      inventorySold: 0,
      createdAt: now,
      updatedAt: now,
    }
    addProduct(copy)
    toast.success("Duplicated.", { description: `Editing "${copy.title}" — it's a draft.` })
    router.push(`/dashboard/store/${copy.id}`)
  }

  const handleDelete = async () => {
    if (!existing) return
    const ok = await confirm({
      title: `Delete "${existing.title}"?`,
      description: "Moved to Trash — you can restore it within 7 days. Orders and entitlements stay in your records either way.",
      destructive: true,
    })
    if (!ok) return
    deleteProduct(existing.id)
    toast.success("Product deleted.", { description: "Restore from Trash within 7 days." })
    router.push("/dashboard/store")
  }

  const selectedMeta = KIND_OPTIONS.find(o => o.value === kind)!

  // One-click branded cover. Renders a 1200×630 canvas, encodes as
  // PNG, uploads to the asset CDN, and sets the URL on the product.
  // Skipping the upload step (data: URL straight in state) would
  // blow up localStorage on the next save — so we eat the upload
  // latency now (1–2s) in exchange for a permanent CDN URL the
  // public storefront can serve. Title is mandatory; we don't try
  // to invent a placeholder.
  async function handleGenerateCover(shuffle?: boolean) {
    if (!title.trim()) {
      toast.error("Add a product title first — that's the headline on the cover.")
      return
    }
    if (shuffle) setCoverSeed((s) => s + 1)
    setGeneratingCover(true)
    try {
      const dataUrl = await generateCoverDataUrl({
        title,
        kind,
        workspaceName: currentTenant?.name,
        priceLabel: pricing.type !== "free" ? formatPrice(pricing) : undefined,
        variantSeed: shuffle ? `${title}-${coverSeed + 1}` : undefined,
      })
      const file = dataUrlToFile(dataUrl, `cover-${slug || "product"}.png`)
      const uploaded = await uploadAsset(file, "storefront")
      setCoverImageUrl(uploaded.url)
      toast.success(shuffle ? "Shuffled — new palette." : "Cover generated.", {
        description: "Click Shuffle to try another palette.",
      })
    } catch (err) {
      console.error(err)
      toast.error("Couldn't generate cover. Try uploading one instead.")
    } finally {
      setGeneratingCover(false)
    }
  }

  return (
    <div className="space-y-6">
      <ProductTour
        tourId={isNew ? "product-new-v1" : "product-edit-v1"}
        steps={isNew ? PRODUCT_NEW_TOUR : PRODUCT_EDIT_TOUR}
      />
      {/* Sticky header — Save draft / Publish always visible while scrolling */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-2 border-b border-border bg-background/95 px-6 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/store"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight">
                {isNew ? "New product" : title || "Untitled"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {saving ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
                  : persistError ? <span className="text-destructive">{persistError}</span>
                  : persistWarning ? <span className="text-amber-600">{persistWarning}</span>
                  : dirty ? "Unsaved changes"
                  : lastSavedAt ? `Saved · ${lastSavedAt.toLocaleTimeString()}`
                  : isNew ? "Drafting" : "Up to date"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {existing?.status === "published" && (
              <Button variant="outline" asChild>
                <Link
                  href={
                    currentTenant?.slug
                      ? `/p/${currentTenant.slug}/store/${existing.slug}`
                      : `/store/${existing.slug}`
                  }
                  target="_blank"
                >
                  <Eye className="mr-2 h-4 w-4" /> View live
                </Link>
              </Button>
            )}
            {!isNew && (
              <Button variant="ghost" onClick={handleDuplicate} title="Create a draft copy of this product">
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </Button>
            )}
            {!isNew && (
              <Button variant="ghost" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}
            <TakeATourButton tourId={isNew ? "product-new-v1" : "product-edit-v1"} />
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={!canSubmit || saving}
              data-tour="product-save"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={!canSubmit || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              {saving ? "Saving…" : existing?.status === "published" ? "Update" : "Publish"}
            </Button>
          </div>
        </div>

        {/* Missing-fields nudge so it's obvious what's blocking publish */}
        {missing.length > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
            <AlertTriangle className="h-3 w-3" />
            Add {missing.join(", ")} to publish.
          </div>
        )}
      </div>

      <div className="space-y-5 max-w-3xl">
        {/* ───── 1. Type ───── */}
        <Section number="1" title="What are you selling?" hint={selectedMeta.hint}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-tour="product-kind">
            {KIND_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKind(opt.value)}
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-left transition-colors",
                  kind === opt.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <div className="mt-0.5 text-primary">{opt.icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.hint}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* ───── 2. Basics ───── */}
        <Section number="2" title="Basics" hint="The least you need to publish.">
          <div className="space-y-4">
            <Field label="Title" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "React Fundamentals — the 4-hour crash course"'
                autoFocus
              />
            </Field>
            <Field label="One-line subtitle (optional)">
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="The sentence that earns the click."
              />
            </Field>
            <Field label="Description (optional)" hint="What is it, who's it for, what they'll walk away with.">
              <div data-tour="product-description" />
              <div className="mb-2 flex justify-end">
                {/* AI drafter — uses the product name + kind +
                    price as context so the copy reads as a real
                    sales blurb, not generic filler. Disabled until
                    the product has a name. */}
                <AIGenerateButton
                  size="xs"
                  label="Draft with AI"
                  disabled={!title.trim()}
                  onGenerate={async () => {
                    const priceNumber = Number(amount)
                    const r = await aiProductDescription({
                      name: title,
                      kind,
                      priceInr: Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : undefined,
                    })
                    if ("error" in r) {
                      toast.error(`Couldn't draft: ${r.error}`)
                      return
                    }
                    setDescription(r.content)
                    toast.success("Drafted — edit as needed.")
                  }}
                />
              </div>
              {/* WYSIWYG — buyers see formatted product copy with
                  bullets, links, embedded video. Same Tiptap editor
                  used for course descriptions. */}
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="What is it, who's it for, what they'll walk away with."
                minHeight={180}
              />
            </Field>

            {/* Per-kind delivery — appears inline, in context */}
            <div className="rounded-md border border-border/60 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {selectedMeta.icon}
                <span className="font-semibold">{selectedMeta.label}</span>
                <span className="text-xs text-muted-foreground">— what buyers get</span>
              </div>
              <DeliveryFields
                kind={kind}
                courses={courses}
                courseId={courseId} setCourseId={setCourseId}
                files={files} setFiles={setFiles}
                childProductIds={childProductIds} setChildProductIds={setChildProductIds}
                includedProductIds={includedProductIds} setIncludedProductIds={setIncludedProductIds}
                sessionMinutes={sessionMinutes} setSessionMinutes={setSessionMinutes}
                bookingUrl={bookingUrl} setBookingUrl={setBookingUrl}
                webinarMeetingUrl={webinarMeetingUrl} setWebinarMeetingUrl={setWebinarMeetingUrl}
                webinarScheduledAt={webinarScheduledAt} setWebinarScheduledAt={setWebinarScheduledAt}
                licenseKeyPool={licenseKeyPool} setLicenseKeyPool={setLicenseKeyPool}
                licenseTemplate={licenseTemplate} setLicenseTemplate={setLicenseTemplate}
                excludeProductId={existing?.id}
              />
            </div>
          </div>
        </Section>

        {/* ───── 3. Price ───── */}
        <Section number="3" title="Price" hint="Free, one-time, or recurring.">
          <PricingFields
            pricingType={pricingType} setPricingType={setPricingType}
            amount={amount} setAmount={setAmount}
            currency={currency} setCurrency={setCurrency}
            comparePrice={comparePrice} setComparePrice={setComparePrice}
            intervalDays={intervalDays} setIntervalDays={setIntervalDays}
            trialDays={trialDays} setTrialDays={setTrialDays}
            pwywSuggested={pwywSuggested} setPwywSuggested={setPwywSuggested}
          />
          <div className="mt-3 rounded-md border border-border/60 bg-muted/30 p-2.5 text-center">
            <p className="text-xs text-muted-foreground">Buyers will see</p>
            <p className="mt-0.5 text-lg font-semibold">{formatPrice(pricing)}</p>
            {pricingType === "one-time" && comparePrice && parseFloat(comparePrice) > parseFloat(amount) && (
              <p className="text-xs text-muted-foreground">
                Was <span className="line-through">{money(parseFloat(comparePrice), currency)}</span>
              </p>
            )}
            {/* Auto-computed bundle / membership savings. For a
                bundle we sum the child products' prices; for a
                membership we sum the included products' annual-
                equivalent prices. When the buyer is paying less
                than the standalone total, we surface the savings in
                two formats — % off and absolute amount — because
                conversion testing consistently favours showing both.
                Renders inline so the teacher sees the savings
                update as they pick the right children. */}
            <BundleSavingsHint
              kind={kind}
              pricing={pricing}
              childProductIds={kind === "bundle" ? childProductIds : kind === "membership" ? includedProductIds : []}
            />
          </div>
        </Section>

        {/* ───── 4. Polish (collapsed by default) ───── */}
        <Section
          number="4"
          title="Polish your sales page"
          hint="Optional. Skip these and you can publish right now."
          collapsible
          open={showPolish}
          onToggle={() => setShowPolish(v => !v)}
        >
          <div className="space-y-4">
            <Field label="Cover image (1200×630 works best)">
              {/* One-click "Generate cover" — renders a branded
                  1200×630 PNG from the title + kind + price + tenant
                  name, uploads to CDN, and sets the URL. Shuffle
                  cycles the palette seed for users who want a
                  different look without re-typing anything.
                  Sits above ThumbnailField so it's the first thing
                  teachers without a designer reach for. */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateCover(false)}
                  disabled={generatingCover || !title.trim()}
                  title={!title.trim() ? "Add a title first" : "Generate a branded cover from your title + kind + price"}
                >
                  {generatingCover ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {generatingCover ? "Generating…" : "Generate cover"}
                </Button>
                {coverImageUrl && !generatingCover && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleGenerateCover(true)}
                    disabled={generatingCover}
                    title="New palette, same title"
                  >
                    <Shuffle className="mr-1.5 h-3.5 w-3.5" />
                    Shuffle palette
                  </Button>
                )}
                <span className="text-[11px] text-muted-foreground">
                  Or upload / pick from Unsplash below.
                </span>
              </div>
              <ThumbnailField
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                defaultTitle={title}
                compress={{ maxDim: 1600, quality: 0.82, mime: "image/jpeg" }}
              />
            </Field>
            <Field label="Preview video (60-90s teaser)">
              {/* Two ways in: paste a URL (YouTube / Vimeo / Loom / MP4
                  — all detected by VideoUrlPreview below) or upload a
                  file straight from disk. The preview renders the
                  right player either way so the teacher can confirm
                  before publishing. */}
              <FileUploadField
                value={previewVideoUrl}
                onChange={setPreviewVideoUrl}
                accept="video/mp4,video/webm,video/quicktime"
                maxSizeMB={200}
                urlPlaceholder="YouTube / Vimeo / Loom / MP4 URL — or upload below"
              />
              {previewVideoUrl && (
                <div className="mt-2 overflow-hidden rounded-md border border-border">
                  <VideoUrlPreview url={previewVideoUrl} />
                </div>
              )}
            </Field>
            <Field label='What they’ll get out of it'>
              <ListEditor items={outcomes} onChange={setOutcomes} placeholder="Build a production-ready REST API" />
            </Field>
            <Field label="What's included">
              <ListEditor items={features} onChange={setFeatures} placeholder="8 hours of HD video" />
            </Field>
            <Field label="Tags">
              <TagsInput value={tags} onChange={setTags} />
            </Field>
            <Field label="URL slug" hint="The link visitors will see.">
              <div className="flex items-stretch overflow-hidden rounded-md border border-input">
                <span className="flex items-center bg-muted/60 px-3 text-xs text-muted-foreground">/store/</span>
                <input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true) }}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-mono outline-none"
                />
              </div>
              {slugError && <p className="mt-1 text-xs text-destructive inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {slugError}</p>}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Inventory limit (optional)">
                <Input type="number" min={1} value={inventoryLimit} onChange={(e) => setInventoryLimit(e.target.value)} placeholder="Unlimited" />
              </Field>
              <Field label="Refund policy">
                <Input value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)} placeholder="14-day money-back guarantee" />
              </Field>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}

// ============================================================
// Section primitive — numbered, optionally collapsible.
// ============================================================
function Section({
  number, title, hint, children, collapsible, open, onToggle,
}: {
  number: string
  title: string
  hint?: string
  children: React.ReactNode
  collapsible?: boolean
  open?: boolean
  onToggle?: () => void
}) {
  const isOpen = !collapsible || open
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 sm:p-6">
        <div className={cn("flex items-start gap-3", collapsible && "cursor-pointer")} onClick={collapsible ? onToggle : undefined}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {number}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {collapsible && (
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          )}
        </div>
        {isOpen && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  )
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ============================================================
// Delivery — per-kind inline form
// ============================================================
type LMSCourse = ReturnType<typeof useLMS>["courses"][number]

function DeliveryFields(props: {
  kind: ProductKind
  courses: LMSCourse[]
  courseId: string; setCourseId: (v: string) => void
  files: ProductFile[]; setFiles: (f: ProductFile[]) => void
  childProductIds: string[]; setChildProductIds: (ids: string[]) => void
  includedProductIds: string[]; setIncludedProductIds: (ids: string[]) => void
  sessionMinutes: string; setSessionMinutes: (v: string) => void
  bookingUrl: string; setBookingUrl: (v: string) => void
  webinarMeetingUrl: string; setWebinarMeetingUrl: (v: string) => void
  webinarScheduledAt: string; setWebinarScheduledAt: (v: string) => void
  licenseKeyPool: string[]; setLicenseKeyPool: (k: string[]) => void
  licenseTemplate: string; setLicenseTemplate: (t: string) => void
  excludeProductId?: string
}) {
  const {
    kind, courses,
    courseId, setCourseId,
    files, setFiles,
    childProductIds, setChildProductIds,
    includedProductIds, setIncludedProductIds,
    sessionMinutes, setSessionMinutes,
    bookingUrl, setBookingUrl,
    webinarMeetingUrl, setWebinarMeetingUrl,
    webinarScheduledAt, setWebinarScheduledAt,
    licenseKeyPool, setLicenseKeyPool,
    licenseTemplate, setLicenseTemplate,
    excludeProductId,
  } = props

  if (kind === "course") {
    return (
      <Field label="Which course?" required>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger><SelectValue placeholder="Pick a course" /></SelectTrigger>
          <SelectContent>
            {courses.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No courses yet — <Link href="/dashboard/courses/new" className="underline">create one</Link> first.
              </div>
            ) : courses.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    )
  }
  if (kind === "download") return <FilesPanel files={files} onChange={setFiles} />
  if (kind === "bundle") {
    return <ProductMultiPicker label="Products in this bundle" required pickedIds={childProductIds} onChange={setChildProductIds} excludeId={excludeProductId} />
  }
  if (kind === "membership") {
    return <ProductMultiPicker label="What's included with the membership" required pickedIds={includedProductIds} onChange={setIncludedProductIds} excludeId={excludeProductId} />
  }
  if (kind === "session") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Duration (minutes)" required>
          <Input type="number" min={15} step={15} value={sessionMinutes} onChange={(e) => setSessionMinutes(e.target.value)} />
        </Field>
        <Field label="Booking link" hint="Calendly / Cal.com / SavvyCal — the buyer lands here after paying.">
          <Input value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://calendly.com/you/30min" />
        </Field>
      </div>
    )
  }
  if (kind === "webinar") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="When">
          <Input type="datetime-local" value={webinarScheduledAt} onChange={(e) => setWebinarScheduledAt(e.target.value)} />
        </Field>
        <Field label="Meeting URL">
          <Input value={webinarMeetingUrl} onChange={(e) => setWebinarMeetingUrl(e.target.value)} placeholder="Meet / Zoom / Teams link" />
        </Field>
      </div>
    )
  }
  // license
  return <LicensePanel keyPool={licenseKeyPool} onPoolChange={setLicenseKeyPool} template={licenseTemplate} onTemplateChange={setLicenseTemplate} />
}

// ============================================================
// Pricing fields
// ============================================================
function PricingFields(props: {
  pricingType: PricingModel["type"]; setPricingType: (t: PricingModel["type"]) => void
  amount: string; setAmount: (v: string) => void
  currency: string; setCurrency: (v: string) => void
  comparePrice: string; setComparePrice: (v: string) => void
  intervalDays: 30 | 90 | 180 | 365; setIntervalDays: (v: 30 | 90 | 180 | 365) => void
  trialDays: string; setTrialDays: (v: string) => void
  pwywSuggested: string; setPwywSuggested: (v: string) => void
}) {
  const {
    pricingType, setPricingType,
    amount, setAmount,
    currency, setCurrency,
    comparePrice, setComparePrice,
    intervalDays, setIntervalDays,
    trialDays, setTrialDays,
    pwywSuggested, setPwywSuggested,
  } = props
  // PWYW removed per product decision — teachers found it confusing
  // and the free + tip jar pattern is rarely what they actually want.
  // Existing PWYW products keep their pricing but the editor falls
  // back to the closest-equivalent picker ("free") on render so the
  // form stays usable.
  const renderType = pricingType === "pay-what-you-want" ? "free" : pricingType
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(["free", "one-time", "subscription"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setPricingType(t)}
            className={cn(
              "rounded-md border p-2 text-xs capitalize transition-colors",
              renderType === t
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:bg-muted/40",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {renderType !== "free" && (
        <div className="grid gap-3 sm:grid-cols-[120px_1fr_1fr]">
          <Field label="Currency">
            <Select value={currency} onValueChange={setCurrency}>
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
          </Field>
          <Field label="Amount" required>
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          {renderType === "one-time" && (
            <Field label="Strike-through 'was'">
              <Input type="number" min={0} step="0.01" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="Optional" />
            </Field>
          )}
          {renderType === "subscription" && (
            <Field label="Billing interval">
              <Select value={String(intervalDays)} onValueChange={(v) => setIntervalDays(parseInt(v) as 30 | 90 | 180 | 365)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Monthly</SelectItem>
                  <SelectItem value="90">Quarterly</SelectItem>
                  <SelectItem value="180">Every 6 months</SelectItem>
                  <SelectItem value="365">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
      )}

      {pricingType === "subscription" && (
        <Field label="Trial days (optional)">
          <Input type="number" min={0} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} placeholder="e.g. 7" className="max-w-[120px]" />
        </Field>
      )}
    </div>
  )
}

// ============================================================
// Sub-editors (mostly unchanged from before)
// ============================================================

function FilesPanel({ files, onChange }: { files: ProductFile[]; onChange: (f: ProductFile[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadAsset(file, "storefront")
      onChange([...files, { id: generateId("file"), filename: file.name, url: result.url, sizeBytes: file.size, mime: file.type }])
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }
  const remove = (id: string) => onChange(files.filter(f => f.id !== id))
  const update = (id: string, patch: Partial<ProductFile>) =>
    onChange(files.map(f => f.id === id ? { ...f, ...patch } : f))

  return (
    <div className="space-y-2">
      <Label>Files delivered on purchase <span className="text-destructive">*</span></Label>
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map(f => (
            <li key={f.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <Input value={f.filename} onChange={(e) => update(f.id, { filename: e.target.value })} className="h-7 max-w-[200px] text-xs" />
              <span className="flex-1 truncate font-mono text-[11px] text-muted-foreground">{f.url}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(f.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
        {uploading ? "Uploading…" : "Upload a file"}
      </Button>
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => void handleUpload(e.target.files?.[0])} />
    </div>
  )
}

function ProductMultiPicker({
  label, required, pickedIds, onChange, excludeId,
}: {
  label: string
  required?: boolean
  pickedIds: string[]
  onChange: (ids: string[]) => void
  excludeId?: string
}) {
  const { products } = useStore()
  const eligible = products.filter(p => p.id !== excludeId && p.kind !== "bundle" && p.kind !== "membership")

  const toggle = (id: string) =>
    onChange(pickedIds.includes(id) ? pickedIds.filter(i => i !== id) : [...pickedIds, id])

  return (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      {eligible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You need at least one published product to bundle. Create one first.
        </p>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {eligible.map(p => {
            const picked = pickedIds.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-2 text-left text-sm",
                  picked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <CheckCircle2 className={cn("h-4 w-4 shrink-0", picked ? "text-primary" : "text-muted-foreground/30")} />
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                <span className="text-xs text-muted-foreground capitalize">{p.kind}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LicensePanel({
  keyPool, onPoolChange, template, onTemplateChange,
}: {
  keyPool: string[]
  onPoolChange: (k: string[]) => void
  template: string
  onTemplateChange: (t: string) => void
}) {
  // Local string state so the user can type empty lines / mid-edit
  // garbage without us aggressively trimming. We propagate the parsed
  // array UP on every change (was: on blur only — that lost keys when
  // the user pressed Update without leaving the textarea first).
  const [poolText, setPoolText] = useState(keyPool.join("\n"))
  // Re-sync from parent only when the parent's pool actually differs
  // from what we'd produce, so external resets (e.g. switching to a
  // different product) reach us without clobbering the user's draft.
  useEffect(() => {
    const ours = poolText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    const same = ours.length === keyPool.length && ours.every((k, i) => k === keyPool[i])
    if (!same) setPoolText(keyPool.join("\n"))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyPool])

  return (
    <div className="space-y-3">
      <Field label="Key template" hint="Each X becomes a random alphanumeric. Used when the pool is empty.">
        <Input value={template} onChange={(e) => onTemplateChange(e.target.value.toUpperCase())} className="font-mono" />
      </Field>
      <Field label="Key pool (optional, one per line)" hint={`${keyPool.length} key(s) ready · consumed in order on purchase.`}>
        <Textarea
          value={poolText}
          onChange={(e) => {
            const v = e.target.value
            setPoolText(v)
            onPoolChange(v.split(/\r?\n/).map(s => s.trim()).filter(Boolean))
          }}
          rows={4}
          className="font-mono text-xs"
          placeholder={"PROXX-A1B2-C3D4-E5F6\nPROXX-G7H8-J9K0-LMNP"}
        />
      </Field>
    </div>
  )
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...items, v])
    setDraft("")
  }
  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <Input
                value={it}
                onChange={(e) => onChange(items.map((x, i) => i === idx ? e.target.value : x))}
                className="h-7 flex-1 text-xs"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onChange(items.filter((_, i) => i !== idx))}>
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// Live "Save $X (Y% off)" callout for bundles + memberships.
// Compares the bundle's own price to the sum of its children's
// stand-alone one-time prices. Skipped when:
//   • kind isn't bundle / membership
//   • bundle is free or pricing type is non-numeric (PWYW)
//   • no children selected yet (nothing to compare against)
//   • children use mixed currencies (we don't fake FX here — too
//     easy to mislead the buyer)
function BundleSavingsHint({
  kind,
  pricing,
  childProductIds,
}: {
  kind: ProductKind
  pricing: PricingModel
  childProductIds: string[]
}) {
  const { products } = useStore()
  if (kind !== "bundle" && kind !== "membership") return null
  if (pricing.type === "free" || pricing.type === "pay-what-you-want") return null
  if (childProductIds.length === 0) return null

  const children = childProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p)

  // Only count children with a concrete one-time price (those have an
  // unambiguous standalone total). Subscriptions + free children are
  // skipped so the math reflects what the buyer would actually pay
  // buying them separately as one-shots.
  const priced = children
    .map((c) => (c.pricing.type === "one-time" ? c.pricing : null))
    .filter((p): p is Extract<PricingModel, { type: "one-time" }> => !!p)
  if (priced.length < Math.max(2, children.length)) return null

  const ccy = priced[0].currency
  if (priced.some((p) => p.currency !== ccy)) return null  // mixed currencies — bail

  const standalone = priced.reduce((acc, p) => acc + p.amount, 0)
  const bundlePrice =
    pricing.type === "one-time" ? pricing.amount :
    pricing.type === "subscription" ? pricing.amount :
    0
  if (bundlePrice <= 0 || standalone <= bundlePrice) return null  // not actually saving

  const saved = standalone - bundlePrice
  const pct = Math.round((saved / standalone) * 100)

  return (
    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
      <Sparkles className="h-3 w-3" />
      Buyers save {money(saved, ccy)} ({pct}% off vs buying separately)
    </p>
  )
}

// Validation helpers (also used to label the "missing fields" nudge).
function deliveryValid(kind: ProductKind, d: ProductDelivery): boolean {
  switch (kind) {
    case "course":     return d.kind === "course-access" && !!d.courseId
    case "download":   return d.kind === "file-download" && d.files.length > 0
    case "bundle":     return d.kind === "bundle" && d.childProductIds.length > 0
    case "membership": return d.kind === "membership" && d.includedProductIds.length > 0
    case "session":    return d.kind === "session" && d.durationMinutes > 0
    case "webinar":    return d.kind === "webinar"
    case "license":    return d.kind === "license"
  }
}
function deliveryFieldName(kind: ProductKind): string {
  switch (kind) {
    case "course":     return "course to grant access to"
    case "download":   return "at least one file"
    case "bundle":     return "products to bundle"
    case "membership": return "products to include"
    case "session":    return "session duration"
    case "webinar":    return "webinar details"
    case "license":    return "license template"
  }
}

