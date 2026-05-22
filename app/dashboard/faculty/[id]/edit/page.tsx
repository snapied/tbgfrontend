"use client"

// Edit Faculty — full-page form. Resends invite, switches role,
// updates profile, or removes the member from the workspace. The
// underlying User record stays in the LMS store; this page is the
// only place the teacher's profile (avatar, bio, phone, role) is
// editable end-to-end.

import { use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FacultyForm } from "@/components/dashboard/faculty-form"
import { useLMS } from "@/lib/lms-store"

export default function EditFacultyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { users } = useLMS()
  const user = users.find((u) => u.id === id)

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-12 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          Faculty member not found
        </h1>
        <p className="text-sm text-muted-foreground">
          They may have been removed from this workspace.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard/faculty">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Faculty
          </Link>
        </Button>
      </div>
    )
  }

  if (user.role === "student") {
    return (
      <div className="mx-auto max-w-md space-y-3 py-12 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          That&apos;s a student, not a faculty member
        </h1>
        <p className="text-sm text-muted-foreground">
          Edit student profiles from{" "}
          <Link href={`/dashboard/students/${user.id}`} className="font-medium text-primary hover:underline">
            their student page
          </Link>
          .
        </p>
        <Button asChild className="mt-2" variant="outline">
          <Link href="/dashboard/faculty">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Faculty
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/faculty">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Faculty
        </Link>
      </Button>

      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Edit {user.name}</h1>
        <p className="text-muted-foreground">
          Update their profile, change their role, resend the invite, or remove
          them from this workspace.
        </p>
      </div>

      <FacultyForm mode="edit" initial={user} />
    </div>
  )
}
