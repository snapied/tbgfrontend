"use client"

// Public testimonial submission form.
//
// Two entry-modes:
//   1. Magic link: /testimonial?t=<token> — token decoded into a
//      `MagicLinkPayload` that pre-fills name + course + tenant +
//      instructor attribution. No sign-in required.
//   2. Anonymous: /testimonial?for=<tenantSlug>&i=<instructorId>&c=<courseId>
//      — a low-friction fallback for QR codes or "post-class" links
//      with no magic token. Same form; the teacher reviews before
//      publishing.
//
// Submission lands in the appropriate tenant's portal-store as a
// `status: "pending"` testimonial with `source: "student-submission"`
// + the spam score from the heuristic check. The teacher's
// testimonials inbox surfaces it on next mount.
//
// Why localStorage and not an API roundtrip: the rest of the POC is
// localStorage-first. The portal store is per-tenant; we hop tenants
// for write here by calling `switchTenant` + invoking the upsert with
// the target slug context. Trade-off: write only works when the form
// is opened in the SAME browser session as the teacher's workspace
// install — which is the realistic POC case anyway.

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Heart, Loader2, Quote, ShieldAlert, Sparkles, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Logo } from "@/components/brand/logo"
import { StarRatingInput } from "@/components/portal/star-rating-input"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { FileUploadField } from "@/components/upload/file-upload-field"
import { decodeMagicLink, tokenAgeDays } from "@/lib/testimonial-magic-link"
import { checkSpam } from "@/lib/testimonial-spam"
import { useTenant } from "@/lib/tenant-store"
import { useLMS } from "@/lib/lms-store"
import { usePortal, generatePortalId, type PortalTestimonial } from "@/lib/portal-store"

const QUOTE_MIN = 12
const QUOTE_MAX = 600

export default function PublicTestimonialPage() {
  return (
    <Suspense fallback={<Shell><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Shell>}>
      <PublicTestimonialPageInner />
    </Suspense>
  )
}

function PublicTestimonialPageInner() {
  const params = useSearchParams()
  const token = params.get("t")
  const explicitTenant = params.get("for")
  const explicitCourseId = params.get("c")
  const explicitInstructor = params.get("i")

  const { switchTenant, currentTenant } = useTenant()
  const { upsertTestimonial } = usePortal()
  const { currentUser, getUserById } = useLMS()

  const payload = useMemo(() => (token ? decodeMagicLink(token) : null), [token])
  const tenantSlug = payload?.tenantSlug ?? explicitTenant ?? currentTenant?.slug ?? ""
  // Prefer the logged-in user's profile (richer attribution + photo)
  // when the same browser is signed in. Magic-link payload wins for
  // name when explicit; logged-in profile fills missing fields.
  const loggedInUser = currentUser
  const linkedStudent = payload?.studentUserId ? getUserById(payload.studentUserId) : undefined
  const initialName =
    payload?.studentName ?? loggedInUser?.name ?? linkedStudent?.name ?? ""
  const initialAvatar = loggedInUser?.avatar ?? linkedStudent?.avatar ?? ""
  const initialEmail = payload?.studentEmail ?? loggedInUser?.email ?? ""
  const initialCourse = payload?.courseId ?? explicitCourseId ?? ""
  const initialInstructor = payload?.instructorId ?? explicitInstructor ?? ""
  const linkAge = payload ? tokenAgeDays(payload) : 0
  const linkStale = linkAge > 30

  // Switch tenant context so upsertTestimonial writes into the right
  // slice. We deliberately don't await — the portal store is hydrated
  // synchronously per-slug; the next render picks up the right state.
  useEffect(() => {
    if (tenantSlug && tenantSlug !== currentTenant?.slug) {
      switchTenant(tenantSlug)
    }
  }, [tenantSlug, currentTenant?.slug, switchTenant])

  const [authorName, setAuthorName] = useState(initialName)
  const [authorRole, setAuthorRole] = useState("")
  const [email, setEmail] = useState(initialEmail)
  const [avatar, setAvatar] = useState(initialAvatar) // optional avatar upload
  // Quote is now rich-text HTML. We still validate against a stripped
  // plain-text length so a paragraph of "<p></p>" doesn't slip through.
  const [quoteHtml, setQuoteHtml] = useState("")
  // Optional media — image / video / PDF / audio.
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaFilename, setMediaFilename] = useState("")
  const [rating, setRating] = useState(5)
  const [allowOnWall, setAllowOnWall] = useState(true)
  const [honeypot, setHoneypot] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Strip HTML for validation + spam scoring. The persisted value is
  // the full Tiptap HTML so the dashboard preview keeps formatting.
  const quotePlain = quoteHtml.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim()
  const tooShort = quotePlain.length < QUOTE_MIN
  const canSubmit = !!authorName.trim() && !tooShort && !submitting

  // Detect media kind from filename for storage hints.
  const guessMediaKind = (url: string): PortalTestimonial["mediaKind"] | undefined => {
    if (!url) return undefined
    const lower = url.toLowerCase()
    if (/\.(jpe?g|png|gif|webp|avif)(\?|$)/.test(lower)) return "image"
    if (/\.(mp4|webm|mov|ogv)(\?|$)/.test(lower)) return "video"
    if (/\.(mp3|wav|m4a|ogg)(\?|$)/.test(lower)) return "audio"
    return "file"
  }

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    const spam = checkSpam({ honeypot, body: quotePlain, name: authorName })
    if (spam.block) {
      setError("Your submission triggered our spam filter. If this is a mistake, contact the instructor directly.")
      setSubmitting(false)
      return
    }
    const next: PortalTestimonial = {
      id: generatePortalId("test"),
      authorName: authorName.trim(),
      authorRole: authorRole.trim() || undefined,
      avatar: avatar.trim() || undefined,
      courseId: initialCourse || undefined,
      aboutInstructorId: initialInstructor || undefined,
      rating: rating || undefined,
      // Persist the rich-text HTML so the dashboard preview keeps
      // formatting; surfaces stripping HTML for plain-text contexts
      // already exist downstream.
      quote: quoteHtml,
      mediaUrl: mediaUrl.trim() || undefined,
      mediaKind: mediaUrl ? guessMediaKind(mediaUrl) : undefined,
      mediaFilename: mediaFilename.trim() || undefined,
      featured: false,
      status: "pending",
      source: "student-submission",
      submittedByUserId: payload?.studentUserId ?? loggedInUser?.id,
      spamScore: spam.score || undefined,
      createdAt: new Date().toISOString(),
    }
    try {
      upsertTestimonial(next)
      setSubmitted(true)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[testimonial-submit] failed:", err)
      setError("Couldn't save just now. Try again, or message the instructor directly.")
    } finally {
      setSubmitting(false)
    }
    // Wall opt-in is informational for the moderator — the teacher's
    // testimonials dashboard surfaces it as a hint when approving.
    void allowOnWall
  }

  if (submitted) {
    return (
      <Shell>
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight">
            Thank you, {authorName.split(/\s+/)[0] || "friend"} 💚
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your kind words mean a lot. The instructor will review your testimonial
            within a day and you&rsquo;ll see it land on their public page once approved.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/">Back to the platform</Link>
            </Button>
            {tenantSlug && (
              <Button asChild>
                <Link href={`/p/${tenantSlug}/wall`} target="_blank">
                  <Heart className="mr-1.5 h-4 w-4" />
                  Visit the Wall of Love
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Quote className="h-3.5 w-3.5" />
          Share a testimonial
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">
          {initialName ? `Hi ${initialName.split(/\s+/)[0]} 👋` : "Tell us what you thought"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One short paragraph is plenty. No sign-in needed — your reply lands in
          the instructor&rsquo;s review queue and goes live once approved.
        </p>
      </div>

      {linkStale && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-[12.5px] text-amber-700 dark:text-amber-300"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This link is {linkAge} days old. Make sure the course details below
            still match what you intended to review.
          </p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) submit()
        }}
        className="space-y-4"
      >
        {/* Honeypot — hidden from real humans, irresistible to bots. */}
        <div className="hidden">
          <Label htmlFor="hp_field">Website</Label>
          <Input
            id="hp_field"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name *</Label>
            <Input
              id="name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Priya Sharma"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">What you do (optional)</Label>
            <Input
              id="role"
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value)}
              placeholder="Engineering student"
              maxLength={80}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email (optional)</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <p className="text-[11px] text-muted-foreground">
            We only use this to confirm authorship if needed — never to send
            marketing emails.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quote">Your testimonial *</Label>
          <RichTextEditor
            value={quoteHtml}
            onChange={(html) => {
              const stripped = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim()
              if (stripped.length > QUOTE_MAX) return
              setQuoteHtml(html)
            }}
            placeholder="What did you learn? What changed for you? Specifics help — bold, lists, links are all fair game."
            folder="general"
            minHeight={160}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Minimum {QUOTE_MIN} characters</span>
            <span className="tabular-nums">
              {quotePlain.length} / {QUOTE_MAX}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Rating (optional)</Label>
          <StarRatingInput value={rating} onChange={setRating} />
        </div>

        {/* Optional avatar upload. We pre-fill from any logged-in
            session, but students without an account can still
            attach a photo so the published quote feels personal. */}
        <div className="space-y-1.5">
          <Label>Your photo (optional)</Label>
          <FileUploadField
            value={avatar}
            onChange={setAvatar}
            accept="image/png,image/jpeg,image/webp"
            maxSizeMB={4}
            variant="compact"
            hint={
              loggedInUser?.avatar && avatar === loggedInUser.avatar
                ? "Using your profile photo. Upload a different one if you'd like."
                : "Square photos work best. We crop to a circle for the public render."
            }
            compress={{ maxDim: 400, quality: 0.85, mime: "image/jpeg" }}
          />
        </div>

        {/* Optional media — image, video, audio, or PDF. Instructors
            often run "before/after" cases where a screenshot or short
            clip is the whole story. */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            Attachment (optional)
          </Label>
          <FileUploadField
            value={mediaUrl}
            onChange={(url, meta) => {
              setMediaUrl(url)
              setMediaFilename(meta?.filename ?? "")
            }}
            accept="image/*,video/*,audio/*,application/pdf"
            maxSizeMB={25}
            variant="compact"
            hint="Up to 25 MB. Photo, short video, audio clip, or PDF."
            compress={{ maxDim: 1600, quality: 0.85, mime: "image/jpeg" }}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card p-3 text-sm">
          <Checkbox
            checked={allowOnWall}
            onCheckedChange={(v) => setAllowOnWall(!!v)}
            className="mt-0.5"
          />
          <span>
            <span className="block font-medium">Also show on the public Wall of Love</span>
            <span className="block text-[11px] text-muted-foreground">
              The Wall is a single page that aggregates published testimonials.
              You can ask the instructor to remove yours at any time.
            </span>
          </span>
        </label>

        {error && (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[12.5px] text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Posted publicly only after the instructor approves.
          </p>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              "Submit testimonial"
            )}
          </Button>
        </div>
      </form>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="inline-flex">
            <Logo size="md" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/about">About the platform</Link>
          </Button>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Card>
          <CardContent className="space-y-5 p-6 sm:p-8">{children}</CardContent>
        </Card>
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} The Big Class.</p>
      </footer>
    </div>
  )
}
