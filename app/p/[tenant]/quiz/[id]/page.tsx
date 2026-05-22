"use client"

// Tenant-scoped quiz player. Mirrors /app/quiz/[id]/page.tsx but
// lives inside the tenant subtree so:
//   • The tenant resolver picks the right slug from the URL — which
//     means the LMS store hydrates the right `currentUser` for the
//     signed-in student, and `submitQuizAttempt` writes to the right
//     tenant's `quizAttempts`. Without this route, attempts were
//     getting stamped against the anonymous slug + studentId: "guest"
//     and the student's /my/quizzes never saw them — quiz stayed at
//     "Not started" even after submission.
//   • The chrome (brand + home button) belongs to the tenant, not
//     "The Big Class". Home routes to /p/<slug>/my for signed-in
//     learners, /p/<slug> for guests.
//
// The platform-level /quiz/[id] page stays for guest links shared
// outside any tenant context (rare, but worth keeping working).

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QuizPlayer } from "@/components/quiz/quiz-player"
import { useLMS } from "@/lib/lms-store"
import { useTenantBrand } from "@/lib/tenant-brand"

const GUEST_ID_KEY = "thebigclass.quiz.guestId"

function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "guest"
  try {
    const existing = window.localStorage.getItem(GUEST_ID_KEY)
    if (existing) return existing
    const id = `guest-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(GUEST_ID_KEY, id)
    return id
  } catch {
    return "guest"
  }
}

export default function TenantQuizPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant, id } = use(params)
  const { getQuizById, currentUser, getCourseById } = useLMS()
  const brand = useTenantBrand()
  const quiz = getQuizById(id)
  const course = quiz ? getCourseById(quiz.courseId) : undefined

  const [studentId, setStudentId] = useState<string>("guest")
  useEffect(() => {
    setStudentId(currentUser?.id ?? getOrCreateGuestId())
  }, [currentUser])

  const homeHref = currentUser ? `/p/${tenant}/my` : `/p/${tenant}`

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Quiz not found</h1>
          <p className="mt-1 text-muted-foreground">
            This quiz may have been removed or the link is incorrect.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/p/${tenant}/courses`}>Browse courses</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={homeHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentUser ? "My dashboard" : "Home"}
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-6 w-6 rounded object-contain"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                {brand.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="font-semibold">{brand.name}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        {course && (
          <p className="mb-4 text-sm text-muted-foreground">
            Part of <span className="font-medium text-foreground">{course.title}</span>
          </p>
        )}

        {quiz.questions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-3 text-lg font-semibold">This quiz has no questions yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The creator hasn&apos;t added any questions. Check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <QuizPlayer quiz={quiz} studentId={studentId} />
        )}
      </main>
    </div>
  )
}
