"use client"

// Full-page presentation wizard — /dashboard/presentations/new
// Same pattern as /dashboard/students/new: dedicated route, back
// button, full-page layout. No popup dialog.

import { PresentationWizard } from "@/components/presentations/presentation-wizard"
import { useRouter } from "next/navigation"

export default function NewPresentationPage() {
  const router = useRouter()
  return (
    <PresentationWizard
      onClose={() => router.push("/dashboard/presentations")}
    />
  )
}
