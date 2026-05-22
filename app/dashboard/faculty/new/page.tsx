"use client"

// Add Faculty — full-page form. Counterpart to
// /dashboard/students/new and /dashboard/courses/new so the IA
// stays consistent across the three big "people / content" axes.

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FacultyForm } from "@/components/dashboard/faculty-form"
import { useLMS } from "@/lib/lms-store"
import { usePlan } from "@/lib/use-plan"
import { PlanGatedCard } from "@/components/dashboard/plan-lock"

export default function NewFacultyPage() {
  // Same belt-and-braces pattern as /dashboard/courses/new — the
  // list page swaps the Add button for Upgrade at cap, but a direct
  // URL hit to /dashboard/faculty/new would bypass that. Render an
  // upgrade card instead of the form when the workspace is out of
  // teacher seats. Once a real backend invite route exists, also
  // gate it with requireUnderLimit('teachers').
  const { users } = useLMS()
  const { usageRemaining, hydrated } = usePlan()
  const faculty = users.filter((u) => u.role === "admin" || u.role === "instructor")
  const remaining = usageRemaining("teachers", faculty.length)
  const atCap = hydrated && remaining !== Infinity && remaining <= 0

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/faculty">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Faculty
        </Link>
      </Button>

      {atCap ? (
        <div className="mx-auto max-w-xl pt-4">
          <PlanGatedCard feature="teachers" />
        </div>
      ) : (
        <>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight">
              Add a faculty member
            </h1>
            <p className="text-muted-foreground">
              We&apos;ll email them a link to set their password and join this workspace.
            </p>
          </div>

          <FacultyForm mode="new" />
        </>
      )}
    </div>
  )
}
