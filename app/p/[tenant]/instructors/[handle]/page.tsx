// /p/<tenant>/instructors/<handle> — alias for the legacy
// /instructors/<handle> route. The user-facing copy says "Instructor"
// everywhere (course detail bylines, share previews, profile rails),
// so the canonical URL should match. The /instructors/... route keeps
// working for any link already shared.

import type { Metadata } from "next"
// page-client lives under /teachers/[handle]/ — the /teachers and
// /instructors routes share one client component so a rename of the
// URL doesn't fork the implementation.
import PortalTeacherDetailsClient from "../../teachers/[handle]/page-client"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const decoded = (() => {
    try {
      return decodeURIComponent(handle)
    } catch {
      return handle
    }
  })()
  const title = decoded
    .split(/[-_+]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
  return {
    title,
    description: `View ${title}'s profile and courses.`,
    openGraph: {
      title,
      description: `View ${title}'s profile and courses.`,
    },
  }
}

export default function PortalInstructorDetailsPage({
  params,
}: {
  params: Promise<{ tenant: string; handle: string }>
}) {
  // The client component renders the same data; the route shell only
  // controls the URL. Both /instructors/<h> and /instructors/<h> resolve
  // to the same page so existing links don't break.
  return <PortalTeacherDetailsClient params={params} />
}
