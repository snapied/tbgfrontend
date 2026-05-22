"use client"

// Thin wrapper that delegates to the shared StudentForm component.
// The form handles the layout + invite fan-out; this page just
// generates the id and calls addUser on save.

import { StudentForm } from "@/components/students/student-form"
import { generateId, useLMS } from "@/lib/lms-store"
import { usePlan } from "@/lib/use-plan"
import { PlanGatedCard } from "@/components/dashboard/plan-lock"

export default function NewStudentPage() {
  const { addUser, users } = useLMS()
  // Belt-and-braces: the list page swaps Add for Upgrade at cap, but
  // a direct URL hit here would bypass that. Refuse to render the
  // form when the workspace is out of student slots and surface the
  // same upgrade card the rest of the at-cap surfaces use.
  const students = users.filter((u) => u.role === "student")
  const { usageRemaining, hydrated } = usePlan()
  const remaining = usageRemaining("students", students.length)
  const atCap = hydrated && remaining !== Infinity && remaining <= 0
  if (atCap) {
    return (
      <div className="mx-auto max-w-xl pt-8">
        <PlanGatedCard feature="students" />
      </div>
    )
  }
  return (
    <StudentForm
      mode="create"
      onSave={(draft) => {
        addUser({ ...draft, id: generateId("user") })
      }}
    />
  )
}
