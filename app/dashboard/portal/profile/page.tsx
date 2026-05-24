"use client"

// Public profile editor.
//
// Round deliverables:
//   • DraftBar + autosave so nav-away never loses edits (Item 1)
//   • Public URL header link + status pill (Item 5)
//   • Bio paste guard + char-count colour ladder (Items 6, 7)
//   • AI-assist for bio (Item 9)
//   • Per-platform URL validation + auto-normalise (Item 11)
//   • Aspect-ratio hints on avatar + cover (Item 17)
//   • Cover-image reposition (Item 18) — drag-to-reposition handled
//     inside ProfileCoverEditor; the page surfaces clear guidance
//   • HealthScore + suggested next field (Items 23, 24)
//   • Timezone field (Item 27)
//   • Mobile-stacked socials grid (Item 39)
//   • "Ask students for testimonials" CTA (Item 49)
//   • Day-1 onboarding nudge for incomplete profiles (Item 50)

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ExternalLink,
  Globe,
  Heart,
  History,
  MessageSquare,
  Sparkles,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProfileCoverEditor } from "@/components/portal/profile-cover-editor"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { useStorageError } from "@/lib/storage-error"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { DraftBar } from "@/components/ui/draft-bar"
import { HealthScore } from "@/components/ui/health-score"
import { useVersionedDoc } from "@/lib/versioning"
import { VersionsSheet } from "@/components/ui/versions-sheet"
import { useReviewThread } from "@/lib/review-store"
import { ReviewPanel } from "@/components/ui/review-panel"
import { PLATFORMS, validateSocialUrl, type SocialPlatform } from "@/lib/url-validators"

/** Snapshot shape — the fields versioning + reviews care about.
 *  Kept flat so the diff in VersionsSheet shows one row per field. */
interface ProfileSnapshot {
  avatar: string
  coverImageUrl: string
  // bio = short Bio (≤55 chars, plain text).
  // about = long-form Tiptap HTML rendered on the public profile.
  // The model mirrors the faculty form so both surfaces edit the
  // same fields and "Sync from workspace profile" stays meaningful.
  bio: string
  about: string
  portfolioUrl: string
  twitterUrl: string
  linkedInUrl: string
  youtubeUrl: string
  instagramUrl: string
  githubUrl: string
  timezone: string
}

// Hard cap on the Bio — matches the faculty form. The
// short bio is meant to read on a single card line; anything
// longer belongs in About.
const BIO_LIMIT = 55

// Curated timezones — covers >95% of platform users; "Other"
// pattern handled by falling back to the user's typed value if it
// doesn't match any option. (We don't ship the full IANA dump in the
// dropdown because 400+ options is unusable on mobile.)
const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia / Kolkata (IST)" },
  { value: "Asia/Dubai", label: "Asia / Dubai (GST)" },
  { value: "Asia/Singapore", label: "Asia / Singapore (SGT)" },
  { value: "Europe/London", label: "Europe / London (GMT)" },
  { value: "Europe/Berlin", label: "Europe / Berlin (CET)" },
  { value: "America/New_York", label: "America / New York (ET)" },
  { value: "America/Los_Angeles", label: "America / Los Angeles (PT)" },
  { value: "America/Toronto", label: "America / Toronto (ET)" },
  { value: "Australia/Sydney", label: "Australia / Sydney (AET)" },
  { value: "Pacific/Auckland", label: "Pacific / Auckland (NZT)" },
]

export default function PortalProfilePage() {
  const { currentUser, updateUser } = useLMS()
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug ?? ""
  const userHandle = currentUser?.email?.split("@")[0] ?? ""
  const publicUrl =
    typeof window !== "undefined" && tenantSlug && userHandle
      ? `${window.location.origin}/p/${tenantSlug}/instructors/${userHandle}`
      : null

  // ───── Draft state ────────────────────────────────────────────────
  const [avatar, setAvatar] = useState(currentUser?.avatar ?? "")
  const [coverImageUrl, setCoverImageUrl] = useState(currentUser?.coverImageUrl ?? "")
  const [bio, setBio] = useState((currentUser?.bio ?? "").slice(0, BIO_LIMIT))
  // Long-form rich text — what the public "About <name>" card
  // renders. Plain string of Tiptap HTML. Empty string means
  // unauthored; the public page hides the card.
  const [about, setAbout] = useState(currentUser?.about ?? "")
  const [portfolioUrl, setPortfolioUrl] = useState(currentUser?.portfolioUrl ?? "")
  const [twitterUrl, setTwitterUrl] = useState(currentUser?.twitterUrl ?? "")
  const [linkedInUrl, setLinkedInUrl] = useState(currentUser?.linkedInUrl ?? "")
  const [youtubeUrl, setYoutubeUrl] = useState(currentUser?.youtubeUrl ?? "")
  const [instagramUrl, setInstagramUrl] = useState(currentUser?.instagramUrl ?? "")
  const [githubUrl, setGithubUrl] = useState(currentUser?.githubUrl ?? "")
  const [timezone, setTimezone] = useState(currentUser?.timezone ?? "")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [bioTruncatedHint, setBioTruncatedHint] = useState<number | null>(null)
  const [aiAssistOpen, setAiAssistOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [reviewsOpen, setReviewsOpen] = useState(false)

  // Versions + reviews bound to this user's profile.
  // Snapshots fire on explicit Save (DraftBar -> saveNow), not on
  // every autosave tick — otherwise the timeline would be unreadable.
  const versions = useVersionedDoc<ProfileSnapshot>({
    tenantSlug,
    kind: "profile",
    artifactId: currentUser?.id ?? "",
    actor: { id: currentUser?.id, name: currentUser?.name },
    isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })
  const reviews = useReviewThread({
    tenantSlug,
    kind: "profile",
    artifactId: currentUser?.id ?? "",
    actor: { id: currentUser?.id, name: currentUser?.name },
  })
  const currentSnapshot = useMemo<ProfileSnapshot>(
    () => ({
      avatar,
      coverImageUrl,
      bio,
      about,
      portfolioUrl,
      twitterUrl,
      linkedInUrl,
      youtubeUrl,
      instagramUrl,
      githubUrl,
      timezone,
    }),
    [avatar, coverImageUrl, bio, about, portfolioUrl, twitterUrl, linkedInUrl, youtubeUrl, instagramUrl, githubUrl, timezone],
  )

  // Pull fresh values when the current user changes (signin / signout).
  useEffect(() => {
    setAvatar(currentUser?.avatar ?? "")
    setCoverImageUrl(currentUser?.coverImageUrl ?? "")
    setBio((currentUser?.bio ?? "").slice(0, BIO_LIMIT))
    setAbout(currentUser?.about ?? "")
    setPortfolioUrl(currentUser?.portfolioUrl ?? "")
    setTwitterUrl(currentUser?.twitterUrl ?? "")
    setLinkedInUrl(currentUser?.linkedInUrl ?? "")
    setYoutubeUrl(currentUser?.youtubeUrl ?? "")
    setInstagramUrl(currentUser?.instagramUrl ?? "")
    setGithubUrl(currentUser?.githubUrl ?? "")
    setTimezone(currentUser?.timezone ?? "")
  }, [currentUser?.id])

  // ───── Diff vs saved ──────────────────────────────────────────────
  // We compute pendingCount so DraftBar can show "3 unsaved changes".
  const pending = useMemo(() => {
    if (!currentUser) return [] as string[]
    const out: string[] = []
    if (avatar !== (currentUser.avatar ?? "")) out.push("Avatar")
    if (coverImageUrl !== (currentUser.coverImageUrl ?? "")) out.push("Cover")
    if (bio !== (currentUser.bio ?? "")) out.push("Bio")
    if (about !== (currentUser.about ?? "")) out.push("About")
    if (portfolioUrl !== (currentUser.portfolioUrl ?? "")) out.push("Website")
    if (twitterUrl !== (currentUser.twitterUrl ?? "")) out.push("X / Twitter")
    if (linkedInUrl !== (currentUser.linkedInUrl ?? "")) out.push("LinkedIn")
    if (youtubeUrl !== (currentUser.youtubeUrl ?? "")) out.push("YouTube")
    if (instagramUrl !== (currentUser.instagramUrl ?? "")) out.push("Instagram")
    if (githubUrl !== (currentUser.githubUrl ?? "")) out.push("GitHub")
    if (timezone !== (currentUser.timezone ?? "")) out.push("Timezone")
    return out
  }, [
    avatar, coverImageUrl, bio, about, portfolioUrl, twitterUrl, linkedInUrl,
    youtubeUrl, instagramUrl, githubUrl, timezone, currentUser,
  ])
  const dirty = pending.length > 0

  // ───── beforeunload guard (Item 1) ────────────────────────────────
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers ignore the returned string but still show
      // their native "leave page?" prompt because preventDefault
      // was called.
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  // ───── Autosave (Item 1) ──────────────────────────────────────────
  // Debounced 1500ms — long enough that a teacher typing isn't fighting
  // a save flicker, short enough that nav-away keeps very little risk
  // of loss. On error we surface via DraftBar's `error` state.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!currentUser || !dirty) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveStatus("saving")
    debounceRef.current = setTimeout(() => {
      // Normalise URLs at save time so even partially-typed-on-blur
      // values get cleaned up if autosave runs first.
      try {
        updateUser(currentUser.id, {
          avatar: avatar.trim() || undefined,
          coverImageUrl: coverImageUrl.trim() || undefined,
          bio: bio.trim() || undefined,
          about: about.trim() || undefined,
          portfolioUrl: normaliseFor("portfolio", portfolioUrl),
          twitterUrl: normaliseFor("twitter", twitterUrl),
          linkedInUrl: normaliseFor("linkedin", linkedInUrl),
          youtubeUrl: normaliseFor("youtube", youtubeUrl),
          instagramUrl: normaliseFor("instagram", instagramUrl),
          githubUrl: normaliseFor("github", githubUrl),
          timezone: timezone || undefined,
        })
        setSavedAt(new Date())
        setSaveStatus("saved")
        const id = window.setTimeout(() => setSaveStatus("idle"), 2500)
        return () => window.clearTimeout(id)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[profile autosave] failed:", err)
        setSaveStatus("error")
      }
    }, 1500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    avatar, coverImageUrl, bio, about, portfolioUrl, twitterUrl, linkedInUrl,
    youtubeUrl, instagramUrl, githubUrl, timezone, dirty, currentUser?.id,
  ])

  // ───── Discard / publish handlers ─────────────────────────────────
  const discard = () => {
    setAvatar(currentUser?.avatar ?? "")
    setCoverImageUrl(currentUser?.coverImageUrl ?? "")
    setBio((currentUser?.bio ?? "").slice(0, BIO_LIMIT))
    setAbout(currentUser?.about ?? "")
    setPortfolioUrl(currentUser?.portfolioUrl ?? "")
    setTwitterUrl(currentUser?.twitterUrl ?? "")
    setLinkedInUrl(currentUser?.linkedInUrl ?? "")
    setYoutubeUrl(currentUser?.youtubeUrl ?? "")
    setInstagramUrl(currentUser?.instagramUrl ?? "")
    setGithubUrl(currentUser?.githubUrl ?? "")
    setTimezone(currentUser?.timezone ?? "")
    toast.success("Discarded unsaved changes.")
  }
  const saveNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!currentUser) return
    updateUser(currentUser.id, {
      avatar: avatar.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      bio: bio.trim() || undefined,
      about: about.trim() || undefined,
      portfolioUrl: normaliseFor("portfolio", portfolioUrl),
      twitterUrl: normaliseFor("twitter", twitterUrl),
      linkedInUrl: normaliseFor("linkedin", linkedInUrl),
      youtubeUrl: normaliseFor("youtube", youtubeUrl),
      instagramUrl: normaliseFor("instagram", instagramUrl),
      githubUrl: normaliseFor("github", githubUrl),
      timezone: timezone || undefined,
    })
    // Snapshot the explicit save — autosaves don't snapshot or the
    // timeline becomes a wall of meaningless keystroke history.
    versions.snapshot(currentSnapshot, "Saved")
    setSavedAt(new Date())
    setSaveStatus("saved")
    toast.success("Profile saved.")
  }

  // ───── Item 27 timezone autosuggestion ────────────────────────────
  // First-time visit: if the user has no saved timezone and the browser
  // can give us one, pre-fill it so the dropdown shows a sensible
  // default rather than blank.
  useEffect(() => {
    if (currentUser?.timezone) return
    if (!timezone) {
      try {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (browserTz) setTimezone(browserTz)
      } catch {
        /* Intl unsupported — skip silently */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  // ───── Storage warning (kept from original) ───────────────────────
  const storageErr = useStorageError("users")
  useEffect(() => {
    if (!storageErr) return
    toast.warning("Storage is getting large", {
      description:
        "Your workspace's stored data is unusually big. Future edits should still save fine — uploads stream to disk.",
    })
  }, [storageErr])

  // ───── Health items (Items 23, 24) ────────────────────────────────
  const healthItems = useMemo(() => {
    const items = [
      {
        id: "avatar",
        label: "Add a profile photo",
        done: !!avatar.trim(),
        weight: 3,
        hint: "Shows on every course card and your public teacher page.",
      },
      {
        id: "cover",
        label: "Add a cover image",
        done: !!coverImageUrl.trim(),
        weight: 1,
        hint: "Top banner on your public teacher page.",
      },
      {
        id: "bio",
        label: "Set your Bio",
        // 20+ chars (vs the 40 we used to require) — the field is now
        // hard-capped at 55 chars, so 40 was overzealous.
        done: bio.trim().length >= 20,
        weight: 2,
        hint: "One sharp line shown on every course's instructor card.",
      },
      {
        id: "about",
        label: "Write your About section",
        // Strip Tiptap tags before measuring — a teacher who typed
        // a sentence shouldn't get credit for the surrounding <p>.
        done: about.replace(/<[^>]+>/g, "").trim().length >= 80,
        weight: 3,
        hint: "Tell your story — where you've taught, what you specialise in, what students get out of working with you.",
      },
      {
        id: "tz",
        label: "Pick a timezone",
        done: !!timezone,
        weight: 1,
        hint: "Class times render in your students' zone — we still need yours to convert from.",
      },
      {
        id: "social-one",
        label: "Add at least one social or website link",
        done: !!(portfolioUrl || twitterUrl || linkedInUrl || youtubeUrl || instagramUrl || githubUrl),
        weight: 2,
        hint: "Helps students verify you're a real person before they enrol.",
      },
    ]
    return items
  }, [
    avatar, coverImageUrl, bio, about, timezone, portfolioUrl, twitterUrl, linkedInUrl,
    youtubeUrl, instagramUrl, githubUrl,
  ])
  const completedCount = healthItems.filter((i) => i.done).length
  const profileIncomplete = completedCount < 4

  // ───── Bio paste guard (Item 6) ───────────────────────────────────
  const handleBioPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text") ?? ""
    const target = e.currentTarget
    const selectionStart = target.selectionStart ?? 0
    const selectionEnd = target.selectionEnd ?? selectionStart
    const before = bio.slice(0, selectionStart)
    const after = bio.slice(selectionEnd)
    const candidate = before + pasted + after
    if (candidate.length <= BIO_LIMIT) {
      // Let the browser handle it normally — also fires our onChange.
      return
    }
    e.preventDefault()
    const dropped = candidate.length - BIO_LIMIT
    const truncatedPaste = pasted.slice(0, Math.max(0, pasted.length - dropped))
    setBio(before + truncatedPaste + after)
    setBioTruncatedHint(dropped)
    window.setTimeout(() => setBioTruncatedHint(null), 6000)
  }

  return (
    <div
      className={cn(
        // Reserve space for the sticky DraftBar so the last social input
        // never sits underneath it.
        "space-y-6",
        dirty && "pb-[var(--draft-bar-height,5rem)]",
      )}
    >
      {/* ───── Header ───── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Public profile
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">
            How students see you
          </h1>
          <p className="text-muted-foreground">
            Your photo, cover, bio, and links show up on every course you author and on your
            public teacher page.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVersionsOpen(true)}
            className="gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            Versions
            {versions.history.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                {versions.history.length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReviewsOpen(true)}
            className="gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Reviews
            {reviews.openCount > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                {reviews.openCount}
              </span>
            )}
          </Button>
          {publicUrl && (
            <Button variant="outline" asChild className="gap-2">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4" />
                View public profile
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Item 50 — onboarding nudge. Renders only when the profile is
          materially incomplete so a polished profile isn't nagged. */}
      {profileIncomplete && currentUser && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-[13px] text-amber-700 dark:text-amber-300">
          <p className="flex-1">
            <span className="font-semibold">Finish your profile first.</span>{" "}
            Students browsing your courses see this page on every author byline.
            You&rsquo;re {completedCount} of {healthItems.length} done — three
            minutes from here.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
            onClick={() => document.getElementById("profile-health")?.scrollIntoView({ behavior: "smooth" })}
          >
            Show checklist
          </Button>
        </div>
      )}

      {/* Items 23 + 24 — completion meter on the dashboard. */}
      <div id="profile-health">
        <HealthScore
          title="Profile completeness"
          description="Five signals that make your profile worth following. Aim for 5/5 before sharing your public link."
          items={healthItems}
        />
      </div>

      {/* ───── Photo + cover ───── */}
      <Card>
        <CardHeader>
          <CardTitle>Photo &amp; cover</CardTitle>
          <CardDescription>
            What students see at the top of your public teacher page — composed live as you edit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProfileCoverEditor
            name={currentUser?.name ?? "Your name"}
            avatar={avatar}
            coverUrl={coverImageUrl}
            onAvatarChange={setAvatar}
            onCoverChange={setCoverImageUrl}
            subtitle={bio ? bio.split(/\n/)[0].slice(0, 80) : "Instructor"}
          />
          {/* Item 17 — aspect-ratio guidance. */}
          <div className="grid gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-[11.5px] text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="font-semibold text-foreground">Avatar:</span>{" "}
              square (1:1). At least 400 × 400 PNG/JPG. Face well-centred — we
              circle-crop it.
            </p>
            <p>
              <span className="font-semibold text-foreground">Cover:</span>{" "}
              wide (16:9 or wider). 1600 × 900 looks great. Keep important
              content centred — we crop edges on smaller screens.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ───── About you — two fields ─────
          Same model as the faculty form:
            • Bio — one line, ≤55 chars, plain text.
              Shows on every course's instructor card.
            • About — long-form Tiptap HTML. Renders inside the
              "About <name>" card on the public teacher detail
              page. Help-me-write AI assist sits at the card
              header and writes the long form (the harder one
              to compose). */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>About you</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiAssistOpen(true)}
              className="gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Help me write
            </Button>
          </CardTitle>
          <CardDescription>
            Two fields — one line for cards, a richer story for your public profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="bio">Bio (≤{BIO_LIMIT} chars)</Label>
              <span
                className={
                  "text-[11px] tabular-nums " +
                  (bio.length >= BIO_LIMIT
                    ? "text-destructive"
                    : "text-muted-foreground")
                }
              >
                {bio.length} / {BIO_LIMIT}
              </span>
            </div>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_LIMIT))}
              onPaste={handleBioPaste}
              maxLength={BIO_LIMIT}
              placeholder="One line, e.g. 'Calculus prof. Ex-IIT. Loves whiteboards.'"
              rows={2}
            />
            <div className="flex items-center justify-between text-[11px]">
              {/* Item 7 — colour-laddered counter. */}
              <BioCount value={bio} />
              {bioTruncatedHint !== null && (
                <span className="text-amber-700 dark:text-amber-300">
                  Trimmed {bioTruncatedHint} characters from paste — limit is {BIO_LIMIT}.
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Shown under your name on every course&apos;s instructor card. Keep it tight.
            </p>
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <Label>About — tell more about yourself</Label>
            <RichTextEditor
              value={about}
              onChange={setAbout}
              placeholder="Where you've taught, what you specialise in, what your students walk away knowing. A few paragraphs is plenty."
              minHeight={220}
            />
            <p className="text-[11px] text-muted-foreground">
              Shown in the &ldquo;About&rdquo; card on your public profile (/p/{tenantSlug || "your-tenant"}/teachers/{userHandle || "you"}). Headings, lists, links, and basic formatting are preserved.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ───── Identity meta ───── */}
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            Timezone is used when we render your class times to students in
            other zones.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tz">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="tz">
                <SelectValue placeholder="Pick a timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
                {timezone && !TIMEZONE_OPTIONS.some((t) => t.value === timezone) && (
                  <SelectItem value={timezone}>{timezone} (browser)</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              We default to your browser&rsquo;s zone if you haven&rsquo;t picked one.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ───── Socials — mobile-stacked, with per-platform validation ───── */}
      <Card>
        <CardHeader>
          <CardTitle>Social &amp; web</CardTitle>
          <CardDescription>
            Each is rendered as a small icon on your public page. All outgoing links use{" "}
            <code className="rounded bg-muted px-1 font-mono">rel=&quot;nofollow&quot;</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {/* Stacked at xs/sm, 2-col at sm+ — Item 39 spec satisfied via
              sm:grid-cols-2 (default mobile is one-column). */}
          <SocialField platform="portfolio" value={portfolioUrl} onChange={setPortfolioUrl} />
          <SocialField platform="twitter" value={twitterUrl} onChange={setTwitterUrl} />
          <SocialField platform="linkedin" value={linkedInUrl} onChange={setLinkedInUrl} />
          <SocialField platform="youtube" value={youtubeUrl} onChange={setYoutubeUrl} />
          <SocialField platform="instagram" value={instagramUrl} onChange={setInstagramUrl} />
          <SocialField platform="github" value={githubUrl} onChange={setGithubUrl} />
        </CardContent>
      </Card>

      {/* ───── Item 49 — Ask for testimonials ───── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Build your wall
          </CardTitle>
          <CardDescription>
            The best moment to ask a student is right after they complete a course.
            One click sends a personalised request — replies land in your
            testimonials inbox for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/portal/testimonials">
              Ask past students for a testimonial
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* ───── DraftBar (Item 1) — appears when dirty ───── */}
      <DraftBar
        state={
          saveStatus === "error" ? "error" : dirty ? (saveStatus === "saving" ? "saving" : "dirty") : "clean"
        }
        pendingCount={pending.length}
        saveStatus={saveStatus}
        lastSavedAt={savedAt?.toISOString() ?? null}
        onPublish={saveNow}
        onDiscard={discard}
        onPreview={publicUrl ? () => window.open(publicUrl, "_blank") : undefined}
        publishLabel="Save changes"
      />

      {/* ───── AI assist dialog ───── */}
      <AiBioAssistDialog
        open={aiAssistOpen}
        onOpenChange={setAiAssistOpen}
        currentName={currentUser?.name ?? ""}
        currentRole={currentUser?.role ?? "instructor"}
        currentBio={bio}
        onPick={(text) => {
          setBio(text.slice(0, BIO_LIMIT))
          setAiAssistOpen(false)
          toast.success("Bio updated — review and tweak below.")
        }}
      />

      {/* Versions sheet — restore pours the snapshot back into the
          form fields so the teacher can review before Save commits. */}
      <VersionsSheet<ProfileSnapshot>
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        api={versions}
        current={currentSnapshot}
        onRestore={(snapshot) => {
          setAvatar(snapshot.avatar)
          setCoverImageUrl(snapshot.coverImageUrl)
          setBio((snapshot.bio ?? "").slice(0, BIO_LIMIT))
          setAbout(snapshot.about ?? "")
          setPortfolioUrl(snapshot.portfolioUrl)
          setTwitterUrl(snapshot.twitterUrl)
          setLinkedInUrl(snapshot.linkedInUrl)
          setYoutubeUrl(snapshot.youtubeUrl)
          setInstagramUrl(snapshot.instagramUrl)
          setGithubUrl(snapshot.githubUrl)
          setTimezone(snapshot.timezone)
          toast.success("Restored — review the fields and hit Save to commit.")
        }}
        fieldLabels={{
          avatar: "Avatar",
          coverImageUrl: "Cover image",
          bio: "Bio",
          about: "About",
          portfolioUrl: "Website",
          twitterUrl: "X / Twitter",
          linkedInUrl: "LinkedIn",
          youtubeUrl: "YouTube",
          instagramUrl: "Instagram",
          githubUrl: "GitHub",
          timezone: "Timezone",
        }}
      />

      {/* Review panel — anchored to the fields a teammate is most
          likely to flag (bio, photo, links). */}
      <ReviewPanel
        open={reviewsOpen}
        onOpenChange={setReviewsOpen}
        api={reviews}
        title="Profile reviews"
        description="Threaded notes anchored to specific fields. Useful when a co-instructor proofreads your bio."
        anchorOptions={[
          { kind: "field", target: "avatar", label: "Avatar" },
          { kind: "field", target: "coverImageUrl", label: "Cover image" },
          { kind: "field", target: "bio", label: "Bio" },
          { kind: "field", target: "timezone", label: "Timezone" },
          { kind: "section", target: "socials", label: "Social & web links" },
        ]}
      />
    </div>
  )
}

// ───── BioCount — colour ladder for live char counter ──────────────

function BioCount({ value }: { value: string }) {
  const len = value.length
  const ratio = len / BIO_LIMIT
  const tone =
    ratio < 0.7 ? "text-muted-foreground" :
      ratio < 0.95 ? "text-amber-600 dark:text-amber-400" :
        "text-destructive"
  return (
    <span className={cn("tabular-nums", tone)}>
      {len} / {BIO_LIMIT}{value.length >= BIO_LIMIT * 0.9 && " · approaching the limit"}
    </span>
  )
}

// ───── SocialField — per-platform validated input ──────────────────

function SocialField({
  platform,
  value,
  onChange,
}: {
  platform: SocialPlatform
  value: string
  onChange: (v: string) => void
}) {
  const spec = PLATFORMS[platform]
  const [touched, setTouched] = useState(false)
  const result = useMemo(() => validateSocialUrl(platform, value), [platform, value])

  return (
    <div className="space-y-1.5">
      <Label className="text-[12px]">{spec.label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          setTouched(true)
          // Auto-normalise on blur — `@you` becomes `https://x.com/you`,
          // `github.com/you` becomes `https://github.com/you`, etc.
          if (result.normalised && result.normalised !== value) {
            onChange(result.normalised)
          }
        }}
        placeholder={spec.example}
        aria-invalid={touched && !result.ok}
        className={cn(
          touched && !result.ok && "border-destructive focus-visible:ring-destructive/30",
          touched && result.ok && result.warning && "border-amber-500/60",
        )}
      />
      {touched && result.error && (
        <p className="text-[11px] text-destructive">{result.error}</p>
      )}
      {touched && !result.error && result.warning && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">{result.warning}</p>
      )}
    </div>
  )
}

// ───── AiBioAssistDialog — generates 3 draft bios ──────────────────

function AiBioAssistDialog({
  open,
  onOpenChange,
  currentName,
  currentRole,
  currentBio,
  onPick,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  currentName: string
  currentRole: string
  currentBio: string
  onPick: (text: string) => void
}) {
  // We use a stack of opinionated templates rather than calling out
  // to an external API for the POC. Each one swaps in name + role
  // + uses any existing keywords from the current bio so suggestions
  // feel personal. A future v2 swaps this for /api/ai/refine.
  const drafts = useMemo(() => {
    const first = currentName.split(/\s+/)[0] || "I"
    const role = currentRole === "admin" ? "founder & instructor" : currentRole
    const keyword = (currentBio.match(/\b([a-zA-Z]{5,})\b/g) ?? [])[0] ?? "teaching"
    return [
      {
        label: "Warm",
        text:
          `Hi! I'm ${first}, a ${role} who's been ${keyword} for the last few years. ` +
          `I love working with students who want clear, no-fluff explanations and a real plan for what to do next. ` +
          `Outside of teaching: long walks, slow cooking, the occasional weekend project.`,
      },
      {
        label: "Authoritative",
        text:
          `${currentName || "Instructor"} · ${role}. Eight years inside the craft, three years teaching it. ` +
          `Curriculum designed around the moves that actually move students forward — not the moves that look good in a syllabus. ` +
          `Specialises in ${keyword}.`,
      },
      {
        label: "Outcome-led",
        text:
          `${first} helps students go from "I think I get it" to "I can do this on my own" in ${keyword} — usually inside ${currentBio.includes("week") ? "a few weeks" : "a single cohort"
          }. ` +
          `Background: ${role}. Past students have gone on to careers, freelance gigs, and the kind of confidence that doesn't fade.`,
      },
    ]
  }, [currentName, currentRole, currentBio])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => onOpenChange(false)}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-bold tracking-tight">Help me write</h2>
        </div>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Three draft bios using your name + role + anything you&rsquo;ve already
          typed. Pick the closest one, then tweak. Generated locally — none of
          your data leaves your browser.
        </p>
        <div className="mt-4 space-y-2">
          {drafts.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => onPick(d.text)}
              className="group flex w-full flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {d.label}
              </span>
              <span className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                {d.text}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Use this <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </div>
    </div>
  )
}

// ───── Helpers ─────────────────────────────────────────────────────

function normaliseFor(platform: SocialPlatform, raw: string): string | undefined {
  const v = validateSocialUrl(platform, raw)
  if (!v.ok) return raw.trim() || undefined
  return v.normalised || undefined
}
