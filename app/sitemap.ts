import type { MetadataRoute } from "next"

// Native Next.js sitemap. Exposed at /sitemap.xml automatically — no
// route file or npm package needed. Google looks here first when
// crawling thebigclass.com.
//
// Tenant portals have their own sitemap at /p/<slug>/sitemap.xml
// (see app/p/[tenant]/sitemap.xml/) — this file covers the platform
// marketing surface only.
//
// Add new public routes here when you ship them. Auth-gated routes
// (/dashboard/*, /superadmin/*, /verify/*, /accept-invite/*) MUST NOT
// appear — they'd waste crawl budget and look broken in search.

const SITE = "https://thebigclass.com"

// Solution pages — one per audience / use case.
const SOLUTIONS = [
  "for-coaches",
  "for-course-creators",
  "for-instagram-creators",
  "for-personal-brands",
  "for-youtubers",
  "digital-products",
  "launch-your-creator-business",
  "live-cohorts",
  "memberships",
  "paid-communities",
  "replace-your-stack",
]

// Feature deep-dives. Each maps to app/features/<slug>/page.tsx.
const FEATURES = [
  "api",
  "blog",
  "certificates",
  "community",
  "courses",
  "docs",
  "doubts",
  "faculty",
  "inbox",
  "live-classes",
  "multilingual",
  "portal",
  "quizzes",
  "realtime",
  "recordings",
  "refer-and-earn",
  "storefront",
  "whiteboard",
  "whitelabel",
]

// Legal / compliance — high priority for trust signals, low change frequency.
const LEGAL = [
  "affiliate",
  "cookies",
  "dpa",
  "gdpr",
  "privacy",
  "refund",
  "takedown",
  "terms",
  "uk-privacy",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  ): MetadataRoute.Sitemap[number] => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  })

  return [
    // Core
    entry("/", 1.0, "daily"),
    entry("/signup", 0.95, "monthly"),
    entry("/login", 0.6, "yearly"),
    entry("/pricing", 0.95, "weekly"),
    entry("/about", 0.7, "monthly"),

    // Discovery
    entry("/courses", 0.9, "daily"),
    entry("/store", 0.8, "daily"),
    entry("/use-cases", 0.7, "monthly"),
    entry("/library", 0.6, "weekly"),

    // Marketing hubs
    entry("/solutions", 0.8, "monthly"),
    ...SOLUTIONS.map((slug) => entry(`/solutions/${slug}`, 0.75, "monthly")),

    entry("/features", 0.7, "monthly"),
    ...FEATURES.map((slug) => entry(`/features/${slug}`, 0.65, "monthly")),

    // Resources
    entry("/guides", 0.6, "weekly"),
    entry("/help", 0.55, "weekly"),
    entry("/updates", 0.5, "weekly"),
    entry("/whats-new", 0.5, "weekly"),
    entry("/developers", 0.5, "monthly"),
    entry("/brand", 0.4, "yearly"),
    entry("/founder-bill-of-rights", 0.4, "yearly"),

    // Legal
    ...LEGAL.map((slug) => entry(`/legal/${slug}`, 0.3, "yearly")),
  ]
}
