"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User as UserIcon,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Logo } from "@/components/brand/logo"
import { cn } from "@/lib/utils"
import {
  suggestSlug,
  useTenant,
  validateSlug,
  PLATFORM_HOST,
  type AcquisitionChannel,
  type TenantUseCase,
} from "@/lib/tenant-store"
import { PhoneInput } from "@/components/forms/phone-input"
import { PasswordStrengthInput, MIN_PASSWORD_SCORE } from "@/components/forms/password-strength-input"
import { recordConversion } from "@/lib/referral-store"
import {
  CATEGORY_LABEL,
  clearPersistedSeed,
  readPersistedSeedEnvelope,
  seedToDraftCourse,
  type CourseSeed,
} from "@/lib/course-builder-templates"

const USE_CASES: Array<{ value: TenantUseCase; label: string; icon: React.ReactNode }> = [
  { value: "solo-instructor", label: "Solo instructor / creator",  icon: <UserIcon  className="h-4 w-4" /> },
  { value: "school",          label: "School / coaching institute", icon: <GraduationCap className="h-4 w-4" /> },
  { value: "college",         label: "College / university",        icon: <Building2 className="h-4 w-4" /> },
  { value: "corporate",       label: "Corporate L&D",               icon: <Briefcase className="h-4 w-4" /> },
  { value: "ngo",             label: "Non-profit / NGO",            icon: <Heart     className="h-4 w-4" /> },
  { value: "other",           label: "Something else",              icon: <Users     className="h-4 w-4" /> },
]

const ACQUISITION: Array<{ value: AcquisitionChannel; label: string }> = [
  { value: "google",        label: "Google search" },
  { value: "social",        label: "Twitter / LinkedIn / Instagram" },
  { value: "youtube",       label: "YouTube" },
  { value: "friend",        label: "A friend or colleague" },
  { value: "podcast",       label: "Podcast" },
  { value: "blog-article",  label: "Blog / article" },
  { value: "event",         label: "Conference or event" },
  { value: "other",         label: "Other" },
]

const COUNTRIES = [
  ["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"],
  ["AE", "UAE"], ["SG", "Singapore"], ["CA", "Canada"], ["AU", "Australia"],
  ["DE", "Germany"], ["FR", "France"], ["BR", "Brazil"], ["NG", "Nigeria"],
  ["ZA", "South Africa"], ["PH", "Philippines"], ["ID", "Indonesia"], ["JP", "Japan"],
  ["OTHER", "Somewhere else"],
] as const

export default function SignupPage() {
  const { registerTenant, updateTenant, isSlugAvailable, switchTenant, isHydrated } = useTenant()

  // --- form state ---
  const [workspaceName, setWorkspaceName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordValid, setPasswordValid] = useState(false)
  // WhatsApp is required. Tracks E.164 + a "shape is valid" flag from PhoneInput.
  const [phone, setPhone] = useState("")
  const [phoneValid, setPhoneValid] = useState(false)
  const [country, setCountry] = useState<string>("")
  const [useCase, setUseCase] = useState<TenantUseCase | "">("")
  const [website, setWebsite] = useState("")
  const [acquisition, setAcquisition] = useState<AcquisitionChannel | "">("")
  const [acquisitionDetail, setAcquisitionDetail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  // Referral attribution. Reads ?ref=<code> from the URL first, falls back
  // to the pending-ref slot written by the /r/<code> landing page.
  const [refCode, setRefCode] = useState<string | null>(null)
  // Course seed carried over from the homepage's "build a course in 60s"
  // widget. If present, we (a) show a preview card in the left rail so
  // the visitor knows their work is waiting, and (b) write it into the
  // new tenant's lms.courses.v1 slice as a draft on conversion.
  const [pendingSeed, setPendingSeed] = useState<CourseSeed | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const fromQuery = new URLSearchParams(window.location.search).get("ref")
    const fromStash = window.localStorage.getItem("thebigclass.global.pendingRef.v1")
    const code = (fromQuery || fromStash || "").trim()
    if (code) setRefCode(code)
    // Pick up a homepage-builder course seed if there is one. The
    // baked thumbnail field on the envelope is intentionally ignored
    // — the saved course uses the bare image URL so localStorage
    // persistence stays well under quota.
    const envelope = readPersistedSeedEnvelope()
    if (envelope) {
      setPendingSeed(envelope.seed)
    }
  }, [])

  // Auto-suggest slug from workspace name until user edits the slug.
  useEffect(() => {
    if (!slugTouched) setSlug(suggestSlug(workspaceName))
  }, [workspaceName, slugTouched])

  const slugError = useMemo(() => {
    if (!slug) return null
    const v = validateSlug(slug)
    if (v) return v
    if (!isSlugAvailable(slug)) return "Already taken — pick another."
    return null
  }, [slug, isSlugAvailable])

  // When the chosen slug is taken, offer 3 fresh alternatives the user can
  // tap. We try -2, -3, … and also a short random suffix so even hammered
  // names ("academy") yield something usable.
  const slugSuggestions = useMemo(() => {
    if (!slug || !isSlugAvailable(slug) === false) {
      // Only suggest when the slug is otherwise valid (right shape) and taken.
      if (slug && !validateSlug(slug) && !isSlugAvailable(slug)) {
        const tries: string[] = []
        for (let n = 2; n <= 9 && tries.length < 2; n++) {
          const cand = `${slug}-${n}`
          if (isSlugAvailable(cand) && !validateSlug(cand)) tries.push(cand)
        }
        // Always end with a random short suffix as a guaranteed-fresh option.
        let rand = ""
        for (let i = 0; i < 6 && !rand; i++) {
          const suffix = Math.random().toString(36).slice(2, 5)
          const cand = `${slug}-${suffix}`
          if (isSlugAvailable(cand) && !validateSlug(cand)) rand = cand
        }
        if (rand) tries.push(rand)
        return tries
      }
    }
    return [] as string[]
  }, [slug, isSlugAvailable])

  const emailError = useMemo(() => {
    if (!ownerEmail) return null
    return /^[^@]+@[^@]+\.[^@]+$/.test(ownerEmail) ? null : "That doesn't look like an email."
  }, [ownerEmail])

  const canSubmit =
    !!workspaceName.trim() &&
    !!slug && !slugError &&
    !!ownerName.trim() &&
    !!ownerEmail && !emailError &&
    passwordValid &&         // zxcvbn score ≥ MIN_PASSWORD_SCORE
    phoneValid &&            // WhatsApp number is required + must validate
    !!useCase &&
    !!acquisition

  const handleSubmit = async () => {
    setGlobalError(null)
    if (!canSubmit) return
    setSubmitting(true)
    const result = registerTenant({
      workspaceName: workspaceName.trim(),
      slug: slug.trim().toLowerCase(),
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim().toLowerCase(),
      ownerPhone: phone,             // already E.164 from PhoneInput
      country: country && country !== "OTHER" ? country : undefined,
      useCase: useCase as TenantUseCase,
      acquisitionChannel: acquisition as AcquisitionChannel,
      acquisitionDetail: acquisitionDetail.trim() || undefined,
      existingWebsite: website.trim() || undefined,
    })
    if (!result.ok) {
      setGlobalError(result.error)
      setSubmitting(false)
      return
    }

    // Real backend registration. Creates User + Organisation +
    // Subscription (Starter, status=active) in one transaction and
    // returns an accessToken. We persist the token under the same key
    // the billing client reads from — without it the dashboard
    // billing page errors out with "Missing or malformed Authorization
    // header" because requireAuth on the backend wants a Bearer token.
    //
    // Fire-and-forget if the backend is down — the demo tenant store
    // already gave the user a working dashboard locally; they just
    // won't get a real billing record until they re-sign-up against
    // the backend. (Acceptable in dev; production will alert on this.)
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
      const reg = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: result.tenant.ownerEmail,
          password,
          ownerName: result.tenant.ownerName,
          workspaceName: result.tenant.name,
        }),
      })
      if (reg.ok) {
        const body = (await reg.json()) as { accessToken?: string }
        if (body.accessToken) {
          // Same key the billing client reads from. Hard-coded here
          // rather than imported to avoid pulling the billing module
          // (and its dependencies) into the signup bundle for one
          // string constant.
          window.localStorage.setItem("thebigclass.accessToken", body.accessToken)
        }
      } else if (reg.status === 409) {
        // Email already on the backend. Not fatal for the demo flow,
        // but surface as a soft warning so the user knows their next
        // login should use the existing creds.
        // eslint-disable-next-line no-console
        console.warn("[signup] backend account already exists for this email")
      }
    } catch (err) {
      // Backend unreachable. Demo flow continues.
      // eslint-disable-next-line no-console
      console.warn("[signup] backend registration failed", err)
    }

    // Switch this browser to the new tenant so subsequent reads from the
    // tenant store resolve to it.
    switchTenant(result.tenant.slug)

    // Attribution: if this signup came via a referral link, log a global
    // conversion so the original referrer's dashboard can flip the invite
    // to "joined" the next time it loads.
    if (refCode) {
      recordConversion({
        code: refCode,
        email: result.tenant.ownerEmail,
        tenantSlug: result.tenant.slug,
        at: new Date().toISOString(),
      })
      try { window.localStorage.removeItem("thebigclass.global.pendingRef.v1") } catch { /* ignore */ }
    }

    // Pre-seed the new tenant's LMS storage with just one user — the owner.
    // This way the dashboard mounts with a sensible currentUser (their name
    // in the sidebar, their email everywhere) instead of an empty workspace
    // showing "Signed out". Written directly to localStorage because the
    // LMSProvider mounted at /signup won't see the new tenant's keys until
    // the page reloads — which we do below.
    try {
      const ownerUser = {
        id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: result.tenant.ownerName,
        email: result.tenant.ownerEmail,
        role: "admin" as const,
        phone: result.tenant.ownerPhone,
        createdAt: new Date().toISOString(),
      }
      window.localStorage.setItem(
        `thebigclass.t.${result.tenant.slug}.lms.users.v1`,
        JSON.stringify([ownerUser]),
      )
    } catch { /* ignore quota errors */ }

    // Carry the homepage-builder seed through. If the visitor used the
    // "build a course in 60 seconds" widget, drop their generated course
    // into this tenant's lms.courses.v1 slice as a draft so the dashboard
    // mounts with "Your first course (draft)" already in the sidebar —
    // they can publish it in two clicks instead of starting from a blank.
    if (pendingSeed) {
      try {
        // Use the bare image URL as the saved thumbnail. The big
        // text-overlaid SVG the homepage preview shows is ~150 KB
        // once base64-embedded — it tips a fresh workspace over the
        // localStorage quota the first time courses[] is persisted,
        // and the silent setItem failure loses the entire write.
        // The dashboard course card shows the title separately, so
        // the cover doesn't need text baked in.
        const draft = seedToDraftCourse(pendingSeed)
        window.localStorage.setItem(
          `thebigclass.t.${result.tenant.slug}.lms.courses.v1`,
          JSON.stringify([draft]),
        )
        clearPersistedSeed()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[signup] couldn't persist seeded course:", err)
      }
    }

    // Fire-and-forget welcome + verification emails (server-side → ZeptoMail).
    // Stamp `lastVerifyEmailSentAt` immediately so the dashboard banner's
    // "Wait Xs" throttle is honoured from the very first load.
    fetch("/api/auth/signup-welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: result.tenant.ownerEmail,
        name: result.tenant.ownerName,
        workspaceName: result.tenant.name,
        slug: result.tenant.slug,
      }),
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[signup] welcome email failed", err)
    })
    updateTenant(result.tenant.id, { lastVerifyEmailSentAt: new Date().toISOString() })

    // Full reload (not router.push) so every per-tenant provider re-mounts
    // and reads from the new tenant's localStorage namespace. router.push
    // would keep the LMSProvider mounted with the previous tenant's slug,
    // making the dashboard show data from whatever workspace was active
    // before this signup. The flash is a small price for correctness.
    setTimeout(() => { window.location.href = "/onboarding" }, 60)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/"><Logo size="sm" /></Link>
          <p className="text-xs text-muted-foreground">
            Already have a workspace?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* Pitch */}
        <section className="space-y-6">
          <div>
            {refCode && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                <Heart className="h-3 w-3 fill-current" />
                You&apos;re invited with code <span className="font-mono font-bold">{refCode}</span>
              </div>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3 w-3" />
              Free for 14 days · no card
            </span>
            <h1 className="mt-3 font-serif text-4xl font-extrabold tracking-tight sm:text-5xl">
              Launch your academy in 3 minutes.
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Sell courses, run live classes, post assignments, issue certificates — all under your brand,
              on your own subdomain.
            </p>
          </div>

          {/* Pending course-seed banner. Shown only when the visitor
              arrived here from the homepage builder widget — confirms
              their course will land in the new workspace as a draft so
              they don't worry the typing was thrown away. */}
          {pendingSeed && (
            <div
              className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4"
              style={{
                background: `linear-gradient(135deg, hsl(${pendingSeed.brandHue},78%,55%,0.06) 0%, hsl(${(pendingSeed.brandHue + 40) % 360},72%,38%,0.04) 100%)`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{
                    background: `linear-gradient(135deg, hsl(${pendingSeed.brandHue},78%,55%) 0%, hsl(${(pendingSeed.brandHue + 40) % 360},72%,38%) 100%)`,
                  }}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Your course is waiting
                  </p>
                  <p className="mt-0.5 font-serif text-lg font-bold leading-tight">
                    {pendingSeed.topic}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {CATEGORY_LABEL[pendingSeed.category]} · {pendingSeed.modules.length} modules ·{" "}
                    {pendingSeed.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons · ₹
                    {pendingSeed.priceInr.toLocaleString("en-IN")}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-foreground/85">
                    We&apos;ll drop it into your new workspace as a draft course so you can
                    publish it in two clicks.
                  </p>
                </div>
              </div>
            </div>
          )}
          <ul className="grid gap-3 text-sm">
            <Feat title="Your subdomain instantly">
              You&apos;ll get{" "}
              <span className="font-mono text-foreground">{slug || "yourname"}.{PLATFORM_HOST}</span> right away.
            </Feat>
            <Feat title="Bring your domain later">
              Point a CNAME from <span className="font-mono text-foreground">learn.yourdomain.com</span> when ready.
            </Feat>
            <Feat title="Everything in one place">
              Courses, live classes, quizzes, assignments, certificates, storefront, performance.
            </Feat>
            <Feat title="No card to start">
              Free trial. Paid plans only kick in when you grow past usage limits.
            </Feat>
          </ul>
          
          <div className="mt-10 overflow-hidden rounded-2xl border border-border shadow-xl hidden lg:block relative">
            <img src="/images/auth/signup-hero.png" alt="Recording a live class" className="w-full h-auto aspect-[4/3] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent flex items-end p-6">
              <blockquote className="text-white">
                <p className="text-lg font-medium">&quot;I had my first cohort live before the weekend.&quot;</p>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Form */}
        <section>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6 sm:p-7 space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Create your workspace</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Five fields, then you&apos;re in.</p>
              </div>

              {/* Workspace + slug */}
              <Field id="workspace-name" label="Academy / workspace name" required>
                <Input id="workspace-name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Acme Academy" autoFocus />
              </Field>

              <div className="space-y-1.5">
                <Label htmlFor="slug">Workspace URL <span className="text-destructive">*</span></Label>
                <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/30">
                  <input
                    id="slug"
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true) }}
                    onBlur={() => setSlugTouched(true)}
                    placeholder="acme-academy"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-mono outline-none placeholder:text-muted-foreground"
                  />
                  <span className="flex items-center bg-muted/60 px-3 text-xs text-muted-foreground">
                    .{PLATFORM_HOST}
                  </span>
                </div>
                {slugError ? (
                  <div className="space-y-1.5">
                    <p className="inline-flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" /> {slugError}
                    </p>
                    {slugSuggestions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Try:</span>
                        {slugSuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => { setSlug(s); setSlugTouched(true) }}
                            className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground hover:border-primary/40 hover:bg-muted/40"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : slug ? (
                  <p className="inline-flex items-center gap-1 text-xs text-success">
                    <Check className="h-3 w-3" /> Available · <span className="font-mono text-foreground">{slug}.{PLATFORM_HOST}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">3–32 lowercase letters, numbers, or hyphens. Must be unique.</p>
                )}
              </div>

              {/* Owner */}
              <Field id="owner-name" label="Your name" required icon={<UserIcon className="h-3.5 w-3.5" />}>
                <Input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Priya Sharma" />
              </Field>
              <Field id="owner-email" label="Email" required icon={<Mail className="h-3.5 w-3.5" />} error={emailError ?? undefined}>
                <Input id="owner-email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value.toLowerCase())} placeholder="you@academy.com" />
              </Field>
              {/* Password strength: zxcvbn-backed with min score 3.
                  Replaces the old length-only check that accepted
                  guessable passwords like "password" / "12345678".
                  Reads name + email + workspace name as user
                  context so a password containing any of those gets
                  scored down. */}
              <PasswordStrengthInput
                label="Password"
                value={password}
                onChange={(next, valid) => {
                  setPassword(next)
                  setPasswordValid(valid)
                }}
                userInputs={[ownerName, ownerEmail, workspaceName]}
                minScore={MIN_PASSWORD_SCORE}
              />

              {/* WhatsApp — required. Powers class reminders, OTP fallback,
                  account recovery, and dispatch via the existing notif system. */}
              <div className="space-y-1.5">
                <Label htmlFor="wa">
                  WhatsApp number <span className="text-destructive">*</span>
                </Label>
                <PhoneInput
                  id="wa"
                  value={phone}
                  onChange={(e164, valid) => { setPhone(e164); setPhoneValid(valid) }}
                  required
                  whatsapp
                  placeholder="98765 43210"
                />
              </div>

              {/* Use case — required, segmented */}
              <div className="space-y-1.5">
                <Label>What kind of academy is this? <span className="text-destructive">*</span></Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {USE_CASES.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUseCase(opt.value)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        useCase === opt.value
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                          : "border-border text-muted-foreground hover:bg-muted/40",
                      )}
                    >
                      {opt.icon}
                      <span className="text-left">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Acquisition — required dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="acq">How did you hear about us? <span className="text-destructive">*</span></Label>
                <Select value={acquisition} onValueChange={(v) => setAcquisition(v as AcquisitionChannel)}>
                  <SelectTrigger id="acq"><SelectValue placeholder="Pick one — helps us know what's working" /></SelectTrigger>
                  <SelectContent>
                    {ACQUISITION.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {acquisition === "other" && (
                  <Input
                    value={acquisitionDetail}
                    onChange={(e) => setAcquisitionDetail(e.target.value)}
                    placeholder="Tell us where, briefly"
                    className="mt-2"
                  />
                )}
              </div>

              {/* Optional cluster — collapsed-by-default vibe via subtle styling */}
              <details className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                <summary className="cursor-pointer select-none font-medium">Optional — speeds up onboarding</summary>
                <div className="mt-3 space-y-3">
                  <Field id="website" label="Existing website" hint="We'll pull your logo and colours from here on the next step.">
                    <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://youracademy.com" className="font-mono" />
                  </Field>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="country"><SelectValue placeholder="Pick" /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(([code, name]) => (
                          <SelectItem key={code} value={code}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </details>

              {globalError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {globalError}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting || !isHydrated}
              >
                {submitting
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <ArrowRight className="mr-2 h-4 w-4" />}
                Create workspace &amp; go to dashboard
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                By continuing you agree to the platform terms. You can delete your workspace any time.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

// ---- Tiny helpers ----

function Feat({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <span>
        <span className="font-semibold">{title}.</span>{" "}
        <span className="text-muted-foreground">{children}</span>
      </span>
    </li>
  )
}

function Field({
  id, label, children, hint, error, required, icon,
}: {
  id: string
  label: string
  children: React.ReactNode
  hint?: string
  error?: string
  required?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <div className={cn(icon && "[&_input]:pl-8")}>
          {children}
        </div>
      </div>
      {error && (
        <p className="inline-flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      )}
      {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
