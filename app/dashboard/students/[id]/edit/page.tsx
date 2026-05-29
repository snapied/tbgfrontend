"use client"

// Edit student — same full-page form as /new, parameterised with the
// existing User. Used instead of the old inline dialog because the
// fields really do need the same room the create form has.

import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/back-button"
import { StudentForm } from "@/components/students/student-form"
import { useLMS } from "@/lib/lms-store"

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getUserById, updateUser, currentUser } = useLMS()
  const student = getUserById(id)

  // Teachers cannot edit student profiles — admin only.
  if (currentUser?.role === "instructor") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-lg font-semibold">Admin access required</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only admins can edit student profiles.</p>
        <BackButton label="Back" fallbackHref="/dashboard/students" className="mt-4" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold">Student not found</h1>
        <BackButton label="Back" fallbackHref="/dashboard/students" className="mt-4" />
      </div>
    )
  }

  return (
    <StudentForm
      mode="edit"
      initial={student}
      onSave={(out) => updateUser(out.id, out)}
    />
  )
}
