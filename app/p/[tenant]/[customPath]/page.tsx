"use client"

// Catch-all for user-created pages on the portal. `/about`, `/contact`,
// `/blog`, `/instructors`, `/courses` all have dedicated routes; anything
// else (e.g. /privacy, /terms, /cookies, /refund, or any custom page
// the teacher made via /dashboard/portal/pages) routes through here.

import { use } from "react"
import { PortalPageRenderer } from "@/components/portal/page-renderer"

export default function CustomPortalPage({
  params,
}: {
  params: Promise<{ tenant: string; customPath: string }>
}) {
  const { tenant, customPath } = use(params)
  // The dynamic segment is a single path piece (no slashes). Pages
  // are stored with slugs like "/privacy", so prefix the leading slash.
  const slug = "/" + decodeURIComponent(customPath)
  return <PortalPageRenderer tenant={tenant} slug={slug} />
}
