"use client"

// One file, all 14 section renderers. Kept together because:
//   • Each renderer is small (a few dozen lines of JSX).
//   • The page builder dispatches by `kind`, so having them co-located
//     makes adding a new section a single-file change.
//   • Section configs are intentionally loose (Record<string, unknown>);
//     each renderer's getX() helpers normalize once at the top so the
//     JSX stays readable.
//
// The renderers are presentational only. Data-aware sections
// (courses-grid, testimonials, faculty, blog-teaser) read from the
// portal store + lms-store via props, NOT directly — so the page editor
// can pass a draft preview without committing.

import { useState, type CSSProperties, type ReactNode, type FormEvent } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Quote,
  Star,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  RichTextContent,
  stripRichTextTags,
} from "@/components/editor/rich-text-content"
import {
  type PortalSection,
  type PortalFacultyMember,
  type PortalTestimonial,
  type PortalBlogPost,
} from "@/lib/portal-store"

// Public courses are referenced by id from courses-grid sections. The
// renderer takes a thin shape rather than the full Course interface so
// it can be hydrated from either lms-store or a future server fetch
// without leaking types.
export interface PortalCourseLite {
  id: string
  slug: string
  title: string
  description?: string
  thumbnail?: string
  category?: string
  level?: string
  rating?: number
  reviewCount?: number
  enrolledCount?: number
  price?: number
  originalPrice?: number
  currency?: string
}

export interface PortalStoreProductLite {
  id: string
  slug: string
  title: string
  subtitle?: string
  coverImageUrl?: string
  kind: string
  priceLabel: string
}

export interface PortalDataset {
  courses: PortalCourseLite[]
  faculty: PortalFacultyMember[]
  testimonials: PortalTestimonial[]
  posts: PortalBlogPost[]
  storeProducts: PortalStoreProductLite[]
  // Routing helpers — the public portal lives at /p/[tenant]/...; this
  // lets every link prefix itself correctly.
  basePath: string
  // Currency formatter — passed in so the section doesn't have to import
  // currency utils and pick a fallback.
  formatMoney: (amount: number, currency?: string) => string
  // Where lead submissions go. The contact-form section POSTs to it.
  submitLead: (payload: {
    formId: string
    pageSlug: string
    name?: string
    email: string
    phone?: string
    message?: string
    fields?: Record<string, string>
  }) => Promise<void>
}

export function SectionRenderer({
  section,
  dataset,
  pageSlug,
}: {
  section: PortalSection
  dataset: PortalDataset
  pageSlug: string
}) {
  if (section.hidden) return null
  switch (section.kind) {
    case "hero": return <Hero section={section} basePath={dataset.basePath} />
    case "features": return <Features section={section} />
    case "courses-grid": return <CoursesGrid section={section} dataset={dataset} />
    case "store-grid": return <StoreGrid section={section} dataset={dataset} />
    case "testimonials": return <Testimonials section={section} dataset={dataset} />
    case "faculty": return <Faculty section={section} dataset={dataset} />
    case "cta": return <CTA section={section} basePath={dataset.basePath} />
    case "rich-text": return <RichTextSection section={section} />
    case "faq": return <FAQ section={section} />
    case "stats": return <Stats section={section} />
    case "contact-form": return <ContactForm section={section} dataset={dataset} pageSlug={pageSlug} />
    case "blog-teaser": return <BlogTeaser section={section} dataset={dataset} />
    case "video": return <VideoSection section={section} />
    case "image-gallery": return <ImageGallery section={section} />
    case "logos-strip": return <LogosStrip section={section} />
    default: return null
  }
}

// ============================================================
// Helpers — config readers + shared wrappers
// ============================================================

function str(v: unknown, fb = ""): string { return typeof v === "string" ? v : fb }
function num(v: unknown, fb = 0): number { return typeof v === "number" ? v : fb }
function arr<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : [] }
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {}
}

function SectionWrap({
  children,
  bg,
  className,
}: {
  children: ReactNode
  bg?: string
  className?: string
}) {
  return (
    <section
      className={cn("relative px-6 py-16 sm:py-20 lg:px-8", className)}
      style={bg ? ({ background: bg } as CSSProperties) : undefined}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

// Internal links stay <Link>; external (anything starting with http) gets
// rel=noopener so we don't leak the referrer.
function CtaButton({
  href,
  label,
  variant = "default",
  basePath,
}: {
  href: string
  label: string
  variant?: "default" | "outline"
  basePath: string
}) {
  const isExternal = /^https?:\/\//.test(href)
  const finalHref = isExternal ? href : prefix(basePath, href)
  if (isExternal) {
    return (
      <Button variant={variant} asChild>
        <a href={finalHref} target="_blank" rel="noopener noreferrer nofollow">
          {label}
        </a>
      </Button>
    )
  }
  return (
    <Button variant={variant} asChild>
      <Link href={finalHref}>{label}</Link>
    </Button>
  )
}

function prefix(basePath: string, path: string): string {
  if (!path) return basePath || "/"
  if (path.startsWith("/")) return (basePath || "") + path
  return path
}

// ============================================================
// Renderers
// ============================================================

function Hero({ section, basePath }: { section: PortalSection; basePath: string }) {
  const c = section.config
  const eyebrow = str(c.eyebrow)
  const headline = str(c.headline, "A line that sells the dream")
  const subhead = str(c.subhead)
  const primary = obj(c.primaryCta) as { label?: string; href?: string }
  const secondary = obj(c.secondaryCta) as { label?: string; href?: string }
  const bgImage = str(c.backgroundImage)
  const align = str(c.alignment, "center") as "left" | "center"
  const overlay = num(c.overlayOpacity, bgImage ? 0.55 : 0)

  // Use color-mix to blend primary/accent with transparent and let
  // the page background show through the middle. Previously this
  // hard-stopped through `var(--background)`, which painted a
  // light-cream band over dark templates (Studio, Midnight) — making
  // headline text invisible. Transparent middle = whatever's behind
  // (template gradient, solid color, etc.) shows through cleanly.
  const bg = bgImage
    ? `url("${bgImage}") center/cover`
    : "linear-gradient(135deg, color-mix(in oklch, var(--primary) 12%, transparent) 0%, transparent 50%, color-mix(in oklch, var(--accent) 14%, transparent) 100%)"

  return (
    <section
      className="relative overflow-hidden border-b border-border"
      style={{ background: bg }}
    >
      {bgImage && overlay > 0 && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} />
      )}
      <div
        className={cn(
          "relative mx-auto max-w-5xl px-6 py-20 sm:py-28 lg:px-8",
          align === "center" ? "text-center" : "text-left",
        )}
      >
        {eyebrow && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              bgImage
                ? "border-white/30 bg-white/10 text-white"
                : "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </span>
        )}
        <h1
          className={cn(
            "mt-5 font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl",
            bgImage ? "text-white" : "text-foreground",
          )}
        >
          {headline}
        </h1>
        {subhead && (
          <p
            className={cn(
              "mx-auto mt-4 max-w-2xl text-lg",
              bgImage ? "text-white/90" : "text-muted-foreground",
              align === "left" && "mx-0",
            )}
          >
            {subhead}
          </p>
        )}
        {(primary.label || secondary.label) && (
          <div
            className={cn(
              "mt-8 flex flex-wrap items-center gap-3",
              align === "center" ? "justify-center" : "justify-start",
            )}
          >
            {primary.label && primary.href && (
              <CtaButton href={primary.href} label={primary.label} basePath={basePath} />
            )}
            {secondary.label && secondary.href && (
              <CtaButton
                href={secondary.href}
                label={secondary.label}
                variant="outline"
                basePath={basePath}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function Features({ section }: { section: PortalSection }) {
  const c = section.config
  const heading = str(c.heading)
  const subhead = str(c.subhead)
  const items = arr<{ title?: string; body?: string; icon?: string }>(c.items)
  if (items.length === 0) return null
  return (
    <SectionWrap>
      {(heading || subhead) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {heading && (
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {heading}
            </h2>
          )}
          {subhead && <p className="mt-3 text-lg text-muted-foreground">{subhead}</p>}
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{str(it.title, "Feature")}</h3>
              {it.body && <p className="mt-2 text-sm text-muted-foreground">{it.body}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionWrap>
  )
}

function CoursesGrid({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const c = section.config
  const heading = str(c.heading, "Courses")
  const mode = str(c.mode, "popular") as
    | "all" | "popular" | "featured" | "by-category" | "hand-picked"
  const limit = num(c.limit, 6)
  const category = str(c.category)
  const picks = arr<string>(c.pickedIds)

  let list = dataset.courses.slice()
  if (mode === "by-category") list = list.filter((x) => x.category === category)
  else if (mode === "hand-picked") {
    list = picks
      .map((id) => list.find((x) => x.id === id))
      .filter((x): x is PortalCourseLite => !!x)
  } else if (mode === "popular") {
    list.sort((a, b) => (b.enrolledCount ?? 0) - (a.enrolledCount ?? 0))
  } else if (mode === "featured") {
    list.sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        (b.enrolledCount ?? 0) - (a.enrolledCount ?? 0),
    )
  }
  list = list.slice(0, limit)

  return (
    <SectionWrap className="bg-card/40">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
          {heading}
        </h2>
        <Link
          href={prefix(dataset.basePath, "/courses")}
          className="text-sm font-medium text-primary hover:underline"
        >
          See all →
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((course) => (
            <Link
              key={course.id}
              href={prefix(dataset.basePath, `/courses/details/${course.slug}`)}
              className="group block"
            >
              <Card className="overflow-hidden py-0 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <img
                    src={course.thumbnail || "/placeholder.svg?height=400&width=600"}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <CardContent className="p-5">
                  {course.category && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {course.category}
                    </span>
                  )}
                  <h3 className="mt-2 line-clamp-2 font-semibold text-foreground group-hover:text-primary">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {stripRichTextTags(course.description).slice(0, 160)}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-lg font-bold">
                      {(course.price ?? 0) > 0
                        ? dataset.formatMoney(course.price ?? 0, course.currency)
                        : "Free"}
                    </span>
                    {course.rating ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        <span className="font-medium text-foreground">{course.rating.toFixed(1)}</span>
                        <span>({course.reviewCount ?? 0})</span>
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </SectionWrap>
  )
}

function StoreGrid({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const c = section.config
  const heading = str(c.heading, "Shop")
  const subhead = str(c.subhead, "Courses, sessions, downloads — everything we sell.")
  const limit = num(c.limit, 6)
  const kindFilter = str(c.kind, "all")

  let list = dataset.storeProducts.slice()
  if (kindFilter && kindFilter !== "all") {
    list = list.filter((p) => p.kind === kindFilter)
  }
  list = list.slice(0, limit)

  return (
    <SectionWrap className="bg-card/40">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            {heading}
          </h2>
          {subhead && <p className="mt-1 text-sm text-muted-foreground">{subhead}</p>}
        </div>
        <Link
          href={prefix(dataset.basePath, "/store")}
          className="text-sm font-medium text-primary hover:underline"
        >
          See shop →
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing published in the shop yet.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Link
              key={p.id}
              href={prefix(dataset.basePath, `/store/${p.slug}`)}
              className="group block"
            >
              <Card className="h-full overflow-hidden py-0 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {p.coverImageUrl ? (
                    <img
                      src={p.coverImageUrl}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
                  )}
                </div>
                <CardContent className="p-5">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    {p.kind.replace(/-/g, " ")}
                  </span>
                  <h3 className="mt-2 line-clamp-2 font-semibold group-hover:text-primary">
                    {p.title}
                  </h3>
                  {p.subtitle && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.subtitle}</p>
                  )}
                  <p className="mt-3 border-t border-border pt-3 text-lg font-bold">
                    {p.priceLabel}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </SectionWrap>
  )
}

function Testimonials({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const c = section.config
  const heading = str(c.heading, "What students say")
  const source = str(c.source, "featured") as "all" | "featured"
  // Public surfaces only ever render testimonials the teacher has
  // explicitly approved. Student-submitted ones land with
  // status="pending" and stay hidden until the teacher publishes
  // them from /dashboard/portal/testimonials. Pre-status-field
  // records (undefined) treat as published for backwards compat.
  const approved = dataset.testimonials.filter(
    (t) => t.status === undefined || t.status === "published",
  )
  const list =
    source === "featured" ? approved.filter((t) => t.featured) : approved
  if (list.length === 0) return null
  return (
    <SectionWrap>
      <h2 className="mb-10 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {heading}
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.slice(0, 9).map((t) => (
          <Card key={t.id}>
            <CardContent className="p-6">
              <Quote className="h-5 w-5 text-accent" />
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">“{t.quote}”</p>
              {t.rating ? (
                <div className="mt-3 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i <= (t.rating ?? 0)
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                {t.avatar ? (
                  <img
                    src={t.avatar}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {t.authorName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.authorName}</p>
                  {t.authorRole && (
                    <p className="truncate text-xs text-muted-foreground">{t.authorRole}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionWrap>
  )
}

function Faculty({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const c = section.config
  const heading = str(c.heading, "Meet the team")
  const mode = str(c.members, "all") as "all" | "hand-picked"
  const picks = arr<string>(c.pickedIds)
  let list = dataset.faculty.slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  if (mode === "hand-picked") {
    list = picks
      .map((id) => list.find((m) => m.id === id))
      .filter((x): x is PortalFacultyMember => !!x)
  }
  if (list.length === 0) return null
  return (
    <SectionWrap>
      <h2 className="mb-10 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {heading}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <Link
            key={m.id}
            href={prefix(dataset.basePath, `/teachers/${m.handle}`)}
            className="group block"
          >
            <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
              <div
                className="relative h-24 w-full bg-muted"
                style={
                  m.coverImageUrl
                    ? undefined
                    : { background: "linear-gradient(135deg, var(--primary), var(--accent))" }
                }
              >
                {m.coverImageUrl && (
                  <img src={m.coverImageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <CardContent className="-mt-8 p-5">
                <div className="flex items-end gap-3">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-card"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground ring-4 ring-card">
                      {m.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 pb-1">
                    <p className="truncate font-semibold group-hover:text-primary">{m.name}</p>
                    {m.role && (
                      <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                    )}
                  </div>
                </div>
                {m.bio && (
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.bio}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </SectionWrap>
  )
}

function CTA({ section, basePath }: { section: PortalSection; basePath: string }) {
  const c = section.config
  const headline = str(c.headline, "Ready to start?")
  const subhead = str(c.subhead)
  const primary = obj(c.primaryCta) as { label?: string; href?: string }
  return (
    <SectionWrap>
      <Card className="overflow-hidden border-primary/20 bg-primary/[0.04]">
        <CardContent className="flex flex-col items-center justify-between gap-6 p-10 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              {headline}
            </h2>
            {subhead && <p className="mt-2 text-muted-foreground">{subhead}</p>}
          </div>
          {primary.label && primary.href && (
            <CtaButton href={primary.href} label={primary.label} basePath={basePath} />
          )}
        </CardContent>
      </Card>
    </SectionWrap>
  )
}

function RichTextSection({ section }: { section: PortalSection }) {
  const html = str(section.config.html)
  if (!html.trim()) return null
  return (
    <SectionWrap>
      <RichTextContent html={html} className="mx-auto max-w-3xl" />
    </SectionWrap>
  )
}

function FAQ({ section }: { section: PortalSection }) {
  const c = section.config
  const heading = str(c.heading, "Frequently asked")
  const items = arr<{ q?: string; a?: string }>(c.items)
  if (items.length === 0) return null
  return (
    <SectionWrap>
      <h2 className="mb-10 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {heading}
      </h2>
      <div className="mx-auto max-w-3xl divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((it, i) => (
          <details key={i} className="group p-5">
            <summary className="flex cursor-pointer items-center justify-between font-medium">
              {str(it.q, "Question")}
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            {it.a && (
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{it.a}</p>
            )}
          </details>
        ))}
      </div>
    </SectionWrap>
  )
}

function Stats({ section }: { section: PortalSection }) {
  const items = arr<{ value?: string; label?: string }>(section.config.items)
  if (items.length === 0) return null
  return (
    <SectionWrap>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-3xl font-bold tracking-tight text-primary">
              {str(it.value, "0")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{str(it.label, "")}</p>
          </div>
        ))}
      </div>
    </SectionWrap>
  )
}

function ContactForm({
  section,
  dataset,
  pageSlug,
}: {
  section: PortalSection
  dataset: PortalDataset
  pageSlug: string
}) {
  const c = section.config
  const heading = str(c.heading, "Send a message")
  const successMessage = str(c.successMessage, "Thanks — we'll get back to you shortly.")
  // Field list comes as ["name","email","phone","message"] — used to
  // decide which inputs render and which are required.
  const fields = arr<string>(c.fields)
  const showName = fields.length === 0 || fields.includes("name")
  const showPhone = fields.includes("phone")

  return (
    <SectionWrap>
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-6 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {heading}
        </h2>
        <ContactFormInner
          dataset={dataset}
          pageSlug={pageSlug}
          showName={showName}
          showPhone={showPhone}
          successMessage={successMessage}
        />
      </div>
    </SectionWrap>
  )
}

// Pulled out so the local form state doesn't reset on every parent render.
function ContactFormInner({
  dataset,
  pageSlug,
  showName,
  showPhone,
  successMessage,
}: {
  dataset: PortalDataset
  pageSlug: string
  showName: boolean
  showPhone: boolean
  successMessage: string
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sentAt, setSentAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email is required.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await dataset.submitLead({
        formId: "contact",
        pageSlug,
        name: name.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
      })
      setSentAt(new Date())
      setName(""); setEmail(""); setPhone(""); setMessage("")
    } catch (err) {
      setError((err as Error).message ?? "Couldn't send. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (sentAt) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
        <p className="mt-3 font-medium">{successMessage}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
      {showName && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Your name"
          />
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Email <span className="text-destructive">*</span></label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
      </div>
      {showPhone && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="+1 555 0123"
          />
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="What's on your mind?"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Sending…" : <>Send message <ArrowRight className="ml-1.5 h-4 w-4" /></>}
      </Button>
    </form>
  )
}

function BlogTeaser({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const c = section.config
  const heading = str(c.heading, "From the blog")
  const limit = num(c.limit, 3)
  const list = dataset.posts
    .filter((p) => p.status === "published")
    .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
    .slice(0, limit)
  if (list.length === 0) return null
  return (
    <SectionWrap>
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h2>
        <Link
          href={prefix(dataset.basePath, "/blog")}
          className="text-sm font-medium text-primary hover:underline"
        >
          All posts →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {list.map((post) => (
          <Link
            key={post.id}
            href={prefix(dataset.basePath, `/blog/${post.slug}`)}
            className="group block"
          >
            <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
              {post.coverImage && (
                <div className="aspect-video overflow-hidden bg-muted">
                  <img
                    src={post.coverImage}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                  />
                </div>
              )}
              <CardContent className="p-5">
                <h3 className="line-clamp-2 font-semibold group-hover:text-primary">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {post.excerpt}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </SectionWrap>
  )
}

function VideoSection({ section }: { section: PortalSection }) {
  const c = section.config
  const source = str(c.source)
  const title = str(c.title)
  const caption = str(c.caption)
  if (!source) return null
  const embed = toEmbedUrl(source)
  return (
    <SectionWrap>
      {title && (
        <h2 className="mb-6 text-center font-serif text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
      )}
      <div className="mx-auto aspect-video max-w-4xl overflow-hidden rounded-lg bg-black shadow-lg">
        {embed ? (
          <iframe
            src={embed}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={source} controls className="h-full w-full" />
        )}
      </div>
      {caption && (
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          {caption}
        </p>
      )}
    </SectionWrap>
  )
}

function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

function ImageGallery({ section }: { section: PortalSection }) {
  const c = section.config
  const heading = str(c.heading)
  const images = arr<{ url?: string; caption?: string }>(c.images).filter((i) => i.url)
  if (images.length === 0) return null
  return (
    <SectionWrap>
      {heading && (
        <h2 className="mb-8 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {heading}
        </h2>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, i) => (
          <figure key={i} className="overflow-hidden rounded-lg border border-border bg-card">
            <img
              src={img.url}
              alt={str(img.caption, "")}
              className="aspect-[4/3] w-full object-cover transition hover:scale-[1.03]"
              loading="lazy"
            />
            {img.caption && (
              <figcaption className="px-3 py-2 text-xs text-muted-foreground">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </SectionWrap>
  )
}

function LogosStrip({ section }: { section: PortalSection }) {
  const c = section.config
  const heading = str(c.heading)
  const logos = arr<{ url?: string; alt?: string }>(c.logos).filter((l) => l.url)
  const grayscale = !!c.grayscale
  if (logos.length === 0) return null
  return (
    <SectionWrap className="py-10">
      {heading && (
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {heading}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {logos.map((l, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={l.url}
            alt={str(l.alt, "")}
            className={cn(
              "h-8 w-auto max-w-[140px] object-contain opacity-70 transition hover:opacity-100",
              grayscale && "grayscale hover:grayscale-0",
            )}
            loading="lazy"
          />
        ))}
      </div>
    </SectionWrap>
  )
}
