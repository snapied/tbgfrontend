"use client"

import { use } from "react"
import { PortalPageRenderer } from "@/components/portal/page-renderer"

export default function AboutPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  return <PortalPageRenderer tenant={tenant} slug="/about" />
}
