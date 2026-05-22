import type { Metadata } from "next"
import PortalTeacherDetailsClient from "./page-client"

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  
  // Format the handle into a name for the SSR fallback
  const title = handle
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  
  return {
    title,
    description: `View ${title}'s profile and courses.`,
    openGraph: {
      title,
      description: `View ${title}'s profile and courses.`,
    }
  }
}

export default function PortalTeacherDetailsPage({
  params,
}: {
  params: Promise<{ tenant: string; handle: string }>
}) {
  return <PortalTeacherDetailsClient params={params} />
}
