import type { MetadataRoute } from "next"

// Platform-level robots.txt, served at /robots.txt automatically.
// Tenant portals have their own at /p/<slug>/robots.txt — those
// allow indexing of the portal's own pages, this one governs only
// the marketing surface at thebigclass.com.

const SITE = "https://thebigclass.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep crawlers out of auth-gated and ephemeral surfaces. They
        // either need a session (and would just bounce) or are flows
        // that shouldn't be indexed (verification, invites, password
        // reset, internal admin).
        // disallow: [
        //   "/dashboard/",
        //   "/superadmin/",
        //   "/api/",
        //   "/accept-invite/",
        //   "/verify/",
        //   "/verify-email/",
        //   "/reset-password/",
        //   "/forgot-password",
        //   "/onboarding/",
        //   "/checkout/",
        //   "/order/",
        //   "/seed/",
        //   "/template-designer/",
        //   "/r/",
        // ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
