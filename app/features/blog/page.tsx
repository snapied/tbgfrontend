// Feature page — Blog.
//
// The blog system is a premium-tier feature that's deeper than most
// creator platforms ship. Scheduling, tags, comments, reactions,
// related posts with auto-promoted course CTAs, lead capture below
// every post, per-post SEO (meta + OG + JSON-LD article schema),
// reading-time auto-compute, native sharing, blog index search +
// filter + sort.
//
// This page treats the blog as a real lead-driving SEO surface —
// not just "we have a blog field."

import type { Metadata } from "next"
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  MessageSquare,
  Pin,
  Search,
  Share2,
  Sparkles,
  Tag,
  Type,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/blog"

export const metadata: Metadata = {
  title: "A blog that actually drives signups · The Big Class",
  description:
    "Per-post SEO with JSON-LD, scheduling, tags, comments, reactions, related posts, auto-promoted course CTAs, lead capture below every article. Your content marketing channel — built in, not bolted on.",
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    title: "A blog that actually drives signups",
    description:
      "Per-post SEO, scheduling, tags, comments, reactions, auto-promoted courses, lead capture. Real blog. Built in.",
    url: `${SITE_URL}${PAGE_PATH}`,
  },
}

export default function BlogFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Blog · your content engine"
          title={
            <>
              A blog that{" "}
              <span className="text-primary">actually drives signups.</span>
            </>
          }
          subtitle="Per-post SEO with JSON-LD. Scheduling. Tags and categories. Comments + reactions. Related posts that auto-promote your most relevant course. Lead capture below every article. Your content marketing channel — built into the platform, not a separate Ghost subscription."
        >
          {/* Why this blog is different */}
          <FeatureSplit
            title="Write, schedule, publish, repeat."
            body={
              <>
                A Tiptap-powered editor for writing. Schedule a draft for next Tuesday at 9 AM
                IST and it auto-publishes (nightly cron). Pin up to three posts to the top of
                your blog index. Reading time auto-calculated at 220 wpm. Native share API
                with clipboard fallback. Comments per-post with moderation. Six emoji
                reactions — toggled per visitor.
              </>
            }
            bullets={[
              "Rich-text Tiptap editor — formatting, lists, links, images, code blocks",
              "Schedule with scheduledFor — nightly cron auto-publishes",
              "Pin up to 3 posts to the top of the index",
              "Reading-time chip auto-computed (220 wpm baseline)",
              "Native sharing — Web Share API + clipboard fallback",
              "Comments with hidden flag for moderation",
              "Six curated emoji reactions per post",
            ]}
            mockup={
              <PreviewFrame title="blog · How we run live cohorts">
                <BlogPostMockup />
              </PreviewFrame>
            }
          />

          {/* SEO depth */}
          <FeatureSplit
            reverse
            title="Per-post SEO, with JSON-LD that actually validates."
            body={
              <>
                Per-post meta title and description with sensible fallbacks. Per-post Open
                Graph image. Article JSON-LD with a full @graph — BlogPosting + Organization +
                BreadcrumbList — auto-generated. Sitemap and robots include every published
                post. No SEO plugin. No yoast tax to pay.
              </>
            }
            bullets={[
              "Meta title + description per post (with auto-fallback to excerpt)",
              "OG image per post (with tenant default fallback)",
              "BlogPosting JSON-LD — headline, description, image, datePublished, dateModified, author, wordCount, timeRequired",
              "Organization + BreadcrumbList JSON-LD wired automatically",
              "noindex toggle per post when needed",
              "Tags become keywords + articleSection — every word matters to search",
              "Sitemap.xml + robots.txt regenerate on publish",
            ]}
            mockup={
              <PreviewFrame title="JSON-LD output">
                <pre className="overflow-x-auto whitespace-pre text-[10px] leading-relaxed text-muted-foreground">
{`{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      "headline": "How we run live cohorts",
      "datePublished": "2026-05-24",
      "wordCount": 1842,
      "timeRequired": "PT9M",
      "author": { "@type": "Person", "name": "Ananya" }
    },
    {
      "@type": "Organization",
      "name": "Ananya Academy",
      "logo": "ananya.com/logo.png"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [...]
    }
  ]
}`}
                </pre>
              </PreviewFrame>
            }
          />

          {/* Related posts + course promo */}
          <FeatureSplit
            title="Every post becomes a tiny sales page."
            body={
              <>
                Tags and categories overlap-rank — we surface the three most-related posts
                below each article. We also surface the one course that overlaps most with
                the post&rsquo;s tags as a &ldquo;Take it further&rdquo; CTA. Your reader
                landed on you from Google — they don&rsquo;t leave without seeing what
                you&rsquo;re selling.
              </>
            }
            bullets={[
              "Related posts ranked by tag/category overlap, up to 3 shown",
              "Highest-overlap course auto-promoted as a 'Take it further' card",
              "Lead capture form below every post — fed into your portal leads inbox",
              "Comments visible by default — disable per post if you want",
            ]}
            mockup={
              <PreviewFrame title="Below the article">
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Related posts
                    </p>
                    <div className="mt-1.5 space-y-1.5">
                      {[
                        "Why I stopped chasing cohort conversion rates",
                        "What we tell parents about our pass rate",
                      ].map((t) => (
                        <div
                          key={t}
                          className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px]"
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Take it further
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      Calculus 1 · Live cohort
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      12 weeks · ₹14,999 · starts every 6 weeks
                    </p>
                    <button className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                      See cohort dates <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Get posts in your inbox
                    </p>
                    <div className="mt-1.5 flex gap-1.5">
                      <div className="flex-1 rounded border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                        your@email.com
                      </div>
                      <button className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                        Subscribe
                      </button>
                    </div>
                  </div>
                </div>
              </PreviewFrame>
            }
          />

          {/* Blog index UX */}
          <FeatureSplit
            reverse
            title="A blog index your audience can actually navigate."
            body={
              <>
                Search across titles and content. Filter by up to 8 tag chips. Sort by newest,
                oldest, longest reading time, shortest. Featured posts pinned to the top. New
                visitors land on the most important pieces; loyal readers can drill all the
                way through your archive.
              </>
            }
            bullets={[
              "Search across post titles + body content",
              "Tag chips (up to 8) for one-click filtering",
              "Sort newest / oldest / longest read / shortest read",
              "Pinned posts at the top of the index",
              "Author byline + reading time + publish date on every card",
            ]}
            mockup={
              <PreviewFrame title="ananya.com / blog">
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <div className="rounded-md border border-border bg-background px-7 py-1.5 text-[10px] text-muted-foreground">
                      Search posts…
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {["cohorts", "calculus", "teaching", "pricing", "Indian creators"].map(
                      (t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold"
                        >
                          #{t}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { title: "How we run live cohorts", tag: "Pinned", time: "9 min" },
                      { title: "What I tell parents about pass rate", tag: "Featured", time: "6 min" },
                      { title: "Pricing your first cohort", tag: "Tag · pricing", time: "4 min" },
                    ].map((p) => (
                      <div
                        key={p.title}
                        className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">
                          {p.title}
                        </span>
                        <span className="ml-2 inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {p.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </PreviewFrame>
            }
          />

          {/* Why-use-this section */}
          <section className="border-y border-border/60 bg-muted/20 py-20">
            <div className="mx-auto max-w-5xl px-6 lg:px-8">
              <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                A blog isn&rsquo;t a vanity surface. It&rsquo;s your cheapest acquisition channel.
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Every post is one indexed page. Every indexed page is a chance to be the
                answer to someone&rsquo;s search. Every visitor lands on a page that points
                at the course you actually sell — not a generic homepage.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: Search,
                    title: "Indexed in days",
                    body: "Per-post JSON-LD + sitemap entry the moment you publish. Google sees the article schema and rich-snippets your post.",
                  },
                  {
                    icon: BookOpen,
                    title: "Reader → buyer",
                    body: "The highest-overlap course gets auto-promoted below every post. The reader who found you via search doesn't leave empty-handed.",
                  },
                  {
                    icon: MessageSquare,
                    title: "Audience compounds",
                    body: "Lead capture below every post. Comments + reactions keep readers around. Email subscribers turn into cohort signups.",
                  },
                ].map((c) => (
                  <div key={c.title} className="rounded-xl border border-border bg-card p-5">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <c.icon className="h-4 w-4" />
                    </span>
                    <p className="mt-3 text-sm font-bold">{c.title}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                      {c.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Comparison */}
          <section className="py-20">
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
              <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                Why not just use Ghost / Substack / Medium?
              </h2>
              <p className="mt-3 text-muted-foreground">
                You can. Most creators end up paying twice — once for a writing tool,
                once for a course tool — and the two never talk.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    name: "Ghost",
                    issue:
                      "Beautiful writing UX. Separate billing, separate audience table, no course catalogue. Your blog reader has to leave to discover what you sell.",
                  },
                  {
                    name: "Substack",
                    issue:
                      "Newsletter-first. Substack owns your audience email. Limited SEO control. No courses, no cohorts, no checkout.",
                  },
                  {
                    name: "Medium",
                    issue:
                      "Medium's domain, not yours. Medium's audience, not yours. Their paywall logic, not your monetization model.",
                  },
                  {
                    name: "WordPress + WooCommerce + LMS plugin",
                    issue:
                      "Three plugins to update, three security boundaries, three places things break. The DIY route that becomes a part-time job.",
                  },
                ].map((a) => (
                  <div key={a.name} className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-bold">{a.name}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {a.issue}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <FeatureCTA
            title="Your content marketing — built in."
            body="Pin posts. Schedule them. Tag them. Rank for them. Sell from them. All under your domain, all on the same workspace as your courses."
          />
        </FeaturePageShell>
      </main>
      <Footer />
    </div>
  )
}

// ─── Blog post mockup ────────────────────────────────────────────

function BlogPostMockup() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border/60 px-4 py-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
          <Pin className="h-2.5 w-2.5" /> Pinned
        </span>
        <p className="mt-2 font-serif text-lg font-black leading-tight">
          How we run live cohorts without losing weekends
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            May 24, 2026
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            9 min read
          </span>
          <span className="inline-flex items-center gap-1">
            <Tag className="h-2.5 w-2.5" />
            cohorts · teaching
          </span>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded bg-foreground/15" />
          <div className="h-2 w-11/12 rounded bg-foreground/10" />
          <div className="h-2 w-5/6 rounded bg-foreground/10" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-2.5 w-2.5 text-rose-500" /> 24
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-2.5 w-2.5" /> 6
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-amber-500" /> 12
          </span>
        </div>
        <Share2 className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  )
}

// Suppress unused-import linter on icons reserved for variants.
void Type
void CheckCircle2
