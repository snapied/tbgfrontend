import type { Metadata } from "next"
import PortalCoursesClient from "./courses-client"

export const metadata: Metadata = {
  title: "Courses",
  description: "Browse our complete catalog of hand-picked courses and classes.",
  openGraph: {
    title: "Courses",
    description: "Browse our complete catalog of hand-picked courses and classes.",
  }
}

export default function PortalCoursesPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  return <PortalCoursesClient params={params} />
}
