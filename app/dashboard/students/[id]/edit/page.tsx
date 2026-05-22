"use client"

// Edit student — same full-page form as /new, parameterised with the
// existing User. Used instead of the old inline dialog because the
// fields really do need the same room the create form has.

import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StudentForm } from "@/components/students/student-form"
import { useLMS } from "@/lib/lms-store"

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getUserById, updateUser } = useLMS()
  const student = getUserById(id)

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold">Student not found</h1>
        <Button asChild className="mt-4">
          <Link href="/dashboard/students">Back to students</Link>
        </Button>
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
