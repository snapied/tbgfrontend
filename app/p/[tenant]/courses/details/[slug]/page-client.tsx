"use client"

// Tenant-scoped rich course detail view. The actual page logic
// (hero, curriculum tree, instructor bio, reviews, enroll flow)
// lives at /app/courses/[slug]/page.tsx — we re-render it here so
// the canonical URL is /p/<tenant>/courses/details/<slug> while the
// component itself stays a single source of truth.
//
// The wrapped page already calls useTenant() internally so the
// portal theme + analytics paint correctly. We just need to forward
// the slug param.

import { use } from "react"
import CoursePublicPage from "@/app/courses/[slug]/page"

export default function PortalCourseDetailsClient({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>
}) {
  const { slug } = use(params)
  return <CoursePublicPage params={Promise.resolve({ slug })} />
}
