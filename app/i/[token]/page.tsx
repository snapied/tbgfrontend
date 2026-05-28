"use client"

// Public invite landing page — single-purpose payment + claim flow.
//
// Phases:
//   1. Loading    — fetching invite data from GET /api/invites/view/:token
//   2. Invite     — course details, price, "Pay" button
//   3. Processing — Razorpay checkout open
//   4. Claim      — after payment, create account / login prompt
//   5. Success    — enrolled, link to course
//   6. Error      — expired, revoked, consumed, or network failure

import { use, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ACCESS_TOKEN_KEY } from "@/lib/billing-client"
import {
  viewInvite,
  payInvite,
  claimInvite,
  type InviteViewData,
} from "@/lib/invite-client"

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(n)
}

/**
 * Build the correct tenant base path for URLs.
 * On subdomain (kishorchem.thebigclass.com): returns "" → links become /signup, /my
 * On platform domain: returns "/p/kishorchem" → links become /p/kishorchem/signup
 */
function tenantBase(tenantSlug: string): string {
  if (typeof window === "undefined") return `/p/${tenantSlug}`
  const host = window.location.hostname.toLowerCase()
  const platformHost = process.env.NEXT_PUBLIC_PLATFORM_HOST || "thebigclass.com"
  const suffix = `.${platformHost}`
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, -suffix.length)
    if (sub && !sub.includes(".") && sub !== "www") return "" // on subdomain
  }
  return `/p/${tenantSlug}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

type Phase =
  | { kind: "loading" }
  | { kind: "invite"; data: InviteViewData }
  | { kind: "processing"; data: InviteViewData }
  | { kind: "claim"; data: InviteViewData }
  | { kind: "success"; data: InviteViewData; courseSlug: string; tenantSlug: string }
  | { kind: "error"; title: string; message: string; httpStatus?: number }

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [phase, setPhase] = useState<Phase>({ kind: "loading" })

  // Fetch invite data on mount
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await viewInvite(token)
      if (cancelled) return

      if ("error" in result) {
        if (result.status === 404) {
          setPhase({ kind: "error", title: "Invite not found", message: "This invite link is invalid or does not exist.", httpStatus: 404 })
        } else if (result.status === 410) {
          setPhase({ kind: "error", title: "Invite unavailable", message: result.error, httpStatus: 410 })
        } else {
          setPhase({ kind: "error", title: "Something went wrong", message: result.error })
        }
        return
      }

      // Route based on invite status
      if (result.status === "claimed") {
        setPhase({ kind: "error", title: "Already claimed", message: "This invite has already been used." })
      } else if (result.status === "expired") {
        setPhase({ kind: "error", title: "Invite expired", message: `This invite expired on ${formatDate(result.expires_at)}.` })
      } else if (result.status === "revoked") {
        setPhase({ kind: "error", title: "Invite revoked", message: "This invite has been cancelled by the academy." })
      } else if (result.status === "paid" || result.status === "payment_pending") {
        // Payment already done. Redirect to tenant register page.
        // The register/login flow will handle creating the student
        // in the academy and claiming the invite.
        // Redirect back to THIS invite page after signup — so auto-claim fires
        const returnUrl = `/i/${token}`
        const base = tenantBase(result.tenant_slug)
        const registerUrl = `${base}/signup?invite=${token}&next=${encodeURIComponent(returnUrl)}`

        if (hasAccessToken()) {
          // Already logged in — try to auto-claim
          setPhase({ kind: "claim", data: result })
          const claimResult = await claimInvite(token)
          if (cancelled) return
          if ("error" in claimResult) {
            // Claim failed — show error with retry option
            setPhase({ kind: "error", title: "Enrollment failed", message: claimResult.error })
          } else {
            // Write enrollment + student to tenant's localStorage
            writeEnrollmentToStore(result, claimResult)
            setPhase({
              kind: "success",
              data: result,
              courseSlug: claimResult.course_slug || result.course_slug,
              tenantSlug: claimResult.tenant_slug || result.tenant_slug,
            })
          }
        } else {
          // Not logged in — redirect straight to tenant register page
          if (typeof window !== "undefined" && result.tenant_slug) {
            window.location.href = registerUrl
            return
          }
          setPhase({ kind: "claim", data: result })
        }
      } else {
        // Not yet paid — show the invite/payment page
        setPhase({ kind: "invite", data: result })
      }
    })()
    return () => { cancelled = true }
  }, [token])

  // ── Write enrollment + student to tenant localStorage ─────────

  function writeEnrollmentToStore(
    viewData: InviteViewData,
    claimResult: { enrolled?: boolean; course_slug?: string; tenant_slug?: string },
  ) {
    if (!claimResult.enrolled || !viewData.tenant_slug || typeof window === "undefined") return
    try {
      const slug = viewData.tenant_slug

      // Get current user ID
      const userIdKey = `thebigclass.t.${slug}.lms.currentUserId.v1`
      const currentUserId = window.localStorage.getItem(userIdKey) ?? "self"

      // Write enrollment
      const enrollKey = `thebigclass.t.${slug}.lms.enrollments.v1`
      const enrollments = JSON.parse(window.localStorage.getItem(enrollKey) || "[]") as Array<Record<string, unknown>>
      if (!enrollments.some((e) => e.courseId === viewData.course_id)) {
        const now = new Date().toISOString()
        enrollments.push({
          id: `enr_${Date.now()}`,
          courseId: viewData.course_id,
          studentId: currentUserId,
          enrolledAt: now,
          lastAccessedAt: now,
          progress: 0,
          completedLessons: [],
        })
        window.localStorage.setItem(enrollKey, JSON.stringify(enrollments))
      }

      // Ensure the user is in the tenant's student list (so admin sees them)
      const studentsKey = `thebigclass.t.${slug}.lms.users.v1`
      const students = JSON.parse(window.localStorage.getItem(studentsKey) || "[]") as Array<Record<string, unknown>>
      if (!students.some((s) => s.id === currentUserId)) {
        const name = getStoredUserField(slug, "name")
        const email = getStoredUserField(slug, "email")
        if (name || email) {
          students.push({
            id: currentUserId,
            name: name || "Student",
            email: email || "",
            role: "student",
            createdAt: new Date().toISOString(),
          })
          window.localStorage.setItem(studentsKey, JSON.stringify(students))
        }
      }
    } catch { /* non-critical */ }
  }

  // ── Redirect to tenant register ────────────────────────────────

  function redirectToRegister(data: InviteViewData) {
    if (typeof window === "undefined" || !data.tenant_slug) return
    // Redirect back to THIS invite page after signup — so auto-claim fires
    const returnUrl = `/i/${token}`
    const base = tenantBase(data.tenant_slug)
    window.location.href = `${base}/signup?invite=${token}&next=${encodeURIComponent(returnUrl)}`
  }

  // ── Pay handler ───────────────────────────────────────────────

  async function handlePay(data: InviteViewData) {
    setPhase({ kind: "processing", data })

    // Call /pay even for free courses — it creates the order and marks
    // the invite as 'paid', which is required before /claim will work.
    const result = await payInvite(token)

    if ("error" in result) {
      const detail = (result as Record<string, unknown>).detail as string | undefined
      setPhase({
        kind: "error",
        title: "Payment failed",
        message: detail ? `${result.error} (${detail})` : result.error,
      })
      return
    }

    // Dev stub mode or free order — payment done
    if (result.dev_mode || result.status === "paid") {
      if (hasAccessToken()) {
        await handleClaim(data)
      } else {
        // Redirect to tenant register page
        redirectToRegister(data)
      }
      return
    }

    // Open Razorpay checkout
    if (result.razorpay_order_id && result.razorpay_key) {
      openRazorpay(result, data)
    } else {
      setPhase({ kind: "error", title: "Payment error", message: "Unable to create payment order. Please try again." })
    }
  }

  function openRazorpay(
    payResult: { razorpay_order_id?: string; razorpay_key?: string; amount_paise?: number; currency?: string; prefill?: { name?: string; email?: string; contact?: string } },
    data: InviteViewData,
  ) {
    const RZP_SRC = "https://checkout.razorpay.com/v1/checkout.js"
    const existingScript = document.querySelector(`script[src="${RZP_SRC}"]`)

    function launchRzp() {
      const options = {
        key: payResult.razorpay_key,
        amount: payResult.amount_paise,
        currency: payResult.currency || "INR",
        name: data.academy_name,
        description: data.course_title,
        order_id: payResult.razorpay_order_id,
        handler: async () => {
          // Payment done on Razorpay side
          if (hasAccessToken()) {
            await handleClaim(data)
          } else {
            // Redirect to tenant register page
            redirectToRegister(data)
          }
        },
        modal: {
          ondismiss: () => {
            setPhase({ kind: "invite", data })
          },
        },
        prefill: {
          name: payResult.prefill?.name || data.recipient_name || getStoredUserField(data.tenant_slug, "name") || "",
          email: payResult.prefill?.email || data.recipient_email || getStoredUserField(data.tenant_slug, "email") || "",
          contact: payResult.prefill?.contact || data.recipient_phone || getStoredUserField(data.tenant_slug, "phone") || "",
        },
        theme: { color: "#6366f1" },
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (existingScript && (window as any).Razorpay) {
      launchRzp()
    } else {
      const script = document.createElement("script")
      script.src = RZP_SRC
      script.onload = launchRzp
      script.onerror = () => {
        setPhase({ kind: "error", title: "Payment gateway error", message: "Failed to load payment gateway. Please check your internet connection or disable ad blockers and try again." })
      }
      document.body.appendChild(script)
    }
  }

  // ── Claim handler ─────────────────────────────────────────────

  async function handleClaim(data: InviteViewData) {
    const result = await claimInvite(token)
    if ("error" in result) {
      setPhase({ kind: "error", title: "Claim failed", message: result.error })
      return
    }

    writeEnrollmentToStore(data, result)

    setPhase({
      kind: "success",
      data,
      courseSlug: result.course_slug || data.course_slug,
      tenantSlug: result.tenant_slug || data.tenant_slug,
    })
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mx-auto w-full max-w-md">

        {/* ── Loading ──────────────────────────────────────────── */}
        {phase.kind === "loading" && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading invite...
            </CardContent>
          </Card>
        )}

        {/* ── Invite ───────────────────────────────────────────── */}
        {phase.kind === "invite" && (
          <InviteCard
            data={phase.data}
            onPay={() => handlePay(phase.data)}
            paying={false}
          />
        )}

        {/* ── Processing ───────────────────────────────────────── */}
        {phase.kind === "processing" && (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-semibold">Preparing your payment...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Please wait while we set up your order.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Claim ────────────────────────────────────────────── */}
        {phase.kind === "claim" && (
          <Card>
            <CardContent className="space-y-6 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/40">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Payment successful!</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create your account or sign in to access <strong>{phase.data.course_title}</strong>.
                </p>
              </div>

              {hasAccessToken() ? (
                <div className="space-y-3">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Enrolling you in the course...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button asChild className="w-full" size="lg">
                    <Link href={`${tenantBase(phase.data.tenant_slug)}/signup?invite=${token}&next=${encodeURIComponent(`/i/${token}`)}`}>
                      Create Account
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full" size="lg">
                    <Link href={`${tenantBase(phase.data.tenant_slug)}/login?invite=${token}&next=${encodeURIComponent(`/i/${token}`)}`}>
                      Sign In
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Sign in to <strong>{phase.data.academy_name}</strong> to access your course.
                    After signing in, you&apos;ll be automatically enrolled.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Success ──────────────────────────────────────────── */}
        {phase.kind === "success" && (() => {
          const tenantSlug = phase.tenantSlug
          const base = tenantBase(tenantSlug)
          const dashboardUrl = `${base}/my`
          const loginUrl = `${base}/login?next=${encodeURIComponent(dashboardUrl)}`
          const isLoggedIn = hasAccessToken()

          return (
            <Card>
              <CardContent className="space-y-5 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/40">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">You&apos;re enrolled!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Welcome to <strong>{phase.data.course_title}</strong>. Start learning now.
                  </p>
                </div>

                {isLoggedIn ? (
                  <div className="space-y-2">
                    <Button asChild size="lg" className="w-full">
                      <Link href={dashboardUrl}>
                        Go to My Dashboard
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Register on <strong>{phase.data.academy_name}</strong> to access your course.
                    </p>
                    <Button asChild size="lg" className="w-full">
                      <Link href={`${base}/signup?next=${encodeURIComponent(dashboardUrl)}`}>
                        Register & access your course
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`${base}/login?next=${encodeURIComponent(dashboardUrl)}`}>
                        Already have an account? Sign in
                      </Link>
                    </Button>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Your enrollment is confirmed. You can access the course anytime from your dashboard.
                </p>
              </CardContent>
            </Card>
          )
        })()}

        {/* ── Error ────────────────────────────────────────────── */}
        {phase.kind === "error" && (
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold">{phase.title}</h2>
              <p className="text-sm text-muted-foreground">{phase.message}</p>
              <Button asChild variant="ghost">
                <Link href="/">Go to homepage</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// Assignment descriptions come from the WYSIWYG editor as HTML.  For the
// table preview we want plain text — strip tags + collapse whitespace.
// Server-rendered, no DOM; a small regex is enough since we're not parsing
// for security, just stripping decoration.
function stripHtmlToPreview(html: string | undefined, max = 140): string {
  if (!html) return ""
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}
// ── Invite Card sub-component ─────────────────────────────────────

function InviteCard({
  data,
  onPay,
  paying,
}: {
  data: InviteViewData
  onPay: () => void
  paying: boolean
}) {
  const hasDiscount = data.override_price !== null && data.override_price < data.original_price
  const isFree = data.final_price === 0
  const isExpired = new Date(data.expires_at) < new Date()

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="space-y-5 p-0 py-0">
        {/* Academy header */}
        <div className="flex items-center gap-3 border-b bg-muted/40 px-6 py-4">
          {data.academy_logo ? (
            <img
              src={data.academy_logo}
              alt={data.academy_name}
              className="h-10 w-10 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg">
              {data.academy_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm">{data.academy_name}</p>
            <p className="text-xs text-muted-foreground">Invite to enroll</p>
          </div>
        </div>

        <div className="space-y-5 px-6 pb-6">
          {/* Course details */}
          <div className="space-y-2">
            {data.course_thumbnail && (
              <img
                src={data.course_thumbnail}
                alt={data.course_title}
                className="w-full rounded-lg object-cover aspect-video"
              />
            )}
            <h1 className="text-xl font-bold">{data.course_title}</h1>
            {data.course_description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {stripHtmlToPreview(data.course_description)}
              </p>
            )}
            {data.course_category && (
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{data.course_category}</span>
              </div>
            )}
          </div>

          {/* Admin note */}
          {data.admin_note && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {data.recipient_name ? `"${data.admin_note}"` : data.admin_note}
              </p>
            </div>
          )}

          {/* Price breakdown */}
          <div className="rounded-lg border p-4 space-y-2">
            {hasDiscount && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Original price</span>
                <span className="line-through text-muted-foreground">
                  {formatINR(data.original_price)}
                </span>
              </div>
            )}
            {hasDiscount && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatINR(data.original_price - data.final_price)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1 border-t">
              <span>Total</span>
              <span>{isFree ? "Free" : formatINR(data.final_price)}</span>
            </div>
          </div>

          {/* Pay button */}
          <Button
            onClick={onPay}
            disabled={paying || isExpired}
            className="w-full gap-2"
            size="lg"
          >
            {paying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {isExpired
              ? "Invite Expired"
              : isFree
                ? "Enroll Free"
                : `Pay ${formatINR(data.final_price)}`}
          </Button>

          {/* Trust badge */}
          {!isFree && (
            <p className="text-center text-[10px] text-muted-foreground">
              Payments processed securely by Razorpay. By proceeding you agree to the Terms of Service.
            </p>
          )}

          {/* Expiry */}
          <p className="text-center text-xs text-muted-foreground">
            {isExpired
              ? `This invite expired on ${formatDate(data.expires_at)}`
              : `Valid until ${formatDate(data.expires_at)}`}
          </p>

          {/* Academy info */}
          {data.academy_name && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Sent by {data.academy_name}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Utils ───────────────────────────────────────────────────────

/**
 * Read a field from the logged-in user's LMS store record.
 * Used to prefill Razorpay checkout when the invite doesn't have the data.
 */
function getStoredUserField(tenantSlug: string | undefined, field: string): string {
  if (typeof window === "undefined" || !tenantSlug) return ""
  try {
    const userIdKey = `thebigclass.t.${tenantSlug}.lms.currentUserId.v1`
    const userId = window.localStorage.getItem(userIdKey)
    if (!userId) return ""
    const usersKey = `thebigclass.t.${tenantSlug}.lms.users.v1`
    const users = JSON.parse(window.localStorage.getItem(usersKey) || "[]") as Array<Record<string, unknown>>
    const user = users.find((u) => u.id === userId)
    if (!user) return ""
    return String(user[field] ?? "")
  } catch {
    return ""
  }
}

function hasAccessToken(): boolean {
  if (typeof window === "undefined") return false
  return !!window.localStorage.getItem(ACCESS_TOKEN_KEY)
}
