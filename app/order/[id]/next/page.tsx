"use client"

// Post-purchase "What's next?" page. Lands here immediately after a
// successful checkout (the receipt at /order/[id] stays accessible
// via a "skip to receipt" link). Three slots in priority order:
//
//   1. Course-bound  — deep-link straight into the lesson player.
//      Always the primary CTA when the order included a course
//      entitlement. Removes the "find your library, find the
//      course, click resume" friction.
//   2. 1:1 coaching  — surfaces Course.coachingProductId as a
//      premium add-on with a "skip for now" escape hatch.
//      Framed as "Want a 1-on-1 with the instructor?" not "upsell"
//      so the buyer feels guided, not sold.
//   3. Community     — invites the buyer into Course.defaultBatchId.
//      Wired in Phase 3 when batches gain a defaultBatchId; for
//      now we keep the slot conditional on the field being set so
//      nothing renders an empty offer.

import { use, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  PartyPopper,
  PlayCircle,
  Receipt,
  Sparkles,
  Users2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { money, useStore } from "@/lib/store-store"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { StorefrontHeader } from "@/components/store/storefront-header"
import { cn } from "@/lib/utils"

export default function OrderNextStepPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { orders, products, entitlements } = useStore()
  const { getCourseById, currentUser, studentGroups, updateStudentGroup } = useLMS()
  const { currentTenant } = useTenant()
  const tenantBase = currentTenant?.slug ? `/p/${currentTenant.slug}` : ""
  const libraryHref = tenantBase ? `${tenantBase}/library` : "/library"

  const order = orders.find((o) => o.id === id)
  const product = order ? products.find((p) => p.id === order.productId) : undefined

  // Look up the underlying course (if this was a course-access
  // purchase) so we can compute the right deep link + read the
  // coaching / community fields the monetize wizard saved.
  const course = useMemo(() => {
    if (!product) return null
    if (product.delivery.kind !== "course-access") return null
    return getCourseById(product.delivery.courseId) ?? null
  }, [product, getCourseById])

  // 1:1 product the buyer can grab as the premium next step. Hidden
  // when the instructor opted out of coaching during the publish
  // wizard (Course.coachingProductId is the source of truth).
  const coachingProduct = useMemo(() => {
    if (!course?.coachingProductId) return null
    const p = products.find((p) => p.id === course.coachingProductId)
    return p && p.status === "published" ? p : null
  }, [course, products])

  // Community to auto-route into. We resolve a couple of ways:
  //   • Course.defaultBatchId — shipped in Phase 3 once batches gain
  //     start dates + a default community pointer.
  //   • Course.courseId matching StudentGroup.courseId — the batch
  //     someone set up "around" this course. Useful right now for
  //     tenants that already pair batches with courses.
  const community = useMemo(() => {
    if (!course) return null
    const explicit =
      (course as { defaultBatchId?: string }).defaultBatchId
        ? studentGroups.find((g) => g.id === (course as { defaultBatchId?: string }).defaultBatchId)
        : undefined
    if (explicit) return explicit
    return studentGroups.find((g) => g.courseId === course.id) ?? null
  }, [course, studentGroups])

  const hasCourseEntitlement = useMemo(() => {
    if (!order || !course) return false
    return entitlements.some(
      (e) => e.orderId === order.id && e.type === "course" && e.reference === course.id,
    )
  }, [entitlements, order, course])

  // Auto-add the buyer to the resolved community on first render
  // post-purchase (Phase 3C). Guards:
  //   • currentUser must be set — we only auto-join signed-in users
  //     so guests don't get added to a community they haven't even
  //     claimed an account for yet.
  //   • Idempotent — if they're already a member, no-op (the
  //     mutation also guards via memberIds.includes).
  //   • Single-shot per session — the effect depends on community.id
  //     so opening a different order won't re-fire for this one.
  useEffect(() => {
    if (!currentUser || !community) return
    if (community.memberIds.includes(currentUser.id)) return
    updateStudentGroup(community.id, {
      memberIds: [...community.memberIds, currentUser.id],
    })
  }, [currentUser, community, updateStudentGroup])

  if (!order || !product) {
    return (
      <div className="min-h-screen bg-background">
        <StorefrontHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-xl font-bold">Order not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Check the link, or open your library to see purchases.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href={libraryHref}>Open library</Link>
          </Button>
        </main>
      </div>
    )
  }

  const firstName = (order.customerName || "").split(/\s+/)[0] || "there"
  const courseHref = course && tenantBase
    ? `${tenantBase}/learn/${course.slug}`
    : null
  const receiptHref = `/order/${order.id}`

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <PartyPopper className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold sm:text-3xl">
            You&apos;re in, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s the fastest path to making this worthwhile.
          </p>
          <Badge variant="secondary" className="mt-3 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {money(order.total, order.currency)} paid
          </Badge>
        </div>

        {/* Three slots */}
        <div className="mt-8 space-y-3">
          {/* Slot 1 — Start the course */}
          {course && hasCourseEntitlement && courseHref && (
            <NextStepCard
              tone="primary"
              icon={<PlayCircle className="h-5 w-5" />}
              eyebrow="Step 1"
              title={`Start ${course.title}`}
              body="Open Lesson 1 — you can come back to this page from your library any time."
              cta={{ label: "Open Lesson 1", href: courseHref }}
            />
          )}

          {/* Slot 2 — 1:1 coaching */}
          {coachingProduct && coachingProduct.pricing.type === "one-time" && (
            <NextStepCard
              tone="amber"
              icon={<Sparkles className="h-5 w-5" />}
              eyebrow="Want extra help?"
              title={coachingProduct.title}
              body={
                coachingProduct.description ||
                `Add a 1-on-1 with the instructor for ${money(coachingProduct.pricing.amount, coachingProduct.pricing.currency)}. Skip if not — you can always book one later from the course page.`
              }
              cta={{
                label: `Book a 1-on-1 · ${money(coachingProduct.pricing.amount, coachingProduct.pricing.currency)}`,
                href: `/checkout/${coachingProduct.id}`,
              }}
              skipLink={{ label: "Skip for now", href: receiptHref }}
            />
          )}

          {/* Slot 3 — Community */}
          {community && tenantBase && (
            <NextStepCard
              tone="blue"
              icon={<Users2 className="h-5 w-5" />}
              eyebrow="Join the conversation"
              title={community.name}
              body={
                community.description ||
                community.purpose ||
                "Other students are working through this too — say hi, ask questions, share wins."
              }
              cta={{
                label: "Join the discussion",
                href: `${tenantBase}/my/communities/${community.id}`,
              }}
            />
          )}

          {/* No upsells configured — still give them somewhere to go */}
          {(!course || !hasCourseEntitlement || !courseHref) && !coachingProduct && !community && (
            <Card>
              <CardContent className="space-y-3 p-5 text-center">
                <p className="text-sm">Your purchase is ready. Open your library to access it.</p>
                <Button asChild>
                  <Link href={libraryHref}>
                    Open library <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer escape — receipt + library */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Button asChild variant="ghost" size="sm">
            <Link href={receiptHref}>
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              See full receipt
            </Link>
          </Button>
          <span aria-hidden className="text-muted-foreground">·</span>
          <Button asChild variant="ghost" size="sm">
            <Link href={libraryHref}>
              Open library
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Render hint — show the current-user name only when it's
            different from the order. Avoids a confusing greeting for
            buyers who paid as guests and then signed in elsewhere. */}
        {currentUser && currentUser.name && currentUser.name !== order.customerName && (
          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Signed in as {currentUser.name}.
          </p>
        )}
      </main>
    </div>
  )
}

function NextStepCard({
  tone,
  icon,
  eyebrow,
  title,
  body,
  cta,
  skipLink,
}: {
  tone: "primary" | "amber" | "blue"
  icon: React.ReactNode
  eyebrow: string
  title: string
  body: string
  cta: { label: string; href: string }
  skipLink?: { label: string; href: string }
}) {
  return (
    <Card
      className={cn(
        "border",
        tone === "primary" && "border-primary/40 bg-primary/5",
        tone === "amber" && "border-amber-500/30 bg-amber-500/5",
        tone === "blue" && "border-blue-500/30 bg-blue-500/5",
      )}
    >
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
            tone === "primary" && "bg-primary/15 text-primary",
            tone === "amber" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
            tone === "blue" && "bg-blue-500/15 text-blue-700 dark:text-blue-300",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
          <p className="mt-0.5 font-serif text-lg font-semibold leading-tight">
            {title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {skipLink && (
            <Button asChild variant="ghost" size="sm">
              <Link href={skipLink.href}>{skipLink.label}</Link>
            </Button>
          )}
          <Button asChild size="sm" variant={tone === "primary" ? "default" : "secondary"}>
            <Link href={cta.href}>
              {cta.label}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
