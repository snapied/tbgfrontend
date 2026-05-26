"use client"

// Per-Instructor public profile. Resolves the [handle] by checking
// curated faculty first, then falling back to a workspace user whose
// email-local-part matches. Renders hero + bio + socials + courses by
// this instructor.

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Globe,
  Github,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  Youtube,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Users,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { useStore } from "@/lib/store-store"
import { formatMoney } from "@/lib/currency"
import { ExternalLink } from "@/components/ui/external-link"
import { RichTextContent, isRichTextEmpty, stripRichTextTags } from "@/components/editor/rich-text-content"
import { cn } from "@/lib/utils"
import { Quote, Star, BookOpen } from "lucide-react"
import { gradientFor } from "@/lib/handle-gradient"
import { TenantBrandedQuoteCard } from "@/components/portal/branded-quote-card"

// Cross-tenant fallback: when the current tenant doesn't host this
// handle, walk every persisted tenant's lms.users.v1 slice in
// localStorage and return the slug of the first match. Lets stale
// links like /p/default/instructors/<handle> still find the right
// workspace and redirect there instead of 404ing.
function findTenantForHandle(handle: string): string | null {
  if (typeof window === "undefined") return null
  const prefix = "thebigclass.t."
  const suffix = ".lms.users.v1"
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith(prefix) || !key.endsWith(suffix)) continue
      const slug = key.slice(prefix.length, key.length - suffix.length)
      if (!slug) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const arr = JSON.parse(raw) as Array<{ email?: string }>
      if (!Array.isArray(arr)) continue
      if (arr.some((u) => (u.email ?? "").split("@")[0] === handle)) {
        return slug
      }
    }
  } catch {
    /* malformed slice — fall through */
  }
  return null
}

export default function PortalTeacherDetailsClient({
  params,
}: {
  params: Promise<{ tenant: string; handle: string }>
}) {
  const { tenant, handle: rawHandle } = use(params)
  // Next leaves the slug URL-encoded for special chars like `+`. A
  // user `drawat+2@gmail.com` produces handle `drawat+2`, which
  // routes as `/instructors/drawat%2B2`. We have to decodeURIComponent
  // it before the email-local-part lookup, otherwise the comparison
  // never matches and every special-char handle 404s.
  const handle = useMemo(() => {
    try {
      return decodeURIComponent(rawHandle)
    } catch {
      return rawHandle
    }
  }, [rawHandle])
  const router = useRouter()
  const { faculty, testimonials, posts } = usePortal()
  const { users, courses, getUserById } = useLMS()
  const { products: storeProducts } = useStore()
  const basePath = `/p/${tenant}`
  const [redirectChecked, setRedirectChecked] = useState(false)

  // Resolution: curated faculty first, then a workspace user whose
  // email-local-part matches the handle (so /instructors/jane-doe works
  // for jane-doe@school.com even if she's not in the curated list yet).
  const member = useMemo(() => {
    const fac = faculty.find((m) => m.handle === handle)
    if (fac) {
      const u = fac.userId ? getUserById(fac.userId) : undefined
      return {
        name: fac.name,
        role: fac.role,
        // bio = short Bio (plain text, ≤55 chars)
        // about = long-form Tiptap HTML for the About card
        // Curated faculty entry wins per-field so a workspace
        // can override the personal profile without touching it.
        bio: fac.bio ?? u?.bio,
        about: fac.about ?? u?.about,
        photo: fac.photo ?? u?.avatar,
        cover: fac.coverImageUrl ?? u?.coverImageUrl,
        expertise: fac.expertise ?? [],
        socials: fac.socials ?? {},
        linkedUserId: fac.userId,
      }
    }
    const u = users.find((u) => u.email.split("@")[0] === handle)
    if (!u) return null
    return {
      name: u.name,
      role: u.role.charAt(0).toUpperCase() + u.role.slice(1),
      bio: u.bio,
      about: u.about,
      photo: u.avatar,
      cover: u.coverImageUrl,
      expertise: [] as string[],
      socials: {
        twitter: u.twitterUrl,
        linkedin: u.linkedInUrl,
        youtube: u.youtubeUrl,
        instagram: u.instagramUrl,
        github: u.githubUrl,
        email: u.portfolioUrl,
      },
      linkedUserId: u.id,
    }
  }, [faculty, users, getUserById, handle])

  // Courses authored by this instructor — links via the linked user id
  // (or by name fallback when no user is linked).
  const taughtCourses = useMemo(() => {
    if (!member) return []
    return courses.filter(
      (c) =>
        c.status === "published" &&
        (c.instructor.id === member.linkedUserId || c.instructor.name === member.name),
    )
  }, [courses, member])

  // Item 33 — testimonials about THIS instructor.
  // Attribution rules (best → worst signal):
  //   1. `aboutInstructorId` matches the resolved user id (explicit)
  //   2. `courseId` points to a course this instructor teaches (join)
  // Pending / rejected testimonials are excluded — public surfaces
  // only show "published" (or testimonials with no status, which is
  // the legacy default-published shape).
  const taughtCourseIds = useMemo(
    () => new Set(taughtCourses.map((c) => c.id)),
    [taughtCourses],
  )
  const aboutMeTestimonials = useMemo(() => {
    if (!member) return []
    return testimonials
      .filter((t) => !t.status || t.status === "published")
      .filter(
        (t) =>
          (t.aboutInstructorId && t.aboutInstructorId === member.linkedUserId) ||
          (t.courseId && taughtCourseIds.has(t.courseId)),
      )
      .sort((a, b) => {
        // Featured first, then most-recent.
        if (a.featured && !b.featured) return -1
        if (!a.featured && b.featured) return 1
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
      })
      .slice(0, 6)
  }, [member, testimonials, taughtCourseIds])

  // Item 34 — latest blog posts BY this instructor. Posts carry an
  // `authorId` field that matches the User id. We surface the most
  // recent three published posts.
  const latestPosts = useMemo(() => {
    if (!member?.linkedUserId) return []
    return posts
      .filter((p) => p.status === "published" && p.authorId === member.linkedUserId)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, 3)
  }, [member, posts])

  // First sentence of bio doubles as the hero tagline. If the
  // Instructor set a 55-char card-tagline bio it fits perfectly; if
  // they wrote a longer paragraph we clip at the first sentence so
  // the hero stays scannable. Declared above the null-return so
  // Rules of Hooks are satisfied (no conditional useMemo).
  const heroTagline = useMemo(() => {
    const bio = member?.bio
    if (!bio) return ""
    const firstSentence = bio.split(/(?<=[.!?])\s+/)[0]
    return firstSentence.length > 120
      ? firstSentence.slice(0, 117) + "…"
      : firstSentence
  }, [member])

  // Featured course pick. Teacher-set override wins (any course
  // with `featureOnInstructorProfile: true`); ties broken by oldest
  // createdAt so a recently-flagged course doesn't yank the rail
  // away from the previous winner unexpectedly. Without an override
  // we fall back to the auto-pick (highest enrolment) so every
  // teacher's rail still has *something* sensible without manual
  // curation.
  const featuredCourse = useMemo(() => {
    if (taughtCourses.length === 0) return null
    const overrides = taughtCourses
      .filter((c) => c.featureOnInstructorProfile)
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
    if (overrides.length > 0) return overrides[0]
    return [...taughtCourses].sort(
      (a, b) => (b.enrolledCount ?? 0) - (a.enrolledCount ?? 0),
    )[0]
  }, [taughtCourses])

  // Context-aware secondary CTA. The hero pair was previously
  // "Explore courses" + always "Send a message". Now the secondary
  // changes shape based on what the teacher actually offers:
  //   • If they have a 1-on-1 session product → "Book a call"
  //   • Else if any taught course is free → "Try a free lesson"
  //   • Else fall back to "Send a message" → /contact
  // Pick is memoised on the inputs so re-renders don't redo the
  // scan. Returns the link the button should point at + label.
  const secondaryCta = useMemo(() => {
    // Sessions tied to this teacher's name (or any session product
    // when we can't pin one to the teacher — single-instructor
    // workspaces are common and the visitor's intent is the same).
    const session = storeProducts.find(
      (p) =>
        p.status === "published" &&
        p.kind === "session" &&
        // Soft attribution: session products don't carry an
        // instructor id today, so on a multi-faculty workspace we
        // only surface "Book a call" when there's a single session
        // product OR the teacher's name appears in the title.
        (storeProducts.filter((q) => q.status === "published" && q.kind === "session").length === 1 ||
          p.title.toLowerCase().includes(member?.name.toLowerCase() ?? "___never")),
    )
    if (session) {
      return {
        label: "Book a call",
        href: `${basePath}/store/${session.slug}`,
      }
    }
    const freeCourse = taughtCourses.find((c) => (c.price ?? 0) === 0)
    if (freeCourse) {
      return {
        label: "Try a free lesson",
        href: `${basePath}/courses/details/${freeCourse.slug}`,
      }
    }
    return {
      label: "Send a message",
      href: `${basePath}/contact?from=${encodeURIComponent(member?.name ?? "")}`,
    }
    // member is referenced for `.name` only; keep it in deps.
  }, [storeProducts, taughtCourses, basePath, member])

  // When this tenant doesn't host the handle, look across every
  // persisted tenant in localStorage and bounce to the right one
  // before showing the 404. This salvages stale links (e.g. shared
  // before the source page started passing the URL tenant through)
  // without changing how the page resolves locally.
  useEffect(() => {
    if (member || redirectChecked) return
    const other = findTenantForHandle(handle)
    setRedirectChecked(true)
    if (other && other !== tenant) {
      router.replace(`/p/${other}/instructors/${handle}`)
    }
  }, [member, redirectChecked, handle, tenant, router])

  if (!member) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Instructor not found</h1>
        <p className="mt-2 text-muted-foreground">
          No one with the handle <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{handle}</code> teaches here.
        </p>
        <Button asChild className="mt-5" variant="outline">
          <Link href={`${basePath}/instructors`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> All teachers
          </Link>
        </Button>
      </div>
    )
  }

  // Roll up trust numbers in one place so the hero, rail, and bottom
  // CTA stay in sync. Avg rating is computed from instructor-scoped
  // testimonials that carry a rating (0..5). Zero-rated and unrated
  // testimonials don't get counted in the denominator. These are
  // plain reductions (no hooks) so they can live below the early
  // return — `member` is non-null from here on.
  const totalStudents = taughtCourses.reduce((acc, c) => acc + (c.enrolledCount ?? 0), 0)
  const ratedTestimonials = aboutMeTestimonials.filter(
    (t) => typeof t.rating === "number" && t.rating > 0,
  )
  const avgRating =
    ratedTestimonials.length > 0
      ? ratedTestimonials.reduce((acc, t) => acc + (t.rating ?? 0), 0) /
      ratedTestimonials.length
      : 0

  const firstName = member.name.split(" ")[0]

  return (
    <div>
      {/* Hero — centered profile card. The previous layout used a
          full-bleed cover with a left-anchored photo, which left
          the photo looking like an island inside a max-width
          column while the cover bled past it. That made the role
          chips, name, and CTAs feel disconnected from the photo.
          New layout is symmetric:
            • cover sits inside the content column (no edge bleed)
            • photo centered, overlapping the cover bottom edge
            • everything else (chips, name, tagline, meta, CTAs,
              socials) is centered directly under the photo
          The whole hero reads as ONE card where the photo is the
          anchor and every other piece points back at it. */}
      <section className="mx-auto max-w-5xl px-4 pt-8 pb-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Banner — contained inside the card, not full-bleed.
              Shorter than before (h-40 → h-52) so the photo
              dominates the visual hierarchy. */}
          <div className="relative h-40 w-full overflow-hidden sm:h-52">
            {member.cover ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={member.cover}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {/* Subtle bottom fade so the photo's ring blends
                    into the banner instead of jumping. */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card via-card/60 to-transparent" />
              </>
            ) : (
              <div
                className="h-full w-full"
                style={{ background: gradientFor(handle) }}
              />
            )}
          </div>

          {/* Photo — centered, overlapping the banner by half its
              height. Square with rounded corners + ring matches
              the card's chrome so the photo reads as part of the
              card, not an applique. */}
          <div className="-mt-16 flex justify-center sm:-mt-20">
            {member.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.photo}
                alt={member.name}
                className="h-32 w-32 rounded-2xl object-cover shadow-lg ring-4 ring-card sm:h-40 sm:w-40 p-relative"
              />
            ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-lg ring-4 ring-card sm:h-40 sm:w-40 position-relative">
                {member.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
            )}
          </div>

          {/* Identity block — centered, narrow column under the
              photo. Tight vertical rhythm: chips → name →
              tagline. No negative margins, no flex tricks — the
              photo above is the only anchor. */}
          <div className="mx-auto mt-4 flex max-w-2xl flex-col items-center px-6 text-center sm:px-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <CheckCircle2 className="h-3 w-3" /> Verified instructor
              </span>
              {member.role && (
                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {member.role}
                </span>
              )}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
              {member.name}
            </h1>
            {heroTagline && (
              <p className="mt-3 text-sm text-foreground/80 sm:text-base">
                {heroTagline}
              </p>
            )}

            {/* Meta strip — by-the-numbers in one inline row,
                centered. Hidden when there's literally nothing to
                show so a cold profile stays clean. */}
            {(taughtCourses.length > 0 ||
              totalStudents > 0 ||
              avgRating > 0) && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
                  {taughtCourses.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <strong className="font-semibold">{taughtCourses.length}</strong>
                      <span className="text-muted-foreground">
                        course{taughtCourses.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  )}
                  {totalStudents > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-primary" />
                      <strong className="font-semibold">
                        {totalStudents.toLocaleString()}
                      </strong>
                      <span className="text-muted-foreground">students taught</span>
                    </span>
                  )}
                  {avgRating > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      <strong className="font-semibold">{avgRating.toFixed(1)}</strong>
                      <span className="text-muted-foreground">
                        ({ratedTestimonials.length} review
                        {ratedTestimonials.length === 1 ? "" : "s"})
                      </span>
                    </span>
                  )}
                </div>
              )}

            {/* CTAs — centered button pair. The page already has a
                bottom-of-page conversion banner; the hero pair is
                the primary lever. */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {taughtCourses.length > 0 && (
                <Button asChild size="lg" className="h-11">
                  <a href="#courses">
                    Explore courses
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="h-11">
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            </div>

            {/* Socials — separated under the CTAs so the icons
                don't compete with the buttons for click weight. */}
            {Object.values(member.socials).some(Boolean) && (
              <div className="mt-5 flex justify-center pb-8">
                <SocialIcons socials={member.socials} />
              </div>
            )}
            {!Object.values(member.socials).some(Boolean) && <div className="pb-8" />}
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {/* About card. Renders the long-form `about` HTML (rich
                text) when set — falls back to the short `bio`
                tagline as a single paragraph for legacy profiles
                that only have the old single-field bio populated.
                Both are skipped when there's nothing meaningful to
                show. */}
            {(() => {
              const hasAbout = member.about && !isRichTextEmpty(member.about)
              if (!hasAbout && !member.bio) return null
              return (
                <TenantBrandedQuoteCard
                  icon={<Sparkles className="h-4 w-4" />}
                  eyebrow="About"
                  title={`About ${firstName}`}
                >
                  {hasAbout ? (
                    <RichTextContent html={member.about ?? ""} />
                  ) : (
                    <p className="whitespace-pre-wrap">{member.bio}</p>
                  )}
                </TenantBrandedQuoteCard>
              )
            })()}
            {member.expertise && member.expertise.length > 0 && (
              <div>
                <h2 className="mb-3 font-serif text-xl font-bold tracking-tight">
                  Teaches
                </h2>
                <div className="flex flex-wrap gap-2">
                  {member.expertise.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-sm font-medium text-primary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Courses by this instructor */}
            {taughtCourses.length > 0 && (
              <div id="courses" className="scroll-mt-24">
                <h2 className="mb-4 font-serif text-2xl font-bold tracking-tight">
                  Courses by {firstName}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {taughtCourses.map((c) => (
                    <Link key={c.id} href={`${basePath}/courses/details/${c.slug}`} className="group block">
                      <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
                        <div className="aspect-video overflow-hidden bg-muted">
                          <img
                            src={c.thumbnail || "/placeholder.svg?height=400&width=600"}
                            alt={c.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="line-clamp-2 font-semibold group-hover:text-primary">
                            {c.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {stripRichTextTags(c.description).slice(0, 120)}
                          </p>
                          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                            <span className="text-base font-bold">
                              {c.price > 0 ? formatMoney(c.price, c.currency) : "Free"}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">{c.level}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Item 33 — What students say about this instructor. */}
            {aboutMeTestimonials.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-bold tracking-tight">
                  <Quote className="h-5 w-5 text-primary" />
                  What students say
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {aboutMeTestimonials.map((t) => (
                    <Card key={t.id} className={cn(t.featured && "ring-1 ring-primary/30")}>
                      <CardContent className="space-y-3 p-5">
                        {typeof t.rating === "number" && t.rating > 0 && (
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  i < (t.rating ?? 0) ? "fill-current" : "opacity-30",
                                )}
                                aria-hidden
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-sm leading-relaxed text-foreground">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 border-t border-border/60 pt-3">
                          {t.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={t.avatar}
                              alt={`${t.authorName} photo`}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                              {(t.authorName ?? "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-semibold">{t.authorName}</p>
                            {t.authorRole && (
                              <p className="truncate text-[11px] text-muted-foreground">{t.authorRole}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Item 34 — Latest writing rail. */}
            {latestPosts.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-bold tracking-tight">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Latest writing
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {latestPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`${basePath}/blog/${post.slug}`}
                      className="group block"
                    >
                      <Card className="h-full overflow-hidden py-0 transition-shadow group-hover:shadow-md">
                        {post.coverImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-[1.02]"
                          />
                        )}
                        <CardContent className="space-y-1.5 p-4">
                          <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug group-hover:text-primary">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="line-clamp-2 text-[11.5px] text-muted-foreground">
                              {post.excerpt}
                            </p>
                          )}
                          {post.publishedAt && (
                            <p className="text-[10.5px] text-muted-foreground">
                              {new Date(post.publishedAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
                <div className="mt-3">
                  <Link
                    href={`${basePath}/blog`}
                    className="text-[12px] font-semibold text-primary hover:underline"
                  >
                    See all writing →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {featuredCourse && (
              <Card className="overflow-hidden border-primary/20 py-0 shadow-md">
                {featuredCourse.thumbnail && (
                  <Link
                    href={`${basePath}/courses/details/${featuredCourse.slug}`}
                    className="block aspect-video overflow-hidden bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredCourse.thumbnail}
                      alt={featuredCourse.title}
                      className="h-full w-full object-cover transition-transform hover:scale-[1.03]"
                    />
                  </Link>
                )}
                <CardContent className="space-y-3 p-5">
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </div>
                  <h3 className="line-clamp-2 font-serif text-lg font-bold tracking-tight">
                    {featuredCourse.title}
                  </h3>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold">
                      {featuredCourse.price > 0
                        ? formatMoney(featuredCourse.price, featuredCourse.currency)
                        : "Free"}
                    </span>
                    {(featuredCourse.enrolledCount ?? 0) > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {(featuredCourse.enrolledCount ?? 0).toLocaleString()} enrolled
                      </span>
                    )}
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`${basePath}/courses/details/${featuredCourse.slug}`}>
                      Enrol now
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold">By the numbers</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Courses</dt>
                    <dd className="font-semibold">{taughtCourses.length}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Students taught</dt>
                    <dd className="font-semibold">
                      {totalStudents.toLocaleString()}
                    </dd>
                  </div>
                  {avgRating > 0 && (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Avg rating</dt>
                      <dd className="inline-flex items-center gap-1 font-semibold">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {avgRating.toFixed(1)}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold">Have a question?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Send a message and we&apos;ll reach out within a business day.
                </p>
                <Button asChild variant="outline" className={cn("mt-3 w-full")}>
                  <Link href={`${basePath}/contact?from=${encodeURIComponent(member.name)}`}>Send a message</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      {/* Bottom conversion banner — last-chance CTA for visitors
          who scrolled past the courses grid without clicking. Only
          rendered when there's actually something to enrol in. */}
      {taughtCourses.length > 0 && (
        <section className="border-t border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-6 py-14 text-center lg:px-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <GraduationCap className="h-3.5 w-3.5" />
              Learn with {firstName}
            </div>
            <h2 className="max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to start your journey with {firstName}?
            </h2>
            <p className="max-w-xl text-muted-foreground">
              {totalStudents > 0
                ? `Join ${totalStudents.toLocaleString()} students already learning from ${firstName}.`
                : `Be among the first students of ${firstName} on this platform.`}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Button asChild size="lg" className="h-11">
                <a href="#courses">
                  Browse all courses
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11">
                <Link href={`${basePath}/contact?from=${encodeURIComponent(member.name)}`}>Have a question first?</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function SocialIcons({
  socials,
}: {
  socials: {
    twitter?: string
    linkedin?: string
    youtube?: string
    instagram?: string
    github?: string
    facebook?: string
    email?: string
  }
}) {
  const items: Array<{ href: string; Icon: typeof Twitter; label: string }> = []
  if (socials.twitter) items.push({ href: socials.twitter, Icon: Twitter, label: "Twitter" })
  if (socials.linkedin) items.push({ href: socials.linkedin, Icon: Linkedin, label: "LinkedIn" })
  if (socials.youtube) items.push({ href: socials.youtube, Icon: Youtube, label: "YouTube" })
  if (socials.instagram) items.push({ href: socials.instagram, Icon: Instagram, label: "Instagram" })
  if (socials.github) items.push({ href: socials.github, Icon: Github, label: "GitHub" })
  if (socials.email) {
    const isUrl = /^https?:\/\//.test(socials.email)
    items.push({
      href: isUrl ? socials.email : `mailto:${socials.email}`,
      Icon: isUrl ? Globe : Mail,
      label: "Website",
    })
  }
  if (items.length === 0) return null
  return (
    <div className="flex items-center gap-2 pb-2">
      {items.map((it, i) => (
        <ExternalLink
          key={i}
          href={it.href}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          aria-label={it.label}
        >
          <it.Icon className="h-4 w-4" />
        </ExternalLink>
      ))}
    </div>
  )
}
