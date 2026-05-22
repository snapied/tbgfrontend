"use client"

// Platform-level quiz player. Most students reach the quiz player
// through the tenant-scoped route at /p/[tenant]/quiz/[id] (which
// hydrates the right LMS store + brand + currentUser). This page
// stays as a fallback for guest links shared outside any tenant
// context. When a signed-in user does land here, we send them home
// to their tenant's /my dashboard so they don't lose tenant context
// on the next click.

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileQuestion, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QuizPlayer } from "@/components/quiz/quiz-player"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"

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

export default function PublicQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { getQuizById, currentUser, getCourseById } = useLMS()
  const { currentTenant } = useTenant()
  const quiz = getQuizById(id)
  const course = quiz ? getCourseById(quiz.courseId) : undefined

  const [studentId, setStudentId] = useState<string>("guest")
  useEffect(() => {
    setStudentId(currentUser?.id ?? getOrCreateGuestId())
  }, [currentUser])

  // Bounce signed-in students to the tenant-scoped route so the
  // attempt is saved against the right tenant + currentUser. Without
  // this we'd leak attempts to the anonymous slug (the original bug
  // that left "Not started" stuck on /my/quizzes after submission).
  useEffect(() => {
    if (!currentUser || !currentTenant?.slug) return
    router.replace(`/p/${currentTenant.slug}/quiz/${id}`)
  }, [currentUser, currentTenant?.slug, id, router])

  const homeHref =
    currentUser && currentTenant?.slug ? `/p/${currentTenant.slug}/my` : "/"

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
            <Link href="/courses">Browse courses</Link>
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
              {currentUser && currentTenant?.slug ? "My dashboard" : "Home"}
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold">The Big Class</span>
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
