"use client"

// Tenant-scoped learning view. Same pattern as the course details
// portal route — the page logic (lesson player, sidebar, follow-ups,
// live class banner) lives at /app/learn/[slug]/page.tsx and we
// re-render it here so the canonical URL is /p/<tenant>/learn/<slug>.

import { use } from "react"
import LearnPage from "@/app/learn/[slug]/page"

export default function PortalLearnPage({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>
}) {
  const { slug } = use(params)
  return <LearnPage params={Promise.resolve({ slug })} />
}
