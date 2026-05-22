import type { Metadata } from "next"
import PortalCourseDetailsClient from "./page-client"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  
  return {
    title,
    description: `View ${title} course details and enroll.`,
    openGraph: {
      title,
      description: `View ${title} course details and enroll.`,
    }
  }
}

export default function PortalCourseDetailsPage({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>
}) {
  return <PortalCourseDetailsClient params={params} />
}
