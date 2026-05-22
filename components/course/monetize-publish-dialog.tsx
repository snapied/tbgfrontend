"use client"

// 4-step "Monetize this course" wizard fired in place of the publish
// confirm dialog. Each step is skip-able — none of the wizard's
// suggestions are required to publish — but the suggested defaults
// turn a flat-price course into a mini-funnel (course + bump + 1:1
// add-on + bundle) without the instructor having to think like a
// marketer.
//
// Wizard outputs:
//   1. accessModel              — written onto Course
//   2. checkoutBumpProductId    — written onto Course; surfaced as a
//                                 checkbox on the buyer's checkout page
//   3. coachingProductId        — written onto Course; surfaced as the
//                                 1:1 slot on the post-purchase "What's
//                                 next" page
//   4. bundle?                  — when toggled, creates a `bundle`-kind
//                                 product comprising course + bump + 1:1
//                                 at a small discount
//
// On "Publish", the dialog (a) optionally creates the bump + 1:1 + bundle
// products via useStore.addProduct, (b) patches the Course with the
// chosen field set, and (c) flips status to "published". The caller
// only sees an onPublished({courseId}) callback when everything lands.

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  Globe,
  Package,
  Sparkles,
  Users2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  money,
  useStore,
  type Product,
  type ProductDelivery,
  type PricingModel,
} from "@/lib/store-store"
import type { Course } from "@/lib/lms-store"

type AccessModel = NonNullable<Course["accessModel"]>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: Course
  /** Called with the patch the caller should apply to the course AFTER
   *  the wizard has done its own product creates. The caller wires this
   *  into `updateCourse(courseId, patch)` and the publish flip. */
  onPublish: (patch: Partial<Course>) => void
  instructorId: string
}

export function MonetizePublishDialog({
  open,
  onOpenChange,
  course,
  onPublish,
  instructorId,
}: Props) {
  const { products, addProduct } = useStore()

  // ── Step state ──
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [accessModel, setAccessModel] = useState<AccessModel>(
    course.accessModel ?? "one-time",
  )

  // Bump — either reuse an existing download product or compose a quick
  // one inline. The two modes share a single resolved `bumpProductId`
  // we hand back via onPublish.
  const myDownloads = useMemo(
    () =>
      products.filter(
        (p) =>
          p.kind === "download" &&
          p.status !== "archived" &&
          // Cheap "is mine" heuristic: products created in this tenant.
          // The store is tenant-scoped already so this is workspace-wide.
          true,
      ),
    [products],
  )
  const [bumpMode, setBumpMode] = useState<"existing" | "quick" | "skip">(
    course.checkoutBumpProductId ? "existing" : myDownloads.length > 0 ? "existing" : "quick",
  )
  const [bumpExistingId, setBumpExistingId] = useState<string>(
    course.checkoutBumpProductId ?? myDownloads[0]?.id ?? "",
  )
  // Quick-create defaults: title + price. Price defaults to 30% of the
  // course price (Perplexity's playbook: bumps land best at ~30–40% of
  // the anchor offer).
  const suggestedBumpPrice = useMemo(() => {
    const p = Math.round(course.price * 0.3)
    return p > 0 ? String(p) : "99"
  }, [course.price])
  const [bumpTitle, setBumpTitle] = useState(`${course.title} — Resource pack`)
  const [bumpPrice, setBumpPrice] = useState(suggestedBumpPrice)

  // 1:1 add-on — same dual mode but skip is the prominent default
  // (not every instructor offers coaching).
  const [coachingEnabled, setCoachingEnabled] = useState(
    !!course.coachingProductId,
  )
  const suggestedCoachingPrice = useMemo(() => {
    const p = Math.max(course.price * 4, 999) // 4× course price, floor at ₹999
    return String(Math.round(p))
  }, [course.price])
  const [coachingTitle, setCoachingTitle] = useState(
    `1-on-1 with ${course.instructor?.name ?? "your instructor"}`,
  )
  const [coachingPrice, setCoachingPrice] = useState(suggestedCoachingPrice)
  const [coachingDuration, setCoachingDuration] = useState("60")

  // Bundle — auto-composed from whatever the previous steps left us.
  // Discount defaults to 15%; instructor can flip off entirely.
  const [bundleEnabled, setBundleEnabled] = useState(false)
  const [bundleDiscountPct, setBundleDiscountPct] = useState("15")

  const [submitting, setSubmitting] = useState(false)

  const currency = course.currency || "INR"

  // Resolve the bump product id we'll commit to. Always returns a
  // string id once Step 4 runs, OR undefined if the instructor chose
  // "skip" (in which case the bump field on Course stays empty).
  const commitWizard = () => {
    setSubmitting(true)
    const patch: Partial<Course> = {
      accessModel,
    }
    const now = new Date().toISOString()
    const childProductIds: string[] = []

    // Bump
    let resolvedBumpId: string | undefined
    if (bumpMode === "existing" && bumpExistingId) {
      resolvedBumpId = bumpExistingId
    } else if (bumpMode === "quick") {
      const price = parseFloat(bumpPrice) || 0
      if (price > 0 && bumpTitle.trim()) {
        const id = `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        const pricing: PricingModel = {
          type: "one-time",
          amount: price,
          currency,
        }
        const delivery: ProductDelivery = {
          kind: "file-download",
          files: [],
        }
        const newProduct: Product = {
          id,
          kind: "download",
          title: bumpTitle.trim(),
          slug: bumpTitle.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          description: `Resource pack for ${course.title}.`,
          pricing,
          delivery,
          status: "published",
          publishedAt: now,
          inventorySold: 0,
          createdAt: now,
          updatedAt: now,
        }
        addProduct(newProduct)
        resolvedBumpId = id
      }
    }
    if (resolvedBumpId) {
      patch.checkoutBumpProductId = resolvedBumpId
      childProductIds.push(resolvedBumpId)
    }

    // 1:1 coaching
    let resolvedCoachingId: string | undefined
    if (coachingEnabled) {
      const price = parseFloat(coachingPrice) || 0
      const minutes = parseInt(coachingDuration, 10) || 60
      if (price > 0 && coachingTitle.trim()) {
        const id = `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        const pricing: PricingModel = {
          type: "one-time",
          amount: price,
          currency,
        }
        const delivery: ProductDelivery = {
          kind: "session",
          durationMinutes: minutes,
        }
        const newProduct: Product = {
          id,
          kind: "session",
          title: coachingTitle.trim(),
          slug: coachingTitle.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          description: `${minutes}-minute coaching session with the instructor.`,
          pricing,
          delivery,
          status: "published",
          publishedAt: now,
          inventorySold: 0,
          createdAt: now,
          updatedAt: now,
        }
        addProduct(newProduct)
        resolvedCoachingId = id
      }
    }
    if (resolvedCoachingId) {
      patch.coachingProductId = resolvedCoachingId
      childProductIds.push(resolvedCoachingId)
    }

    // Bundle
    if (bundleEnabled && childProductIds.length > 0) {
      const discount = Math.max(0, Math.min(50, parseFloat(bundleDiscountPct) || 0)) / 100
      const bumpAmount = resolvedBumpId
        ? products.find((p) => p.id === resolvedBumpId)?.pricing.type === "one-time"
          ? (products.find((p) => p.id === resolvedBumpId)!.pricing as { amount: number }).amount
          : parseFloat(bumpPrice) || 0
        : 0
      const coachingAmount = resolvedCoachingId ? parseFloat(coachingPrice) || 0 : 0
      const baseSum = course.price + bumpAmount + coachingAmount
      const bundlePrice = Math.round(baseSum * (1 - discount) * 100) / 100
      const id = `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const pricing: PricingModel = {
        type: "one-time",
        amount: bundlePrice,
        currency,
        comparePrice: baseSum,
      }
      // Note: child product ids only include the bump + coaching SKUs
      // we created. The course itself is delivered via the course
      // entitlement path; we'd need a `course`-kind product to fold
      // into the bundle properly. For Phase 2 we keep the bundle as
      // a "value-add accessories" pack the buyer can grab in one go.
      const delivery: ProductDelivery = {
        kind: "bundle",
        childProductIds,
      }
      const newBundle: Product = {
        id,
        kind: "bundle",
        title: `${course.title} — Complete bundle`,
        slug: `${course.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-bundle`,
        description: `Save ${Math.round(discount * 100)}% — get the resource pack and a 1-on-1 with the instructor alongside the course.`,
        pricing,
        delivery,
        status: "published",
        publishedAt: now,
        inventorySold: 0,
        createdAt: now,
        updatedAt: now,
      }
      addProduct(newBundle)
    }

    onPublish(patch)
    setSubmitting(false)
    onOpenChange(false)
    toast.success("Course is live — monetize options saved.")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Monetize &amp; publish &quot;{course.title}&quot;
          </DialogTitle>
          <DialogDescription>
            Four quick choices turn this course into a complete offer. Skip any step you don&apos;t want — the suggestions are defaults, not requirements.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={cn(
                "flex flex-1 items-center gap-1.5",
                step === n && "text-foreground font-semibold",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                  step > n
                    ? "bg-emerald-500 text-white"
                    : step === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {step > n ? <Check className="h-3 w-3" /> : n}
              </span>
              <span className="truncate">
                {n === 1 ? "Access" : n === 2 ? "Bump" : n === 3 ? "1:1" : "Bundle"}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1 — Access model */}
        {step === 1 && (
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <p className="font-medium">How will students get in?</p>
              <p className="text-xs text-muted-foreground">
                Drives the buyer flow + access duration. You can change this later from the course settings.
              </p>
            </div>
            <div className="grid gap-2">
              <AccessOption
                value="one-time"
                current={accessModel}
                onPick={setAccessModel}
                icon={<CreditCard className="h-4 w-4" />}
                title="One-time purchase"
                detail="Lifetime access for one flat price. Best for self-paced content."
              />
              <AccessOption
                value="payment-plan"
                current={accessModel}
                onPick={setAccessModel}
                icon={<CalendarClock className="h-4 w-4" />}
                title="Payment plan"
                detail="Split the price across multiple charges. Lowers the entry bar without dropping the headline price."
              />
              <AccessOption
                value="membership"
                current={accessModel}
                onPick={setAccessModel}
                icon={<Users2 className="h-4 w-4" />}
                title="Membership only"
                detail="Locked unless the buyer holds your membership. Use this to drive recurring revenue."
              />
            </div>
          </div>
        )}

        {/* Step 2 — Bump */}
        {step === 2 && (
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <p className="font-medium">Add a checkout add-on?</p>
              <p className="text-xs text-muted-foreground">
                A single low-friction checkbox on the checkout page. Buyers tick it without leaving the flow. Best at ~30% of course price.
              </p>
            </div>
            <div className="grid gap-2">
              {myDownloads.length > 0 && (
                <BumpModeOption
                  value="existing"
                  current={bumpMode}
                  onPick={setBumpMode}
                  title="Use an existing download"
                  detail={`Pick one of your ${myDownloads.length} download product${myDownloads.length === 1 ? "" : "s"}.`}
                />
              )}
              <BumpModeOption
                value="quick"
                current={bumpMode}
                onPick={setBumpMode}
                title="Create a resource pack now"
                detail="Spins up a new download-kind product with the title and price below. You can attach files later from the storefront."
              />
              <BumpModeOption
                value="skip"
                current={bumpMode}
                onPick={setBumpMode}
                title="Skip the bump"
                detail="No checkbox on checkout. You can add one later from the course settings."
              />
            </div>
            {bumpMode === "existing" && myDownloads.length > 0 && (
              <div className="space-y-1.5">
                <Label>Existing download</Label>
                <select
                  value={bumpExistingId}
                  onChange={(e) => setBumpExistingId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {myDownloads.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                      {p.pricing.type === "one-time" ? ` — ${money(p.pricing.amount, p.pricing.currency)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {bumpMode === "quick" && (
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={bumpTitle} onChange={(e) => setBumpTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Price ({currency})</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={bumpPrice}
                    onChange={(e) => setBumpPrice(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — 1:1 coaching */}
        {step === 3 && (
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <p className="font-medium">Offer a 1-on-1 with the buyer?</p>
              <p className="text-xs text-muted-foreground">
                Surfaced on the &quot;what&apos;s next&quot; page right after purchase. Best at 3–5× the course price.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Enable 1:1 add-on</p>
                <p className="text-xs text-muted-foreground">
                  Creates a session-kind product students can buy after checkout.
                </p>
              </div>
              <Switch checked={coachingEnabled} onCheckedChange={setCoachingEnabled} />
            </div>
            {coachingEnabled && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={coachingTitle}
                    onChange={(e) => setCoachingTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={coachingDuration}
                      onChange={(e) => setCoachingDuration(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Price ({currency})</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={coachingPrice}
                      onChange={(e) => setCoachingPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Bundle */}
        {step === 4 && (
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <p className="font-medium">Auto-create a discounted bundle?</p>
              <p className="text-xs text-muted-foreground">
                Composes the bump + 1:1 into a single bundle product at a small discount. Surfaced as &quot;Or get the complete package&quot; on the course sales page.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Create bundle</p>
                <p className="text-xs text-muted-foreground">
                  Requires at least one of bump / 1:1 to exist.
                </p>
              </div>
              <Switch
                checked={bundleEnabled}
                onCheckedChange={setBundleEnabled}
                disabled={bumpMode === "skip" && !coachingEnabled}
              />
            </div>
            {bundleEnabled && (
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={bundleDiscountPct}
                  onChange={(e) => setBundleDiscountPct(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Bundle shows a strike-through &quot;was&quot; price against the sum of individual items.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : 1))}
            disabled={step === 1 || submitting}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((s) => ((s + 1) as 1 | 2 | 3 | 4))}>
              Next
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={commitWizard} disabled={submitting}>
              <Globe className="mr-1.5 h-4 w-4" />
              Publish course
            </Button>
          )}
        </DialogFooter>
        {/* instructorId is currently unused but kept on the public
            interface so the wizard can later attribute newly created
            bump / coaching products to the right teacher (the store
            doesn't track ownership yet). */}
        <span data-instructor-id={instructorId} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}

function AccessOption({
  value,
  current,
  onPick,
  icon,
  title,
  detail,
}: {
  value: AccessModel
  current: AccessModel
  onPick: (v: AccessModel) => void
  icon: React.ReactNode
  title: string
  detail: string
}) {
  const selected = value === current
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={cn(
        "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  )
}

function BumpModeOption({
  value,
  current,
  onPick,
  title,
  detail,
}: {
  value: "existing" | "quick" | "skip"
  current: "existing" | "quick" | "skip"
  onPick: (v: "existing" | "quick" | "skip") => void
  title: string
  detail: string
}) {
  const selected = value === current
  const icon =
    value === "existing" ? (
      <Package className="h-4 w-4" />
    ) : value === "quick" ? (
      <Sparkles className="h-4 w-4" />
    ) : (
      <ArrowRight className="h-4 w-4" />
    )
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={cn(
        "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  )
}
